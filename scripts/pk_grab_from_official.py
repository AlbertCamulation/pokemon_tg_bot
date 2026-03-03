import requests
from bs4 import BeautifulSoup
import time
import json
import os
import datetime

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
BASE_NEWS_URL_ZH = "https://pokemongo.com/zh_Hant/news"
BASE_NEWS_URL_EN = "https://pokemongo.com/en/news"

def get_soup(url, lang="en"):
    headers = HEADERS.copy()
    headers["Accept-Language"] = "en-US,en;q=0.9" if lang == "en" else "zh-TW,zh;q=0.9"
    try:
        res = requests.get(url, headers=headers, timeout=15)
        res.raise_for_status()
        return BeautifulSoup(res.text, 'html.parser')
    except Exception as e:
        print(f"❌ 無法請求網址 {url}: {e}")
        return None

# 🔥 新增：自動尋找最新賽季的網址
def get_latest_gbl_url(base_url, lang="en"):
    print(f"🔍 正在自動尋找最新「GO對戰聯盟」公告 ({lang})...")
    soup = get_soup(base_url, lang)
    if not soup: return None

    # 尋找所有新聞連結 (通常在 <a> 標籤內)
    links = soup.find_all('a', href=True)
    
    # 設定搜尋關鍵字
    keywords_zh = ["go對戰聯盟", "賽季更新"]
    keywords_en = ["go-battle-league", "update"]
    keywords = keywords_zh if lang == "zh" else keywords_en
    
    for link in links:
        href = link['href'].lower()
        title = link.get_text(strip=True).lower()
        
        # 檢查網址或標題是否包含關鍵字
        if any(kw in href for kw in keywords) or any(kw in title for kw in keywords):
            # 確保是完整網址
            full_url = href if href.startswith("http") else f"https://pokemongo.com{href}"
            print(f"🎯 找到最新公告: {full_url}")
            return full_url
            
    print(f"⚠️ 找不到最新的 GO對戰聯盟 公告，將使用預設網址。")
    return None

def map_to_pvpoke_id_and_cp(en_name):
    name = en_name.lower()
    cp = "1500"
    if "master" in name: cp = "10000"
    elif "ultra" in name: cp = "2500"
    
    if "master" in name and "mega" in name:
        return "mega", "10000"
    
    clean = name.replace(" cup", "").replace(" league", "").replace(" edition", "").replace(" version", "").replace(": great league edition", "").replace(": mega edition", "").replace("mega", "").strip()
    
    if "great league" in name and "remix" not in name: return "all", "1500"
    if "ultra league" in name and "premier" not in name: return "all", "2500"
    if "master league" in name and "premier" not in name: return "all", "10000"
    
    pvp_id = clean.split(" ")[-1]
    manual = {"love": "love", "remix": "remix", "fantasy": "fantasy", "retro": "retro"}
    return manual.get(pvp_id, pvp_id), cp

def get_leagues(url, lang="en"):
    if not url: return []
    soup = get_soup(url, lang)
    if not soup: return []
    
    items = soup.find_all('div', attrs={"data-slot": "GblScheduleBlockItem"})
    data = []
    for item in items:
        start = int(item.get('data-start-timestamp', 0))
        end = int(item.get('data-end-timestamp', 0))
        names = [d.get_text(strip=True).replace('*', '') for d in item.find_all('div', class_=lambda x: x and 'League' in x) if d.get_text(strip=True)]
        if names:
            data.append({"start": start, "end": end, "leagues": names})
            
    if not data:
        print(f"⚠️ 在 {url} 中找不到賽程表資料，官方可能更改了網頁結構。")
    return data

def run_automation():
    # 1. 自動尋找最新網址 (找不到才用預設的「尋寶之旅」或「絢爛奪目的記憶」當備案)
    zh_url = get_latest_gbl_url(BASE_NEWS_URL_ZH, "zh") or "https://pokemongo.com/zh_Hant/news/go-battle-league-memories-in-motion"
    en_url = get_latest_gbl_url(BASE_NEWS_URL_EN, "en") or "https://pokemongo.com/en/news/go-battle-league-memories-in-motion"
    
    print(f"🌐 使用中文網址: {zh_url}")
    print(f"🌐 使用英文網址: {en_url}")
    
    # 2. 抓取資料
    zh_data = get_leagues(zh_url, "zh")
    en_data = get_leagues(en_url, "en")
    
    now_ms = int(time.time() * 1000)
    buffer_ms = 24 * 60 * 60 * 1000 
    
    tw_time = datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    tw_time_str = tw_time.strftime("%Y-%m-%d %H:%M:%S (台灣時間)")
    manifest = {"last_updated_human": tw_time_str, "active_leagues": []}
    
    seen = set()

    # 3. 解析並配對
    for i in range(len(zh_data)):
        is_active = zh_data[i]['start'] <= now_ms <= zh_data[i]['end']
        is_upcoming = zh_data[i]['start'] <= now_ms + buffer_ms <= zh_data[i]['end']

        if is_active or is_upcoming:
            en_leagues = en_data[i]['leagues'] if i < len(en_data) else []
            zh_leagues = zh_data[i]['leagues']
            
            for idx, en in enumerate(en_leagues):
                pvp_id, cp = map_to_pvpoke_id_and_cp(en)
                
                zh_name = zh_leagues[idx] if idx < len(zh_leagues) else en
                unique_key = f"{pvp_id}_{cp}_{zh_name}"
                if unique_key in seen: continue
                seen.add(unique_key)
                
                manifest["active_leagues"].append({
                    "name_zh": zh_name, "name_en": en, "pvpoke_id": pvp_id, "cp": cp,
                    "json_url": f"https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/{pvp_id}/overall/rankings_{cp}.json"
                })

    os.makedirs('data', exist_ok=True)
    with open('data/manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\n🎉 成功產出 {len(manifest['active_leagues'])} 筆資料！")

if __name__ == "__main__":
    run_automation()
