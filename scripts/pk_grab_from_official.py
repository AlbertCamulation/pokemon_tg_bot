import requests
from bs4 import BeautifulSoup
import time
import json
import os
import re

# ==========================================
# 1. 基礎設定
# ==========================================
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def get_soup(url, lang="en"):
    headers = HEADERS.copy()
    headers["Accept-Language"] = "en-US,en;q=0.9" if lang == "en" else "zh-TW,zh;q=0.9"
    try:
        res = requests.get(url, headers=headers, timeout=10)
        return BeautifulSoup(res.text, 'html.parser')
    except Exception as e:
        print(f"❌ 請求失敗: {e}")
        return None

# ==========================================
# 2. 核心：智慧型連結檢查 (失敗會回傳預設值)
# ==========================================
def get_best_url(pvpoke_id, cp):
    """
    嘗試找出正確網址，如果找不到，回傳一個最有可能的「預測網址」
    """
    base_repo = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings"
    
    candidates = []
    ids_to_try = [pvpoke_id]
    if pvpoke_id == "ultra_premier": ids_to_try.append("premier")
    if pvpoke_id == "premier": ids_to_try.append("ultra_premier")

    for pid in ids_to_try:
        candidates.append(f"{base_repo}/{pid}/overall/rankings_{cp}.json")
        candidates.append(f"{base_repo}/{pid}/overall/rankings_{pid}_{cp}.json")

    print(f"🔎 正在偵測 {pvpoke_id} (CP {cp})...")

    for url in candidates:
        try:
            res = requests.head(url, headers=HEADERS, timeout=3)
            if res.status_code == 200:
                print(f"   ✅ 找到檔案: {url}")
                return url
        except:
            pass
    
    default_url = candidates[0]
    print(f"   ⚠️ 找不到檔案，將使用預測路徑: {default_url}")
    return default_url

# ==========================================
# 3. 爬蟲邏輯
# ==========================================
def get_leagues_from_article(url, lang="en"):
    soup = get_soup(url, lang)
    if not soup: return []
    
    items = soup.find_all('div', attrs={"data-slot": "GblScheduleBlockItem"})
    schedule_data = []
    
    for item in items:
        start_ts = int(item.get('data-start-timestamp', 0))
        end_ts = int(item.get('data-end-timestamp', 0))
        
        league_divs = item.find_all('div', class_=lambda x: x and 'League' in x)
        names = [d.get_text(strip=True).replace('*', '') for d in league_divs if d.get_text(strip=True)]
        
        schedule_data.append({"start": start_ts, "end": end_ts, "leagues": names})
    return schedule_data

def map_to_pvpoke_id_and_cp(en_name):
    name = en_name.lower()
    cp = 1500
    
    if "master" in name: cp = 10000
    elif "ultra" in name: cp = 2500
    elif "little" in name: cp = 500
    
    clean_name = name.replace(" cup", "").replace(" league", "").replace(" edition", "").replace(" version", "")
    
    if "great league" in name and "remix" not in name: return "all", 1500
    if "ultra league" in name and "premier" not in name: return "all", 2500
    if "master league" in name and "premier" not in name: return "all", 10000
    
    if "premier" in clean_name:
        if "ultra" in name: return "premier", 2500 
        if "master" in name: return "premier", 10000
        return "premier", cp

    pvp_id = clean_name.strip().split(" ")[-1]
    
    manual_map = {
        "catch": "catch", "holiday": "holiday", "remix": "remix", 
        "retro": "retro", "fantasy": "fantasy", "willpower": "willpower", 
        "sunshine": "sunshine", "halloween": "halloween", "evolution": "evolution",
        "love": "love"  # 確保愛情盃能被正確對應
    }
    
    if pvp_id in manual_map: pvp_id = manual_map[pvp_id]
    return pvp_id, cp

# ==========================================
# 4. 主程式執行
# ==========================================
def run_automation():
    # ★★★ 賽季公告網址 (如果未來換季，記得來這裡改網址) ★★★
    # 目前使用 2026 年初的網址範例，請確認這是當前賽季的網址：
    zh_article_url = "https://pokemongolive.com/zh_hant/post/go-battle-league-max-out/" 
    
    if not zh_article_url:
        print("❌ 未設定對戰聯盟文章網址")
        return

    en_article_url = re.sub(r'/zh[-_]hant/', '/en/', zh_article_url, flags=re.IGNORECASE)
    
    print(f"🔗 中文: {zh_article_url}")
    print(f"🔗 英文: {en_article_url}")

    zh_data = get_leagues_from_article(zh_article_url, "zh")
    en_data = get_leagues_from_article(en_article_url, "en")
    
    current_ms = int(time.time() * 1000)
    
    manifest = {
        "last_updated_human": time.ctime(),
        "active_leagues": []
    }
    
    seen_keys = set()

    for i in range(len(zh_data)):
        if i >= len(en_data): break
        
        # 如果現在的時間落在這個賽事區間內，就把該區間的盃賽抓出來
        if zh_data[i]['start'] <= current_ms <= zh_data[i]['end']:
            for zh, en in zip(zh_data[i]['leagues'], en_data[i]['leagues']):
                pvp_id, cp = map_to_pvpoke_id_and_cp(en)
                
                unique_key = f"{pvp_id}_{cp}"
                if unique_key in seen_keys: continue
                seen_keys.add(unique_key)

                final_url = get_best_url(pvp_id, cp)
                
                manifest["active_leagues"].append({
                    "name_zh": zh,
                    "name_en": en,
                    "pvpoke_id": pvp_id,
                    "cp": str(cp),
                    "json_url": final_url 
                })

    os.makedirs('data', exist_ok=True)
    with open('data/manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    
    print(f"🎉 成功產出 {len(manifest['active_leagues'])} 筆資料！")

if __name__ == "__main__":
    run_automation()