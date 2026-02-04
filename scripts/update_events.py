import requests
from bs4 import BeautifulSoup
import json
import os
import re
from datetime import datetime

# --- 設定路徑 ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRANS_FILE = os.path.join(BASE_DIR, 'data', 'chinese_translation.json')
EVENTS_FILE = os.path.join(BASE_DIR, 'data', 'events.json')
DATA_DIR = os.path.join(BASE_DIR, 'data')

# --- 聯盟設定 ---
LEAGUES = {
    500: "小小聯盟",
    1500: "超級聯盟",
    2500: "高級聯盟",
    10000: "大師聯盟"
}

# --- 網站設定 ---
BASE_URL = "https://pokemon.wingzero.tw"
LIST_URL = "https://pokemon.wingzero.tw/page/event-history/tw/1"

def load_pokemon_data():
    """建立 中文名稱 -> ID 的對照表，以及完整的寶可夢資料"""
    if not os.path.exists(TRANS_FILE):
        return {}, []

    with open(TRANS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    name_to_id = {}
    for p in data:
        name = p.get('speciesName')
        pid = p.get('speciesId')
        if name and pid:
            name_to_id[name] = pid.lower()
    return name_to_id, data


def load_rankings_data():
    """載入所有聯盟的排名資料"""
    rankings = {}
    for cp in LEAGUES.keys():
        file_path = os.path.join(DATA_DIR, f'rankings_{cp}.json')
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # 建立 speciesId -> 排名 的對照表
                rankings[cp] = {}
                for idx, pokemon in enumerate(data):
                    species_id = pokemon.get('speciesId', '').lower()
                    if species_id:
                        rankings[cp][species_id] = {
                            'rank': idx + 1,
                            'score': pokemon.get('score', 0),
                            'speciesName': pokemon.get('speciesName', '')
                        }
    return rankings


def build_family_map(pokemon_data):
    """建立進化鏈對照表：speciesId -> 同家族所有成員"""
    family_map = {}  # family_id -> [member_ids]
    id_to_family = {}  # species_id -> family_id

    for p in pokemon_data:
        species_id = p.get('speciesId', '').lower()
        family = p.get('family', {})
        family_id = family.get('id', '')

        if species_id and family_id:
            # 排除暗影版本，只保留一般版本
            if '_shadow' in species_id:
                continue

            id_to_family[species_id] = family_id

            if family_id not in family_map:
                family_map[family_id] = []
            if species_id not in family_map[family_id]:
                family_map[family_id].append(species_id)

    return family_map, id_to_family


def get_pvp_value(pokemon_ids, rankings, family_map, id_to_family, pokemon_data):
    """
    取得活動寶可夢的 PvP 價值
    會檢查該寶可夢及其所有進化型在各聯盟的排名
    """
    pvp_value = []
    checked_families = set()

    # 建立 id -> 中文名 對照表
    id_to_name = {}
    for p in pokemon_data:
        pid = p.get('speciesId', '').lower()
        name = p.get('speciesName', '')
        if pid and name:
            id_to_name[pid] = name

    for pokemon_id in pokemon_ids:
        pokemon_id = pokemon_id.lower()

        # 取得這隻寶可夢的家族
        family_id = id_to_family.get(pokemon_id, '')
        if not family_id or family_id in checked_families:
            continue
        checked_families.add(family_id)

        # 取得家族所有成員
        family_members = family_map.get(family_id, [pokemon_id])

        # 檢查每個聯盟
        for cp, league_name in LEAGUES.items():
            league_rankings = rankings.get(cp, {})

            for member_id in family_members:
                # 檢查一般版和暗影版
                variants = [member_id, f"{member_id}_shadow"]

                for variant in variants:
                    if variant in league_rankings:
                        info = league_rankings[variant]
                        rank = info['rank']

                        # 只顯示排名前 100 的
                        if rank <= 100:
                            chinese_name = id_to_name.get(member_id, member_id)
                            is_shadow = '_shadow' in variant

                            pvp_value.append({
                                'pokemon': chinese_name,
                                'pokemonId': member_id,
                                'league': league_name,
                                'leagueCp': cp,
                                'rank': rank,
                                'score': info['score'],
                                'isShadow': is_shadow,
                                'isEvolution': member_id != pokemon_id
                            })

    # 按排名排序
    pvp_value.sort(key=lambda x: (x['leagueCp'], x['rank']))

    return pvp_value

def parse_monthly_article(url, name_to_id, current_year):
    """專門解析「月度活動總覽」文章的內文"""
    print(f"   └── 進入月度文章分析: {url}")
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200: return []

        soup = BeautifulSoup(resp.content, 'html.parser')
        content_div = soup.find('div', class_='col-lg-9') # 假設文章內容在這裡
        if not content_div: return []

        # 取得純文字內容，按行分割
        text_lines = content_div.get_text("\n").split("\n")
        
        extracted_events = []
        current_category = ""
        
        # 定義我們要抓的區塊關鍵字
        target_categories = ["極巨對戰", "極巨星期一", "傳說團體戰", "超級團體戰", "暗影傳說團體戰"]
        
        # 加入 \s* 允許波浪號前後有空白
        date_pattern = re.compile(r'(\d{1,2}/\d{1,2})\s*[～~-]\s*(\d{1,2}/\d{1,2})')

        for line in text_lines:
            line = line.strip()
            if not line: continue

            # 1. 判斷當前段落是什麼類型 (例如 "極巨對戰 & 極巨星期一")
            for cat in target_categories:
                if cat in line:
                    current_category = cat
                    # 簡化名稱
                    if "極巨" in cat: current_category = "極巨對戰"
                    elif "傳說" in cat and "暗影" not in cat: current_category = "傳說團體戰"
                    elif "超級" in cat: current_category = "超級團體戰"
                    elif "暗影" in cat: current_category = "暗影傳說團體戰"
                    break
            
            # 如果還沒進到我們要的區塊，就跳過
            if not current_category: continue

            # 2. 嘗試抓取日期範圍 (例如 "12/22～12/28")
            date_match = date_pattern.search(line)
            if date_match:
                start_date_raw = date_match.group(1) # 12/22
                end_date_raw = date_match.group(2)   # 12/28
                
                # 轉換成完整日期格式 YYYY-MM-DD
                # 注意跨年問題：如果當前是 12月，但抓到 1月，年份要+1
                def parse_partial_date(d_str, year):
                    m, d = map(int, d_str.split('/'))
                    # 簡單判斷跨年：如果月份比現在小很多 (例如現在12月，抓到1月)，年份+1
                    # 這裡簡化：假設文章標題的年份是準的
                    target_year = year
                    if m == 1 and datetime.now().month == 12: # 跨年修正
                        target_year += 1
                    return f"{target_year}-{m:02d}-{d:02d}"

                # 嘗試在同一行或下一行找寶可夢名稱
                # 這裡我們簡單做：檢查這行有沒有寶可夢，如果沒有，就往下看幾行
                # 但通常格式是：
                # 12/22～12/28
                # 極巨化 海豹球 ★
                
                # 暫存這個日期，往下找寶可夢
                found_pokemons = []
                
                # 往這行裡面找
                for name, pid in name_to_id.items():
                    if name in line and pid not in found_pokemons:
                         found_pokemons.append(pid)
                
                # 如果這行沒找到，通常在下面幾行 (或是同一行後面)
                # 這裡為了簡單，我們假設如果這行有日期但沒寶可夢，就標記一下，
                # 但爬蟲邏輯太複雜會容易錯，我們這裡採用「逐行掃描」策略：
                # 如果一行有日期，我們就預期接下來的幾行是寶可夢，直到遇到下一個日期或空行
                
                # 修正策略：
                # 當讀到日期時，建立一個 pending event
                # 當讀到寶可夢時，把它加入最近的一個 pending event
                
                start_date_fmt = parse_partial_date(start_date_raw, current_year)
                end_date_fmt = parse_partial_date(end_date_raw, current_year)
                
                # 建立一個新活動物件
                extracted_events.append({
                    "date": f"{start_date_fmt} ~ {end_date_fmt}",
                    "raw_time": line,
                    "pokemonId": found_pokemons, # 可能為空，待填補
                    "eventName": f"{current_category}", # 暫定名稱
                    "link": url,
                    "is_pending": True # 標記還需要找寶可夢
                })
            
            elif extracted_events and extracted_events[-1]["is_pending"]:
                # 3. 如果上一個活動還在找寶可夢，就在這行找
                last_event = extracted_events[-1]
                
                # 找寶可夢
                found_in_line = []
                for name, pid in name_to_id.items():
                    # 排除太短的干擾字，例如 "極巨化" 不是寶可夢
                    if name in line:
                        last_event["pokemonId"].append(pid)
                        found_in_line.append(name)
                
                if found_in_line:
                    # 如果找到了，更新活動名稱
                    # 例如 "極巨對戰：海豹球"
                    p_names = "、".join(found_in_line)
                    last_event["eventName"] = f"{last_event['eventName']}：{p_names}"
                    # 不把 is_pending 設為 False，因為可能還有其他隻 (例如三劍客)
                
                # 如果遇到空行或是新的日期，這個 event 就結束了 (在迴圈開頭會處理日期)
                # 這裡不做特別結束動作，靠下一個日期來切斷

        # 整理結果：移除沒有找到寶可夢的活動
        final_list = []
        for evt in extracted_events:
            if evt["pokemonId"]:
                del evt["is_pending"] # 移除內部標記
                evt["pokemonId"] = list(set(evt["pokemonId"])) # 去重
                final_list.append(evt)
                
        return final_list

    except Exception as e:
        print(f"   ❌ 解析文章錯誤: {e}")
        return []

def fetch_events():
    name_to_id, pokemon_data = load_pokemon_data()
    rankings = load_rankings_data()
    family_map, id_to_family = build_family_map(pokemon_data)

    print(f"📊 已載入排名資料: {', '.join([f'{LEAGUES[cp]}({len(r)}隻)' for cp, r in rankings.items()])}")

    headers = {'User-Agent': 'Mozilla/5.0'}

    print(f"🔍 開始爬取列表: {LIST_URL}")
    resp = requests.get(LIST_URL, headers=headers)
    if resp.status_code != 200: return []

    soup = BeautifulSoup(resp.content, 'html.parser')
    event_list = soup.select('div.col-lg-9 ul.list-unstyled li.py-3')
    
    events_data = []
    
    # 取得今年年份，用於解析日期
    current_year = datetime.now().year

    for li in event_list:
        h3 = li.find('h3')
        if not h3: continue
        
        raw_title = h3.get_text().strip()
        
        a_tag = h3.find('a')
        detail_url = ""
        if a_tag and 'href' in a_tag.attrs:
            detail_url = BASE_URL + a_tag['href']
            
        time_tag = li.find('time')
        date_str = ""
        raw_date_str = ""
        
        # --- 處理一般列表項目 (保持原有邏輯) ---
        if time_tag:
            raw_date_str = time_tag.get_text().strip()
            dates = re.findall(r'(\d{4}-\d{2}-\d{2})', raw_date_str)
            if len(dates) >= 2:
                date_str = f"{dates[0]} ~ {dates[1]}" if dates[0] != dates[1] else dates[0]
            elif len(dates) == 1:
                date_str = dates[0]
            else:
                date_str = raw_date_str

        # 1. 一般活動處理
        pokemon_ids = []
        for name, pid in name_to_id.items():
            if name in raw_title:
                pokemon_ids.append(pid)
        
        # 如果是「月度活動總覽」文章，就使用新邏輯解析
        # 標題通常是 "Pokémon GO 2025 年 12 月活動"
        if "月活動" in raw_title and detail_url:
            print(f"📅 發現月度總覽: {raw_title}")
            # 呼叫新函數解析內文
            monthly_events = parse_monthly_article(detail_url, name_to_id, current_year)
            events_data.extend(monthly_events)
            continue # 跳過原本的處理，因為已經處理完內文了

        # 一般活動的詳細頁面爬取 (社群日等)
        if not pokemon_ids and detail_url:
            keywords = ["社群日", "聚焦時刻", "團體戰", "調查", "孵化", "對戰日"]
            if any(k in raw_title for k in keywords):
                # 這裡可以使用簡單的內文關鍵字爬取 (如果您原來的 get_detail_pokemon 還在的話)
                # 或是依賴標題即可
                pass 
        
        if pokemon_ids or any(k in raw_title for k in ["社群日", "聚焦時刻"]):
            events_data.append({
                "date": date_str,
                "raw_time": raw_date_str,
                "pokemonId": list(set(pokemon_ids)),
                "eventName": raw_title,
                "link": detail_url
            })

    # 為每個活動計算 PvP 價值
    print(f"🎯 正在計算 {len(events_data)} 個活動的 PvP 價值...")
    for event in events_data:
        if event.get('pokemonId'):
            pvp_value = get_pvp_value(
                event['pokemonId'],
                rankings,
                family_map,
                id_to_family,
                pokemon_data
            )
            event['pvpValue'] = pvp_value

            if pvp_value:
                top_picks = [f"{v['pokemon']}({v['league']}#{v['rank']})" for v in pvp_value[:3]]
                print(f"   ✨ {event['eventName']}: {', '.join(top_picks)}")

    return events_data

def save_events(events):
    with open(EVENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=2)
    print(f"✅ 已更新 {len(events)} 筆活動至 {EVENTS_FILE}")

if __name__ == "__main__":
    data = fetch_events()
    if data:
        save_events(data)
