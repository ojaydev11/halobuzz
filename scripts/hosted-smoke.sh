#!/bin/bash

# HaloBuzz Hosted Smoke Test Script
# Usage: BACKEND_URL=<url> AI_URL=<url> AI_ENGINE_SECRET=<secret> ./scripts/hosted-smoke.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check required environment variables
if [ -z "$BACKEND_URL" ] || [ -z "$AI_URL" ] || [ -z "$AI_ENGINE_SECRET" ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    echo "BACKEND_URL=$BACKEND_URL"
    echo "AI_URL=$AI_URL"
    echo "AI_ENGINE_SECRET=${AI_ENGINE_SECRET:0:8}..."
    echo ""
    echo "Usage: BACKEND_URL=<url> AI_URL=<url> AI_ENGINE_SECRET=<secret> ./scripts/hosted-smoke.sh"
    exit 1
fi

echo -e "${GREEN}🚀 Starting HaloBuzz Hosted Smoke Tests${NC}"
echo "Backend: $BACKEND_URL"
echo "AI Engine: $AI_URL"
echo ""

# Initialize results
RESULTS_FILE="SMOKE_RESULTS.md"
echo "# HaloBuzz Hosted Smoke Test Results" > $RESULTS_FILE
echo "" >> $RESULTS_FILE
echo "**Test Date:** $(date -u)" >> $RESULTS_FILE
echo "**Backend URL:** $BACKEND_URL" >> $RESULTS_FILE
echo "**AI URL:** $AI_URL" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE
echo "## Test Results" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local headers="$4"
    local data="$5"
    local expected_code="${6:-200}"
    
    echo -e "${YELLOW}Testing $name...${NC}"
    
    if [ "$method" = "POST" ]; then
    if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
                -H "Content-Type: application/json" \
                $headers \
                -d "$data" 2>/dev/null || echo "FAILED")
        else
            response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
                $headers 2>/dev/null || echo "FAILED")
        fi
    else
        response=$(curl -s -w "\n%{http_code}" "$url" \
            $headers 2>/dev/null || echo "FAILED")
    fi
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "$expected_code" ]; then
        echo -e "${GREEN}✅ $name: PASSED (HTTP $http_code)${NC}"
        echo "✅ **$name:** PASSED (HTTP $http_code)" >> $RESULTS_FILE
        return 0
    else
        echo -e "${RED}❌ $name: FAILED (HTTP $http_code)${NC}"
        echo "❌ **$name:** FAILED (HTTP $http_code)" >> $RESULTS_FILE
        return 1
    fi
}

# 1. Backend Health Check
echo "### 1. Backend Health Check" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE
test_endpoint "Backend Health" "$BACKEND_URL/healthz"
echo "" >> $RESULTS_FILE

# 2. AI Engine Health Check
echo "### 2. AI Engine Health Check" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE
test_endpoint "AI Engine Health" "$AI_URL/healthz"
echo "" >> $RESULTS_FILE

# 3. Authentication Flow
echo "### 3. Authentication Flow" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Register (idempotent)
register_data='{"email":"test@hb.com","password":"StrongP@ss1","username":"smoketest"}'
test_endpoint "Register" "$BACKEND_URL/auth/register" "POST" "" "$register_data"

# Login
login_data='{"email":"test@hb.com","password":"StrongP@ss1"}'
login_response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "$login_data" 2>/dev/null || echo "FAILED")

login_code=$(echo "$login_response" | tail -n 1)
token=$(echo "$login_response" | head -n -1 | jq -r '.accessToken // empty' 2>/dev/null || echo "")

if [ "$login_code" = "200" ] && [ -n "$token" ] && [ "$token" != "null" ]; then
    echo -e "${GREEN}✅ Login: PASSED (HTTP $login_code)${NC}"
    echo "✅ **Login:** PASSED (HTTP $login_code)" >> $RESULTS_FILE
else
    echo -e "${RED}❌ Login: FAILED (HTTP $login_code)${NC}"
    echo "❌ **Login:** FAILED (HTTP $login_code)" >> $RESULTS_FILE
    token=""
fi
echo "" >> $RESULTS_FILE

# 4. Core API Tests (if authenticated)
if [ -n "$token" ]; then
    echo "### 4. Core API Tests" >> $RESULTS_FILE
    echo "" >> $RESULTS_FILE
    
    auth_header="-H \"Authorization: Bearer $token\""
    
    # OG Tiers
    test_endpoint "OG Tiers" "$BACKEND_URL/og/tiers" "GET" "$auth_header"
    
    # Dev Credit
    credit_data='{"coins":10000}'
    test_endpoint "Dev Credit" "$BACKEND_URL/wallet/dev/credit" "POST" "$auth_header" "$credit_data"
    
    echo "" >> $RESULTS_FILE
    
    # 5. Stream and Gift Flow
    echo "### 5. Stream and Gift Flow" >> $RESULTS_FILE
    echo "" >> $RESULTS_FILE
    
    # Create stream
    stream_data='{"mode":"video","title":"Smoke Test Stream","isAnonymous":false}'
    stream_response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/streams" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$stream_data" 2>/dev/null || echo "FAILED")
    
    stream_code=$(echo "$stream_response" | tail -n 1)
    stream_id=$(echo "$stream_response" | head -n -1 | jq -r '._id // .id // .data.stream.id // empty' 2>/dev/null || echo "")
    
    if [ "$stream_code" = "200" ] && [ -n "$stream_id" ]; then
        echo -e "${GREEN}✅ Create Stream: PASSED (HTTP $stream_code)${NC}"
        echo "✅ **Create Stream:** PASSED (HTTP $stream_code)" >> $RESULTS_FILE
        echo "**Stream ID:** $stream_id" >> $RESULTS_FILE
        
        # Get gifts
        gifts_response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/gifts?active=true" 2>/dev/null || echo "FAILED")
        gifts_code=$(echo "$gifts_response" | tail -n 1)
        gift_id=$(echo "$gifts_response" | head -n -1 | jq -r '.[0]._id // .[0].id // empty' 2>/dev/null || echo "")
        
        if [ "$gifts_code" = "200" ] && [ -n "$gift_id" ]; then
            echo -e "${GREEN}✅ Get Gifts: PASSED (HTTP $gifts_code)${NC}"
            echo "✅ **Get Gifts:** PASSED (HTTP $gifts_code)" >> $RESULTS_FILE
            
            # Send gift
            gift_send_data="{\"giftId\":\"$gift_id\",\"qty\":1}"
            test_endpoint "Send Gift" "$BACKEND_URL/streams/$stream_id/gift" "POST" "$auth_header" "$gift_send_data"
        else
            echo -e "${RED}❌ Get Gifts: FAILED (HTTP $gifts_code)${NC}"
            echo "❌ **Get Gifts:** FAILED (HTTP $gifts_code)" >> $RESULTS_FILE
        fi
    else
        echo -e "${RED}❌ Create Stream: FAILED (HTTP $stream_code)${NC}"
        echo "❌ **Create Stream:** FAILED (HTTP $stream_code)" >> $RESULTS_FILE
    fi
    echo "" >> $RESULTS_FILE
    
    # 6. AI Engine Security Tests
    if [ -n "$stream_id" ]; then
        echo "### 6. AI Engine Security Tests" >> $RESULTS_FILE
        echo "" >> $RESULTS_FILE
        
        # Test without x-ai-secret (should fail)
        ai_no_secret_response=$(curl -s -w "\n%{http_code}" -X POST "$AI_URL/internal/engagement/battle-boost" \
            -H "Content-Type: application/json" \
            -d "{\"streamId\":\"$stream_id\",\"multiplier\":2,\"durationSec\":60}" 2>/dev/null || echo "FAILED")
        ai_no_secret_code=$(echo "$ai_no_secret_response" | tail -n 1)
        
        if [ "$ai_no_secret_code" = "401" ] || [ "$ai_no_secret_code" = "403" ]; then
            echo -e "${GREEN}✅ AI No Secret Test: PASSED (HTTP $ai_no_secret_code - correctly rejected)${NC}"
            echo "✅ **AI No Secret Test:** PASSED (HTTP $ai_no_secret_code - correctly rejected)" >> $RESULTS_FILE
        else
            echo -e "${RED}❌ AI No Secret Test: FAILED (HTTP $ai_no_secret_code - should be 401/403)${NC}"
            echo "❌ **AI No Secret Test:** FAILED (HTTP $ai_no_secret_code - should be 401/403)" >> $RESULTS_FILE
        fi
        
        # Test with x-ai-secret (should succeed)
        ai_with_secret_response=$(curl -s -w "\n%{http_code}" -X POST "$AI_URL/internal/engagement/battle-boost" \
            -H "x-ai-secret: $AI_ENGINE_SECRET" \
            -H "Content-Type: application/json" \
            -d "{\"streamId\":\"$stream_id\",\"multiplier\":2,\"durationSec\":60}" 2>/dev/null || echo "FAILED")
        ai_with_secret_code=$(echo "$ai_with_secret_response" | tail -n 1)
        
        if [ "$ai_with_secret_code" = "200" ]; then
            echo -e "${GREEN}✅ AI With Secret Test: PASSED (HTTP $ai_with_secret_code)${NC}"
            echo "✅ **AI With Secret Test:** PASSED (HTTP $ai_with_secret_code)" >> $RESULTS_FILE
        else
            echo -e "${RED}❌ AI With Secret Test: FAILED (HTTP $ai_with_secret_code)${NC}"
            echo "❌ **AI With Secret Test:** FAILED (HTTP $ai_with_secret_code)" >> $RESULTS_FILE
        fi
        echo "" >> $RESULTS_FILE
    fi
else
    echo "### 4-6. Core API Tests: SKIPPED (no auth token)" >> $RESULTS_FILE
    echo "" >> $RESULTS_FILE
fi

# Finalize results
echo "## Summary" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE
echo "**Test completed at:** $(date -u)" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE
echo "Check individual test results above for detailed status." >> $RESULTS_FILE

echo ""
echo -e "${GREEN}🎉 Smoke tests completed! Results saved to $RESULTS_FILE${NC}"
echo ""
echo "To view results:"
echo "cat $RESULTS_FILE"