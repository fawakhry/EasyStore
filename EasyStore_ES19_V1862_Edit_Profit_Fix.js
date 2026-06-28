
/*********************** EasyStore ES19 / V1862 - Edit + Profit Formula Fix ************************
  - إصلاح قوي لزر تعديل الأصناف والخامات بدون الاعتماد على كود V13 القديم.
  - منع خطأ slice/null عند الضغط على تعديل.
  - تحميل بيانات الصف في شاشة تعديل واضحة.
  - إصلاح حساب الربح: الربح = البيع - التكلفة، ونسبة الربح = الربح ÷ البيع × 100.
  - لو التكلفة المحسوبة صفر وتكلفة المكون موجودة، يتم استخدامها كتكلفة حقيقية.
**********************************************************************************************/
(function(){
  'use strict';
  window.EASYSTORE_VERSION = 'ES19 V1862 Edit + Profit Fix';
  window.EASYSTORE_ES19_V1862_EDIT_PROFIT_FIX = true;

  var qs = new URLSearchParams(location.search || '');
  function $(id){ return document.getElementById(id); }
  function text(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function norm(v){ return text(v).toLowerCase().replace(/[إأآا]/g,'ا').replace(/[ى]/g,'ي').replace(/[ةه]/g,'ه').replace(/[ؤ]/g,'و').replace(/[ئ]/g,'ي'); }
  function num(v){
    var s = String(v == null ? '' : v)
      .replace(/[٠-٩]/g,function(d){return {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'}[d]||d;})
      .replace(/[٬,]/g,'.').replace(/[^0-9.\-]/g,'');
    var n = parseFloat(s); return isFinite(n) ? n : 0;
  }
  function money(n){ n=num(n); return (Math.round(n*100)/100).toLocaleString('ar-EG',{maximumFractionDigits:2}) + ' ج'; }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function api(action,data){
    return new Promise(function(resolve,reject){
      var base = text(window.TREND_API_URL || window.API_URL || '');
      if(!base){ reject(new Error('TREND_API_URL missing')); return; }
      var cb = 'ES19_' + Date.now() + '_' + Math.floor(Math.random()*99999);
      var u = userData();
      var p = new URLSearchParams(Object.assign({action:action,callback:cb,username:u.username||u.name,name:u.name||u.username,token:u.token||'',_ts:Date.now()}, data || {}));
      var s = document.createElement('script'), done=false;
      function clean(){ if(done) return; done=true; try{delete window[cb];}catch(e){window[cb]=undefined;} if(s.parentNode) s.parentNode.removeChild(s); }
      window[cb] = function(r){ clean(); resolve(r || {}); };
      s.onerror = function(){ clean(); reject(new Error('server')); };
      s.src = base + (base.indexOf('?') < 0 ? '?' : '&') + p.toString();
      document.body.appendChild(s);
      setTimeout(function(){ if(!done){ clean(); reject(new Error('timeout')); } }, 25000);
    });
  }
  function userData(){
    var hand={}; try{ hand = JSON.parse(localStorage.getItem('MATBAGY_EMPLOYEE_SSO') || '{}'); }catch(e){}
    var hp=hand.params||{}, hu=hand.user||{};
    return {
      name: qs.get('name') || qs.get('username') || hp.name || hp.username || hu.name || hu.username || '',
      username: qs.get('username') || qs.get('name') || hp.username || hp.name || hu.username || hu.name || '',
      token: qs.get('token') || hp.token || hu.token || '',
      mode: qs.get('mode') || hp.mode || '',
      department: qs.get('department') || hp.department || ''
    };
  }
  function toast(msg,bad){
    var m = $('es19Msg') || $('es16Msg') || document.querySelector('.msg');
    if(m){ m.textContent = msg || ''; m.classList.toggle('error',!!bad); m.classList.toggle('ok',!!msg&&!bad); }
    else if(msg){ alert(msg); }
  }

  var style = document.createElement('style');
  style.textContent = '.es19-panel{background:var(--card,#fff);border:1px solid var(--line,#d8e4ea);border-radius:18px;padding:16px;margin:14px 0;box-shadow:0 12px 28px #0001}.es19-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.es19-grid .wide{grid-column:span 2}.es19-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.es19-btn{background:#eef6f5;color:#0f6f5c;border:1px solid #d2e8e4;border-radius:12px;padding:9px 13px;cursor:pointer;font-weight:800}.es19-btn.primary{background:#0f8a70;color:#fff;border-color:#0f8a70}.es19-btn.danger{background:#d64545;color:#fff;border-color:#d64545}.es19-mini{font-size:12px;color:#66788a;line-height:1.7}.es19-editing-row{outline:3px solid rgba(15,138,112,.22);outline-offset:-3px}@media(max-width:900px){.es19-grid{grid-template-columns:1fr}.es19-grid .wide{grid-column:auto}}';
  document.head.appendChild(style);

  function setVersion(){
    document.title = 'إيزي ستور مطبعجي ES19 V1862';
    document.querySelectorAll('.version-badge,.version,.app-version').forEach(function(el){ el.textContent = 'ES19 V1862 Edit + Profit Fix'; });
    var candidates = Array.from(document.querySelectorAll('h1,h2,.brand h1,.top h1,.topbar h2'));
    candidates.forEach(function(el){
      if(/إيزي|ستور|برنامج الحسابات|Easy/i.test(text(el.textContent))){
        el.textContent = 'إيزي ستور مطبعجي - برنامج الحسابات ES19';
      }
    });
  }

  window.addEventListener('error', function(ev){
    var msg = String((ev && ev.message) || '');
    if(/Cannot read properties of null.*slice|reading 'slice'|reading "slice"/.test(msg)){
      toast('تم منع خطأ التعديل القديم. استخدم لوحة تعديل ES19 بالأعلى.', true);
      if(ev && ev.preventDefault) ev.preventDefault();
      return true;
    }
  }, true);

  function tableHeaders(table){
    var heads = Array.from(table.querySelectorAll('thead th'));
    if(!heads.length){
      var first = table.querySelector('tr');
      if(first) heads = Array.from(first.children).filter(function(c){ return /TH/i.test(c.tagName) || /الصنف|القسم|التكلفة|البيع|الربح|الحالة|إجراء/.test(text(c.textContent)); });
    }
    var arr = heads.map(function(h){ return text(h.textContent); });
    return arr;
  }
  function colIndex(headers, re){
    for(var i=0;i<headers.length;i++){ if(re.test(norm(headers[i]))) return i; }
    return -1;
  }
  function rowCells(row){ return Array.from(row.children || []).filter(function(c){ return /TD|TH/.test(c.tagName); }); }
  function rowFromButton(btn){ return btn && btn.closest ? btn.closest('tr') : null; }
  function tableFromRow(row){ return row && row.closest ? row.closest('table') : null; }
  function isItemsTable(table){
    if(!table) return false;
    var h = norm(tableHeaders(table).join(' '));
    var ctx = norm(text((table.closest('section,.card,main,.content') || document.body).textContent).slice(0,1200));
    return (/الصنف|اسم الصنف|الخامة|اسم الخامه/.test(h) && /التكلفه|التكلفة|البيع|الربح|الحاله|الحالة/.test(h)) || (/الاصناف|الأصناف|مطبخ الحسابات|خامة|خامه/.test(ctx) && !/حساب العملاء|كشف حساب|الخزنة|الموردين/.test(ctx));
  }
  function isEditButton(btn){ return btn && /^(تعديل|✏️\s*تعديل)$/.test(text(btn.textContent)); }
  function isActionButton(btn){ var t=text(btn&&btn.textContent); return /^(تعديل|تفعيل|إيقاف|ايقاف)$/.test(t); }

  function readRow(btn){
    var row = rowFromButton(btn), table = tableFromRow(row), cells = rowCells(row), headers = tableHeaders(table);
    var itemI = colIndex(headers,/^(الصنف|اسم الصنف|اسم البند|الخامة|اسم الخامه)/);
    var deptI = colIndex(headers,/^(القسم)/);
    var costI = colIndex(headers,/(^التكلفه|^التكلفة|تكلفه محسوبه|تكلفة محسوبة)/);
    var saleI = colIndex(headers,/(^البيع|سعر البيع|سعر بيع)/);
    var profitI = colIndex(headers,/(مجمل الربح|الربح)/);
    var percentI = colIndex(headers,/(نسبه الربح|نسبة الربح|هامش)/);
    var statusI = colIndex(headers,/(الحاله|الحالة)/);
    function cell(i){ return i>=0 && cells[i] ? text(cells[i].textContent) : ''; }
    var vals = cells.map(function(c){return text(c.textContent).replace(/تعديل|إيقاف|ايقاف|تفعيل|حذف/g,'').trim();}).filter(Boolean);
    var name = cell(itemI);
    if(!name){
      name = vals.find(function(v){ return v && !/^(طباعة|ليزر|مشترك|عام|مفعل|موقوف|نعم|لا)$/.test(v) && !/^[-+]?\d/.test(v) && !/^ج$/.test(v); }) || '';
    }
    var dept = cell(deptI) || vals.find(function(v){return /طباعة|ليزر|مشترك|عام/.test(v);}) || 'طباعة';
    var cost = num(cell(costI));
    var sale = num(cell(saleI));
    var status = cell(statusI) || (text(row&&row.textContent).indexOf('موقوف')>=0?'موقوف':'مفعل');
    var ctx = norm(text((table && table.closest('section,.card,main,.content') || document.body).textContent).slice(0,1500));
    var kind = /خامات|خامة|خامه|اسم الخامه/.test(ctx) && !/الأصناف|الاصناف|اسم الصنف/.test(ctx) ? 'material' : 'template';
    return {row:row,table:table,cells:cells,headers:headers,name:name,department:dept,cost:cost,sale:sale,status:status,kind:kind,index:{cost:costI,sale:saleI,profit:profitI,percent:percentI,item:itemI,dept:deptI,status:statusI}};
  }

  function findVisibleInputByLabel(re){
    var labels = Array.from(document.querySelectorAll('label,b,span,div,th,td')).filter(function(el){return re.test(norm(el.textContent || ''));});
    for(var i=0;i<labels.length;i++){
      var lab=labels[i];
      var parent=lab.parentElement;
      var inp = null;
      if(parent) inp = parent.querySelector('input,select,textarea');
      if(!inp && lab.nextElementSibling && /INPUT|SELECT|TEXTAREA/.test(lab.nextElementSibling.tagName)) inp = lab.nextElementSibling;
      if(inp && inp.offsetParent !== null) return inp;
    }
    return null;
  }
  function visibleComponentCost(){
    var inp = findVisibleInputByLabel(/تكلفه المكون|تكلفة المكون/);
    return inp ? num(inp.value) : 0;
  }
  function visibleComputedCost(){
    var inp = findVisibleInputByLabel(/تكلفه محسوبه|تكلفة محسوبة/);
    return inp ? num(inp.value) : 0;
  }
  function syncCostInputs(){
    var comp = visibleComponentCost();
    var calcInp = findVisibleInputByLabel(/تكلفه محسوبه|تكلفة محسوبة/);
    if(calcInp && comp > 0 && num(calcInp.value) === 0){
      calcInp.value = (Math.round(comp*10000)/10000).toString();
      calcInp.dispatchEvent(new Event('input',{bubbles:true}));
      calcInp.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function ensureEditPanel(){
    var p = $('es19ItemEditPanel');
    if(p) return p;
    var host = document.querySelector('.content') || document.querySelector('main') || document.body;
    p = document.createElement('section');
    p.id = 'es19ItemEditPanel';
    p.className = 'es19-panel hidden';
    p.innerHTML = '<h3>تعديل الصنف / الخامة - ES19</h3><div id="es19Msg" class="msg"></div><div class="es19-grid"><input id="es19EditKind" type="hidden"><input id="es19OldName" type="hidden"><div class="wide"><label>الاسم</label><input id="es19EditName"></div><div><label>القسم</label><select id="es19EditDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option><option>عام</option></select></div><div><label>التكلفة الصحيحة</label><input id="es19EditCost" type="number" step="0.0001"></div><div><label>سعر البيع</label><input id="es19EditSale" type="number" step="0.0001"></div><div><label>مجمل الربح</label><input id="es19EditProfit" readonly></div><div><label>نسبة الربح من البيع</label><input id="es19EditMargin" readonly></div><div><label>الحالة</label><select id="es19EditActive"><option value="نعم">مفعل</option><option value="لا">موقوف</option></select></div><div class="wide"><label>ملاحظات</label><input id="es19EditNotes"></div></div><div class="es19-mini">المعادلة: مجمل الربح = سعر البيع - التكلفة. نسبة الربح = مجمل الربح ÷ سعر البيع × 100.</div><div class="es19-actions"><button id="es19SaveItemEdit" class="es19-btn primary">تحديث الصنف</button><button id="es19CancelItemEdit" class="es19-btn">إغلاق</button></div>';
    host.prepend(p);
    $('es19CancelItemEdit').onclick = function(){ p.classList.add('hidden'); clearEditingRows(); };
    $('es19SaveItemEdit').onclick = saveEdit;
    ['es19EditCost','es19EditSale'].forEach(function(id){ $(id).addEventListener('input', updateEditMath); });
    return p;
  }
  var currentRow = null;
  function clearEditingRows(){ document.querySelectorAll('.es19-editing-row').forEach(function(r){r.classList.remove('es19-editing-row');}); }
  function updateEditMath(){
    var sale = num($('es19EditSale').value), cost = num($('es19EditCost').value);
    var profit = sale - cost;
    var margin = sale ? (profit / sale * 100) : 0;
    $('es19EditProfit').value = Math.round(profit*100)/100;
    $('es19EditMargin').value = (Math.round(margin*100)/100) + '%';
  }
  function openEdit(btn){
    var info = readRow(btn);
    var p = ensureEditPanel();
    if(!info.name){ toast('لم أتعرف على اسم الصنف من الصف.', true); return false; }
    syncCostInputs();
    var fallbackCost = visibleComputedCost() || visibleComponentCost();
    var cost = info.cost || fallbackCost || 0;
    $('es19EditKind').value = info.kind;
    $('es19OldName').value = info.name;
    $('es19EditName').value = info.name;
    $('es19EditDept').value = info.department || 'طباعة';
    $('es19EditCost').value = cost || '';
    $('es19EditSale').value = info.sale || '';
    $('es19EditActive').value = /موقوف|لا/.test(info.status) ? 'لا' : 'نعم';
    $('es19EditNotes').value = '';
    updateEditMath();
    clearEditingRows();
    currentRow = info.row;
    if(currentRow) currentRow.classList.add('es19-editing-row');
    p.classList.remove('hidden');
    try{ p.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
    toast('تم فتح الصنف للتعديل بدون خطأ. راجع التكلفة وسعر البيع ثم اضغط تحديث.', false);
    return false;
  }
  async function saveEdit(){
    try{
      var payload = {
        kind: $('es19EditKind').value,
        oldName: $('es19OldName').value,
        name: $('es19EditName').value,
        itemName: $('es19EditName').value,
        materialName: $('es19EditName').value,
        department: $('es19EditDept').value,
        cost: $('es19EditCost').value,
        unitCost: $('es19EditCost').value,
        salePrice: $('es19EditSale').value,
        active: $('es19EditActive').value,
        notes: $('es19EditNotes').value
      };
      var r = await api('updateAccountingItemV1859', payload);
      toast((r && r.message) || '', !(r && r.success));
      if(r && r.success){
        if(currentRow) updateRowAfterEdit(currentRow, payload);
        recalcProfitTables();
        setTimeout(function(){ location.reload(); }, 700);
      }
    }catch(e){ toast('تعذر تحديث الصنف: ' + (e && e.message ? e.message : 'راجع Apps Script'), true); }
  }
  function updateRowAfterEdit(row,payload){
    var table=tableFromRow(row), headers=tableHeaders(table), cells=rowCells(row);
    var itemI=colIndex(headers,/^(الصنف|اسم الصنف|اسم البند|الخامة|اسم الخامه)/);
    var deptI=colIndex(headers,/^(القسم)/);
    var costI=colIndex(headers,/(^التكلفه|^التكلفة|تكلفه محسوبه|تكلفة محسوبة)/);
    var saleI=colIndex(headers,/(^البيع|سعر البيع|سعر بيع)/);
    var statusI=colIndex(headers,/(الحاله|الحالة)/);
    if(cells[itemI]) cells[itemI].textContent = payload.name;
    if(cells[deptI]) cells[deptI].textContent = payload.department;
    if(cells[costI]) cells[costI].textContent = money(payload.cost);
    if(cells[saleI]) cells[saleI].textContent = money(payload.salePrice);
    if(cells[statusI]) cells[statusI].textContent = payload.active === 'نعم' ? 'مفعل' : 'موقوف';
  }

  function recalcProfitTables(){
    syncCostInputs();
    document.querySelectorAll('table').forEach(function(table){
      if(!isItemsTable(table)) return;
      var headers=tableHeaders(table);
      var costI=colIndex(headers,/(^التكلفه|^التكلفة|تكلفه محسوبه|تكلفة محسوبة)/);
      var saleI=colIndex(headers,/(^البيع|سعر البيع|سعر بيع)/);
      var profitI=colIndex(headers,/(مجمل الربح|الربح)/);
      var percentI=colIndex(headers,/(نسبه الربح|نسبة الربح|هامش)/);
      if(saleI<0 || profitI<0) return;
      Array.from(table.querySelectorAll('tbody tr')).forEach(function(row){
        var cells=rowCells(row); if(!cells.length) return;
        var sale = num(cells[saleI] && cells[saleI].textContent);
        var cost = costI>=0 ? num(cells[costI] && cells[costI].textContent) : 0;
        if(cost === 0){
          // لو الصف الجاري هو نفس الصف المفتوح للتعديل، استخدم تكلفة المكون/التكلفة الظاهرة في الفورم.
          if(row === currentRow){ cost = num($('es19EditCost') && $('es19EditCost').value) || visibleComputedCost() || visibleComponentCost() || 0; }
        }
        var profit = sale - cost;
        var margin = sale ? (profit / sale * 100) : 0;
        if(cells[profitI]) cells[profitI].textContent = money(profit);
        if(cells[percentI]) cells[percentI].textContent = (Math.round(margin*10)/10).toLocaleString('ar-EG') + '%';
      });
    });
  }

  function intercept(ev){
    var btn = ev.target && ev.target.closest && ev.target.closest('button,a');
    if(!btn || !isActionButton(btn)) return;
    var row = rowFromButton(btn), table = tableFromRow(row);
    if(!isItemsTable(table)) return;
    if(isEditButton(btn)){
      ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      openEdit(btn); return false;
    }
  }
  document.addEventListener('click', intercept, true);
  document.addEventListener('mousedown', intercept, true);
  document.addEventListener('pointerdown', intercept, true);

  function bindDirectButtons(){
    document.querySelectorAll('table button, table a').forEach(function(btn){
      if(btn.dataset.es19Bound) return;
      var row=rowFromButton(btn), table=tableFromRow(row);
      if(!isItemsTable(table) || !isEditButton(btn)) return;
      btn.dataset.es19Bound='1';
      btn.onclick = function(ev){ if(ev){ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();} return openEdit(btn); };
    });
  }

  function boot(){ setVersion(); bindDirectButtons(); recalcProfitTables(); }
  document.addEventListener('DOMContentLoaded', boot);
  setTimeout(boot, 300);
  setTimeout(boot, 1200);
  setInterval(function(){ setVersion(); bindDirectButtons(); recalcProfitTables(); }, 2500);
})();
