#!/usr/bin/env python3
"""
Skrip Otomatis Pengunduh Basis Data Lelang Kendaraan DJKN (Power BI Publish to Web)
Sumber laporan:
https://app.powerbi.com/view?r=eyJrIjoiNDMzZDFiMmQtN2Y5YS00OGEzLWJlNTgtNDc1YmZhMjlkODRlIiwidCI6ImVkNmZiMzY2LTgzMjItNDZmMy05MTVlLWM0ZDAzN2E0NTRhOSIsImMiOjEwfQ%3D%3D

Cara menjalankan di komputer Anda:
1. Pastikan Python 3 dan pustaka requests terinstal:
   pip install requests
2. Jalankan skrip:
   python download_basis_data_lelang.py
3. Skrip akan otomatis menghasilkan:
   - basis_data_lelang.json (siap dipakai langsung di aplikasi web Anda)
   - basis_data_lelang.csv  (siap diimpor ke database SQL atau dibuka di Excel)
"""

import base64
import copy
import csv
import json
import re
import sys
import uuid
from urllib.parse import parse_qs, urlparse, unquote

import requests

POWERBI_VIEW_URL = (
    "https://app.powerbi.com/view?r="
    "eyJrIjoiNDMzZDFiMmQtN2Y5YS00OGEzLWJlNTgtNDc1YmZhMjlkODRlIiwidCI6"
    "ImVkNmZiMzY2LTgzMjItNDZmMy05MTVlLWM0ZDAzN2E0NTRhOSIsImMiOjEwfQ%3D%3D"
)


def decode_resource_key(view_url: str) -> dict:
    """Mendekode parameter 'r' (Base64) dari URL Power BI Publish to Web."""
    parsed = urlparse(view_url)
    r_param = parse_qs(parsed.query).get("r", [""])[0]
    r_param = unquote(r_param)
    padding = "=" * (-len(r_param) % 4)
    decoded_bytes = base64.b64decode(r_param + padding)
    return json.loads(decoded_bytes.decode("utf-8"))


def get_cluster_and_session(view_url: str) -> tuple[str, str, str]:
    """Mengambil resolvedClusterUri, requestId, dan activityId dari halaman embed."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
    }
    resp = requests.get(view_url, headers=headers, timeout=30)
    resp.raise_for_status()
    html = resp.text

    cluster_match = re.search(r"resolvedClusterUri\s*=\s*['\"]([^'\"]+)['\"]", html)
    if cluster_match:
        cluster_uri = cluster_match.group(1).replace("-redirect", "-api").rstrip("/")
    else:
        cluster_uri = "https://wabi-southeast-asia-api.analysis.windows.net"

    req_match = re.search(r"requestId\s*=\s*['\"]([^'\"]+)['\"]", html)
    act_match = re.search(r"telemetrySessionId\s*=\s*['\"]([^'\"]+)['\"]", html)
    request_id = req_match.group(1) if req_match else str(uuid.uuid4())
    activity_id = act_match.group(1) if act_match else str(uuid.uuid4())

    return cluster_uri, request_id, activity_id


def fetch_models_and_exploration(
    cluster_uri: str, resource_key: str, activity_id: str
) -> dict:
    """Mengambil skema laporan dan query visual dari endpoint modelsAndExploration."""
    url = (
        f"{cluster_uri}/public/reports/{resource_key}"
        "/modelsAndExploration?preferReadOnlySession=true"
    )
    headers = {
        "ActivityId": activity_id,
        "RequestId": str(uuid.uuid4()),
        "X-PowerBI-ResourceKey": resource_key,
        "Accept": "application/json",
    }
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()


def find_main_table_query(exploration_data: dict) -> tuple[int, str, str, dict]:
    """Mencari visual tabel utama yang memiliki kolom terbanyak di laporan."""
    model = exploration_data["models"][0]
    model_id = model["id"]
    dataset_id = model.get("dbName", "")
    report_id = exploration_data["exploration"]["report"].get("objectId", "")

    best_query = None
    max_select_len = -1

    for section in exploration_data["exploration"].get("sections", []):
        for vc in section.get("visualContainers", []):
            query_str = vc.get("query")
            if not query_str:
                continue
            try:
                q_obj = json.loads(query_str)
                commands = q_obj.get("Commands", [])
                if not commands:
                    continue
                cmd = commands[0].get("SemanticQueryDataShapeCommand", {})
                selects = cmd.get("Query", {}).get("Select", [])
                if len(selects) > max_select_len:
                    max_select_len = len(selects)
                    best_query = q_obj
            except (KeyError, ValueError, TypeError):
                continue

    if not best_query:
        raise RuntimeError("Tidak menemukan query tabel utama di dalam laporan Power BI.")

    return model_id, dataset_id, report_id, best_query


def find_key_recursively(obj, target_key: str):
    """Mencari key tertentu secara rekursif di dalam struktur dict/list JSON."""
    if isinstance(obj, dict):
        if target_key in obj:
            yield obj[target_key]
        for val in obj.values():
            yield from find_key_recursively(val, target_key)
    elif isinstance(obj, list):
        for item in obj:
            yield from find_key_recursively(item, target_key)


def parse_dsr_batch(response_json: dict) -> tuple[list[str], list[list], list | None]:
    """
    Menguraikan format DataShapeResult (DSR) Power BI:
    - Menerapkan bitmask 'R' (salin nilai dari baris sebelumnya)
    - Menerapkan bitmask 'Ø' (nilai kosong / None)
    - Mengganti indeks integer dengan teks asli dari 'ValueDicts'
    - Mengambil token paginasi 'RT' (RestartTokens) untuk batch berikutnya
    """
    data = response_json["results"][0]["result"]["data"]
    descriptor_selects = data.get("descriptor", {}).get("Select", [])
    columns = []
    for item in descriptor_selects:
        if item.get("Kind") == 1 and "GroupKeys" in item:
            columns.append(item["GroupKeys"][0]["Source"]["Property"])
        else:
            columns.append(item.get("Value", item.get("Name", "Col")))

    ds = data["dsr"]["DS"][0]
    value_dicts = ds.get("ValueDicts", {})

    # Cari array baris data (DM0 atau DM1)
    ph_list = ds.get("PH", [])
    dm_rows = []
    if ph_list:
        for key in ("DM0", "DM1"):
            if key in ph_list[0]:
                dm_rows = copy.deepcopy(ph_list[0][key])
                break
    if not dm_rows:
        for key in ("DM0", "DM1"):
            found = list(find_key_recursively(ds, key))
            if found:
                dm_rows = copy.deepcopy(found[0])
                break

    if not dm_rows:
        return columns, [], None

    # Ambil skema kolom 'S' dari elemen pertama
    col_schema = dm_rows[0].get("S", [])
    num_cols = len(col_schema) if col_schema else len(columns)

    decoded_rows = []
    prev_cells = [None] * num_cols

    for item in dm_rows:
        cells = list(item.get("C", []))
        copy_mask = item.get("R", 0)
        null_mask = item.get("Ø", 0)

        if copy_mask or null_mask:
            reconstructed = []
            c_idx = 0
            for col_i in range(num_cols):
                if (copy_mask >> col_i) & 1:
                    reconstructed.append(prev_cells[col_i])
                elif (null_mask >> col_i) & 1:
                    reconstructed.append(None)
                else:
                    reconstructed.append(cells[c_idx] if c_idx < len(cells) else None)
                    c_idx += 1
            cells = reconstructed

        prev_cells = list(cells)

        # Ekspansi indeks kamus ValueDicts ke nilai teks sebenarnya
        expanded = list(cells)
        for col_i, col_def in enumerate(col_schema):
            dict_name = col_def.get("DN")
            if dict_name and col_i < len(expanded) and isinstance(expanded[col_i], int):
                dict_list = value_dicts.get(dict_name, [])
                idx_val = expanded[col_i]
                if 0 <= idx_val < len(dict_list):
                    expanded[col_i] = dict_list[idx_val]

        decoded_rows.append(expanded)

    # Cari RestartTokens (RT) untuk halaman berikutnya
    rt_matches = list(find_key_recursively(ds, "RT"))
    restart_tokens = rt_matches[0] if rt_matches else None

    return columns, decoded_rows, restart_tokens


def simpan_kamus_kolom(cluster_uri: str, resource_key: str, activity_id: str, csv_dir: str) -> dict:
    """Simpan peta nama kolom mentah -> nama tampilan report DJKN (kamus_kolom.json).

    Nama kolom di dataset DJKN bisa tertinggal dari label resminya: kolom mentah
    "SEMESTER I 2025" ditampilkan di report sebagai "Kat. Lokasi (Semester I 2026)".
    Kamus ini dipakai aplikasi untuk melabel kategori lokasi dengan semester resmi.
    """
    url = f"{cluster_uri}/public/reports/{resource_key}/modelsAndExploration?preferReadOnlySession=true"
    headers = {
        "ActivityId": activity_id,
        "RequestId": str(uuid.uuid4()),
        "X-PowerBI-ResourceKey": resource_key,
        "Accept": "application/json",
    }
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    kamus: dict[str, str] = {}
    pola = re.compile(r'"Power BI \(2\)\.([^"]+)":\{"displayName":"([^"]+)"')
    for section in data.get("exploration", {}).get("sections", []):
        for vc in section.get("visualContainers", []):
            config = vc.get("config") or ""
            for mentah, tampil in pola.findall(config):
                mentah, tampil = mentah.strip(), tampil.strip()
                if tampil and tampil != mentah:
                    kamus[mentah] = tampil

    kamus_path = f"{csv_dir}/kamus_kolom.json"
    with open(kamus_path, "w", encoding="utf-8") as f_kamus:
        json.dump(kamus, f_kamus, ensure_ascii=False, indent=2)
    print(f"Kamus nama tampilan kolom tersimpan: {kamus_path} ({len(kamus)} entri)")
    return kamus


def download_all_data(view_url: str = POWERBI_VIEW_URL):
    info = decode_resource_key(view_url)
    resource_key = info["k"]
    print(f"[1/4] Resource Key terdeteksi : {resource_key}")

    cluster_uri, request_id, activity_id = get_cluster_and_session(view_url)
    print(f"[2/4] Cluster API Power BI    : {cluster_uri}")

    exploration = fetch_models_and_exploration(cluster_uri, resource_key, activity_id)
    model_id, dataset_id, report_id, base_query = find_main_table_query(exploration)
    print(f"[3/4] Model ID ditemukan      : {model_id}")

    query_url = f"{cluster_uri}/public/reports/querydata?synchronous=true"
    headers = {
        "ActivityId": activity_id,
        "RequestId": request_id,
        "X-PowerBI-ResourceKey": resource_key,
        "Content-Type": "application/json;charset=UTF-8",
        "Accept": "application/json",
    }

    all_rows = []
    columns = []
    restart_tokens = None
    batch_num = 1

    print("[4/4] Mulai mengunduh batch data (500 baris per batch)...")
    while True:
        query_copy = copy.deepcopy(base_query)
        cmd = query_copy["Commands"][0]["SemanticQueryDataShapeCommand"]
        window = (
            cmd.setdefault("Binding", {})
            .setdefault("DataReduction", {"DataVolume": 3})
            .setdefault("Primary", {})
            .setdefault("Window", {"Count": 500})
        )
        window["Count"] = 500
        if restart_tokens:
            window["RestartTokens"] = restart_tokens
        else:
            window.pop("RestartTokens", None)

        payload = {
            "version": "1.0.0",
            "queries": [
                {
                    "Query": query_copy,
                    "CacheKey": "",
                    "QueryId": "",
                    "ApplicationContext": {
                        "DatasetId": dataset_id,
                        "Sources": [{"ReportId": report_id}],
                    },
                }
            ],
            "cancelQueries": [],
            "modelId": model_id,
        }

        resp = requests.post(query_url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        batch_cols, batch_rows, next_rt = parse_dsr_batch(resp.json())

        if not columns and batch_cols:
            columns = batch_cols

        if not batch_rows:
            break

        all_rows.extend(batch_rows)
        print(f"  -> Batch {batch_num:02d}: +{len(batch_rows)} baris (Total: {len(all_rows)} baris)")

        if not next_rt or next_rt == restart_tokens:
            break
        restart_tokens = next_rt
        batch_num += 1

    # Simpan ke CSV
    csv_path = "basis_data_lelang.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f_csv:
        writer = csv.writer(f_csv)
        writer.writerow(columns)
        writer.writerows(all_rows)

    # Simpan ke JSON (array of objects siap pakai untuk aplikasi web)
    json_path = "basis_data_lelang.json"
    json_records = [dict(zip(columns, row)) for row in all_rows]
    with open(json_path, "w", encoding="utf-8") as f_json:
        json.dump(json_records, f_json, ensure_ascii=False, indent=2)

    print(f"\nSelesai! {len(all_rows)} baris tersimpan ke '{json_path}' dan '{csv_path}'.")

    try:
        simpan_kamus_kolom(cluster_uri, resource_key, activity_id, ".")
    except Exception as exc:
        print(f"Peringatan: kamus kolom gagal disimpan ({exc}) — label semester memakai nama mentah.")


if __name__ == "__main__":
    try:
        download_all_data()
    except Exception as exc:
        print(f"Terjadi kesalahan: {exc}", file=sys.stderr)
        sys.exit(1)