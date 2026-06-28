
/*********************** EasyStore ES14 / V1857 Fix 5 ************************
  Fixes requested by Diaa:
  1) Client invoice menu closes after action/outside click.
  2) Stopped item can be activated again.
  3) Edit scrolls and clearly updates prices instead of adding confusion.
  4) Paper pack type: pack price / sheets count = cost per sheet.
  5) Dept invoice supports all department items via extra selector and multiple rows.
****************************************************************************/
(function(){
  'use strict';
  window.EASYSTORE_ES14_FIX5 = true;
  var qs = new URLSearchParams(location.search);
  function $(id){ return document.getElementById(id); }
  function txt(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function norm(v){ return txt(v).toLowerCase().replace(/[إأآا]/g,'ا').replace(/[ى]/g,'ي').replace(/[ةه]/g,'ه').replace(/[ؤ]/g,'و').replace(/[ئ]/g,'ي'); }
  function num(v){ var n=parseFloat(String(v||'').replace(/[٬,]/g,'.').replace(/[^0-9.\-]/g,'')); return isFinite(n)?n:0; }
  function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function set(id,v){ var el=$(id); if(el) el.value = v==null?'':String(v); }
  function toast(t,bad){ var m=$('mainMsg'); if(m){m.textContent=t||''; m.className='msg '+(bad?'bad':''); setTimeout(function(){ if(m.textContent===t) m.textContent=''; },4500);} else if(t){ console.log('[ES14Fix5]', t); } }
  function userData(){
    var hand={}; try{hand=JSON.parse(localStorage.getItem('MATBAGY_EMPLOYEE_SSO')||'{}');}catch(e){}
    var hp=hand.params||{}, hu=hand.user||{};
    return {name:qs.get('name')||qs.get('username')||hp.name||hp.username||hu.name||hu.username||'', username:qs.get('username')||qs.get('name')||hp.username||hp.name||hu.username||hu.name||'', token:qs.get('token')||hp.token||hu.token||'', mode:qs.get('mode')||hp.mode||'', department:qs.get('department')||hp.department||''};
  }
  function userDept(){ var u=userData(); var k=norm([u.name,u.username,u.mode,u.department].join(' ')); if(/جابر|gaber|jaber|laser|ليزر/.test(k)) return 'ليزر'; if(/وائل|wael|print|طباعة/.test(k)) return 'طباعة'; return u.department||''; }
  function isAdmin(){ var u=userData(); return /ضياء|diaa|admin|full|kitchen/.test(norm([u.name,u.username,u.mode,u.department].join(' '))); }
  function api(action, data){
    return new Promise(function(resolve,reject){
      var base=txt(window.TREND_API_URL||''); if(!base){reject(new Error('TREND_API_URL missing'));return;}
      var cb='ES14F5_'+Date.now()+'_'+Math.floor(Math.random()*99999);
      var u=userData(); var p=new URLSearchParams(Object.assign({action:action,callback:cb,username:u.username||u.name,name:u.name||u.username,token:u.token||'',_ts:Date.now()},data||{}));
      var s=document.createElement('script'), done=false; function clean(){ if(done)return; done=true; try{delete window[cb];}catch(e){window[cb]=undefined;} if(s.parentNode)s.parentNode.removeChild(s); }
      window[cb]=function(r){clean(); resolve(r||{});}; s.onerror=function(){clean(); reject(new Error('server'));}; s.src=base+(base.indexOf('?')<0?'?':'&')+p.toString(); document.body.appendChild(s); setTimeout(function(){ if(!done){clean(); reject(new Error('timeout'));}},20000);
    });
  }

  function closeMenus(){
    ['clientInvoiceMenu','saCustomerDrop'].forEach(function(id){ var el=$(id); if(el){ el.classList.add('hidden'); if(id==='saCustomerDrop') el.innerHTML=''; }});
    document.querySelectorAll('.clientInvoiceMenu,.dropdown-menu,.floating-menu').forEach(function(el){ if(/invoice|فاتورة|menu/i.test((el.id||'')+' '+(el.className||''))) el.classList.add('hidden'); });
  }
  window.toggleClientInvoiceMenu=function(ev){ if(ev){ev.preventDefault(); ev.stopPropagation();} var m=$('clientInvoiceMenu'); if(!m)return false; var open=m.classList.contains('hidden'); closeMenus(); if(open)m.classList.remove('hidden'); return false; };
  document.addEventListener('click',function(ev){ var t=ev.target; if(t&&t.closest&&t.closest('#clientInvoiceMenu,.clientInvoiceMenu,[onclick*="toggleClientInvoiceMenu"]'))return; closeMenus();},true);
  document.addEventListener('keydown',function(ev){ if(ev.key==='Escape')closeMenus();},true);

  function decorateItemRows(){
    document.querySelectorAll('table tr').forEach(function(tr){
      var rowTxt=norm(tr.textContent||''); if(!/موقوف|متوقف/.test(rowTxt))return;
      var btn=Array.from(tr.querySelectorAll('button')).find(function(b){return /إيقاف|ايقاف|archiveItem/.test((b.textContent||'')+' '+(b.getAttribute('onclick')||''));});
      if(!btn || btn.dataset.fix5Activate)return;
      var oc=btn.getAttribute('onclick')||''; var m=oc.match(/archiveItem\((\d+)\)/); if(!m)return; var i=m[1];
      btn.dataset.fix5Activate='1'; btn.textContent='تفعيل'; btn.classList.add('v1857-activate-btn'); btn.onclick=function(ev){ ev&&ev.preventDefault(); if(!confirm('تفعيل الصنف مرة أخرى؟'))return false; if(window.ES27&&ES27.editItem){ES27.editItem(Number(i)); setTimeout(function(){ if(window.ES27&&ES27.saveItem)ES27.saveItem(); },80);} return false; };
    });
  }

  function patchEditActions(){
    if(!window.ES27 || window.ES27.__fix5Patched)return;
    var oldEdit=ES27.editItem, oldSave=ES27.saveItem, oldGo=ES27.go;
    ES27.editItem=function(i){ var r=oldEdit&&oldEdit.call(ES27,i); setTimeout(function(){ var first=document.querySelector('#itName,#rawName,#recName'); if(first){ first.scrollIntoView({behavior:'smooth',block:'center'}); first.focus(); } document.querySelectorAll('button').forEach(function(b){ if(/حفظ\s*\/\s*تحديث الصنف|حفظ\s*\/\s*تحديث الخامة/.test(b.textContent||'')) b.textContent='تحديث البيانات'; }); toast('تم تحميل بيانات الصنف للتعديل. عدل السعر ثم اضغط تحديث البيانات.'); },30); return r; };
    ES27.saveItem=function(){ var r=oldSave&&oldSave.call(ES27); setTimeout(decorateItemRows,300); return r; };
    ES27.go=function(t){ closeMenus(); var r=oldGo&&oldGo.call(ES27,t); setTimeout(applyFixes,250); return r; };
    ES27.__fix5Patched=true;
  }

  function ensurePaperPackUI(){
    var kind=$('rawKind'); if(!kind)return;
    if(!Array.from(kind.options).some(function(o){return o.value==='paper pack'||/باكيت/.test(o.textContent||'');})){ var op=document.createElement('option'); op.value='paper pack'; op.textContent='paper pack / باكيت ورق'; kind.appendChild(op); }
    if(!$('fix5PaperPackBox')){
      var box=document.createElement('div'); box.id='fix5PaperPackBox'; box.className='v1857-fix5-paper-pack hidden';
      box.innerHTML='<b>حساب باكيت الورق</b><div class="grid"><div class="field"><label>سعر الباكو</label><input id="rawPackPrice" type="number"></div><div class="field"><label>عدد الورق في الباكو</label><input id="rawPackSheets" type="number" placeholder="50 أو 100"></div><div class="field"><label>تكلفة الورقة</label><input id="rawSheetCost" type="number" readonly></div><div class="field"><label>مقاس الورقة</label><input id="rawPaperSize" placeholder="A4 / A3 / 30x40"></div></div><div class="hint">مثال: باكو 250 جنيه ÷ 50 ورقة = 5 جنيه للورقة. يتم نسخ تكلفة الورقة في خانة سعر/تكلفة الأصل تلقائيًا.</div>';
      var parent=kind.closest('.grid')||kind.parentNode.parentNode; parent.parentNode.insertBefore(box,parent.nextSibling);
      ['rawPackPrice','rawPackSheets'].forEach(function(id){ $(id).addEventListener('input',calcPaperPack); });
      kind.addEventListener('change',togglePaperPack);
    }
    togglePaperPack();
  }
  function togglePaperPack(){ var show=/paper pack|باكيت/.test(txt(($('rawKind')||{}).value)); var box=$('fix5PaperPackBox'); if(box)box.classList.toggle('hidden',!show); if(show)calcPaperPack(); }
  function calcPaperPack(){ var price=num(($('rawPackPrice')||{}).value), sheets=num(($('rawPackSheets')||{}).value); var cost=price&&sheets?price/sheets:0; set('rawSheetCost',cost?cost.toFixed(4):''); if(cost)set('rawCost',cost.toFixed(4)); }

  var deptRows=[]; var catalog=[];
  function itemName(r){return txt(r.itemName||r.templateName||r.materialName||r.name||r['اسم البند']||r['اسم الصنف']||r['اسم الخامة']||'');}
  function itemDept(r){return txt(r.department||r.dept||r['القسم']||'عام');}
  function itemSale(r){return num(r.salePrice||r.systemSale||r.price||r['سعر بيع رسمي']||r['سعر بيع مقترح']||0);}
  function active(r){return !/لا|موقوف|متوقف|inactive/.test(txt(r.active||r['مفعل']||'نعم'));}
  async function loadDeptCatalog(){ try{ var res=await api('getAccounting',{}); catalog=(res.templates||[]).concat(res.materials||[]).filter(function(r){ var d=itemDept(r), ud=userDept(); return active(r)&&itemName(r)&&(!ud||d===ud||d==='مشترك'||d==='عام');}); renderDeptCatalog(); }catch(e){} }
  function renderDeptCatalog(){ var sel=$('fix5DeptItemSelect'); if(!sel)return; sel.innerHTML='<option value="">اختار من كل أصناف القسم</option>'+catalog.map(function(r,i){return '<option value="'+i+'">'+esc(itemName(r)+' — '+itemDept(r)+(itemSale(r)?' — '+itemSale(r)+' ج':''))+'</option>';}).join(''); }
  function ensureDeptRowsUI(){
    var dl=$('dlItem'); if(!dl||$('fix5DeptRowsBox'))return;
    var wrap=document.createElement('div'); wrap.id='fix5DeptRowsBox'; wrap.className='v1857-fix5-row-panel';
    wrap.innerHTML='<h4>صفوف فاتورة القسم</h4><div class="field"><label>كل أصناف القسم</label><select id="fix5DeptItemSelect"><option>جاري تحميل الأصناف...</option></select></div><div id="fix5DeptRowsList" class="empty">لا توجد صفوف مضافة.</div><div class="v1857-fix5-row-actions"><button type="button" id="fix5DeptAddRow" class="btn secondary">إضافة صف</button><button type="button" id="fix5DeptSaveRows" class="btn">تسجيل كل الصفوف</button><button type="button" id="fix5DeptClearRows" class="btn danger">تفريغ</button></div>';
    var card=dl.closest('.card')||dl.parentNode; card.appendChild(wrap);
    $('fix5DeptItemSelect').addEventListener('change',function(){ var r=catalog[num(this.value)]; if(!r)return; set('dlItem',itemName(r)); set('dlItemDept',itemDept(r)); set('dlSystemSale',itemSale(r).toFixed(2)); set('dlSale',itemSale(r).toFixed(2)); var sh=$('dlSharedLine'); if(sh){sh.checked=/مشترك|عام|shared/.test(norm(itemDept(r)));} if(window.ES27&&ES27.calcDept)ES27.calcDept(); });
    $('fix5DeptAddRow').onclick=addDeptRow; $('fix5DeptSaveRows').onclick=saveDeptRows; $('fix5DeptClearRows').onclick=function(){deptRows=[]; renderDeptRows();};
    loadDeptCatalog();
  }
  function addDeptRow(){ var r={item:txt(($('dlItem')||{}).value), dept:txt(($('dlItemDept')||{}).value)||userDept(), qty:num(($('dlQty')||{}).value)||1, sys:num(($('dlSystemSale')||{}).value), sale:num(($('dlSale')||{}).value), notes:txt(($('dlNotes')||{}).value), shared:!!(($('dlSharedLine')||{}).checked)}; if(!r.item||!r.sale){toast('اختار الصنف واكتب سعر البيع قبل إضافة الصف.',true);return;} deptRows.push(r); renderDeptRows(); toast('تم إضافة الصف.'); }
  function renderDeptRows(){ var box=$('fix5DeptRowsList'); if(!box)return; if(!deptRows.length){box.className='empty';box.innerHTML='لا توجد صفوف مضافة.';return;} box.className=''; var total=deptRows.reduce(function(s,r){return s+r.qty*r.sale;},0); box.innerHTML='<table class="v1857-fix5-row-table"><thead><tr><th>الصنف</th><th>قسم الصنف</th><th>كمية</th><th>سعر</th><th>إجمالي</th><th>حذف</th></tr></thead><tbody>'+deptRows.map(function(r,i){return '<tr><td>'+esc(r.item)+'</td><td>'+esc(r.dept)+'</td><td>'+r.qty+'</td><td>'+r.sale+'</td><td>'+(r.qty*r.sale).toFixed(2)+'</td><td><button class="btn small danger" onclick="EASYSTORE_FIX5_REMOVE_DEPT_ROW('+i+')">حذف</button></td></tr>';}).join('')+'</tbody></table><b>الإجمالي: '+total.toFixed(2)+' ج</b>'; }
  window.EASYSTORE_FIX5_REMOVE_DEPT_ROW=function(i){deptRows.splice(i,1);renderDeptRows();};
  async function saveDeptRows(){ if(!deptRows.length){toast('أضف صف واحد على الأقل.',true);return;} var rows=deptRows.slice(); for(var i=0;i<rows.length;i++){ var r=rows[i]; set('dlItem',r.item); set('dlItemDept',r.dept); set('dlQty',r.qty); set('dlSystemSale',r.sys); set('dlSale',r.sale); set('dlNotes',r.notes); var sh=$('dlSharedLine'); if(sh)sh.checked=!!r.shared; if(window.ES27&&ES27.saveDeptLine)ES27.saveDeptLine(); await new Promise(function(res){setTimeout(res,650);}); } deptRows=[]; toast('تم تسجيل كل الصفوف.'); }

  function applyFixes(){ patchEditActions(); decorateItemRows(); ensurePaperPackUI(); ensureDeptRowsUI(); closeMenus(); }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(applyFixes,250);setTimeout(applyFixes,1200);});
  setInterval(applyFixes,2500);
})();
