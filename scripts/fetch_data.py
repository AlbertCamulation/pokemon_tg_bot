import json
import os
import requests
import time

# 設定路徑
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_FILE = os.path.join(BASE_DIR, 'data', 'manifest.json')
DATA_DIR = os.path.join(BASE_DIR, 'data')

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def fetch_all_active_rankings():
    # 1. 讀取 manifest.json 看看現在有哪些聯盟
    if not os.path.exists(MANIFEST_FILE):
        print("❌ 找不到 manifest.json，請先執行聯盟偵測腳本。")
        return

    with open(MANIFEST_FILE, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    active_leagues = manifest.get('active_leagues', [])
    if not active_leagues:
        print("ℹ️ 目前沒有活動中的聯盟需要下載。")
        return

    print(f"🚀 開始同步 {len(active_leagues)} 個當前聯盟的排名資料...")

    # 2. 依照清單下載對應的 JSON
    for league in active_leagues:
        url = league['json_url']
        cp = league['cp']
        pid = league['pvpoke_id']
        name = league['name_zh']

        # 決定檔名邏輯：
        # 標準聯盟 (all/great/ultra/master) -> rankings_1500.json
        # 特殊盃賽 (love/remix...) -> rankings_1500_love.json
        if pid in ['all', 'great', 'ultra', 'master']:
            filename = f"rankings_{cp}.json"
        else:
            filename = f"rankings_{cp}_{pid}.json"

        target_path = os.path.join(DATA_DIR, filename)

        print(f"  📥 正在下載 {name} -> {filename}...")
        try:
            # 加上版本號避免快取
            res = requests.get(f"{url}?v={int(time.time())}", headers=HEADERS, timeout=15)
            res.raise_for_status()
            
            with open(target_path, 'w', encoding='utf-8') as f:
                f.write(res.text)
            print(f"  ✅ 下載成功！")
        except Exception as e:
            print(f"  ❌ 下載失敗 ({name}): {e}")

if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    fetch_all_active_rankings()
