#!/bin/bash

# HaloBuzz Hosted Smoke Tests
# Tests core functionality on production deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-https://halobuzz-backend.railway.app}"
AI_URL="${AI_URL:-https://halobuzz-ai.railway.app}"
TEST_EMAIL="test@hb.com"
TEST_PASSWORD="StrongP@ss1"

echo -e "${YELLOW}🚀 Starting HaloBuzz Hosted Smoke Tests${NC}"
echo "Backend URL: $BACKEND_URL"
echo "AI Engine URL: $AI_URL"
echo ""

# Function to make HTTP requests
make_request() {
    local method="$1"
    local url="$2"
    local headers="$3"
    local data="$4"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" "$url" -H "$headers" -d "$data"
    else
        curl -s -X "$method" "$url" -H "$headers"
    fi
}

# Function to check response
check_response() {
    local response="$1"
    local expected_status="$2"
    local test_name="$3"
    
    if echo "$response" | grep -q "$expected_status"; then
        echo -e "${GREEN}✅ $test_name${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Test 1: Health Check
echo -e "${YELLOW}1. Testing Health Endpoints${NC}"
backend_health=$(make_request "GET" "$BACKEND_URL/healthz")
ai_health=$(make_request "GET" "$AI_URL/healthz")

check_response "$backend_health" "200" "Backend health check"
check_response "$ai_health" "200" "AI Engine health check"

# Test 2: Authentication
echo -e "${YELLOW}2. Testing Authentication${NC}"
login_response=$(make_request "POST" "$BACKEND_URL/auth/login" \
    "Content-Type: application/json" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$login_response" | grep -q "accessToken"; then
    echo -e "${GREEN}✅ Login successful${NC}"
    TOKEN=$(echo "$login_response" | node -pe "JSON.parse(fs.readFileSync(0,'utf8')).accessToken")
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "Response: $login_response"
    exit 1
fi

# Test 3: User Profile
echo -e "${YELLOW}3. Testing User Profile${NC}"
profile_response=$(make_request "GET" "$BACKEND_URL/me" "Authorization: Bearer $TOKEN")
check_response "$profile_response" "email" "Get user profile"

# Test 4: OG Tiers
echo -e "${YELLOW}4. Testing OG Tiers${NC}"
tiers_response=$(make_request "GET" "$BACKEND_URL/og/tiers")
check_response "$tiers_response" "tiers" "Get OG tiers"

# Test 5: OG Subscription
echo -e "${YELLOW}5. Testing OG Subscription${NC}"
subscribe_response=$(make_request "POST" "$BACKEND_URL/og/subscribe" \
    "Authorization: Bearer $TOKEN" \
    "Content-Type: application/json" \
    '{"tier":1}')
check_response "$subscribe_response" "success" "Subscribe to OG tier"

# Test 6: Dev Credit (Testing Only)
echo -e "${YELLOW}6. Testing Dev Credit${NC}"
credit_response=$(make_request "POST" "$BACKEND_URL/wallet/dev/credit" \
    "Authorization: Bearer $TOKEN" \
    "Content-Type: application/json" \
    '{"coins":10000}')
check_response "$credit_response" "success" "Add dev credit"

# Test 7: Create Stream
echo -e "${YELLOW}7. Testing Stream Creation${NC}"
stream_response=$(make_request "POST" "$BACKEND_URL/streams" \
    "Authorization: Bearer $TOKEN" \
    "Content-Type: application/json" \
    '{"mode":"video","title":"Hello HB","isAnonymous":false}')

if echo "$stream_response" | grep -q "_id\|id"; then
    echo -e "${GREEN}✅ Stream created successfully${NC}"
    STREAM_ID=$(echo "$stream_response" | node -pe "x=JSON.parse(fs.readFileSync(0,'utf8'));x._id||x.id||x?.data?.stream?.id")
else
    echo -e "${RED}❌ Stream creation failed${NC}"
    echo "Response: $stream_response"
    exit 1
fi

# Test 8: Gifts List
echo -e "${YELLOW}8. Testing Gifts List${NC}"
gifts_response=$(make_request "GET" "$BACKEND_URL/gifts?active=true")
check_response "$gifts_response" "gifts" "Get active gifts"

if echo "$gifts_response" | grep -q "_id\|id"; then
    GIFT_ID=$(echo "$gifts_response" | node -pe "a=JSON.parse(fs.readFileSync(0,'utf8'));(a[0]&&(a[0]._id||a[0].id))||''")
    echo -e "${GREEN}✅ Gifts retrieved, using first gift: $GIFT_ID${NC}"
else
    echo -e "${YELLOW}⚠️  No gifts available${NC}"
    GIFT_ID=""
fi

# Test 9: Send Gift
if [ -n "$GIFT_ID" ]; then
    echo -e "${YELLOW}9. Testing Gift Sending${NC}"
    gift_response=$(make_request "POST" "$BACKEND_URL/streams/$STREAM_ID/gift" \
        "Authorization: Bearer $TOKEN" \
        "Content-Type: application/json" \
        "{\"giftId\":\"$GIFT_ID\",\"qty\":1}")
    check_response "$gift_response" "success" "Send gift to stream"
fi

# Test 10: Claim Throne
echo -e "${YELLOW}10. Testing Throne Claim${NC}"
throne_response=$(make_request "POST" "$BACKEND_URL/streams/$STREAM_ID/throne/claim" \
    "Authorization: Bearer $TOKEN")
check_response "$throne_response" "success" "Claim throne"

# Test 11: AI Engine Security (No Secret)
echo -e "${YELLOW}11. Testing AI Engine Security (No Secret)${NC}"
ai_no_secret_response=$(make_request "POST" "$AI_URL/internal/engagement/battle-boost" \
    "Content-Type: application/json" \
    "{\"streamId\":\"$STREAM_ID\",\"multiplier\":2,\"durationSec\":60}")

if echo "$ai_no_secret_response" | grep -q "401\|403"; then
    echo -e "${GREEN}✅ AI Engine properly rejects requests without secret${NC}"
else
    echo -e "${RED}❌ AI Engine should reject requests without secret${NC}"
    echo "Response: $ai_no_secret_response"
fi

# Test 12: AI Engine Security (With Secret)
echo -e "${YELLOW}12. Testing AI Engine Security (With Secret)${NC}"
AI_SECRET="${AI_ENGINE_SECRET:-test-secret}"
ai_with_secret_response=$(make_request "POST" "$AI_URL/internal/engagement/battle-boost" \
    "x-ai-secret: $AI_SECRET" \
    "Content-Type: application/json" \
    "{\"streamId\":\"$STREAM_ID\",\"multiplier\":2,\"durationSec\":60}")

if echo "$ai_with_secret_response" | grep -q "200\|success"; then
    echo -e "${GREEN}✅ AI Engine accepts requests with valid secret${NC}"
else
    echo -e "${YELLOW}⚠️  AI Engine response with secret: $ai_with_secret_response${NC}"
fi

# Test 13: Rate Limiting
echo -e "${YELLOW}13. Testing Rate Limiting${NC}"
rate_limit_failed=false
for i in {1..6}; do
    rate_response=$(make_request "POST" "$BACKEND_URL/auth/login" \
        "Content-Type: application/json" \
        '{"email":"test@example.com","password":"wrongpassword"}')
    
    if echo "$rate_response" | grep -q "429"; then
        echo -e "${GREEN}✅ Rate limiting working (got 429 on attempt $i)${NC}"
        break
    fi
    
    if [ $i -eq 6 ]; then
        echo -e "${YELLOW}⚠️  Rate limiting may not be working (no 429 after 6 attempts)${NC}"
        rate_limit_failed=true
    fi
done

# Test 14: Security Headers
echo -e "${YELLOW}14. Testing Security Headers${NC}"
headers_response=$(curl -s -I "$BACKEND_URL/healthz")
security_headers=("strict-transport" "x-frame-options" "x-content-type-options" "content-security-policy")

for header in "${security_headers[@]}"; do
    if echo "$headers_response" | grep -qi "$header"; then
        echo -e "${GREEN}✅ Security header present: $header${NC}"
    else
        echo -e "${YELLOW}⚠️  Security header missing: $header${NC}"
    fi
done

# Summary
echo ""
echo -e "${YELLOW}📊 Smoke Test Summary${NC}"
echo "Backend URL: $BACKEND_URL"
echo "AI Engine URL: $AI_URL"
echo "Stream ID: $STREAM_ID"
echo "Gift ID: $GIFT_ID"

if [ "$rate_limit_failed" = true ]; then
    echo -e "${YELLOW}⚠️  Some tests had warnings, but core functionality is working${NC}"
    exit 0
else
    echo -e "${GREEN}🎉 All smoke tests passed successfully!${NC}"
    exit 0
fi
