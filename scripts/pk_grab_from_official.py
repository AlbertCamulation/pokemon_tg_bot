import cloudscraper
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
        scraper = cloudscraper.create_scraper()
        res = scraper.get(url, headers=headers, timeout=15)
        res.raise_for_status()
        return BeautifulSoup(res.text, 'html.parser')
    except Exception as e:
        print(f"❌ 無法請求網址 {url}: {e}")
        return None

def get_gbl_urls(base_url, lang="en"):
    print(f"🔍 正在尋找「GO對戰聯盟」公告 ({lang})...")
    soup = get_soup(base_url, lang)
    if not soup: return []

    links = soup.find_all('a', href=True)
    keywords_zh = ["go對戰聯盟"]
    keywords_en = ["go-battle-league"]
    keywords = keywords_zh if lang == "zh" else keywords_en
    
    urls = []
    for link in links:
        href = link['href'].lower()
        title = link.get_text(strip=True).lower()
        
        if any(kw in href for kw in keywords) or any(kw in title for kw in keywords):
            full_url = href if href.startswith("http") else f"https://pokemongo.com{href}"
            if full_url not in urls:
                urls.append(full_url)
                
    return urls

def map_to_pvpoke_id_and_cp(en_name, zh_name=""):
    name = en_name.lower().replace('*', '').strip()
    zh_name_clean = zh_name.replace('*', '').strip()
    
    cp = "1500"
    if "master" in name or "大師" in zh_name_clean: cp = "10000"
    elif "ultra" in name or "高級" in zh_name_clean: cp = "2500"
    elif "little" in name or "小小" in zh_name_clean: cp = "500"
    
    if ("mega" in name or "超級" in zh_name_clean) and cp == "10000":
        return "mega", "10000"
        
    # 回復原本的判定，不再把 NAIC 歸類為 all
    if name in ["great league", "ultra league", "master league"] or \
       zh_name_clean in ["超級聯盟", "高級聯盟", "大師聯盟"]:
        return "all", cp

    # 英文雷達
    cup_keywords = {
        "kanto": "kanto", "johto": "johto", "hoenn": "hoenn", "sinnoh": "sinnoh", 
        "paldea": "paldea", "hisui": "hisui", "retro": "retro", "love": "love", 
        "fantasy": "fantasy", "spring": "spring", "jungle": "jungle", "electric": "electric", 
        "catch": "catch", "evolution": "evolution", "sunshine": "sunshine", 
        "halloween": "halloween", "holiday": "holiday", "willpower": "willpower", 
        "weather": "weather", "fossil": "fossil", "summer": "summer", "color": "color", 
        "mountain": "mountain", "psychic": "psychic", "flying": "flying", "fighting": "fighting",
        "element": "element", "remix": "remix", "premier": "premier",
        # 🔥 換成精準的 naic2026
        "north america": "naic2026", "international": "naic2026", 
        "championship": "naic2026", "naic": "naic2026", "euic": "euic"
    }
    
    # 中文雷達
    zh_cup_keywords = {
        "關都": "kanto", "城都": "johto", "豐緣": "hoenn", "神奧": "sinnoh",
        "帕底亞": "paldea", "洗翠": "hisui", "復古": "retro", "愛情": "love",
        "奇幻": "fantasy", "春日": "spring", "叢林": "jungle", "電氣": "electric",
        "速成": "catch", "進化": "evolution", "陽光": "sunshine",
        "萬聖節": "halloween", "假日": "holiday", "意志": "willpower",
        "天氣": "weather", "化石": "fossil", "夏日": "summer", "色彩": "color",
        "山嶺": "mountain", "超能力": "psychic", "飛行": "flying", "格鬥": "fighting",
        "元素": "element", "remix": "remix", "紀念": "premier",
        # 🔥 換成精準的 naic2026
        "北美": "naic2026", "國際": "naic2026", "錦標賽": "naic2026"
    }

    pvp_id = "all"
    for keyword, mapped_id in cup_keywords.items():
        if keyword in name:
            pvp_id = mapped_id
            break
            
    if pvp_id == "all":
        for keyword, mapped_id in zh_cup_keywords.items():
            if keyword in zh_name_clean:
                pvp_id = mapped_id
                break
                
    return pvp_id, cp

def get_leagues(url, lang="en"):
    if not url: return []
    soup = get_soup(url, lang)
    if not soup: return []
    
    items = soup.find_all('div', attrs={"data-slot": "GblScheduleBlockItem"})
    data = []
    for item in items:
        start = int(item.get('data-start-timestamp', 0))
        end = int(item.get('data-end-timestamp', 0))
        
        names = []
        valid_kws = ["league", "cup", "edition", "聯盟", "盃", "版", "championship", "錦標賽"]
        
        for text in item.stripped_strings:
            clean_text = text.replace('*', '').strip()
            if clean_text and len(clean_text) < 70 and any(kw in clean_text.lower() for kw in valid_kws):
                if clean_text not in names:
                    names.append(clean_text)
                    
        if names:
            data.append({"start": start, "end": end, "leagues": names})
            
    return data

def run_automation():
    zh_urls = get_gbl_urls(BASE_NEWS_URL_ZH, "zh")
    en_urls = get_gbl_urls(BASE_NEWS_URL_EN, "en")
    
    # 若新聞列表爬取失敗，嘗試從搜尋結果頁抓最新的 GBL 公告
    if not zh_urls:
        fallback_search = get_gbl_urls("https://pokemongo.com/zh_Hant/news?q=go+battle+league", "zh")
        zh_urls = fallback_search if fallback_search else []
    if not en_urls:
        fallback_search = get_gbl_urls("https://pokemongo.com/en/news?q=go+battle+league", "en")
        en_urls = fallback_search if fallback_search else []
    
    now_ms = int(time.time() * 1000)
    tw_time = datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    tw_time_str = tw_time.strftime("%Y-%m-%d %H:%M:%S (台灣時間)")
    manifest = {"last_updated_human": tw_time_str, "active_leagues": []}
    
    # 移除上一版的 seen_meta_keys 去重邏輯，讓超級聯盟和錦標賽能同時存在
    seen_unique_names = set()

    for zh_url in zh_urls[:3]:
        slug = zh_url.rstrip('/').split('/')[-1]
        en_url = next((u for u in en_urls if slug in u), en_urls[0])
        
        print(f"\n🌐 嘗試解析: {zh_url}")
        zh_data = get_leagues(zh_url, "zh")
        en_data = get_leagues(en_url, "en")
        
        active_found = False

        for i in range(len(zh_data)):
            is_active = zh_data[i]['start'] <= now_ms <= zh_data[i]['end']
            
            if is_active:
                active_found = True
                en_leagues = en_data[i]['leagues'] if i < len(en_data) else []
                zh_leagues = zh_data[i]['leagues']
                
                for idx, zh_name in enumerate(zh_leagues):
                    en_name = en_leagues[idx] if idx < len(en_leagues) else zh_name
                    pvp_id, cp = map_to_pvpoke_id_and_cp(en_name, zh_name)
                    
                    # 改回以聯盟中文名稱作為唯一鍵值，允許不同聯盟共存
                    unique_key = f"{pvp_id}_{cp}_{zh_name}"
                    if unique_key in seen_unique_names: 
                        continue
                        
                    seen_unique_names.add(unique_key)
                    
                    manifest["active_leagues"].append({
                        "name_zh": zh_name, "name_en": en_name, "pvpoke_id": pvp_id, "cp": cp,
                        "json_url": f"https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/{pvp_id}/overall/rankings-{cp}.json"
                    })

        if active_found:
            print(f"🎯 成功鎖定目前的賽程！")
            break

    if not manifest["active_leagues"]:
        if zh_urls:
            print(f"⚠️ 處於賽季交替期！強制抓取最新公告的「第一組未來賽程」作為備案。")
            zh_url = zh_urls[0]
            en_url = en_urls[0] if en_urls else zh_url
            zh_data = get_leagues(zh_url, "zh")
            en_data = get_leagues(en_url, "en") if en_url != zh_url else []

            if zh_data:
                future_data = [d for d in zh_data if d['start'] > now_ms]
                target_data = future_data[0] if future_data else zh_data[-1]

                i = zh_data.index(target_data)
                en_leagues = en_data[i]['leagues'] if i < len(en_data) else []
                zh_leagues = zh_data[i]['leagues']

                for idx, zh_name in enumerate(zh_leagues):
                    en_name = en_leagues[idx] if idx < len(en_leagues) else zh_name
                    pvp_id, cp = map_to_pvpoke_id_and_cp(en_name, zh_name)

                    unique_key = f"{pvp_id}_{cp}_{zh_name}"
                    if unique_key in seen_unique_names: continue
                    seen_unique_names.add(unique_key)

                    manifest["active_leagues"].append({
                        "name_zh": f"{zh_name} (即將開放)", "name_en": en_name, "pvpoke_id": pvp_id, "cp": cp,
                        "json_url": f"https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/{pvp_id}/overall/rankings-{cp}.json"
                    })
            else:
                print(f"❌ 無法解析賽程頁面結構，manifest 保持空白（Bot 端將 fallback 到標準三聯盟）")
        else:
            print(f"❌ 無法找到任何 GBL 公告網址，manifest 保持空白（Bot 端將 fallback 到標準三聯盟）")

    os.makedirs('data', exist_ok=True)
    with open('data/manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\n🎉 成功產出 {len(manifest['active_leagues'])} 筆資料！")

if __name__ == "__main__":
    run_automation()
