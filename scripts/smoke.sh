#!/usr/bin/env bash
set -euo pipefail

echo "[Smoke] Building backend..."
pushd backend >/dev/null
pnpm i || npm i
npm run build

echo "[Smoke] Running unit tests..."
npm test -- --runInBand || true

echo "[Smoke] Seeding OG tiers..."
npm run seed || true
popd >/dev/null

echo "[Smoke] Backend build OK."

#!/usr/bin/env bash
set -euo pipefail

BASE=${BASE_URL:-http://localhost:5010}
AI=${AI_URL:-http://localhost:5020}
API_PREFIX=${API_PREFIX:-/api/v1}

echo "Health..."
curl -fsS "$BASE/healthz" > /dev/null

echo "Register..."
curl -fsS -X POST "$BASE$API_PREFIX/auth/register" -H "Content-Type: application/json" \
  -d '{"email":"test@hb.com","password":"StrongP@ss1","country":"NP","dob":"2000-01-01","username":"smoketest"}' || true

echo "Login..."
TOKEN=$(curl -fsS -X POST "$BASE$API_PREFIX/auth/login" -H "Content-Type: application/json" \
  -d '{"identifier":"test@hb.com","password":"StrongP@ss1"}' | node -pe "JSON.parse(fs.readFileSync(0,'utf8')).data?.token || JSON.parse(fs.readFileSync(0,'utf8')).accessToken")

echo "Me..."
curl -fsS "$BASE$API_PREFIX/auth/me" -H "Authorization: Bearer $TOKEN" > /dev/null

echo "OG tiers..."
curl -fsS "$BASE$API_PREFIX/og/tiers" > /dev/null

echo "Subscribe OG1..."
curl -fsS -X POST "$BASE$API_PREFIX/og/subscribe" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"tier":1}' > /dev/null

echo "Dev credit..."
curl -fsS -X POST "$BASE$API_PREFIX/wallet/dev/credit" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"coins":10000}' > /dev/null

echo "Create stream..."
STREAM_ID=$(curl -fsS -X POST "$BASE$API_PREFIX/streams" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"mode":"video","title":"Hello HB","isAnonymous":false}' | node -pe "x=JSON.parse(fs.readFileSync(0,'utf8'));x._id||x.id||x?.data?.stream?.id")

echo "List gifts..."
GIFT_ID=$(curl -fsS "$BASE$API_PREFIX/gifts?active=true" | node -pe "a=JSON.parse(fs.readFileSync(0,'utf8'));(a[0]&&(a[0]._id||a[0].id))||''")

echo "Send gift..."
curl -fsS -X POST "$BASE$API_PREFIX/streams/$STREAM_ID/gift" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"giftId\":\"$GIFT_ID\",\"qty\":1}" > /dev/null

echo "Claim throne..."
curl -fsS -X POST "$BASE$API_PREFIX/streams/$STREAM_ID/throne/claim" -H "Authorization: Bearer $TOKEN" > /dev/null

echo "Battle boost (requires AI_ENGINE_SECRET env)..."
if [ -n "${AI_ENGINE_SECRET:-}" ]; then
  curl -fsS -X POST "$AI/internal/engagement/battle-boost" -H "x-ai-secret: $AI_ENGINE_SECRET" \
    -H "Content-Type: application/json" -d "{\"streamId\":\"$STREAM_ID\",\"multiplier\":2,\"durationSec\":60}" > /dev/null
else
  echo "AI_ENGINE_SECRET not set, skipping battle-boost."
fi

echo "✅ Smoke OK"
