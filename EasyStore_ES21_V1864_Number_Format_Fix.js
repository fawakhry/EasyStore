
/*********************** EasyStore ES16 / V1859 - Accounting Manager Core ************************
  مدير حسابات مطبعجي - ES18 V1861:
  - إصلاح تفعيل/تعديل الأصناف والخامات.
  - مسح كل الخامات لضياء فقط مع نسخة احتياطية.
  - صفحة حسابات العملاء والموردين + خزنة + قفلة اليوم + سجل مراجعة.
  - تجهيز رسالة واتساب تلقائية/يدوية برابط فواتير العميل بعد تقفيل الفاتورة.
  - تحميل العميل في فاتورة المبيعات من قاعدة العملاء.
**********************************************************************************************/
(function(){
  'use strict';
  window.EASYSTORE_VERSION='ES18 V1861 Error Fix + Zero Reset';
  window.EASYSTORE_ES16_V1859_ACCOUNTING_MANAGER_CORE=true;
  window.EASYSTORE_ES17_V1860_UI_THEME=true;
  window.EASYSTORE_ES18_V1861_ERROR_FIX=true;
  var qs=new URLSearchParams(location.search);
  function $(id){return document.getElementById(id);} function txt(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function norm(v){return txt(v).toLowerCase().replace(/[إأآا]/g,'ا').replace(/[ى]/g,'ي').replace(/[ةه]/g,'ه').replace(/[ؤ]/g,'و').replace(/[ئ]/g,'ي');}
  function num(v){var n=parseFloat(String(v||'').replace(/[٬,]/g,'.').replace(/[^0-9.\-]/g,''));return isFinite(n)?n:0;} function money(v){return (Math.round(num(v)*100)/100).toLocaleString('ar-EG')+' ج';}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function safeText(el){return txt(el && typeof el.textContent==='string' ? el.textContent : '');}
  function ctxText(el,n){return safeText(el).slice(0,n||400);}
  function isAccountingKitchenContext(el){var t=norm(ctxText(el.closest&&el.closest('section,.card,.content,main')||document.body,500));return /اصناف|الأصناف|الصنف|خامات|خامة|مطبخ|بنود|بند ثابت|مواد|item|material|kitchen/.test(t) && !/حساب العملاء|حسابات العملاء|كشف حساب|الخزنة|الموردين/.test(t);}
  function userData(){var hand={};try{hand=JSON.parse(localStorage.getItem('MATBAGY_EMPLOYEE_SSO')||'{}');}catch(e){}var hp=hand.params||{},hu=hand.user||{};return {name:qs.get('name')||qs.get('username')||hp.name||hp.username||hu.name||hu.username||'',username:qs.get('username')||qs.get('name')||hp.username||hp.name||hu.username||hu.name||'',token:qs.get('token')||hp.token||hu.token||'',mode:qs.get('mode')||hp.mode||'',department:qs.get('department')||hp.department||''};}
  function isAdmin(){var u=userData(),k=norm([u.name,u.username,u.mode,u.department].join(' '));return /ضياء|diaa|admin|full|kitchen/.test(k);} function isFinal(){var u=userData(),k=norm([u.name,u.username,u.mode,u.department].join(' '));return /رحمه|رحمة|rahma|ريفان|ريڤان|revan|rivan|final|ضياء|diaa|admin|full/.test(k);} 
  function api(action,data){return new Promise(function(resolve,reject){var base=txt(window.TREND_API_URL||'');if(!base){reject(new Error('TREND_API_URL missing'));return;}var cb='ES16_'+Date.now()+'_'+Math.floor(Math.random()*99999);var u=userData();var p=new URLSearchParams(Object.assign({action:action,callback:cb,username:u.username||u.name,name:u.name||u.username,token:u.token||'',_ts:Date.now()},data||{}));var s=document.createElement('script'),done=false;function clean(){if(done)return;done=true;try{delete window[cb];}catch(e){window[cb]=undefined;}if(s.parentNode)s.parentNode.removeChild(s);}window[cb]=function(r){clean();resolve(r||{});};s.onerror=function(){clean();reject(new Error('server'));};s.src=base+(base.indexOf('?')<0?'?':'&')+p.toString();document.body.appendChild(s);setTimeout(function(){if(!done){clean();reject(new Error('timeout'));}},25000);});}
  function toast(t,bad){var m=$('es16Msg')||$('mainMsg')||document.querySelector('.msg');if(m){m.textContent=t||'';m.classList.toggle('error',!!bad);m.classList.toggle('ok',!!t&&!bad);}else if(t){alert(t);}}
  var style=document.createElement('style');style.textContent='.es16-panel{background:#fff;border:1px solid #d8e4ea;border-radius:18px;padding:16px;margin:14px 0;box-shadow:0 10px 24px #0001}.es16-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.es16-grid .wide{grid-column:span 2}.es16-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.es16-table{width:100%;border-collapse:collapse;margin-top:12px}.es16-table th,.es16-table td{border:1px solid #e5edf5;padding:7px;text-align:right}.es16-btn{background:#eef6f5;color:#0f6f5c;border:1px solid #d2e8e4;border-radius:10px;padding:8px 11px;cursor:pointer;font-weight:800}.es16-btn.primary{background:#0f8a70;color:#fff;border-color:#0f8a70}.es16-btn.danger{background:#d64545;color:#fff;border-color:#d64545}.es16-version{position:fixed;left:10px;bottom:10px;z-index:9999;background:#111827;color:white;border-radius:999px;padding:6px 10px;font-size:11px}.hidden#clientInvoiceMenu,.hidden.clientInvoiceMenu,.hidden.client-invoice-menu{display:none!important}@media(max-width:900px){.es16-grid{grid-template-columns:1fr}.es16-grid .wide{grid-column:auto}}';document.head.appendChild(style);
  function versionBind(){document.title='إيزي ستور مطبعجي ES18 V1861';document.querySelectorAll('.version-badge,.version,.app-version').forEach(function(el){el.textContent='ES18 V1861 Error Fix';});if(!$('es16Version')){var v=document.createElement('div');v.id='es16Version';v.className='es16-version';v.textContent='ES18 V1861';document.body.appendChild(v);}}
  function closeInvoiceMenus(force){['clientInvoiceMenu','saCustomerDrop','customerInvoiceMenu','invoiceCustomerMenu'].forEach(function(id){var el=$(id);if(el){el.classList.add('hidden');el.style.display='none';el.setAttribute('aria-hidden','true');}});document.querySelectorAll('.clientInvoiceMenu,.client-invoice-menu,.dropdown-menu,.floating-menu,.invoice-menu,[data-invoice-menu]').forEach(function(el){var key=((el.id||'')+' '+(el.className||'')+' '+(el.textContent||'')).toLowerCase();if(force||/invoice|فاتورة|menu|dropdown/.test(key)){el.classList.add('hidden');el.style.display='none';el.setAttribute('aria-hidden','true');}});} 
  window.toggleClientInvoiceMenu=function(ev){if(ev){ev.preventDefault();ev.stopPropagation();}var m=$('clientInvoiceMenu')||document.querySelector('.clientInvoiceMenu,.client-invoice-menu,[data-invoice-menu]');if(!m)return false;var open=m.classList.contains('hidden')||m.style.display==='none'||getComputedStyle(m).display==='none';closeInvoiceMenus(true);if(open){m.classList.remove('hidden');m.style.display='block';m.setAttribute('aria-hidden','false');}return false;};['pointerdown','mousedown','click','touchstart','focusin'].forEach(function(evt){document.addEventListener(evt,function(ev){var t=ev.target;if(t&&t.closest&&t.closest('#clientInvoiceMenu,.clientInvoiceMenu,.client-invoice-menu,[data-invoice-menu],[onclick*="toggleClientInvoiceMenu"]'))return;closeInvoiceMenus(true);},true);});document.addEventListener('keydown',function(ev){if(ev.key==='Escape')closeInvoiceMenus(true);},true);window.addEventListener('scroll',function(){closeInvoiceMenus(true);},true);
  var customers=[];
  function partyName(r,type){return type==='supplier'?txt(r.name||r.supplierName||r.supplier||r['اسم المورد']||r['المورد']):txt(r.name||r.customerName||r.customer||r['اسم العميل']||r['اسم الشات / المكتب']);}
  async function loadCustomers(){try{var r=await api('getEasyStoreCustomers',{limit:1000});if(r.success)customers=r.customers||[];}catch(e){}}
  function bestCustomer(q){q=norm(q);if(!q||q.length<2)return null;var exact=null,start=null,contains=null;customers.forEach(function(r){var name=partyName(r,'customer'),phone=txt(r.phone||r.mobile||r.customerPhone||''),code=txt(r.code||r.customerCode||'');var blob=norm([name,phone,code].join(' '));if(norm(name)===q||norm(phone)===q||norm(code)===q)exact=r;else if(norm(name).indexOf(q)===0&&!start)start=r;else if(blob.indexOf(q)>=0&&!contains)contains=r;});return exact||start||contains;}
  function hydrateCustomerPickers(){document.querySelectorAll('input,select').forEach(function(el){if(el.dataset.es16CustomerPicker)return;var meta=norm([el.id,el.name,el.placeholder,el.getAttribute('aria-label')].join(' '));if(!/عميل|customer|client/.test(meta)||/مورد|supplier/.test(meta))return;el.dataset.es16CustomerPicker='1';el.addEventListener('change',function(){var r=bestCustomer(el.value);if(r)fillCustomer(el,r);});el.addEventListener('blur',function(){var r=bestCustomer(el.value);if(r)fillCustomer(el,r);});});}
  function fillCustomer(input,r){var scope=input.closest('form,.card,section,main')||document;var name=partyName(r,'customer');if(name)input.value=name;var phone=txt(r.phone||r.mobile||r.customerPhone||''),code=txt(r.code||r.customerCode||''),bal=num(r.currentBalance||r.balance||r.debt||r.remainingBalance);scope.querySelectorAll('input').forEach(function(el){var m=norm([el.id,el.name,el.placeholder,el.getAttribute('aria-label')].join(' '));if(code&&/كود|code/.test(m)&&!/اوردر|order/.test(m))el.value=code;if(phone&&/تليفون|هاتف|موبايل|phone|mobile/.test(m))el.value=phone;if(/مديونيه|مديونية|رصيد|balance|debt/.test(m))el.value=bal||'';});toast('تم تحميل العميل: '+name,false);}
  function rowInfo(btn){
    var tr=btn && btn.closest ? btn.closest('tr') : null;
    var tds=tr?Array.from(tr.children):[];
    var raw=tds.map(function(td){return txt(td.textContent);});
    var vals=raw.map(function(v){return v.replace(/تعديل\/مديونية|تعديل|إيقاف|ايقاف|تفعيل|حذف|إرسال|رابط|الفاتورة|كشف حساب|حساب المورد/g,'').trim();}).filter(Boolean);
    var ctx=(btn&&btn.closest&&btn.closest('section,.card,.content,main'))||document.body;
    var title=norm(ctxText(ctx,700));
    var kind=/خامات|خامة|مطبخ|material/.test(title)&&!/اصناف|الأصناف|البنود الثابتة/.test(title)?'material':'template';
    var dept=vals.find(function(v){return /طباعة|ليزر|مشترك|عام/.test(v);})||'';
    var name='';
    vals.some(function(v){
      var x=txt(v);
      if(!x) return false;
      if(/^(طباعة|ليزر|مشترك|عام|مفعل|موقوف|نعم|لا|ج|EGP)$/i.test(x)) return false;
      if(/^[-+]?\d+(\.\d+)?\s*(ج|egp)?$/i.test(x)) return false;
      if(/^(0|0 ج|0\.00 ج|—|-|\*)$/.test(x)) return false;
      name=x; return true;
    });
    if(!name){
      var rtxt=txt(tr&&tr.textContent||'').replace(/تعديل\/مديونية|تعديل|إيقاف|ايقاف|تفعيل|حذف/g,' ');
      name=txt(rtxt.split(/\n|\||—/).map(txt).find(Boolean)||'');
    }
    return {tr:tr,kind:kind,name:name,department:dept,vals:vals,raw:raw};
  }
  async function activateItem(btn,active){
    var r=rowInfo(btn);
    if(!r.name){toast('لم أتعرف على اسم الصنف من الصف. افتح التعديل أو أعد تحميل الصفحة.',true);return;}
    btn.disabled=true;
    try{
      var res=await api('activateAccountingItemV1859',{kind:r.kind,name:r.name,itemName:r.name,materialName:r.name,department:r.department,active:active?'نعم':'لا'});
      toast((res&&res.message)||'',!(res&&res.success));
      if(res&&res.success)setTimeout(function(){location.reload();},700);
    }catch(e){toast('خطأ اتصال بالسيرفر أثناء التفعيل: '+(e&&e.message?e.message:'راجع Apps Script'),true);}finally{btn.disabled=false;}
  }
  function ensureEditPanel(){if($('es16ItemEditPanel'))return;var host=document.querySelector('.content')||document.querySelector('main')||document.body;var p=document.createElement('section');p.id='es16ItemEditPanel';p.className='es16-panel hidden';p.innerHTML='<h3>تعديل الصنف / الخامة</h3><div id="es16Msg" class="msg"></div><div class="es16-grid"><input id="es16EditKind" type="hidden"><input id="es16OldName" type="hidden"><div class="wide"><label>الاسم</label><input id="es16EditName"></div><div><label>القسم</label><select id="es16EditDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option><option>عام</option></select></div><div><label>التكلفة / سعر الوحدة</label><input id="es16EditCost" type="number"></div><div><label>سعر البيع</label><input id="es16EditSale" type="number"></div><div><label>العرض</label><input id="es16EditWidth" type="number"></div><div><label>الطول</label><input id="es16EditHeight" type="number"></div><div><label>الهالك %</label><input id="es16EditWaste" type="number"></div><div><label>الحالة</label><select id="es16EditActive"><option value="نعم">مفعل</option><option value="لا">موقوف</option></select></div><div class="wide"><label>ملاحظات</label><input id="es16EditNotes"></div></div><div class="es16-actions"><button id="es16SaveItemEdit" class="es16-btn primary">تحديث</button><button id="es16CancelItemEdit" class="es16-btn">إغلاق</button></div>';host.prepend(p);$('es16CancelItemEdit').onclick=function(){p.classList.add('hidden');};$('es16SaveItemEdit').onclick=saveItemEdit;}
  function openEdit(btn){ensureEditPanel();var r=rowInfo(btn);$('es16EditKind').value=r.kind;$('es16OldName').value=r.name;$('es16EditName').value=r.name;$('es16EditDept').value=r.department||'طباعة';$('es16EditCost').value='';$('es16EditSale').value='';$('es16EditWidth').value='';$('es16EditHeight').value='';$('es16EditWaste').value='';$('es16EditNotes').value='';$('es16ItemEditPanel').classList.remove('hidden');$('es16ItemEditPanel').scrollIntoView({behavior:'smooth',block:'start'});toast('تم تحميل بيانات الصف للتعديل. راجع الأسعار ثم اضغط تحديث.',false);}
  async function saveItemEdit(){try{var res=await api('updateAccountingItemV1859',{kind:$('es16EditKind').value,oldName:$('es16OldName').value,name:$('es16EditName').value,itemName:$('es16EditName').value,materialName:$('es16EditName').value,department:$('es16EditDept').value,cost:$('es16EditCost').value,unitCost:$('es16EditCost').value,salePrice:$('es16EditSale').value,width:$('es16EditWidth').value,height:$('es16EditHeight').value,waste:$('es16EditWaste').value,active:$('es16EditActive').value,notes:$('es16EditNotes').value});toast(res.message||'',!res.success);if(res.success)setTimeout(function(){location.reload();},800);}catch(e){toast('خطأ اتصال أثناء تحديث الصنف.',true);}}
  function bindItemButtons(){
    if(window.__ES18_ITEM_BUTTONS_BOUND__) return;
    window.__ES18_ITEM_BUTTONS_BOUND__=true;
    document.addEventListener('click',function(ev){
      var b=ev.target&&ev.target.closest&&ev.target.closest('button,a'); if(!b)return;
      var t=txt(b.textContent);
      var ctx=(b.closest&&b.closest('section,.card,.content,main'))||document.body;
      if(!isAccountingKitchenContext(b)) return;
      if(/^تفعيل$/.test(t)){ev.preventDefault();ev.stopPropagation();activateItem(b,true);return false;}
      if(/إيقاف|ايقاف/.test(t)){ev.preventDefault();ev.stopPropagation();activateItem(b,false);return false;}
      if(/^تعديل$/.test(t)){ev.preventDefault();ev.stopPropagation();openEdit(b);return false;}
    },true);
  }
  function ensureManagerPanel(){
    if($('es16ManagerPanel'))return;
    var host=document.querySelector('.content')||document.querySelector('main')||document.body;
    var p=document.createElement('section');
    p.id='es16ManagerPanel';
    p.className='es16-panel';
    p.innerHTML='<h3>مدير الحسابات ES18</h3><div id="es16Msg" class="msg"></div><div class="es16-actions"><button id="es16OpenLedger" class="es16-btn primary">حسابات العملاء والموردين</button><button id="es16OpenCashbox" class="es16-btn">الخزنة والتحصيلات</button><button id="es16OpenDayClose" class="es16-btn">قفلة اليوم</button><button id="es16OpenAudit" class="es16-btn">سجل المراجعة</button><button id="es16OpenZeroReset" class="es16-btn danger">تهيئة لوضع الصفر</button></div><div id="es16ManagerContent"></div>';
    host.prepend(p);
    $('es16OpenLedger').onclick=renderLedger;
    $('es16OpenCashbox').onclick=renderCashbox;
    $('es16OpenDayClose').onclick=renderDayClose;
    $('es16OpenAudit').onclick=loadAudit;
    $('es16OpenZeroReset').onclick=renderZeroReset;
  }
  function renderLedger(){var c=$('es16ManagerContent');c.innerHTML='<div class="es16-panel"><h3>حركة حساب عميل / مورد</h3><div class="es16-grid"><div><label>نوع الحساب</label><select id="es16PartyType"><option value="customer">عميل</option><option value="supplier">مورد</option></select></div><div class="wide"><label>الاسم</label><input id="es16PartyName" placeholder="اكتب اسم العميل أو المورد"></div><div><label>العملية</label><select id="es16LedgerOp"><option value="opening_debt">مديونية افتتاحية</option><option value="payment_received">سداد عميل</option><option value="invoice">فاتورة عميل</option><option value="purchase_invoice">فاتورة مورد</option><option value="payment_paid">دفعة لمورد</option><option value="adjustment_plus">تسوية زيادة</option><option value="adjustment_minus">تسوية نقص</option></select></div><div><label>المبلغ</label><input id="es16LedgerAmount" type="number"></div><div><label>طريقة الدفع</label><select id="es16LedgerMethod"><option>نقدي</option><option>فودافون كاش</option><option>إنستا باي</option><option>تحويل بنكي</option><option>تسوية</option></select></div><div><label>مرجع</label><input id="es16LedgerRef"></div><div class="wide"><label>ملاحظات</label><input id="es16LedgerNotes"></div></div><div class="es16-actions"><button id="es16SaveLedger" class="es16-btn primary">حفظ وتحديث الرصيد</button><button id="es16LoadLedger" class="es16-btn">عرض الكشف</button></div><div id="es16LedgerHistory"></div></div>';$('es16SaveLedger').onclick=saveLedger;$('es16LoadLedger').onclick=loadLedger;}
  async function saveLedger(){if(!isFinal()){toast('هذه الحركة عند ضياء / رحمه / ريفان فقط.',true);return;}try{var r=await api('savePartyLedgerTransaction',{partyType:$('es16PartyType').value,partyName:$('es16PartyName').value,operation:$('es16LedgerOp').value,amount:$('es16LedgerAmount').value,paymentMethod:$('es16LedgerMethod').value,refNo:$('es16LedgerRef').value,notes:$('es16LedgerNotes').value});toast(r.message||'',!r.success);if(r.success)loadLedger();}catch(e){toast('تعذر حفظ الحركة.',true);}}
  async function loadLedger(){try{var r=await api('getPartyAccountV1858',{partyType:$('es16PartyType').value,partyName:$('es16PartyName').value});if(!r.success){toast(r.message,true);return;}var rows=r.transactions||[];$('es16LedgerHistory').innerHTML='<h4>الرصيد الحالي: '+money(r.balance)+'</h4>'+(rows.length?'<table class="es16-table"><thead><tr><th>التاريخ</th><th>العملية</th><th>المبلغ</th><th>الرصيد بعد</th><th>ملاحظات</th></tr></thead><tbody>'+rows.slice().reverse().map(function(x){return '<tr><td>'+esc(x.createdAt||'')+'</td><td>'+esc(x.operationLabel||x.operation||'')+'</td><td>'+money(x.amount)+'</td><td>'+money(x.balanceAfter)+'</td><td>'+esc(x.notes||'')+'</td></tr>';}).join('')+'</tbody></table>':'لا توجد حركات.');}catch(e){toast('تعذر تحميل الكشف.',true);}}
  function renderCashbox(){var c=$('es16ManagerContent');c.innerHTML='<div class="es16-panel"><h3>الخزنة والتحصيلات</h3><div class="es16-grid"><div><label>نوع الحركة</label><select id="es16CashType"><option value="receipt">قبض من عميل</option><option value="supplier_payment">دفع لمورد</option><option value="expense">مصروف</option><option value="transfer">تحويل</option></select></div><div class="wide"><label>الطرف</label><input id="es16CashParty"></div><div><label>المبلغ</label><input id="es16CashAmount" type="number"></div><div><label>طريقة الدفع</label><select id="es16CashMethod"><option>نقدي</option><option>فودافون كاش</option><option>إنستا باي</option><option>تحويل بنكي</option></select></div><div><label>الخزنة</label><input id="es16Cashbox" value="الخزنة الرئيسية"></div><div><label>مرجع</label><input id="es16CashRef"></div><div class="wide"><label>ملاحظات</label><input id="es16CashNotes"></div></div><div class="es16-actions"><button id="es16SaveCash" class="es16-btn primary">حفظ حركة الخزنة</button><button id="es16LoadCash" class="es16-btn">عرض حركات الخزنة</button></div><div id="es16CashHistory"></div></div>';$('es16SaveCash').onclick=saveCashbox;$('es16LoadCash').onclick=loadCashbox;}
  async function saveCashbox(){try{var r=await api('saveCashboxTransactionV1859',{type:$('es16CashType').value,partyName:$('es16CashParty').value,amount:$('es16CashAmount').value,paymentMethod:$('es16CashMethod').value,cashbox:$('es16Cashbox').value,refNo:$('es16CashRef').value,notes:$('es16CashNotes').value});toast(r.message||'',!r.success);if(r.success)loadCashbox();}catch(e){toast('تعذر حفظ حركة الخزنة.',true);}}
  async function loadCashbox(){try{var r=await api('getCashboxTransactionsV1859',{});if(!r.success){toast(r.message,true);return;}var rows=r.rows||[];$('es16CashHistory').innerHTML=rows.length?'<table class="es16-table"><thead><tr><th>التاريخ</th><th>نوع</th><th>طرف</th><th>مبلغ</th><th>دفع</th><th>بواسطة</th></tr></thead><tbody>'+rows.slice().reverse().map(function(x){return '<tr><td>'+esc(x.createdAt||x["وقت التسجيل"]||'')+'</td><td>'+esc(x.type||x["نوع الحركة"]||'')+'</td><td>'+esc(x.party||x["الطرف"]||'')+'</td><td>'+money(x.amount||x["المبلغ"])+'</td><td>'+esc(x.paymentMethod||x["طريقة الدفع"]||'')+'</td><td>'+esc(x.createdBy||x["مسجل بواسطة"]||'')+'</td></tr>';}).join('')+'</tbody></table>':'لا توجد حركات.';}catch(e){toast('تعذر تحميل الخزنة.',true);}}
  function renderDayClose(){var c=$('es16ManagerContent');c.innerHTML='<div class="es16-panel"><h3>قفلة اليوم</h3><div class="es16-grid"><div><label>التاريخ</label><input id="es16DayDate" type="date"></div><div><label>رصيد فعلي</label><input id="es16ActualBalance" type="number"></div><div class="wide"><label>ملاحظات</label><input id="es16DayNotes"></div></div><div class="es16-actions"><button id="es16CloseDayBtn" class="es16-btn primary">حفظ قفلة اليوم</button></div><div id="es16DayResult"></div></div>';try{$('es16DayDate').value=new Date().toISOString().slice(0,10);}catch(e){}$('es16CloseDayBtn').onclick=closeDay;}
  async function closeDay(){try{var r=await api('closeDayV1859',{date:$('es16DayDate').value,actualBalance:$('es16ActualBalance').value,notes:$('es16DayNotes').value});toast(r.message||'',!r.success);if(r.success){var s=r.summary||{};$('es16DayResult').innerHTML='<div class="es16-panel"><b>قبض: '+money(s.receipts)+'</b> — دفع: '+money(s.payments)+' — مصروفات: '+money(s.expenses)+' — فرق: '+money(s.diff)+'</div>';}}catch(e){toast('تعذر قفل اليوم.',true);}}
  async function loadAudit(){var c=$('es16ManagerContent');c.innerHTML='<div class="es16-panel"><h3>سجل المراجعة</h3><div id="es16AuditRows">جاري التحميل...</div></div>';try{var r=await api('getAuditLogV1859',{});if(!r.success){$('es16AuditRows').innerHTML=esc(r.message||'تعذر التحميل');return;}var rows=r.rows||[];$('es16AuditRows').innerHTML=rows.length?'<table class="es16-table"><thead><tr><th>وقت</th><th>مستخدم</th><th>عملية</th><th>كيان</th><th>مرجع</th><th>ملاحظات</th></tr></thead><tbody>'+rows.slice().reverse().map(function(x){return '<tr><td>'+esc(x.createdAt||x["وقت التسجيل"]||'')+'</td><td>'+esc(x.user||x["المستخدم"]||'')+'</td><td>'+esc(x.operation||x["نوع العملية"]||'')+'</td><td>'+esc(x.entity||x["الكيان"]||'')+'</td><td>'+esc(x.refNo||x["رقم المرجع"]||'')+'</td><td>'+esc(x.notes||x["ملاحظات"]||'')+'</td></tr>';}).join('')+'</tbody></table>':'لا توجد عمليات.';}catch(e){$('es16AuditRows').innerHTML='تعذر التحميل.';}}
  function renderZeroReset(){
    var c=$('es16ManagerContent');
    c.innerHTML='<div class="es16-panel" style="border-color:#fecaca;background:#fff7f7"><h3>تهيئة لوضع الصفر</h3><p><b>سيتم إنشاء نسخة احتياطية ثم مسح بيانات الحسابات والتشغيل فقط.</b></p><p>سيتم مسح الخامات، الأصناف، مكونات الصنف، المخزون، الفواتير، فواتير الأقسام، الهوالك، الخزنة، قفلات اليوم، وكشف حساب العملاء والموردين. <b>لن يتم مسح العملاء ولا المستخدمين.</b></p><label>اكتب بالضبط: تهيئة لوضع الصفر</label><input id="es16ZeroConfirm" placeholder="تهيئة لوضع الصفر"><div class="es16-actions"><button id="es16ZeroResetBtn" class="es16-btn danger">تنفيذ التهيئة الآن</button></div></div>';
    $('es16ZeroResetBtn').onclick=zeroReset;
  }
  async function zeroReset(){
    if(!isAdmin()){toast('تهيئة وضع الصفر عند ضياء فقط.',true);return;}
    if(txt($('es16ZeroConfirm').value)!=='تهيئة لوضع الصفر'){toast('اكتب التأكيد كما هو: تهيئة لوضع الصفر',true);return;}
    try{
      var r=await api('resetAccountingToZeroV1861',{confirm:'تهيئة لوضع الصفر'});
      toast((r&&r.message)||'',!(r&&r.success));
      if(r&&r.success){setTimeout(function(){location.reload();},1200);}
    }catch(e){toast('تعذر تنفيذ التهيئة: '+(e&&e.message?e.message:'راجع Apps Script'),true);}
  }
  function sendInvoiceReview(customer, invoiceNo, total, paid, remaining){api('createInvoiceReviewMessageV1859',{customerName:customer,invoiceNo:invoiceNo,total:total,paid:paid,remaining:remaining}).then(function(r){if(!r.success){toast(r.message,true);return;}try{navigator.clipboard&&navigator.clipboard.writeText(r.text||'');}catch(e){} if(r.whatsappUrl) window.open(r.whatsappUrl,'Matbagy_Invoice_Review'); toast('تم تجهيز رسالة مراجعة الفاتورة ونسخها.',false);}).catch(function(){toast('تعذر تجهيز رسالة مراجعة الفاتورة.',true);});}
  function installInvoiceReviewButtons(){document.querySelectorAll('tr,.invoice-row,.sale-row').forEach(function(row){if(row.dataset.es16ReviewBtn)return;var text=norm(row.textContent||'');if(!/فاتورة|عميل|مدفوع|باقي|الباقي/.test(text))return;row.dataset.es16ReviewBtn='1';var b=document.createElement('button');b.type='button';b.className='es16-btn';b.textContent='إرسال رابط الفاتورة';b.onclick=function(ev){ev.preventDefault();ev.stopPropagation();var raw=txt(row.textContent);var customer=(raw.match(/عميل[:：]?\s*([^\n\|]+)/)||[])[1]||'';sendInvoiceReview(customer,'','','','');};var cell=document.createElement(row.tagName==='TR'?'td':'div');cell.appendChild(b);row.appendChild(cell);});}
  function bind(){versionBind();loadCustomers();hydrateCustomerPickers();bindItemButtons();ensureManagerPanel();installInvoiceReviewButtons();closeInvoiceMenus(true);}document.addEventListener('DOMContentLoaded',bind);setTimeout(bind,300);setTimeout(bind,1500);setInterval(function(){versionBind();hydrateCustomerPickers();installInvoiceReviewButtons();},4000);
})();



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




/*********************** EasyStore ES21 / V1864 - Backend Helper Fix ************************
  - ملف موحد: يحتوي إصلاحات ES18 + ES19 ويضيف رقم ES20 حتى لا تحتاج رفع ملفات ES14/ES15/ES16/ES18/ES19 القديمة.
  - الإصلاح الأساسي في هذا الباتش داخل Apps Script: accountingFindTemplateRow_.
**********************************************************************************************/
(function(){
  'use strict';
  window.EASYSTORE_VERSION = 'ES21 V1864 Number Format Fix';
  window.EASYSTORE_ES20_V1863_TEMPLATE_HELPER_FIX = true;
  function t(v){ return String(v == null ? '' : v); }
  function setVersion(){
    try { document.title = 'إيزي ستور مطبعجي ES21 V1864'; } catch(e){}
    try {
      document.querySelectorAll('.version-badge,.version,.app-version').forEach(function(el){
        el.textContent = 'ES21 V1864 Number Format Fix';
      });
      Array.from(document.querySelectorAll('h1,h2,.brand h1,.top h1,.topbar h2')).forEach(function(el){
        if(/إيزي|ستور|برنامج الحسابات|Easy|مدير الحسابات/i.test(t(el.textContent))){
          el.textContent = 'إيزي ستور مطبعجي - برنامج الحسابات ES20';
        }
      });
    } catch(e){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setVersion);
  else setVersion();
  setTimeout(setVersion, 800);
  setTimeout(setVersion, 2500);
})();


/*********************** EasyStore ES21 / V1864 - Number Format Fix ************************
  إصلاح عرض أرقام الفلوس والنسب داخل الجداول والفورمات:
  - 3.9 تظهر 3.90 ج وليس 39.
  - كل القيم المالية تعرض LTR برقمين عشريين.
  - مجمل الربح = سعر البيع - التكلفة.
  - نسبة الربح = مجمل الربح ÷ سعر البيع × 100.
**********************************************************************************************/
(function(){
  'use strict';
  window.EASYSTORE_VERSION = 'ES21 V1864 Number Format Fix';
  window.EASYSTORE_ES21_V1864_NUMBER_FORMAT_FIX = true;

  function text(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function norm(v){ return text(v).toLowerCase().replace(/[إأآا]/g,'ا').replace(/[ى]/g,'ي').replace(/[ةه]/g,'ه').replace(/[ؤ]/g,'و').replace(/[ئ]/g,'ي'); }
  function toEnglishDigits(s){
    return String(s == null ? '' : s)
      .replace(/[٠-٩]/g,function(d){ return {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'}[d] || d; })
      .replace(/[۰-۹]/g,function(d){ return {'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'}[d] || d; });
  }
  function num(v){
    var raw = toEnglishDigits(v);
    // Treat Arabic thousands separator as noise, and both comma/dot as decimal when suitable.
    raw = raw.replace(/جنيه|ج|egp|EGP|%/g,'').trim();
    if(raw.indexOf('.') >= 0 && raw.indexOf(',') >= 0){ raw = raw.replace(/,/g,''); }
    else { raw = raw.replace(/[٬]/g,'').replace(/[,٫]/g,'.'); }
    raw = raw.replace(/[^0-9.\-]/g,'');
    var parts = raw.split('.');
    if(parts.length > 2){ raw = parts.shift() + '.' + parts.join(''); }
    var n = parseFloat(raw);
    return isFinite(n) ? n : 0;
  }
  function moneyPlain(v){ return num(v).toFixed(2) + ' ج'; }
  function percentPlain(v){ return num(v).toFixed(2) + '%'; }
  function spanLTR(value, cls){ return '<span class="'+(cls||'es21-money')+'" dir="ltr" style="unicode-bidi:isolate;white-space:nowrap">'+value+'</span>'; }
  function setMoney(cell, v){ if(cell) cell.innerHTML = spanLTR(moneyPlain(v),'es21-money'); }
  function setPercent(cell, v){ if(cell) cell.innerHTML = spanLTR(percentPlain(v),'es21-percent'); }
  function headerIndex(headers, patterns){
    for(var i=0;i<headers.length;i++){
      var h = norm(headers[i]);
      for(var j=0;j<patterns.length;j++){ if(patterns[j].test(h)) return i; }
    }
    return -1;
  }
  function getHeaders(table){
    var heads = Array.from(table.querySelectorAll('thead th')).map(function(th){ return text(th.textContent); });
    if(heads.length) return heads;
    var first = table.querySelector('tr');
    return first ? Array.from(first.children).map(function(c){ return text(c.textContent); }) : [];
  }
  function fixAccountingTable(table){
    var headers = getHeaders(table);
    if(!headers.length) return;
    var htxt = norm(headers.join(' '));
    if(!/(تكلفه|التكلفه|تكلفة|البيع|مجمل الربح|نسبه الربح|نسبة الربح)/.test(htxt)) return;
    var costI = headerIndex(headers, [/^التكلفه$/, /^تكلفه$/, /التكلفه|تكلفة/]);
    var saleI = headerIndex(headers, [/^البيع$/, /سعر البيع|البيع/]);
    var profitI = headerIndex(headers, [/مجمل الربح|صافي الربح|الربح/]);
    var percentI = headerIndex(headers, [/نسبه الربح|نسبة الربح|هامش/]);
    if(saleI < 0 && profitI < 0 && costI < 0) return;
    Array.from(table.querySelectorAll('tbody tr')).forEach(function(tr){
      var cells = Array.from(tr.children);
      if(!cells.length || (saleI >= cells.length && costI >= cells.length)) return;
      var sale = saleI >= 0 && cells[saleI] ? num(cells[saleI].textContent) : 0;
      var cost = costI >= 0 && cells[costI] ? num(cells[costI].textContent) : 0;
      // If cost is zero but hidden/component fields are nearby, try to use data attributes.
      var dataCost = num(tr.getAttribute('data-cost') || tr.getAttribute('data-total-cost') || '');
      if(!cost && dataCost) cost = dataCost;
      if(costI >= 0 && cells[costI]) setMoney(cells[costI], cost);
      if(saleI >= 0 && cells[saleI]) setMoney(cells[saleI], sale);
      if(profitI >= 0 && cells[profitI]){
        var profit = sale - cost;
        setMoney(cells[profitI], profit);
        if(percentI >= 0 && cells[percentI]){
          var margin = sale ? (profit / sale * 100) : 0;
          setPercent(cells[percentI], margin);
        }
      }
    });
  }
  function fixInputs(){
    var ids = ['es19EditCost','es19EditSale','es19EditProfit','es19EditMargin'];
    ids.forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      el.setAttribute('dir','ltr');
      el.style.textAlign = 'left';
      el.style.unicodeBidi = 'isolate';
    });
    var cost = document.getElementById('es19EditCost'), sale = document.getElementById('es19EditSale'), profit = document.getElementById('es19EditProfit'), margin = document.getElementById('es19EditMargin');
    if(cost && sale && profit){
      var p = num(sale.value) - num(cost.value);
      profit.value = p.toFixed(2);
      if(margin) margin.value = (num(sale.value) ? (p / num(sale.value) * 100) : 0).toFixed(2) + '%';
    }
  }
  function applyNumberFormatFix(){
    document.querySelectorAll('table').forEach(fixAccountingTable);
    fixInputs();
    document.querySelectorAll('.money,.amount,.price,.total,[data-money]').forEach(function(el){
      if(el.closest('input,textarea,select')) return;
      var t = text(el.textContent);
      if(/[0-9٠-٩]/.test(t)) setMoney(el, num(t));
    });
  }
  function setVersion(){
    document.title = 'إيزي ستور مطبعجي ES21 V1864';
    document.querySelectorAll('.version-badge,.version,.app-version').forEach(function(el){ el.textContent = 'ES21 V1864 Number Format Fix'; });
    document.querySelectorAll('h1,h2,.brand h1,.top h1,.topbar h2').forEach(function(el){
      if(/إيزي|ستور|برنامج الحسابات|Easy/i.test(text(el.textContent))) el.textContent = 'إيزي ستور مطبعجي - برنامج الحسابات ES21';
    });
  }
  var css = document.createElement('style');
  css.textContent = '.es21-money,.es21-percent{font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate;display:inline-block;min-width:72px;text-align:left}.es21-percent{min-width:60px}';
  document.head.appendChild(css);
  document.addEventListener('input',function(ev){ if(ev.target && /es19Edit(Cost|Sale)/.test(ev.target.id||'')) setTimeout(fixInputs,0); },true);
  document.addEventListener('click',function(){ setTimeout(applyNumberFormatFix,80); },true);
  document.addEventListener('DOMContentLoaded',function(){ setVersion(); applyNumberFormatFix(); });
  setTimeout(function(){ setVersion(); applyNumberFormatFix(); },300);
  setTimeout(applyNumberFormatFix,1200);
  setInterval(function(){ setVersion(); applyNumberFormatFix(); },2500);
})();
