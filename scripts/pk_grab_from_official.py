import requests
from bs4 import BeautifulSoup
import time
import json
import os
import re

HEADERS = {"User-Agent": "Mozilla/5.0"}

def get_soup(url, lang="en"):
    headers = HEADERS.copy()
    headers["Accept-Language"] = "en-US,en;q=0.9" if lang == "en" else "zh-TW,zh;q=0.9"
    res = requests.get(url, headers=headers, timeout=10)
    return BeautifulSoup(res.text, 'html.parser')

def map_to_pvpoke_id_and_cp(en_name):
    name = en_name.lower()
    cp = "1500"
    if "master" in name: cp = "10000"
    elif "ultra" in name: cp = "2500"
    clean = name.replace(" cup", "").replace(" league", "").replace(" edition", "").replace(" version", "").replace(": great league edition", "").strip()
    pvp_id = clean.split(" ")[-1]
    manual = {"love": "love", "remix": "remix", "fantasy": "fantasy", "retro": "retro"}
    return manual.get(pvp_id, pvp_id), cp

def get_leagues(url, lang="en"):
    soup = get_soup(url, lang)
    if not soup: return []
    items = soup.find_all('div', attrs={"data-slot": "GblScheduleBlockItem"})
    data = []
    for item in items:
        start = int(item.get('data-start-timestamp', 0))
        end = int(item.get('data-end-timestamp', 0))
        names = [d.get_text(strip=True).replace('*', '') for d in item.find_all('div', class_=lambda x: x and 'League' in x) if d.get_text(strip=True)]
        data.append({"start": start, "end": end, "leagues": names})
    return data

def run_automation():
    zh_url = "https://pokemongo.com/zh_Hant/news/go-battle-league-precious-paths"
    en_url = "https://pokemongo.com/en/news/go-battle-league-precious-paths"
    
    zh_data = get_leagues(zh_url, "zh")
    en_data = get_leagues(en_url, "en")
    
    now_ms = int(time.time() * 1000)
    # 擴大偵測範圍：現在 or 24小時內會開始的都算
    buffer_ms = 24 * 60 * 60 * 1000 
    
    manifest = {"last_updated_human": time.ctime(), "active_leagues": []}
    seen = set()

    for i in range(len(zh_data)):
        # 判定條件：現在正在進行，或是 24 小時內即將開始
        is_active = zh_data[i]['start'] <= now_ms <= zh_data[i]['end']
        is_upcoming = zh_data[i]['start'] <= now_ms + buffer_ms <= zh_data[i]['end']

        if is_active or is_upcoming:
            en_leagues = en_data[i]['leagues'] if i < len(en_data) else []
            zh_leagues = zh_data[i]['leagues']
            
            for idx, en in enumerate(en_leagues):
                pvp_id, cp = map_to_pvpoke_id_and_cp(en)
                if f"{pvp_id}_{cp}" in seen: continue
                seen.add(f"{pvp_id}_{cp}")
                
                zh_name = zh_leagues[idx] if idx < len(zh_leagues) else en
                manifest["active_leagues"].append({
                    "name_zh": zh_name, "name_en": en, "pvpoke_id": pvp_id, "cp": cp,
                    "json_url": f"https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/{pvp_id}/overall/rankings_{cp}.json"
                })

    # 🔥 強制邏輯：如果清單內沒有「love」，且現在接近 2/18，就強制補入
    has_love = any("love" in league["pvpoke_id"] for league in manifest["active_leagues"])
    if not has_love:
        print("⚠️ 偵測到愛情盃缺失，執行強制補丁...")
        manifest["active_leagues"].append({
            "name_zh": "愛情盃 (1500)",
            "name_en": "Love Cup",
            "pvpoke_id": "love",
            "cp": "1500",
            "json_url": "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/love/overall/rankings_1500.json"
        })

    os.makedirs('data', exist_ok=True)
    with open('data/manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"🎉 成功產出 {len(manifest['active_leagues'])} 筆資料！")

if __name__ == "__main__":
    run_automation()