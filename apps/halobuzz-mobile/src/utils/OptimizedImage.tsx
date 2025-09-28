import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Image, StyleSheet, Platform, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  placeholder?: string;
  fallback?: string;
  priority?: 'high' | 'normal' | 'low';
  progressive?: boolean;
  cache?: boolean;
  quality?: 'low' | 'medium' | 'high' | 'original';
  sizes?: string; // Responsive sizes
  onLoad?: () => void;
  onError?: () => void;
}

// Image format optimization based on platform support
const getOptimizedUrl = (originalUrl: string, width: number, quality: string): string => {
  if (!originalUrl || typeof originalUrl !== 'string') return originalUrl;

  // For local images, return as-is
  if (!originalUrl.startsWith('http')) return originalUrl;

  try {
    const url = new URL(originalUrl);

    // Add WebP/AVIF support detection
    const supportsWebP = Platform.OS === 'android' ||
      (Platform.OS === 'web' && 'WebPImageFormat' in window);
    const supportsAVIF = Platform.OS === 'web' && 'AVIFImageFormat' in window;

    // Responsive sizing
    const dpr = Platform.OS === 'web' ? window.devicePixelRatio || 1 : 2;
    const targetWidth = Math.ceil(width * dpr);

    // Quality mapping
    const qualityMap = { low: 60, medium: 75, high: 85, original: 95 };
    const q = qualityMap[quality] || 75;

    // Build optimized URL (example for common CDNs)
    if (url.hostname.includes('cloudinary.com')) {
      // Cloudinary transformations
      const format = supportsAVIF ? 'avif' : supportsWebP ? 'webp' : 'jpg';
      return originalUrl.replace('/upload/', `/upload/w_${targetWidth},q_${q},f_${format}/`);
    } else if (url.hostname.includes('amazonaws.com')) {
      // AWS CloudFront with Lambda@Edge
      url.searchParams.set('w', targetWidth.toString());
      url.searchParams.set('q', q.toString());
      if (supportsAVIF) url.searchParams.set('f', 'avif');
      else if (supportsWebP) url.searchParams.set('f', 'webp');
      return url.toString();
    }

    // Fallback for other CDNs - add query parameters
    url.searchParams.set('width', targetWidth.toString());
    url.searchParams.set('quality', q.toString());
    return url.toString();
  } catch (error) {
    return originalUrl; // Return original on error
  }
};

// LQIP (Low Quality Image Placeholder) generator
const generateLQIP = (url: string): string => {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return '';

  try {
    const optimizedUrl = getOptimizedUrl(url, 40, 'low'); // Very small, low quality
    return optimizedUrl;
  } catch {
    return '';
  }
};

// Cache management
class ImageCache {
  private static instance: ImageCache;
  private cache = new Map<string, { data: string; timestamp: number }>();
  private maxSize = 100; // Maximum cached images
  private ttl = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache();
    }
    return ImageCache.instance;
  }

  async get(key: string): Promise<string | null> {
    // Check memory cache
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    // Check AsyncStorage
    try {
      const stored = await AsyncStorage.getItem(`img_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < this.ttl) {
          this.cache.set(key, parsed);
          return parsed.data;
        } else {
          AsyncStorage.removeItem(`img_cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('Image cache read error:', error);
    }

    return null;
  }

  async set(key: string, data: string) {
    const entry = { data, timestamp: Date.now() };

    // Update memory cache
    this.cache.set(key, entry);

    // Enforce size limit
    if (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    // Persist to storage (non-blocking)
    setTimeout(async () => {
      try {
        await AsyncStorage.setItem(`img_cache_${key}`, JSON.stringify(entry));
      } catch (error) {
        console.warn('Image cache write error:', error);
      }
    }, 0);
  }

  clear() {
    this.cache.clear();
    AsyncStorage.getAllKeys().then(keys => {
      const imageKeys = keys.filter(k => k.startsWith('img_cache_'));
      AsyncStorage.multiRemove(imageKeys);
    });
  }
}

// Main optimized image component
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  resizeMode = 'cover',
  placeholder,
  fallback,
  priority = 'normal',
  progressive = true,
  cache = true,
  quality = 'medium',
  sizes,
  onLoad,
  onError,
}) => {
  const [imageState, setImageState] = useState<{
    isLoading: boolean;
    isError: boolean;
    currentSrc: string | null;
    lqipSrc: string | null;
  }>({
    isLoading: true,
    isError: false,
    currentSrc: null,
    lqipSrc: null,
  });

  const imageCache = ImageCache.getInstance();
  const mountedRef = useRef(true);

  // Calculate responsive width
  const getImageWidth = useCallback(() => {
    if (style && style.width) {
      return typeof style.width === 'number' ? style.width : screenWidth;
    }
    return screenWidth;
  }, [style]);

  // Load image with progressive enhancement
  useEffect(() => {
    mountedRef.current = true;

    const loadImage = async () => {
      if (!source || typeof source === 'number') {
        setImageState(prev => ({ ...prev, isLoading: false, currentSrc: null }));
        return;
      }

      const originalUrl = source.uri;
      if (!originalUrl) return;

      const imageWidth = getImageWidth();
      const optimizedUrl = getOptimizedUrl(originalUrl, imageWidth, quality);
      const cacheKey = `${optimizedUrl}_${imageWidth}_${quality}`;

      try {
        // Check cache first
        if (cache) {
          const cachedUrl = await imageCache.get(cacheKey);
          if (cachedUrl && mountedRef.current) {
            setImageState(prev => ({ ...prev, currentSrc: cachedUrl, isLoading: false }));
            onLoad?.();
            return;
          }
        }

        // Progressive loading: Load LQIP first
        if (progressive) {
          const lqipUrl = generateLQIP(originalUrl);
          if (lqipUrl && mountedRef.current) {
            setImageState(prev => ({ ...prev, lqipSrc: lqipUrl }));
          }
        }

        // Load main image
        const img = new Image();
        img.onload = () => {
          if (mountedRef.current) {
            setImageState(prev => ({
              ...prev,
              currentSrc: optimizedUrl,
              isLoading: false,
              isError: false,
            }));

            // Cache the successful URL
            if (cache) {
              imageCache.set(cacheKey, optimizedUrl);
            }

            onLoad?.();
          }
        };

        img.onerror = () => {
          if (mountedRef.current) {
            if (fallback) {
              setImageState(prev => ({ ...prev, currentSrc: fallback, isLoading: false }));
            } else {
              setImageState(prev => ({ ...prev, isError: true, isLoading: false }));
              onError?.();
            }
          }
        };

        img.src = optimizedUrl;

      } catch (error) {
        if (mountedRef.current) {
          setImageState(prev => ({ ...prev, isError: true, isLoading: false }));
          onError?.();
        }
      }
    };

    loadImage();

    return () => {
      mountedRef.current = false;
    };
  }, [source, quality, cache, progressive, fallback, getImageWidth, onLoad, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const imageSource = typeof source === 'number'
    ? source
    : imageState.currentSrc
      ? { uri: imageState.currentSrc }
      : imageState.lqipSrc
        ? { uri: imageState.lqipSrc }
        : placeholder
          ? { uri: placeholder }
          : null;

  return (
    <View style={[styles.container, style]}>
      {imageSource && (
        <Image
          source={imageSource}
          style={[
            styles.image,
            style,
            imageState.lqipSrc && !imageState.currentSrc && styles.lqip,
          ]}
          resizeMode={resizeMode}
          fadeDuration={imageState.lqipSrc && imageState.currentSrc ? 300 : 0}
          // Performance optimizations
          priority={priority}
          accessibilityIgnoresInvertColors
        />
      )}

      {/* Loading placeholder */}
      {imageState.isLoading && !imageState.lqipSrc && (
        <View style={[styles.placeholder, style]}>
          <View style={styles.placeholderContent} />
        </View>
      )}

      {/* Error placeholder */}
      {imageState.isError && (
        <View style={[styles.errorPlaceholder, style]}>
          <View style={styles.errorIcon} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  lqip: {
    filter: 'blur(5px)',
  },
  placeholder: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContent: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#444',
    opacity: 0.6,
  },
  errorPlaceholder: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#666',
    opacity: 0.5,
  },
});

OptimizedImage.displayName = 'OptimizedImage';