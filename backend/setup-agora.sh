#!/bin/bash

# Agora Setup Script for HaloBuzz
# This script configures Agora credentials securely

echo "🎥 Setting up Agora for HaloBuzz"
echo "================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from template...${NC}"
    cp .env.development .env
fi

# Check if credentials are already set
if grep -q "AGORA_APP_ID=efcf83ef40e74f7a829e46f1f8d85528" .env; then
    echo -e "${GREEN}✅ Agora credentials already configured!${NC}"
else
    echo -e "${YELLOW}Updating Agora credentials...${NC}"
    
    # Update or add Agora App ID
    if grep -q "^AGORA_APP_ID=" .env; then
        sed -i.bak 's/^AGORA_APP_ID=.*/AGORA_APP_ID=efcf83ef40e74f7a829e46f1f8d85528/' .env
    else
        echo "" >> .env
        echo "# Agora Configuration" >> .env
        echo "AGORA_APP_ID=efcf83ef40e74f7a829e46f1f8d85528" >> .env
    fi
    
    # Update or add Agora Certificate
    if grep -q "^AGORA_APP_CERTIFICATE=" .env; then
        sed -i.bak 's/^AGORA_APP_CERTIFICATE=.*/AGORA_APP_CERTIFICATE=bbac84eb632941f7b3afbba8549f6d35/' .env
    else
        echo "AGORA_APP_CERTIFICATE=bbac84eb632941f7b3afbba8549f6d35" >> .env
    fi
    
    echo -e "${GREEN}✅ Agora credentials updated!${NC}"
fi

# Verify installation
echo ""
echo "Verifying configuration..."
echo "------------------------"

if grep -q "AGORA_APP_ID=efcf83ef40e74f7a829e46f1f8d85528" .env && grep -q "AGORA_APP_CERTIFICATE=bbac84eb632941f7b3afbba8549f6d35" .env; then
    echo -e "${GREEN}✅ Backend configuration: READY${NC}"
    echo "   App ID: efcf83ef40e74f7a829e46f1f8d85528"
    echo "   Certificate: Configured (hidden for security)"
else
    echo -e "${RED}❌ Configuration failed!${NC}"
    exit 1
fi

# Check mobile configuration
MOBILE_ENV="../apps/halobuzz-mobile/.env"
if [ -f "$MOBILE_ENV" ]; then
    if grep -q "AGORA_APP_ID=efcf83ef40e74f7a829e46f1f8d85528" "$MOBILE_ENV"; then
        echo -e "${GREEN}✅ Mobile configuration: READY${NC}"
    else
        echo -e "${YELLOW}Updating mobile configuration...${NC}"
        if grep -q "^AGORA_APP_ID=" "$MOBILE_ENV"; then
            sed -i.bak 's/^AGORA_APP_ID=.*/AGORA_APP_ID=efcf83ef40e74f7a829e46f1f8d85528/' "$MOBILE_ENV"
        else
            echo "" >> "$MOBILE_ENV"
            echo "# Agora Configuration" >> "$MOBILE_ENV"
            echo "AGORA_APP_ID=efcf83ef40e74f7a829e46f1f8d85528" >> "$MOBILE_ENV"
        fi
        echo -e "${GREEN}✅ Mobile configuration updated!${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Mobile .env not found. Creating it...${NC}"
    cat > "$MOBILE_ENV" << EOF
# Mobile App Environment Variables
API_URL=http://localhost:4000
WEBSOCKET_URL=ws://localhost:4000
AGORA_APP_ID=efcf83ef40e74f7a829e46f1f8d85528
EOF
    echo -e "${GREEN}✅ Mobile .env created!${NC}"
fi

echo ""
echo "================================"
echo -e "${GREEN}🎉 Agora Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start backend: npm run dev"
echo "2. Test integration: node test-agora-integration.js"
echo "3. Start mobile app: cd ../apps/halobuzz-mobile && npm run ios"
echo ""
echo "Security notes:"
echo "✅ App ID (public): efcf83ef40e74f7a829e46f1f8d85528"
echo "🔒 Certificate (backend only): Hidden for security"
echo ""
echo -e "${YELLOW}⚠️  NEVER commit the certificate to public repos!${NC}"