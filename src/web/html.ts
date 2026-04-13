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
      --star-on: #ffd60a;
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
      user-select: none;
    }
    .account-btn.active { background: var(--btn); color: var(--btn-text); }

    /* 動態聯盟 Tabs（顯示用，同CP共用盒子） */
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

    /* CP 同步提示 */
    .cp-hint {
      margin: 0 16px 12px; padding: 8px 12px;
      background: rgba(124,107,255,0.12); border-radius: 10px;
      font-size: 12px; color: var(--hint); display: none;
    }
    .cp-hint.show { display: block; }

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

    /* 🔥 批量匯入區塊 UI */
    .import-container { padding: 0 16px 14px; }
    .toggle-import-btn {
      width: 100%; padding: 10px; border-radius: 12px;
      background: rgba(124,107,255,0.1); color: #a59fff;
      border: 1px dashed #7c6bff; font-weight: bold; cursor: pointer;
      font-size: 14px; transition: 0.2s;
    }
    .import-area {
      display: none; margin-top: 10px; padding: 12px;
      background: var(--secondary-bg); border-radius: 12px;
    }
    .import-area label { display: block; font-size: 12px; color: var(--hint); margin-bottom: 8px; }
    .import-area textarea {
      width: 100%; padding: 10px; border-radius: 8px;
      border: 1px solid #444; background: var(--bg);
      color: var(--text); font-size: 14px; margin-bottom: 10px; resize: vertical;
    }
    .import-actions { display: flex; gap: 10px; }
    .import-actions button {
      flex: 1; padding: 10px; border-radius: 8px; border: none;
      font-weight: bold; cursor: pointer; font-size: 14px; color: white;
    }
    .btn-preview { background: #4a4a4c; }
    .btn-confirm { background: var(--btn); }
    .btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
    .import-preview {
      margin-top: 12px; font-size: 13px; max-height: 200px; overflow-y: auto;
      background: var(--bg); border-radius: 8px; padding: 8px; display: none;
    }
    .preview-item { margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #333; line-height: 1.4; }
    .preview-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
    .text-success { color: #32d74b; }
    .text-warning { color: #ffd60a; }
    .text-danger { color: #ff453a; }
    .badge { background: #0a84ff; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px; }

    /* 列表 section */
    .section-title {
      padding: 0 16px 8px; font-size: 12px; font-weight: 700;
      color: var(--hint); text-transform: uppercase; letter-spacing: 0.5px;
    }
    .pokemon-list { display: flex; flex-direction: column; gap: 8px; padding: 0 16px; margin-bottom: 14px; }
    .pokemon-item {
      display: flex; align-items: center; gap: 10px;
      background: var(--secondary-bg); padding: 12px 14px;
      border-radius: 14px; font-size: 15px; font-weight: 500;
    }
    .pokemon-name { flex: 1; }
    .star-btn {
      background: none; border: none; font-size: 20px;
      cursor: pointer; padding: 0 4px; line-height: 1;
      transition: transform 0.15s; flex-shrink: 0;
      color: rgba(255, 255, 255, 0.6);  
    }
    .star-btn:active { transform: scale(1.35); }
    .delete-btn {
      background: var(--danger); color: white; border: none;
      padding: 5px 11px; border-radius: 8px;
      font-weight: bold; font-size: 13px; cursor: pointer; flex-shrink: 0;
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

<div class="cp-hint" id="cp-hint"></div>

<div class="search-bar">
  <input type="text" id="poke-search" list="poke-options"
    placeholder="🔍 搜尋單一寶可夢..." autocomplete="off">
  <datalist id="poke-options"></datalist>
  <button onclick="addPokemon()">加入</button>
</div>

<div class="import-container">
  <button class="toggle-import-btn" id="toggleImportBtn" onclick="toggleImportArea()">✨ 智慧批量匯入 (支援貼上與簡稱)</button>
  <div id="importArea" class="import-area">
    <label>💡 直接從排行複製貼上，或輸入簡稱 (如「暗影拉達」、「雷雲」)。支援逗號或換行分隔。</label>
    <textarea id="importTextarea" rows="4" placeholder="例如：\\n胖嘟嘟\\n暗影拉達\\n雷雲\\n大劍鬼&!我的最愛"></textarea>
    <div class="import-actions">
      <button class="btn-preview" onclick="previewImport()">🔍 智慧解析</button>
      <button class="btn-confirm" id="confirmImportBtn" onclick="executeImport()" disabled>✅ 批次加入</button>
    </div>
    <div id="importPreview" class="import-preview"></div>
  </div>
</div>

<div id="list-wrapper"></div>

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
  let currentLeague = null;  // { name, path, command, cp }
  let activeLeagues = [];
  let renamingAcct = -1;

  let accountNames = ['帳號 A', '帳號 B', '帳號 C', '帳號 D'];

  // box[acct][cp]  = ['七夕青鳥', '土王', ...]
  // favs[acct][cp] = Set of names (即戰力)
  let box  = [{},{},{},{}];
  let favs = [{},{},{},{}];

  // 🔥 匯入專用狀態
  let availableNames = [];
  let pendingImportList = [];

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
      availableNames = names; // 儲存供模糊比對使用
      const dl = document.getElementById('poke-options');
      names.forEach(n => { const o = document.createElement('option'); o.value = n; dl.appendChild(o); });

      // 帳號名稱
      if (acctNamesRes && acctNamesRes.ok) {
        const an = await acctNamesRes.json();
        if (Array.isArray(an) && an.length === 4) accountNames = an;
      }

      // 當下聯盟
      activeLeagues = await leaguesRes.json();

      // 盒子資料：{ acct: { cp: { box:[], favs:[] } } }
      if (boxRes && boxRes.ok) {
        const data = await boxRes.json();
        for (let a = 0; a < 4; a++) {
          const acctData = data[a] || {};
          Object.keys(acctData).forEach(cp => {
            box[a][cp]  = acctData[cp].box  || [];
            favs[a][cp] = new Set(acctData[cp].favs || []);
          });
        }
      }

      renderAccounts();
      renderTabs();

      if (activeLeagues.length > 0) {
        switchLeague(activeLeagues[0]);
      } else {
        document.getElementById('list-wrapper').innerHTML =
          '<div class="empty-hint">目前無進行中的聯盟</div>';
      }
    } catch (e) {
      document.getElementById('tabs-wrapper').innerHTML =
        '<div class="tabs-loading" style="color:red">載入失敗: ' + e.message + '</div>';
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
      btn.addEventListener('touchstart', () => { pressTimer = setTimeout(() => openRename(i), 600); }, { passive: true });
      btn.addEventListener('touchend', () => clearTimeout(pressTimer), { passive: true });
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
      div.onclick = () => switchLeague(league);
      container.appendChild(div);
    });
  }

  function switchLeague(league) {
    currentLeague = league;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const tab = document.getElementById('tab-' + league.command);
    if (tab) tab.classList.add('active');

    // 同 CP 提示
    const sameCpLeagues = activeLeagues.filter(l => l.cp === league.cp && l.command !== league.command);
    const hint = document.getElementById('cp-hint');
    if (sameCpLeagues.length > 0) {
      hint.textContent = '💡 同為 CP' + league.cp + '，與「' + sameCpLeagues.map(l => l.name).join('、') + '」共用同一個盒子';
      hint.classList.add('show');
    } else {
      hint.classList.remove('show');
    }

    renderList();
  }

  function currentCp() { return currentLeague ? String(currentLeague.cp) : null; }

  // ── 🔥 智慧批量匯入邏輯 ──
  function toggleImportArea() {
    const area = document.getElementById('importArea');
    const isHidden = area.style.display === 'none' || area.style.display === '';
    area.style.display = isHidden ? 'block' : 'none';
    if (!isHidden) {
      document.getElementById('importTextarea').value = '';
      document.getElementById('importPreview').style.display = 'none';
      document.getElementById('confirmImportBtn').disabled = true;
      pendingImportList = [];
    }
  }

  function isSubsequence(shortStr, longStr) {
    let i = 0, j = 0;
    while (i < shortStr.length && j < longStr.length) {
      if (shortStr[i] === longStr[j]) i++;
      j++;
    }
    return i === shortStr.length;
  }

  function findBestMatch(input) {
    if (availableNames.includes(input)) return { status: 'exact', name: input };

    let normalizedInput = input.replace(/暗影/g, '(暗影)')
                               .replace(/阿羅拉/g, '(阿羅拉)')
                               .replace(/伽勒爾/g, '(伽勒爾)')
                               .replace(/洗翠/g, '(洗翠)')
                               .replace(/mega/gi, '(Mega)');
    
    const candidates = availableNames.filter(name => {
       const cleanName = name.replace(/[()]/g, '');
       const cleanInput = input.replace(/[()]/g, '');
       return name.includes(input) || 
              cleanName.includes(cleanInput) || 
              name.includes(normalizedInput) ||
              isSubsequence(cleanInput, cleanName);
    });

    if (candidates.length === 1) return { status: 'fuzzy', name: candidates[0] };
    if (candidates.length > 1) {
      const exactBase = candidates.find(c => c === input || c.replace(/[()]/g, '') === input.replace(/[()]/g, ''));
      if (exactBase) return { status: 'fuzzy', name: exactBase };
      return { status: 'multiple', candidates: candidates.slice(0, 3) };
    }
    return { status: 'not_found' };
  }

  function previewImport() {
    const text = document.getElementById('importTextarea').value;
    if (!text.trim()) return;
    const cp = currentCp();
    if (!cp) { tg.showAlert('請先選擇聯盟'); return; }

    const rawNames = text.split(/,|，|\\n|\\t/).map(n => n.split('&')[0].trim()).filter(n => n);
    
    pendingImportList = [];
    let previewHTML = '';
    const currentBox = box[currentAcct][cp] || [];

    rawNames.forEach(inputName => {
      const match = findBestMatch(inputName);
      if (match.status === 'exact' || match.status === 'fuzzy') {
         if (currentBox.includes(match.name) || pendingImportList.includes(match.name)) {
           previewHTML += '<div class="preview-item text-warning"><del>' + inputName + '</del> ➡️ ' + match.name + ' (已存在)</div>';
         } else {
           pendingImportList.push(match.name);
           const badge = match.status === 'fuzzy' ? '<span class="badge">縮寫/型態修正</span>' : '';
           previewHTML += '<div class="preview-item text-success">✔️ ' + inputName + ' ➡️ <b>' + match.name + '</b> ' + badge + '</div>';
         }
      } else if (match.status === 'multiple') {
         previewHTML += '<div class="preview-item text-danger">❌ ' + inputName + ' ➡️ 找到多個 (' + match.candidates.join(', ') + ')，請補詳細</div>';
      } else {
         previewHTML += '<div class="preview-item text-danger">❌ ' + inputName + ' ➡️ 查無此寶可夢</div>';
      }
    });

    const previewDiv = document.getElementById('importPreview');
    previewDiv.innerHTML = previewHTML;
    previewDiv.style.display = 'block';
    document.getElementById('confirmImportBtn').disabled = pendingImportList.length === 0;
  }

  function executeImport() {
    if (pendingImportList.length === 0) return;
    const cp = currentCp();
    if (!cp) return;
    
    if (!box[currentAcct][cp]) box[currentAcct][cp] = [];
    
    let added = 0;
    pendingImportList.forEach(name => {
      if (!box[currentAcct][cp].includes(name)) {
        box[currentAcct][cp].push(name);
        added++;
      }
    });
    
    renderList();
    tg.HapticFeedback.impactOccurred('medium');
    toggleImportArea();
    tg.showAlert('✅ 成功批次加入 ' + added + ' 隻寶可夢！');
  }

  // ── List ──
  function renderList() {
    const wrapper = document.getElementById('list-wrapper');
    wrapper.innerHTML = '';
    const cp = currentCp();
    if (!cp) return;

    const team = box[currentAcct][cp] || [];
    const starred = favs[currentAcct][cp] || new Set();

    if (team.length === 0) {
      wrapper.innerHTML = '<div class="empty-hint">盒子空空的，搜一隻或批次匯入來加吧！</div>';
      return;
    }

    const favList  = team.filter(n => starred.has(n));
    const restList = team.filter(n => !starred.has(n));

    // ⭐ 即戰力區
    if (favList.length > 0) {
      const titleEl = document.createElement('div');
      titleEl.className = 'section-title';
      titleEl.textContent = '⭐ 即戰力';
      wrapper.appendChild(titleEl);
      const listEl = document.createElement('div');
      listEl.className = 'pokemon-list';
      favList.forEach(name => listEl.appendChild(makeItem(name, true)));
      wrapper.appendChild(listEl);
    }

    // 其餘
    if (restList.length > 0) {
      const titleEl = document.createElement('div');
      titleEl.className = 'section-title';
      titleEl.textContent = favList.length > 0 ? '📋 其他寶可夢' : '📋 寶可夢列表';
      wrapper.appendChild(titleEl);
      const listEl = document.createElement('div');
      listEl.className = 'pokemon-list';
      restList.forEach(name => listEl.appendChild(makeItem(name, false)));
      wrapper.appendChild(listEl);
    }
  }

  function makeItem(name, isFav) {
    const div = document.createElement('div');
    div.className = 'pokemon-item';
    div.innerHTML =
      \`<span class="pokemon-name">\${name}</span>\` +
      \`<button class="star-btn" onclick="toggleStar('\${name}')" title="\${isFav ? '取消即戰力' : '標記即戰力'}">\${isFav ? '⭐' : '☆'}</button>\` +
      \`<button class="delete-btn" onclick="removePokemon('\${name}')">移除</button>\`;
    return div;
  }

  // ── Add / Remove / Star ──
  function addPokemon() {
    const input = document.getElementById('poke-search');
    const name = input.value.trim();
    const cp = currentCp();
    if (!name || !cp) return;
    if (!box[currentAcct][cp]) box[currentAcct][cp] = [];
    
    // 也能讓單一輸入框受惠於模糊匹配
    const match = findBestMatch(name);
    const finalName = (match.status === 'exact' || match.status === 'fuzzy') ? match.name : name;

    if (!box[currentAcct][cp].includes(finalName)) {
      box[currentAcct][cp].push(finalName);
      tg.HapticFeedback.impactOccurred('light');
      renderList();
    }
    input.value = '';
  }

  function removePokemon(name) {
    const cp = currentCp();
    if (!cp) return;
    box[currentAcct][cp] = (box[currentAcct][cp] || []).filter(p => p !== name);
    if (favs[currentAcct][cp]) favs[currentAcct][cp].delete(name);
    renderList();
  }

  function toggleStar(name) {
    const cp = currentCp();
    if (!cp) return;
    if (!favs[currentAcct][cp]) favs[currentAcct][cp] = new Set();
    const s = favs[currentAcct][cp];
    if (s.has(name)) s.delete(name); else s.add(name);
    tg.HapticFeedback.impactOccurred('light');
    renderList();
  }

  // ── Save ──
  async function saveTeam() {
    if (!userId) { tg.showAlert('找不到使用者ID'); return; }
    if (!currentLeague) { tg.showAlert('請先選擇聯盟'); return; }
    const btn = document.getElementById('save-btn');
    btn.disabled = true; btn.innerText = '儲存中...';
    try {
      // 整理所有 CP 資料（用 CP 為 key）
      const allData = {};
      const seenCps = new Set();
      activeLeagues.forEach(l => {
        const cp = String(l.cp);
        if (!seenCps.has(cp)) {
          seenCps.add(cp);
          allData[cp] = {
            box:  box[currentAcct][cp]  || [],
            favs: Array.from(favs[currentAcct][cp] || [])
          };
        }
      });

      await fetch('/api/box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          acct: currentAcct,
          leaguePath: currentLeague.path,  // 分析用的聯盟
          cp: String(currentLeague.cp),    // 儲存用的 CP key
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
