#!/bin/bash

# Fix all createServerApi imports in admin API files
files=(
  "admin/pages/api/og/tiers.ts"
  "admin/pages/api/admin/users/index.ts"
  "admin/pages/api/admin/stats.ts"
  "admin/pages/api/admin/pricing.ts"
  "admin/pages/api/admin/gifts/[id].ts"
  "admin/pages/api/admin/transactions.ts"
  "admin/pages/api/admin/gifts/index.ts"
  "admin/pages/api/admin/users/[id]/ban.ts"
  "admin/pages/api/admin/users/[id]/trust.ts"
  "admin/pages/api/admin/festivals/[id]/toggle.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file"
    # Replace import
    sed -i "s/import { createServerApi } from/import adminAPI from/g" "$file"
    # Replace usage
    sed -i "s/createServerApi(req.headers as any)/adminAPI/g" "$file"
  fi
done

echo "All files fixed!"
