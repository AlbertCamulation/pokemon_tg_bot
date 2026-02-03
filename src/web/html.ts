// =========================================================
//  Web 介面 HTML 生成 (Web Interface HTML Generator)
// =========================================================

/**
 * 生成 Web 介面 HTML
 */
export function generateHTML(): string {
  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PokeMaster PRO | 戰術評價系統</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;900&family=Noto+Sans+TC:wght@400;700;900&display=swap');
        body { font-family: 'Noto Sans TC', sans-serif; background: #000; color: #eee; }
        .tech-font { font-family: 'Orbitron', sans-serif; }
        .neon-border { border: 1px solid rgba(255, 0, 0, 0.4); box-shadow: 0 0 20px rgba(255, 0, 0, 0.15); }
        .neon-text-red { color: #ff0000; text-shadow: 0 0 12px rgba(255, 0, 0, 0.6); }
        .btn-red { background: #b90000; box-shadow: 0 0 20px rgba(185, 0, 0, 0.4); transition: 0.3s; }
        .btn-red:hover { background: #ff0000; box-shadow: 0 0 30px rgba(255, 0, 0, 0.7); }
        .card-dark { background: #0a0a0a; border: 1px solid #1a1a1a; border-top: 4px solid #ff0000; }
        .type-badge { padding: 2px 8px; border-radius: 4px; color: white; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .type-fire { background: #c0392b; } .type-water { background: #2980b9; } .type-grass { background: #27ae60; }
        .type-electric { background: #f1c40f; color: #000; } .type-ice { background: #3498db; } .type-fighting { background: #962d22; }
        .type-poison { background: #8e44ad; } .type-ground { background: #d35400; } .type-flying { background: #5d6d7e; }
        .type-psychic { background: #e91e63; } .type-bug { background: #689f38; } .type-rock { background: #795548; }
        .type-ghost { background: #3f51b5; } .type-dragon { background: #673ab7; } .type-dark { background: #212121; }
        .type-steel { background: #607d8b; } .type-fairy { background: #d81b60; } .type-normal { background: #757575; }
        .league-chip.active { background: #ff0000; color: white; border-color: #ff0000; }
        .trash-text { background: linear-gradient(to bottom, #ff0000, #660000); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 10px rgba(255,0,0,0.5)); }

        #suggestionList {
            position: absolute; width: 100%; top: 100%; left: 0; z-index: 999;
            background: rgba(15, 15, 15, 0.98); border: 1px solid #ff0000;
            border-top: none; border-radius: 0 0 1.5rem 1.5rem;
            max-height: 250px; overflow-y: auto; display: none;
            box-shadow: 0 15px 40px rgba(0,0,0,0.8);
        }
        .suggestion-item { padding: 12px 20px; cursor: pointer; border-bottom: 1px solid #222; font-weight: bold; }
        .suggestion-item:hover { background: #300000; color: #ff0000; }
        .suggestion-item:last-child { border-bottom: none; border-radius: 0 0 1.5rem 1.5rem; }
    </style>
</head>
<body>
    <div class="max-w-6xl mx-auto p-4 md:p-8">
        <div class="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 btn-red rounded-2xl flex items-center justify-center text-3xl"><i class="fa-solid fa-bolt"></i></div>
                <div>
                    <h1 class="text-4xl font-black tracking-tighter tech-font uppercase">PokeMaster <span class="neon-text-red">PRO</span></h1>
                    <p class="text-[10px] tech-font text-zinc-600 tracking-[0.3em]">TACTICAL ANALYSIS TERMINAL</p>
                </div>
            </div>
            <button onclick="toggleSettings()" class="bg-zinc-950 border border-red-900/50 px-6 py-3 rounded-full text-xs font-black tech-font hover:bg-red-950 transition">
                <i class="fa-solid fa-gear mr-2"></i> LEAGUE_CONFIG
            </button>
        </div>

        <div class="relative mb-16 z-[1000]">
            <div class="absolute inset-0 bg-red-600 blur-3xl opacity-5"></div>
            <div class="relative bg-zinc-950 p-2 rounded-3xl flex neon-border">
                <input type="text" id="searchInput" placeholder="輸入搜尋目標名稱 (例: 瑪力露麗)..." autocomplete="off"
                       class="flex-1 bg-transparent p-5 text-2xl focus:outline-none font-bold text-red-500 placeholder:text-zinc-800">
                <button onclick="performSearch()" class="btn-red text-white px-12 rounded-2xl font-black uppercase tech-font">SCAN</button>
                <div id="suggestionList"></div>
            </div>
        </div>

        <div id="infoSection" class="hidden mb-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 bg-zinc-950/50 p-10 rounded-[3rem] border border-zinc-900 shadow-inner">
                <h2 class="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.4em] mb-8">Evolution Sequence</h2>
                <div id="evolutionChain" class="flex flex-wrap justify-center items-center gap-8"></div>
            </div>
            <div class="bg-zinc-900/80 p-8 rounded-[3rem] border border-red-950/50 shadow-2xl">
                <h2 class="text-[10px] font-bold text-red-500 uppercase tracking-[0.4em] mb-6">Tactical HUD</h2>
                <div id="attributeHUD" class="space-y-6"></div>
            </div>
        </div>

        <div id="eventBanner" class="hidden mb-12 border-l-8 border-red-600 bg-red-950/30 p-8 rounded-3xl text-red-200"></div>
        <div id="results" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"></div>
    </div>

    <script>
        let allLeagues = [];
        let typeChart = {};
        let allPokemonNames = [];
        let selectedLeagues = JSON.parse(localStorage.getItem('fav_leagues')) || ['great_league_top', 'ultra_league_top', 'master_league_top'];

        const typeNames = { normal: "一般", fire: "火", water: "水", electric: "電", grass: "草", ice: "冰", fighting: "格鬥", poison: "毒", ground: "地面", flying: "飛行", psychic: "超能", bug: "蟲", rock: "岩石", ghost: "幽靈", dragon: "龍", dark: "惡", steel: "鋼", fairy: "妖精" };

        window.onload = async () => {
            try {
                const initRes = await fetch('/api/search?q=piplup');
                const initData = await initRes.json();
                allLeagues = initData.allLeagues || [];
                typeChart = initData.typeChart || {};
                renderLeaguePicker();

                const namesRes = await fetch('/api/names');
                allPokemonNames = await namesRes.json();

                setupAutocomplete();
            } catch(e) { console.error("Initialization Failed", e); }
        };

        function setupAutocomplete() {
            const input = document.getElementById('searchInput');
            const list = document.getElementById('suggestionList');

            input.addEventListener('input', () => {
                const val = input.value.trim();
                list.innerHTML = '';
                if (!val) { list.style.display = 'none'; return; }

                const matches = allPokemonNames.filter(n => n.includes(val)).slice(0, 10);
                if (matches.length > 0) {
                    list.innerHTML = matches.map(n => \`
                        <div class="suggestion-item" onclick="selectSuggestion('\${n}')">
                            <i class="fa-solid fa-bullseye mr-2 opacity-30 text-xs"></i>\${n}
                        </div>
                    \`).join('');
                    list.style.display = 'block';
                } else { list.style.display = 'none'; }
            });

            document.addEventListener('click', (e) => { if (e.target !== input) list.style.display = 'none'; });
        }

        function selectSuggestion(name) {
            document.getElementById('searchInput').value = name;
            document.getElementById('suggestionList').style.display = 'none';
            performSearch();
        }

        function toggleSettings() { document.getElementById('settingsModal').classList.toggle('hidden'); }
        function renderLeaguePicker() {
            const picker = document.getElementById('leaguePicker');
            if(!picker) return;
            picker.innerHTML = allLeagues.map(l => \`
                <button onclick="toggleLeague('\${l.id}')" class="league-chip px-6 py-3 rounded-2xl border border-zinc-800 text-xs font-black uppercase transition \${selectedLeagues.includes(l.id) ? 'active' : ''}">\${l.name}</button>
            \`).join('');
        }
        function toggleLeague(id) {
            selectedLeagues = selectedLeagues.includes(id) ? selectedLeagues.filter(i => i !== id) : [...selectedLeagues, id];
            localStorage.setItem('fav_leagues', JSON.stringify(selectedLeagues));
            renderLeaguePicker(); performSearch();
        }

        function getTypeBadges(types) {
            return (types || []).filter(t => t && t.toLowerCase() !== 'none')
                .map(t => \`<span class="type-badge type-\${t.toLowerCase()}">\${typeNames[t.toLowerCase()] || t}</span>\`).join('');
        }

        function calculateEffectiveness(types) {
            const results = {};
            Object.keys(typeNames).forEach(t => results[t] = 1);
            (types || []).filter(t => t && t.toLowerCase() !== 'none').forEach(type => {
                const lower = type.toLowerCase();
                Object.keys(typeChart).forEach(attacker => {
                    if (typeChart[attacker] && typeChart[attacker][lower]) results[attacker] *= typeChart[attacker][lower];
                });
            });
            return results;
        }

        function updateHUD(name, types) {
            const eff = calculateEffectiveness(types);
            const weaknesses = Object.entries(eff).filter(([t, v]) => v > 1).sort((a,b) => b[1]-a[1]);
            const resists = Object.entries(eff).filter(([t, v]) => v < 1).sort((a,b) => a[1]-b[1]);
            document.getElementById('attributeHUD').innerHTML = \`
                <div class="text-white font-black text-xl border-b border-red-600 pb-3 mb-4 tech-font uppercase">\${name}</div>
                <div class="space-y-5">
                    <div>
                        <div class="text-[10px] font-black text-red-500 uppercase mb-2 tracking-[0.2em]">Weakness Logic</div>
                        <div class="flex flex-wrap gap-2">\${weaknesses.map(([t, v]) => \`<span class="text-[11px] bg-red-950/40 px-2 py-1 rounded border border-red-600/30 text-white font-bold">\${typeNames[t]} <span class="text-red-500 ml-1">x\${v.toFixed(1)}</span></span>\`).join('')}</div>
                    </div>
                    <div>
                        <div class="text-[10px] font-black text-green-500 uppercase mb-2 tracking-[0.2em]">Resist Data</div>
                        <div class="flex flex-wrap gap-2">\${resists.map(([t, v]) => \`<span class="text-[11px] bg-green-950/20 px-2 py-1 rounded border border-green-600/30 text-white font-bold">\${typeNames[t]} <span class="text-green-500 ml-1">x\${v.toFixed(1)}</span></span>\`).join('')}</div>
                    </div>
                </div>\`;
        }

        async function performSearch() {
            const query = document.getElementById('searchInput').value.trim();
            if (!query) return;
            const resultsDiv = document.getElementById('results');
            const infoSection = document.getElementById('infoSection');
            const eventBanner = document.getElementById('eventBanner');
            infoSection.classList.add('hidden');
            eventBanner.classList.add('hidden');
            resultsDiv.innerHTML = '<div class="col-span-full text-center py-40 text-red-600"><i class="fa-solid fa-dna fa-spin text-7xl"></i><p class="mt-6 tech-font uppercase tracking-[0.5em] animate-pulse">Scanning Bio-Database...</p></div>';

            try {
                const res = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`);
                const data = await res.json();

                if (!data.results || data.results.length === 0) {
                    resultsDiv.innerHTML = \`
                        <div class="col-span-full text-center py-20 px-10">
                            <i class="fa-solid fa-trash-can text-red-900 text-8xl mb-8 opacity-40"></i>
                            <h2 class="text-4xl font-black trash-text uppercase mb-4">評價等級：垃圾</h2>
                            <div class="inline-block bg-red-950/30 border border-red-900 p-6 rounded-3xl text-zinc-400">查無各大聯盟排名數據。建議直接轉送或作為收藏。</div>
                        </div>\`;
                    return;
                }

                infoSection.classList.remove('hidden');
                document.getElementById('evolutionChain').innerHTML = data.evolutionChain.map((p, idx) => \`
                    <div class="flex items-center">
                        <div onmouseenter="updateHUD('\${p.name}', \${JSON.stringify(p.types)})"
                             class="bg-zinc-950 p-6 rounded-[2.5rem] border border-zinc-900 hover:border-red-600 hover:scale-110 transition-all cursor-pointer min-w-[130px] text-center shadow-2xl relative group">
                            <div class="font-black text-white text-base mb-3 group-hover:neon-text-red transition-colors">\${p.name}</div>
                            <div class="flex gap-1.5 justify-center">\${getTypeBadges(p.types)}</div>
                        </div>
                        \${idx < data.evolutionChain.length - 1 ? '<i class="fa-solid fa-chevron-right mx-6 text-red-600 opacity-20 text-xl"></i>' : ''}
                    </div>\`).join('');

                const lastPoke = data.evolutionChain[data.evolutionChain.length - 1];
                updateHUD(lastPoke.name, lastPoke.types);

                if (data.events && data.events.length > 0) {
                    eventBanner.innerHTML = data.events.map(e => \`<div class="flex items-center gap-4 text-red-200 font-black">EVENT: \${e.eventName} [\${e.date}]</div>\`).join('');
                    eventBanner.classList.remove('hidden');
                }

                const filtered = data.results.filter(r => selectedLeagues.includes(r.leagueId));
                const others = data.results.filter(r => !selectedLeagues.includes(r.leagueId));

                const renderCard = (league) => \`
                    <div class="card-dark rounded-[3rem] overflow-hidden shadow-2xl border border-zinc-900">
                        <div class="p-10 bg-zinc-950/80 border-b border-zinc-900">
                            <h3 class="text-2xl font-black text-white tech-font uppercase tracking-tighter mb-2">\${league.leagueName}</h3>
                            <div class="flex items-center gap-3"><span class="w-12 h-1 bg-red-600"></span><span class="text-[9px] text-zinc-500 tech-font tracking-widest uppercase">Target Stream Analysis</span></div>
                        </div>
                        <div class="p-8 space-y-5">
                            \${league.pokemons.map(p => \`
                                <div class="p-6 rounded-[2rem] bg-zinc-900/40 border border-zinc-800/40 group hover:bg-zinc-900/70 transition-colors">
                                    <div class="flex justify-between items-start mb-4">
                                        <div><span class="text-[10px] font-black text-red-500 tech-font opacity-60 block">R-INDEX #\${p.rank}</span>
                                        <div class="text-2xl font-black text-zinc-100 group-hover:text-white">\${p.name}</div></div>
                                        <div class="text-right"><span class="text-[11px] bg-red-600 text-white px-3 py-1.5 rounded-xl font-black">\${p.rating}</span></div>
                                    </div>
                                    <div class="flex gap-2 mb-5">\${getTypeBadges(p.types)}</div>
                                    <div class="text-[13px] font-medium text-zinc-400 bg-black/60 p-5 rounded-[1.5rem] border border-zinc-800/50 font-mono italic">
                                        <i class="fa-solid fa-microchip text-red-900 mr-2"></i>\${p.moves}
                                    </div>
                                </div>\`).join('')}
                        </div>
                    </div>\`;

                resultsDiv.innerHTML = filtered.map(renderCard).join('') +
                                     (others.length > 0 ? '<div class="col-span-full py-20 opacity-10 text-center tech-font text-sm tracking-[1.5em] text-zinc-800 uppercase italic">--- END OF BUFFERED STREAM ---</div>' : '') +
                                     others.map(renderCard).join('');

            } catch (e) { resultsDiv.innerHTML = '<div class="col-span-full text-center py-20 text-red-600 font-black">FATAL_ERROR: ' + e.message + '</div>'; }
        }
        document.getElementById('searchInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
    </script>
</body>
</html>
`;
}
