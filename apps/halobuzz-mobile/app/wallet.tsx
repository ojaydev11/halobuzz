import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { apiClient } from '@/lib/api';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
  metadata?: any;
}

interface WalletData {
  balance: number;
  bonusBalance: number;
  totalEarned: number;
  totalSpent: number;
  transactions: Transaction[];
}

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getWallet();
      if (response.success && response.data) {
        setWalletData(response.data);
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  const handleRecharge = () => {
    router.push('/wallet/recharge');
  };

  const handleWithdraw = () => {
    router.push('/wallet/withdraw');
  };

  const handleTransactionHistory = () => {
    router.push('/wallet/transactions');
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString();
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'recharge':
        return 'add-circle-outline';
      case 'withdrawal':
        return 'remove-circle-outline';
      case 'game_stake':
        return 'game-controller-outline';
      case 'game_won':
        return 'trophy-outline';
      case 'gift_sent':
        return 'gift-outline';
      case 'gift_received':
        return 'gift-outline';
      default:
        return 'swap-horizontal-outline';
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) return '#00ff00';
    if (amount < 0) return '#ff0000';
    return '#888';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <TouchableOpacity onPress={handleTransactionHistory}>
          <Ionicons name="list-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Balance Cards */}
        <View style={styles.balanceSection}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Main Balance</Text>
            <Text style={styles.balanceAmount}>
              {formatAmount(walletData?.balance || 0)} coins
            </Text>
            <View style={styles.balanceActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleRecharge}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Recharge</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleWithdraw}>
                <Ionicons name="remove" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bonusCard}>
            <Text style={styles.bonusLabel}>Bonus Balance</Text>
            <Text style={styles.bonusAmount}>
              {formatAmount(walletData?.bonusBalance || 0)} coins
            </Text>
            <Text style={styles.bonusNote}>Non-transferable</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatAmount(walletData?.totalEarned || 0)}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatAmount(walletData?.totalSpent || 0)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={handleRecharge}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="add-circle" size={24} color="#007AFF" />
              </View>
              <Text style={styles.quickActionText}>Recharge</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleWithdraw}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="remove-circle" size={24} color="#ff0000" />
              </View>
              <Text style={styles.quickActionText}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleTransactionHistory}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="list" size={24} color="#00ff00" />
              </View>
              <Text style={styles.quickActionText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/wallet/transfer')}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="swap-horizontal" size={24} color="#ffaa00" />
              </View>
              <Text style={styles.quickActionText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={handleTransactionHistory}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {walletData?.transactions?.length ? (
            walletData.transactions.slice(0, 5).map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View style={styles.transactionIcon}>
                    <Ionicons 
                      name={getTransactionIcon(transaction.type) as any} 
                      size={20} 
                      color={getTransactionColor(transaction.type, transaction.amount)} 
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <Text style={styles.transactionDate}>
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={[
                    styles.transactionAmount,
                    { color: getTransactionColor(transaction.type, transaction.amount) }
                  ]}>
                    {transaction.amount > 0 ? '+' : ''}{formatAmount(transaction.amount)}
                  </Text>
                  <Text style={styles.transactionStatus}>{transaction.status}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#888" />
              <Text style={styles.emptyStateText}>No transactions yet</Text>
              <Text style={styles.emptyStateSubtext}>Your transaction history will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
  },
  content: {
    flex: 1,
  },
  balanceSection: {
    padding: 20,
  },
  balanceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  bonusCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
  },
  bonusLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  bonusAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffaa00',
    marginBottom: 4,
  },
  bonusNote: {
    fontSize: 12,
    color: '#888',
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  transactionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#888',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  transactionStatus: {
    fontSize: 12,
    color: '#888',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});
