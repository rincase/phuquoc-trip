(() => {
  let DATA = window.PHUQUOC_DATA;
  let cloudState = { status: 'local', lastSync: '', error: '' };
  const app = document.getElementById('app');
  let currentView = localStorage.getItem('pq:lastView') || 'today';
  let checklistType = localStorage.getItem('pq:checkType') || '行李';
  let deferredInstallPrompt = null;
  let mapInstance = null;


  const CLOUD_URL_KEY = 'pq:cloudApiUrl';
  const CLOUD_NAME_KEY = 'pq:cloudUserName';
  const DEFAULT_CLOUD_API_URL = 'https://script.google.com/macros/s/AKfycbyWgxma2uGl_S2AfJjq4lzNimXf4nMrGBiF-PDw9lTHubHdxwfAisCBDQ5vId0RtmTf/exec';

  function cloudApiUrl(){ return (localStorage.getItem(CLOUD_URL_KEY) || DEFAULT_CLOUD_API_URL).trim(); }
  function cloudUserName(){ return (localStorage.getItem(CLOUD_NAME_KEY) || '').trim(); }
  function hasCloud(){ return /^https:\/\/script\.google\.com\/macros\/s\//.test(cloudApiUrl()); }
  function cloudStatusText(){
    if(cloudState.status==='syncing') return '同步中…';
    if(cloudState.status==='online') return cloudState.lastSync ? `已同步 · ${cloudState.lastSync}` : '已連線';
    if(cloudState.status==='error') return '同步失敗，已使用離線資料';
    return '目前使用離線資料';
  }
  async function fetchCloudData(showMessage=false){
    const url=cloudApiUrl();
    if(!url) return false;
    cloudState={...cloudState,status:'syncing',error:''};
    try{
      const res=await fetch(`${url}?action=getAll&_=${Date.now()}`,{cache:'no-store'});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload=await res.json();
      if(!payload?.ok || !payload.data) throw new Error(payload?.error || 'API 回傳格式錯誤');
      const incoming=payload.data;
      const staticData=window.PHUQUOC_DATA;
      const staticPlaces=Object.fromEntries((staticData.places||[]).map(p=>[p.id,p]));
      if(incoming.places){ incoming.places=incoming.places.map(p=>({...staticPlaces[p.id],...p,lat:Number(p.lat||staticPlaces[p.id]?.lat),lng:Number(p.lng||staticPlaces[p.id]?.lng),mapQuery:p.mapQuery||staticPlaces[p.id]?.mapQuery})); }
      DATA={...DATA,...incoming,dayImages:staticData.dayImages};
      window.PHUQUOC_DATA=DATA;
      const t=new Date();
      cloudState={status:'online',lastSync:`${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`,error:''};
      if(showMessage) showToast('Google 試算表同步完成');
      return true;
    }catch(err){
      cloudState={...cloudState,status:'error',error:String(err?.message||err)};
      if(showMessage) showToast('同步失敗，已保留離線資料');
      return false;
    }
  }
  async function updateChecklistCloud(id,checked){
    if(!hasCloud()) return false;
    try{
      const body=new URLSearchParams({action:'updateChecklist',id,checked:String(checked),updatedBy:cloudUserName()});
      const res=await fetch(cloudApiUrl(),{method:'POST',body});
      const payload=await res.json();
      if(!payload?.ok) throw new Error(payload?.error || '更新失敗');
      const row=DATA.checklist.find(x=>x.id===id);
      if(row){ row.checked=checked; row.updatedBy=cloudUserName(); row.updatedAt=payload.updatedAt||''; }
      cloudState={...cloudState,status:'online'};
      return true;
    }catch(err){
      cloudState={...cloudState,status:'error',error:String(err?.message||err)};
      return false;
    }
  }

  const dayTitles = {1:'抵達富國島',2:'珍珠野生動物園',3:'南下・沙灘慢活',4:'香島纜車 + 日落小鎮',5:'跳島一日遊',6:'溫馨返家'};
  const dayRoute = {
    1:'富國島機場 → 包車 → Teddy Home → 休息',
    2:'Safari → 午餐 → 午休 → Grand World → 水上秀',
    3:'早午餐 → 退房 → Kalia Hotel → 沙灘 → 夕陽',
    4:'早餐 → 香島 Sun World（水上樂園／沙灘）→ 午餐 → 日落小鎮 → 吻橋日落 → 晚餐',
    5:'港口登船 → 跳島一日遊 → 回飯店休息 → 晚餐 → Kingkong Mart',
    6:'飯店退房 → 富國島機場 → 11:00 班機返台'
  };

  function fmtDate(dateStr){
    const d = new Date(dateStr+'T00:00:00');
    const week = ['週日','週一','週二','週三','週四','週五','週六'][d.getDay()];
    return `${d.getMonth()+1}/${d.getDate()} ${week}`;
  }
  function slashDate(dateStr){ return dateStr.replaceAll('-','/'); }
  function tripDayForNow(){
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date('2026-10-18T00:00:00');
    const end = new Date('2026-10-23T23:59:59');
    if(today < start) return {state:'before', day:1, diff:Math.ceil((start-today)/86400000)};
    if(today > end) return {state:'after', day:6, diff:0};
    return {state:'during', day:Math.floor((today-start)/86400000)+1, diff:0};
  }
  function itemsForDay(day){ return DATA.itinerary.filter(x=>x.day===day).sort((a,b)=>a.sort-b.sort); }
  function hotelForDay(day){ return itemsForDay(day).find(x=>x.hotel)?.hotel || (day===6?'—':''); }
  function noteForDate(date){ return DATA.notes.find(n=>n.date===date)?.content || '今天沒有額外備註。'; }
  function getChecks(){ return JSON.parse(localStorage.getItem('pq:checks') || '{}'); }
  function setCheck(id,value){ const saved=getChecks(); saved[id]=value; localStorage.setItem('pq:checks',JSON.stringify(saved)); }
  function showToast(text){ const el=document.createElement('div'); el.className='toast'; el.textContent=text; document.body.appendChild(el); setTimeout(()=>el.remove(),2000); }
  function telHref(phone){ return phone ? `tel:${phone.replace(/[^+\d]/g,'')}` : ''; }
  function mapSearchUrl(query){ return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`; }

  function installBanner(){
    return `<div class="install-banner card ${deferredInstallPrompt?'show':''}"><div><strong>安裝到手機</strong><div class="subtle">加入主畫面後，可像 App 一樣開啟。</div></div><button class="btn primary" id="installBtn">安裝</button></div>`;
  }

  function renderToday(){
    const tripState=tripDayForNow(); const day=tripState.day; const items=itemsForDay(day); const date=items[0]?.date || DATA.trip.startDate;
    const helper = tripState.state==='before' ? `距離出發還有 ${tripState.diff} 天，先顯示 Day 1 預覽。` : tripState.state==='after' ? '旅程已結束，這裡保留最後一天行程。' : '依旅遊日期自動顯示當天重點與下一個行程。';
    const next=items[0];
    app.innerHTML = `${installBanner()}
      <div class="page-title-row"><h2>今日</h2><span class="pill">DAY ${String(day).padStart(2,'0')}</span></div>
      <p class="helper">${helper}</p>
      <section class="hero-day card">
        <div class="hero-day-top"><img class="hero-day-photo" src="${DATA.dayImages[day]}" alt="${dayTitles[day]}"><div><h3>${dayTitles[day]}</h3><div class="subtle">${fmtDate(date)}</div><div class="chips"><span class="chip">${items[0]?.area || '富國島'}</span><span class="chip">${hotelForDay(day)||'返家'}</span><span class="chip">Day ${day}</span></div></div></div>
        ${next ? `<div class="next-box"><div class="next-label">下一個行程</div><div class="next-line"><span class="time">${next.start}</span><strong>${next.title}</strong></div></div>`:''}
        <div class="timeline">${items.map(i=>`<div class="timeline-item"><div class="time">${i.start}${i.end?`–${i.end}`:''}</div><div class="dot-wrap"><div class="dot"></div></div><div><div class="timeline-title">${i.title}</div>${i.detail?`<div class="timeline-detail">${i.detail}</div>`:''}</div></div>`).join('')}</div>
        <div class="hotel-row"><span>今日住宿</span><strong>${hotelForDay(day)||'返家'}</strong></div>
      </section>
      <section class="mini-card card today-note"><h4>備註</h4><div class="subtle">${noteForDate(date)}</div></section>`;
  }

  function renderItinerary(){
    app.innerHTML = `<div class="page-title-row"><h2>六日總行程</h2><span class="pill">10/18–10/23</span></div><p class="helper">一眼看完整趟富國島旅行，展開日期查看當日細節。</p>` +
      [1,2,3,4,5,6].map(day=>{
        const items=itemsForDay(day); const date=items[0].date;
        return `<section class="day-card card" data-day="${day}"><div class="day-head"><span class="day-label">DAY ${String(day).padStart(2,'0')}</span><span class="day-date">${fmtDate(date)}</span></div><img class="day-photo" src="${DATA.dayImages[day]}" alt="${dayTitles[day]}"><h3>${dayTitles[day]}</h3><div class="route">${dayRoute[day]}</div><button class="expand-btn">展開行程＋</button><div class="details">${items.map(i=>`<div class="detail-row"><div class="detail-time">${i.start}${i.end?`–${i.end}`:''}</div><div><div class="detail-main">${i.title}</div>${i.detail?`<div class="detail-sub">${i.detail}</div>`:''}</div></div>`).join('')}<div class="detail-row"><div class="detail-time">住宿</div><div><div class="detail-main">${hotelForDay(day)||'返家'}</div></div></div></div></section>`;
      }).join('');
  }

  function renderMap(){
    app.innerHTML = `<div class="page-title-row"><h2>地圖</h2><span class="pill">真實地圖</span></div><p class="helper">可縮放、拖曳；點擊標記或地點列表可直接開啟 Google Maps 導航。</p><section class="map-card card"><div id="leafletMap" class="leaflet-map"><div class="map-loading">載入地圖中…</div></div></section><section class="location-list card"><h3>地點列表</h3>${DATA.places.map(p=>`<a class="location-row" href="${mapSearchUrl(p.mapQuery||p.name)}" target="_blank" rel="noopener"><div class="location-meta"><span class="area-tag">${p.area}</span><strong>${p.name}</strong></div><span class="navigate-label">導航 ›</span></a>`).join('')}</section>`;
    setTimeout(initLeafletMap,0);
  }

  function initLeafletMap(){
    const el=document.getElementById('leafletMap'); if(!el) return;
    if(typeof L==='undefined'){ el.innerHTML='<div class="map-error">目前無法載入地圖元件；下方地點列表仍可直接導航。</div>'; return; }
    mapInstance = L.map(el,{zoomControl:true}).setView([10.18,103.98],10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(mapInstance);
    const bounds=[];
    DATA.places.forEach(p=>{
      const marker=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'pq-map-icon',html:'<span>●</span>',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(mapInstance);
      const nav=mapSearchUrl(p.mapQuery||p.name);
      marker.bindPopup(`<strong>${p.name}</strong><br><span>${p.area}</span><br><a href="${nav}" target="_blank" rel="noopener">開啟 Google Maps 導航</a>`);
      bounds.push([p.lat,p.lng]);
    });
    if(bounds.length) mapInstance.fitBounds(bounds,{padding:[28,28]});
    setTimeout(()=>mapInstance.invalidateSize(),120);
  }

  function hotelCard(h){
    return `<article class="hotel-info-box"><div class="hotel-copy"><h4>${h.name}</h4><div class="subtle">${h.area} · ${slashDate(h.checkIn)} → ${slashDate(h.checkOut)}</div><div class="contact-line"><span>📍</span><div><b>地址</b><div>${h.address||'尚未填寫'}</div></div></div><div class="contact-line"><span>☎</span><div><b>電話</b><div>${h.phone||'尚未填寫'}</div></div></div></div><div class="action-stack"><a class="action-btn nav-action" href="${h.mapUrl||mapSearchUrl(h.name)}" target="_blank" rel="noopener">📍 開啟導航</a>${h.phone?`<a class="action-btn call-action" href="${telHref(h.phone)}">☎ 一鍵撥打</a>`:`<span class="action-btn disabled">☎ 尚未填電話</span>`}</div></article>`;
  }

  function driverCard(d){
    const name=d.driverName||'尚未填寫';
    return `<section class="tool-card card"><div class="tool-title"><span>🚐</span><h3>包車資訊</h3></div><div class="driver-box"><div class="driver-copy"><h4>${d.label||'包車司機'}</h4><div class="contact-line"><span>👤</span><div><b>司機姓名</b><div>${name}</div></div></div><div class="contact-line"><span>☎</span><div><b>電話</b><div>${d.phone||'尚未填寫'}</div></div></div>${d.whatsapp?`<div class="contact-line"><span>💬</span><div><b>WhatsApp</b><div>${d.whatsapp}</div></div></div>`:''}${d.line?`<div class="contact-line"><span>LINE</span><div><b>LINE</b><div>${d.line}</div></div></div>`:''}</div><div class="action-stack driver-actions">${d.phone?`<a class="action-btn call-action" href="${telHref(d.phone)}">☎ 一鍵撥打</a>`:`<span class="action-btn disabled">☎ 請先填電話</span>`}</div></div><div class="driver-note"><b>備註</b><div class="driver-note-grid"><span>車型：${d.vehicle||'尚未填寫'}</span><span>服務日期：${slashDate(d.serviceStart)} → ${slashDate(d.serviceEnd)}</span><span>接送資訊：${d.pickupInfo||'尚未填寫'}</span><span>其他：${d.note||'尚未填寫'}</span></div></div></section>`;
  }

  function emergencyCard(){
    const items=DATA.emergencyContacts.filter(x=>x.enabled).sort((a,b)=>a.sort-b.sort);
    return `<section class="tool-card card"><div class="tool-title"><span>☎️</span><h3>緊急聯絡</h3></div><div class="notice">保留真正會立即用到的緊急聯絡資訊，電話可直接呼叫手機撥號器。</div><div class="emergency-grid">${items.map(x=>`<article class="emergency-item"><div><h4>${x.label}</h4><div class="subtle">${x.description}</div>${x.phone?`<div class="emergency-phone">${x.phone}</div>`:`<div class="subtle">電話尚未填寫</div>`}</div>${x.phone?`<a class="action-btn call-action" href="${telHref(x.phone)}">☎ 一鍵撥打</a>`:`<span class="action-btn disabled">請先填電話</span>`}</article>`).join('')}</div></section>`;
  }

  function renderTools(){
    const rate = Number(localStorage.getItem('pq:vndRate') || 800);
    const driver = DATA.driverInfo.find(x=>x.enabled) || DATA.driverInfo[0];
    app.innerHTML=`<div class="page-title-row"><h2>工具</h2><span class="pill">旅行助手</span></div><p class="helper">把旅途中常用的資訊集中在同一頁。</p>
      <section class="tool-card card"><div class="tool-title"><span>💱</span><h3>匯率換算</h3></div><p>可自行調整匯率；預設僅為範例，不代表即時匯率。</p><div class="currency-grid"><div class="field"><label>TWD</label><input type="number" id="twdInput" value="1000"></div><div class="swap">⇄</div><div class="field"><label>VND</label><input type="number" id="vndInput" value="${1000*rate}"></div></div><div class="field" style="margin-top:10px"><label>每 1 TWD = 幾 VND</label><input type="number" id="rateInput" value="${rate}"></div></section>
      <section class="tool-card card"><div class="tool-title"><span>✈️</span><h3>航班資訊</h3></div><div class="small-grid"><div class="info-box"><strong>去程 10/18</strong><span class="subtle">20:00 抵達富國島</span></div><div class="info-box"><strong>回程 10/23</strong><span class="subtle">11:00 起飛返台</span></div></div></section>
      <section class="tool-card card"><div class="tool-title"><span>🛏️</span><h3>飯店資訊</h3></div><div class="hotel-list">${DATA.hotels.map(hotelCard).join('')}</div></section>
      ${driverCard(driver)}
      <section class="tool-card card"><div class="tool-title"><span>💬</span><h3>常用越南語</h3></div><div class="phrase-list"><div class="phrase"><b>Xin chào</b>你好</div><div class="phrase"><b>Cảm ơn</b>謝謝</div><div class="phrase"><b>Bao nhiêu tiền?</b>多少錢？</div></div></section>
      ${emergencyCard()}`;
  }

  function renderChecklist(){
    const saved=getChecks(); const rows=DATA.checklist.filter(i=>i.type===checklistType);
    app.innerHTML=`<div class="page-title-row"><h2>清單</h2><span class="pill">出發準備</span></div><p class="helper">整理行李、採買與待辦事項，避免遺漏。</p><div class="segmented">${['行李','採買','待辦'].map(t=>`<button class="seg-btn ${t===checklistType?'active':''}" data-type="${t}">${t}</button>`).join('')}</div><section class="check-card card">${rows.map(item=>{const checked=hasCloud()?Boolean(item.checked):(saved[item.id] ?? item.checked); return `<label class="check-row ${checked?'checked':''}"><input type="checkbox" data-check-id="${item.id}" ${checked?'checked':''}><span class="check-label">${item.item}</span><span class="assignee">${item.assignedTo||''}</span></label>`}).join('')}</section><section class="mini-card card" style="margin-top:12px"><h4>同步狀態</h4><div class="subtle">${hasCloud()?`Google 試算表多人同步 · ${cloudStatusText()}`:'目前使用這台裝置的本機儲存。可在「工具 → Google 試算表同步」設定。'}</div></section>`;
  }

  function render(){
    if(mapInstance){ try{mapInstance.remove();}catch(e){} mapInstance=null; }
    document.querySelectorAll('.nav-item').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.view===currentView));
    if(currentView==='today') renderToday();
    if(currentView==='map') renderMap();
    if(currentView==='itinerary') renderItinerary();
    if(currentView==='tools') renderTools();
    if(currentView==='checklist') renderChecklist();
    bindViewEvents();
  }

  function bindViewEvents(){
    document.querySelectorAll('.expand-btn').forEach(btn=>btn.addEventListener('click',()=>{ const card=btn.closest('.day-card'); card.classList.toggle('open'); btn.textContent=card.classList.contains('open')?'收合行程－':'展開行程＋'; }));
    document.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.jump)));
    document.querySelectorAll('.seg-btn').forEach(btn=>btn.addEventListener('click',()=>{checklistType=btn.dataset.type;localStorage.setItem('pq:checkType',checklistType);renderChecklist();bindViewEvents();}));
    document.querySelectorAll('[data-check-id]').forEach(cb=>cb.addEventListener('change',async()=>{
      const id=cb.dataset.checkId, checked=cb.checked;
      cb.closest('.check-row').classList.toggle('checked',checked);
      if(hasCloud()){
        cb.disabled=true;
        const ok=await updateChecklistCloud(id,checked);
        cb.disabled=false;
        if(ok){ setCheck(id,checked); showToast('已同步到 Google 試算表'); }
        else { cb.checked=!checked; cb.closest('.check-row').classList.toggle('checked',!checked); showToast('雲端更新失敗'); }
      }else{ setCheck(id,checked); }
    }));
    const twd=document.getElementById('twdInput'), vnd=document.getElementById('vndInput'), rate=document.getElementById('rateInput');
    if(twd&&vnd&&rate){ const recalc=()=>{const r=Number(rate.value)||0; vnd.value=Math.round((Number(twd.value)||0)*r); localStorage.setItem('pq:vndRate',String(r));}; twd.addEventListener('input',recalc); rate.addEventListener('input',recalc); vnd.addEventListener('input',()=>{const r=Number(rate.value)||1;twd.value=Math.round((Number(vnd.value)||0)/r);}); }
    document.getElementById('installBtn')?.addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;render();});
  }

  function navigate(view){ currentView=view; localStorage.setItem('pq:lastView',view); render(); window.scrollTo({top:0,behavior:'smooth'}); }
  document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.view)));
  window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();deferredInstallPrompt=e;if(currentView==='today')render();});
  window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;showToast('已安裝到主畫面');});
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.error));}
  render();
  if(hasCloud()){ fetchCloudData(false).then(ok=>{ if(ok) render(); }); }
})();
