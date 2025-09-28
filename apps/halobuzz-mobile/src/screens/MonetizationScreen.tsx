import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';

const { width } = Dimensions.get('window');

interface IAPProduct {
  id: string;
  name: string;
  description: string;
  type: 'coins' | 'gems' | 'bundle' | 'battle-pass' | 'subscription';
  price: number;
  currency: string;
  coins?: number;
  gems?: number;
  bonus?: number;
  popular?: boolean;
  bestValue?: boolean;
  items?: string[];
  duration?: string;
}

interface BattlePass {
  id: string;
  name: string;
  description: string;
  season: string;
  price: number;
  premiumPrice: number;
  level: number;
  xp: number;
  maxLevel: number;
  xpToNext: number;
  isPremium: boolean;
  rewards: BattlePassReward[];
  endDate: string;
}

interface BattlePassReward {
  level: number;
  type: 'free' | 'premium';
  itemType: 'coins' | 'gems' | 'cosmetic' | 'boost' | 'emote';
  item: string;
  amount?: number;
  claimed: boolean;
  locked: boolean;
}

interface LootBox {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'coins' | 'gems' | 'usd';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  contents: string[];
  guaranteedItem?: string;
  image: string;
  available: boolean;
}

interface UserInventory {
  coins: number;
  gems: number;
  cosmetics: string[];
  boosters: { [key: string]: number };
  consumables: { [key: string]: number };
}

const MonetizationScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'store' | 'battle-pass' | 'loot-boxes' | 'inventory'>('store');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [iapProducts, setIapProducts] = useState<IAPProduct[]>([]);
  const [battlePass, setBattlePass] = useState<BattlePass | null>(null);
  const [lootBoxes, setLootBoxes] = useState<LootBox[]>([]);
  const [userInventory, setUserInventory] = useState<UserInventory | null>(null);
  const [purchaseModal, setPurchaseModal] = useState<{visible: boolean, product: IAPProduct | null}>({visible: false, product: null});
  const [purchasing, setPurchasing] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadMonetizationData();
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadMonetizationData = async () => {
    try {
      setLoading(true);

      // Load IAP products, battle pass, loot boxes, and inventory
      const [productsRes, battlePassRes, lootBoxesRes, inventoryRes] = await Promise.all([
        loadIAPProducts(),
        loadBattlePass(),
        loadLootBoxes(),
        loadUserInventory()
      ]);
    } catch (error) {
      console.error('Error loading monetization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadIAPProducts = async () => {
    try {
      const response = await apiClient.getIAPProducts();
      if (response.success && response.products) {
        setIapProducts(response.products);
      } else {
        // Mock products
        const mockProducts: IAPProduct[] = [
          {
            id: 'coins_500',
            name: '500 Coins',
            description: 'Basic coin package',
            type: 'coins',
            price: 0.99,
            currency: 'USD',
            coins: 500,
          },
          {
            id: 'coins_2500',
            name: '2,500 Coins',
            description: 'Popular coin package',
            type: 'coins',
            price: 4.99,
            currency: 'USD',
            coins: 2500,
            bonus: 250,
            popular: true,
          },
          {
            id: 'coins_6000',
            name: '6,000 Coins',
            description: 'Best value coin package',
            type: 'coins',
            price: 9.99,
            currency: 'USD',
            coins: 6000,
            bonus: 1000,
            bestValue: true,
          },
          {
            id: 'gems_100',
            name: '100 Gems',
            description: 'Premium currency pack',
            type: 'gems',
            price: 1.99,
            currency: 'USD',
            gems: 100,
          },
          {
            id: 'starter_bundle',
            name: 'Starter Bundle',
            description: 'Perfect for new players',
            type: 'bundle',
            price: 7.99,
            currency: 'USD',
            coins: 2000,
            gems: 50,
            items: ['XP Boost', 'Lucky Charm', 'Premium Avatar'],
          },
          {
            id: 'premium_monthly',
            name: 'Premium Monthly',
            description: 'Monthly subscription benefits',
            type: 'subscription',
            price: 9.99,
            currency: 'USD',
            duration: '1 month',
            items: ['Daily coins', 'XP boost', 'Exclusive content'],
          }
        ];
        setIapProducts(mockProducts);
      }
    } catch (error) {
      console.error('Error loading IAP products:', error);
    }
  };

  const loadBattlePass = async () => {
    try {
      const response = await apiClient.getBattlePasses();
      if (response.success && response.battlePasses?.length > 0) {
        setBattlePass(response.battlePasses[0]);
      } else {
        // Mock battle pass
        const mockBattlePass: BattlePass = {
          id: 'season_1',
          name: 'Cosmic Adventures',
          description: 'Journey through space with exclusive rewards',
          season: 'Season 1',
          price: 0,
          premiumPrice: 9.99,
          level: 15,
          xp: 750,
          maxLevel: 100,
          xpToNext: 250,
          isPremium: false,
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          rewards: [
            { level: 1, type: 'free', itemType: 'coins', item: '100 Coins', amount: 100, claimed: true, locked: false },
            { level: 1, type: 'premium', itemType: 'gems', item: '25 Gems', amount: 25, claimed: false, locked: true },
            { level: 5, type: 'free', itemType: 'cosmetic', item: 'Space Helmet', claimed: true, locked: false },
            { level: 10, type: 'premium', itemType: 'emote', item: 'Victory Dance', claimed: false, locked: true },
            { level: 15, type: 'free', itemType: 'coins', item: '500 Coins', amount: 500, claimed: false, locked: false },
            { level: 25, type: 'premium', itemType: 'cosmetic', item: 'Cosmic Sword', claimed: false, locked: true },
          ]
        };
        setBattlePass(mockBattlePass);
      }
    } catch (error) {
      console.error('Error loading battle pass:', error);
    }
  };

  const loadLootBoxes = async () => {
    try {
      const response = await apiClient.getLootBoxes();
      if (response.success && response.lootBoxes) {
        setLootBoxes(response.lootBoxes);
      } else {
        // Mock loot boxes
        const mockLootBoxes: LootBox[] = [
          {
            id: 'common_box',
            name: 'Mystery Box',
            description: 'Common items with a chance for rare finds',
            price: 100,
            currency: 'coins',
            rarity: 'common',
            contents: ['Coins', 'XP Boosts', 'Common Cosmetics'],
            image: '📦',
            available: true,
          },
          {
            id: 'rare_box',
            name: 'Treasure Chest',
            description: 'Rare items with epic possibilities',
            price: 50,
            currency: 'gems',
            rarity: 'rare',
            contents: ['Rare Cosmetics', 'Premium Boosts', 'Gems'],
            guaranteedItem: 'Rare Cosmetic',
            image: '🎁',
            available: true,
          },
          {
            id: 'legendary_box',
            name: 'Legendary Vault',
            description: 'The ultimate prize collection',
            price: 2.99,
            currency: 'usd',
            rarity: 'legendary',
            contents: ['Legendary Items', 'Exclusive Emotes', 'Premium Currency'],
            guaranteedItem: 'Legendary Item',
            image: '💎',
            available: true,
          }
        ];
        setLootBoxes(mockLootBoxes);
      }
    } catch (error) {
      console.error('Error loading loot boxes:', error);
    }
  };

  const loadUserInventory = async () => {
    try {
      const response = await apiClient.getInventory();
      if (response.success && response.inventory) {
        setUserInventory(response.inventory);
      } else {
        // Mock inventory
        setUserInventory({
          coins: 2500,
          gems: 150,
          cosmetics: ['Basic Hat', 'Blue Shirt', 'Space Helmet'],
          boosters: { 'XP Boost': 5, 'Luck Charm': 2 },
          consumables: { 'Health Potion': 10, 'Energy Drink': 7 }
        });
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const handlePurchase = (product: IAPProduct) => {
    setPurchaseModal({ visible: true, product });
  };

  const confirmPurchase = async () => {
    const { product } = purchaseModal;
    if (!product) return;

    try {
      setPurchasing(true);
      const response = await apiClient.processPurchase(product.id);

      if (response.success) {
        Alert.alert('Purchase Successful!', `You have purchased ${product.name}`);
        await loadMonetizationData(); // Refresh data
      } else {
        Alert.alert('Purchase Failed', 'Please try again later.');
      }
    } catch (error) {
      Alert.alert('Purchase Error', 'An error occurred during purchase.');
    } finally {
      setPurchasing(false);
      setPurchaseModal({ visible: false, product: null });
    }
  };

  const purchaseBattlePass = async () => {
    if (!battlePass) return;

    try {
      const response = await apiClient.purchaseBattlePass(battlePass.id);
      if (response.success) {
        Alert.alert('Battle Pass Purchased!', 'You now have access to premium rewards!');
        await loadBattlePass();
      }
    } catch (error) {
      Alert.alert('Purchase Failed', 'Could not purchase battle pass.');
    }
  };

  const claimBattlePassReward = async (level: number) => {
    if (!battlePass) return;

    try {
      const response = await apiClient.claimBattlePassReward(battlePass.id, level);
      if (response.success) {
        Alert.alert('Reward Claimed!', 'Check your inventory for your new item!');
        await loadBattlePass();
      }
    } catch (error) {
      Alert.alert('Claim Failed', 'Could not claim reward.');
    }
  };

  const openLootBox = async (lootBoxId: string) => {
    try {
      const response = await apiClient.openLootBox(lootBoxId);
      if (response.success && response.rewards) {
        Alert.alert(
          'Loot Box Opened!',
          `You received: ${response.rewards.map((r: any) => r.name).join(', ')}`
        );
        await loadMonetizationData();
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open loot box.');
    }
  };

  const renderStoreTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Featured Products */}
      <Text style={styles.sectionTitle}>💰 Coin Packages</Text>
      <View style={styles.productsGrid}>
        {iapProducts.filter(p => p.type === 'coins').map((product) => (
          <Animated.View
            key={product.id}
            style={[
              styles.productCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {product.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.badgeText}>POPULAR</Text>
              </View>
            )}
            {product.bestValue && (
              <View style={styles.bestValueBadge}>
                <Text style={styles.badgeText}>BEST VALUE</Text>
              </View>
            )}

            <Text style={styles.productIcon}>🪙</Text>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productDescription}>{product.description}</Text>

            <View style={styles.productDetails}>
              <Text style={styles.productCoins}>{product.coins?.toLocaleString()} coins</Text>
              {product.bonus && (
                <Text style={styles.productBonus}>+{product.bonus} bonus!</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.buyButton}
              onPress={() => handlePurchase(product)}
            >
              <Text style={styles.buyButtonText}>${product.price}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Gems */}
      <Text style={styles.sectionTitle}>💎 Premium Gems</Text>
      <View style={styles.productsGrid}>
        {iapProducts.filter(p => p.type === 'gems').map((product) => (
          <Animated.View
            key={product.id}
            style={[
              styles.productCard,
              styles.gemsCard,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={styles.productIcon}>💎</Text>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productDescription}>{product.description}</Text>

            <Text style={styles.productGems}>{product.gems} gems</Text>

            <TouchableOpacity
              style={[styles.buyButton, styles.gemsBuyButton]}
              onPress={() => handlePurchase(product)}
            >
              <Text style={styles.buyButtonText}>${product.price}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Bundles & Subscriptions */}
      <Text style={styles.sectionTitle}>🎁 Special Offers</Text>
      {iapProducts.filter(p => p.type === 'bundle' || p.type === 'subscription').map((product) => (
        <TouchableOpacity
          key={product.id}
          style={styles.bundleCard}
          onPress={() => handlePurchase(product)}
        >
          <LinearGradient
            colors={['#FF6B6B', '#FF8E8E']}
            style={styles.bundleGradient}
          >
            <View style={styles.bundleContent}>
              <Text style={styles.bundleName}>{product.name}</Text>
              <Text style={styles.bundleDescription}>{product.description}</Text>
              {product.items && (
                <View style={styles.bundleItems}>
                  {product.items.map((item, index) => (
                    <Text key={index} style={styles.bundleItem}>• {item}</Text>
                  ))}
                </View>
              )}
              <Text style={styles.bundlePrice}>${product.price}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderBattlePassTab = () => {
    if (!battlePass) return <ActivityIndicator size="large" color="#007AFF" />;

    const progressPercentage = (battlePass.xp / (battlePass.xp + battlePass.xpToNext)) * 100;

    return (
      <ScrollView style={styles.tabContent}>
        {/* Battle Pass Header */}
        <LinearGradient
          colors={['#667EEA', '#764BA2']}
          style={styles.battlePassHeader}
        >
          <Text style={styles.battlePassName}>{battlePass.name}</Text>
          <Text style={styles.battlePassDescription}>{battlePass.description}</Text>
          <Text style={styles.battlePassSeason}>{battlePass.season}</Text>

          <View style={styles.battlePassProgress}>
            <Text style={styles.battlePassLevel}>Level {battlePass.level}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>{battlePass.xp}/{battlePass.xp + battlePass.xpToNext} XP</Text>
          </View>

          {!battlePass.isPremium && (
            <TouchableOpacity
              style={styles.upgradeToPremiumButton}
              onPress={purchaseBattlePass}
            >
              <Text style={styles.upgradeToPremiumText}>Upgrade to Premium - ${battlePass.premiumPrice}</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Battle Pass Rewards */}
        <Text style={styles.sectionTitle}>🎁 Rewards</Text>
        <View style={styles.rewardsContainer}>
          {battlePass.rewards.map((reward) => (
            <View key={`${reward.level}-${reward.type}`} style={styles.rewardCard}>
              <Text style={styles.rewardLevel}>Level {reward.level}</Text>
              <Text style={styles.rewardType}>{reward.type === 'premium' ? '👑 Premium' : '🆓 Free'}</Text>
              <Text style={styles.rewardItem}>{reward.item}</Text>

              {reward.claimed ? (
                <View style={styles.claimedButton}>
                  <Text style={styles.claimedText}>✓ Claimed</Text>
                </View>
              ) : reward.locked ? (
                <View style={styles.lockedButton}>
                  <Text style={styles.lockedText}>🔒 Premium Only</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.claimButton}
                  onPress={() => claimBattlePassReward(reward.level)}
                >
                  <Text style={styles.claimButtonText}>Claim</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderLootBoxesTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>📦 Mystery Boxes</Text>
      <View style={styles.lootBoxesGrid}>
        {lootBoxes.map((lootBox) => (
          <View key={lootBox.id} style={styles.lootBoxCard}>
            <Text style={styles.lootBoxIcon}>{lootBox.image}</Text>
            <Text style={styles.lootBoxName}>{lootBox.name}</Text>
            <Text style={styles.lootBoxDescription}>{lootBox.description}</Text>

            <View style={styles.lootBoxContents}>
              <Text style={styles.contentsTitle}>Contains:</Text>
              {lootBox.contents.map((item, index) => (
                <Text key={index} style={styles.contentItem}>• {item}</Text>
              ))}
              {lootBox.guaranteedItem && (
                <Text style={styles.guaranteedItem}>✅ Guaranteed: {lootBox.guaranteedItem}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.openBoxButton, { backgroundColor: getRarityColor(lootBox.rarity) }]}
              onPress={() => openLootBox(lootBox.id)}
              disabled={!lootBox.available}
            >
              <Text style={styles.openBoxButtonText}>
                Open - {lootBox.price} {lootBox.currency === 'usd' ? '$' : lootBox.currency}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderInventoryTab = () => {
    if (!userInventory) return <ActivityIndicator size="large" color="#007AFF" />;

    return (
      <ScrollView style={styles.tabContent}>
        {/* Currency Display */}
        <View style={styles.currencyDisplay}>
          <View style={styles.currencyItem}>
            <Text style={styles.currencyIcon}>🪙</Text>
            <Text style={styles.currencyAmount}>{userInventory.coins.toLocaleString()}</Text>
            <Text style={styles.currencyLabel}>Coins</Text>
          </View>
          <View style={styles.currencyItem}>
            <Text style={styles.currencyIcon}>💎</Text>
            <Text style={styles.currencyAmount}>{userInventory.gems.toLocaleString()}</Text>
            <Text style={styles.currencyLabel}>Gems</Text>
          </View>
        </View>

        {/* Cosmetics */}
        <Text style={styles.sectionTitle}>👕 Cosmetics</Text>
        <View style={styles.inventoryGrid}>
          {userInventory.cosmetics.map((cosmetic, index) => (
            <View key={index} style={styles.inventoryItem}>
              <Text style={styles.inventoryItemIcon}>👕</Text>
              <Text style={styles.inventoryItemName}>{cosmetic}</Text>
            </View>
          ))}
        </View>

        {/* Boosters */}
        <Text style={styles.sectionTitle}>⚡ Boosters</Text>
        <View style={styles.inventoryGrid}>
          {Object.entries(userInventory.boosters).map(([booster, amount]) => (
            <View key={booster} style={styles.inventoryItem}>
              <Text style={styles.inventoryItemIcon}>⚡</Text>
              <Text style={styles.inventoryItemName}>{booster}</Text>
              <Text style={styles.inventoryItemAmount}>x{amount}</Text>
            </View>
          ))}
        </View>

        {/* Consumables */}
        <Text style={styles.sectionTitle}>🧪 Consumables</Text>
        <View style={styles.inventoryGrid}>
          {Object.entries(userInventory.consumables).map(([consumable, amount]) => (
            <View key={consumable} style={styles.inventoryItem}>
              <Text style={styles.inventoryItemIcon}>🧪</Text>
              <Text style={styles.inventoryItemName}>{consumable}</Text>
              <Text style={styles.inventoryItemAmount}>x{amount}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#888';
      case 'rare': return '#007AFF';
      case 'epic': return '#9C27B0';
      case 'legendary': return '#FF9800';
      default: return '#888';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading store...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Store</Text>
        <View style={styles.headerRight}>
          <Text style={styles.coinsText}>{userInventory?.coins?.toLocaleString() || 0} 🪙</Text>
          <Text style={styles.gemsText}>{userInventory?.gems?.toLocaleString() || 0} 💎</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'store' && styles.activeTab]}
          onPress={() => setActiveTab('store')}
        >
          <Text style={[styles.tabText, activeTab === 'store' && styles.activeTabText]}>Store</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'battle-pass' && styles.activeTab]}
          onPress={() => setActiveTab('battle-pass')}
        >
          <Text style={[styles.tabText, activeTab === 'battle-pass' && styles.activeTabText]}>Battle Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'loot-boxes' && styles.activeTab]}
          onPress={() => setActiveTab('loot-boxes')}
        >
          <Text style={[styles.tabText, activeTab === 'loot-boxes' && styles.activeTabText]}>Loot Boxes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
          onPress={() => setActiveTab('inventory')}
        >
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>Inventory</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'store' && renderStoreTab()}
      {activeTab === 'battle-pass' && renderBattlePassTab()}
      {activeTab === 'loot-boxes' && renderLootBoxesTab()}
      {activeTab === 'inventory' && renderInventoryTab()}

      {/* Purchase Modal */}
      <Modal
        visible={purchaseModal.visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPurchaseModal({ visible: false, product: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {purchaseModal.product && (
              <>
                <Text style={styles.modalTitle}>Confirm Purchase</Text>
                <Text style={styles.modalProductName}>{purchaseModal.product.name}</Text>
                <Text style={styles.modalProductDescription}>{purchaseModal.product.description}</Text>
                <Text style={styles.modalPrice}>${purchaseModal.product.price}</Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setPurchaseModal({ visible: false, product: null })}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={confirmPurchase}
                    disabled={purchasing}
                  >
                    {purchasing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalConfirmText}>Purchase</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  coinsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F0D90A',
    marginBottom: 4,
  },
  gemsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9C27B0',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    marginTop: 20,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  productCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  gemsCard: {
    backgroundColor: '#2A1B3D',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff0000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#00ff00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  productIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
  },
  productDetails: {
    alignItems: 'center',
    marginBottom: 12,
  },
  productCoins: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F0D90A',
  },
  productGems: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginBottom: 12,
  },
  productBonus: {
    fontSize: 10,
    color: '#00ff00',
    fontWeight: '600',
  },
  buyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  gemsBuyButton: {
    backgroundColor: '#9C27B0',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bundleCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bundleGradient: {
    padding: 20,
  },
  bundleContent: {
    alignItems: 'center',
  },
  bundleName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  bundleDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
    textAlign: 'center',
  },
  bundleItems: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bundleItem: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  bundlePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  battlePassHeader: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  battlePassName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  battlePassDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    textAlign: 'center',
  },
  battlePassSeason: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  battlePassProgress: {
    width: '100%',
    alignItems: 'center',
  },
  battlePassLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  upgradeToPremiumButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  upgradeToPremiumText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  rewardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rewardCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  rewardLevel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  rewardType: {
    fontSize: 10,
    color: '#888',
    marginBottom: 8,
  },
  rewardItem: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  claimButton: {
    backgroundColor: '#00ff00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  claimButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  claimedButton: {
    backgroundColor: '#888',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  claimedText: {
    color: '#fff',
    fontSize: 12,
  },
  lockedButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  lockedText: {
    color: '#888',
    fontSize: 12,
  },
  lootBoxesGrid: {
    gap: 16,
  },
  lootBoxCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  lootBoxIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  lootBoxName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  lootBoxDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 12,
  },
  lootBoxContents: {
    alignItems: 'center',
    marginBottom: 16,
  },
  contentsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  contentItem: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  guaranteedItem: {
    fontSize: 12,
    color: '#00ff00',
    marginTop: 4,
  },
  openBoxButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  openBoxButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  currencyDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  currencyItem: {
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    flex: 1,
    marginHorizontal: 8,
  },
  currencyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  currencyAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  currencyLabel: {
    fontSize: 14,
    color: '#888',
  },
  inventoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  inventoryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  inventoryItemIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  inventoryItemName: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  inventoryItemAmount: {
    fontSize: 12,
    color: '#888',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    width: width * 0.8,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  modalProductName: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 8,
  },
  modalProductDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ff00',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 16,
  },
  modalConfirmButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MonetizationScreen;