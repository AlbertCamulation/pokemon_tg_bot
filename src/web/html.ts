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

export const myBoxHtml = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>我的寶可夢盒子</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    :root {
      --bg-color: var(--tg-theme-bg-color, #ffffff);
      --text-color: var(--tg-theme-text-color, #000000);
      --hint-color: var(--tg-theme-hint-color, #999999);
      --btn-color: var(--tg-theme-button-color, #2481cc);
      --btn-text-color: var(--tg-theme-button-text-color, #ffffff);
      --secondary-bg: var(--tg-theme-secondary-bg-color, #f0f0f0);
      --danger-color: #ff3b30;
    }
    
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-color); color: var(--text-color);
      margin: 0; padding: 0; padding-bottom: 90px;
    }
    
    .container { padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .header h2 { margin: 0 0 5px 0; }
    .header p { color: var(--hint-color); margin: 0; font-size: 14px; }
    
    /* 四個聯盟的 Tabs */
    .tabs { 
      display: flex; background: var(--secondary-bg); 
      padding: 4px; border-radius: 10px; margin-bottom: 20px; 
    }
    .tab { 
      flex: 1; text-align: center; padding: 8px 0; cursor: pointer; 
      border-radius: 8px; font-weight: 600; font-size: 14px;
      color: var(--hint-color); transition: 0.2s; 
    }
    .tab.active { 
      background: var(--bg-color); color: var(--text-color); 
      box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
    }
    
    /* 搜尋列 */
    .search-bar { display: flex; gap: 10px; margin-bottom: 20px; }
    .search-bar input {
      flex: 1; padding: 12px; border-radius: 10px; border: 1px solid var(--hint-color);
      background: var(--bg-color); color: var(--text-color); font-size: 16px;
    }
    .search-bar button {
      background: var(--btn-color); color: var(--btn-text-color);
      border: none; padding: 0 20px; border-radius: 10px;
      font-weight: bold; font-size: 16px; cursor: pointer;
    }
    
    /* 寶可夢列表 */
    .pokemon-list { display: flex; flex-direction: column; gap: 10px; }
    .pokemon-item {
      display: flex; justify-content: space-between; align-items: center;
      background: var(--secondary-bg); padding: 12px 16px; border-radius: 12px;
      font-size: 16px; font-weight: 500;
    }
    .delete-btn {
      background: var(--danger-color); color: white; border: none;
      padding: 6px 12px; border-radius: 8px; font-weight: bold; cursor: pointer;
    }
    
    .footer {
      position: fixed; bottom: 0; left: 0; right: 0;
      padding: 15px 20px; background: var(--bg-color);
      box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
    }
    .save-btn {
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
      <p id="user-info">連線中...</p>
    </div>
    
    <div class="tabs">
      <div class="tab" id="tab-500" onclick="switchLeague(500)">500</div>
      <div class="tab active" id="tab-1500" onclick="switchLeague(1500)">1500</div>
      <div class="tab" id="tab-2500" onclick="switchLeague(2500)">2500</div>
      <div class="tab" id="tab-10000" onclick="switchLeague(10000)">大師</div>
    </div>

    <div class="search-bar">
      <input type="text" id="poke-search" list="poke-options" placeholder="🔍 搜尋寶可夢名稱..." autocomplete="off">
      <datalist id="poke-options"></datalist>
      <button onclick="addPokemon()">加入</button>
    </div>

    <div class="pokemon-list" id="current-list">
      <div style="text-align:center; color:gray; padding: 20px;">載入中...</div>
    </div>
  </div>

  <div class="footer">
    <button class="save-btn" id="save-btn" onclick="saveTeam()">💾 儲存並分析最佳隊伍</button>
  </div>

  <script>
    const tg = window.Telegram.WebApp;
    tg.expand();
    tg.ready();

    const userId = tg.initDataUnsafe?.user?.id || "";
    if (tg.initDataUnsafe?.user) {
      document.getElementById('user-info').innerText = '訓練家：' + tg.initDataUnsafe.user.first_name;
    } else {
      document.getElementById('user-info').innerText = '請在 Telegram 內部開啟';
    }

    let currentLeague = 1500;
    let userBox = { 500: [], 1500: [], 2500: [], 10000: [] };

    // 1. 初始化資料 (要字典清單 + 使用者上次儲存的陣容)
    async function initData() {
      try {
        // 抓取寶可夢名稱字典
        const namesRes = await fetch('/api/names');
        const names = await namesRes.json();
        const datalist = document.getElementById('poke-options');
        names.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          datalist.appendChild(opt);
        });

        // 抓取使用者的雲端資料
        if (userId) {
          const boxRes = await fetch('/api/box?userId=' + userId);
          userBox = await boxRes.json();
        }
        
        renderList();
      } catch (e) {
        document.getElementById('current-list').innerHTML = '<div style="color:red;text-align:center;">資料載入失敗，請重試</div>';
      }
    }

    // 2. 切換聯盟
    function switchLeague(league) {
      currentLeague = league;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-' + league).classList.add('active');
      renderList();
    }

    // 3. 渲染目前的列表
    function renderList() {
      const listEl = document.getElementById('current-list');
      listEl.innerHTML = '';
      
      const currentTeam = userBox[currentLeague] || [];
      if (currentTeam.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:var(--hint-color); padding: 20px;">目前盒子是空的，趕快搜尋加入吧！</div>';
        return;
      }

      currentTeam.forEach(name => {
        const div = document.createElement('div');
        div.className = 'pokemon-item';
        div.innerHTML = \`
          <span>\${name}</span>
          <button class="delete-btn" onclick="removePokemon('\${name}')">移除</button>
        \`;
        listEl.appendChild(div);
      });
    }

    // 4. 新增寶可夢
    function addPokemon() {
      const input = document.getElementById('poke-search');
      const name = input.value.trim();
      
      if (!name) return;
      if (!userBox[currentLeague].includes(name)) {
        userBox[currentLeague].push(name);
        tg.HapticFeedback.impactOccurred('light');
        renderList();
      } else {
        tg.showAlert('⚠️ 這隻寶可夢已經在盒子裡囉！');
      }
      input.value = ''; // 清空搜尋框
    }

    // 5. 移除寶可夢
    function removePokemon(name) {
      userBox[currentLeague] = userBox[currentLeague].filter(p => p !== name);
      tg.HapticFeedback.impactOccurred('light');
      renderList();
    }

    // 6. 儲存回後端
    async function saveTeam() {
      if (!userId) {
        tg.showAlert('發生錯誤：找不到使用者 ID');
        return;
      }
      
      const btn = document.getElementById('save-btn');
      btn.innerText = "儲存中...";
      tg.HapticFeedback.impactOccurred('medium');

      const payload = {
        userId: userId,
        league: currentLeague,
        team: userBox[currentLeague]
      };
      
      try {
        await fetch('/api/box', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        tg.showAlert('✅ 已同步至雲端，請回聊天室查看結果！', () => {
          tg.close(); // 關閉 Web App 回到聊天室
        });
      } catch (e) {
        tg.showAlert('儲存失敗，請檢查網路狀態');
        btn.innerText = "💾 儲存並分析最佳隊伍";
      }
    }

    // 啟動！
    initData();
  </script>
</body>
</html>
`;
