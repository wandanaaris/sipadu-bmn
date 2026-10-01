"""
Ekstraktor Master Aset SIMAN -> ringkasan JSON untuk portal SIPADU BMN.

Hanya mengambil yang dibutuhkan infograf: jumlah aset dan nilai perolehan
untuk setiap pasangan satker x jenis BMN. Baris detail per aset tidak
disimpan karena SIMAN tetap sumber kebenaran setiap kali export ulang.

Pakai:
    python scripts/extract-bmn-assets.py "C:/path/Master aset.xlsx" [-o out.json]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

try:
    import openpyxl
except ImportError:  # pragma: no cover
    raise SystemExit("openpyxl belum terpasang. Jalankan: pip install openpyxl")

# Kode satker yang dikenali portal. Dipakai untuk memotong kode satker mentah
# dari SIMAN yang berbentuk panjang, misalnya "137040900692307000KD" -> 692307.
KNOWN_SATKERS = [
    "692307", "692308", "692309", "692310", "692311", "692312", "692313",
    "692314", "692315", "692316", "692317", "692484", "692519", "692537",
    "692639", "692781", "692794", "694759",
]

COL_NAMA = {
    "no": "No",
    "jenis_bmn": "Jenis BMN",
    "kode_satker": "Kode Satker",
    "nama_satker": "Nama Satker",
    "nilai_perolehan": "Nilai Perolehan",
    "status_bmn": "Status BMN",
    "status_idle": "Status BMN Idle",
    "no_psp": "No PSP",
}

NOMOR = re.compile(r"^\d+$")


def teks(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def snapshot_dari_nama(path: Path) -> str:
    """Ambil tanggal dari nama file, mis. 'Master aset 30 september 2026.xlsx'."""
    match = re.search(
        r"(\d{1,2})\s+([a-z]+)\s+(\d{4})", path.stem, re.IGNORECASE
    )
    if not match:
        return date.today().isoformat()
    bulan = {
        "januari": 1, "februari": 2, "maret": 3, "april": 4, "mei": 5, "juni": 6,
        "juli": 7, "agustus": 8, "september": 9, "oktober": 10, "november": 11,
        "desember": 12,
    }[match.group(2).lower()]
    return f"{match.group(3)}-{bulan:02d}-{int(match.group(1)):02d}"


# Kode satker pada export SIMAN selalu berada di posisi tetap, contoh:
#   137040900692308000KD
#        ^^^^^ ^^^^^^
#        len 9  kode 6 digit
# Memakai posisi tetap, bukan pencarian substring: kode 692507 milik Kantor
# Wilayah sekaligus dipakai "Satker Baru Dari Data Transaksi Aset", dan
# pencarian substring membuat keduanya dianggap satker yang sama.
POSISI_KODE = slice(9, 15)


def ke_angka(nilai) -> float:
    mentah = teks(nilai).replace(".", "").replace(",", ".")
    if not mentah:
        return 0.0
    try:
        return float(mentah)
    except ValueError:
        return 0.0


def ekstrak(path: Path) -> dict:
    # Jangan pakai read_only: export SIMAN memotong pembacaan read-only menjadi
    # 6 kolom pertama saja, padahal header sebenarnya 78 kolom.
    book = openpyxl.load_workbook(path, data_only=True)
    sheet = book["Master Aset"]

    # Baris 1 = header, baris 2 = kosong, data mulai baris 3.
    header = [teks(cell) for cell in next(sheet.iter_rows(min_row=1, max_row=1, values_only=True))]
    kolom = {nama: header.index(nama) for nama in COL_NAMA.values() if nama in header}
    kurang = [nama for nama in COL_NAMA.values() if nama not in header]
    if kurang:
        raise SystemExit(f"Kolom tidak ditemukan di {path.name}: {', '.join(kurang)}")

    idx = kolom
    per_satker = Counter()
    per_jenis = Counter()
    per_pasangan: dict[tuple[str, str], Counter] = defaultdict(Counter)
    nama_satker: dict[str, Counter] = defaultdict(Counter)
    tanpa_kode: Counter = Counter()
    total_baris = 0
    total_nilai = 0.0
    tanpa_psp = 0

    for row in sheet.iter_rows(min_row=3, values_only=True):
        if not NOMOR.match(teks(row[idx["No"]])):
            continue
        total_baris += 1
        jenis = teks(row[idx["Jenis BMN"]]) or "(tanpa jenis)"
        kode_mentah = teks(row[idx["Kode Satker"]])
        nama = teks(row[idx["Nama Satker"]])
        kode = kode_mentah[POSISI_KODE]
        if not NOMOR.match(kode):
            kode = "LAINNYA"
            tanpa_kode[nama] += 1
        nama_satker[kode][nama] += 1
        nilai = ke_angka(row[idx["Nilai Perolehan"]])
        total_nilai += nilai
        if not teks(row[idx["No PSP"]]):
            tanpa_psp += 1

        per_satker[kode] += 1
        per_jenis[jenis] += 1
        per_pasangan[(kode, jenis)]["jumlah"] += 1
        per_pasangan[(kode, jenis)]["nilai"] += nilai

    book.close()

    # Satu kode bisa punya lebih dari satu nama di export (mis. 692507). Ambil
    # nama dengan aset terbanyak, dan sisanya dicatat sebagai peringatan.
    nama_final: dict[str, str] = {}
    tabrakan: dict[str, list[str]] = {}
    for kode, kandidat in nama_satker.items():
        nama_final[kode] = kandidat.most_common(1)[0][0]
        if len(kandidat) > 1:
            tabrakan[kode] = [n for n, _ in kandidat.most_common()]

    baris = [
        {
            "satker_code": kode,
            "satker_name": nama_final.get(kode, kode),
            "jenis_bmn": jenis,
            "jumlah": data["jumlah"],
            "nilai_perolehan": round(data["nilai"], 2),
        }
        for (kode, jenis), data in sorted(per_pasangan.items())
    ]

    return {
        "snapshot_date": snapshot_dari_nama(path),
        "source_file": path.name,
        "total_baris": total_baris,
        "total_nilai": round(total_nilai, 2),
        "tanpa_psp": tanpa_psp,
        "jumlah_satker": len(per_satker),
        "jumlah_jenis": len(per_jenis),
        "satker_tanpa_kode": dict(tanpa_kode),
        "tabrakan_nama": tabrakan,
        "per_satker": dict(sorted(per_satker.items())),
        "per_jenis": dict(sorted(per_jenis.items())),
        "baris": baris,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xlsx", type=Path, help="berkas export SIMAN")
    parser.add_argument("-o", "--output", type=Path, default=None)
    args = parser.parse_args()

    if not args.xlsx.is_file():
        raise SystemExit(f"Berkas tidak ditemukan: {args.xlsx}")

    hasil = ekstrak(args.xlsx)
    teks_json = json.dumps(hasil, ensure_ascii=False, indent=2)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(teks_json, encoding="utf-8")

    print(f"snapshot        : {hasil['snapshot_date']}")
    print(f"baris diproses  : {hasil['total_baris']}")
    print(f"satker          : {hasil['jumlah_satker']}")
    print(f"jenis BMN       : {hasil['jumlah_jenis']}")
    print(f"pasangan        : {len(hasil['baris'])}")
    print(f"nilai perolehan : {hasil['total_nilai']:,.0f}")
    print(f"tanpa No PSP    : {hasil['tanpa_psp']}")
    if hasil["satker_tanpa_kode"]:
        print(f"perlu kode satker: {hasil['satker_tanpa_kode']}")
    for kode, daftar in hasil["tabrakan_nama"].items():
        print(f"PERINGATAN: kode {kode} dipakai lebih dari satu nama: {daftar}")
    if args.output:
        print(f"ditulis         : {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
