import json
import os
import requests
import time
import glob

# 設定路徑
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_FILE = os.path.join(BASE_DIR, 'data', 'manifest.json')
DATA_DIR = os.path.join(BASE_DIR, 'data')
HEADERS = {"User-Agent": "Mozilla/5.0"}

def fetch_all_active_rankings():
    """1. 根據 manifest 下載目前當季有開放的聯盟，確保資料最新"""
    if not os.path.exists(MANIFEST_FILE):
        return
    with open(MANIFEST_FILE, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
        
    active_leagues = manifest.get('active_leagues', [])
    print(f"🔄 開始更新 {len(active_leagues)} 個當季活動聯盟...")
    
    for league in active_leagues:
        url = league['json_url']
        cp = league['cp']
        pid = league['pvpoke_id']
        filename = f"rankings_{cp}.json" if pid in ['all', 'great', 'ultra', 'master'] else f"rankings_{cp}_{pid}.json"
        target_path = os.path.join(DATA_DIR, filename)

        try:
            res = requests.get(f"{url}?v={int(time.time())}", headers=HEADERS, timeout=15)
            res.raise_for_status()
            with open(target_path, 'w', encoding='utf-8') as f:
                f.write(res.text)
            print(f"  ✅ 更新成功: {filename}")
        except Exception as e:
            print(f"  ❌ 更新失敗 ({filename}): {e}")

def bundle_all_rankings():
    """2. 將資料夾內 *所有* rankings_ 開頭的 JSON (包含手動建立的) 打包成單一檔案"""
    print("\n📦 開始打包所有排名資料 (大禮包模式)...")
    bundle = {}
    
    # glob 會直接抓取資料夾內所有符合條件的實體檔案
    file_pattern = os.path.join(DATA_DIR, 'rankings_*.json')
    found_files = glob.glob(file_pattern)
    
    for filepath in found_files:
        if 'all_rankings_bundle.json' in filepath: 
            continue
            
        filename = os.path.basename(filepath)
        key = f"data/{filename}" # 產生和 leagues 陣列裡 path 一樣的 key
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                bundle[key] = json.load(f)
                print(f"  ➕ 已加入大禮包: {filename}")
        except Exception as e:
            print(f"  ❌ 讀取 {filename} 失敗: {e}")

    bundle_path = os.path.join(DATA_DIR, 'all_rankings_bundle.json')
    with open(bundle_path, 'w', encoding='utf-8') as f:
        # 使用 separators 壓縮 JSON 體積，移除多餘空白
        json.dump(bundle, f, separators=(',', ':'))
    print(f"\n🎉 成功！共打包 {len(bundle)} 個聯盟資料到 all_rankings_bundle.json")

if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    fetch_all_active_rankings()
    bundle_all_rankings()
