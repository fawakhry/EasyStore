
/*********************** EasyStore ES15.1 / V1858 ************************
  Fixes requested by Diaa:
  - Strong close for فاتورة العميل dropdown.
  - Customer/Supplier accounts ledger: debts, payments, balances, history.
  - Customers: edit/debt buttons and account panel.
  - Fix: debt buttons appear only in Customers, supplier account buttons only in Suppliers, never in Items.
  - Keeps ES14 Fix5 behaviors: activation, edit prices, paper pack, multi-row dept invoice.
****************************************************************************/
(function(){
  'use strict';
  window.EASYSTORE_ES15_V1858_LEDGER_FIX = true;
  window.EASYSTORE_ES15_V1858_CUSTOMER_BUTTON_FIX = true;
  var qs = new URLSearchParams(location.search);
  function $(id){ return document.getElementById(id); }
  function txt(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function norm(v){ return txt(v).toLowerCase().replace(/[إأآا]/g,'ا').replace(/[ى]/g,'ي').replace(/[ةه]/g,'ه').replace(/[ؤ]/g,'و').replace(/[ئ]/g,'ي'); }
  function num(v){ var n=parseFloat(String(v||'').replace(/[٬,]/g,'.').replace(/[^0-9.\-]/g,'')); return isFinite(n)?n:0; }
  function money(v){ return (Math.round(num(v)*100)/100).toLocaleString('ar-EG') + ' ج'; }
  function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function set(id,v){ var el=$(id); if(el) el.value = v==null?'':String(v); }
  function toast(t,bad){
    var m=$('mainMsg')||$('es15LedgerMsg');
    if(m){m.textContent=t||''; m.className='msg '+(bad?'error bad':'ok'); setTimeout(function(){ if(m.textContent===t) m.textContent=''; },5000);} else if(t){ console.log('[ES15]', t); }
  }
  function userData(){
    var hand={}; try{hand=JSON.parse(localStorage.getItem('MATBAGY_EMPLOYEE_SSO')||'{}');}catch(e){}
    var hp=hand.params||{}, hu=hand.user||{};
    return {name:qs.get('name')||qs.get('username')||hp.name||hp.username||hu.name||hu.username||'', username:qs.get('username')||qs.get('name')||hp.username||hp.name||hu.username||hu.name||'', token:qs.get('token')||hp.token||hu.token||'', mode:qs.get('mode')||hp.mode||'', department:qs.get('department')||hp.department||''};
  }
  function userDept(){ var u=userData(); var k=norm([u.name,u.username,u.mode,u.department].join(' ')); if(/جابر|gaber|jaber|laser|ليزر/.test(k)) return 'ليزر'; if(/وائل|wael|print|طباعة/.test(k)) return 'طباعة'; return u.department||''; }
  function isAdminOrFinal(){ var u=userData(); var k=norm([u.name,u.username,u.mode,u.department].join(' ')); return /ضياء|diaa|admin|full|kitchen|رحمه|رحمة|rahma|ريفان|ريڤان|revan|rivan|final/.test(k); }
  function api(action, data){
    return new Promise(function(resolve,reject){
      var base=txt(window.TREND_API_URL||''); if(!base){reject(new Error('TREND_API_URL missing'));return;}
      var cb='ES15_'+Date.now()+'_'+Math.floor(Math.random()*99999);
      var u=userData(); var p=new URLSearchParams(Object.assign({action:action,callback:cb,username:u.username||u.name,name:u.name||u.username,token:u.token||'',_ts:Date.now()},data||{}));
      var s=document.createElement('script'), done=false; function clean(){ if(done)return; done=true; try{delete window[cb];}catch(e){window[cb]=undefined;} if(s.parentNode)s.parentNode.removeChild(s); }
      window[cb]=function(r){clean(); resolve(r||{});}; s.onerror=function(){clean(); reject(new Error('server'));}; s.src=base+(base.indexOf('?')<0?'?':'&')+p.toString(); document.body.appendChild(s); setTimeout(function(){ if(!done){clean(); reject(new Error('timeout'));}},25000);
    });
  }

  /******** Strong client invoice dropdown close ********/
  function closeMenus(force){
    ['clientInvoiceMenu','saCustomerDrop','customerInvoiceMenu','invoiceCustomerMenu'].forEach(function(id){ var el=$(id); if(el){ el.classList.add('hidden'); el.style.display='none'; el.setAttribute('aria-hidden','true'); }});
    document.querySelectorAll('.clientInvoiceMenu,.client-invoice-menu,.dropdown-menu,.floating-menu,.invoice-menu,[data-invoice-menu]').forEach(function(el){
      var key=((el.id||'')+' '+(el.className||'')+' '+(el.getAttribute('aria-label')||'')).toLowerCase();
      if(force || /invoice|فاتورة|menu|dropdown/.test(key)){ el.classList.add('hidden'); el.style.display='none'; el.setAttribute('aria-hidden','true'); }
    });
  }
  function menuNode(){ return $('clientInvoiceMenu') || document.querySelector('.clientInvoiceMenu,.client-invoice-menu,[data-invoice-menu]'); }
  window.toggleClientInvoiceMenu=function(ev){
    if(ev){ev.preventDefault(); ev.stopPropagation();}
    var m=menuNode(); if(!m)return false;
    var open = m.classList.contains('hidden') || m.style.display==='none' || getComputedStyle(m).display==='none';
    closeMenus(true);
    if(open){m.classList.remove('hidden'); m.style.display='block'; m.setAttribute('aria-hidden','false');}
    return false;
  };
  ['pointerdown','mousedown','click','touchstart','focusin'].forEach(function(evt){
    document.addEventListener(evt,function(ev){ var t=ev.target; if(t&&t.closest&&t.closest('#clientInvoiceMenu,.clientInvoiceMenu,.client-invoice-menu,[data-invoice-menu],[onclick*="toggleClientInvoiceMenu"]'))return; closeMenus(true);},true);
  });
  document.addEventListener('keydown',function(ev){ if(ev.key==='Escape')closeMenus(true);},true);
  window.addEventListener('scroll',function(){closeMenus(true);},true); window.addEventListener('resize',function(){closeMenus(true);},true);
  document.addEventListener('click',function(ev){ var t=ev.target; if(t&&t.closest&&t.closest('#clientInvoiceMenu button,#clientInvoiceMenu a,.clientInvoiceMenu button,.clientInvoiceMenu a,.client-invoice-menu button,.client-invoice-menu a')) setTimeout(function(){closeMenus(true);},0); },true);
  var menuCss=document.createElement('style');
  menuCss.textContent='.hidden#clientInvoiceMenu,.hidden.clientInvoiceMenu,.hidden.client-invoice-menu,[aria-hidden="true"].clientInvoiceMenu,[aria-hidden="true"].client-invoice-menu{display:none!important}.es15-ledger-panel{background:#fff;border:1px solid #d8e4ea;border-radius:18px;padding:16px;margin:14px 0;box-shadow:0 10px 24px #0001}.es15-ledger-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.es15-ledger-grid .wide{grid-column:span 2}.es15-ledger-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.es15-ledger-table{width:100%;border-collapse:collapse;margin-top:12px}.es15-ledger-table th,.es15-ledger-table td{border:1px solid #e5edf5;padding:7px;text-align:right}.es15-balance{font-weight:900;color:#0b725d}.es15-debt-btn{margin-inline-start:6px;background:#eef6f5;color:#0f6f5c;border:1px solid #d2e8e4;border-radius:10px;padding:5px 8px;cursor:pointer}@media(max-width:900px){.es15-ledger-grid{grid-template-columns:1fr}.es15-ledger-grid .wide{grid-column:auto}}';
  document.head.appendChild(menuCss);

  /******** Ledger UI ********/
  var ledgerState={customers:[],suppliers:[],current:null,partyType:'customer'};
  function ensureLedgerPanel(){
    if($('es15LedgerPanel')) return;
    var anchor=document.querySelector('.content')||document.querySelector('main')||document.body;
    var panel=document.createElement('section'); panel.id='es15LedgerPanel'; panel.className='es15-ledger-panel hidden';
    panel.innerHTML='<div class="table-tools"><h3>حسابات العملاء والموردين / المديونيات والتحصيلات</h3><span id="es15LedgerMsg" class="msg"></span></div><div class="hint">ضياء / رحمه / ريفان يقدروا يضيفوا مديونية أو يسجلوا سداد عميل أو دفعة مورد في أي وقت، والرصيد يتحدث تلقائيًا.</div><div class="es15-ledger-grid"><div><label>نوع الحساب</label><select id="es15PartyType"><option value="customer">عميل</option><option value="supplier">مورد</option></select></div><div class="wide"><label>العميل / المورد</label><select id="es15PartySelect"><option value="">اختار</option></select></div><div><label>الرصيد الحالي</label><div id="es15CurrentBalance" class="es15-balance">0 ج</div></div><div><label>نوع العملية</label><select id="es15Operation"></select></div><div><label>المبلغ</label><input id="es15Amount" type="number" min="0" step="0.01"></div><div><label>طريقة الدفع</label><select id="es15PayMethod"><option>نقدي</option><option>فودافون كاش</option><option>إنستا باي</option><option>تحويل بنكي</option><option>آجل</option><option>تسوية</option></select></div><div><label>رقم فاتورة/مرجع</label><input id="es15Ref" placeholder="اختياري"></div><div class="wide"><label>ملاحظات</label><input id="es15Notes" placeholder="اختياري"></div></div><div class="es15-ledger-actions"><button id="es15SaveTxn" class="primary" type="button">حفظ الحركة وتحديث الرصيد</button><button id="es15RefreshLedger" class="ghost" type="button">تحديث الكشف</button><button id="es15CloseLedger" class="ghost" type="button">إخفاء</button></div><div id="es15LedgerHistory"></div>';
    anchor.prepend(panel);
    $('es15PartyType').onchange=function(){ ledgerState.partyType=this.value; renderOperationOptions(); renderPartyOptions(); loadSelectedAccount(); };
    $('es15PartySelect').onchange=loadSelectedAccount; $('es15SaveTxn').onclick=saveLedgerTxn; $('es15RefreshLedger').onclick=function(){loadSelectedAccount(true);}; $('es15CloseLedger').onclick=function(){panel.classList.add('hidden');};
    renderOperationOptions(); loadParties();
  }
  function openLedgerPanel(type, name){
    ensureLedgerPanel(); $('es15LedgerPanel').classList.remove('hidden');
    if(type){ ledgerState.partyType=type; $('es15PartyType').value=type; renderOperationOptions(); }
    renderPartyOptions();
    if(name){ setTimeout(function(){ var sel=$('es15PartySelect'); if(sel){ var opt=Array.from(sel.options).find(function(o){return norm(o.text)===norm(name)||norm(o.value)===norm(name);}); if(opt){sel.value=opt.value; loadSelectedAccount();}} },150); }
    $('es15LedgerPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }
  window.ES15_OPEN_LEDGER=openLedgerPanel;
  function renderOperationOptions(){
    var sel=$('es15Operation'); if(!sel)return; var customer=($('es15PartyType')||{}).value!=='supplier';
    sel.innerHTML = customer ? '<option value="opening_debt">إضافة / زيادة مديونية</option><option value="payment_received">تسجيل سداد من العميل</option><option value="adjustment_decrease">تخفيض / تسوية مديونية</option><option value="invoice">إضافة باقي فاتورة</option>' : '<option value="opening_debt">إضافة / زيادة مستحق للمورد</option><option value="payment_paid">تسجيل دفعة للمورد</option><option value="adjustment_decrease">تخفيض / تسوية مستحق المورد</option><option value="purchase_invoice">إضافة باقي فاتورة شراء</option>';
  }
  async function loadParties(){
    try{ var c=await api('getEasyStoreCustomers',{limit:800}); ledgerState.customers=c.customers||[]; }catch(e){}
    try{ var s=await api('getEasyStoreSuppliers',{}); ledgerState.suppliers=s.suppliers||[]; }catch(e){}
    renderPartyOptions(); decorateCustomerRows(); decorateSupplierRows(); hydrateSalesCustomerPickers(); removeLedgerButtonsFromWrongPlaces();
  }
  function partyNameFromRow(r,type){ return type==='supplier' ? txt(r.name||r.supplier||r.supplierName||r['اسم المورد']||r['المورد']) : txt(r.name||r.customerName||r.customer||r['اسم العميل']||r['اسم الشات / المكتب']); }
  function renderPartyOptions(){
    var sel=$('es15PartySelect'); if(!sel)return; var type=($('es15PartyType')||{}).value||'customer'; var rows=type==='supplier'?ledgerState.suppliers:ledgerState.customers;
    sel.innerHTML='<option value="">اختار '+(type==='supplier'?'مورد':'عميل')+'</option>'+rows.map(function(r){var n=partyNameFromRow(r,type); var bal=num(r.currentBalance||r.balance||r.debt||r['مديونية']||r['رصيد العميل']||r['رصيد المورد']); return n?'<option value="'+esc(n+'|'+n)+'" data-name="'+esc(n)+'">'+esc(n)+' — '+money(bal)+'</option>':'<option value="'+esc(n)+'" data-name="'+esc(n)+'">'+esc(n)+'</option>';}).join('');
  }
  function selectedPartyName(){ var sel=$('es15PartySelect'); if(!sel)return ''; var opt=sel.options[sel.selectedIndex]; return txt((opt&&opt.getAttribute('data-name')) || sel.value).replace(/^\d+(\.\d+)?\|/,''); }
  async function loadSelectedAccount(){
    var type=($('es15PartyType')||{}).value||'customer', name=selectedPartyName(); if(!name)return;
    try{ var r=await api('getPartyAccountV1858',{partyType:type,partyName:name}); if(!r.success){toast(r.message||'تعذر تحميل كشف الحساب',true);return;} ledgerState.current=r; $('es15CurrentBalance').textContent=money(r.balance); renderLedgerHistory(r.transactions||[]); }
    catch(e){toast('تعذر الاتصال لتحميل كشف الحساب.',true);}
  }
  function renderLedgerHistory(rows){
    var box=$('es15LedgerHistory'); if(!box)return; if(!rows.length){box.innerHTML='<div class="empty">لا توجد حركات لهذا الحساب حتى الآن.</div>';return;}
    box.innerHTML='<table class="es15-ledger-table"><thead><tr><th>التاريخ</th><th>العملية</th><th>المبلغ</th><th>الدفع</th><th>الرصيد بعد</th><th>بواسطة</th><th>ملاحظات</th></tr></thead><tbody>'+rows.slice(-80).reverse().map(function(r){return '<tr><td>'+esc(r.createdAt||r['وقت التسجيل']||'')+'</td><td>'+esc(r.operationLabel||r.operation||r['العملية']||'')+'</td><td>'+money(r.amount||r['المبلغ'])+'</td><td>'+esc(r.paymentMethod||r['طريقة الدفع']||'')+'</td><td>'+money(r.balanceAfter||r['الرصيد بعد'])+'</td><td>'+esc(r.createdBy||r['مسجل بواسطة']||'')+'</td><td>'+esc(r.notes||r['ملاحظات']||'')+'</td></tr>';}).join('')+'</tbody></table>';
  }
  async function saveLedgerTxn(){
    if(!isAdminOrFinal()){toast('حسابات العملاء والموردين متاحة لضياء / رحمه / ريفان فقط.',true);return;}
    var type=($('es15PartyType')||{}).value||'customer', name=selectedPartyName(), amount=num(($('es15Amount')||{}).value), op=($('es15Operation')||{}).value;
    if(!name||!amount){toast('اختار الحساب واكتب المبلغ.',true);return;}
    try{ var r=await api('savePartyLedgerTransaction',{partyType:type,partyName:name,operation:op,amount:amount,paymentMethod:($('es15PayMethod')||{}).value,refNo:($('es15Ref')||{}).value,notes:($('es15Notes')||{}).value}); if(!r.success){toast(r.message||'فشل الحفظ',true);return;} toast(r.message||'تم حفظ الحركة.'); set('es15Amount',''); set('es15Notes',''); $('es15CurrentBalance').textContent=money(r.balance); await loadSelectedAccount(true); await loadParties(); }
    catch(e){toast('تعذر حفظ الحركة.',true);}
  }
  function installLedgerButtons(){
    if($('es15LedgerTopBtn'))return;
    var host=document.querySelector('.top .menu')||document.querySelector('.menu')||document.querySelector('.tabs')||document.querySelector('.top-actions')||document.body;
    var b=document.createElement('button'); b.id='es15LedgerTopBtn'; b.type='button'; b.className='ghost'; b.textContent='حسابات العملاء والموردين'; b.onclick=function(){openLedgerPanel('customer');}; host.appendChild(b);
  }
  function rowHeaderText(table){
    var head='';
    if(table){
      var h=table.querySelector('thead') || table.querySelector('tr');
      if(h) head=norm(h.textContent||'');
    }
    return head;
  }
  function nearestTitleText(el){
    var box=el && el.closest ? (el.closest('section,.card,.content,main,.page') || document.body) : document.body;
    var title='';
    if(box){
      var h=box.querySelector('h1,h2,h3,.section-title,.table-tools h3');
      if(h) title=norm(h.textContent||'');
    }
    return title;
  }
  function isItemsTable(table){
    var h=rowHeaderText(table), title=nearestTitleText(table);
    return /الاصناف|الصنف|الخامات|مطبخ الحسابات/.test(title) || (/الصنف|القسم|التكلفه|التكلفة|البيع|نسبه الربح|نسبة الربح/.test(h) && !/اسم العميل|العميل|الهاتف|الموبايل|كود العميل/.test(h));
  }
  function isCustomersTable(table){
    var h=rowHeaderText(table), title=nearestTitleText(table);
    if(isItemsTable(table)) return false;
    if(/العملاء|عميل/.test(title) && !/الاصناف|الصنف/.test(title)) return true;
    return /اسم العميل|العميل|الهاتف|الموبايل|كود العميل|مديونيه|مديونية/.test(h) && !/الصنف|التكلفه|التكلفة|نسبه الربح|نسبة الربح/.test(h);
  }
  function isSuppliersTable(table){
    var h=rowHeaderText(table), title=nearestTitleText(table);
    if(isItemsTable(table)) return false;
    if(/الموردين|مورد/.test(title) && !/الاصناف|الصنف/.test(title)) return true;
    return /اسم المورد|المورد|هاتف المورد|رصيد المورد/.test(h) && !/الصنف|التكلفه|التكلفة/.test(h);
  }
  function removeLedgerButtonsFromWrongPlaces(){
    document.querySelectorAll('button.es15-debt-btn').forEach(function(btn){
      var tr=btn.closest('tr'), table=btn.closest('table');
      if(!tr || !table) return;
      var type=btn.getAttribute('data-party-type')||'customer';
      var ok = type==='supplier' ? isSuppliersTable(table) : isCustomersTable(table);
      if(!ok){ var cell=btn.closest('td,th'); if(cell) cell.remove(); else btn.remove(); if(tr) delete tr.dataset.es15DebtBtn; }
    });
  }
  function firstUsefulCellText(tr){
    var cells=Array.from(tr.children||[]);
    for(var i=0;i<cells.length;i++){
      var v=txt(cells[i].textContent).replace(/تعديل\/مديونية|كشف حساب|تسجيل سداد|تعديل|إيقاف|ايقاف|تفعيل/g,'').trim();
      if(v && !/^[-—]+$/.test(v)) return v;
    }
    return '';
  }
  function appendLedgerButton(tr, type, label, partyName){
    if(tr.dataset.es15DebtBtn===type) return;
    tr.dataset.es15DebtBtn=type;
    var td=document.createElement('td');
    var btn=document.createElement('button');
    btn.type='button'; btn.className='es15-debt-btn'; btn.setAttribute('data-party-type', type);
    btn.textContent=label;
    btn.onclick=function(ev){ ev.preventDefault(); ev.stopPropagation(); openLedgerPanel(type, partyName); return false; };
    td.appendChild(btn); tr.appendChild(td);
  }
  function decorateCustomerRows(){
    removeLedgerButtonsFromWrongPlaces();
    document.querySelectorAll('table').forEach(function(table){
      if(!isCustomersTable(table)) return;
      Array.from(table.querySelectorAll('tbody tr, tr')).forEach(function(tr){
        if(tr.querySelector('th')) return;
        if(tr.dataset.es15DebtBtn) return;
        var maybe=firstUsefulCellText(tr); if(!maybe || maybe.length<2)return;
        appendLedgerButton(tr,'customer','تعديل/مديونية',maybe);
      });
    });
  }
  function decorateSupplierRows(){
    removeLedgerButtonsFromWrongPlaces();
    document.querySelectorAll('table').forEach(function(table){
      if(!isSuppliersTable(table)) return;
      Array.from(table.querySelectorAll('tbody tr, tr')).forEach(function(tr){
        if(tr.querySelector('th')) return;
        if(tr.dataset.es15DebtBtn) return;
        var maybe=firstUsefulCellText(tr); if(!maybe || maybe.length<2)return;
        appendLedgerButton(tr,'supplier','حساب المورد',maybe);
      });
    });
  }

  function bestCustomerMatch(value){
    var q=norm(value); if(!q || q.length<2) return null;
    var rows=ledgerState.customers||[];
    var exact=null, contains=null, starts=null;
    rows.forEach(function(r){
      var name=partyNameFromRow(r,'customer'), phone=txt(r.phone||r.mobile||r.customerPhone||r['الهاتف']||r['رقم العميل']||''), code=txt(r.code||r.customerCode||r['كود العميل']||'');
      var blob=norm([name,phone,code].join(' '));
      if(norm(name)===q || norm(phone)===q || norm(code)===q) exact=r;
      else if(norm(name).indexOf(q)===0 && !starts) starts=r;
      else if(blob.indexOf(q)>=0 && !contains) contains=r;
    });
    return exact||starts||contains;
  }
  function fillCustomerInputFromMatch(input, r){
    if(!input||!r)return;
    var name=partyNameFromRow(r,'customer'); if(name) input.value=name;
    input.dataset.es15CustomerSelected='1';
    var scope=input.closest('form,.card,section,main')||document;
    var phone=txt(r.phone||r.mobile||r.customerPhone||r['الهاتف']||r['رقم العميل']||''), code=txt(r.code||r.customerCode||r['كود العميل']||''), bal=num(r.currentBalance||r.balance||r.debt||r['مديونية']||r['رصيد العميل']);
    Array.from(scope.querySelectorAll('input')).forEach(function(el){
      var meta=norm([el.id,el.name,el.placeholder,el.getAttribute('aria-label')].join(' '));
      if(code && /كود|code/.test(meta) && !/اوردر|order/.test(meta)) el.value=code;
      if(phone && /تليفون|هاتف|موبايل|phone|mobile/.test(meta)) el.value=phone;
      if(/مديونيه|مديونية|رصيد|balance|debt/.test(meta)) el.value=bal||'';
    });
    toast('تم تحميل بيانات العميل: '+name, false);
  }
  function hydrateSalesCustomerPickers(){
    document.querySelectorAll('input,select').forEach(function(el){
      if(el.dataset.es15CustomerPickerBound) return;
      var meta=norm([el.id,el.name,el.placeholder,el.getAttribute('aria-label'), el.previousElementSibling&&el.previousElementSibling.textContent].join(' '));
      var scope=el.closest('form,.card,section,main')||document.body;
      var scopeText=norm(scope.textContent||'');
      var isCustomerField=/عميل|customer/.test(meta) && !/مورد|supplier/.test(meta);
      var inInvoice=/فاتوره مبيعات|فاتورة مبيعات|فاتوره موحده|فاتورة موحدة|الفاتوره الموحده|الفاتورة الموحدة/.test(scopeText);
      if(!isCustomerField || !inInvoice) return;
      el.dataset.es15CustomerPickerBound='1';
      var handler=function(){
        if(el.tagName==='SELECT') return;
        var r=bestCustomerMatch(el.value); if(r) fillCustomerInputFromMatch(el,r);
      };
      el.addEventListener('change',handler); el.addEventListener('blur',handler);
      el.addEventListener('keydown',function(ev){ if(ev.key==='Enter') setTimeout(handler,0); });
    });
  }


  /******** Carry ES14 Fix5 helpers where possible ********/
  function decorateItemRows(){
    document.querySelectorAll('table tr').forEach(function(tr){
      var rowTxt=norm(tr.textContent||''); if(!/موقوف|متوقف/.test(rowTxt))return;
      var btn=Array.from(tr.querySelectorAll('button')).find(function(b){return /إيقاف|ايقاف|archiveItem/.test((b.textContent||'')+' '+(b.getAttribute('onclick')||''));});
      if(!btn || btn.dataset.es15Activate)return;
      var oc=btn.getAttribute('onclick')||''; var m=oc.match(/archiveItem\((\d+)\)/); if(!m)return; var i=m[1];
      btn.dataset.es15Activate='1'; btn.textContent='تفعيل'; btn.onclick=function(ev){ ev&&ev.preventDefault(); api('activateAccountingTemplate',{itemName:txt(tr.children[0]&&tr.children[0].textContent)}).then(function(r){toast(r.message||'تم التفعيل',!r.success); setTimeout(function(){location.reload();},600);}); return false; };
    });
  }
  function ensurePaperPackUI(){
    var kind=$('rawKind'); if(!kind)return;
    if(!Array.from(kind.options).some(function(o){return o.value==='paper pack'||/باكيت/.test(o.textContent||'');})){ var op=document.createElement('option'); op.value='paper pack'; op.textContent='paper pack / باكيت ورق'; kind.appendChild(op); }
    if(!$('es15PaperPackBox')){
      var box=document.createElement('div'); box.id='es15PaperPackBox'; box.className='es15-ledger-panel hidden';
      box.innerHTML='<b>حساب باكيت الورق</b><div class="es15-ledger-grid"><div><label>سعر الباكو</label><input id="rawPackPrice" type="number"></div><div><label>عدد الورق في الباكو</label><input id="rawPackSheets" type="number" placeholder="50 أو 100"></div><div><label>تكلفة الورقة</label><input id="rawSheetCost" type="number" readonly></div><div><label>مقاس الورقة</label><input id="rawPaperSize" placeholder="A4 / A3 / 30x40"></div></div>';
      var parent=kind.closest('.grid')||kind.parentNode.parentNode; if(parent&&parent.parentNode)parent.parentNode.insertBefore(box,parent.nextSibling);
      ['rawPackPrice','rawPackSheets'].forEach(function(id){ var el=$(id); if(el) el.addEventListener('input',calcPaperPack); });
      kind.addEventListener('change',togglePaperPack);
    }
    togglePaperPack();
  }
  function togglePaperPack(){ var show=/paper pack|باكيت/.test(txt(($('rawKind')||{}).value)); var box=$('es15PaperPackBox'); if(box)box.classList.toggle('hidden',!show); if(show)calcPaperPack(); }
  function calcPaperPack(){ var price=num(($('rawPackPrice')||{}).value), sheets=num(($('rawPackSheets')||{}).value); var cost=price&&sheets?price/sheets:0; set('rawSheetCost',cost?cost.toFixed(4):''); if(cost)set('rawCost',cost.toFixed(4)); }

  function apply(){
    closeMenus(false); installLedgerButtons(); ensureLedgerPanel(); decorateItemRows(); ensurePaperPackUI(); decorateCustomerRows(); decorateSupplierRows(); hydrateSalesCustomerPickers(); removeLedgerButtonsFromWrongPlaces();
    document.title='إيزي ستور مطبعجي ES15.1 V1858 - Ledger Placement Fix';
    document.querySelectorAll('.version-badge,.top .muted,.brand p').forEach(function(el){ if(/V13|Batch32|V8|الإصدار|app\.js/.test(el.textContent||'')) el.textContent='ES15.1 V1858 Ledger Placement Fix / app.js'; });
  }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,250);setTimeout(loadParties,900);setTimeout(apply,1600);});
  setInterval(apply,3000);
})();
