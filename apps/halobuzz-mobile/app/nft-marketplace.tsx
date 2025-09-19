import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';

interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
  creator: {
    id: string;
    username: string;
    avatar?: string;
    isVerified: boolean;
  };
  price: number;
  currency: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  createdAt: string;
  isAuction?: boolean;
  auctionEndsAt?: string;
  currentBid?: number;
  bidCount?: number;
  isOwned?: boolean;
}

export default function NFTMarketplaceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('newest');

  const categories = [
    { id: 'all', name: 'All', icon: 'grid-outline' },
    { id: 'art', name: 'Art', icon: 'brush-outline' },
    { id: 'gaming', name: 'Gaming', icon: 'game-controller-outline' },
    { id: 'music', name: 'Music', icon: 'musical-notes-outline' },
    { id: 'sports', name: 'Sports', icon: 'football-outline' },
    { id: 'collectibles', name: 'Collectibles', icon: 'diamond-outline' },
  ];

  const sortOptions = [
    { id: 'newest', name: 'Newest' },
    { id: 'price-low', name: 'Price: Low to High' },
    { id: 'price-high', name: 'Price: High to Low' },
    { id: 'rarity', name: 'Rarity' },
    { id: 'trending', name: 'Trending' },
  ];

  useEffect(() => {
    loadNFTs();
  }, [selectedCategory, selectedSort]);

  const loadNFTs = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockNFTs: NFT[] = [
        {
          id: '1',
          name: 'Digital Dreamscape',
          description: 'A mesmerizing digital artwork created with AI',
          image: 'https://via.placeholder.com/300x300',
          creator: {
            id: 'creator1',
            username: 'digitalartist',
            avatar: 'https://via.placeholder.com/50',
            isVerified: true,
          },
          price: 0.5,
          currency: 'ETH',
          rarity: 'rare',
          category: 'art',
          createdAt: new Date().toISOString(),
          isAuction: true,
          auctionEndsAt: new Date(Date.now() + 86400000).toISOString(),
          currentBid: 0.8,
          bidCount: 12,
        },
        {
          id: '2',
          name: 'Epic Gaming Moment',
          description: 'Captured the most epic gaming moment ever',
          image: 'https://via.placeholder.com/300x300',
          creator: {
            id: 'creator2',
            username: 'gamerpro',
            avatar: 'https://via.placeholder.com/50',
            isVerified: false,
          },
          price: 0.2,
          currency: 'ETH',
          rarity: 'common',
          category: 'gaming',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '3',
          name: 'Legendary Music Beat',
          description: 'Original beat created by top producer',
          image: 'https://via.placeholder.com/300x300',
          creator: {
            id: 'creator3',
            username: 'musicproducer',
            avatar: 'https://via.placeholder.com/50',
            isVerified: true,
          },
          price: 2.0,
          currency: 'ETH',
          rarity: 'legendary',
          category: 'music',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: '4',
          name: 'Sports Championship',
          description: 'Moment from the greatest sports championship',
          image: 'https://via.placeholder.com/300x300',
          creator: {
            id: 'creator4',
            username: 'sportsfan',
            avatar: 'https://via.placeholder.com/50',
            isVerified: false,
          },
          price: 1.5,
          currency: 'ETH',
          rarity: 'epic',
          category: 'sports',
          createdAt: new Date(Date.now() - 259200000).toISOString(),
        },
      ];

      // Filter by category
      let filteredNFTs = mockNFTs;
      if (selectedCategory !== 'all') {
        filteredNFTs = mockNFTs.filter(nft => nft.category === selectedCategory);
      }

      // Sort NFTs
      switch (selectedSort) {
        case 'price-low':
          filteredNFTs.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          filteredNFTs.sort((a, b) => b.price - a.price);
          break;
        case 'rarity':
          const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
          filteredNFTs.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
          break;
        case 'trending':
          filteredNFTs.sort((a, b) => (b.bidCount || 0) - (a.bidCount || 0));
          break;
        default: // newest
          filteredNFTs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      setNfts(filteredNFTs);
    } catch (error) {
      console.error('Failed to load NFTs:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNFTs();
    setRefreshing(false);
  };

  const handlePurchase = async (nftId: string) => {
    try {
      Alert.alert(
        'Purchase NFT',
        'Are you sure you want to purchase this NFT?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Purchase',
            onPress: () => {
              // Mock purchase - replace with actual API call
              console.log('Purchasing NFT:', nftId);
              Alert.alert('Success', 'NFT purchased successfully!');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to purchase NFT:', error);
      Alert.alert('Error', 'Failed to purchase NFT');
    }
  };

  const handleBid = async (nftId: string) => {
    try {
      Alert.alert(
        'Place Bid',
        'Enter your bid amount',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Place Bid',
            onPress: () => {
              // Mock bid - replace with actual API call
              console.log('Placing bid on NFT:', nftId);
              Alert.alert('Success', 'Bid placed successfully!');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to place bid:', error);
      Alert.alert('Error', 'Failed to place bid');
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return '#ff6b35';
      case 'epic': return '#9d4edd';
      case 'rare': return '#007AFF';
      case 'common': return '#888';
      default: return '#888';
    }
  };

  const formatTimeLeft = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const renderNFT = ({ item }: { item: NFT }) => (
    <TouchableOpacity 
      style={styles.nftCard}
      onPress={() => router.push(`/nft/${item.id}`)}
    >
      <View style={styles.nftImageContainer}>
        <Image source={{ uri: item.image }} style={styles.nftImage} />
        <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(item.rarity) }]}>
          <Text style={styles.rarityText}>{item.rarity.toUpperCase()}</Text>
        </View>
        {item.isAuction && (
          <View style={styles.auctionBadge}>
            <Text style={styles.auctionText}>AUCTION</Text>
          </View>
        )}
      </View>
      
      <View style={styles.nftInfo}>
        <Text style={styles.nftName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.nftDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.creatorInfo}>
          <View style={styles.creatorAvatar}>
            {item.creator.avatar ? (
              <Image source={{ uri: item.creator.avatar }} style={styles.creatorAvatarImage} />
            ) : (
              <View style={styles.creatorAvatarPlaceholder}>
                <Text style={styles.creatorAvatarText}>
                  {item.creator.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {item.creator.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={8} color="#fff" />
              </View>
            )}
          </View>
          <Text style={styles.creatorName}>@{item.creator.username}</Text>
        </View>
        
        <View style={styles.priceSection}>
          {item.isAuction ? (
            <View style={styles.auctionInfo}>
              <Text style={styles.currentBidLabel}>Current Bid</Text>
              <Text style={styles.currentBidPrice}>
                {item.currentBid} {item.currency}
              </Text>
              <Text style={styles.timeLeft}>
                {formatTimeLeft(item.auctionEndsAt!)}
              </Text>
            </View>
          ) : (
            <View style={styles.fixedPriceInfo}>
              <Text style={styles.priceLabel}>Price</Text>
              <Text style={styles.price}>
                {item.price} {item.currency}
              </Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => item.isAuction ? handleBid(item.id) : handlePurchase(item.id)}
        >
          <Text style={styles.actionButtonText}>
            {item.isAuction ? 'Place Bid' : 'Buy Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const CategoryButton = ({ category }: { category: any }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === category.id && styles.categoryButtonActive
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Ionicons 
        name={category.icon as any} 
        size={16} 
        color={selectedCategory === category.id ? '#fff' : '#888'} 
      />
      <Text style={[
        styles.categoryButtonText,
        selectedCategory === category.id && styles.categoryButtonTextActive
      ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading marketplace...</Text>
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
        <Text style={styles.headerTitle}>NFT Marketplace</Text>
        <TouchableOpacity onPress={() => router.push('/nft/my-collection')}>
          <Ionicons name="library-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <CategoryButton key={category.id} category={category} />
          ))}
        </ScrollView>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortContent}
        >
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.sortButton,
                selectedSort === option.id && styles.sortButtonActive
              ]}
              onPress={() => setSelectedSort(option.id)}
            >
              <Text style={[
                styles.sortButtonText,
                selectedSort === option.id && styles.sortButtonTextActive
              ]}>
                {option.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={nfts}
        renderItem={renderNFT}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="diamond-outline" size={64} color="#888" />
            <Text style={styles.emptyStateText}>No NFTs found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your filters or check back later
            </Text>
          </View>
        }
      />
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
  categoriesContainer: {
    paddingVertical: 16,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  sortLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  sortContent: {
    gap: 8,
  },
  sortButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sortButtonActive: {
    backgroundColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 20,
  },
  nftCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginHorizontal: 6,
    marginBottom: 16,
    overflow: 'hidden',
  },
  nftImageContainer: {
    position: 'relative',
    height: 200,
  },
  nftImage: {
    width: '100%',
    height: '100%',
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  auctionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ff0000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  auctionText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  nftInfo: {
    padding: 12,
  },
  nftName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  nftDescription: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
    lineHeight: 16,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorAvatar: {
    position: 'relative',
    marginRight: 8,
  },
  creatorAvatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  creatorAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorAvatarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  creatorName: {
    fontSize: 12,
    color: '#888',
  },
  priceSection: {
    marginBottom: 12,
  },
  auctionInfo: {
    alignItems: 'center',
  },
  currentBidLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 2,
  },
  currentBidPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  timeLeft: {
    fontSize: 10,
    color: '#ff0000',
    fontWeight: '500',
  },
  fixedPriceInfo: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
