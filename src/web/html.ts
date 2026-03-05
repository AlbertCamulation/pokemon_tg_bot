// src/web/html.ts

// 1. 這是你原本就有的主機首頁 (如果你原本有寫其他的，請保留你原本的)
export function generateHTML() {
  return `
    <!DOCTYPE html>
    <html>
      <head><title>Pokemon TG Bot</title></head>
      <body><h1>機器人運作中 🤖</h1></body>
    </html>
  `;
}

// 2. 這是我們剛剛做好的 Web App 寶可夢盒子介面
export const myBoxHtml = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>我的寶可夢盒子</title>
  
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  
  <style>
    /* 自動抓取使用者的 Telegram 主題色 */
    :root {
      --bg-color: var(--tg-theme-bg-color, #ffffff);
      --text-color: var(--tg-theme-text-color, #000000);
      --hint-color: var(--tg-theme-hint-color, #999999);
      --btn-color: var(--tg-theme-button-color, #2481cc);
      --btn-text-color: var(--tg-theme-button-text-color, #ffffff);
      --secondary-bg: var(--tg-theme-secondary-bg-color, #f0f0f0);
    }
    
    * { box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      margin: 0;
      padding: 0;
      padding-bottom: 90px;
    }
    
    .container { padding: 20px; }
    
    .header { text-align: center; margin-bottom: 25px; }
    .header h2 { margin: 0 0 8px 0; }
    .header p { color: var(--hint-color); margin: 0; font-size: 14px; }
    
    .tabs { 
      display: flex; 
      background: var(--secondary-bg); 
      padding: 4px; 
      border-radius: 10px; 
      margin-bottom: 20px; 
    }
    .tab { 
      flex: 1; 
      text-align: center; 
      padding: 10px; 
      cursor: pointer; 
      border-radius: 8px; 
      font-weight: 600; 
      color: var(--hint-color); 
      transition: 0.2s; 
    }
    .tab.active { 
      background: var(--bg-color); 
      color: var(--text-color); 
      box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
    }
    
    .pokemon-list { display: flex; flex-direction: column; gap: 10px; }
    .pokemon-item {
      display: flex; justify-content: space-between; align-items: center;
      background: var(--secondary-bg); padding: 16px; border-radius: 12px;
      font-size: 16px; font-weight: 500; cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .pokemon-item input[type="checkbox"] {
      width: 22px; height: 22px; accent-color: var(--btn-color);
    }
    
    .footer {
      position: fixed; bottom: 0; left: 0; right: 0;
      padding: 15px 20px; background: var(--bg-color);
      box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
    }
    .btn {
      background-color: var(--btn-color); color: var(--btn-text-color);
      border: none; padding: 16px; border-radius: 12px;
      font-size: 18px; font-weight: bold; width: 100%; cursor: pointer;
    }
  </style>
</head>
<body>

  <div class="container">
    <div class="header">
      <h2>🎒 我的對戰盒子</h2>
      <p id="user-info">讀取訓練家資料中...</p>
    </div>
    
    <div class="tabs">
      <div class="tab active" onclick="switchLeague(1500)">超級 (1500)</div>
      <div class="tab" onclick="switchLeague(2500)">高級 (2500)</div>
    </div>

    <div class="pokemon-list" id="list-1500">
      <label class="pokemon-item">
        <span>👻 胖嘟嘟 (Jellicent)</span>
        <input type="checkbox" value="jellicent" class="poke-check">
      </label>
      <label class="pokemon-item">
        <span>💧 瑪力露麗 (Azumarill)</span>
        <input type="checkbox" value="azumarill" class="poke-check">
      </label>
      <label class="pokemon-item">
        <span>🪤 泥巴魚 伽勒爾</span>
        <input type="checkbox" value="stunfisk_galarian" class="poke-check">
      </label>
    </div>
    
    <div class="pokemon-list" id="list-2500" style="display: none;">
      <label class="pokemon-item">
        <span>🐉 騎拉帝納 另類</span>
        <input type="checkbox" value="giratina_altered" class="poke-check">
      </label>
      <label class="pokemon-item">
        <span>🦅 烈箭鷹 (Talonflame)</span>
        <input type="checkbox" value="talonflame" class="poke-check">
      </label>
    </div>
  </div>

  <div class="footer">
    <button class="btn" onclick="saveTeam()">💾 儲存並分析最佳隊伍</button>
  </div>

  <script>
    const tg = window.Telegram.WebApp;
    tg.expand();
    tg.ready();

    if (tg.initDataUnsafe?.user) {
      document.getElementById('user-info').innerText = 
        '訓練家：' + tg.initDataUnsafe.user.first_name + '，請勾選可上場的寶可夢。';
    }

    let currentLeague = 1500;

    function switchLeague(league) {
      currentLeague = league;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('list-1500').style.display = league === 1500 ? 'flex' : 'none';
      document.getElementById('list-2500').style.display = league === 2500 ? 'flex' : 'none';
    }

    function saveTeam() {
      const checkboxes = document.querySelectorAll('#list-' + currentLeague + ' .poke-check:checked');
      const selected = Array.from(checkboxes).map(cb => cb.value);
      
      if (selected.length === 0) {
        tg.showAlert('⚠️ 請至少勾選一隻寶可夢喔！');
        return;
      }

      const payload = { action: "save_box", league: currentLeague, team: selected };
      tg.sendData(JSON.stringify(payload));
    }
  </script>
</body>
</html>
`;
