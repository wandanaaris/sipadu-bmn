#!/usr/bin/env python3
"""
Konfigurasi konektor Google Drive untuk SIPADU BMN.
Membaca rahasia HANYA dari file lokal; tidak pernah mencetak isi rahasia ke layar.

File yang dibutuhkan (letakkan di folder yang sama dengan skrip ini, atau set DROP):
  - token.txt         : setup token (hanya hash-nya yang ada di DB)
  - credentials.json  : kredensial Google (service_account ATAU authorized_user)
  - folder-id.txt     : ID folder root Drive SIPADU BMN

credentials.json contoh service_account:
  {"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...@....iam.gserviceaccount.com",...}

Setelah berhasil, rahasia disimpan terenkripsi-aman di tabel integration_secrets Supabase
melalui edge function configure-drive.
"""
import json, sys, urllib.request, pathlib

DROP = pathlib.Path(r"C:/Users/WANDANA/AppData/Local/hermes/tmp/sipadu-secrets")
SUPABASE_URL = "https://yndwbvgjlfilhpubvrtt.supabase.co"
FN = f"{SUPABASE_URL}/functions/v1/configure-drive"

def read(name):
    p = DROP / name
    if not p.exists():
        sys.exit(f"FILE TIDAK ADA: {p}")
    return p.read_text(encoding="utf-8").strip()

def main():
    token = read("token.txt")
    creds_raw = read("credentials.json")
    root = read("folder-id.txt")
    try:
        creds = json.loads(creds_raw)
    except Exception as e:
        sys.exit(f"credentials.json bukan JSON valid: {e}")

    body = json.dumps({"token": token, "credentials": creds, "rootFolderId": root}).encode()
    req = urllib.request.Request(FN, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            out = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode()
        try: detail = json.loads(detail).get("error", detail)
        except Exception: pass
        sys.exit(f"GAGAL ({e.code}): {detail}")
    # Hanya tampilkan field aman (tanpa rahasia)
    print("HASIL:", {k: v for k, v in out.items() if k not in ("credentials",)})

if __name__ == "__main__":
    main()
