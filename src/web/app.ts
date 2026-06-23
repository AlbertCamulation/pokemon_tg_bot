// =========================================================
//  手機版 SPA 前端 (單頁應用) — 由 Worker 服務於 GET /
// =========================================================
// 注意：內部前端 JS 刻意不使用樣板字面值 (template literal)，
//       以避免與外層 TS 樣板字串的跳脫衝突。

export const APP_HTML = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#0f1117">
<title>Poke PvP 助手</title>
<style>
  :root{
    --bg:#0f1117; --surface:#1a1d27; --surface2:#232735; --line:#2c3142;
    --text:#eef1f7; --muted:#8b92a7; --accent:#7c6bff; --accent2:#4d90d5;
    --good:#32d74b; --warn:#ffd60a; --danger:#ff5b52; --gold:#ffd60a;
    --r:16px;
  }
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  body{
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans TC',sans-serif;
    background:var(--bg);color:var(--text);font-size:15px;line-height:1.5;
    padding-bottom:calc(72px + env(safe-area-inset-bottom));
  }
  a{color:var(--accent2);text-decoration:none;}
  button{font-family:inherit;cursor:pointer;border:none;color:inherit;}
  input,textarea,select{font-family:inherit;font-size:15px;}

  /* 頂列 */
  .appbar{
    position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:10px;
    padding:calc(12px + env(safe-area-inset-top)) 16px 12px;
    background:rgba(15,17,23,0.85);backdrop-filter:blur(12px);
    border-bottom:1px solid var(--line);
  }
  .appbar .logo{font-weight:800;font-size:18px;letter-spacing:.3px;
    background:linear-gradient(90deg,var(--accent),var(--accent2));
    -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
  .appbar .spacer{flex:1;}
  .avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid var(--accent);}
  .login-btn{background:var(--surface2);border:1px solid var(--line);padding:7px 14px;border-radius:20px;
    font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;}

  /* 內容 */
  .view{display:none;padding:16px;animation:fade .25s ease;}
  .view.active{display:block;}
  @keyframes fade{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}

  .field{display:flex;gap:8px;margin-bottom:14px;}
  .field input,.field select{
    flex:1;background:var(--surface);border:1.5px solid var(--line);color:var(--text);
    padding:12px 14px;border-radius:12px;outline:none;min-width:0;
  }
  .field input:focus,.field select:focus{border-color:var(--accent);}
  .btn{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;
    font-weight:700;padding:12px 18px;border-radius:12px;white-space:nowrap;}
  .btn.sm{padding:8px 12px;font-size:13px;border-radius:10px;}
  .btn.ghost{background:var(--surface2);border:1px solid var(--line);}
  .btn.danger{background:rgba(255,91,82,.12);color:var(--danger);border:1px dashed var(--danger);}
  .btn:disabled{opacity:.45;}

  .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);
    padding:14px;margin-bottom:12px;}
  .card h3{font-size:15px;margin-bottom:10px;display:flex;align-items:center;gap:8px;}
  .muted{color:var(--muted);}
  .center{text-align:center;}
  .pad{padding:30px 10px;}
  .section-title{font-size:12px;font-weight:700;color:var(--muted);letter-spacing:.5px;
    text-transform:uppercase;margin:6px 2px 8px;}

  /* 屬性徽章 */
  .types{display:flex;gap:5px;flex-wrap:wrap;}
  .type{font-size:11px;font-weight:700;color:#fff;padding:2px 9px;border-radius:20px;
    text-shadow:0 1px 1px rgba(0,0,0,.25);}

  /* 排名列 */
  .rankrow{display:flex;align-items:center;gap:12px;padding:11px 4px;border-bottom:1px solid var(--line);}
  .rankrow:last-child{border-bottom:none;}
  .rankno{flex-shrink:0;width:42px;height:42px;border-radius:12px;display:flex;align-items:center;
    justify-content:center;font-weight:800;font-size:15px;background:var(--surface2);}
  .rankno.t1{background:linear-gradient(135deg,#ffd60a,#ff9d2f);color:#3a2a00;}
  .rankno.t2{background:linear-gradient(135deg,#c9d2e0,#9aa6bd);color:#1a1d27;}
  .rankno.t3{background:linear-gradient(135deg,#d9905a,#b96a36);color:#2a1500;}
  .rmain{flex:1;min-width:0;}
  .rname{font-weight:700;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
  .rsub{font-size:12px;color:var(--muted);margin-top:3px;word-break:break-word;}
  .badge{font-size:10px;font-weight:700;padding:1px 7px;border-radius:6px;}
  .badge.elite{background:rgba(255,214,10,.16);color:var(--gold);}
  .badge.fav{background:rgba(255,214,10,.16);color:var(--gold);}
  .score{font-size:13px;font-weight:700;color:var(--accent2);flex-shrink:0;}

  /* chips / tabs */
  .chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:12px;scrollbar-width:none;}
  .chips::-webkit-scrollbar{display:none;}
  .chip{flex-shrink:0;padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;
    background:var(--surface2);color:var(--muted);border:1.5px solid transparent;white-space:nowrap;}
  .chip.active{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;}
  .chip.live::before{content:"●";color:var(--good);margin-right:5px;font-size:9px;vertical-align:middle;}

  .copybar{display:flex;gap:8px;align-items:center;background:var(--surface2);border:1px solid var(--line);
    border-radius:10px;padding:8px 10px;margin-top:8px;}
  .copybar code{flex:1;font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

  /* 底部導覽 */
  .nav{position:fixed;bottom:0;left:0;right:0;z-index:60;display:flex;
    background:rgba(20,23,33,0.92);backdrop-filter:blur(14px);border-top:1px solid var(--line);
    padding-bottom:env(safe-area-inset-bottom);}
  .nav button{flex:1;background:none;padding:9px 0 8px;display:flex;flex-direction:column;
    align-items:center;gap:3px;color:var(--muted);font-size:11px;font-weight:600;}
  .nav button .ic{font-size:21px;line-height:1;}
  .nav button.active{color:var(--accent);}

  /* 盒子 */
  .boxitem{display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--line);
    padding:11px 13px;border-radius:13px;margin-bottom:8px;}
  .boxitem .nm{flex:1;font-weight:600;}
  .star{background:none;font-size:20px;line-height:1;color:#5a607580;padding:2px 4px;}
  .star.on{color:var(--gold);}
  .del{background:rgba(255,91,82,.14);color:var(--danger);font-size:12px;font-weight:700;
    padding:5px 10px;border-radius:8px;}
  .preview-item{font-size:13px;padding:5px 0;border-bottom:1px solid var(--line);}
  .t-ok{color:var(--good);} .t-warn{color:var(--warn);} .t-bad{color:var(--danger);}

  .trio{display:flex;gap:8px;align-items:center;padding:10px;background:var(--surface2);
    border-radius:12px;margin-bottom:8px;}
  .trio .role{font-size:20px;}
  .toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:99;
    background:var(--surface2);border:1px solid var(--line);color:var(--text);
    padding:11px 18px;border-radius:24px;font-size:14px;box-shadow:0 8px 30px rgba(0,0,0,.4);
    opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;max-width:88%;text-align:center;}
  .toast.show{opacity:1;transform:translateX(-50%) translateY(-6px);}
  .spinner{width:26px;height:26px;border:3px solid var(--line);border-top-color:var(--accent);
    border-radius:50%;animation:spin .8s linear infinite;margin:24px auto;}
  @keyframes spin{to{transform:rotate(360deg);}}

  .seg{display:flex;background:var(--surface2);border-radius:10px;padding:3px;margin-bottom:12px;}
  .seg button{flex:1;padding:8px;border-radius:8px;font-size:13px;font-weight:700;color:var(--muted);background:none;}
  .seg button.active{background:var(--accent);color:#fff;}
</style>
</head>
<body>

<div class="appbar">
  <span class="logo">⚡ Poke PvP</span>
  <span class="spacer"></span>
  <div id="auth-slot"></div>
</div>

<!-- 搜尋 -->
<div class="view active" id="view-search">
  <div class="field">
    <input id="q" list="names" placeholder="🔍 輸入寶可夢名稱…" autocomplete="off" enterkeyhint="search">
    <datalist id="names"></datalist>
    <button class="btn" id="search-btn">查詢</button>
  </div>
  <div id="search-result"></div>
</div>

<!-- 排行 -->
<div class="view" id="view-rank">
  <div class="seg">
    <button id="seg-rank" class="active">聯盟排行</button>
    <button id="seg-meta">Meta 分析</button>
  </div>
  <div id="rank-pane">
    <div class="field"><select id="league-select"></select></div>
    <div id="rank-list"></div>
  </div>
  <div id="meta-pane" style="display:none"><div id="meta-list"></div></div>
</div>

<!-- 屬性剋制 -->
<div class="view" id="view-type">
  <div class="seg">
    <button id="seg-def" class="active">防守 (被剋)</button>
    <button id="seg-atk">攻擊 (剋誰)</button>
  </div>
  <div class="chips" id="type-chips"></div>
  <div id="type-result"></div>
</div>

<!-- 盒子 -->
<div class="view" id="view-box"><div id="box-root"></div></div>

<!-- 導覽 -->
<div class="nav">
  <button data-view="search" class="active"><span class="ic">🔍</span>搜尋</button>
  <button data-view="rank"><span class="ic">🏆</span>排行</button>
  <button data-view="type"><span class="ic">🛡️</span>剋制</button>
  <button data-view="box"><span class="ic">🎒</span>盒子</button>
</div>

<div class="toast" id="toast"></div>

<script>
(function(){
  "use strict";

  // ── 屬性對照 ──
  var TN={normal:"一般",fire:"火",water:"水",electric:"電",grass:"草",ice:"冰",fighting:"格鬥",
    poison:"毒",ground:"地面",flying:"飛行",psychic:"超能",bug:"蟲",rock:"岩石",ghost:"幽靈",
    dragon:"龍",dark:"惡",steel:"鋼",fairy:"妖精",none:""};
  var TC={normal:"#9099a1",fire:"#ff9d55",water:"#4d90d5",electric:"#f4d23c",grass:"#63bc5a",
    ice:"#73cec0",fighting:"#ce4069",poison:"#ab6ac8",ground:"#d97746",flying:"#8fa8dd",
    psychic:"#fa7179",bug:"#90c12c",rock:"#c7b78b",ghost:"#5269ac",dragon:"#0b6dc3",
    dark:"#5a5366",steel:"#5a8ea1",fairy:"#ec8fe6"};

  // ── DOM 工具 (textContent 防 XSS) ──
  function h(tag,props){
    var e=document.createElement(tag); props=props||{};
    for(var k in props){
      var v=props[k]; if(v==null) continue;
      if(k==="class") e.className=v;
      else if(k==="text") e.textContent=v;
      else if(k==="style") e.setAttribute("style",v);
      else if(k.slice(0,2)==="on") e.addEventListener(k.slice(2).toLowerCase(),v);
      else e.setAttribute(k,v);
    }
    for(var i=2;i<arguments.length;i++){
      var c=arguments[i]; if(c==null) continue;
      if(Array.isArray(c)){ c.forEach(function(x){ if(x!=null) e.appendChild(typeof x==="string"?document.createTextNode(x):x); }); }
      else e.appendChild(typeof c==="string"?document.createTextNode(c):c);
    }
    return e;
  }
  function $(id){ return document.getElementById(id); }
  function clear(n){ while(n.firstChild) n.removeChild(n.firstChild); return n; }
  function typeBadge(t){ var k=(t||"").toLowerCase(); if(!TN[k]||k==="none") return null;
    return h("span",{class:"type",text:TN[k],style:"background:"+(TC[k]||"#666")}); }
  function typeRow(types){ return h("span",{class:"types"},(types||[]).map(typeBadge).filter(Boolean)); }
  function rankNoEl(rank){ var c="rankno"; if(rank<=3)c+=" t"+rank;
    return h("div",{class:c,text:(typeof rank==="number"?"#"+rank:String(rank))}); }
  function spinner(){ return h("div",{class:"spinner"}); }
  function emptyMsg(t){ return h("div",{class:"center muted pad",text:t}); }

  var toastT;
  function toast(msg){ var el=$("toast"); el.textContent=msg; el.classList.add("show");
    clearTimeout(toastT); toastT=setTimeout(function(){ el.classList.remove("show"); },2200); }

  // ── API ──
  function api(path,opts){ return fetch(path,opts).then(function(r){
    if(r.status===401){ var e=new Error("unauthorized"); e.code=401; throw e; }
    return r.json();
  }); }
  function post(path,body){ return api(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); }

  function copy(text){
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(function(){toast("已複製");},function(){toast("複製失敗");}); }
    else{ var ta=document.createElement("textarea"); ta.value=text; document.body.appendChild(ta); ta.select();
      try{document.execCommand("copy");toast("已複製");}catch(e){toast("複製失敗");} document.body.removeChild(ta); }
  }
  function copyBar(text){ if(!text) return null;
    return h("div",{class:"copybar"}, h("code",{text:text}),
      h("button",{class:"btn sm",text:"📋 複製",onclick:function(){copy(text);}})); }

  // ── 全域狀態 ──
  var ME={loggedIn:false};
  var NAMES=[];
  var LEAGUES={all:[],active:[]};

  // ====================================================
  //  導覽
  // ====================================================
  var navBtns=document.querySelectorAll(".nav button");
  navBtns.forEach(function(b){ b.addEventListener("click",function(){ switchView(b.getAttribute("data-view")); }); });
  function switchView(v){
    document.querySelectorAll(".view").forEach(function(x){ x.classList.remove("active"); });
    $("view-"+v).classList.add("active");
    navBtns.forEach(function(b){ b.classList.toggle("active",b.getAttribute("data-view")===v); });
    if(v==="rank"&&!rankInit) initRank();
    if(v==="type"&&!typeInit) initType();
    if(v==="box") initBox();
    window.scrollTo(0,0);
  }

  // ====================================================
  //  登入狀態
  // ====================================================
  function renderAuth(){
    var slot=clear($("auth-slot"));
    if(ME.loggedIn){
      var img=ME.picture?h("img",{class:"avatar",src:ME.picture,alt:"",referrerpolicy:"no-referrer",
        onclick:function(){ if(confirm("登出 "+ME.email+" ？")) location.href="/auth/logout"; }}):
        h("button",{class:"login-btn",text:"登出",onclick:function(){location.href="/auth/logout";}});
      slot.appendChild(img);
    } else {
      slot.appendChild(h("button",{class:"login-btn",onclick:function(){location.href="/auth/login";}},
        h("span",{text:"🔑"}), h("span",{text:"登入"})));
    }
  }
  function loadMe(){ return api("/api/me").then(function(d){ ME=d||{loggedIn:false}; renderAuth(); }); }

  // 顯示登入錯誤
  (function(){ var p=new URLSearchParams(location.search); var err=p.get("error");
    if(err){ var m=err==="unauthorized"?"此 Google 帳號未獲授權":"登入失敗，請再試一次";
      setTimeout(function(){toast(m);},400); history.replaceState({},"","/"); } })();

  // ====================================================
  //  搜尋
  // ====================================================
  function loadNames(){ return api("/api/names").then(function(arr){
    NAMES=arr||[]; var dl=clear($("names"));
    NAMES.forEach(function(n){ dl.appendChild(h("option",{value:n})); });
  }); }

  function doSearch(){
    var q=$("q").value.trim(); if(q.length<1){ toast("請輸入名稱"); return; }
    var box=clear($("search-result")); box.appendChild(spinner());
    api("/api/search?q="+encodeURIComponent(q)).then(function(d){ renderSearch(d); })
      .catch(function(){ clear($("search-result")).appendChild(emptyMsg("查詢失敗")); });
  }
  function renderSearch(d){
    var box=clear($("search-result"));
    if(!d||(!d.results.length&&!d.evolutionChain.length)){ box.appendChild(emptyMsg("找不到「"+(d?d.query:"")+"」相關寶可夢")); return; }

    if(d.evolutionChain&&d.evolutionChain.length){
      var ec=h("div",{class:"card"}, h("h3",{},"🧬 進化家族"));
      var wrap=h("div",{class:"types",style:"gap:8px"});
      d.evolutionChain.forEach(function(m){
        wrap.appendChild(h("button",{class:"chip",onclick:function(){ $("q").value=m.name; doSearch(); }},
          h("span",{text:m.name}), typeRow(m.types)));
      });
      ec.appendChild(wrap); box.appendChild(ec);
    }

    if(!d.results.length){ box.appendChild(emptyMsg("此家族在各聯盟皆無亮眼排名")); }
    d.results.forEach(function(lg){
      var card=h("div",{class:"card"}, h("h3",{},"🏆 "+lg.leagueName));
      lg.pokemons.forEach(function(p){
        var sub=[]; if(p.moves) sub.push(p.moves);
        card.appendChild(h("div",{class:"rankrow"},
          rankNoEl(p.rank),
          h("div",{class:"rmain"},
            h("div",{class:"rname"}, h("span",{text:p.name}),
              p.elite?h("span",{class:"badge elite",text:"厲害招式"}):null, typeRow(p.types)),
            sub.length?h("div",{class:"rsub",text:sub.join("　")}):null),
          h("div",{class:"score",text:p.rating+"\\n"+p.score,style:"text-align:right;white-space:pre-line"})
        ));
      });
      box.appendChild(card);
    });

    if(d.conclusion&&d.conclusion.length){
      box.appendChild(h("div",{class:"card"},
        h("h3",{},"📌 結論"),
        h("div",{text:"建議保留聯盟：CP "+d.conclusion.join(" / ")}),
        d.hasEliteWarning?h("div",{class:"t-warn",style:"margin-top:6px",text:"⚠️ 部分推薦招式 (*) 需厲害招式學習器"}):null));
    }

    if(d.events&&d.events.length){
      var ev=h("div",{class:"card"}, h("h3",{},"🎉 相關活動"));
      d.events.forEach(function(e){ ev.appendChild(h("div",{style:"padding:6px 0;border-bottom:1px solid var(--line)"},
        h("a",{href:e.link,target:"_blank",rel:"noopener",text:e.eventName}),
        h("div",{class:"rsub",text:e.date||""}))); });
      box.appendChild(ev);
    }

    if(ME.loggedIn&&d.evolutionChain&&d.evolutionChain.length){
      var nm=d.evolutionChain[d.evolutionChain.length-1].name;
      box.appendChild(h("button",{class:"btn ghost",style:"width:100%;margin-top:4px",
        text:"🗑 將「"+nm+"」加入垃圾清單",
        onclick:function(){ post("/api/trash",{add:[nm]}).then(function(){toast("已加入垃圾清單");}); }}));
    }
  }
  $("search-btn").addEventListener("click",doSearch);
  $("q").addEventListener("keydown",function(e){ if(e.key==="Enter") doSearch(); });

  // ====================================================
  //  排行 + Meta
  // ====================================================
  var rankInit=false;
  function initRank(){
    rankInit=true;
    var sel=clear($("league-select"));
    var groups=[["1500","超級聯盟 (1500)"],["2500","高級聯盟 (2500)"],["10000","大師聯盟"],["500","小小盃"],["Any","PvE 排行"]];
    var activeIds={}; LEAGUES.active.forEach(function(a){ activeIds[a.command]=true; });
    groups.forEach(function(g){
      var items=LEAGUES.all.filter(function(l){ return l.cp===g[0]; });
      if(!items.length) return;
      var og=h("optgroup",{label:g[1]});
      items.forEach(function(l){ og.appendChild(h("option",{value:l.id,text:(activeIds[l.id]?"● ":"")+l.name})); });
      sel.appendChild(og);
    });
    sel.addEventListener("change",function(){ loadRanking(sel.value); });
    // 預設選當下聯盟或超級聯盟
    var def=(LEAGUES.active[0]&&LEAGUES.active[0].command)||"great_league_top";
    sel.value=def; loadRanking(def);
  }
  function loadRanking(cmd){
    var box=clear($("rank-list")); box.appendChild(spinner());
    api("/api/rankings?league="+encodeURIComponent(cmd)+"&limit=80").then(function(d){
      box=clear($("rank-list"));
      if(!d||!d.entries.length){ box.appendChild(emptyMsg("此聯盟暫無資料")); return; }
      var card=h("div",{class:"card"});
      d.entries.forEach(function(p){
        card.appendChild(h("div",{class:"rankrow"},
          rankNoEl(p.rank),
          h("div",{class:"rmain"}, h("div",{class:"rname"}, h("span",{text:p.name}), typeRow(p.types))),
          h("div",{class:"score",text:p.score})));
      });
      box.appendChild(card);
      var cb=copyBar(d.copyString); if(cb) box.appendChild(cb);
    }).catch(function(){ clear($("rank-list")).appendChild(emptyMsg("載入失敗")); });
  }

  var metaLoaded=false;
  function loadMeta(){
    if(metaLoaded) return; metaLoaded=true;
    var box=clear($("meta-list")); box.appendChild(spinner());
    api("/api/meta").then(function(arr){
      box=clear($("meta-list"));
      if(!arr||!arr.length){ box.appendChild(emptyMsg("暫無 Meta 資料")); return; }
      arr.forEach(function(m){
        var card=h("div",{class:"card"}, h("h3",{},"📊 "+m.leagueName));
        card.appendChild(h("div",{class:"section-title",text:"👑 META 核心"}));
        card.appendChild(member(m.core));
        card.appendChild(h("div",{class:"section-title",text:"🔥 暴力 T0 隊"}));
        m.teamViolence.forEach(function(p){ card.appendChild(member(p)); });
        card.appendChild(h("div",{class:"section-title",text:"🛡️ 智慧聯防隊"}));
        m.teamBalanced.forEach(function(p){ card.appendChild(member(p)); });
        card.appendChild(h("div",{class:"section-title",text:"🔄 二當家聯防隊"}));
        m.teamAlternative.forEach(function(p){ card.appendChild(member(p)); });
        var cb=copyBar(m.copyString); if(cb) card.appendChild(cb);
        box.appendChild(card);
      });
    }).catch(function(){ metaLoaded=false; clear($("meta-list")).appendChild(emptyMsg("載入失敗")); });
  }
  function member(p){
    return h("div",{class:"rankrow"},
      rankNoEl(p.rank||0),
      h("div",{class:"rmain"}, h("div",{class:"rname"}, h("span",{text:p.name}), typeRow(p.types))),
      h("div",{class:"score",text:p.score}));
  }
  $("seg-rank").addEventListener("click",function(){ this.classList.add("active"); $("seg-meta").classList.remove("active");
    $("rank-pane").style.display=""; $("meta-pane").style.display="none"; });
  $("seg-meta").addEventListener("click",function(){ this.classList.add("active"); $("seg-rank").classList.remove("active");
    $("rank-pane").style.display="none"; $("meta-pane").style.display=""; loadMeta(); });

  // ====================================================
  //  屬性剋制
  // ====================================================
  var typeInit=false, typeMode="def", curType="water";
  function initType(){
    typeInit=true;
    var chips=clear($("type-chips"));
    Object.keys(TN).forEach(function(k){ if(k==="none") return;
      chips.appendChild(h("button",{class:"chip"+(k===curType?" active":""),"data-t":k,
        text:TN[k],style:"border-color:"+TC[k],onclick:function(){ curType=k;
          document.querySelectorAll("#type-chips .chip").forEach(function(c){ c.classList.toggle("active",c.getAttribute("data-t")===k); });
          loadType(); }})); });
    loadType();
  }
  function loadType(){
    var box=clear($("type-result")); box.appendChild(spinner());
    api("/api/type?type="+curType+"&mode="+typeMode).then(function(d){
      box=clear($("type-result")); if(!d){ box.appendChild(emptyMsg("無資料")); return; }
      function grp(title,arr,cls){ if(!arr||!arr.length) return null;
        var c=h("div",{class:"card"}, h("h3",{},title));
        var w=h("div",{class:"types",style:"gap:6px"});
        arr.forEach(function(t){ w.appendChild(h("span",{class:"type",style:"background:"+(TC[t.type]||"#666"),
          text:t.name+" "+t.multiplier+"x"})); });
        c.appendChild(w); return c;
      }
      if(typeMode==="atk"){
        box.appendChild(h("div",{class:"section-title",text:TN[curType]+" 屬性攻擊時"}));
        var g=grp("💪 效果絕佳",d.superEffective); box.appendChild(g||emptyMsg("無明顯剋制對象"));
      } else {
        box.appendChild(h("div",{class:"section-title",text:TN[curType]+" 屬性防守時"}));
        var a=grp("💀 弱點 (被剋)",d.superEffective);
        var b=grp("🛡️ 抗性",d.resist);
        var c=grp("🚫 雙抗 / 無效",d.immune);
        if(!a&&!b&&!c) box.appendChild(emptyMsg("無資料"));
        if(a)box.appendChild(a); if(b)box.appendChild(b); if(c)box.appendChild(c);
      }
    }).catch(function(){ clear($("type-result")).appendChild(emptyMsg("載入失敗")); });
  }
  $("seg-def").addEventListener("click",function(){ this.classList.add("active"); $("seg-atk").classList.remove("active"); typeMode="def"; if(typeInit)loadType(); });
  $("seg-atk").addEventListener("click",function(){ this.classList.add("active"); $("seg-def").classList.remove("active"); typeMode="atk"; if(typeInit)loadType(); });

  // ====================================================
  //  盒子 (需登入)
  // ====================================================
  var boxInit=false;
  var BOX={acct:0,league:null,acctNames:["帳號 A","帳號 B","帳號 C","帳號 D"],
    box:[{},{},{},{}],favs:[{},{},{},{}],pending:[]};

  function initBox(){
    if(!ME.loggedIn){ renderBoxLogin(); return; }
    if(boxInit){ renderBox(); return; }
    boxInit=true;
    var root=clear($("box-root")); root.appendChild(spinner());
    var cps=(LEAGUES.active.length?LEAGUES.active:[{cp:"1500"},{cp:"2500"},{cp:"10000"}]);
    var uniqCp={}; cps.forEach(function(l){ uniqCp[l.cp]=true; });
    Promise.all([api("/api/account-names"),api("/api/box")]).then(function(res){
      var an=res[0], data=res[1];
      if(Array.isArray(an)&&an.length===4) BOX.acctNames=an;
      for(var a=0;a<4;a++){ var ad=data[a]||{}; Object.keys(ad).forEach(function(cp){
        BOX.box[a][cp]=ad[cp].box||[]; BOX.favs[a][cp]=arrToSet(ad[cp].favs||[]); }); }
      BOX.league=LEAGUES.active[0]||{name:"超級聯盟",path:"data/rankings_1500.json",cp:"1500",command:"great_league_top"};
      renderBox();
    }).catch(function(e){ if(e.code===401){ ME.loggedIn=false; renderBoxLogin(); } else clear($("box-root")).appendChild(emptyMsg("載入失敗")); });
  }
  function arrToSet(a){ var s={}; a.forEach(function(x){ s[x]=true; }); return s; }
  function setKeys(s){ return Object.keys(s||{}); }
  function curCp(){ return BOX.league?String(BOX.league.cp):null; }
  function curList(){ var cp=curCp(); return (BOX.box[BOX.acct][cp]||[]); }

  function renderBoxLogin(){
    var root=clear($("box-root"));
    root.appendChild(h("div",{class:"card center pad"},
      h("div",{style:"font-size:40px;margin-bottom:10px",text:"🎒"}),
      h("h3",{style:"justify-content:center",text:"登入以使用對戰盒子"}),
      h("div",{class:"muted",style:"margin:8px 0 16px",text:"用 Google 登入後即可跨裝置同步你的寶可夢盒子與最佳隊伍分析"}),
      h("button",{class:"btn",style:"width:100%",text:"🔑 使用 Google 登入",onclick:function(){location.href="/auth/login";}})));
  }

  function renderBox(){
    var root=clear($("box-root"));

    // 帳號 chips
    var acctRow=h("div",{class:"chips"});
    BOX.acctNames.forEach(function(nm,i){
      acctRow.appendChild(h("button",{class:"chip"+(i===BOX.acct?" active":""),text:nm,
        onclick:function(){ BOX.acct=i; renderBox(); }}));
    });
    acctRow.appendChild(h("button",{class:"chip",text:"✏️ 改名",onclick:renameAcct}));
    root.appendChild(acctRow);

    // 聯盟 tabs
    var lgRow=h("div",{class:"chips"});
    var src=LEAGUES.active.length?LEAGUES.active:[
      {name:"超級聯盟",path:"data/rankings_1500.json",cp:"1500",command:"great_league_top"},
      {name:"高級聯盟",path:"data/rankings_2500.json",cp:"2500",command:"ultra_league_top"},
      {name:"大師聯盟",path:"data/rankings_10000.json",cp:"10000",command:"master_league_top"}];
    src.forEach(function(l){
      var on=BOX.league&&BOX.league.command===l.command;
      lgRow.appendChild(h("button",{class:"chip"+(LEAGUES.active.length?" live":"")+(on?" active":""),
        text:l.name,onclick:function(){ BOX.league=l; renderBox(); }}));
    });
    root.appendChild(lgRow);

    // 同 CP 提示
    var same=src.filter(function(l){ return BOX.league&&l.cp===BOX.league.cp&&l.command!==BOX.league.command; });
    if(same.length) root.appendChild(h("div",{class:"muted",style:"font-size:12px;margin:-4px 2px 12px",
      text:"💡 同為 CP"+BOX.league.cp+"，與 "+same.map(function(l){return l.name;}).join("、")+" 共用盒子"}));

    // 新增
    var addInput=h("input",{list:"names",placeholder:"🔍 加入單一寶可夢…",autocomplete:"off"});
    root.appendChild(h("div",{class:"field"}, addInput,
      h("button",{class:"btn",text:"加入",onclick:function(){ addOne(addInput.value); addInput.value=""; }})));
    addInput.addEventListener("keydown",function(e){ if(e.key==="Enter"){ addOne(addInput.value); addInput.value=""; } });

    // 批量匯入
    var ta=h("textarea",{rows:"3",placeholder:"批量貼上：胖嘟嘟, 暗影拉達, 雷雲… (逗號或換行分隔)",
      style:"width:100%;background:var(--surface);border:1.5px solid var(--line);color:var(--text);border-radius:12px;padding:10px;margin-bottom:8px;resize:vertical"});
    var preview=h("div",{});
    var importCard=h("div",{class:"card"},
      h("h3",{},"✨ 智慧批量匯入"), ta,
      h("div",{class:"field",style:"margin-bottom:0"},
        h("button",{class:"btn ghost",style:"flex:1",text:"🔍 解析",onclick:function(){ previewImport(ta.value,preview); }}),
        h("button",{class:"btn",style:"flex:1",text:"✅ 加入",onclick:function(){ doImport(preview); ta.value=""; }})),
      preview);
    root.appendChild(importCard);

    // 清垃圾
    root.appendChild(h("button",{class:"btn danger",style:"width:100%;margin-bottom:12px",
      text:"🧹 一鍵清除未上榜 / 低排名",onclick:cleanBox}));

    // 列表
    root.appendChild(renderList());

    // 動作列
    root.appendChild(h("div",{class:"field",style:"margin-top:4px"},
      h("button",{class:"btn",style:"flex:1",text:"💾 儲存並分析最佳隊伍",onclick:saveAndAnalyze})));

    root.appendChild(h("div",{id:"analysis"}));

    // 垃圾清單管理
    root.appendChild(h("button",{class:"btn ghost",style:"width:100%;margin-top:8px",
      text:"📝 查看 / 管理垃圾清單",onclick:openTrash}));
    root.appendChild(h("div",{id:"trash-pane"}));
  }

  function renderList(){
    var wrap=h("div",{});
    var cp=curCp(); var team=BOX.box[BOX.acct][cp]||[]; var favs=BOX.favs[BOX.acct][cp]||{};
    if(!team.length){ wrap.appendChild(emptyMsg("盒子空空的，搜一隻或批次匯入吧！")); return wrap; }
    var favList=team.filter(function(n){ return favs[n]; });
    var rest=team.filter(function(n){ return !favs[n]; });
    function item(name){
      var isFav=!!favs[name];
      return h("div",{class:"boxitem"},
        h("span",{class:"nm",text:name}),
        h("button",{class:"star"+(isFav?" on":""),text:isFav?"⭐":"☆",onclick:function(){ toggleFav(name); }}),
        h("button",{class:"del",text:"移除",onclick:function(){ removeOne(name); }}));
    }
    if(favList.length){ wrap.appendChild(h("div",{class:"section-title",text:"⭐ 即戰力"}));
      favList.forEach(function(n){ wrap.appendChild(item(n)); }); }
    if(rest.length){ wrap.appendChild(h("div",{class:"section-title",text:favList.length?"📋 其他":"📋 寶可夢列表"}));
      rest.forEach(function(n){ wrap.appendChild(item(n)); }); }
    return wrap;
  }

  // 盒子操作
  function ensureCp(){ var cp=curCp(); if(!BOX.box[BOX.acct][cp]) BOX.box[BOX.acct][cp]=[];
    if(!BOX.favs[BOX.acct][cp]) BOX.favs[BOX.acct][cp]={}; return cp; }
  function addOne(raw){ var name=(raw||"").trim(); if(!name) return; var cp=ensureCp();
    var m=fuzzy(name); var fin=(m.status==="exact"||m.status==="fuzzy")?m.name:name;
    if(BOX.box[BOX.acct][cp].indexOf(fin)<0){ BOX.box[BOX.acct][cp].push(fin); renderBox(); } else toast("已存在"); }
  function removeOne(name){ var cp=curCp(); BOX.box[BOX.acct][cp]=(BOX.box[BOX.acct][cp]||[]).filter(function(p){return p!==name;});
    if(BOX.favs[BOX.acct][cp]) delete BOX.favs[BOX.acct][cp][name]; renderBox(); }
  function toggleFav(name){ var cp=ensureCp(); if(BOX.favs[BOX.acct][cp][name]) delete BOX.favs[BOX.acct][cp][name];
    else BOX.favs[BOX.acct][cp][name]=true; renderBox(); }

  // 模糊匹配 (縮寫/型態)
  function isSub(s,l){ var i=0,j=0; while(i<s.length&&j<l.length){ if(s[i]===l[j])i++; j++; } return i===s.length; }
  function fuzzy(input){
    if(NAMES.indexOf(input)>=0) return {status:"exact",name:input};
    var norm=input.replace(/暗影/g,"(暗影)").replace(/阿羅拉/g,"(阿羅拉)").replace(/伽勒爾/g,"(伽勒爾)").replace(/洗翠/g,"(洗翠)").replace(/mega/gi,"(Mega)");
    var ci=input.replace(/[()]/g,"");
    var cand=NAMES.filter(function(n){ var cn=n.replace(/[()]/g,"");
      return n.indexOf(input)>=0||cn.indexOf(ci)>=0||n.indexOf(norm)>=0||isSub(ci,cn); });
    if(cand.length===1) return {status:"fuzzy",name:cand[0]};
    if(cand.length>1){ var ex=cand.filter(function(c){return c.replace(/[()]/g,"")===ci;})[0]; if(ex) return {status:"fuzzy",name:ex};
      return {status:"multiple",candidates:cand.slice(0,3)}; }
    return {status:"not_found"};
  }
  function previewImport(text,host){
    clear(host); var cp=ensureCp();
    var raws=text.split(/[,，\\n\\t]/).map(function(s){return s.split("&")[0].trim();}).filter(Boolean);
    BOX.pending=[]; var cur=BOX.box[BOX.acct][cp]||[];
    raws.forEach(function(inp){ var m=fuzzy(inp);
      if(m.status==="exact"||m.status==="fuzzy"){
        if(cur.indexOf(m.name)>=0||BOX.pending.indexOf(m.name)>=0)
          host.appendChild(h("div",{class:"preview-item t-warn",text:inp+" → "+m.name+" (已存在)"}));
        else{ BOX.pending.push(m.name);
          host.appendChild(h("div",{class:"preview-item t-ok",text:"✔️ "+inp+" → "+m.name+(m.status==="fuzzy"?" (修正)":"")}));}
      } else if(m.status==="multiple")
        host.appendChild(h("div",{class:"preview-item t-bad",text:"❌ "+inp+" → 多個結果("+m.candidates.join("/")+")"}));
      else host.appendChild(h("div",{class:"preview-item t-bad",text:"❌ "+inp+" → 查無"})); });
    if(!raws.length) host.appendChild(h("div",{class:"muted",text:"請先貼上名稱"}));
  }
  function doImport(host){
    if(!BOX.pending.length){ toast("請先解析"); return; } var cp=ensureCp(); var n=0;
    BOX.pending.forEach(function(name){ if(BOX.box[BOX.acct][cp].indexOf(name)<0){ BOX.box[BOX.acct][cp].push(name); n++; } });
    BOX.pending=[]; clear(host); renderBox(); toast("已加入 "+n+" 隻");
  }

  function cleanBox(){
    var cp=curCp(); var team=BOX.box[BOX.acct][cp]||[];
    if(!team.length){ toast("盒子是空的"); return; }
    toast("雲端過濾中…");
    post("/api/clean-box",{leaguePath:BOX.league.path,team:team}).then(function(r){
      if(r.removed&&r.removed.length){ BOX.box[BOX.acct][cp]=r.keep;
        r.removed.forEach(function(x){ if(BOX.favs[BOX.acct][cp]) delete BOX.favs[BOX.acct][cp][x]; });
        renderBox(); toast("已清除 "+r.removed.length+" 隻"); }
      else toast("盒子很乾淨 ✨");
    }).catch(function(e){ toast(e.code===401?"請先登入":"清理失敗"); });
  }

  function saveAndAnalyze(){
    if(!BOX.league){ toast("請先選聯盟"); return; }
    var allData={}; var seen={};
    var src=LEAGUES.active.length?LEAGUES.active:[{cp:"1500"},{cp:"2500"},{cp:"10000"}];
    src.forEach(function(l){ var cp=String(l.cp); if(seen[cp]) return; seen[cp]=true;
      allData[cp]={box:BOX.box[BOX.acct][cp]||[],favs:setKeys(BOX.favs[BOX.acct][cp])}; });
    var cp=curCp();
    var an=clear($("analysis")); an.appendChild(spinner());
    post("/api/box",{acct:BOX.acct,allData:allData}).then(function(){
      return post("/api/analyze",{leaguePath:BOX.league.path,team:allData[cp].box,favs:allData[cp].favs});
    }).then(function(res){ renderAnalysis(res); toast("已儲存"); })
      .catch(function(e){ clear($("analysis")).appendChild(emptyMsg(e.code===401?"請先登入":"分析失敗")); });
  }
  function renderAnalysis(a){
    var host=clear($("analysis"));
    if(!a||a.error){ host.appendChild(h("div",{class:"card t-warn center",text:"⚠️ "+(a?a.error:"分析失敗")})); return; }
    function trioCard(title,trio){
      var card=h("div",{class:"card"}, h("h3",{},title));
      var roles=["👑","🛡️","⚔️"];
      trio.members.forEach(function(p,i){
        card.appendChild(h("div",{class:"trio"},
          h("span",{class:"role",text:roles[i]||"•"}),
          h("div",{class:"rmain"},
            h("div",{class:"rname"}, h("span",{text:"#"+p.rank+" "+p.name}),
              p.isFav?h("span",{class:"badge fav",text:"⭐"}):null,
              p.lowRank?h("span",{class:"badge",style:"background:rgba(255,91,82,.15);color:var(--danger)",text:"低排名"}):null,
              typeRow(p.types)),
            h("div",{class:"rsub",text:p.scoreIcon+" "+p.score.toFixed(1)+(p.moves?"　"+p.moves:"")}))));
      });
      card.appendChild(trio.sharedWeaks.length
        ? h("div",{class:"t-warn",style:"margin-top:4px",text:"⚠️ 共同弱點："+trio.sharedWeaks.join("、")+" 系"})
        : h("div",{class:"t-ok",style:"margin-top:4px",text:"✅ 弱點覆蓋良好"}));
      var cb=copyBar(trio.copyString); if(cb) card.appendChild(cb);
      return card;
    }
    host.appendChild(h("div",{class:"section-title",text:"📊 "+a.leagueName+" 分析結果"}));
    host.appendChild(trioCard("🏅 最佳三人組",a.bestTrio));
    if(a.favTrio) host.appendChild(trioCard("⭐ 即戰力優先組",a.favTrio));
    else if(a.favSameAsBest) host.appendChild(h("div",{class:"card muted center",text:"⭐ 即戰力組與最佳組相同"}));
    else if(a.favCount>0) host.appendChild(h("div",{class:"card muted center",text:"⭐ 即戰力僅 "+a.favCount+" 隻，不足 3 隻"}));
    if(a.garbage&&a.garbage.length){
      host.appendChild(h("div",{class:"card"}, h("h3",{},"🗑 建議移除 (排名過低)"),
        h("div",{class:"rsub",text:a.garbage.join("、")})));
    }
  }

  function renameAcct(){
    var i=BOX.acct; var nm=prompt("帳號改名 (最多12字)",BOX.acctNames[i]);
    if(nm==null) return; nm=nm.trim().slice(0,12)||BOX.acctNames[i];
    BOX.acctNames[i]=nm; renderBox();
    post("/api/account-names",{names:BOX.acctNames}).catch(function(){});
  }

  function openTrash(){
    var pane=clear($("trash-pane")); pane.appendChild(spinner());
    api("/api/trash").then(function(list){
      pane=clear($("trash-pane"));
      var card=h("div",{class:"card"}, h("h3",{},"📝 我的垃圾清單"));
      if(!list||!list.length){ card.appendChild(h("div",{class:"muted",text:"清單是空的"})); }
      else list.forEach(function(n){ card.appendChild(h("div",{class:"boxitem"},
        h("span",{class:"nm",text:n}),
        h("button",{class:"del",text:"移出",onclick:function(){
          post("/api/trash",{remove:[n]}).then(function(){ openTrash(); toast("已移出"); }); }}))); });
      pane.appendChild(card);
    }).catch(function(){ clear($("trash-pane")).appendChild(emptyMsg("載入失敗")); });
  }

  // ====================================================
  //  啟動
  // ====================================================
  Promise.all([loadMe(),loadNames(),api("/api/leagues").then(function(d){ LEAGUES=d||{all:[],active:[]}; })])
    .catch(function(){})
    .then(function(){ /* ready */ });

})();
</script>
</body>
</html>`;
