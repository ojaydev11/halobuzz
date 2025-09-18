import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  image: string;
  creator: {
    username: string;
    avatar?: string;
    verified: boolean;
  };
  category: string;
  isLive: boolean;
  viewers: number;
  discount?: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  isWishlisted?: boolean;
}

interface LiveStream {
  id: string;
  title: string;
  creator: {
    username: string;
    avatar?: string;
  };
  thumbnail: string;
  viewers: number;
  products: Product[];
  isLive: boolean;
}

export default function LiveCommerceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('live');
  const [products, setProducts] = useState<Product[]>([]);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadCommerceData();
    startPulseAnimation();
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadCommerceData = async () => {
    try {
      setLoading(true);
      
      // Mock live streams with products
      const mockStreams: LiveStream[] = [
        {
          id: '1',
          title: 'Gaming Setup Review',
          creator: {
            username: 'gamingpro',
            avatar: 'https://via.placeholder.com/40x40/007AFF/ffffff?text=GP',
          },
          thumbnail: 'https://via.placeholder.com/300x200/ff0000/ffffff?text=LIVE',
          viewers: 1250,
          isLive: true,
          products: [
            {
              id: '1',
              name: 'Gaming Headset Pro',
              description: 'High-quality gaming headset with noise cancellation',
              price: 199.99,
              originalPrice: 249.99,
              currency: 'USD',
              image: 'https://via.placeholder.com/200x200/007AFF/ffffff?text=Headset',
              creator: {
                username: 'gamingpro',
                avatar: 'https://via.placeholder.com/40x40/007AFF/ffffff?text=GP',
                verified: true,
              },
              category: 'Electronics',
              isLive: true,
              viewers: 1250,
              discount: 20,
              rating: 4.8,
              reviews: 156,
              inStock: true,
            },
          ],
        },
        {
          id: '2',
          title: 'Fashion Haul',
          creator: {
            username: 'fashionista',
            avatar: 'https://via.placeholder.com/40x40/ff00ff/ffffff?text=F',
          },
          thumbnail: 'https://via.placeholder.com/300x200/ff00ff/ffffff?text=LIVE',
          viewers: 890,
          isLive: true,
          products: [
            {
              id: '2',
              name: 'Designer Jacket',
              description: 'Trendy designer jacket for all seasons',
              price: 89.99,
              currency: 'USD',
              image: 'https://via.placeholder.com/200x200/ff00ff/ffffff?text=Jacket',
              creator: {
                username: 'fashionista',
                avatar: 'https://via.placeholder.com/40x40/ff00ff/ffffff?text=F',
                verified: true,
              },
              category: 'Fashion',
              isLive: true,
              viewers: 890,
              rating: 4.6,
              reviews: 89,
              inStock: true,
            },
          ],
        },
      ];

      // Mock products
      const mockProducts: Product[] = [
        {
          id: '3',
          name: 'Wireless Earbuds',
          description: 'Premium wireless earbuds with active noise cancellation',
          price: 149.99,
          originalPrice: 199.99,
          currency: 'USD',
          image: 'https://via.placeholder.com/200x200/00ff00/ffffff?text=Earbuds',
          creator: {
            username: 'techreviewer',
            avatar: 'https://via.placeholder.com/40x40/00ff00/ffffff?text=TR',
            verified: true,
          },
          category: 'Electronics',
          isLive: false,
          viewers: 0,
          discount: 25,
          rating: 4.9,
          reviews: 234,
          inStock: true,
        },
        {
          id: '4',
          name: 'Smart Watch',
          description: 'Advanced smartwatch with health monitoring',
          price: 299.99,
          currency: 'USD',
          image: 'https://via.placeholder.com/200x200/ffaa00/ffffff?text=Watch',
          creator: {
            username: 'techreviewer',
            avatar: 'https://via.placeholder.com/40x40/ffaa00/ffffff?text=TR',
            verified: true,
          },
          category: 'Electronics',
          isLive: false,
          viewers: 0,
          rating: 4.7,
          reviews: 167,
          inStock: true,
        },
        {
          id: '5',
          name: 'Art Print Collection',
          description: 'Beautiful digital art prints for your home',
          price: 29.99,
          currency: 'USD',
          image: 'https://via.placeholder.com/200x200/9d4edd/ffffff?text=Art',
          creator: {
            username: 'digitalartist',
            avatar: 'https://via.placeholder.com/40x40/9d4edd/ffffff?text=DA',
            verified: false,
          },
          category: 'Art',
          isLive: false,
          viewers: 0,
          rating: 4.5,
          reviews: 45,
          inStock: true,
        },
      ];

      setLiveStreams(mockStreams);
      setProducts(mockProducts);
    } catch (error) {
      console.error('Failed to load commerce data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    Alert.alert(
      'Add to Cart',
      `Add "${product.name}" to your cart for ${product.currency} ${product.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to Cart',
          onPress: () => {
            Alert.alert('Success', 'Product added to cart!');
          },
        },
      ]
    );
  };

  const handleBuyNow = (product: Product) => {
    Alert.alert(
      'Buy Now',
      `Purchase "${product.name}" for ${product.currency} ${product.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy Now',
          onPress: () => {
            Alert.alert('Success', 'Purchase completed!');
          },
        },
      ]
    );
  };

  const handleWishlist = (productId: string) => {
    setProducts(prev => prev.map(product => 
      product.id === productId 
        ? { ...product, isWishlisted: !product.isWishlisted }
        : product
    ));
  };

  const formatPrice = (price: number, currency: string) => {
    return `${currency} ${price.toFixed(2)}`;
  };

  const TabButton = ({ id, title, isActive, onPress }: {
    id: string;
    title: string;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{title}</Text>
    </TouchableOpacity>
  );

  const LiveStreamCard = ({ stream }: { stream: LiveStream }) => (
    <TouchableOpacity 
      style={styles.streamCard}
      onPress={() => router.push(`/stream/${stream.id}`)}
    >
      <View style={styles.streamThumbnail}>
        <Image source={{ uri: stream.thumbnail }} style={styles.thumbnailImage} />
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.viewerCount}>
          <Ionicons name="eye" size={12} color="#fff" />
          <Text style={styles.viewerText}>{stream.viewers}</Text>
        </View>
      </View>
      
      <View style={styles.streamInfo}>
        <View style={styles.streamHeader}>
          <Image source={{ uri: stream.creator.avatar }} style={styles.creatorAvatar} />
          <View style={styles.streamDetails}>
            <Text style={styles.streamTitle} numberOfLines={1}>{stream.title}</Text>
            <Text style={styles.creatorName}>@{stream.creator.username}</Text>
          </View>
        </View>
        <Text style={styles.productCount}>{stream.products.length} products</Text>
      </View>
    </TouchableOpacity>
  );

  const ProductCard = ({ product }: { product: Product }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => {
        setSelectedProduct(product);
        setShowProductModal(true);
      }}
    >
      <View style={styles.productImageContainer}>
        <Image source={{ uri: product.image }} style={styles.productImage} />
        {product.discount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{product.discount}%</Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.wishlistButton}
          onPress={() => handleWishlist(product.id)}
        >
          <Ionicons 
            name={product.isWishlisted ? "heart" : "heart-outline"} 
            size={16} 
            color={product.isWishlisted ? "#ff0000" : "#fff"} 
          />
        </TouchableOpacity>
        {product.isLive && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <View style={styles.creatorInfo}>
          <Image source={{ uri: product.creator.avatar }} style={styles.creatorAvatarSmall} />
          <Text style={styles.creatorNameSmall}>@{product.creator.username}</Text>
          {product.creator.verified && (
            <Ionicons name="checkmark-circle" size={12} color="#007AFF" />
          )}
        </View>
        <View style={styles.productMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color="#ffaa00" />
            <Text style={styles.ratingText}>{product.rating}</Text>
            <Text style={styles.reviewsText}>({product.reviews})</Text>
          </View>
          <Text style={styles.categoryText}>{product.category}</Text>
        </View>
        <View style={styles.priceContainer}>
          <View style={styles.priceInfo}>
            <Text style={styles.currentPrice}>{formatPrice(product.price, product.currency)}</Text>
            {product.originalPrice && (
              <Text style={styles.originalPrice}>{formatPrice(product.originalPrice, product.currency)}</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.addToCartButton}
            onPress={() => handleAddToCart(product)}
          >
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading live commerce...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Live Commerce</Text>
          <Text style={styles.subtitle}>Shop while you watch</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity 
            style={styles.cartButton}
            onPress={() => router.push('/cart')}
          >
            <Ionicons name="cart" size={16} color="#fff" />
            <Text style={styles.cartButtonText}>Cart</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{liveStreams.length}</Text>
          <Text style={styles.statLabel}>Live Streams</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{products.length}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>24/7</Text>
          <Text style={styles.statLabel}>Shopping</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>∞</Text>
          <Text style={styles.statLabel}>Deals</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TabButton
          id="live"
          title="Live Shopping"
          isActive={activeTab === 'live'}
          onPress={() => setActiveTab('live')}
        />
        <TabButton
          id="products"
          title="All Products"
          isActive={activeTab === 'products'}
          onPress={() => setActiveTab('products')}
        />
        <TabButton
          id="deals"
          title="Deals"
          isActive={activeTab === 'deals'}
          onPress={() => setActiveTab('deals')}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'live' && (
          <View style={styles.liveTab}>
            <Text style={styles.sectionTitle}>Live Shopping Streams</Text>
            {liveStreams.map(stream => (
              <LiveStreamCard key={stream.id} stream={stream} />
            ))}
          </View>
        )}

        {activeTab === 'products' && (
          <View style={styles.productsTab}>
            <View style={styles.productsHeader}>
              <Text style={styles.sectionTitle}>All Products</Text>
              <TouchableOpacity style={styles.filterButton}>
                <Ionicons name="filter" size={16} color="#007AFF" />
                <Text style={styles.filterText}>Filter</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.productsGrid}>
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </View>
          </View>
        )}

        {activeTab === 'deals' && (
          <View style={styles.dealsTab}>
            <Text style={styles.sectionTitle}>Special Deals</Text>
            <View style={styles.dealsGrid}>
              {products.filter(p => p.discount).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Product Modal */}
      <Modal visible={showProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {selectedProduct && (
              <>
                <Image source={{ uri: selectedProduct.image }} style={styles.modalImage} />
                
                <View style={styles.modalInfo}>
                  <Text style={styles.modalDescription}>{selectedProduct.description}</Text>
                  
                  <View style={styles.modalCreator}>
                    <Image source={{ uri: selectedProduct.creator.avatar }} style={styles.modalCreatorAvatar} />
                    <Text style={styles.modalCreatorName}>@{selectedProduct.creator.username}</Text>
                    {selectedProduct.creator.verified && (
                      <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
                    )}
                  </View>

                  <View style={styles.modalPrice}>
                    <Text style={styles.modalCurrentPrice}>
                      {formatPrice(selectedProduct.price, selectedProduct.currency)}
                    </Text>
                    {selectedProduct.originalPrice && (
                      <Text style={styles.modalOriginalPrice}>
                        {formatPrice(selectedProduct.originalPrice, selectedProduct.currency)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={styles.addToCartModalButton}
                      onPress={() => {
                        handleAddToCart(selectedProduct);
                        setShowProductModal(false);
                      }}
                    >
                      <Ionicons name="cart" size={20} color="#fff" />
                      <Text style={styles.addToCartModalText}>Add to Cart</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.buyNowModalButton}
                      onPress={() => {
                        handleBuyNow(selectedProduct);
                        setShowProductModal(false);
                      }}
                    >
                      <Ionicons name="flash" size={20} color="#fff" />
                      <Text style={styles.buyNowModalText}>Buy Now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
    fontSize: 16,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ff00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  cartButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  liveTab: {
    marginBottom: 20,
  },
  streamCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  streamThumbnail: {
    position: 'relative',
    height: 200,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  liveIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff0000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  viewerCount: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  viewerText: {
    color: '#fff',
    fontSize: 10,
  },
  streamInfo: {
    padding: 16,
  },
  streamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  streamDetails: {
    flex: 1,
  },
  streamTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  creatorName: {
    color: '#888',
    fontSize: 14,
  },
  productCount: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
  },
  productsTab: {
    marginBottom: 20,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
    height: 150,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ff0000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#ff0000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  creatorAvatarSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  creatorNameSmall: {
    color: '#888',
    fontSize: 12,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  reviewsText: {
    color: '#888',
    fontSize: 10,
  },
  categoryText: {
    color: '#888',
    fontSize: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceInfo: {
    flex: 1,
  },
  currentPrice: {
    color: '#00ff00',
    fontSize: 16,
    fontWeight: 'bold',
  },
  originalPrice: {
    color: '#888',
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealsTab: {
    marginBottom: 20,
  },
  dealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalImage: {
    width: '100%',
    height: 200,
  },
  modalInfo: {
    padding: 20,
  },
  modalDescription: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 22,
  },
  modalCreator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  modalCreatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  modalCreatorName: {
    color: '#888',
    fontSize: 14,
  },
  modalPrice: {
    marginBottom: 20,
  },
  modalCurrentPrice: {
    color: '#00ff00',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalOriginalPrice: {
    color: '#888',
    fontSize: 16,
    textDecorationLine: 'line-through',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  addToCartModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  addToCartModalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buyNowModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ff00',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buyNowModalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
