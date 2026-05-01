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

def get_latest_gbl_url(base_url, lang="en"):
    print(f"🔍 正在自動尋找最新「GO對戰聯盟」公告 ({lang})...")
    soup = get_soup(base_url, lang)
    if not soup: return None

    links = soup.find_all('a', href=True)
    
    # 🔥 修正 1：嚴格鎖定 GBL，拔除容易撞名的 "update"
    keywords_zh = ["go對戰聯盟"]
    keywords_en = ["go-battle-league"]
    keywords = keywords_zh if lang == "zh" else keywords_en
    
    for link in links:
        href = link['href'].lower()
        title = link.get_text(strip=True).lower()
        
        if any(kw in href for kw in keywords) or any(kw in title for kw in keywords):
            full_url = href if href.startswith("http") else f"https://pokemongo.com{href}"
            print(f"🎯 找到最新公告: {full_url}")
            return full_url
            
    print(f"⚠️ 找不到最新的 GO對戰聯盟 公告，將使用預設網址。")
    return None

def map_to_pvpoke_id_and_cp(en_name, zh_name=""):
    name = en_name.lower().replace('*', '').strip()
    zh_name_clean = zh_name.replace('*', '').strip()
    
    cp = "1500"
    if "master" in name or "大師" in zh_name_clean: cp = "10000"
    elif "ultra" in name or "高級" in zh_name_clean: cp = "2500"
    elif "little" in name or "小小" in zh_name_clean: cp = "500"
    
    if ("mega" in name or "超級" in zh_name_clean) and cp == "10000":
        return "mega", "10000"
        
    if name in ["great league", "ultra league", "master league"] or zh_name_clean in ["超級聯盟", "高級聯盟", "大師聯盟"]:
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
        "element": "element", "remix": "remix", "premier": "premier"
    }
    
    # 🔥 修正 2：新增「中文雷達」，就算英文公告壞了，光看中文也能找出 ID
    zh_cup_keywords = {
        "關都": "kanto", "城都": "johto", "豐緣": "hoenn", "神奧": "sinnoh",
        "帕底亞": "paldea", "洗翠": "hisui", "復古": "retro", "愛情": "love",
        "奇幻": "fantasy", "春日": "spring", "叢林": "jungle", "電氣": "electric",
        "速成": "catch", "進化": "evolution", "陽光": "sunshine",
        "萬聖節": "halloween", "假日": "holiday", "意志": "willpower",
        "天氣": "weather", "化石": "fossil", "夏日": "summer", "色彩": "color",
        "山嶺": "mountain", "超能力": "psychic", "飛行": "flying", "格鬥": "fighting",
        "元素": "element", "remix": "remix", "紀念": "premier"
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
        valid_kws = ["league", "cup", "edition", "聯盟", "盃", "版"]
        
        for text in item.stripped_strings:
            clean_text = text.replace('*', '').strip()
            # 放寬字數限制到 70
            if clean_text and len(clean_text) < 70 and any(kw in clean_text.lower() for kw in valid_kws):
                if clean_text not in names:
                    names.append(clean_text)
                    
        if names:
            data.append({"start": start, "end": end, "leagues": names})
            
    if not data:
        print(f"⚠️ 在 {url} 中找不到賽程表資料，官方可能更改了網頁結構。")
    return data

def run_automation():
    zh_url = get_latest_gbl_url(BASE_NEWS_URL_ZH, "zh") or "https://pokemongo.com/zh_Hant/news/go-battle-league-memories-in-motion"
    en_url = get_latest_gbl_url(BASE_NEWS_URL_EN, "en") or "https://pokemongo.com/en/news/go-battle-league-memories-in-motion"
    
    print(f"🌐 使用中文網址: {zh_url}")
    print(f"🌐 使用英文網址: {en_url}")
    
    zh_data = get_leagues(zh_url, "zh")
    en_data = get_leagues(en_url, "en")
    
    now_ms = int(time.time() * 1000)
    
    tw_time = datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    tw_time_str = tw_time.strftime("%Y-%m-%d %H:%M:%S (台灣時間)")
    manifest = {"last_updated_human": tw_time_str, "active_leagues": []}
    
    seen = set()

    # 🔥 修正 3：以「中文資料」為主體進行迴圈，避免英文資料缺失導致全盤皆輸
    for i in range(len(zh_data)):
        is_active = zh_data[i]['start'] <= now_ms <= zh_data[i]['end']
        
        if is_active:
            en_leagues = en_data[i]['leagues'] if i < len(en_data) else []
            zh_leagues = zh_data[i]['leagues']
            
            for idx, zh_name in enumerate(zh_leagues):
                en_name = en_leagues[idx] if idx < len(en_leagues) else zh_name
                pvp_id, cp = map_to_pvpoke_id_and_cp(en_name, zh_name)
                
                unique_key = f"{pvp_id}_{cp}_{zh_name}"
                if unique_key in seen: continue
                seen.add(unique_key)
                
                manifest["active_leagues"].append({
                    "name_zh": zh_name, "name_en": en_name, "pvpoke_id": pvp_id, "cp": cp,
                    "json_url": f"https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/{pvp_id}/overall/rankings-{cp}.json"
                })

    os.makedirs('data', exist_ok=True)
    with open('data/manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\n🎉 成功產出 {len(manifest['active_leagues'])} 筆資料！")

if __name__ == "__main__":
    run_automation()
