# Cloud WAF Configuration Guide

This guide provides comprehensive setup instructions for Cloud WAF with bot detection for HaloBuzz production deployment.

## Overview

Cloud WAF (Web Application Firewall) provides protection against common web exploits, DDoS attacks, and malicious traffic. This guide covers setup for both Cloudflare and AWS CloudFront.

## Cloudflare WAF Setup

### 1. Initial Configuration

```bash
# Install Cloudflare CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create a new zone for your domain
wrangler zone create halobuzz.com
```

### 2. DNS Configuration

```yaml
# DNS Records
A     @            YOUR_SERVER_IP
A     www          YOUR_SERVER_IP
CNAME api          YOUR_SERVER_IP
CNAME cdn          YOUR_SERVER_IP
```

### 3. Security Rules

#### Bot Management
```javascript
// Cloudflare Workers Script
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Bot detection rules
  const userAgent = request.headers.get('User-Agent') || ''
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i
  ]
  
  const isBot = suspiciousPatterns.some(pattern => pattern.test(userAgent))
  
  if (isBot && !isAllowedBot(userAgent)) {
    return new Response('Access Denied', { status: 403 })
  }
  
  // Rate limiting
  const clientIP = request.headers.get('CF-Connecting-IP')
  const rateLimitKey = `rate_limit:${clientIP}`
  
  // Check rate limit (implement with KV storage)
  const rateLimitCount = await RATE_LIMIT_KV.get(rateLimitKey)
  if (rateLimitCount && parseInt(rateLimitCount) > 100) {
    return new Response('Rate limit exceeded', { status: 429 })
  }
  
  // Update rate limit counter
  await RATE_LIMIT_KV.put(rateLimitKey, '1', { expirationTtl: 60 })
  
  return fetch(request)
}

function isAllowedBot(userAgent) {
  const allowedBots = [
    'Googlebot',
    'Bingbot',
    'Slurp',
    'DuckDuckBot',
    'Baiduspider',
    'YandexBot'
  ]
  
  return allowedBots.some(bot => userAgent.includes(bot))
}
```

#### Security Headers
```javascript
// Security headers middleware
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.stripe.com wss:; frame-src https://js.stripe.com;",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

### 4. Rate Limiting Rules

```yaml
# Cloudflare Rules Engine
rules:
  - name: "API Rate Limiting"
    expression: "(http.request.uri.path contains \"/api/\")"
    action: "rate_limit"
    rate_limit:
      requests_per_period: 100
      period: 60
      
  - name: "Login Rate Limiting"
    expression: "(http.request.uri.path contains \"/login\")"
    action: "rate_limit"
    rate_limit:
      requests_per_period: 5
      period: 60
      
  - name: "Upload Rate Limiting"
    expression: "(http.request.uri.path contains \"/upload\")"
    action: "rate_limit"
    rate_limit:
      requests_per_period: 10
      period: 300
```

### 5. DDoS Protection

```yaml
# DDoS Protection Settings
ddos_protection:
  enabled: true
  sensitivity: "medium"
  action: "challenge"
  
# Challenge settings
challenge:
  enabled: true
  duration: 30
  bypass_for_authenticated: true
```

## AWS CloudFront WAF Setup

### 1. WAF Web ACL Configuration

```yaml
# WAF Web ACL
WebACL:
  Name: "HaloBuzz-WAF"
  Rules:
    - Name: "AWSManagedRulesCommonRuleSet"
      Priority: 1
      OverrideAction:
        None: {}
      Statement:
        ManagedRuleGroupStatement:
          VendorName: "AWS"
          Name: "AWSManagedRulesCommonRuleSet"
          
    - Name: "AWSManagedRulesKnownBadInputsRuleSet"
      Priority: 2
      OverrideAction:
        None: {}
      Statement:
        ManagedRuleGroupStatement:
          VendorName: "AWS"
          Name: "AWSManagedRulesKnownBadInputsRuleSet"
          
    - Name: "RateLimitRule"
      Priority: 3
      Action:
        Block: {}
      Statement:
        RateBasedStatement:
          Limit: 2000
          AggregateKeyType: "IP"
          
    - Name: "GeoBlockingRule"
      Priority: 4
      Action:
        Block: {}
      Statement:
        GeoMatchStatement:
          CountryCodes: ["CN", "RU", "KP"]  # Block specific countries
```

### 2. CloudFront Distribution

```yaml
# CloudFront Distribution
Distribution:
  Origins:
    - Id: "HaloBuzz-Origin"
      DomainName: "api.halobuzz.com"
      CustomOriginConfig:
        HTTPPort: 443
        HTTPSPort: 443
        OriginProtocolPolicy: "https-only"
        OriginSSLProtocols: ["TLSv1.2"]
        
  DefaultCacheBehavior:
    TargetOriginId: "HaloBuzz-Origin"
    ViewerProtocolPolicy: "redirect-to-https"
    CachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"  # CachingDisabled
    OriginRequestPolicyId: "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"  # CORS-S3Origin
    
  CacheBehaviors:
    - PathPattern: "/api/*"
      TargetOriginId: "HaloBuzz-Origin"
      ViewerProtocolPolicy: "https-only"
      CachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
      OriginRequestPolicyId: "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"
      
    - PathPattern: "/static/*"
      TargetOriginId: "HaloBuzz-Origin"
      ViewerProtocolPolicy: "redirect-to-https"
      CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6"  # CachingOptimized
      
  WebACLId: "arn:aws:wafv2:us-east-1:ACCOUNT:webacl/HaloBuzz-WAF/ID"
  
  Aliases:
    - "api.halobuzz.com"
    - "cdn.halobuzz.com"
    
  ViewerCertificate:
    AcmCertificateArn: "arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID"
    SslSupportMethod: "sni-only"
    MinimumProtocolVersion: "TLSv1.2_2021"
```

### 3. Lambda@Edge Functions

```javascript
// Bot Detection Lambda@Edge
exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  
  // Bot detection
  const userAgent = headers['user-agent'] ? headers['user-agent'][0].value : '';
  const suspiciousPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i
  ];
  
  const isBot = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  if (isBot && !isAllowedBot(userAgent)) {
    const response = {
      status: '403',
      statusDescription: 'Forbidden',
      body: 'Access Denied',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'text/plain' }]
      }
    };
    
    callback(null, response);
    return;
  }
  
  // Add security headers
  request.headers['x-forwarded-proto'] = [{ key: 'X-Forwarded-Proto', value: 'https' }];
  request.headers['x-real-ip'] = [{ key: 'X-Real-IP', value: headers['cloudfront-viewer-address'][0].value }];
  
  callback(null, request);
};

function isAllowedBot(userAgent) {
  const allowedBots = [
    'Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot',
    'Baiduspider', 'YandexBot'
  ];
  
  return allowedBots.some(bot => userAgent.includes(bot));
}
```

## Environment Configuration

### 1. Environment Variables

```bash
# .env.production
WAF_ENABLED=true
WAF_PROVIDER=cloudflare  # or aws
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token
AWS_WAF_WEB_ACL_ID=your_web_acl_id
AWS_CLOUDFRONT_DISTRIBUTION_ID=your_distribution_id

# Bot detection
BOT_DETECTION_ENABLED=true
ALLOWED_BOTS=Googlebot,Bingbot,Slurp,DuckDuckBot
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Security headers
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true
```

### 2. Application Integration

```typescript
// src/config/waf.ts
export interface WAFConfig {
  enabled: boolean;
  provider: 'cloudflare' | 'aws';
  botDetection: {
    enabled: boolean;
    allowedBots: string[];
  };
  rateLimiting: {
    enabled: boolean;
    requests: number;
    window: number;
  };
  securityHeaders: {
    enabled: boolean;
    csp: boolean;
    hsts: boolean;
  };
}

export const wafConfig: WAFConfig = {
  enabled: process.env.WAF_ENABLED === 'true',
  provider: (process.env.WAF_PROVIDER as 'cloudflare' | 'aws') || 'cloudflare',
  botDetection: {
    enabled: process.env.BOT_DETECTION_ENABLED === 'true',
    allowedBots: process.env.ALLOWED_BOTS?.split(',') || []
  },
  rateLimiting: {
    enabled: process.env.RATE_LIMIT_ENABLED === 'true',
    requests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '60')
  },
  securityHeaders: {
    enabled: process.env.SECURITY_HEADERS_ENABLED === 'true',
    csp: process.env.CSP_ENABLED === 'true',
    hsts: process.env.HSTS_ENABLED === 'true'
  }
};
```

## Monitoring and Alerting

### 1. Cloudflare Analytics

```javascript
// Cloudflare Analytics Dashboard
const analyticsConfig = {
  metrics: [
    'requests',
    'bandwidth',
    'threats',
    'bot_score',
    'cache_hit_ratio'
  ],
  timeRange: '24h',
  filters: {
    country: 'all',
    status: 'all'
  }
};
```

### 2. AWS CloudWatch Metrics

```yaml
# CloudWatch Alarms
alarms:
  - name: "High-WAF-Block-Rate"
    metric: "BlockedRequests"
    threshold: 1000
    period: 300
    evaluation_periods: 2
    
  - name: "High-Origin-Errors"
    metric: "OriginErrorRate"
    threshold: 5
    period: 300
    evaluation_periods: 2
```

## Testing and Validation

### 1. WAF Testing Script

```bash
#!/bin/bash
# test-waf.sh

BASE_URL="https://api.halobuzz.com"

echo "Testing WAF Configuration..."

# Test bot detection
echo "Testing bot detection..."
curl -H "User-Agent: BadBot/1.0" "$BASE_URL/api/v1/health"
# Should return 403

# Test rate limiting
echo "Testing rate limiting..."
for i in {1..10}; do
  curl "$BASE_URL/api/v1/health"
done
# Should eventually return 429

# Test security headers
echo "Testing security headers..."
curl -I "$BASE_URL/api/v1/health"
# Should include security headers

echo "WAF testing completed!"
```

### 2. Performance Testing

```bash
# Load test with WAF enabled
npm run load-test:production

# Compare with and without WAF
npm run load-test:baseline
npm run load-test:waf-enabled
```

## Maintenance and Updates

### 1. Regular Security Updates

```bash
# Update WAF rules monthly
wrangler ruleset update --ruleset-id RULESET_ID --rules RULES_FILE

# Review blocked requests weekly
aws logs filter-log-events --log-group-name /aws/wafv2/webacl
```

### 2. Performance Monitoring

```bash
# Monitor WAF performance impact
curl -w "@curl-format.txt" -o /dev/null -s "$BASE_URL/api/v1/health"

# Check cache hit ratios
aws cloudwatch get-metric-statistics --namespace AWS/CloudFront
```

## Troubleshooting

### Common Issues

1. **False Positives**: Adjust bot detection rules
2. **Performance Impact**: Optimize WAF rules order
3. **Blocked Legitimate Traffic**: Review geo-blocking rules
4. **Cache Issues**: Check CloudFront cache behaviors

### Debug Commands

```bash
# Check WAF logs
aws logs describe-log-groups --log-group-name-prefix /aws/wafv2

# Test specific rules
wrangler ruleset test --ruleset-id RULESET_ID --url "https://api.halobuzz.com"

# Monitor real-time traffic
aws logs tail /aws/wafv2/webacl --follow
```

This comprehensive WAF setup provides robust protection against common web threats while maintaining optimal performance for legitimate users.
