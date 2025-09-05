import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { formatCurrency } from '../utils/currency';

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: string;
}

interface CoinBundle {
  coins: number;
  price: number;
  currency: string;
  popular?: boolean;
  bonus?: number;
}

export const WalletScreen = () => {
  const navigation = useNavigation();
  const [balance, setBalance] = useState({
    balance: 0,
    bonusBalance: 0,
    totalEarned: 0,
    totalSpent: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bundles, setBundles] = useState<CoinBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<CoinBundle | null>(null);

  useEffect(() => {
    loadWalletData();
    loadBundles();
  }, []);

  const loadWalletData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await apiService.get('/api/v1/wallet/balance');
      
      if (response.data.success) {
        setBalance({
          balance: response.data.data.balance,
          bonusBalance: response.data.data.bonusBalance,
          totalEarned: response.data.data.totalEarned,
          totalSpent: response.data.data.totalSpent
        });
        setTransactions(response.data.data.recentTransactions || []);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
      Alert.alert('Error', 'Failed to load wallet information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadBundles = async () => {
    try {
      const response = await apiService.get('/api/v1/payments/bundles', {
        params: { country: 'NP', currency: 'NPR' }
      });

      if (response.data.success) {
        setBundles(response.data.data.bundles);
      }
    } catch (error) {
      console.error('Failed to load bundles:', error);
    }
  };

  const handleTopUp = async (bundle: CoinBundle, provider: string) => {
    try {
      setSelectedBundle(bundle);

      const response = await apiService.post(`/api/v1/wallet/topup/${provider}`, {
        amount: bundle.price,
        coins: bundle.coins,
        currency: bundle.currency
      }, {
        headers: {
          'Idempotency-Key': `topup_${Date.now()}_${Math.random()}`
        }
      });

      if (response.data.success) {
        if (response.data.data.paymentUrl) {
          // Open payment URL in webview or browser
          Alert.alert(
            'Payment',
            `Redirecting to ${provider} for payment`,
            [{ text: 'OK' }]
          );
        } else if (response.data.data.clientSecret) {
          // Handle Stripe payment
          Alert.alert('Stripe Payment', 'Complete payment with card');
        }
      }
    } catch (error: any) {
      Alert.alert('Payment Failed', error.response?.data?.error || 'Failed to initiate payment');
    } finally {
      setSelectedBundle(null);
    }
  };

  const renderBalance = () => (
    <View style={styles.balanceCard}>
      <View style={styles.balanceHeader}>
        <Text style={styles.balanceLabel}>Coin Balance</Text>
        <TouchableOpacity onPress={() => loadWalletData(true)}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.balanceAmount}>
        <MaterialIcons name="monetization-on" size={32} color="#FFD700" />
        <Text style={styles.balanceText}>{balance.balance.toLocaleString()}</Text>
        {balance.bonusBalance > 0 && (
          <Text style={styles.bonusText}>+{balance.bonusBalance} bonus</Text>
        )}
      </View>

      <View style={styles.balanceStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Earned</Text>
          <Text style={styles.statValue}>{balance.totalEarned.toLocaleString()}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Spent</Text>
          <Text style={styles.statValue}>{balance.totalSpent.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );

  const renderBundles = () => (
    <View style={styles.bundlesSection}>
      <Text style={styles.sectionTitle}>Buy Coins</Text>
      <View style={styles.bundlesGrid}>
        {bundles.map((bundle) => (
          <TouchableOpacity
            key={bundle.coins}
            style={[
              styles.bundleCard,
              bundle.popular && styles.bundlePopular
            ]}
            onPress={() => showPaymentOptions(bundle)}
            disabled={!!selectedBundle}
          >
            {bundle.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>POPULAR</Text>
              </View>
            )}
            
            <View style={styles.bundleCoins}>
              <MaterialIcons name="monetization-on" size={24} color="#FFD700" />
              <Text style={styles.bundleCoinsText}>{bundle.coins}</Text>
            </View>
            
            {bundle.bonus && bundle.bonus > 0 && (
              <Text style={styles.bundleBonus}>+{bundle.bonus} bonus</Text>
            )}
            
            <Text style={styles.bundlePrice}>
              {bundle.currency} {bundle.price}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const showPaymentOptions = (bundle: CoinBundle) => {
    Alert.alert(
      'Select Payment Method',
      `Purchase ${bundle.coins} coins for ${bundle.currency} ${bundle.price}`,
      [
        { text: 'eSewa', onPress: () => handleTopUp(bundle, 'esewa') },
        { text: 'Khalti', onPress: () => handleTopUp(bundle, 'khalti') },
        { text: 'Card (Stripe)', onPress: () => handleTopUp(bundle, 'stripe') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderTransactions = () => (
    <View style={styles.transactionsSection}>
      <View style={styles.transactionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="receipt-long" size={48} color="#666" />
          <Text style={styles.emptyText}>No transactions yet</Text>
        </View>
      ) : (
        transactions.map((transaction) => (
          <View key={transaction._id} style={styles.transactionItem}>
            <View style={styles.transactionIcon}>
              <Ionicons
                name={transaction.amount > 0 ? 'arrow-down' : 'arrow-up'}
                size={20}
                color={transaction.amount > 0 ? '#4CAF50' : '#FF6B6B'}
              />
            </View>
            
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionDescription}>
                {transaction.description}
              </Text>
              <Text style={styles.transactionDate}>
                {new Date(transaction.createdAt).toLocaleDateString()}
              </Text>
            </View>
            
            <Text style={[
              styles.transactionAmount,
              { color: transaction.amount > 0 ? '#4CAF50' : '#FF6B6B' }
            ]}>
              {transaction.amount > 0 ? '+' : ''}{transaction.amount}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wallet</Text>
        <TouchableOpacity onPress={() => navigation.navigate('WithdrawScreen')}>
          <MaterialIcons name="account-balance-wallet" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadWalletData(true)}
            colors={['#FF6B6B']}
            tintColor="#FF6B6B"
          />
        }
      >
        {renderBalance()}
        {renderBundles()}
        {renderTransactions()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  content: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#666',
    marginTop: 10
  },
  balanceCard: {
    backgroundColor: '#1A1A1A',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333'
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  balanceLabel: {
    color: '#999',
    fontSize: 14
  },
  balanceAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  balanceText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginLeft: 10
  },
  bonusText: {
    color: '#4CAF50',
    fontSize: 14,
    marginLeft: 10
  },
  balanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333'
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 5
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  statDivider: {
    width: 1,
    backgroundColor: '#333'
  },
  bundlesSection: {
    padding: 15
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15
  },
  bundlesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  bundleCard: {
    width: '48%',
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  bundlePopular: {
    borderColor: '#FF6B6B'
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  bundleCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5
  },
  bundleCoinsText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 5
  },
  bundleBonus: {
    color: '#4CAF50',
    fontSize: 12,
    marginBottom: 10
  },
  bundlePrice: {
    color: '#999',
    fontSize: 14,
    marginTop: 5
  },
  transactionsSection: {
    padding: 15
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  viewAllText: {
    color: '#FF6B6B',
    fontSize: 14
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  transactionDetails: {
    flex: 1
  },
  transactionDescription: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 3
  },
  transactionDate: {
    color: '#666',
    fontSize: 12
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600'
  },
  emptyState: {
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    color: '#666',
    marginTop: 10
  }
});