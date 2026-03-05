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

    /* 動態 Tabs */
    .tabs {
      display: flex; flex-wrap: wrap; gap: 6px;
      margin-bottom: 20px;
    }
    .tab {
      flex: 1; min-width: 80px; text-align: center;
      padding: 10px 8px; cursor: pointer;
      border-radius: 10px; font-weight: 600; font-size: 13px;
      color: var(--hint-color);
      background: var(--secondary-bg);
      transition: 0.2s;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .tab.active {
      background: var(--btn-color); color: var(--btn-text-color);
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
    .tabs-loading {
      color: var(--hint-color); font-size: 13px; padding: 8px 0;
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
    .save-btn:disabled { opacity: 0.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🎒 我的對戰盒子</h2>
      <p id="user-info">連線中...</p>
    </div>

    <div class="tabs" id="tabs-container">
      <div class="tabs-loading">載入當下聯盟...</div>
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
    }

    // activeLeagues: [{ name, path, command }]
    let activeLeagues = [];
    let currentLeaguePath = "";
    // userBox keyed by leaguePath
    let userBox = {};

    async function initData() {
      try {
        // 並行取得：當下聯盟清單、名稱清單、盒子資料
        const [leaguesRes, namesRes] = await Promise.all([
          fetch('/api/active-leagues?t=' + Date.now()),
          fetch('/api/names?t=' + Date.now())
        ]);

        activeLeagues = await leaguesRes.json();
        const names = await namesRes.json();

        // 填入 autocomplete
        const datalist = document.getElementById('poke-options');
        names.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          datalist.appendChild(opt);
        });

        // 讀取盒子資料（所有聯盟）
        if (userId) {
          const pathKeys = activeLeagues.map(l => l.command).join(',');
          const boxRes = await fetch('/api/box?userId=' + userId + '&t=' + Date.now());
          const boxData = await boxRes.json();
          userBox = boxData;
        }

        // 建立動態 tabs
        renderTabs();

        // 預設選第一個
        if (activeLeagues.length > 0) {
          switchLeague(activeLeagues[0].path, activeLeagues[0].command);
        } else {
          document.getElementById('current-list').innerHTML =
            '<div style="text-align:center; color:gray; padding:20px;">目前無進行中的聯盟</div>';
        }

      } catch (e) {
        document.getElementById('tabs-container').innerHTML = '<div style="color:red;">聯盟載入失敗</div>';
        document.getElementById('current-list').innerHTML = '<div style="color:red;text-align:center;">載入失敗</div>';
      }
    }

    function renderTabs() {
      const container = document.getElementById('tabs-container');
      container.innerHTML = '';
      activeLeagues.forEach((league, i) => {
        const div = document.createElement('div');
        div.className = 'tab' + (i === 0 ? ' active' : '');
        div.id = 'tab-' + league.command;
        div.textContent = league.name;
        div.onclick = () => switchLeague(league.path, league.command);
        container.appendChild(div);
      });
    }

    function switchLeague(path, command) {
      currentLeaguePath = path;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      const tab = document.getElementById('tab-' + command);
      if (tab) tab.classList.add('active');
      renderList();
    }

    function renderList() {
      const listEl = document.getElementById('current-list');
      listEl.innerHTML = '';
      const currentTeam = userBox[currentLeaguePath] || [];
      if (currentTeam.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:gray; padding: 20px;">盒子空空的，搜一隻來加吧！</div>';
        return;
      }
      currentTeam.forEach(name => {
        const div = document.createElement('div');
        div.className = 'pokemon-item';
        div.innerHTML = \`<span>\${name}</span><button class="delete-btn" onclick="removePokemon('\${name}')">移除</button>\`;
        listEl.appendChild(div);
      });
    }

    function addPokemon() {
      const input = document.getElementById('poke-search');
      const name = input.value.trim();
      if (!name || !currentLeaguePath) return;
      if (!userBox[currentLeaguePath]) userBox[currentLeaguePath] = [];
      if (!userBox[currentLeaguePath].includes(name)) {
        userBox[currentLeaguePath].push(name);
        tg.HapticFeedback.impactOccurred('light');
        renderList();
      }
      input.value = '';
    }

    function removePokemon(name) {
      userBox[currentLeaguePath] = (userBox[currentLeaguePath] || []).filter(p => p !== name);
      renderList();
    }

    async function saveTeam() {
      if (!userId) { tg.showAlert('找不到使用者ID'); return; }
      if (!currentLeaguePath) { tg.showAlert('請先選擇聯盟'); return; }
      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.innerText = "儲存中...";
      try {
        await fetch('/api/box', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            leaguePath: currentLeaguePath,
            team: userBox[currentLeaguePath] || []
          })
        });
        tg.showAlert('✅ 已同步！請回聊天室查看結果！', () => { tg.close(); });
      } catch (e) {
        tg.showAlert('儲存失敗');
      } finally {
        btn.disabled = false;
        btn.innerText = "💾 儲存並分析最佳隊伍";
      }
    }

    initData();
  </script>
</body>
</html>
`;
