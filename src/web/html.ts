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
      --bg: var(--tg-theme-bg-color, #1c1c1e);
      --text: var(--tg-theme-text-color, #ffffff);
      --hint: var(--tg-theme-hint-color, #8e8e93);
      --btn: var(--tg-theme-button-color, #7c6bff);
      --btn-text: var(--tg-theme-button-text-color, #ffffff);
      --secondary-bg: var(--tg-theme-secondary-bg-color, #2c2c2e);
      --danger: #ff453a;
      --star: #ffd60a;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg); color: var(--text); padding-bottom: 100px;
    }

    .header { text-align: center; padding: 20px 20px 10px; }
    .header h2 { font-size: 20px; margin-bottom: 4px; }
    .header p { color: var(--hint); font-size: 13px; }

    /* 帳號切換 */
    .accounts {
      display: flex; gap: 8px; padding: 0 16px 14px;
      overflow-x: auto; scrollbar-width: none;
    }
    .accounts::-webkit-scrollbar { display: none; }
    .account-btn {
      flex-shrink: 0; padding: 6px 14px; border-radius: 20px;
      font-size: 13px; font-weight: 600;
      background: var(--secondary-bg); color: var(--hint);
      border: 2px solid transparent; cursor: pointer; transition: 0.2s;
    }
    .account-btn.active { background: var(--btn); color: var(--btn-text); }

    /* 動態聯盟 Tabs */
    .tabs {
      display: flex; flex-wrap: wrap; gap: 6px; padding: 0 16px 14px;
    }
    .tab {
      flex: 1; min-width: 100px; text-align: center; padding: 10px 8px;
      border-radius: 10px; font-weight: 700; font-size: 13px;
      background: var(--secondary-bg); color: var(--hint);
      cursor: pointer; transition: 0.2s; white-space: nowrap;
    }
    .tab.active { background: var(--btn); color: var(--btn-text); }
    .tabs-loading { color: var(--hint); font-size: 13px; padding: 0 16px 14px; }

    /* 搜尋列 */
    .search-bar { display: flex; gap: 10px; padding: 0 16px 14px; }
    .search-bar input {
      flex: 1; padding: 12px 14px; border-radius: 12px;
      border: 1.5px solid var(--secondary-bg);
      background: var(--secondary-bg); color: var(--text);
      font-size: 15px; outline: none;
    }
    .search-bar input:focus { border-color: var(--btn); }
    .search-bar button {
      background: var(--btn); color: var(--btn-text);
      border: none; padding: 0 18px; border-radius: 12px;
      font-weight: bold; font-size: 15px; cursor: pointer;
    }

    /* 列表 */
    .pokemon-list { display: flex; flex-direction: column; gap: 8px; padding: 0 16px; }
    .pokemon-item {
      display: flex; align-items: center; gap: 10px;
      background: var(--secondary-bg); padding: 12px 14px;
      border-radius: 14px; font-size: 15px; font-weight: 500;
    }
    .pokemon-name { flex: 1; }
    .fav-badge {
      font-size: 11px; color: var(--star);
      background: rgba(255,214,10,0.15);
      padding: 2px 6px; border-radius: 6px; margin-left: 4px;
    }
    .star-btn {
      background: none; border: none; font-size: 22px;
      cursor: pointer; padding: 0 2px; line-height: 1;
      transition: transform 0.15s;
    }
    .star-btn:active { transform: scale(1.3); }
    .delete-btn {
      background: var(--danger); color: white; border: none;
      padding: 5px 11px; border-radius: 8px;
      font-weight: bold; font-size: 13px; cursor: pointer;
    }
    .empty-hint { text-align: center; color: var(--hint); padding: 30px 0; font-size: 14px; }

    /* Footer */
    .footer {
      position: fixed; bottom: 0; left: 0; right: 0;
      padding: 12px 16px 16px; background: var(--bg);
      box-shadow: 0 -1px 0 rgba(255,255,255,0.08);
    }
    .save-btn {
      background: var(--btn); color: var(--btn-text);
      border: none; padding: 15px; border-radius: 14px;
      font-size: 17px; font-weight: bold; width: 100%; cursor: pointer;
    }
    .save-btn:disabled { opacity: 0.5; }

    /* 改名 Modal */
    .modal-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.6); z-index: 100;
      align-items: center; justify-content: center;
    }
    .modal-overlay.show { display: flex; }
    .modal { background: var(--secondary-bg); border-radius: 16px; padding: 20px; width: 280px; }
    .modal h3 { margin-bottom: 12px; font-size: 16px; }
    .modal input {
      width: 100%; padding: 10px 12px; border-radius: 10px;
      border: 1.5px solid var(--btn); background: var(--bg);
      color: var(--text); font-size: 15px; margin-bottom: 14px;
    }
    .modal-btns { display: flex; gap: 10px; }
    .modal-btns button {
      flex: 1; padding: 10px; border-radius: 10px;
      border: none; font-weight: bold; cursor: pointer; font-size: 14px;
    }
    .btn-cancel { background: var(--bg); color: var(--hint); }
    .btn-ok { background: var(--btn); color: var(--btn-text); }
  </style>
</head>
<body>

<div class="header">
  <h2>🎒 我的對戰盒子</h2>
  <p id="user-info">連線中...</p>
</div>

<div class="accounts" id="accounts-container"></div>

<div id="tabs-wrapper">
  <div class="tabs-loading">載入當下聯盟...</div>
</div>

<div class="search-bar">
  <input type="text" id="poke-search" list="poke-options"
    placeholder="🔍 搜尋寶可夢..." autocomplete="off">
  <datalist id="poke-options"></datalist>
  <button onclick="addPokemon()">加入</button>
</div>

<div class="pokemon-list" id="current-list"></div>

<div class="footer">
  <button class="save-btn" id="save-btn" onclick="saveTeam()">💾 儲存並分析最佳隊伍</button>
</div>

<div class="modal-overlay" id="rename-modal">
  <div class="modal">
    <h3>帳號改名</h3>
    <input type="text" id="rename-input" maxlength="12" placeholder="輸入名稱（最多12字）">
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeRename()">取消</button>
      <button class="btn-ok" onclick="confirmRename()">確定</button>
    </div>
  </div>
</div>

<script>
  const tg = window.Telegram.WebApp;
  tg.expand(); tg.ready();

  const userId = tg.initDataUnsafe?.user?.id || "";
  if (tg.initDataUnsafe?.user) {
    document.getElementById('user-info').innerText = '訓練家：' + tg.initDataUnsafe.user.first_name;
  }

  // ── State ──
  let currentAcct = 0;
  let currentLeaguePath = "";
  let currentLeagueCommand = "";
  let renamingAcct = -1;

  let accountNames = ['帳號 A', '帳號 B', '帳號 C', '帳號 D'];
  let activeLeagues = []; // [{ name, path, command, cp }]

  // box[acct][leaguePath] = []
  // favs[acct][leaguePath] = Set
  let box  = [{},{},{},{}];
  let favs = [{},{},{},{}];

  // ── Init ──
  async function initData() {
    try {
      const [namesRes, leaguesRes, boxRes, acctNamesRes] = await Promise.all([
        fetch('/api/names?t=' + Date.now()),
        fetch('/api/active-leagues?t=' + Date.now()),
        userId ? fetch('/api/box?userId=' + userId + '&t=' + Date.now()) : Promise.resolve(null),
        userId ? fetch('/api/account-names?userId=' + userId) : Promise.resolve(null)
      ]);

      // autocomplete
      const names = await namesRes.json();
      const dl = document.getElementById('poke-options');
      names.forEach(n => { const o = document.createElement('option'); o.value = n; dl.appendChild(o); });

      // 帳號名稱
      if (acctNamesRes && acctNamesRes.ok) {
        const an = await acctNamesRes.json();
        if (Array.isArray(an) && an.length === 4) accountNames = an;
      }

      // 當下聯盟
      activeLeagues = await leaguesRes.json();

      // 盒子資料（keyed by leaguePath）
      if (boxRes && boxRes.ok) {
        const data = await boxRes.json();
        // data = { acct: { leaguePath: { box:[], favs:[] } } }
        for (let a = 0; a < 4; a++) {
          const acctData = data[a] || {};
          Object.keys(acctData).forEach(lp => {
            box[a][lp]  = acctData[lp].box  || [];
            favs[a][lp] = new Set(acctData[lp].favs || []);
          });
        }
      }

      renderAccounts();
      renderTabs();

      if (activeLeagues.length > 0) {
        switchLeague(activeLeagues[0].path, activeLeagues[0].command);
      } else {
        document.getElementById('current-list').innerHTML =
          '<div class="empty-hint">目前無進行中的聯盟</div>';
      }
    } catch (e) {
      document.getElementById('tabs-wrapper').innerHTML =
        '<div class="tabs-loading" style="color:red">載入失敗</div>';
    }
  }

  // ── Accounts ──
  function renderAccounts() {
    const c = document.getElementById('accounts-container');
    c.innerHTML = '';
    accountNames.forEach((name, i) => {
      const btn = document.createElement('div');
      btn.className = 'account-btn' + (i === currentAcct ? ' active' : '');
      btn.textContent = name;
      btn.onclick = () => switchAcct(i);
      let pressTimer;
      btn.addEventListener('touchstart', () => { pressTimer = setTimeout(() => openRename(i), 600); });
      btn.addEventListener('touchend', () => clearTimeout(pressTimer));
      btn.addEventListener('mousedown', () => { pressTimer = setTimeout(() => openRename(i), 600); });
      btn.addEventListener('mouseup', () => clearTimeout(pressTimer));
      c.appendChild(btn);
    });
  }

  function switchAcct(i) {
    currentAcct = i;
    renderAccounts();
    renderList();
  }

  // ── Rename ──
  function openRename(i) {
    renamingAcct = i;
    document.getElementById('rename-input').value = accountNames[i];
    document.getElementById('rename-modal').classList.add('show');
    tg.HapticFeedback.impactOccurred('medium');
  }
  function closeRename() { document.getElementById('rename-modal').classList.remove('show'); }
  async function confirmRename() {
    const val = document.getElementById('rename-input').value.trim();
    if (!val) return;
    accountNames[renamingAcct] = val;
    closeRename();
    renderAccounts();
    if (userId) {
      await fetch('/api/account-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, names: accountNames })
      });
    }
  }

  // ── League Tabs ──
  function renderTabs() {
    const wrapper = document.getElementById('tabs-wrapper');
    if (activeLeagues.length === 0) {
      wrapper.innerHTML = '<div class="tabs-loading">目前無進行中的聯盟</div>';
      return;
    }
    wrapper.innerHTML = '<div class="tabs" id="tabs-container"></div>';
    const container = document.getElementById('tabs-container');
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
    currentLeagueCommand = command;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const tab = document.getElementById('tab-' + command);
    if (tab) tab.classList.add('active');
    renderList();
  }

  // ── List ──
  function renderList() {
    const el = document.getElementById('current-list');
    el.innerHTML = '';
    if (!currentLeaguePath) return;
    const team = box[currentAcct][currentLeaguePath] || [];
    const starred = favs[currentAcct][currentLeaguePath] || new Set();

    if (team.length === 0) {
      el.innerHTML = '<div class="empty-hint">盒子空空的，搜一隻來加吧！</div>';
      return;
    }

    const sorted = [...team].sort((a, b) => (starred.has(a) ? 0 : 1) - (starred.has(b) ? 0 : 1));
    sorted.forEach(name => {
      const isFav = starred.has(name);
      const div = document.createElement('div');
      div.className = 'pokemon-item';
      div.innerHTML =
        \`<span class="pokemon-name">\${name}\${isFav ? '<span class="fav-badge">即戰力</span>' : ''}</span>\` +
        \`<button class="star-btn" onclick="toggleStar('\${name}')">\${isFav ? '⭐' : '☆'}</button>\` +
        \`<button class="delete-btn" onclick="removePokemon('\${name}')">移除</button>\`;
      el.appendChild(div);
    });
  }

  function addPokemon() {
    const input = document.getElementById('poke-search');
    const name = input.value.trim();
    if (!name || !currentLeaguePath) return;
    if (!box[currentAcct][currentLeaguePath]) box[currentAcct][currentLeaguePath] = [];
    if (!box[currentAcct][currentLeaguePath].includes(name)) {
      box[currentAcct][currentLeaguePath].push(name);
      tg.HapticFeedback.impactOccurred('light');
      renderList();
    }
    input.value = '';
  }

  function removePokemon(name) {
    box[currentAcct][currentLeaguePath] = (box[currentAcct][currentLeaguePath] || []).filter(p => p !== name);
    if (favs[currentAcct][currentLeaguePath]) favs[currentAcct][currentLeaguePath].delete(name);
    renderList();
  }

  function toggleStar(name) {
    if (!favs[currentAcct][currentLeaguePath]) favs[currentAcct][currentLeaguePath] = new Set();
    const s = favs[currentAcct][currentLeaguePath];
    if (s.has(name)) s.delete(name); else s.add(name);
    tg.HapticFeedback.impactOccurred('light');
    renderList();
  }

  // ── Save ──
  async function saveTeam() {
    if (!userId) { tg.showAlert('找不到使用者ID'); return; }
    if (!currentLeaguePath) { tg.showAlert('請先選擇聯盟'); return; }
    const btn = document.getElementById('save-btn');
    btn.disabled = true; btn.innerText = '儲存中...';
    try {
      // 整理當前帳號所有聯盟資料
      const allData = {};
      activeLeagues.forEach(l => {
        allData[l.path] = {
          box:  box[currentAcct][l.path]  || [],
          favs: Array.from(favs[currentAcct][l.path] || [])
        };
      });

      await fetch('/api/box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          acct: currentAcct,
          leaguePath: currentLeaguePath,
          allData
        })
      });

      tg.showAlert('✅ 已同步！請回聊天室查看分析結果！', () => { tg.close(); });
    } catch (e) {
      tg.showAlert('儲存失敗');
    } finally {
      btn.disabled = false;
      btn.innerText = '💾 儲存並分析最佳隊伍';
    }
  }

  initData();
</script>
</body>
</html>
`;
