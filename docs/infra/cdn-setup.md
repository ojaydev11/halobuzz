# CDN Configuration Guide

This guide provides comprehensive setup instructions for Content Delivery Network (CDN) configuration for HaloBuzz static assets and media content.

## Overview

CDN setup optimizes content delivery by caching static assets, images, and media files at edge locations worldwide, reducing latency and improving user experience.

## Cloudflare CDN Setup

### 1. Zone Configuration

```bash
# Create Cloudflare zone
wrangler zone create halobuzz.com

# Configure DNS records
wrangler dns create halobuzz.com --type CNAME --name cdn --content cdn.halobuzz.com
wrangler dns create halobuzz.com --type CNAME --name static --content static.halobuzz.com
wrangler dns create halobuzz.com --type CNAME --name media --content media.halobuzz.com
```

### 2. Page Rules Configuration

```yaml
# Page Rules for optimal caching
page_rules:
  - url: "halobuzz.com/static/*"
    settings:
      cache_level: "cache_everything"
      edge_cache_ttl: 31536000  # 1 year
      browser_cache_ttl: 31536000
      security_level: "medium"
      
  - url: "halobuzz.com/media/*"
    settings:
      cache_level: "cache_everything"
      edge_cache_ttl: 2592000  # 30 days
      browser_cache_ttl: 604800  # 7 days
      polish: "lossless"
      mirage: "on"
      
  - url: "halobuzz.com/api/*"
    settings:
      cache_level: "bypass"
      security_level: "high"
      ssl: "full"
```

### 3. Cache Configuration

```javascript
// Cloudflare Workers for advanced caching
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Static assets caching
  if (url.pathname.startsWith('/static/')) {
    const cache = caches.default
    const cacheKey = new Request(url.toString(), request)
    
    let response = await cache.match(cacheKey)
    
    if (!response) {
      response = await fetch(request)
      
      // Cache for 1 year
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      headers.set('CDN-Cache-Control', 'max-age=31536000')
      
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      })
      
      event.waitUntil(cache.put(cacheKey, response.clone()))
    }
    
    return response
  }
  
  // Media files with image optimization
  if (url.pathname.startsWith('/media/')) {
    const cache = caches.default
    const cacheKey = new Request(url.toString(), request)
    
    let response = await cache.match(cacheKey)
    
    if (!response) {
      response = await fetch(request)
      
      // Apply image optimization
      if (response.headers.get('content-type')?.startsWith('image/')) {
        response = await optimizeImage(response, request)
      }
      
      // Cache for 30 days
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'public, max-age=2592000')
      headers.set('CDN-Cache-Control', 'max-age=2592000')
      
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      })
      
      event.waitUntil(cache.put(cacheKey, response.clone()))
    }
    
    return response
  }
  
  return fetch(request)
}

async function optimizeImage(response, request) {
  const url = new URL(request.url)
  
  // Extract optimization parameters
  const width = url.searchParams.get('w')
  const height = url.searchParams.get('h')
  const quality = url.searchParams.get('q') || '85'
  const format = url.searchParams.get('f') || 'auto'
  
  if (width || height || quality !== '85' || format !== 'auto') {
    // Use Cloudflare Image Resizing
    const optimizedUrl = new URL(request.url)
    optimizedUrl.searchParams.set('width', width || 'auto')
    optimizedUrl.searchParams.set('height', height || 'auto')
    optimizedUrl.searchParams.set('quality', quality)
    optimizedUrl.searchParams.set('format', format)
    
    return fetch(optimizedUrl.toString())
  }
  
  return response
}
```

## AWS CloudFront CDN Setup

### 1. CloudFront Distribution

```yaml
# CloudFront Distribution for CDN
Distribution:
  Comment: "HaloBuzz CDN Distribution"
  Origins:
    - Id: "S3-Static-Origin"
      DomainName: "halobuzz-static.s3.amazonaws.com"
      S3OriginConfig:
        OriginAccessIdentity: "origin-access-identity/cloudfront/E1234567890"
        
    - Id: "S3-Media-Origin"
      DomainName: "halobuzz-media.s3.amazonaws.com"
      S3OriginConfig:
        OriginAccessIdentity: "origin-access-identity/cloudfront/E1234567890"
        
    - Id: "API-Origin"
      DomainName: "api.halobuzz.com"
      CustomOriginConfig:
        HTTPPort: 443
        HTTPSPort: 443
        OriginProtocolPolicy: "https-only"
        OriginSSLProtocols: ["TLSv1.2"]
        
  DefaultCacheBehavior:
    TargetOriginId: "S3-Static-Origin"
    ViewerProtocolPolicy: "redirect-to-https"
    CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6"  # CachingOptimized
    OriginRequestPolicyId: "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"  # CORS-S3Origin
    ResponseHeadersPolicyId: "67f7725c-6f97-4210-82d7-5512b31e9d03"  # SecurityHeadersPolicy
    
  CacheBehaviors:
    # Static assets - long cache
    - PathPattern: "/static/*"
      TargetOriginId: "S3-Static-Origin"
      ViewerProtocolPolicy: "redirect-to-https"
      CachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"  # CachingDisabled (use custom)
      CustomCachePolicy:
        Name: "StaticAssetsPolicy"
        DefaultTTL: 31536000  # 1 year
        MaxTTL: 31536000
        MinTTL: 0
        ParametersInCacheKeyAndForwardedToOrigin:
          EnableAcceptEncodingGzip: true
          EnableAcceptEncodingBrotli: true
          QueryStringsConfig:
            QueryStringBehavior: "none"
          HeadersConfig:
            HeaderBehavior: "none"
          CookiesConfig:
            CookieBehavior: "none"
            
    # Media files - medium cache with optimization
    - PathPattern: "/media/*"
      TargetOriginId: "S3-Media-Origin"
      ViewerProtocolPolicy: "redirect-to-https"
      CachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"  # CachingDisabled (use custom)
      CustomCachePolicy:
        Name: "MediaFilesPolicy"
        DefaultTTL: 2592000  # 30 days
        MaxTTL: 2592000
        MinTTL: 0
        ParametersInCacheKeyAndForwardedToOrigin:
          EnableAcceptEncodingGzip: true
          EnableAcceptEncodingBrotli: true
          QueryStringsConfig:
            QueryStringBehavior: "whitelist"
            QueryStrings:
              - "w"
              - "h"
              - "q"
              - "f"
          HeadersConfig:
            HeaderBehavior: "none"
          CookiesConfig:
            CookieBehavior: "none"
            
    # API endpoints - no cache
    - PathPattern: "/api/*"
      TargetOriginId: "API-Origin"
      ViewerProtocolPolicy: "https-only"
      CachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"  # CachingDisabled
      OriginRequestPolicyId: "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"  # CORS-S3Origin
      
  Aliases:
    - "cdn.halobuzz.com"
    - "static.halobuzz.com"
    - "media.halobuzz.com"
    
  ViewerCertificate:
    AcmCertificateArn: "arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID"
    SslSupportMethod: "sni-only"
    MinimumProtocolVersion: "TLSv1.2_2021"
    
  PriceClass: "PriceClass_100"  # Use only North America and Europe
  Enabled: true
  HttpVersion: "http2"
  IsIPV6Enabled: true
```

### 2. Lambda@Edge Functions

```javascript
// Image optimization Lambda@Edge
exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;
  
  // Handle image optimization requests
  if (uri.startsWith('/media/') && request.querystring) {
    const params = new URLSearchParams(request.querystring);
    const width = params.get('w');
    const height = params.get('h');
    const quality = params.get('q');
    const format = params.get('f');
    
    if (width || height || quality || format) {
      // Modify request to include optimization parameters
      request.querystring = `w=${width || 'auto'}&h=${height || 'auto'}&q=${quality || '85'}&f=${format || 'auto'}`;
    }
  }
  
  // Add security headers
  const response = {
    status: '200',
    statusDescription: 'OK',
    headers: {
      'cache-control': [{ key: 'Cache-Control', value: 'public, max-age=31536000' }],
      'x-content-type-options': [{ key: 'X-Content-Type-Options', value: 'nosniff' }],
      'x-frame-options': [{ key: 'X-Frame-Options', value: 'DENY' }],
      'x-xss-protection': [{ key: 'X-XSS-Protection', value: '1; mode=block' }]
    }
  };
  
  callback(null, request);
};
```

### 3. S3 Bucket Configuration

```yaml
# S3 Bucket for static assets
StaticBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: "halobuzz-static"
    PublicAccessBlockConfiguration:
      BlockPublicAcls: true
      BlockPublicPolicy: true
      IgnorePublicAcls: true
      RestrictPublicBuckets: true
    CorsConfiguration:
      CorsRules:
        - AllowedHeaders: ["*"]
          AllowedMethods: ["GET", "HEAD"]
          AllowedOrigins: ["https://halobuzz.com", "https://www.halobuzz.com"]
          MaxAge: 3600
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: "AES256"
            
# S3 Bucket for media files
MediaBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: "halobuzz-media"
    PublicAccessBlockConfiguration:
      BlockPublicAcls: true
      BlockPublicPolicy: true
      IgnorePublicAcls: true
      RestrictPublicBuckets: true
    CorsConfiguration:
      CorsRules:
        - AllowedHeaders: ["*"]
          AllowedMethods: ["GET", "HEAD"]
          AllowedOrigins: ["https://halobuzz.com", "https://www.halobuzz.com"]
          MaxAge: 3600
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: "AES256"
```

## Application Integration

### 1. CDN Configuration

```typescript
// src/config/cdn.ts
export interface CDNConfig {
  enabled: boolean;
  provider: 'cloudflare' | 'aws' | 'custom';
  domains: {
    static: string;
    media: string;
    api: string;
  };
  optimization: {
    images: boolean;
    compression: boolean;
    minification: boolean;
  };
  caching: {
    static: number; // TTL in seconds
    media: number;
    api: number;
  };
}

export const cdnConfig: CDNConfig = {
  enabled: process.env.CDN_ENABLED === 'true',
  provider: (process.env.CDN_PROVIDER as 'cloudflare' | 'aws' | 'custom') || 'cloudflare',
  domains: {
    static: process.env.CDN_STATIC_DOMAIN || 'https://static.halobuzz.com',
    media: process.env.CDN_MEDIA_DOMAIN || 'https://media.halobuzz.com',
    api: process.env.CDN_API_DOMAIN || 'https://api.halobuzz.com'
  },
  optimization: {
    images: process.env.CDN_IMAGE_OPTIMIZATION === 'true',
    compression: process.env.CDN_COMPRESSION === 'true',
    minification: process.env.CDN_MINIFICATION === 'true'
  },
  caching: {
    static: parseInt(process.env.CDN_STATIC_TTL || '31536000'), // 1 year
    media: parseInt(process.env.CDN_MEDIA_TTL || '2592000'), // 30 days
    api: parseInt(process.env.CDN_API_TTL || '0') // No cache
  }
};
```

### 2. Asset URL Generation

```typescript
// src/utils/cdn.ts
import { cdnConfig } from '@/config/cdn';

export class CDNUtils {
  static getStaticUrl(path: string): string {
    if (!cdnConfig.enabled) {
      return `/static/${path}`;
    }
    
    return `${cdnConfig.domains.static}/static/${path}`;
  }
  
  static getMediaUrl(path: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  }): string {
    if (!cdnConfig.enabled) {
      return `/media/${path}`;
    }
    
    let url = `${cdnConfig.domains.media}/media/${path}`;
    
    if (options && cdnConfig.optimization.images) {
      const params = new URLSearchParams();
      
      if (options.width) params.set('w', options.width.toString());
      if (options.height) params.set('h', options.height.toString());
      if (options.quality) params.set('q', options.quality.toString());
      if (options.format) params.set('f', options.format);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }
    
    return url;
  }
  
  static getApiUrl(path: string): string {
    if (!cdnConfig.enabled) {
      return `/api/v1/${path}`;
    }
    
    return `${cdnConfig.domains.api}/api/v1/${path}`;
  }
  
  static preloadAssets(assets: string[]): void {
    if (typeof window === 'undefined') return;
    
    assets.forEach(asset => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = asset;
      link.as = asset.endsWith('.css') ? 'style' : 'script';
      document.head.appendChild(link);
    });
  }
}
```

### 3. Middleware for CDN Headers

```typescript
// src/middleware/cdn.ts
import { Request, Response, NextFunction } from 'express';
import { cdnConfig } from '@/config/cdn';

export const cdnMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!cdnConfig.enabled) {
    return next();
  }
  
  // Set appropriate cache headers based on path
  if (req.path.startsWith('/static/')) {
    res.set({
      'Cache-Control': `public, max-age=${cdnConfig.caching.static}, immutable`,
      'CDN-Cache-Control': `max-age=${cdnConfig.caching.static}`,
      'Vary': 'Accept-Encoding'
    });
  } else if (req.path.startsWith('/media/')) {
    res.set({
      'Cache-Control': `public, max-age=${cdnConfig.caching.media}`,
      'CDN-Cache-Control': `max-age=${cdnConfig.caching.media}`,
      'Vary': 'Accept-Encoding'
    });
  } else if (req.path.startsWith('/api/')) {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'CDN-Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
  
  next();
};
```

## Performance Optimization

### 1. Asset Optimization

```bash
# Image optimization script
#!/bin/bash
# optimize-images.sh

INPUT_DIR="public/images"
OUTPUT_DIR="public/images/optimized"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Optimize images
find "$INPUT_DIR" -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" | while read file; do
  filename=$(basename "$file")
  name="${filename%.*}"
  extension="${filename##*.}"
  
  # Generate multiple sizes
  for size in 320 640 1280 1920; do
    convert "$file" -resize "${size}x" -quality 85 "$OUTPUT_DIR/${name}-${size}w.${extension}"
  done
  
  # Generate WebP version
  cwebp "$file" -q 85 -o "$OUTPUT_DIR/${name}.webp"
done

echo "Image optimization completed!"
```

### 2. Bundle Optimization

```typescript
// webpack.config.js
const path = require('path');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          }
        }
      })
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  },
  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8
    })
  ]
};
```

## Monitoring and Analytics

### 1. CDN Performance Monitoring

```typescript
// src/services/cdnMonitoring.ts
export class CDNMonitoringService {
  static async getPerformanceMetrics(): Promise<{
    cacheHitRatio: number;
    bandwidth: number;
    requests: number;
    errors: number;
  }> {
    // Implementation depends on CDN provider
    // Cloudflare: Use Analytics API
    // AWS: Use CloudWatch metrics
    
    return {
      cacheHitRatio: 0.95,
      bandwidth: 1024000, // bytes
      requests: 10000,
      errors: 50
    };
  }
  
  static async getGeographicDistribution(): Promise<Record<string, number>> {
    return {
      'US': 45,
      'EU': 30,
      'APAC': 20,
      'Other': 5
    };
  }
}
```

### 2. Cache Invalidation

```typescript
// src/services/cacheInvalidation.ts
export class CacheInvalidationService {
  static async invalidateStaticAssets(paths: string[]): Promise<boolean> {
    try {
      if (process.env.CDN_PROVIDER === 'cloudflare') {
        // Cloudflare cache purge
        const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            files: paths.map(path => `${process.env.CDN_STATIC_DOMAIN}${path}`)
          })
        });
        
        return response.ok;
      } else if (process.env.CDN_PROVIDER === 'aws') {
        // AWS CloudFront invalidation
        const AWS = require('aws-sdk');
        const cloudfront = new AWS.CloudFront();
        
        const params = {
          DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
          InvalidationBatch: {
            CallerReference: Date.now().toString(),
            Paths: {
              Quantity: paths.length,
              Items: paths
            }
          }
        };
        
        await cloudfront.createInvalidation(params).promise();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      return false;
    }
  }
}
```

## Testing and Validation

### 1. CDN Testing Script

```bash
#!/bin/bash
# test-cdn.sh

BASE_URL="https://cdn.halobuzz.com"
STATIC_URL="https://static.halobuzz.com"
MEDIA_URL="https://media.halobuzz.com"

echo "Testing CDN Configuration..."

# Test static assets
echo "Testing static assets..."
curl -I "$STATIC_URL/static/css/main.css"
# Should return 200 with long cache headers

# Test media optimization
echo "Testing media optimization..."
curl -I "$MEDIA_URL/media/images/avatar.jpg?w=320&h=320&q=85&f=webp"
# Should return 200 with optimized image

# Test cache headers
echo "Testing cache headers..."
curl -I "$BASE_URL/static/js/app.js" | grep -i "cache-control"
# Should show appropriate cache headers

# Test compression
echo "Testing compression..."
curl -H "Accept-Encoding: gzip" -I "$BASE_URL/static/css/main.css" | grep -i "content-encoding"
# Should show gzip encoding

echo "CDN testing completed!"
```

### 2. Performance Testing

```bash
# Test CDN performance
npm run test:cdn-performance

# Compare with and without CDN
npm run test:performance:baseline
npm run test:performance:cdn
```

This comprehensive CDN setup provides optimal content delivery with proper caching, compression, and optimization for all types of assets while maintaining security and performance standards.
