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
      --card-bg: #2c2c2e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg); color: var(--text);
      padding-bottom: 100px;
    }

    /* ── Header ── */
    .header { text-align: center; padding: 20px 20px 10px; }
    .header h2 { font-size: 20px; margin-bottom: 4px; }
    .header p { color: var(--hint); font-size: 13px; }

    /* ── 帳號切換器 ── */
    .accounts {
      display: flex; gap: 8px; padding: 0 16px 16px;
      overflow-x: auto; scrollbar-width: none;
    }
    .accounts::-webkit-scrollbar { display: none; }
    .account-btn {
      flex-shrink: 0; padding: 6px 14px;
      border-radius: 20px; font-size: 13px; font-weight: 600;
      background: var(--secondary-bg); color: var(--hint);
      border: 2px solid transparent; cursor: pointer;
      transition: 0.2s; user-select: none;
    }
    .account-btn.active {
      background: var(--btn); color: var(--btn-text);
      border-color: var(--btn);
    }

    /* ── CP Tabs ── */
    .tabs {
      display: flex; gap: 6px; padding: 0 16px 14px;
    }
    .tab {
      flex: 1; text-align: center; padding: 9px 0;
      border-radius: 10px; font-weight: 700; font-size: 14px;
      background: var(--secondary-bg); color: var(--hint);
      cursor: pointer; transition: 0.2s;
    }
    .tab.active {
      background: var(--btn); color: var(--btn-text);
    }

    /* ── 搜尋列 ── */
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

    /* ── 寶可夢列表 ── */
    .pokemon-list { display: flex; flex-direction: column; gap: 8px; padding: 0 16px; }
    .pokemon-item {
      display: flex; align-items: center; gap: 10px;
      background: var(--card-bg); padding: 12px 14px;
      border-radius: 14px; font-size: 15px; font-weight: 500;
    }
    .pokemon-name { flex: 1; }
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
    .fav-badge {
      font-size: 11px; color: var(--star);
      background: rgba(255,214,10,0.15);
      padding: 2px 6px; border-radius: 6px;
    }

    .empty-hint {
      text-align: center; color: var(--hint);
      padding: 30px 0; font-size: 14px;
    }

    /* ── Footer ── */
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

    /* ── 改名 modal ── */
    .modal-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.6); z-index: 100;
      align-items: center; justify-content: center;
    }
    .modal-overlay.show { display: flex; }
    .modal {
      background: var(--secondary-bg); border-radius: 16px;
      padding: 20px; width: 280px;
    }
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

<!-- 帳號切換（長按改名） -->
<div class="accounts" id="accounts-container"></div>

<!-- CP Tabs（靜態，儲存用） -->
<div class="tabs">
  <div class="tab active" id="tab-1500" onclick="switchCp(1500)">1500</div>
  <div class="tab" id="tab-500" onclick="switchCp(500)">500</div>
  <div class="tab" id="tab-2500" onclick="switchCp(2500)">2500</div>
  <div class="tab" id="tab-10000" onclick="switchCp(10000)">大師</div>
</div>

<!-- 搜尋列 -->
<div class="search-bar">
  <input type="text" id="poke-search" list="poke-options"
    placeholder="🔍 搜尋寶可夢..." autocomplete="off">
  <datalist id="poke-options"></datalist>
  <button onclick="addPokemon()">加入</button>
</div>

<!-- 列表 -->
<div class="pokemon-list" id="current-list"></div>

<!-- Footer -->
<div class="footer">
  <button class="save-btn" id="save-btn" onclick="saveTeam()">
    💾 儲存並分析最佳隊伍
  </button>
</div>

<!-- 改名 Modal -->
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
    document.getElementById('user-info').innerText =
      '訓練家：' + tg.initDataUnsafe.user.first_name;
  }

  // ── State ──
  let currentAcct = 0;   // 0~3
  let currentCp   = 1500;
  let renamingAcct = -1;

  // accountNames[i] = 帳號名稱
  let accountNames = ['帳號 A', '帳號 B', '帳號 C', '帳號 D'];

  // box[acct][cp] = [pokemonName, ...]
  // favs[acct][cp] = Set of favourited names
  let box  = [ {500:[],1500:[],2500:[],10000:[]}, {500:[],1500:[],2500:[],10000:[]},
               {500:[],1500:[],2500:[],10000:[]}, {500:[],1500:[],2500:[],10000:[]} ];
  let favs = [ {500:new Set(),1500:new Set(),2500:new Set(),10000:new Set()},
               {500:new Set(),1500:new Set(),2500:new Set(),10000:new Set()},
               {500:new Set(),1500:new Set(),2500:new Set(),10000:new Set()},
               {500:new Set(),1500:new Set(),2500:new Set(),10000:new Set()} ];

  // ── Init ──
  async function initData() {
    try {
      const [namesRes, boxRes, acctNamesRes] = await Promise.all([
        fetch('/api/names?t=' + Date.now()),
        userId ? fetch('/api/box?userId=' + userId + '&t=' + Date.now()) : Promise.resolve(null),
        userId ? fetch('/api/account-names?userId=' + userId) : Promise.resolve(null)
      ]);

      // autocomplete
      const names = await namesRes.json();
      const dl = document.getElementById('poke-options');
      names.forEach(n => {
        const o = document.createElement('option'); o.value = n; dl.appendChild(o);
      });

      // account names
      if (acctNamesRes && acctNamesRes.ok) {
        const an = await acctNamesRes.json();
        if (Array.isArray(an) && an.length === 4) accountNames = an;
      }

      // box data
      if (boxRes && boxRes.ok) {
        const data = await boxRes.json();
        // data = { acct: { cp: { box:[], favs:[] } } }
        for (let a = 0; a < 4; a++) {
          const acctData = data[a] || {};
          [500,1500,2500,10000].forEach(cp => {
            const cpData = acctData[cp] || {};
            box[a][cp]  = cpData.box  || [];
            favs[a][cp] = new Set(cpData.favs || []);
          });
        }
      }

      renderAccounts();
      renderList();
    } catch (e) {
      document.getElementById('current-list').innerHTML =
        '<div class="empty-hint" style="color:red">載入失敗</div>';
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

      // 長按改名
      let pressTimer;
      btn.addEventListener('touchstart', () => {
        pressTimer = setTimeout(() => openRename(i), 600);
      });
      btn.addEventListener('touchend', () => clearTimeout(pressTimer));
      btn.addEventListener('mousedown', () => {
        pressTimer = setTimeout(() => openRename(i), 600);
      });
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
  function closeRename() {
    document.getElementById('rename-modal').classList.remove('show');
  }
  async function confirmRename() {
    const val = document.getElementById('rename-input').value.trim();
    if (!val) return;
    accountNames[renamingAcct] = val;
    closeRename();
    renderAccounts();
    // 儲存帳號名稱
    if (userId) {
      await fetch('/api/account-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, names: accountNames })
      });
    }
  }

  // ── CP Tabs ──
  function switchCp(cp) {
    currentCp = cp;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + cp).classList.add('active');
    renderList();
  }

  // ── List ──
  function renderList() {
    const el = document.getElementById('current-list');
    el.innerHTML = '';
    const team = box[currentAcct][currentCp] || [];
    const starred = favs[currentAcct][currentCp];

    if (team.length === 0) {
      el.innerHTML = '<div class="empty-hint">盒子空空的，搜一隻來加吧！</div>';
      return;
    }

    // 已練完的排前面
    const sorted = [...team].sort((a, b) => {
      const aS = starred.has(a) ? 0 : 1;
      const bS = starred.has(b) ? 0 : 1;
      return aS - bS;
    });

    sorted.forEach(name => {
      const isFav = starred.has(name);
      const div = document.createElement('div');
      div.className = 'pokemon-item';
      div.innerHTML =
        \`<span class="pokemon-name">\${name}\${isFav ? ' <span class="fav-badge">即戰力</span>' : ''}</span>\` +
        \`<button class="star-btn" onclick="toggleStar('\${name}')">\${isFav ? '⭐' : '☆'}</button>\` +
        \`<button class="delete-btn" onclick="removePokemon('\${name}')">移除</button>\`;
      el.appendChild(div);
    });
  }

  // ── Add / Remove / Star ──
  function addPokemon() {
    const input = document.getElementById('poke-search');
    const name = input.value.trim();
    if (!name) return;
    if (!box[currentAcct][currentCp].includes(name)) {
      box[currentAcct][currentCp].push(name);
      tg.HapticFeedback.impactOccurred('light');
      renderList();
    }
    input.value = '';
  }

  function removePokemon(name) {
    box[currentAcct][currentCp] = box[currentAcct][currentCp].filter(p => p !== name);
    favs[currentAcct][currentCp].delete(name);
    renderList();
  }

  function toggleStar(name) {
    const s = favs[currentAcct][currentCp];
    if (s.has(name)) s.delete(name);
    else s.add(name);
    tg.HapticFeedback.impactOccurred('light');
    renderList();
  }

  // ── Save ──
  async function saveTeam() {
    if (!userId) { tg.showAlert('找不到使用者ID'); return; }
    const btn = document.getElementById('save-btn');
    btn.disabled = true; btn.innerText = '儲存中...';

    try {
      // 整理當前帳號所有 CP 資料
      const payload = {
        userId,
        acct: currentAcct,
        cp: currentCp,
        allData: {}
      };
      [500,1500,2500,10000].forEach(cp => {
        payload.allData[cp] = {
          box:  box[currentAcct][cp] || [],
          favs: Array.from(favs[currentAcct][cp] || [])
        };
      });

      await fetch('/api/box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
