# fetch_data.py
import requests
import cloudscraper
import os
import re

def get_site_version(scraper):
    """從 PvPoke 主頁獲取網站版本號"""
    try:
        url = "https://pvpoke.com/rankings/all/1500/overall/"
        print(f"Fetching site version from {url}...")
        response = scraper.get(url)
        response.raise_for_status() # 如果請求失敗則拋出異常
        
        # 使用正則表達式尋找 var siteVersion = "vX.Y.Z";
        match = re.search(r'var\s+siteVersion\s*=\s*"([^"]+)"', response.text)
        if match:
            version = match.group(1)
            print(f"Found site version: {version}")
            return version
        else:
            print("Error: Could not find site version in the page content.")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching site version: {e}")
        return None

def fetch_rankings(scraper, version):
    """下載所有聯盟的排名 JSON 檔案"""
    leagues = {
        "500": "Little League",
        "1500": "Great League",
        "2500": "Ultra League",
        "10000": "Master League"
    }
    
    # 確保 data 資料夾存在
    if not os.path.exists('data'):
        os.makedirs('data')

    for cp, name in leagues.items():
        url = f"https://pvpoke.com/data/rankings/all/overall/rankings-{cp}.json?v={version}"
        print(f"Fetching rankings for {name} ({cp})...")
        try:
            response = scraper.get(url)
            response.raise_for_status()
            
            # 寫入檔案
            with open(f"data/rankings_{cp}.json", 'w', encoding='utf-8') as f:
                f.write(response.text)
            print(f"Successfully downloaded rankings_{cp}.json")

        except requests.exceptions.RequestException as e:
            print(f"Error fetching rankings for {cp}: {e}")
        except Exception as e:
            print(f"An unexpected error occurred for {cp}: {e}")


if __name__ == "__main__":
    # 建立一個 cloudscraper 實例，它會像瀏覽器一樣處理挑戰
    scraper = cloudscraper.create_scraper()
    
    version_number = get_site_version(scraper)
    
    if version_number:
        fetch_rankings(scraper, version_number)
    else:
        print("Could not retrieve site version. Aborting download.")
        exit(1) # 以錯誤碼退出，讓 GitHub Action 失敗
