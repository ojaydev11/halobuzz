import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import InAppPurchaseService, { CoinPackage } from '@/services/InAppPurchaseService';

interface CoinPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseComplete?: (coins: number) => void;
}

export default function CoinPurchaseModal({
  visible,
  onClose,
  onPurchaseComplete,
}: CoinPurchaseModalProps) {
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadPackages();
    }
  }, [visible]);

  const loadPackages = async () => {
    setLoading(true);
    try {
      await InAppPurchaseService.initialize();
      const availablePackages = InAppPurchaseService.getCoinPackages();
      setPackages(availablePackages);
    } catch (error) {
      console.error('Failed to load IAP packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: CoinPackage) => {
    if (purchasing) return;

    setSelectedPackage(pkg.id);
    setPurchasing(true);

    try {
      const result = await InAppPurchaseService.purchaseCoins(pkg.productId);

      if (result.success && result.coins) {
        onPurchaseComplete?.(result.coins);
        onClose();
      }
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setPurchasing(false);
      setSelectedPackage(null);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      await InAppPurchaseService.restorePurchases();
    } catch (error) {
      console.error('Restore error:', error);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>💰 Purchase Coins</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6C5CE7" />
              <Text style={styles.loadingText}>Loading packages...</Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.packagesContainer}>
                {packages.map((pkg) => {
                  const isSelected = selectedPackage === pkg.id;
                  const totalCoins = pkg.coins + (pkg.bonus || 0);

                  return (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[
                        styles.packageCard,
                        pkg.popular && styles.popularPackage,
                        pkg.bestValue && styles.bestValuePackage,
                        isSelected && styles.selectedPackage,
                      ]}
                      onPress={() => handlePurchase(pkg)}
                      disabled={purchasing}
                    >
                      {pkg.popular && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>POPULAR</Text>
                        </View>
                      )}
                      {pkg.bestValue && (
                        <View style={[styles.badge, styles.bestValueBadge]}>
                          <Text style={styles.badgeText}>BEST VALUE</Text>
                        </View>
                      )}

                      <View style={styles.packageInfo}>
                        <View style={styles.packageHeader}>
                          <Text style={styles.packageTitle}>{pkg.title}</Text>
                          <Text style={styles.packagePrice}>{pkg.price}</Text>
                        </View>

                        <Text style={styles.packageCoins}>
                          {totalCoins.toLocaleString()} Coins
                        </Text>

                        {pkg.bonus && pkg.bonus > 0 && (
                          <Text style={styles.packageBonus}>
                            🎁 +{pkg.bonus} Bonus Coins
                          </Text>
                        )}

                        {isSelected && purchasing && (
                          <ActivityIndicator
                            size="small"
                            color="#6C5CE7"
                            style={styles.purchasingIndicator}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Restore Purchases Button */}
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={purchasing}
              >
                <Text style={styles.restoreButtonText}>
                  {purchasing ? 'Restoring...' : 'Restore Purchases'}
                </Text>
              </TouchableOpacity>

              {/* Footer Info */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  🔒 Secure payment via {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}
                </Text>
                <Text style={styles.footerSubtext}>
                  All transactions are processed securely
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A24',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A2A3E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#9B9BA5',
    fontSize: 16,
  },
  packagesContainer: {
    padding: 16,
  },
  packageCard: {
    backgroundColor: '#2A2A3E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  popularPackage: {
    borderColor: '#6C5CE7',
  },
  bestValuePackage: {
    borderColor: '#00D4AA',
  },
  selectedPackage: {
    opacity: 0.7,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  bestValueBadge: {
    backgroundColor: '#00D4AA',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  packageInfo: {
    flex: 1,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  packageCoins: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 4,
  },
  packageBonus: {
    fontSize: 14,
    color: '#00D4AA',
    fontWeight: '600',
  },
  purchasingIndicator: {
    marginTop: 12,
  },
  restoreButton: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#2A2A3E',
    borderRadius: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#9B9BA5',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#9B9BA5',
    fontSize: 13,
    marginBottom: 4,
  },
  footerSubtext: {
    color: '#6B6B78',
    fontSize: 11,
  },
});
