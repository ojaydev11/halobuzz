import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';

// Bank integration interfaces
interface BankAccount {
  accountId: string;
  userId: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
  country: string;
  currency: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt: Date;
  lastUsed?: Date;
}

interface WithdrawalRequest {
  userId: string;
  amount: number;
  currency: string;
  bankAccountId: string;
  purpose: string;
  metadata?: any;
}

interface WithdrawalResult {
  success: boolean;
  transactionId?: string;
  bankReference?: string;
  estimatedArrival?: Date;
  fees?: number;
  error?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
}

interface KYCVerification {
  userId: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  documents: KYCDocument[];
  verificationLevel: 'basic' | 'enhanced' | 'premium';
  verifiedAt?: Date;
  expiresAt?: Date;
  rejectionReason?: string;
}

interface KYCDocument {
  type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement';
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: Date;
  verifiedAt?: Date;
  rejectionReason?: string;
  fileUrl?: string;
}

interface BankProvider {
  name: string;
  country: string;
  currency: string;
  minWithdrawal: number;
  maxWithdrawal: number;
  fees: {
    fixed: number;
    percentage: number;
  };
  processingTime: string;
  supported: boolean;
}

class BankIntegrationService {
  private supportedBanks: Map<string, BankProvider> = new Map();
  private kycVerifications: Map<string, KYCVerification> = new Map();
  private bankAccounts: Map<string, BankAccount> = new Map();

  constructor() {
    this.initializeSupportedBanks();
  }

  // Initialize supported banks
  private initializeSupportedBanks(): void {
    const banks: BankProvider[] = [
      {
        name: 'Nepal Rastra Bank',
        country: 'NP',
        currency: 'NPR',
        minWithdrawal: 1000,
        maxWithdrawal: 100000,
        fees: { fixed: 50, percentage: 0.5 },
        processingTime: '1-3 business days',
        supported: true
      },
      {
        name: 'Standard Chartered Bank',
        country: 'NP',
        currency: 'NPR',
        minWithdrawal: 5000,
        maxWithdrawal: 500000,
        fees: { fixed: 100, percentage: 0.3 },
        processingTime: '1-2 business days',
        supported: true
      },
      {
        name: 'Chase Bank',
        country: 'US',
        currency: 'USD',
        minWithdrawal: 100,
        maxWithdrawal: 10000,
        fees: { fixed: 25, percentage: 0.2 },
        processingTime: '2-3 business days',
        supported: true
      },
      {
        name: 'HSBC',
        country: 'GB',
        currency: 'GBP',
        minWithdrawal: 50,
        maxWithdrawal: 5000,
        fees: { fixed: 15, percentage: 0.25 },
        processingTime: '1-2 business days',
        supported: true
      },
      {
        name: 'Deutsche Bank',
        country: 'DE',
        currency: 'EUR',
        minWithdrawal: 100,
        maxWithdrawal: 10000,
        fees: { fixed: 20, percentage: 0.3 },
        processingTime: '1-2 business days',
        supported: true
      }
    ];

    banks.forEach(bank => {
      const key = `${bank.country}_${bank.currency}`;
      this.supportedBanks.set(key, bank);
    });
  }

  // Add bank account
  async addBankAccount(
    userId: string,
    accountData: Omit<BankAccount, 'accountId' | 'userId' | 'isVerified' | 'verificationStatus' | 'createdAt'>
  ): Promise<{
    success: boolean;
    accountId?: string;
    error?: string;
  }> {
    try {
      // Check KYC verification
      const kycStatus = await this.getKYCStatus(userId);
      if (kycStatus.status !== 'verified') {
        return {
          success: false,
          error: 'KYC verification required to add bank account'
        };
      }

      // Validate bank support
      const bankKey = `${accountData.country}_${accountData.currency}`;
      const bankProvider = this.supportedBanks.get(bankKey);
      if (!bankProvider || !bankProvider.supported) {
        return {
          success: false,
          error: `Bank not supported for ${accountData.country}/${accountData.currency}`
        };
      }

      // Create bank account
      const accountId = this.generateAccountId();
      const bankAccount: BankAccount = {
        accountId,
        userId,
        bankName: accountData.bankName,
        accountNumber: accountData.accountNumber,
        accountHolderName: accountData.accountHolderName,
        routingNumber: accountData.routingNumber,
        swiftCode: accountData.swiftCode,
        iban: accountData.iban,
        country: accountData.country,
        currency: accountData.currency,
        isVerified: false,
        verificationStatus: 'pending',
        createdAt: new Date()
      };

      this.bankAccounts.set(accountId, bankAccount);

      // Cache account
      await setCache(`bank_account:${accountId}`, bankAccount, 86400); // 24 hours

      logger.info(`Bank account added: ${accountId} for user ${userId}`);

      return { success: true, accountId };

    } catch (error) {
      logger.error('Error adding bank account:', error);
      return { success: false, error: 'Failed to add bank account' };
    }
  }

  // Verify bank account
  async verifyBankAccount(
    accountId: string,
    verificationData: {
      microDeposit1: number;
      microDeposit2: number;
    }
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const account = this.bankAccounts.get(accountId);
      if (!account) {
        return { success: false, error: 'Bank account not found' };
      }

      // Mock verification - in production, this would verify with the bank
      const expectedAmount1 = Math.floor(Math.random() * 99) + 1; // 1-99 cents
      const expectedAmount2 = Math.floor(Math.random() * 99) + 1; // 1-99 cents

      if (verificationData.microDeposit1 === expectedAmount1 && 
          verificationData.microDeposit2 === expectedAmount2) {
        
        account.isVerified = true;
        account.verificationStatus = 'verified';
        
        // Update cache
        await setCache(`bank_account:${accountId}`, account, 86400);
        
        logger.info(`Bank account verified: ${accountId}`);
        
        return { success: true };
      } else {
        account.verificationStatus = 'rejected';
        await setCache(`bank_account:${accountId}`, account, 86400);
        
        return { success: false, error: 'Invalid verification amounts' };
      }

    } catch (error) {
      logger.error('Error verifying bank account:', error);
      return { success: false, error: 'Verification failed' };
    }
  }

  // Process withdrawal
  async processWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResult> {
    try {
      // Validate bank account
      const account = this.bankAccounts.get(request.bankAccountId);
      if (!account || account.userId !== request.userId) {
        return {
          success: false,
          error: 'Bank account not found or unauthorized',
          status: 'failed'
        };
      }

      if (!account.isVerified) {
        return {
          success: false,
          error: 'Bank account not verified',
          status: 'failed'
        };
      }

      // Check withdrawal limits
      const bankKey = `${account.country}_${account.currency}`;
      const bankProvider = this.supportedBanks.get(bankKey);
      if (!bankProvider) {
        return {
          success: false,
          error: 'Bank provider not supported',
          status: 'failed'
        };
      }

      if (request.amount < bankProvider.minWithdrawal) {
        return {
          success: false,
          error: `Minimum withdrawal amount is ${bankProvider.minWithdrawal} ${account.currency}`,
          status: 'failed'
        };
      }

      if (request.amount > bankProvider.maxWithdrawal) {
        return {
          success: false,
          error: `Maximum withdrawal amount is ${bankProvider.maxWithdrawal} ${account.currency}`,
          status: 'failed'
        };
      }

      // Check user balance
      const user = await User.findById(request.userId);
      if (!user || user.coins?.balance < request.amount) {
        return {
          success: false,
          error: 'Insufficient balance',
          status: 'failed'
        };
      }

      // Calculate fees
      const fees = bankProvider.fees.fixed + (request.amount * bankProvider.fees.percentage / 100);
      const totalAmount = request.amount + fees;

      // Create transaction
      const transaction = new Transaction({
        userId: request.userId,
        type: 'withdrawal',
        amount: request.amount,
        currency: request.currency,
        status: 'pending',
        paymentMethod: 'bank_transfer',
        metadata: {
          bankAccountId: request.bankAccountId,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          fees,
          totalAmount,
          purpose: request.purpose,
          ...request.metadata
        }
      });

      await transaction.save();

      // Deduct balance
      await User.findByIdAndUpdate(request.userId, {
        $inc: { 'coins.balance': -totalAmount }
      });

      // Process withdrawal with bank
      const bankResult = await this.processBankWithdrawal(transaction, account, bankProvider);

      // Update transaction status
      await Transaction.findByIdAndUpdate(transaction._id, {
        $set: {
          status: bankResult.status,
          transactionId: bankResult.bankReference,
          metadata: {
            ...transaction.metadata,
            bankReference: bankResult.bankReference,
            estimatedArrival: bankResult.estimatedArrival,
            processingFees: bankResult.fees
          }
        }
      });

      logger.info(`Withdrawal processed: ${transaction._id}`, {
        userId: request.userId,
        amount: request.amount,
        currency: request.currency,
        bankAccountId: request.bankAccountId
      });

      return {
        success: bankResult.success,
        transactionId: transaction._id.toString(),
        bankReference: bankResult.bankReference,
        estimatedArrival: bankResult.estimatedArrival,
        fees: bankResult.fees,
        error: bankResult.error,
        status: bankResult.status
      };

    } catch (error) {
      logger.error('Error processing withdrawal:', error);
      return {
        success: false,
        error: 'Withdrawal processing failed',
        status: 'failed'
      };
    }
  }

  // Process bank withdrawal
  private async processBankWithdrawal(
    transaction: any,
    account: BankAccount,
    bankProvider: BankProvider
  ): Promise<WithdrawalResult> {
    try {
      // Mock bank processing - in production, this would integrate with actual bank APIs
      const bankReference = `BANK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate processing time
      const processingHours = bankProvider.processingTime.includes('1-2') ? 24 : 48;
      const estimatedArrival = new Date(Date.now() + processingHours * 60 * 60 * 1000);

      // Mock success rate (95%)
      const success = Math.random() > 0.05;

      if (success) {
        return {
          success: true,
          bankReference,
          estimatedArrival,
          fees: bankProvider.fees.fixed + (transaction.amount * bankProvider.fees.percentage / 100),
          status: 'processing'
        };
      } else {
        return {
          success: false,
          error: 'Bank processing failed',
          status: 'failed'
        };
      }

    } catch (error) {
      logger.error('Error in bank withdrawal processing:', error);
      return {
        success: false,
        error: 'Bank processing error',
        status: 'failed'
      };
    }
  }

  // Submit KYC documents
  async submitKYCDocuments(
    userId: string,
    documents: Array<{
      type: KYCDocument['type'];
      fileUrl: string;
    }>
  ): Promise<{
    success: boolean;
    verificationId?: string;
    error?: string;
  }> {
    try {
      // Create KYC verification
      const verificationId = this.generateVerificationId();
      const kycVerification: KYCVerification = {
        userId,
        status: 'pending',
        documents: documents.map(doc => ({
          type: doc.type,
          status: 'pending',
          uploadedAt: new Date(),
          fileUrl: doc.fileUrl
        })),
        verificationLevel: this.determineVerificationLevel(documents),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      this.kycVerifications.set(verificationId, kycVerification);

      // Cache verification
      await setCache(`kyc:${verificationId}`, kycVerification, 86400 * 30); // 30 days

      logger.info(`KYC documents submitted: ${verificationId} for user ${userId}`);

      return { success: true, verificationId };

    } catch (error) {
      logger.error('Error submitting KYC documents:', error);
      return { success: false, error: 'Failed to submit KYC documents' };
    }
  }

  // Verify KYC documents
  async verifyKYCDocuments(verificationId: string): Promise<{
    success: boolean;
    status: KYCVerification['status'];
    error?: string;
  }> {
    try {
      const verification = this.kycVerifications.get(verificationId);
      if (!verification) {
        return { success: false, status: 'rejected', error: 'Verification not found' };
      }

      // Mock verification - in production, this would use AI/ML or human review
      const allDocumentsValid = verification.documents.every(doc => {
        // Mock validation logic
        return Math.random() > 0.1; // 90% success rate
      });

      if (allDocumentsValid) {
        verification.status = 'verified';
        verification.verifiedAt = new Date();
        verification.documents.forEach(doc => {
          doc.status = 'verified';
          doc.verifiedAt = new Date();
        });
      } else {
        verification.status = 'rejected';
        verification.rejectionReason = 'Document verification failed';
        verification.documents.forEach(doc => {
          if (doc.status === 'pending') {
            doc.status = 'rejected';
            doc.rejectionReason = 'Document quality insufficient';
          }
        });
      }

      // Update cache
      await setCache(`kyc:${verificationId}`, verification, 86400 * 30);

      logger.info(`KYC verification completed: ${verificationId} - Status: ${verification.status}`);

      return { success: true, status: verification.status };

    } catch (error) {
      logger.error('Error verifying KYC documents:', error);
      return { success: false, status: 'rejected', error: 'Verification failed' };
    }
  }

  // Get KYC status
  async getKYCStatus(userId: string): Promise<KYCVerification | null> {
    try {
      // Find verification for user
      for (const [id, verification] of this.kycVerifications) {
        if (verification.userId === userId) {
          return verification;
        }
      }
      return null;
    } catch (error) {
      logger.error('Error getting KYC status:', error);
      return null;
    }
  }

  // Get user's bank accounts
  async getUserBankAccounts(userId: string): Promise<BankAccount[]> {
    try {
      const accounts: BankAccount[] = [];
      
      for (const [id, account] of this.bankAccounts) {
        if (account.userId === userId) {
          // Remove sensitive information
          const safeAccount = { ...account };
          delete safeAccount.accountNumber;
          delete safeAccount.routingNumber;
          delete safeAccount.swiftCode;
          delete safeAccount.iban;
          accounts.push(safeAccount);
        }
      }
      
      return accounts;
    } catch (error) {
      logger.error('Error getting user bank accounts:', error);
      return [];
    }
  }

  // Get supported banks
  getSupportedBanks(country?: string, currency?: string): BankProvider[] {
    const banks = Array.from(this.supportedBanks.values());
    
    if (country && currency) {
      return banks.filter(bank => bank.country === country && bank.currency === currency);
    } else if (country) {
      return banks.filter(bank => bank.country === country);
    } else if (currency) {
      return banks.filter(bank => bank.currency === currency);
    }
    
    return banks;
  }

  // Determine verification level
  private determineVerificationLevel(documents: Array<{ type: KYCDocument['type'] }>): KYCVerification['verificationLevel'] {
    const documentTypes = documents.map(doc => doc.type);
    
    if (documentTypes.includes('passport') && documentTypes.includes('utility_bill')) {
      return 'premium';
    } else if (documentTypes.includes('national_id') && documentTypes.includes('bank_statement')) {
      return 'enhanced';
    } else {
      return 'basic';
    }
  }

  // Generate account ID
  private generateAccountId(): string {
    return `bank_acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate verification ID
  private generateVerificationId(): string {
    return `kyc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const bankIntegrationService = new BankIntegrationService();
export default bankIntegrationService;
