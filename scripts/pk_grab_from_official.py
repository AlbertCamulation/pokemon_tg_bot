import requests
from bs4 import BeautifulSoup
import time
import json
import os

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
    
    # 清除多餘字眼，加入對 Mega (超級版) 的過濾
    clean = name.replace(" cup", "").replace(" league", "").replace(" edition", "").replace(" version", "").replace(": great league edition", "").replace(": mega edition", "").replace("mega", "").strip()
    
    if "great league" in name and "remix" not in name: return "all", "1500"
    if "ultra league" in name and "premier" not in name: return "all", "2500"
    if "master league" in name and "premier" not in name: return "all", "10000"
    
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
    # ⚠️ 尋寶之旅賽季快結束了，下次換季記得把這裡的網址改成新賽季！
    zh_url = "https://pokemongo.com/zh_Hant/news/go-battle-league-precious-paths"
    en_url = "https://pokemongo.com/en/news/go-battle-league-precious-paths"
    
    zh_data = get_leagues(zh_url, "zh")
    en_data = get_leagues(en_url, "en")
    
    now_ms = int(time.time() * 1000)
    buffer_ms = 24 * 60 * 60 * 1000 
    
    manifest = {"last_updated_human": time.ctime(), "active_leagues": []}
    seen = set()

    for i in range(len(zh_data)):
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

    # 🔥 已經把「愛情盃強制保底」刪除了！

    os.makedirs('data', exist_ok=True)
    with open('data/manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"🎉 成功產出 {len(manifest['active_leagues'])} 筆資料！")

if __name__ == "__main__":
    run_automation()
