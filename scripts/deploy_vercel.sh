#!/usr/bin/env bash
# Deploy SIPADU BMN ke Vercel (produksi).
# SEMUA rahasia dibaca dari file lokal; tidak pernah dicetak ke layar/argv.
set -euo pipefail

DROP="/c/Users/WANDANA/AppData/Local/hermes/tmp/sipadu-secrets"
PROJ="/c/Users/WANDANA/OneDrive/Documents/Kanwil/Portal Monitoring BMN"

if [ ! -f "$DROP/vercel-token.txt" ]; then
  echo "LETAKKAN Vercel token ke: $DROP/vercel-token.txt"
  exit 1
fi
export VERCEL_TOKEN="$(cat "$DROP/vercel-token.txt")"
cd "$PROJ"

# Baca env Vite dari .env.local TANPA mencetak nilai
URL="$(grep -E '^VITE_SUPABASE_URL=' .env.local | cut -d= -f2-)"
KEY="$(grep -E '^VITE_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2-)"

echo "=== set VITE env (client) ==="
# -d '' agar input dikirim persis tanpa newline; || true supaya tidak gagal kalau sudah ada
printf '%s' "$URL" | vercel env add VITE_SUPABASE_URL production --yes --token="$VERCEL_TOKEN" || true
printf '%s' "$KEY" | vercel env add VITE_SUPABASE_ANON_KEY production --yes --token="$VERCEL_TOKEN" || true

# Opsional: server vars untuk fungsi api/sync-sheets (sinkronisasi Google Sheets)
if [ -f "$DROP/vercel-env-extra.json" ]; then
  echo "=== set server env (opsional) ==="
  python - "$DROP/vercel-env-extra.json" "$VERCEL_TOKEN" <<'PY'
import json, subprocess, sys
path, token = sys.argv[1], sys.argv[2]
data = json.load(open(path))
for k, v in data.items():
    subprocess.run(["vercel","env","add",k,"production","--yes","--token",token],
                   input=v, text=True).returncode
PY
fi

echo "=== deploy produksi (build di cloud) ==="
vercel deploy --prod --yes --token="$VERCEL_TOKEN"
echo "SELESAI"
