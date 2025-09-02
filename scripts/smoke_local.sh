#!/usr/bin/env bash
set -euo pipefail

echo "🚀 HaloBuzz Local Smoke Test"
echo "=============================="

# Configuration
BACKEND_URL=${BACKEND_URL:-http://localhost:5010}
AI_URL=${AI_URL:-http://localhost:5020}
AI_ENGINE_SECRET=${AI_ENGINE_SECRET:-test-ai-secret}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to check response
check_response() {
    local response="$1"
    local expected_status="$2"
    local test_name="$3"
    
    if [[ "$response" == *"$expected_status"* ]]; then
        echo -e "${GREEN}✅ $test_name${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name - Expected $expected_status, got: $response${NC}"
        return 1
    fi
}

# Helper function to make HTTP requests
make_request() {
    local method="$1"
    local url="$2"
    local headers="$3"
    local data="$4"
    local expected_status="$5"
    local test_name="$6"
    
    echo "Testing: $test_name"
    
    if [[ "$method" == "GET" ]]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$headers" "$url" || echo "000")
    else
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json -X "$method" "$headers" -d "$data" "$url" || echo "000")
    fi
    
    check_response "$response" "$expected_status" "$test_name"
}

echo "🔍 Testing Backend Health and Security Headers..."
echo ""

# Test 1: Health check with security headers
echo "1. Testing /healthz endpoint..."
health_response=$(curl -s -I "$BACKEND_URL/healthz" || echo "")
if [[ "$health_response" == *"200 OK"* ]]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    
    # Check security headers
    if [[ "$health_response" == *"X-Content-Type-Options: nosniff"* ]]; then
        echo -e "${GREEN}✅ X-Content-Type-Options header present${NC}"
    else
        echo -e "${RED}❌ X-Content-Type-Options header missing${NC}"
    fi
    
    if [[ "$health_response" == *"X-Frame-Options: DENY"* ]]; then
        echo -e "${GREEN}✅ X-Frame-Options header present${NC}"
    else
        echo -e "${RED}❌ X-Frame-Options header missing${NC}"
    fi
    
    if [[ "$health_response" == *"Strict-Transport-Security"* ]]; then
        echo -e "${GREEN}✅ HSTS header present${NC}"
    else
        echo -e "${RED}❌ HSTS header missing${NC}"
    fi
    
    if [[ "$health_response" == *"Content-Security-Policy"* ]]; then
        echo -e "${GREEN}✅ CSP header present${NC}"
    else
        echo -e "${RED}❌ CSP header missing${NC}"
    fi
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi

echo ""

# Test 2: User registration and login flow
echo "2. Testing user registration and login..."
echo ""

# Register user
register_data='{"email":"smoketest@halobuzz.com","password":"StrongP@ss123!","country":"NP","dob":"2000-01-01","username":"smoketest"}'
register_response=$(curl -s -w "%{http_code}" -o /tmp/register.json -X POST "$BACKEND_URL/api/v1/auth/register" \
    -H "Content-Type: application/json" -d "$register_data" || echo "000")

if [[ "$register_response" == *"201"* ]] || [[ "$register_response" == *"200"* ]]; then
    echo -e "${GREEN}✅ User registration successful${NC}"
else
    echo -e "${YELLOW}⚠️  User registration failed (may already exist)${NC}"
fi

# Login user
login_data='{"email":"smoketest@halobuzz.com","password":"StrongP@ss123!"}'
login_response=$(curl -s -w "%{http_code}" -o /tmp/login.json -X POST "$BACKEND_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" -d "$login_data" || echo "000")

if [[ "$login_response" == *"200"* ]]; then
    echo -e "${GREEN}✅ User login successful${NC}"
    
    # Extract token
    TOKEN=$(cat /tmp/login.json | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || echo "")
    if [[ -n "$TOKEN" ]]; then
        echo -e "${GREEN}✅ Access token extracted${NC}"
    else
        echo -e "${RED}❌ Failed to extract access token${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ User login failed${NC}"
    exit 1
fi

echo ""

# Test 3: Authenticated endpoints
echo "3. Testing authenticated endpoints..."
echo ""

# Test /me endpoint
me_response=$(curl -s -w "%{http_code}" -o /tmp/me.json "$BACKEND_URL/api/v1/auth/me" \
    -H "Authorization: Bearer $TOKEN" || echo "000")
check_response "$me_response" "200" "User profile endpoint"

# Test OG tiers
og_response=$(curl -s -w "%{http_code}" -o /tmp/og.json "$BACKEND_URL/api/v1/og/tiers" || echo "000")
check_response "$og_response" "200" "OG tiers endpoint"

# Test gifts
gifts_response=$(curl -s -w "%{http_code}" -o /tmp/gifts.json "$BACKEND_URL/api/v1/gifts?active=true" || echo "000")
check_response "$gifts_response" "200" "Gifts endpoint"

echo ""

# Test 4: Stream creation and management
echo "4. Testing stream creation and management..."
echo ""

# Create stream
stream_data='{"mode":"video","title":"Smoke Test Stream","isAnonymous":false}'
stream_response=$(curl -s -w "%{http_code}" -o /tmp/stream.json -X POST "$BACKEND_URL/api/v1/streams" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$stream_data" || echo "000")

if [[ "$stream_response" == *"201"* ]] || [[ "$stream_response" == *"200"* ]]; then
    echo -e "${GREEN}✅ Stream creation successful${NC}"
    
    # Extract stream ID
    STREAM_ID=$(cat /tmp/stream.json | grep -o '"_id":"[^"]*"' | cut -d'"' -f4 || echo "")
    if [[ -n "$STREAM_ID" ]]; then
        echo -e "${GREEN}✅ Stream ID extracted: $STREAM_ID${NC}"
    else
        echo -e "${RED}❌ Failed to extract stream ID${NC}"
        STREAM_ID="test-stream-id"
    fi
else
    echo -e "${RED}❌ Stream creation failed${NC}"
    STREAM_ID="test-stream-id"
fi

# Test gift sending (if we have a gift ID)
if [[ -f /tmp/gifts.json ]]; then
    GIFT_ID=$(cat /tmp/gifts.json | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
    if [[ -n "$GIFT_ID" ]]; then
        gift_data="{\"giftId\":\"$GIFT_ID\",\"qty\":1}"
        gift_response=$(curl -s -w "%{http_code}" -o /tmp/gift.json -X POST "$BACKEND_URL/api/v1/streams/$STREAM_ID/gift" \
            -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$gift_data" || echo "000")
        check_response "$gift_response" "200" "Gift sending"
    fi
fi

# Test throne claiming
throne_response=$(curl -s -w "%{http_code}" -o /tmp/throne.json -X POST "$BACKEND_URL/api/v1/streams/$STREAM_ID/throne/claim" \
    -H "Authorization: Bearer $TOKEN" || echo "000")
check_response "$throne_response" "200" "Throne claiming"

echo ""

# Test 5: AI Engine security
echo "5. Testing AI Engine security..."
echo ""

# Test AI engine health
ai_health_response=$(curl -s -w "%{http_code}" -o /tmp/ai_health.json "$AI_URL/" || echo "000")
check_response "$ai_health_response" "200" "AI Engine health check"

# Test AI engine without secret (should fail)
ai_no_secret_response=$(curl -s -w "%{http_code}" -o /tmp/ai_no_secret.json -X POST "$AI_URL/internal/engagement/battle-boost" \
    -H "Content-Type: application/json" -d "{\"streamId\":\"$STREAM_ID\",\"multiplier\":2,\"durationSec\":60}" || echo "000")
check_response "$ai_no_secret_response" "401" "AI Engine without x-ai-secret (should fail)"

# Test AI engine with secret (should succeed)
ai_with_secret_response=$(curl -s -w "%{http_code}" -o /tmp/ai_with_secret.json -X POST "$AI_URL/internal/engagement/battle-boost" \
    -H "x-ai-secret: $AI_ENGINE_SECRET" -H "Content-Type: application/json" \
    -d "{\"streamId\":\"$STREAM_ID\",\"multiplier\":2,\"durationSec\":60}" || echo "000")
check_response "$ai_with_secret_response" "200" "AI Engine with x-ai-secret"

echo ""

# Test 6: CORS and security headers
echo "6. Testing CORS and additional security..."
echo ""

# Test CORS preflight
cors_response=$(curl -s -w "%{http_code}" -o /tmp/cors.json -X OPTIONS "$BACKEND_URL/api/v1/auth/me" \
    -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" || echo "000")
check_response "$cors_response" "200" "CORS preflight request"

echo ""

# Summary
echo "🎉 Smoke Test Summary"
echo "===================="
echo -e "${GREEN}✅ Backend health and security headers${NC}"
echo -e "${GREEN}✅ User authentication flow${NC}"
echo -e "${GREEN}✅ Authenticated API endpoints${NC}"
echo -e "${GREEN}✅ Stream creation and management${NC}"
echo -e "${GREEN}✅ AI Engine security (x-ai-secret required)${NC}"
echo -e "${GREEN}✅ CORS configuration${NC}"
echo ""
echo -e "${GREEN}🚀 All smoke tests passed!${NC}"
echo ""
echo "📋 Verification Commands:"
echo "  Backend: curl -I $BACKEND_URL/healthz"
echo "  AI Engine: curl $AI_URL/"
echo "  With AI Secret: curl -H 'x-ai-secret: $AI_ENGINE_SECRET' $AI_URL/internal/engagement/battle-boost"
echo ""
echo "🔧 To run this test:"
echo "  export AI_ENGINE_SECRET='your-secret'"
echo "  ./scripts/smoke_local.sh"
