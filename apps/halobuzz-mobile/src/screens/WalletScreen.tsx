import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';

interface Transaction {
  _id: string;
  type: 'deposit' | 'withdrawal' | 'win' | 'loss' | 'bonus' | 'reward';
  amount: number;
  description: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  gameId?: string;
}

interface WalletBalance {
  balance: number;
  locked: number;
  available: number;
  totalEarnings: number;
  totalDeposits: number;
  totalWithdrawals: number;
}

const WalletScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<WalletBalance>({
    balance: 0,
    locked: 0,
    available: 0,
    totalEarnings: 0,
    totalDeposits: 0,
    totalWithdrawals: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const [balanceResponse, transactionsResponse] = await Promise.all([
        apiClient.get('/wallet/balance'),
        apiClient.get('/wallet/transactions')
      ]);

      if (balanceResponse.data) {
        setBalance(balanceResponse.data);
      } else {
        // Fallback data
        setBalance({
          balance: 12500,
          locked: 500,
          available: 12000,
          totalEarnings: 8500,
          totalDeposits: 5000,
          totalWithdrawals: 1000
        });
      }

      if (transactionsResponse.data) {
        setTransactions(transactionsResponse.data.transactions);
      } else {
        // Fallback transactions
        setTransactions([
          {
            _id: '1',
            type: 'win',
            amount: 500,
            description: 'Tournament Victory - Speed Chess',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            status: 'completed',
            gameId: 'speed-chess'
          },
          {
            _id: '2',
            type: 'deposit',
            amount: 1000,
            description: 'Wallet Top-up',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            status: 'completed'
          },
          {
            _id: '3',
            type: 'loss',
            amount: -200,
            description: 'Game Entry Fee - Battle Royale',
            timestamp: new Date(Date.now() - 172800000).toISOString(),
            status: 'completed',
            gameId: 'battle-royale'
          },
          {
            _id: '4',
            type: 'bonus',
            amount: 100,
            description: 'Daily Login Bonus',
            timestamp: new Date(Date.now() - 259200000).toISOString(),
            status: 'completed'
          },
          {
            _id: '5',
            type: 'withdrawal',
            amount: -500,
            description: 'Withdrawal to Bank',
            timestamp: new Date(Date.now() - 345600000).toISOString(),
            status: 'completed'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeposit = () => {
    Alert.alert(
      'Deposit Funds',
      'Choose your deposit method',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Credit Card', onPress: () => console.log('Credit card deposit') },
        { text: 'Bank Transfer', onPress: () => console.log('Bank transfer') },
        { text: 'Crypto', onPress: () => console.log('Crypto deposit') }
      ]
    );
  };

  const handleWithdraw = () => {
    Alert.alert(
      'Withdraw Funds',
      'Withdraw to your bank account',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Withdraw', onPress: () => console.log('Withdraw funds') }
      ]
    );
  };

  const getTransactionIcon = (type: string) => {
    const icons = {
      deposit: 'add-circle',
      withdrawal: 'remove-circle',
      win: 'trophy',
      loss: 'trending-down',
      bonus: 'gift',
      reward: 'star'
    };
    return icons[type as keyof typeof icons] || 'cash';
  };

  const getTransactionColor = (type: string) => {
    const colors = {
      deposit: '#4CAF50',
      withdrawal: '#F44336',
      win: '#4CAF50',
      loss: '#F44336',
      bonus: '#FF9800',
      reward: '#9C27B0'
    };
    return colors[type as keyof typeof colors] || '#8B949E';
  };

  const formatAmount = (amount: number) => {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${amount.toLocaleString()}`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderBalanceCard = () => (
    <LinearGradient
      colors={['#667EEA', '#764BA2']}
      style={styles.balanceCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={styles.balanceLabel}>Total Balance</Text>
      <Text style={styles.balanceAmount}>{balance.balance.toLocaleString()} 🪙</Text>
      
      <View style={styles.balanceDetails}>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceItemLabel}>Available</Text>
          <Text style={styles.balanceItemValue}>{balance.available.toLocaleString()}</Text>
        </View>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceItemLabel}>Locked</Text>
          <Text style={styles.balanceItemValue}>{balance.locked.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={handleDeposit}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Deposit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleWithdraw}>
          <Ionicons name="remove" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Withdraw</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderStatsGrid = () => (
    <View style={styles.statsGrid}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{balance.totalEarnings.toLocaleString()}</Text>
        <Text style={styles.statLabel}>Total Earnings</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{balance.totalDeposits.toLocaleString()}</Text>
        <Text style={styles.statLabel}>Total Deposits</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{balance.totalWithdrawals.toLocaleString()}</Text>
        <Text style={styles.statLabel}>Total Withdrawals</Text>
      </View>
    </View>
  );

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={[
          styles.transactionIcon,
          { backgroundColor: getTransactionColor(item.type) + '20' }
        ]}>
          <Ionicons 
            name={getTransactionIcon(item.type) as any} 
            size={20} 
            color={getTransactionColor(item.type)} 
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionTime}>{formatTimestamp(item.timestamp)}</Text>
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          { color: item.amount >= 0 ? '#4CAF50' : '#F44336' }
        ]}>
          {formatAmount(item.amount)}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'completed' ? '#4CAF5020' : '#FF980020' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.status === 'completed' ? '#4CAF50' : '#FF9800' }
          ]}>
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#667EEA" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💰 Wallet</Text>
        <Text style={styles.subtitle}>Manage your funds</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchWalletData();
            }}
          />
        }
      >
        {renderBalanceCard()}
        {renderStatsGrid()}

        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.map(renderTransactionItem)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1A1F29',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  subtitle: {
    fontSize: 12,
    color: '#8B949E',
    marginTop: 2
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollView: {
    flex: 1
  },
  balanceCard: {
    margin: 15,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20
  },
  balanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  balanceItem: {
    alignItems: 'center'
  },
  balanceItemLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4
  },
  balanceItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginBottom: 20
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1A1F29',
    paddingVertical: 15,
    marginHorizontal: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 10,
    color: '#8B949E',
    textAlign: 'center'
  },
  transactionsSection: {
    marginHorizontal: 15,
    marginBottom: 30
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F29',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  transactionInfo: {
    flex: 1
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4
  },
  transactionTime: {
    fontSize: 11,
    color: '#8B949E'
  },
  transactionRight: {
    alignItems: 'flex-end'
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase'
  }
});

export default WalletScreen;