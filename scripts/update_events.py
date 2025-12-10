import requests
from bs4 import BeautifulSoup
import json
import os
import time
import re
from datetime import datetime

# --- 設定路徑 ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRANS_FILE = os.path.join(BASE_DIR, 'data', 'chinese_translation.json')
EVENTS_FILE = os.path.join(BASE_DIR, 'data', 'events.json')

# --- 網站設定 ---
BASE_URL = "https://pokemon.wingzero.tw"
LIST_URL = "https://pokemon.wingzero.tw/page/event-history/tw/1"

def load_pokemon_data():
    """讀取中文翻譯檔，建立 '中文名 -> ID' 的對照表"""
    if not os.path.exists(TRANS_FILE):
        print("❌ 找不到翻譯檔")
        return {}
    
    with open(TRANS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 建立對照表: "妙蛙種子" -> "bulbasaur"
    name_to_id = {}
    for p in data:
        name = p.get('speciesName')
        pid = p.get('speciesId')
        if name and pid:
            name_to_id[name] = pid.lower()
            
            # 處理特殊形態，例如 "妙蛙花 Mega" -> 內文可能只會寫 "妙蛙花"
            # 這裡可以做一些模糊匹配的優化，但先以全名為主
    return name_to_id

def get_detail_pokemon(url, name_to_id_map):
    """進入內頁，分析文章內容找出相關的寶可夢 ID"""
    try:
        time.sleep(1) # 禮貌性延遲，避免對伺服器造成負擔
        print(f"   └── 正在分析內頁: {url}")
        headers = {'User-Agent': 'Mozilla/5.0'}
        resp = requests.get(url, headers=headers, timeout=10)
        
        if resp.status_code != 200:
            return []

        soup = BeautifulSoup(resp.content, 'html.parser')
        
        # 假設文章內容在 article 標籤或特定的 class 裡
        # 根據提供的 HTML，內頁通常是標準的 Bootstrap 結構
        # 我們直接抓取整個主要內容區塊的文字
        content_div = soup.find('div', class_='col-lg-9')
        if not content_div:
            return []
            
        text_content = content_div.get_text()
        
        found_ids = set()
        
        # 比對所有寶可夢中文名 (這會稍微花點時間，但在 GitHub Action 跑沒關係)
        # 優化：先檢查標題有的，再檢查內文
        # 這裡簡單暴力掃描內文
        
        for name, pid in name_to_id_map.items():
            # 排除太短的名字避免誤判 (雖然中文名字通常還好)
            if len(name) < 2: continue
            
            # 如果名字出現在文章內
            if name in text_content:
                # 過濾掉一些常見的誤判，例如 "皮卡丘" 可能出現在任何文章
                # 但活動通常就是針對特定寶可夢，所以先全部抓進來
                found_ids.add(pid)
        
        # 這裡可能會抓到太多 (例如文中提到剋制屬性的寶可夢)
        # 通常活動主角會在標題或出現次數最多，這裡先回傳所有找到的
        # 為了避免雜訊，我們限制：如果找到超過 5 隻，可能是一般新聞，不是特定寶可夢活動
        # 除非是 "社群日" 這種標題
        
        return list(found_ids)

    except Exception as e:
        print(f"   ❌ 內頁分析錯誤: {e}")
        return []

def fetch_events():
    name_to_id = load_pokemon_data()
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    print(f"🔍 開始爬取列表: {LIST_URL}")
    resp = requests.get(LIST_URL, headers=headers)
    if resp.status_code != 200:
        print("❌ 無法讀取網站")
        return []
    
    soup = BeautifulSoup(resp.content, 'html.parser')
    
    event_list = soup.select('div.col-lg-9 ul.list-unstyled li.py-3')
    
    events_data = []
    
    for li in event_list:
        h3 = li.find('h3')
        if not h3: continue
        
        # 1. 抓標題
        raw_title = h3.get_text().strip()
        
        # 2. 抓詳細連結
        a_tag = h3.find('a')
        detail_url = ""
        if a_tag and 'href' in a_tag.attrs:
            detail_url = BASE_URL + a_tag['href']
            
        # 3. 抓時間 (★★★ 修改重點 ★★★)
        time_tag = li.find('time')
        date_str = ""
        raw_date_str = ""
        if time_tag:
            raw_date_str = time_tag.get_text().strip()
            # 抓取所有日期格式
            dates = re.findall(r'(\d{4}-\d{2}-\d{2})', raw_date_str)
            
            if len(dates) >= 2:
                # 如果開始和結束日期不同，顯示範圍
                if dates[0] != dates[1]:
                    date_str = f"{dates[0]} ~ {dates[1]}"
                else:
                    date_str = dates[0]
            elif len(dates) == 1:
                date_str = dates[0]
            else:
                date_str = raw_date_str # 萬一格式很怪，就顯示原文
        
        print(f"📅 發現活動: {raw_title} ({date_str})")
        
        # 4. 判斷寶可夢 ID (保持不變)
        pokemon_ids = []
        for name, pid in name_to_id.items():
            if name in raw_title:
                pokemon_ids.append(pid)
        
        if not pokemon_ids and detail_url:
            keywords = ["社群日", "聚焦時刻", "團體戰", "調查", "孵化", "對戰日", "極巨"]
            if any(k in raw_title for k in keywords):
                ids_in_detail = get_detail_pokemon(detail_url, name_to_id)
                pokemon_ids.extend(ids_in_detail)
        
        pokemon_ids = list(set(pokemon_ids))
        
        if pokemon_ids or any(k in raw_title for k in ["社群日", "聚焦時刻"]):
            events_data.append({
                "date": date_str,      # 這裡現在會是 "2025-12-22 ~ 2025-12-31"
                "raw_time": raw_date_str,
                "pokemonId": pokemon_ids,
                "eventName": raw_title,
                "link": detail_url
            })

    return events_data

def save_events(events):
    with open(EVENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=2)
    print(f"✅ 已更新 {len(events)} 筆活動至 {EVENTS_FILE}")

if __name__ == "__main__":
    data = fetch_events()
    if data:
        save_events(data)
