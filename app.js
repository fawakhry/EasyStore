(function(){
  'use strict';

  const VERSION = 'ES45 V1920 Custody & Department Day Close';
  window.EASYSTORE_MATBAGY_VERSION = VERSION;

  const app = document.getElementById('app');
  const qs = new URLSearchParams(location.search);
  const now = () => new Date().toLocaleString('ar-EG');
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const num = v => { const n = parseFloat(String(v || '').replace(/[٬,]/g,'.')); return Number.isFinite(n) ? n : 0; };
  const money = n => num(n).toLocaleString('ar-EG',{maximumFractionDigits:2}) + ' ج';
  const nkey = v => String(v || '').toLowerCase().replace(/[إأآا]/g,'ا').replace(/[ى]/g,'ي').replace(/[ةه]/g,'ه').replace(/[ؤ]/g,'و').replace(/[ئ]/g,'ي').trim();
  const val = id => $(id) ? $(id).value : '';
  const set = (id,v) => { if($(id)) $(id).value = v == null ? '' : v; };
  window.set = set;

  function readSso(){
    let handoff = {};
    try{ handoff = JSON.parse(localStorage.getItem('MATBAGY_EMPLOYEE_SSO') || '{}'); }catch(e){}
    const hp = handoff.params || {};
    const hu = handoff.user || {};
    return {
      name: hp.name || hp.username || hu.name || hu.username || 'موظف',
      username: hp.username || hp.name || hu.username || hu.name || 'employee',
      token: hp.token || hu.token || '',
      mode: hp.mode || hp.roleMode || hu.mode || hu.roleMode || '',
      department: hp.department || hu.department || ''
    };
  }

  const user = readSso();
  const roleKey = () => nkey([user.name,user.username,user.mode,user.department].join(' '));
  const isAdmin = () => /ضياء|diaa|admin|full|kitchen|اداره|إدارة/.test(roleKey());
  const isLaser = () => /جابر|gaber|jaber|laser|ليزر/.test(roleKey());
  const isPrint = () => !isLaser() && /وائل|wael|print|طباع/.test(roleKey());
  const isFinal = () => /رحمه|رحمة|ريفان|ريڤان|rahma|revan|rivan|final/.test(roleKey());
  const roleText = () => isAdmin() ? 'ضياء / مطبخ الحسابات' : isLaser() ? 'جابر / الليزر' : isPrint() ? 'وائل / الطباعة' : isFinal() ? 'رحمة أو ريفان / تقفيل فواتير' : 'موظف';
  const userDept = () => isLaser() ? 'ليزر' : isPrint() ? 'طباعة' : (user.department || '');
  function allowedScreens(){
    if(isAdmin()) return ['dashboard','suppliers','customers','items','purchase','sales','final','stock','kitchen','dailyClose','legacy','reports','health'];
    if(isPrint() || isLaser()) return ['dept','deptPurchases','waste','stock'];
    if(isFinal()) return ['sales','final','customers','deptView'];
    return ['sales'];
  }
  function canManageAccounting(){ return isAdmin(); }
  function canFinalize(){ return isAdmin() || isFinal(); }
  function canUseDepartment(){ return isPrint() || isLaser(); }
  function deny(message){ flash(message || 'ليس لديك صلاحية لتنفيذ هذه العملية.', true); return false; }


  function initialScreen(){
    const s = String(qs.get('screen') || qs.get('tab') || qs.get('view') || '').toLowerCase();
    let requested = '';
    if(/dailyclose|day-close|custody|عهد/.test(s)) requested = 'dailyClose';
    else if(/legacy|classif|قديم/.test(s)) requested = 'legacy';
    else if(/deptpurchases|dailypurchases|daily-purchases/.test(s)) requested = 'deptPurchases';
    else if(/final/.test(s)) requested = 'final';
    else if(/dept/.test(s)) requested = 'dept';
    else if(/purchase|شراء|مشتريات/.test(s)) requested = 'purchase';
    else if(/sales|sale|invoice|فاتورة/.test(s)) requested = 'sales';
    else if(/customer|client|عملاء/.test(s)) requested = 'customers';
    else if(/kitchen|raw|materials/.test(s)) requested = 'kitchen';
    return allowedScreens().includes(requested) ? requested : allowedScreens()[0];
  }

  const STORE_KEY = 'EASYSTORE_CLEAN_V1880_DATA';
  const ACCOUNTING_SCOPE_KEY = 'EASYSTORE_ACCOUNTING_SCOPE_V1918';
  function initialAccountingScope(){
    if(!isAdmin()) return 'all';
    const requested=nkey(qs.get('accountingScope')||qs.get('scope')||'');
    if(/laser|ليزر/.test(requested)) return 'laser';
    if(/print|طباع/.test(requested)) return 'print';
    try{
      const saved=String(localStorage.getItem(ACCOUNTING_SCOPE_KEY)||'all');
      return ['all','laser','print'].includes(saved)?saved:'all';
    }catch(e){ return 'all'; }
  }
  const state = {
    active: initialScreen(),
    accountingScope: initialAccountingScope(),
    loading: false,
    data: {
      materials: [], templates: [], suppliers: [], purchases: [], dailyPurchases: [], sales: [], customers: [],
      stockMoves: [], wasteLines: [], deptLines: [], finalInvoices: [], custodyEntries: [], custodySummary: [], departmentDayCloses: [], unclassifiedRows: [], summary: {}
    },
    recipeComps: [], salePulledLines: [], saleSelectedCustomer: null, saleCustomerContext: null, customerSearchTimer: null, customerSearchSeq: 0, customerDropdownLocked: false,
    laserQuote: null, saleRequestId: '', finalRequestId: '', purchaseRequestId: '', dailyPurchaseRequestId: '',
    customerAccount: null, customerAccountSelected: '', customerAccountRequestId: '', dailyReport: null, dailyReportDate: '', dailyReportDepartment: 'ليزر'
  };

  function saveLocal(){ localStorage.setItem(STORE_KEY, JSON.stringify(state.data)); }
  function loadLocal(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }catch(e){ return {}; } }
  function mergeData(d){
    const local = loadLocal();
    state.data = Object.assign({materials:[],templates:[],suppliers:[],purchases:[],dailyPurchases:[],sales:[],customers:[],stockMoves:[],wasteLines:[],deptLines:[],finalInvoices:[],custodyEntries:[],custodySummary:[],departmentDayCloses:[],unclassifiedRows:[],summary:{}}, local, d || {});
    ['materials','templates','suppliers','purchases','dailyPurchases','sales','customers','stockMoves','wasteLines','deptLines','finalInvoices','custodyEntries','custodySummary','departmentDayCloses','unclassifiedRows'].forEach(k=>{ if(!Array.isArray(state.data[k])) state.data[k] = []; });
  }

  function api(action, data){
    return new Promise((resolve,reject)=>{
      const base = String(window.TREND_API_URL || '').trim();
      if(!base) return reject(new Error('رابط Apps Script غير مضبوط في config.js'));
      const cb = 'ES32_' + Date.now() + '_' + Math.random().toString(16).slice(2);
      const s = document.createElement('script');
      let done = false;
      function cleanup(){ if(done) return; done = true; try{ delete window[cb]; }catch(e){ window[cb] = undefined; } if(s.parentNode) s.parentNode.removeChild(s); }
      window[cb] = r => { cleanup(); resolve(r || {}); };
      const params = new URLSearchParams(Object.assign({ action, callback: cb, username:user.username, name:user.name, token:user.token, _ts:Date.now() }, data || {}));
      s.onerror = () => { cleanup(); reject(new Error('فشل الاتصال بالسيرفر')); };
      s.src = base + '?' + params.toString();
      document.body.appendChild(s);
      setTimeout(()=>{ if(!done){ cleanup(); reject(new Error('انتهت مهلة الاتصال بالسيرفر')); } }, 18000);
    });
  }

  function msg(t,bad){ const m=$('mainMsg'); if(m){ m.className = 'msg ' + (bad ? 'bad' : ''); m.textContent = t || ''; } }
  function flash(t,bad){ msg(t,bad); setTimeout(()=>msg('',false), 4500); }

  function materialName(r){ return r.materialName || r.itemName || r.name || r['اسم الخامة'] || r['الاسم'] || ''; }
  function templateName(r){ return r.itemName || r.templateName || r.materialName || r.name || r['اسم البند'] || r['اسم الصنف'] || ''; }
  function matCost(r){ return num(r.computedUnitCost || r.calculatedUnitCost || r.unitCost || r.fixedCost || r.cost || r['تكلفة محسوبة'] || r['تكلفة'] || r['سعر الوحدة']); }
  function matSale(r){ return num(r.salePrice || r.systemSale || r.price || r['سعر بيع رسمي'] || r['بيع']); }
  function matStock(r){ return num(r.stockQty || r.stock || r.balance || r['رصيد']); }
  function matMin(r){ return num(r.minStock || r['حد النقص']); }
  function matDept(r){ return r.department || r.dept || r['القسم'] || 'عام'; }
  function matType(r){ return r.materialKind || r.type || r['النوع'] || ''; }
  function activeRow(r){ return !/لا|متوقف|موقوف|archived|inactive/i.test(String(r.active || r['مفعل'] || 'نعم')); }
  function isOrderPlaceholderName(name){ const n=nkey(name||''); return !n || /^اوردر جديد/.test(n) || /^طلب جديد/.test(n) || /اوردر جديد\s*-/.test(n) || /طلب جديد\s*-/.test(n) || /new order/.test(n); }
  function gp(cost, sale){ const profit = num(sale) - num(cost); const margin = num(sale) ? (profit / num(sale)) * 100 : 0; return {profit, margin}; }


  function materialKindLabel(v){
    const k=nkey(v);
    if(/lamination|لامينشن/.test(k)) return 'رول لامينشن';
    if(/paper pack|باكيت|باكت/.test(k)) return 'باكيت ورق';
    if(/paper roll|رول ورق/.test(k)) return 'رول ورق';
    if(/ink|حبر/.test(k)) return 'حبر';
    if(/machine|ماكينه|ماكينة|مصروف/.test(k)) return 'مصروف ماكينة';
    if(/laser|ليزر/.test(k)) return 'خامة ليزر';
    if(/raw|عام|خامة/.test(k)) return 'خامة عامة';
    return v || '';
  }
  function rowBlob(r){ try{return nkey(Object.keys(r||{}).join(' ')+' '+Object.values(r||{}).join(' '));}catch(e){return '';} }
  function isMaterialRecord(r){
    const b=rowBlob(r), nm=nkey(materialName(r)), tn=nkey(templateName(r));
    if(!r) return false;
    if(/materialname|اسم الخامه|اسم الخامة|materialkind|unitcost|سعر الوحده|سعر الوحدة|رصيد|stockqty|raw|paper roll|lamination roll|paper pack|ink|machine expense|رول|حبر|خامة|خامه/.test(b) && !/itemname|اسم الصنف|template|componentsjson|صنف بمكونات/.test(b)) return true;
    if(nm && !tn) return true;
    return false;
  }
  function isTemplateRecord(r){
    if(!r) return false;
    const b=rowBlob(r), name=nkey(templateName(r));
    if(!name || isOrderPlaceholderName(name)) return false;
    if(isMaterialRecord(r)) return false;
    if(/itemname|اسم الصنف|اسم البند|template|componentsjson|صنف|منتج|bom|كارت|تابلوه|مج|استيك|استيكر|ستيكر|درع|سنيور|ماكيت|قطعه|قطعة/.test(b+name)) return true;
    return matSale(r)>0 || num(r.fixedCost || r.computedUnitCost || r.calculatedUnitCost)>0;
  }
  function productTemplates(){ return templates().filter(isTemplateRecord); }
  function materialRows(){ return materials().filter(r=>!isTemplateRecord(r)); }
  function upsertByNameDept(arr,p,nameFn,deptFn){
    const name=nkey(nameFn(p)), dept=nkey(deptFn(p));
    const i=arr.findIndex(x=>nkey(nameFn(x))===name && nkey(deptFn(x))===dept);
    if(i>=0){ arr[i]=Object.assign({}, arr[i], p); return {index:i, updated:true}; }
    arr.unshift(p); return {index:0, updated:false};
  }
  function normalizeIncomingData(d){
    d=d||{};
    let mats=[].concat(d.materials||d.rawMaterials||[]);
    let tmps=[].concat(d.templates||d.items||[]);
    const keepTemplates=[];
    tmps.forEach(r=>{ if(isMaterialRecord(r)) mats.push(r); else if(isTemplateRecord(r)) keepTemplates.push(r); });
    d.materials=mats; d.templates=keepTemplates;
    return d;
  }
  function recalcTemplatesLocal(){
    const mats=materials();
    (state.data.templates||[]).forEach(t=>{
      let comps=[];
      try{ comps=JSON.parse(t.componentsJson || t.components || t['المكونات'] || '[]'); }catch(e){ comps=[]; }
      if(!Array.isArray(comps) || !comps.length) return;
      let total=0;
      comps=comps.map(c=>{
        const m=mats.find(x=>nkey(materialName(x))===nkey(c.materialName||c.name||c.material));
        const qty=num(c.qty||c.quantity||1)||1;
        const cost=m ? matCost(m)*qty : num(c.cost);
        total += cost;
        return Object.assign({}, c, {qty, cost});
      });
      t.componentsJson=JSON.stringify(comps);
      t.fixedCost=total;
      t.computedUnitCost=total;
      t.calculatedUnitCost=total;
    });
  }

  function materials(){ return state.data.materials || []; }
  function templates(){ return state.data.templates || []; }
  function visibleTemplates(){
    const list = productTemplates().filter(activeRow);
    if(isAdmin()) return accountingScopedRows(list,true);
    if(isFinal()) return list;
    const d = userDept();
    return list.filter(r => activeRow(r) && ['عام','مشترك',d].includes(String(matDept(r) || '')));
  }
  function materialOptions(filter){
    const rows=isAdmin()?scopedMaterials():materialRows();
    return rows.filter(activeRow).filter(filter || (()=>true)).map((r,i)=>`<option value="${esc(materialName(r))}">${esc(materialName(r))} - ${esc(matDept(r))}</option>`).join('');
  }
  function itemOptions(){
    const rows=visibleTemplates().filter(r=>!isOrderPlaceholderName(templateName(r)));
    if(!rows.length) return '<option value="" disabled>لا توجد أصناف مفعلة لهذا القسم من مطبخ الحسابات</option>';
    return rows.map((r,i)=>`<option value="${i}">${esc(templateName(r))} - ${esc(matDept(r))}</option>`).join('');
  }
  function supplierOptions(){ return (state.data.suppliers||[]).map(s=>`<option value="${esc(s.name||s.supplier||'')}"></option>`).join(''); }
  function customerDebt(c){ return num(c && (c.debtAmount ?? c.debt ?? c.currentBalance ?? c.remainingBalance ?? c.customerDebt ?? 0)); }
  function customerDebtText(c){ const d=customerDebt(c); return d>0 ? 'مديونية: '+money(d) : (d<0 ? 'رصيد دائن: '+money(Math.abs(d)) : 'مديونية: 0 ج'); }
  function customerDebtClass(c){ return customerDebt(c)>0 ? 'debtDue' : (customerDebt(c)<0 ? 'debtCredit' : 'debtClear'); }
  function customerOptions(){ return (state.data.customers||[]).map(c=>`<option value="${esc(c.name||c.customerName||c.phone||'')}">${esc((c.phone||c.mobile||'')+' - '+customerDebtText(c))}</option>`).join(''); }
  function matByName(name){ const k=nkey(name); return materials().find(r => nkey(materialName(r)) === k); }
  function itemByName(name){ const k=nkey(name); return productTemplates().find(r => nkey(templateName(r)) === k); }

  function accountingScopeDepartment(){ return state.accountingScope==='laser'?'ليزر':state.accountingScope==='print'?'طباعة':''; }
  function accountingScopeLabel(){ return state.accountingScope==='laser'?'قسم الليزر':state.accountingScope==='print'?'قسم الطباعة':'كل الأقسام'; }
  function accountingRowDepartment(r){ return String((r&&(r.department||r.dept||r.itemDepartment||r['القسم']||r['قسم الصنف']))||'').trim(); }
  function accountingSharedDepartment(dept){ return /مشترك|عام|shared|general/.test(nkey(dept)); }
  function accountingScopeMatchesDepartment(dept,includeShared){
    const wanted=accountingScopeDepartment();
    if(!isAdmin()||!wanted) return true;
    const actual=nkey(dept);
    if(actual===nkey(wanted)) return true;
    return !!includeShared&&accountingSharedDepartment(dept);
  }
  function accountingScopedRows(rows,includeShared){ return (rows||[]).filter(r=>accountingScopeMatchesDepartment(accountingRowDepartment(r),!!includeShared)); }
  function scopedMaterials(){ return accountingScopedRows(materialRows(),true); }
  function scopedTemplates(){ return accountingScopedRows(productTemplates(),true); }
  function scopedPurchases(){ return accountingScopedRows(state.data.purchases||[],false); }
  function scopedDailyPurchases(){ return accountingScopedRows(state.data.dailyPurchases||[],false); }
  function scopedWasteLines(){ return accountingScopedRows(state.data.wasteLines||[],false); }
  function scopedStockMoves(){ return accountingScopedRows(state.data.stockMoves||[],false); }
  function scopedDeptLines(){ return accountingScopedRows(state.data.deptLines||[],false); }
  function scopedBilledDeptLines(){ return scopedDeptLines().filter(r=>!isUnbilledDeptLine(r)); }
  function accountingScopeSalesTotal(){
    if(!isAdmin()||state.accountingScope==='all') return (state.data.sales||[]).reduce((s,r)=>s+num(r.total||r.amount),0);
    return scopedBilledDeptLines().reduce((s,r)=>s+rowLineTotal(r),0);
  }
  function accountingScopeBar(){
    if(!isAdmin()) return '';
    const buttons=[['all','كل الأقسام'],['laser','قسم الليزر'],['print','قسم الطباعة']];
    return `<section class="accountingScopeBar" data-accounting-scope="${esc(state.accountingScope)}"><div><span>طريقة عرض الحسابات</span><h2>${esc(accountingScopeLabel())}</h2><p>${state.accountingScope==='all'?'عرض الحسابات المجمعة.':'الفواتير والمشتريات والمخزون والتقارير الآن للقسم المختار فقط.'}</p></div><div class="accountingScopeButtons">${buttons.map(x=>`<button class="${state.accountingScope===x[0]?'active':''}" onclick="ES27.setAccountingScope('${x[0]}')">${x[1]}</button>`).join('')}</div><small>الفاتورة النهائية وحساب العميل يظلان موحدين. البنود المشتركة تظهر في الكتالوج، وتدخل ماليًا ضمن «كل الأقسام» فقط.</small></section>`;
  }
  function accountingScopeTitle(title){ if(title==='التقارير والأرباح الفعلية') title='التقارير والأرباح'; return state.accountingScope==='all'?title:(title+' · '+accountingScopeLabel()); }
  function accountingDeptOptions(selected,allowBlank){
    selected=selected||accountingScopeDepartment();
    return `${allowBlank?'<option value="">اختار القسم</option>':''}<option value="ليزر" ${selected==='ليزر'?'selected':''}>ليزر</option><option value="طباعة" ${selected==='طباعة'?'selected':''}>طباعة</option>`;
  }
  function purchaseMaterialOptions(department){
    const wanted=nkey(department||accountingScopeDepartment());
    if(!wanted) return '';
    return materialRows().filter(activeRow).filter(r=>{ const d=nkey(matDept(r)); return d===wanted||accountingSharedDepartment(d); }).map(r=>`<option value="${esc(materialName(r))}">${esc(materialName(r))} - ${esc(matDept(r))}</option>`).join('');
  }



  function closeFloatingPanels(){
    const drop = $('saCustomerDrop');
    if(drop){
      drop.classList.add('hidden');
      drop.innerHTML = '';
      drop.__rows = [];
    }
    const finalDrop = $('fiCustomerDrop');
    if(finalDrop){
      finalDrop.classList.add('hidden');
      finalDrop.innerHTML = '';
      finalDrop.__rows = [];
    }
    const menu = $('clientInvoiceMenu');
    if(menu) menu.classList.add('hidden');
  }
  function customerDropdownCanOpen(){ return state.active === 'sales' && !state.customerDropdownLocked; }

  function table(rows, heads, mapper){
    rows = Array.isArray(rows) ? rows : [];
    if(!rows.length) return '<div class="empty">لا توجد بيانات حتى الآن.</div>';
    return `<div class="tablewrap"><table><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr>${mapper(r,i).map(c=>`<td>${c == null ? '' : c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function tabs(){
    let list;
    if(isAdmin()) list = [['dashboard','لوحة الحسابات'],['suppliers','الموردين'],['customers','العملاء'],['items','الأصناف'],['purchase','فواتير الشراء'],['sales','فواتير المبيعات'],['final','التقفيل النهائي'],['stock','المخزون'],['kitchen','مطبخ الحسابات'],['dailyClose','تقفيل الأقسام والعهد'],['legacy','تصنيف القديم'],['reports','التقارير'],['health','فحص النظام']];
    else if(isPrint() || isLaser()) list = [['dept','فاتورة القسم'],['deptPurchases','مشتريات اليوم'],['waste','هوالك القسم'],['stock','الأصناف المتاحة']];
    else if(isFinal()) list = [['sales','فواتير المبيعات'],['final','تقفيل الفاتورة'],['customers','العملاء'],['deptView','أجزاء الأقسام']];
    else list = [['dashboard','لوحة الحسابات'],['sales','فواتير المبيعات']];
    if(!list.some(x=>x[0] === state.active)) state.active = list[0][0];
    return `<div class="tabs">${list.map(x=>`<button class="tab ${state.active===x[0]?'active':''}" onclick="ES27.go('${x[0]}')">${x[1]}</button>`).join('')}</div>`;
  }

  function shell(){
    app.innerHTML = `<div class="wrap">
      <div class="top">
        <div><h1>💰 إيزي ستور مطبعجي - برنامج الحسابات ES44</h1><p>أصناف، موردين، فواتير شراء ومبيعات، مخزون، تقارير، ومطبخ الحسابات.</p><div class="versionLine">${VERSION} / app.js محمل: ${new Date().toLocaleTimeString('ar-EG')}</div></div>
        <div class="actions"><span class="badge">${esc(user.name)} - ${esc(roleText())}</span><button class="btn secondary" onclick="ES27.load(true)">تحديث البيانات</button><button class="btn secondary" onclick="ES27.hardReload()">تحديث البرنامج</button><button class="btn secondary" onclick="history.back()">إغلاق</button></div>
      </div>
      <div id="mainMsg" class="msg"></div>
      ${tabs()}
      ${accountingScopeBar()}
      <div id="screen"></div>
    </div>`;
    render();
  }

  function render(){
    const sc = $('screen'); if(!sc) return;
    if(!allowedScreens().includes(state.active)) state.active = allowedScreens()[0];
    const m = {dashboard:screenDashboard,suppliers:screenSuppliers,customers:screenCustomers,items:screenItems,purchase:screenPurchase,deptPurchases:screenDeptPurchases,sales:screenSales,stock:screenStock,kitchen:screenKitchen,dailyClose:screenDailyClose,legacy:screenLegacy,reports:screenReports,health:screenHealth,dept:screenDept,waste:screenWaste,final:screenFinal,deptView:screenDeptView};
    sc.innerHTML = (m[state.active] || screenDashboard)();
    if(state.active==='final') enhanceFinalPaymentMethod();
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', nkey(b.textContent).includes(nkey(tabLabel(state.active)))));
  }
  function tabLabel(t){ return ({dashboard:'لوحة',suppliers:'الموردين',customers:'العملاء',items:'الأصناف',purchase:'الشراء',deptPurchases:'مشتريات اليوم',sales:'المبيعات',stock:'المخزون',kitchen:'مطبخ',dailyClose:'تقفيل الأقسام',legacy:'تصنيف',reports:'التقارير',health:'فحص',dept:'فاتورة',waste:'هوالك',final:'تقفيل',deptView:'أجزاء'})[t] || ''; }
  function enhanceFinalPaymentMethod(){
    const paid=$('fiPaid'); if(!paid||$('fiPayment')) return;
    paid.closest('.field')?.insertAdjacentHTML('afterend','<div class="field"><label>طريقة الدفع</label><select id="fiPayment"><option>نقدي</option><option>إنستا باي</option><option>آجل</option><option>جزئي</option></select></div>');
  }

  function screenDashboard(){
    const sales = accountingScopeSalesTotal();
    const purchases = scopedPurchases().reduce((s,r)=>s+num(r.total||r.amount),0);
    const lows = scopedMaterials().filter(m=>activeRow(m)&&matMin(m)>0&&matStock(m)<=matMin(m));
    const salesLabel=state.accountingScope==='all'?'مبيعات مسجلة':'مبيعات القسم المقفولة';
    return `<div class="card"><div class="toolbar"><h2>${esc(accountingScopeTitle('لوحة الحسابات'))}</h2><input class="searchInput" placeholder="بحث سريع" oninput="ES27.quickSearch(this.value)"></div><div class="grid four"><div class="kpi"><b>${money(sales)}</b><span>${salesLabel}</span></div><div class="kpi"><b>${money(purchases)}</b><span>مشتريات مسجلة</span></div><div class="kpi"><b>${money(sales-purchases)}</b><span>صافي تقديري</span></div><div class="kpi"><b>${lows.length}</b><span>خامات تحت الحد</span></div></div><div class="quickbar"><button class="btn" onclick="ES27.go('items')">الأصناف</button><button class="btn" onclick="ES27.go('purchase')">فاتورة شراء</button><button class="btn" onclick="ES27.go('sales')">فاتورة مبيعات</button><button class="btn" onclick="ES27.go('kitchen')">مطبخ الحسابات</button><button class="btn secondary" onclick="ES27.load(true)">تحديث الآن</button></div></div>${lows.length?'<div class="card"><h3>تنبيهات النواقص</h3>'+table(lows,['الخامة','الرصيد','حد النقص','القسم'],r=>[esc(materialName(r)),esc(matStock(r)),esc(matMin(r)),esc(matDept(r))])+'</div>':''}`;
  }

  function screenSuppliers(){
    return `<div class="card"><h2>الموردين</h2><div class="grid four"><div class="field"><label>اسم المورد</label><input id="supName"></div><div class="field"><label>هاتف</label><input id="supPhone"></div><div class="field"><label>رصيد افتتاحي</label><input id="supOpening" type="number"></div><div class="field"><label>عنوان / ملاحظات</label><input id="supAddress"></div></div><button class="btn" onclick="ES27.saveSupplier()">حفظ / تحديث المورد</button></div>${table(state.data.suppliers,['المورد','الهاتف','رصيد افتتاحي','إجراء'],(s,i)=>[esc(s.name||s.supplier),esc(s.phone||''),money(s.opening||s.openingBalance),`<button class="btn small secondary" onclick="ES27.editSupplier(${i})">تعديل</button>`])}`;
  }

  function screenCustomers(){
    const drawer=state.customerAccountSelected ? `<div class="customerAccountDrawerBackdrop" onclick="ES27.closeCustomerAccount()" aria-hidden="true"></div><aside id="customerAccountPanel" class="customerAccountDrawer" role="dialog" aria-modal="true" aria-label="كشف حساب العميل"><div class="customerAccountDrawerBar"><strong>حساب العميل</strong><button class="btn small secondary" onclick="ES27.closeCustomerAccount()" aria-label="إغلاق كشف الحساب">إغلاق ×</button></div>${customerAccountPanel()}</aside>` : '';
    return `<section class="customerAccountsHero"><div><span>حسابات العملاء</span><h2>كشف الحساب والتحصيل</h2><p>ضياء ورحمة وريفان يمكنهم فتح كشف العميل وتسجيل التحصيل. إضافة المديونية والتسويات متاحة لضياء فقط.</p></div><div class="customerAccountsRoles"><b>تحصيل: ضياء / رحمة / ريفان</b><b>تسويات: ضياء فقط</b></div></section><div class="card"><div class="toolbar"><div><h2>العملاء</h2><div class="muted">ابحث بالاسم أو رقم الهاتف ثم افتح الحساب؛ سيظهر الكشف بجانب القائمة مباشرة.</div></div><input id="custSearch" class="searchInput" placeholder="بحث عن عميل" oninput="ES27.filterCustomers()"></div><div id="custTable">${customersTable(state.data.customers)}</div></div>${drawer}`;
  }
  function customerAccountToken(name){ return encodeURIComponent(String(name||'')).replace(/'/g,'%27'); }
  function customersTable(rows){ return table(rows||[],['العميل','الهاتف','النوع/المسؤول','المديونية','الحساب'],c=>{ const name=customerMainName(c); const selected=nkey(state.customerAccountSelected)===nkey(name); return [esc(name),esc(c.phone||c.mobile||''),esc(c.type||c.manager||''),`<span class="customerDebtBadge ${customerDebtClass(c)}">${esc(customerDebtText(c))}</span>`,`<button class="btn small ${selected?'':'secondary'}" onclick="ES27.openCustomerAccount('${customerAccountToken(name)}')">${selected?'الحساب مفتوح':'فتح الحساب'}</button>`]; }); }
  function customerAccountDate(value){
    if(!value) return '-';
    const d=new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('ar-EG');
  }
  function customerAccountOperationLabel(t){
    return t.operationLabel || ({payment_received:'تحصيل من العميل',opening_debt:'إضافة مديونية',adjustment_increase:'تسوية بالزيادة',adjustment_decrease:'تسوية بالنقص',invoice:'فاتورة عميل'}[t.operation] || t.operation || 'حركة');
  }
  function customerAccountPanel(){
    const account=state.customerAccount;
    if(!state.customerAccountSelected) return '<div class="card customerAccountEmpty"><h3>افتح حساب عميل</h3><p>اضغط «فتح الحساب» بجوار اسم العميل لعرض الرصيد والحركات.</p></div>';
    if(account && account.loading) return '<div class="card customerAccountEmpty"><h3>جاري تحميل كشف الحساب...</h3></div>';
    if(account && account.error) return `<div class="card customerAccountEmpty"><h3>تعذر تحميل الحساب</h3><p>${esc(account.error)}</p><button class="btn secondary" onclick="ES27.openCustomerAccount('${customerAccountToken(state.customerAccountSelected)}')">إعادة المحاولة</button></div>`;
    if(!account || !account.success) return '<div class="card customerAccountEmpty"><h3>اختر عميلًا لعرض حسابه.</h3></div>';
    const customer=account.customer||{};
    const balance=num(account.balance);
    const canAdjust=isAdmin() && (!account.permissions || account.permissions.canAdjust!==false);
    const transactions=Array.isArray(account.transactions)?account.transactions:[];
    const movementOptions=`<option value="payment_received">تحصيل من العميل</option>${canAdjust?'<option value="opening_debt">إضافة مديونية</option><option value="adjustment_increase">تسوية بالزيادة</option><option value="adjustment_decrease">تسوية بالنقص</option>':''}`;
    const movementForm=(balance>0 || canAdjust) ? `<div class="customerMovementForm"><div class="field"><label>نوع الحركة</label><select id="caOperation" onchange="ES27.resetCustomerAccountRequest()">${movementOptions}</select></div><div class="field"><label>المبلغ</label><input id="caAmount" type="number" min="0.01" step="0.01" placeholder="0.00" oninput="ES27.resetCustomerAccountRequest()"></div><div class="field"><label>طريقة الدفع</label><select id="caMethod" onchange="ES27.resetCustomerAccountRequest()"><option>نقدي</option><option>إنستا باي</option><option>فودافون كاش</option><option>تحويل بنكي</option><option>فيزا</option><option>أخرى</option></select></div><div class="field"><label>رقم مرجع / إيصال</label><input id="caRef" placeholder="اختياري" oninput="ES27.resetCustomerAccountRequest()"></div><div class="field customerMovementNotes"><label>ملاحظات</label><input id="caNotes" placeholder="سبب الحركة أو أي تفاصيل" oninput="ES27.resetCustomerAccountRequest()"></div><div class="customerMovementAction"><button id="caSaveBtn" class="btn" onclick="ES27.saveCustomerAccountMovement()">حفظ الحركة</button></div></div>` : '<div class="customerAccountSettled">✓ لا توجد مديونية لتحصيلها من هذا العميل.</div>';
    return `<section class="card customerAccountCard"><div class="customerAccountHead"><div><span class="customerAccountEyebrow">كشف حساب العميل</span><h2>${esc(customer.name||state.customerAccountSelected)}</h2><p>${customer.phone?esc(customer.phone):'لا يوجد رقم هاتف مسجل'}${customer.type?' · '+esc(customer.type):''}${customer.manager?' · المسؤول: '+esc(customer.manager):''}</p></div><div class="customerBalanceBox ${balance>0?'hasDebt':'isClear'}"><span>الرصيد المستحق</span><b>${money(balance)}</b><small>${balance>0?'مطلوب من العميل':'الحساب مسدد'}</small></div></div><div class="customerPermissionNote">${canAdjust?'يمكنك التحصيل وإضافة المديونية أو عمل تسوية إدارية.':'يمكنك تسجيل تحصيل من مديونية العميل فقط.'}</div>${movementForm}<div class="customerLedgerTitle"><h3>حركات الحساب</h3><span>${transactions.length} حركة</span></div>${table(transactions,['الوقت','الحركة','المبلغ','طريقة الدفع','المرجع','قبل','بعد','سجل بواسطة','ملاحظات'],t=>[esc(customerAccountDate(t.createdAt)),esc(customerAccountOperationLabel(t)),money(t.amount),esc(t.paymentMethod||'-'),esc(t.refNo||'-'),money(t.balanceBefore),money(t.balanceAfter),esc(t.createdBy||'-'),esc(t.notes||'-')])}</section>`;
  }

  function screenItems(){
    const selected=accountingScopeDepartment();
    return `<div class="card"><h2>${esc(accountingScopeTitle('الأصناف'))}</h2><div class="grid six"><div class="field"><label>القسم</label><select id="itDept"><option ${selected==='طباعة'?'selected':''}>طباعة</option><option ${selected==='ليزر'?'selected':''}>ليزر</option><option>مشترك</option><option>عام</option></select></div><div class="field"><label>اسم الصنف</label><input id="itName"></div><div class="field"><label>نوع</label><select id="itType"><option>صنف بيع</option><option>خامة</option><option>صنف مركب</option></select></div><div class="field"><label>مقاس</label><input id="itSize"></div><div class="field"><label>سعر البيع</label><input id="itSale" type="number"></div><div class="field"><label>تكلفة ثابتة</label><input id="itCost" type="number"></div></div><div class="actions"><button class="btn" onclick="ES27.saveItem()">حفظ / تحديث الصنف</button><button class="btn secondary" onclick="ES27.clearItemForm()">جديد</button></div></div>${itemsTable()}`;
  }
  function itemsTable(){ const all=productTemplates(); const rows=all.map((row,index)=>({row,index})).filter(x=>accountingScopeMatchesDepartment(matDept(x.row),true)); return table(rows,['الصنف','القسم','التكلفة','البيع','مجمل الربح','نسبة الربح','الحالة','إجراء'],x=>{ const r=x.row, cost=matCost(r), sale=matSale(r), g=gp(cost,sale); return [esc(templateName(r)),esc(matDept(r)),isAdmin()?money(cost):'<span class="costHidden">مخفي</span>',money(sale),isAdmin()?money(g.profit):'<span class="costHidden">مخفي</span>',isAdmin()?g.margin.toFixed(1)+'%':'-',activeRow(r)?'مفعل':'موقوف',`<span class="tableActions"><button class="btn small secondary" onclick="ES27.editItem(${x.index})">تعديل</button><button class="btn small warn" onclick="ES27.archiveItem(${x.index})">إيقاف</button></span>`]; }); }

  function dailyPurchaseTodayKey(){
    try{
      const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      const values={}; parts.forEach(p=>{ if(p.type!=='literal') values[p.type]=p.value; });
      return values.year+'-'+values.month+'-'+values.day;
    }catch(e){ return new Date().toISOString().slice(0,10); }
  }
  function dailyPurchaseEmployee(r){ return String((r&&(r.employee||r.createdBy||r.user))||'').trim(); }
  function dailyPurchaseStatus(r){ return String((r&&(r.status||r.reviewStatus))||'قيد مراجعة ضياء').trim(); }
  function isDailyPurchasePending(r){ const s=nkey(dailyPurchaseStatus(r)); return !s||/قيد|مراجعه|مراجعة|pending/.test(s); }
  function dailyPurchaseStatusBadge(r){ const s=dailyPurchaseStatus(r); const k=nkey(s); const cls=/مرفوض|رفض|rejected/.test(k)?'rejected':/معتمد|approved/.test(k)?'approved':'pending'; return `<span class="dailyPurchaseStatus ${cls}">${esc(s)}</span>`; }
  function isDailyPurchaseApproved(r){ return /معتمد|approved/.test(nkey(dailyPurchaseStatus(r))); }
  function isDailyPurchaseReversed(r){ return /معكوس|عكس|reversed/.test(nkey(dailyPurchaseStatus(r)+' '+(r.stockStatus||''))); }
  function dailyPurchaseStockStatus(r){ return String((r&&(r.stockStatus||r.inventoryStatus))||(isDailyPurchasePending(r)?'مضاف فورًا':'-')).trim(); }
  function dailyPurchaseStockBadge(r){ const s=dailyPurchaseStockStatus(r); const k=nkey(s); const cls=/عكس|ملغي/.test(k)?'rejected':/مضاف|معتمد/.test(k)?'approved':'pending'; return `<span class="dailyPurchaseStatus ${cls}">${esc(s)}</span>`; }
  function dailyPurchaseToken(value){ return encodeURIComponent(String(value||'')).replace(/'/g,'%27'); }
  function visibleDailyPurchases(){
    const rows=state.data.dailyPurchases||[];
    if(isAdmin()) return scopedDailyPurchases();
    const who=nkey(user.username||user.name||'');
    const dept=nkey(userDept());
    return rows.filter(r=>nkey(dailyPurchaseEmployee(r))===who && nkey(r.department||'')===dept);
  }
  function deptDailyPurchaseRows(){
    const today=dailyPurchaseTodayKey();
    return visibleDailyPurchases().filter(r=>String(r.workDate||'')===today || isDailyPurchasePending(r));
  }
  function dailyPurchaseMaterialOptions(){ const dept=nkey(userDept()); return materialRows().filter(activeRow).filter(r=>{const d=nkey(matDept(r));return !d||d===dept||/مشترك|عام/.test(d)}).map(r=>`<option value="${esc(materialName(r))}">${esc(materialName(r))} - ${esc(matDept(r)||userDept())}</option>`).join(''); }
  function dailyPurchaseEmployeeTable(){
    const rows=deptDailyPurchaseRows();
    if(!rows.length) return custodySummaryCard()+'<div class="empty">لم تسجل مشتريات اليوم بعد.</div>';
    return custodySummaryCard()+table(rows,['الوقت','المورد','فاتورة المورد','الخامة','الكمية','سعر الوحدة','الإجمالي','الدفع','المخزون','المراجعة المالية'],r=>[esc(customerAccountDate(r.createdAt)),esc(r.supplier||''),esc(r.receiptNo||'-'),esc(r.material||r.materialName||''),esc(r.qty),money(r.unit),money(r.total),esc(r.paymentType||'-'),dailyPurchaseStockBadge(r),dailyPurchaseStatusBadge(r)]);
  }
  function dailyPurchasePendingGroups(){
    const groups={};
    visibleDailyPurchases().filter(isDailyPurchasePending).forEach(r=>{
      const employee=dailyPurchaseEmployee(r)||'موظف';
      const date=String(r.workDate||dailyPurchaseTodayKey());
      const key=nkey(employee)+'|'+date;
      if(!groups[key]) groups[key]={employee,date,department:r.department||'',rows:[],total:0};
      groups[key].rows.push(r); groups[key].total+=num(r.total);
    });
    return Object.keys(groups).map(k=>groups[k]).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  }
  function dailyPurchaseAdminReview(){
    const groups=dailyPurchasePendingGroups();
    const pending=groups.reduce((s,g)=>s+g.rows.length,0);
    const total=groups.reduce((s,g)=>s+g.total,0);
    const groupHtml=groups.length?`<div class="dailyPurchaseGroups">${groups.map(g=>`<article class="dailyPurchaseGroup"><div><span>${esc(g.date)}</span><h3>${esc(g.employee)} · ${esc(g.department)}</h3><p>${g.rows.length} بند في انتظار المراجعة</p></div><div class="dailyPurchaseGroupTotal"><b>${money(g.total)}</b><button class="btn" onclick="ES27.approveDailyPurchaseBatch('${dailyPurchaseToken(g.employee)}','${esc(g.date)}')">اعتماد مشتريات اليوم</button></div></article>`).join('')}</div>`:'<div class="customerAccountSettled">✓ لا توجد مشتريات أقسام معلقة للمراجعة.</div>';
    const rows=visibleDailyPurchases().filter(r=>isDailyPurchasePending(r)||String(r.workDate||'')===dailyPurchaseTodayKey()).slice(0,150);
    const reviewTable=rows.length?table(rows,['اليوم','الموظف','القسم','المورد','فاتورة المورد','الخامة','الكمية','السعر','الإجمالي','الدفع','المخزون','المراجعة','قرار'],r=>[esc(r.workDate||''),esc(dailyPurchaseEmployee(r)),esc(r.department||''),esc(r.supplier||''),esc(r.receiptNo||'-'),esc(r.material||r.materialName||''),esc(r.qty),money(r.unit),money(r.total),esc(r.paymentType||'-'),dailyPurchaseStockBadge(r),dailyPurchaseStatusBadge(r),isDailyPurchasePending(r)?`<button class="btn small danger" onclick="ES27.rejectDailyPurchase('${dailyPurchaseToken(r.id)}')">رفض وعكس المخزون</button>`:(isDailyPurchaseApproved(r)&&!isDailyPurchaseReversed(r)?`<button class="btn small warn" onclick="ES27.reversePurchase('${dailyPurchaseToken(r.id)}','')">عكس اعتماد</button>`:'-')]):'';
    return `<section class="card dailyPurchaseAdmin"><div class="toolbar"><div><span class="deptEyebrow">مراجعة ضياء آخر اليوم</span><h2>${esc(accountingScopeTitle('مشتريات جابر ووائل اليومية'))}</h2><p class="muted">المخزون مضاف فور التسجيل. الاعتماد يخصم المدفوع من عهدة الموظف، والعكس يرجع المخزون والمورد والعهدة بسجل دائم.</p></div><div class="dailyPurchaseSummary"><div><span>بنود معلقة</span><b>${pending}</b></div><div><span>إجمالي معلق</span><b>${money(total)}</b></div></div></div>${custodySummaryCard()}${groupHtml}${reviewTable}</section>`;
  }

  function screenDeptPurchases(){
    if(!canUseDepartment()) return '<div class="card"><h2>هذه الشاشة لجابر ووائل فقط.</h2></div>';
    const rows=deptDailyPurchaseRows();
    const today=dailyPurchaseTodayKey();
    const todayRows=rows.filter(r=>String(r.workDate||'')===today);
    const total=todayRows.reduce((s,r)=>s+num(r.total),0);
    const pending=rows.filter(isDailyPurchasePending).length;
    return `<div class="deptInvoicePage dailyPurchasePage"><section class="deptInvoiceHero dailyPurchaseHero"><div><span class="deptEyebrow">زيادة مخزون فورية · مراجعة ضياء آخر اليوم</span><h2>مشتريات ${esc(user.name||user.username)} اليوم</h2><p>سجل كل خامة وقت شرائها؛ رصيد مخزون قسمك يزيد فورًا لتستطيع عمل فواتير المبيعات، بينما فاتورة المورد تنتظر مراجعة ضياء.</p></div><div class="deptHeroBadges"><span>${esc(userDept())}</span><span>${esc(today)}</span><button class="btn small secondary" onclick="ES27.go('dept')">الرجوع لفاتورة القسم</button></div></section><section class="dailyPurchaseSummary deptPurchaseStats"><div><span>بنود اليوم</span><b>${todayRows.length}</b></div><div><span>إجمالي اليوم</span><b>${money(total)}</b></div><div><span>في انتظار ضياء</span><b>${pending}</b></div></section><section class="card dailyPurchaseEditor"><div class="deptSectionTitle"><div><span>＋</span><h3>إضافة مشتريات وزيادة المخزون</h3></div><small>الخامة يجب أن تكون مسجلة في مخزون EasyStore للقسم</small></div><div class="grid four"><div class="field"><label>المورد</label><input id="dpSupplier" list="dpSupplierList" placeholder="اسم المورد" oninput="ES27.resetDailyPurchaseRequest()"><datalist id="dpSupplierList">${supplierOptions()}</datalist></div><div class="field"><label>رقم فاتورة / إيصال المورد</label><input id="dpReceipt" placeholder="اختياري" oninput="ES27.resetDailyPurchaseRequest()"></div><div class="field"><label>الخامة / الصنف المشترى</label><select id="dpMaterial" onchange="ES27.resetDailyPurchaseRequest()"><option value="">اختار من المخزون</option>${dailyPurchaseMaterialOptions()}</select></div><div class="field"><label>طريقة الدفع</label><select id="dpPayment" onchange="ES27.calcDailyPurchase();ES27.resetDailyPurchaseRequest()"><option>نقدي</option><option>إنستا باي</option><option>فودافون كاش</option><option>تحويل بنكي</option><option>آجل</option></select></div></div><div class="grid four"><div class="field"><label>الكمية</label><input id="dpQty" type="number" min="0.01" step="0.01" value="1" oninput="ES27.calcDailyPurchase();ES27.resetDailyPurchaseRequest()"></div><div class="field"><label>سعر الوحدة</label><input id="dpUnit" type="number" min="0.01" step="0.01" oninput="ES27.calcDailyPurchase();ES27.resetDailyPurchaseRequest()"></div><div class="field"><label>الإجمالي</label><input id="dpTotal" readonly value="0.00"></div><div class="field"><label>المدفوع الآن</label><input id="dpPaid" readonly value="0.00"></div></div><div class="field"><label>ملاحظات</label><input id="dpNotes" placeholder="تفاصيل الشراء أو سبب الشراء" oninput="ES27.resetDailyPurchaseRequest()"></div><div class="deptInvoiceActions"><button id="dpSaveBtn" class="btn deptSaveBtn" onclick="ES27.saveDailyPurchase()">تسجيل وزيادة المخزون الآن</button><button class="btn secondary" onclick="ES27.load(true)">تحديث مشتريات اليوم</button></div></section><section class="card deptReviewCard"><div class="deptSectionTitle"><div><span>✓</span><h3>مشتريات اليوم والمتأخرات المعلقة</h3></div><small>المخزون مضاف؛ المراجعة المالية عند ضياء</small></div>${dailyPurchaseEmployeeTable()}</section></div>`;
  }

  function screenPurchase(){
    const fixedDepartment=accountingScopeDepartment();
    const departmentField=fixedDepartment?`<div class="field"><label>القسم</label><select id="puDept" disabled>${accountingDeptOptions(fixedDepartment,false)}</select></div>`:`<div class="field"><label>القسم</label><select id="puDept" onchange="ES27.refreshPurchaseMaterials()">${accountingDeptOptions('',true)}</select></div>`;
    const materialsHtml=purchaseMaterialOptions(fixedDepartment);
    return `${dailyPurchaseAdminReview()}<div class="card"><h2>${esc(accountingScopeTitle('فاتورة شراء مباشرة لضياء'))}</h2><div class="hint">كل فاتورة شراء تُسجل على قسم واحد حتى تظل حسابات الليزر والطباعة منفصلة.</div><div class="grid five">${departmentField}<div class="field"><label>رقم الفاتورة</label><input id="puNo" value="PUR-${Date.now().toString().slice(-6)}"></div><div class="field"><label>المورد</label><input id="puSupplier" list="supList"><datalist id="supList">${supplierOptions()}</datalist></div><div class="field"><label>نوع الدفع</label><select id="puPay"><option>نقدي</option><option>آجل</option><option>جزئي</option></select></div><div class="field"><label>تاريخ استحقاق</label><input id="puDue" type="date"></div></div><div class="grid six"><div class="field"><label>الخامة/الصنف</label><select id="puMat"><option value="">${fixedDepartment?'اختار الخامة':'اختار القسم أولًا'}</option>${materialsHtml}</select></div><div class="field"><label>الكمية</label><input id="puQty" type="number" value="1" oninput="ES27.calcPurchase()"></div><div class="field"><label>سعر الشراء</label><input id="puUnit" type="number" oninput="ES27.calcPurchase()"></div><div class="field"><label>الإجمالي</label><input id="puTotal" readonly></div><div class="field"><label>مدفوع</label><input id="puPaid" type="number" value="0" oninput="ES27.calcPurchase()"></div><div class="field"><label>متبقي</label><input id="puRemain" readonly></div></div><div class="field"><label>ملاحظات</label><input id="puNotes"></div><button class="btn" onclick="ES27.savePurchase()">حفظ فاتورة الشراء وزيادة المخزون</button></div><div class="card"><h3>${esc(accountingScopeTitle('فواتير الشراء المحفوظة'))}</h3>${table(scopedPurchases(),['رقم','القسم','مورد','خامة','كمية','إجمالي','مدفوع','متبقي'],p=>[esc(p.no||p.invoiceNo),esc(accountingRowDepartment(p)||'-'),esc(p.supplier),esc(p.material||p.materialName),esc(p.qty),money(p.total),money(p.paid),money(p.remain)])}</div>`;
  }


  function rowLineId(r){ return r.id || r.ID || r.lineId || r['ID'] || r['رقم البند'] || ''; }
  function rowOrderId(r){ return r.orderId || r['رقم الأوردر'] || ''; }
  function rowCustomer(r){ return r.customerName || r.customer || r['اسم العميل'] || ''; }
  function rowDept(r){ return r.department || r['القسم'] || ''; }
  function rowItem(r){ return r.itemName || r.item || r['اسم البند'] || ''; }
  function rowQty(r){ return num(r.qty || r['الكمية'] || 1) || 1; }
  function rowSale(r){
    const qty=rowQty(r);
    const explicit=num(r.unitSalePrice ?? r['سعر الوحدة'] ?? 0);
    if(explicit || Object.prototype.hasOwnProperty.call(r||{},'unitSalePrice') || Object.prototype.hasOwnProperty.call(r||{},'سعر الوحدة')) return explicit;
    if(Object.prototype.hasOwnProperty.call(r||{},'sale')) return num(r.sale);
    if(Object.prototype.hasOwnProperty.call(r||{},'lineTotal')) return num(r.lineTotal)/qty;
    return num(r.salePrice || r['سعر البيع'] || r.finalTotal || r.total || 0)/qty;
  }
  function rowLineTotal(r){
    if(Object.prototype.hasOwnProperty.call(r||{},'lineTotal')) return num(r.lineTotal);
    return rowSale(r)*rowQty(r);
  }
  function rowCloseStatus(r){ return String(r.closeStatus || r['حالة التقفيل'] || '').trim(); }
  function rowFinalInvoice(r){ return String(r.invoiceNo || r['رقم الفاتورة النهائية'] || r['رقم الفاتورة'] || '').trim(); }
  function isUnbilledDeptLine(r){ const st=nkey(rowCloseStatus(r)); return !rowFinalInvoice(r) && !/تم|مقفل|مقفول|closed|billed/.test(st); }
  function lineUnitCost(r){
    const explicit=num(r.unitCost || r.cost || r.fixedCost || r.systemCost || r['تكلفة الوحدة'] || r['التكلفة']);
    if(explicit) return explicit;
    const tpl=itemByName(rowItem(r));
    return tpl ? matCost(tpl) : 0;
  }
  function lineCostTotal(r){
    const hasExplicit=Object.prototype.hasOwnProperty.call(r||{},'totalCost') || Object.prototype.hasOwnProperty.call(r||{},'إجمالي التكلفة');
    if(hasExplicit) return num(r.totalCost ?? r['إجمالي التكلفة']);
    return lineUnitCost(r)*rowQty(r);
  }
  function custodySummaryCard(){
    const today=dailyPurchaseTodayKey();
    let rows=(state.data.custodySummary||[]).filter(r=>String(r.workDate||today)===today);
    if(!isAdmin()) rows=rows.filter(r=>nkey(r.employee)===nkey(user.username||user.name)&&nkey(r.department)===nkey(userDept()));
    if(!rows.length) return `<div class="hint">لم تُسلّم عهدة مشتريات لهذا الموظف اليوم.</div>`;
    return `<div class="dailyPurchaseSummary custodySummary">${rows.map(r=>`<div><span>${esc(r.employee)} · ${esc(r.department)}</span><b>${money(r.balance)}</b><small>${r.closed?'مقفولة':r.balance>0?'سيرجع '+money(r.balance):r.balance<0?'مطلوب له '+money(Math.abs(r.balance)):'العهدة متوازنة'}</small></div>`).join('')}</div>`;
  }
  function profitStatsForLines(rows){
    const total=(rows||[]).reduce((s,r)=>s+rowLineTotal(r),0);
    const cost=(rows||[]).reduce((s,r)=>s+lineCostTotal(r),0);
    const profit=total-cost;
    const margin=total ? (profit/total)*100 : 0;
    return { total, cost, profit, margin };
  }
  function pendingFinalGroups(){
    const map={};
    (state.data.deptLines||[]).filter(isUnbilledDeptLine).forEach(r=>{
      const order=rowOrderId(r)||'بدون رقم';
      const customer=rowCustomer(r)||'عميل غير محدد';
      const key=nkey(order)+'|'+nkey(customer);
      if(!map[key]) map[key]={orderId:order,customerName:customer,rows:[],departments:{},shared:0,approved:0};
      map[key].rows.push(r);
      if(isDeptApprovedForFinal(r)) map[key].approved++;
      const d=rowDept(r)||'قسم';
      map[key].departments[d]=(map[key].departments[d]||0)+1;
      if(isSharedLineRecord(r)) map[key].shared++;
    });
    return Object.keys(map).map(k=>map[k]).sort((a,b)=>String(b.orderId).localeCompare(String(a.orderId)));
  }
  function pendingFinalTable(){
    const rows=pendingFinalGroups();
    if(!rows.length) return '<div class="empty">لا توجد فواتير أقسام غير مقفولة حاليًا.</div>';
    const heads=['الأوردر','العميل','الأقسام','بنود','الحالة','إجمالي','إجراء'];
    if(isAdmin()) heads.splice(6,0,'ربحية ضياء');
    return table(rows,heads,g=>{
      const st=profitStatsForLines(g.rows);
      const deptText=Object.keys(g.departments).map(d=>d+': '+g.departments[d]).join(' / ')+(g.shared?' / مشترك: '+g.shared:'');
      const ready = g.approved === g.rows.length;
      const status = ready ? '<span class="pill">جاهزة للتقفيل</span>' : '<span class="pill warn">محتاجة اعتماد القسم '+g.approved+'/'+g.rows.length+'</span>';
      const base=[esc(g.orderId),esc(g.customerName),esc(deptText),esc(g.rows.length),status,money(st.total)];
      if(isAdmin()) base.push('<span class="profitOnly">تكلفة: '+money(st.cost)+' / ربح: '+money(st.profit)+' / '+st.margin.toFixed(1)+'%</span>');
      base.push(ready
        ? `<button class="btn small" onclick="ES27.pickPendingFinal('${esc(String(g.orderId)).replace(/'/g,'&#39;')}','${esc(String(g.customerName)).replace(/'/g,'&#39;')}')">مراجعة وتقفيل</button>`
        : `<button class="btn small secondary" onclick="ES27.approvePendingFinal('${esc(String(g.orderId)).replace(/'/g,'&#39;')}','${esc(String(g.customerName)).replace(/'/g,'&#39;')}')">اعتماد وفتح للتقفيل</button>`);
      return base;
    });
  }
  function finalInvoiceStatus(r){ return String(r.status || r['الحالة'] || '').trim(); }
  function finalInvoiceNo(r){ return String(r.invoiceNo || r.no || r['رقم الفاتورة'] || '').trim(); }
  function finalInvoiceOrder(r){ return String(r.orderId || r.order || r['رقم الأوردر'] || '').trim(); }
  function finalInvoiceCustomer(r){ return String(r.customer || r.customerName || r['اسم العميل'] || '').trim(); }
  function closedFinalInvoicesTable(){
    const rows=(state.data.finalInvoices||[]).filter(r=>finalInvoiceNo(r));
    if(!rows.length) return '<div class="empty">لا توجد فواتير مقفولة للعرض.</div>';
    const heads=['الفاتورة','الأوردر','العميل','إجمالي','مدفوع','متبقي','الحالة','مراجعة'];
    if(isAdmin()) heads.splice(6,0,'ربحية ضياء');
    return table(rows,heads,(r,i)=>{
      const inv=finalInvoiceNo(r);
      const linked=(state.data.deptLines||[]).filter(x=>rowFinalInvoice(x)===inv || (inv && rowFinalInvoice(x)===inv));
      const st=profitStatsForLines(linked);
      const total=num(r.total||r.finalTotal||r['الإجمالي النهائي']||st.total);
      const base=[esc(inv),esc(finalInvoiceOrder(r)),esc(finalInvoiceCustomer(r)),money(total),money(r.paid||r['المدفوع']),money(r.remain||r.remaining||r['الباقي']),esc(finalInvoiceStatus(r)||'مقفولة')];
      if(isAdmin()) base.splice(6,0,linked.length?'<span class="profitOnly">تكلفة: '+money(st.cost)+' / ربح: '+money(total-st.cost)+' / '+(total?(((total-st.cost)/total)*100).toFixed(1):'0.0')+'%</span>':'<span class="muted">لا توجد بنود مرتبطة محليًا</span>');
      base.push(`<span class="tableActions"><button class="btn small secondary" onclick="ES27.reviewClosedInvoice(${i})">عرض</button>${isAdmin()?`<button class="btn small warn" onclick="ES27.reopenFinalInvoice(${i})">إرجاع للمراجعة</button>`:''}</span>`);
      return base;
    });
  }
  function rowCustomerPhone(r){ return r.customerPhone || r.phone || r.mobile || r['رقم العميل'] || r['هاتف العميل'] || ''; }
  function customerMainName(c){ return (c && (c.name || c.customerName || c['اسم العميل'] || c.customer || '')) || ''; }
  function customerMainPhone(c){ return (c && (c.phone || c.mobile || c.customerPhone || c['رقم العميل'] || c['الهاتف'] || '')) || ''; }
  function customerMainType(c){ return (c && (c.type || c.customerType || c.manager || c['نوع العميل'] || c['المسؤول'] || '')) || ''; }
  function customerNeedleText(c){ return nkey([customerMainName(c), customerMainPhone(c), customerMainType(c)].join(' ')); }
  function rowCustomerNeedle(r){ return nkey([rowCustomer(r), rowCustomerPhone(r), r.customerType, r.type, r.manager].join(' ')); }
  function customerMatchesRow(r, c, fallbackName){
    const rowText = rowCustomerNeedle(r);
    const q = nkey(fallbackName || customerMainName(c) || val('saCustomer'));
    const phone = nkey(customerMainPhone(c));
    return (!q || rowText.includes(q) || q.includes(rowText)) || (!!phone && rowText.includes(phone));
  }
  function saleCandidateLines(){
    const c = state.saleSelectedCustomer || {name: val('saCustomer')};
    const qCustomer = nkey(val('saCustomer'));
    const qOrder = nkey(val('saOrder'));
    return (state.data.deptLines||[]).filter(isUnbilledDeptLine).filter(isDeptApprovedForFinal).filter(r=>{
      const okOrder = !qOrder || nkey(rowOrderId(r)).includes(qOrder);
      const okCustomer = !qCustomer || customerMatchesRow(r, c, qCustomer);
      return okOrder && okCustomer;
    });
  }
  function salePulledIds(){ const ids={}; (state.salePulledLines||[]).forEach(r=>{ ids[nkey(rowLineId(r)||JSON.stringify(r))]=true; }); return ids; }
  function salePulledTotal(){ return (state.salePulledLines||[]).reduce((s,r)=>s + rowLineTotal(r),0); }
  function salePulledLineIds(){ return (state.salePulledLines||[]).map(rowLineId).filter(Boolean); }
  function salePulledDeptSummary(){
    const rows=state.salePulledLines||[];
    const byDept={}, orderMap={};
    let shared=0;
    rows.forEach(r=>{
      const d=rowDept(r)||'قسم';
      byDept[d]=(byDept[d]||0)+1;
      if(isSharedLineRecord(r)) shared++;
      if(rowOrderId(r)) orderMap[rowOrderId(r)]=true;
    });
    const parts=Object.keys(byDept).map(d=>d+': '+byDept[d]+' بند');
    if(shared) parts.push('مشترك: '+shared);
    return { text:parts.length?parts.join(' / '):'لم يتم ضم بنود بعد', orders:Object.keys(orderMap) };
  }
  function updateSaleTotalsFromPulled(){
    const pulled = salePulledTotal();
    const manual = num(val('saQty'))*num(val('saUnit'));
    const total = Math.max(0, pulled + manual - num(val('saDiscount')));
    set('saTotal', total.toFixed(2));
    set('saRemain', Math.max(0,total-num(val('saPaid'))).toFixed(2));
    const s=salePulledDeptSummary();
    const orderWarn=s.orders.length>1?' <span class="warnText">اختار أوردر واحد قبل الحفظ النهائي.</span>':'';
    const b=$('salePulledSummary'); if(b) b.innerHTML = '<b>تجميع وائل/جابر:</b> '+esc(s.text)+' / <b>إجمالي بنود الأقسام:</b> '+money(pulled)+' / <b>إجمالي الفاتورة:</b> '+money(total)+orderWarn;
  }
  function salePulledTable(){
    const rows = state.salePulledLines || [];
    if(!rows.length) return '<div class="empty">لم يتم سحب بنود من الأقسام بعد.</div>';
    return table(rows,['القسم','مشترك','رقم الأوردر','البند','كمية','سعر','حذف'],(r,i)=>[esc(rowDept(r)),isSharedLineRecord(r)?'<span class="pill warn">مشترك</span>':'-',esc(rowOrderId(r)),esc(rowItem(r)),esc(rowQty(r)),money(rowSale(r)),`<button class="btn small danger" onclick="ES27.removePulledLine(${i})">حذف</button>`]);
  }
  function saleCandidateTable(rows){
    rows = rows || saleCandidateLines();
    if(!rows.length) return '<div class="empty">لا توجد بنود غير مفوترة مطابقة للعميل/الأوردر.</div>';
    const picked=salePulledIds();
    return table(rows,['ضم','القسم','مشترك','الأوردر','العميل','البند','كمية','سعر'],(r,i)=>{
      const key=nkey(rowLineId(r)||JSON.stringify(r));
      return [`<input type="checkbox" class="saleLinePick" data-key="${esc(key)}" ${picked[key]?'checked':''}>`,esc(rowDept(r)),isSharedLineRecord(r)?'<span class="pill warn">مشترك</span>':'-',esc(rowOrderId(r)),esc(rowCustomer(r)),esc(rowItem(r)),esc(rowQty(r)),money(rowSale(r))];
    });
  }
  function renderSalePulledBoxes(){
    const p=$('salePulledBox'); if(p) p.innerHTML=salePulledTable();
    const c=$('saleCandidatesBox'); if(c) c.innerHTML=saleCandidateTable();
    updateSaleTotalsFromPulled();
  }

  function saleFinalNo(r){ return String(r.no || r.invoiceNo || r['رقم الفاتورة'] || '').trim(); }
  function saleOrderId(r){ return String(r.orderId || r.order || r['رقم الأوردر'] || '').trim(); }
  function saleCustomerText(r){ return nkey([r.customer, r.customerName, r['اسم العميل'], r.phone, r.customerPhone].join(' ')); }
  function saleMatchesCustomer(r,c){
    const t=saleCustomerText(r), q=customerNeedleText(c)||nkey(val('saCustomer'));
    const ph=nkey(customerMainPhone(c));
    return !q || t.includes(q) || q.includes(t) || (!!ph && t.includes(ph));
  }
  function currentSaleRowsForCustomer(c){
    const ord=nkey(val('saOrder'));
    return (state.data.sales||[]).filter(r=>saleMatchesCustomer(r,c)).filter(r=>!ord || nkey(saleOrderId(r)).includes(ord));
  }
  function finalRowsForCustomer(c){
    const ord=nkey(val('saOrder'));
    return (state.data.finalInvoices||[]).filter(r=>saleMatchesCustomer(r,c)).filter(r=>!ord || nkey(saleOrderId(r)).includes(ord));
  }
  function salesHistoryRows(){
    const out=[], seen={};
    function add(r,source){
      const no=saleFinalNo(r) || (r.id||r.ID||'');
      const key=nkey(no || JSON.stringify(r));
      if(seen[key]) return;
      seen[key]=true;
      out.push(Object.assign({historySource:source},r));
    }
    (state.data.sales||[]).forEach(r=>add(r,'مبيعات'));
    (state.data.finalInvoices||[]).forEach(r=>add({
      no:saleFinalNo(r),
      invoiceNo:saleFinalNo(r),
      orderId:saleOrderId(r),
      customer:r.customer||r.customerName||r['اسم العميل']||'',
      item:r.item||r['بند يدوي']||'فاتورة موحدة من بنود الأقسام',
      qty:r.qty||r.lineCount||'',
      total:r.total||r.finalTotal||r['الإجمالي النهائي']||0,
      paid:r.paid||r['المدفوع']||0,
      remain:r.remain||r.remaining||r['الباقي']||0
    },'تقفيل نهائي'));
    return out;
  }
  function orderIdsForCustomer(c){
    const map={};
    (state.data.deptLines||[]).forEach(r=>{ if(customerMatchesRow(r,c) && rowOrderId(r)) map[rowOrderId(r)] = true; });
    (state.data.sales||[]).forEach(r=>{ if(saleMatchesCustomer(r,c) && saleOrderId(r)) map[saleOrderId(r)] = true; });
    (state.data.finalInvoices||[]).forEach(r=>{ if(saleMatchesCustomer(r,c) && saleOrderId(r)) map[saleOrderId(r)] = true; });
    return Object.keys(map).filter(Boolean);
  }
  function pendingGroupsForCustomer(c){
    return pendingFinalGroups().filter(g=>customerMatchesRow({customerName:g.customerName,customer:g.customerName},c));
  }
  function autoPickFinalOrderForCustomer(c){
    if(val('fiOrder')) return;
    const g=pendingGroupsForCustomer(c)[0];
    if(g) set('fiOrder',g.orderId);
  }
  function saleDraftNo(order,c){
    const base = String(order || customerMainPhone(c) || customerMainName(c) || Date.now()).replace(/[^0-9A-Za-z\u0600-\u06FF_-]+/g,'').slice(-12) || Date.now().toString().slice(-6);
    return 'DRAFT-' + base;
  }
  function officialSaleNo(){ return 'ES-' + Date.now().toString().slice(-7); }
  function selectedSaleTemplate(){ const raw=val('saItem'); return raw==='' ? null : (visibleTemplates()[num(raw)] || null); }
  function setInvoiceNoForContext(c){
    const finals = currentSaleRowsForCustomer(c).concat(finalRowsForCustomer(c));
    const final = finals.find(r=>saleFinalNo(r) && !/^DRAFT/i.test(saleFinalNo(r)));
    if(final){ set('saNo', saleFinalNo(final)); return; }
    set('saNo', saleDraftNo(val('saOrder'), c));
  }
  function autoPickOrderForCustomer(c){
    if(val('saOrder')) return;
    const unbilled = (state.data.deptLines||[]).filter(isUnbilledDeptLine).filter(r=>customerMatchesRow(r,c));
    if(unbilled.length){ set('saOrder', rowOrderId(unbilled[0]) || ''); return; }
    const orders = orderIdsForCustomer(c);
    if(orders.length) set('saOrder', orders[0]);
  }
  function addAllCandidateLines(){
    const rows=saleCandidateLines();
    const cur=salePulledIds();
    rows.forEach(r=>{ const key=nkey(rowLineId(r)||JSON.stringify(r)); if(!cur[key]) state.salePulledLines.push(r); });
    renderSalePulledBoxes();
  }
  function saleCustomerPanelHtml(c){
    if(!c && !val('saCustomer')) return '<div class="hint">اختار العميل عشان تظهر فاتورته الحالية وبنود وائل وجابر.</div>';
    c = c || {name:val('saCustomer')};
    const orders=orderIdsForCustomer(c);
    const candidates=saleCandidateLines();
    const pulled=state.salePulledLines||[];
    const finalSales=currentSaleRowsForCustomer(c).concat(finalRowsForCustomer(c)).filter(r=>saleFinalNo(r));
    const byDept={}; candidates.forEach(r=>{ const d=rowDept(r)||'قسم'; byDept[d]=(byDept[d]||0)+1; });
    const deptText=Object.keys(byDept).length ? Object.keys(byDept).map(d=>d+': '+byDept[d]).join(' / ') : 'لا توجد بنود غير مفوترة مطابقة حاليًا';
    const ordersHtml = orders.length ? orders.map(o=>'<button type="button" class="btn small secondary" onclick="ES27.pickSaleOrder(\''+esc(String(o)).replace(/'/g,'&#39;')+'\')">'+esc(o)+'</button>').join(' ') : '<span class="muted">لا توجد أوردرات محفوظة لهذا العميل.</span>';
    const finalsHtml = finalSales.length ? finalSales.slice(0,5).map(r=>'<div>فاتورة مقفولة: <b>'+esc(saleFinalNo(r))+'</b> / أوردر: '+esc(saleOrderId(r)||'-')+' / إجمالي: '+money(r.total||r.finalTotal||0)+'</div>').join('') : '<div>لا توجد فاتورة نهائية محفوظة لهذا الاختيار.</div>';
    const draft = saleDraftNo(val('saOrder'), c);
    return '<div class="saleContextHead"><b>العميل:</b> '+esc(customerMainName(c)||val('saCustomer'))+' '+(customerMainPhone(c)?'<span class="pill">'+esc(customerMainPhone(c))+'</span>':'')+' <span class="customerDebtBadge '+customerDebtClass(c)+'">'+esc(customerDebtText(c))+'</span></div>'+ 
      '<div><b>الفاتورة الحالية:</b> <span class="pill">'+esc(val('saNo')||draft)+'</span> '+(/^DRAFT/i.test(val('saNo'))?'<span class="muted">تحت التجميع، وتتحول لرقم ES عند الحفظ النهائي</span>':'<span class="muted">رقم فاتورة محفوظ</span>')+'</div>'+
      '<div><b>أوردرات العميل:</b> '+ordersHtml+'</div>'+
      '<div><b>بنود الأقسام غير المفوترة:</b> '+esc(deptText)+' / مضموم الآن: '+pulled.length+'</div>'+
      '<div class="actions"><button type="button" class="btn small" onclick="ES27.addAllCandidateLines()">ضم كل بنود العميل للفاتورة</button><button type="button" class="btn small secondary" onclick="ES27.refreshSaleCustomerContext()">تحديث الفاتورة الحالية</button></div>'+
      '<div class="softBox"><b>الفواتير المقفولة:</b>'+finalsHtml+'</div>';
  }
  function renderSaleCustomerContext(c){
    const box=$('saleCustomerContext');
    if(box) box.innerHTML=saleCustomerPanelHtml(c || state.saleSelectedCustomer || {name:val('saCustomer')});
  }
  function loadSaleCustomerContext(c, opts){
    opts=opts||{};
    if(c) state.saleSelectedCustomer=c;
    c = state.saleSelectedCustomer || {name:val('saCustomer')};
    autoPickOrderForCustomer(c);
    setInvoiceNoForContext(c);
    state.salePulledLines=[];
    renderSalePulledBoxes();
    addAllCandidateLines();
    renderSaleCustomerContext(c);
    if(!opts.silent) flash('تم تحميل ملف العميل والفاتورة تحت التجميع وبنود وائل/جابر.');
  }
  function customerLabel(c){ return (c.name||c.customerName||'') + (c.phone||c.mobile? ' - '+(c.phone||c.mobile):'') + (c.type?' - '+c.type:'') + ' - ' + customerDebtText(c); }
  function localCustomerMatches(q){ q=nkey(q); return (state.data.customers||[]).filter(c=>!q || nkey([c.name,c.customerName,c.phone,c.mobile,c.manager,c.type,customerDebtText(c)].join(' ')).includes(q)).slice(0,40); }
  function renderCustomerDropdown(rows){
    if(!customerDropdownCanOpen()) return;
    const box=$('saCustomerDrop'); if(!box) return;
    rows = rows || [];
    if(!rows.length){ box.innerHTML='<div class="custDropHint">اكتب جزء من الاسم أو الرقم للبحث في عملاء المنصة.</div>'; box.classList.remove('hidden'); return; }
    box.innerHTML=rows.map((c,i)=>`<button type="button" onclick="ES27.pickSaleCustomer(${i})" data-cust-index="${i}">${esc(customerLabel(c))}</button>`).join('');
    box.__rows=rows; box.classList.remove('hidden');
  }
  function renderFinalCustomerDropdown(rows){
    const box=$('fiCustomerDrop'); if(!box) return;
    rows = rows || [];
    if(!rows.length){ box.innerHTML='<div class="custDropHint">اكتب جزء من الاسم أو الرقم للبحث في عملاء المنصة.</div>'; box.classList.remove('hidden'); return; }
    box.innerHTML=rows.map((c,i)=>`<button type="button" onclick="ES27.pickFinalCustomer(${i})" data-cust-index="${i}">${esc(customerLabel(c))}</button>`).join('');
    box.__rows=rows; box.classList.remove('hidden');
  }
  function operatingExpenseRows(){ const rows=isAdmin()?accountingScopedRows(materials(),false):materials(); return rows.filter(r=>/تشغيل|مصروف|operation/i.test(String(r.materialClass||r.operationExpense||r['تصنيف الخامة']||r['ضم إلى مصروفات التشغيل']||matType(r)||''))); }
  function screenSales(){
    const qOrder = esc(qs.get('orderId') || qs.get('order') || '');
    const qCustomer = esc(qs.get('customer') || qs.get('customerName') || '');
    return `<div class="card"><h2>فاتورة مبيعات موحدة</h2>
      <div class="hint">وائل وجابر يسجلوا بنود كل قسم، والبند المشترك يظهر للطرف الآخر. ضياء/رحمه/ريفان من هنا يسحبوا فاتورتي القسمين ويقفلوهم كفاتورة واحدة للعميل.</div>
      <div class="grid four">
        <div class="field"><label>رقم الفاتورة</label><input id="saNo" value="SAL-${Date.now().toString().slice(-6)}"></div>
        <div class="field customerField"><label>العميل</label><input id="saCustomer" value="${qCustomer}" autocomplete="off" onfocus="ES27.focusSaleCustomer()" oninput="ES27.searchSaleCustomers(this.value)" onkeydown="ES27.unlockCustomerDropdown()"><div id="saCustomerDrop" class="customerDrop hidden"></div></div>
        <div class="field"><label>رقم الأوردر</label><input id="saOrder" value="${qOrder}" oninput="ES27.refreshSaleCustomerContext()"></div>
        <div class="field"><label>نوع الدفع</label><select id="saPay"><option>نقدي</option><option>آجل</option><option>جزئي</option></select></div>
      </div>
      <div id="saleCustomerContext" class="saleCustomerContext">اختار العميل لتحميل فاتورته الحالية وبنود وائل وجابر.</div>
      <div class="grid six">
        <div class="field"><label>بند يدوي / صنف إضافي</label><select id="saItem" onchange="ES27.applySaleItem()"><option></option>${itemOptions()}</select></div>
        <div class="field"><label>الكمية</label><input id="saQty" type="number" value="0" oninput="ES27.calcSale()"></div>
        <div class="field"><label>سعر البيع</label><input id="saUnit" type="number" value="0" oninput="ES27.calcSale()"></div>
        <div class="field"><label>خصم</label><input id="saDiscount" type="number" value="0" oninput="ES27.calcSale()"></div>
        <div class="field"><label>الإجمالي</label><input id="saTotal" readonly></div>
        <div class="field"><label>مدفوع</label><input id="saPaid" type="number" value="0" oninput="ES27.calcSale()"></div>
      </div>
      <div class="grid two"><div class="field"><label>متبقي</label><input id="saRemain" readonly></div><div class="field"><label>ملاحظات</label><input id="saNotes"></div></div>
      <div class="actions"><button class="btn secondary" onclick="ES27.pullDeptCandidates()">سحب فاتورتي وائل وجابر</button><button class="btn" onclick="ES27.addPickedDeptLines()">ضم البنود المحددة</button><button class="btn" onclick="ES27.saveSale()">حفظ الفاتورة الموحدة</button><span class="menuWrap"><button class="btn secondary" onclick="ES27.toggleClientInvoiceMenu(event)">فاتورة العميل ▾</button><span id="clientInvoiceMenu" class="clientInvoiceMenu hidden"><button onclick="ES27.showPricePreview()">عرض التسعير</button><button onclick="ES27.printSale()">PDF / طباعة</button><button onclick="ES27.downloadSaleImage()">صورة</button><button onclick="ES27.copySaleText()">نسخ نص الفاتورة</button><button onclick="ES27.openSaleWhatsApp()">إرسال واتساب</button></span></span></div>
      <div id="salePulledSummary" class="softBox"></div>
    </div>
    <div class="split"><div class="card"><h3>بنود غير مفوترة من الأقسام</h3><div id="saleCandidatesBox">${saleCandidateTable()}</div></div><div class="card"><h3>البنود المضمومة للفاتورة</h3><div id="salePulledBox">${salePulledTable()}</div></div></div>
    <div class="card"><h3>فواتير المبيعات المحفوظة</h3>${table(salesHistoryRows(),['رقم','عميل','صنف/تجميع','كمية','إجمالي','مدفوع','متبقي','المصدر'],s=>[esc(s.no||s.invoiceNo),esc(s.customer),esc(s.item||s.itemName||s.description),esc(s.qty),money(s.total),money(s.paid),money(s.remain),esc(s.historySource||'مبيعات')])}</div>`;
  }

  function screenStock(){ const mats=isAdmin()?scopedMaterials():materialRows(); const moves=isAdmin()?scopedStockMoves():(state.data.stockMoves||[]); return `<div class="card"><h2>${esc(accountingScopeTitle('المخزون'))}</h2>${table(mats,['الخامة/الصنف','القسم','النوع','الرصيد','حد النقص','تكلفة','بيع','حالة'],r=>[esc(materialName(r)),esc(matDept(r)),esc(materialKindLabel(matType(r))),esc(matStock(r)),esc(matMin(r)),isAdmin()?money(matCost(r)):'<span class="costHidden">مخفي</span>',money(matSale(r)),activeRow(r)?'مفعل':'موقوف'])}</div><div class="card"><h3>${esc(accountingScopeTitle('حركة المخزون'))}</h3>${table(moves,['التاريخ','القسم','الخامة','داخل','خارج','الرصيد','المصدر'],r=>[esc(r.date||r['وقت التسجيل']||''),esc(accountingRowDepartment(r)||'-'),esc(r.materialName||r['الخامة']||''),esc(r.inQty||r['داخل']||''),esc(r.outQty||r['خارج']||''),esc(r.balance||r['الرصيد']||''),esc(r.source||r['المصدر']||'')])}</div>`; }

  function screenKitchen(){
    if(!isAdmin()) return '<div class="card"><h2>مطبخ الحسابات</h2><div class="warn">هذا القسم يظهر لضياء فقط.</div></div>';
    return `<div class="card"><h2>${esc(accountingScopeTitle('مطبخ الحسابات'))}</h2><div class="hint">الخامات الأساسية منفصلة عن الأصناف بمكوناتها، والعرض الحالي تابع للقسم المختار بالأعلى.</div><div class="grid three"><button class="btn" onclick="ES27.kitchenMode('raw')">خامة أساسية</button><button class="btn" onclick="ES27.kitchenMode('recipe')">صنف بمكونات</button><button class="btn secondary" onclick="ES27.recalcCascade()">تحديث كل الأسعار المرتبطة</button></div><div id="kitchenBox">${rawForm()}</div></div>${materialTable()}<div class="card"><div class="toolbar"><h3>${esc(accountingScopeTitle('الأصناف بمكوناتها'))}</h3><span class="pill">${scopedTemplates().length} صنف</span></div>${itemsTable()}</div>`;
  }
  function rawForm(){ const selected=accountingScopeDepartment(); return `<div class="softBox"><h3>خامة أساسية / مصروف تشغيل</h3><input id="rawId" type="hidden"><div class="grid six"><div class="field"><label>القسم</label><select id="rawDept"><option ${selected==='طباعة'?'selected':''}>طباعة</option><option ${selected==='ليزر'?'selected':''}>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الخامة</label><input id="rawName"></div><div class="field"><label>تصنيف الخامة</label><select id="rawClass"><option>خامة إنتاج</option><option>مصروف تشغيل</option><option>خامة مشتركة</option><option>متوقفة</option></select></div><div class="field"><label>سعر/تكلفة الأصل</label><input id="rawCost" type="number"></div><div class="field"><label>سعر بيع رسمي</label><input id="rawSale" type="number"></div><div class="field"><label>الرصيد / افتتاحي</label><input id="rawStock" type="number"></div></div><div class="grid six"><div class="field"><label>حد النقص</label><input id="rawMin" type="number"></div><div class="field"><label>عرض الخام سم</label><input id="rawW" type="number"></div><div class="field"><label>طول الخام سم</label><input id="rawH" type="number"></div><div class="field"><label>نوع الخامة</label><select id="rawKind"><option>خامة عامة</option><option>خامة ليزر</option><option>رول ورق</option><option>رول لامينشن</option><option>باكيت ورق</option><option>حبر</option><option>مصروف ماكينة</option></select></div><div class="field"><label>ضم إلى بند</label><select id="rawOperatingBand"><option>إنتاج مباشر</option><option>مصروفات تشغيل الطباعة</option><option>مصروفات تشغيل الليزر</option><option>مصروفات تشغيل مشتركة</option></select></div><div class="field"><label>طريقة توزيع التشغيل</label><select id="rawOpMethod"><option>لا يوزع</option><option>ثابت على الفاتورة</option><option>بالمتر</option><option>بالمتر المربع</option><option>نسبة من الفاتورة</option><option>يدوي</option></select></div></div><div class="grid two"><div class="field"><label>قيمة التشغيل للوحدة / النسبة</label><input id="rawOpCost" type="number" placeholder="مثال: 5 جنيه للمتر أو 3%"></div><div class="field"><label>ملاحظات</label><input id="rawNotes"></div></div><div class="actions"><button class="btn" onclick="ES27.saveRaw()">حفظ / تحديث الخامة</button><button class="btn secondary" onclick="ES27.clearRawForm()">جديد</button></div></div>`; }
  function materialTable(){ const all=materialRows(); const rows=all.map((row,index)=>({row,index})).filter(x=>accountingScopeMatchesDepartment(matDept(x.row),true)); return `<div class="card"><div class="toolbar"><h3>${esc(accountingScopeTitle('الخامات الأساسية المسجلة'))}</h3><span class="pill">${rows.length} خامة</span></div>` + table(rows,['الخامة','القسم','النوع','التكلفة','الرصيد','تعديل'],x=>{ const r=x.row; return [esc(materialName(r)),esc(matDept(r)),esc(materialKindLabel(matType(r))),isAdmin()?money(matCost(r)):'<span class="costHidden">مخفي</span>',esc(matStock(r)),`<button class="btn small secondary" onclick="ES27.editRaw(${x.index})">تعديل</button>`]; }) + `</div>`; }
  function recipeForm(){ const selected=accountingScopeDepartment(); return `<div class="softBox"><h3>صنف بمكونات</h3><div class="grid six"><div class="field"><label>القسم</label><select id="recDept"><option ${selected==='طباعة'?'selected':''}>طباعة</option><option ${selected==='ليزر'?'selected':''}>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الصنف</label><input id="recName"></div><div class="field"><label>مقاس الناتج</label><input id="recSize" placeholder="مثال 15x21" oninput="ES27.updateCompCalc()"></div><div class="field"><label>سعر بيع رسمي</label><input id="recSale" type="number" oninput="ES27.calcRecipe()"></div><div class="field"><label>تكلفة محسوبة</label><input id="recCost" readonly></div><div class="field"><label>مجمل الربح</label><input id="recProfit" readonly></div></div><div class="grid six"><div class="field"><label>المكون</label><select id="compMat" onchange="ES27.updateCompCalc()"><option></option>${materialOptions()}</select></div><div class="field"><label>كمية المكون للوحدة</label><input id="compQty" type="number" value="1" oninput="ES27.updateCompCalc(false)"></div><div class="field"><label>الناتج AI</label><input id="compAiPieces" readonly></div><div class="field"><label>الناتج اليدوي</label><input id="compManualPieces" type="number" oninput="ES27.updateCompCalc(true)"></div><div class="field"><label>هالك</label><input id="compWaste" readonly></div><div class="field"><label>تكلفة المكون</label><input id="compCost" readonly></div></div><div class="actions"><button class="btn secondary" onclick="ES27.aiComp()">احسب AI للمكون</button><button class="btn" onclick="ES27.addComp()">إضافة المكون</button><button class="btn danger" onclick="ES27.clearComps()">تفريغ</button></div><div id="compList">${compTable()}</div><div class="actions"><button class="btn" onclick="ES27.saveRecipe()">حفظ / تحديث الصنف</button><button class="btn secondary" onclick="ES27.clearRecipeForm()">جديد</button></div><div class="hint">لو اخترت مكون ولم تضغط إضافة المكون، سيتم ضمه تلقائيًا عند الحفظ.</div></div>`; }
  function compTable(){ return table(state.recipeComps,['المكون','استهلاك','تكلفة','حذف'],(c,i)=>[esc(c.materialName),esc(c.qty),money(c.cost),`<button class="btn small danger" onclick="ES27.removeComp(${i})">حذف</button>`]); }

  function dailyCloseReportHtml(){
    const r=state.dailyReport;
    if(!r) return '<div class="empty">اختر التاريخ والقسم واضغط «عرض التقرير».</div>';
    return `<div class="dailyReportReady"><div class="grid four"><div class="kpi"><b>${money(r.sales)}</b><span>مبيعات اليوم</span></div><div class="kpi"><b>${money(r.actualJobCost)}</b><span>تكلفة الشغل الفعلية</span></div><div class="kpi"><b>${money(r.netWaste)}</b><span>صافي الهوالك</span></div><div class="kpi profitKpi"><b>${money(r.profit)}</b><span>الربح الفعلي</span></div></div><div class="grid four"><div class="kpi"><b>${money(r.purchases)}</b><span>مشتريات اليوم (معلومة)</span></div><div class="kpi"><b>${money(r.cash)}</b><span>نقدي</span></div><div class="kpi"><b>${money(r.instapay)}</b><span>إنستا باي</span></div><div class="kpi"><b>${money(r.credit)}</b><span>آجل</span></div></div><div class="grid four"><div class="kpi"><b>${money(r.receipts)}</b><span>القبض</span></div><div class="kpi"><b>${money(r.payments)}</b><span>الدفع</span></div><div class="kpi"><b>${money(r.custodyHanded)}</b><span>العهد المسلمة</span></div><div class="kpi"><b>${money(r.custodyBalance)}</b><span>رصيد العهد قبل التقفيل</span></div></div>${r.unclassifiedSales||r.unclassifiedPurchases?`<div class="warn">بيانات غير مصنفة تظهر في «كل الأقسام» فقط: مبيعات ${money(r.unclassifiedSales)} / مشتريات ${money(r.unclassifiedPurchases)}. افتح شاشة «تصنيف القديم» لإدخالها في تقرير القسم.</div>`:''}</div>`;
  }
  function custodyAdminTable(){
    const rows=state.data.custodySummary||[];
    if(!rows.length) return '<div class="empty">لا توجد عهد أو مشتريات أقسام لهذا اليوم.</div>';
    return table(rows,['الموظف','القسم','العهدة','المشتريات المعتمدة','المتبقي','النتيجة','تقفيل'],r=>[esc(r.employee),esc(r.department),money(r.handed),money(r.approvedPurchases),money(r.balance),r.closed?'<span class="pill">مقفولة</span>':r.balance>0?'سيرجع '+money(r.balance):r.balance<0?'مطلوب له '+money(Math.abs(r.balance)):'متوازنة',r.closed?'-':`<button class="btn small" onclick="ES27.closeCustody('${dailyPurchaseToken(r.employee)}','${esc(r.department)}','${esc(r.workDate||dailyPurchaseTodayKey())}')">تقفيل العهدة</button>`]);
  }
  function purchaseReversalTable(){
    const rows=(state.data.purchases||[]).slice(0,100);
    return table(rows,['الفاتورة','القسم','المورد','الخامة','الإجمالي','الحالة','تصحيح'],p=>{const invoice=p.invoiceNo||p.no||p['رقم الفاتورة']||'',reversed=/معكوس|عكس/.test(nkey(p.reversalStatus||p['حالة العكس']||''));return[esc(invoice),esc(accountingRowDepartment(p)||'-'),esc(p.supplier||p['المورد']||''),esc(p.material||p.materialName||p['الخامة']||''),money(p.total||p['الإجمالي']),reversed?'<span class="pill warn">معكوس</span>':'معتمد',reversed?'-':`<button class="btn small warn" onclick="ES27.reversePurchase('','${dailyPurchaseToken(invoice)}')">عكس الحركة</button>`];});
  }
  function screenDailyClose(){
    if(!isAdmin()) return '<div class="card"><h2>تقفيل الأقسام والعهد عند ضياء فقط.</h2></div>';
    const date=state.dailyReportDate||dailyPurchaseTodayKey(),dept=state.dailyReportDepartment||'ليزر';
    return `<section class="deptInvoiceHero"><div><span class="deptEyebrow">دورة نهاية اليوم</span><h2>العهدة وتقفيل الأقسام</h2><p>اقفل عهد جابر ووائل، ثم الليزر والطباعة، وبعدهما التقفيل الإجمالي للمكان.</p></div></section><section class="card"><h3>تسليم عهدة مشتريات</h3><div class="grid five"><div class="field"><label>الموظف</label><select id="cuEmployee" onchange="set('cuDept',this.value==='جابر'?'ليزر':'طباعة')"><option>جابر</option><option>وائل</option></select></div><div class="field"><label>القسم</label><select id="cuDept">${accountingDeptOptions('ليزر',false)}</select></div><div class="field"><label>المبلغ</label><input id="cuAmount" type="number" min="0"></div><div class="field"><label>طريقة التسليم</label><select id="cuMethod"><option>نقدي</option><option>إنستا باي</option></select></div><div class="field"><label>التاريخ</label><input id="cuDate" type="date" value="${esc(date)}"></div></div><div class="field"><label>ملاحظات</label><input id="cuNotes"></div><button class="btn" onclick="ES27.saveCustody()">تسليم العهدة وتسجيلها بالخزنة</button>${custodyAdminTable()}</section><section class="card"><div class="toolbar"><div><h3>التقرير اليومي الجاهز</h3><p class="muted">المشتريات للمتابعة فقط؛ الربح = المبيعات − تكلفة الشغل الفعلية − صافي الهوالك.</p></div><div class="actions"><input id="dcDate" type="date" value="${esc(date)}"><select id="dcDept"><option ${dept==='ليزر'?'selected':''}>ليزر</option><option ${dept==='طباعة'?'selected':''}>طباعة</option><option ${dept==='كل الأقسام'?'selected':''}>كل الأقسام</option></select><button class="btn secondary" onclick="ES27.loadDailyReport()">عرض التقرير</button><button class="btn" onclick="ES27.closeDepartmentDay()">حفظ التقفيل</button></div></div><div id="dailyReportBox">${dailyCloseReportHtml()}</div><div class="hint">التقفيل الإجمالي لن يعمل قبل حفظ تقفيل الليزر والطباعة لنفس اليوم.</div></section><section class="card"><h3>تصحيح مشتريات معتمدة بدون حذف</h3><p class="muted">عكس الحركة يرجع المخزون وحساب المورد والخزنة أو العهدة، ويحتفظ بسجل المراجعة.</p>${purchaseReversalTable()}</section>`;
  }
  function legacyEntityLabel(v){return ({purchase:'فاتورة شراء',sale:'فاتورة بيع',deptLine:'بند قسم',finalInvoice:'فاتورة نهائية'})[v]||v;}
  function screenLegacy(){
    if(!isAdmin()) return '<div class="card"><h2>تصنيف البيانات القديمة عند ضياء فقط.</h2></div>';
    const rows=state.data.unclassifiedRows||[];
    return `<section class="card"><div class="toolbar"><div><h2>تصنيف الفواتير والبيانات القديمة</h2><p class="muted">السجل غير المصنف يظهر في كل الأقسام فقط، ولا يدخل تقرير الليزر أو الطباعة حتى تصنفه مرة واحدة.</p></div><b>${rows.length} سجل غير مصنف</b></div>${table(rows,['النوع','المرجع','التاريخ','الطرف','القيمة','القسم'],(r,i)=>[esc(legacyEntityLabel(r.entity)),esc(r.label||'-'),esc(r.date||'-'),esc(r.party||'-'),money(r.amount),`<div class="tableActions"><select id="legacyDept${i}"><option>ليزر</option><option>طباعة</option></select><button class="btn small" onclick="ES27.classifyLegacy(${i})">حفظ التصنيف</button></div>`])}</section>`;
  }

  function screenReports(){
    if(!isAdmin()) return '<div class="card"><h2>التقارير</h2><div class="warn">التقارير والأرباح لضياء فقط.</div></div>';
    const sales = accountingScopeSalesTotal();
    const purchases = scopedPurchases().reduce((s,r)=>s+num(r.total||r.amount),0);
    const waste = scopedWasteLines().reduce((s,r)=>s+num(r.amount||r.wasteAmount||r.remain),0);
    const actualCost = scopedBilledDeptLines().reduce((s,r)=>s+lineCostTotal(r),0);
    const salesLabel=state.accountingScope==='all'?'مبيعات':'مبيعات القسم المقفولة';
    let departmentDetails=state.accountingScope==='all'?'':`<div class="card"><h3>تفاصيل المبيعات المقفولة · ${esc(accountingScopeLabel())}</h3>${table(scopedBilledDeptLines(),['الفاتورة','الأوردر','العميل','البند','الكمية','المبيعات','التكلفة','مجمل الربح'],r=>[esc(rowFinalInvoice(r)||'-'),esc(rowOrderId(r)||'-'),esc(rowCustomer(r)||'-'),esc(rowItem(r)),esc(rowQty(r)),money(rowLineTotal(r)),money(lineCostTotal(r)),money(rowLineTotal(r)-lineCostTotal(r))])}</div>`;
    departmentDetails+=`<div class="card"><h3>${esc(accountingScopeTitle('مصروفات التشغيل المسجلة'))}</h3><p class="muted">تظهر للمراجعة، وتدخل الربح من خلال تكلفة بند الشغل الفعلية دون خصم مزدوج.</p>${table(operatingExpenseRows(),['البند','القسم','باند التشغيل','طريقة التوزيع','القيمة'],r=>[esc(materialName(r)),esc(matDept(r)),esc(r.operatingBand||r['بند التشغيل']||''),esc(r.operatingCalcMethod||r['طريقة توزيع التشغيل']||''),money(r.operatingUnitCost||r['قيمة التشغيل']||r.unitCost)])}</div>`;
    return `<div class="card"><div class="toolbar"><div><h2>${esc(accountingScopeTitle('التقارير والأرباح الفعلية'))}</h2><p class="muted">الربح محسوب من تكلفة الخامات والتشغيل المستهلكة فعلًا في بنود الشغل، وليس من إجمالي مشتريات اليوم.</p></div><button class="btn" onclick="ES27.go('dailyClose')">فتح التقرير اليومي والتقفيل</button></div><div class="grid four"><div class="kpi"><b>${money(sales)}</b><span>${salesLabel}</span></div><div class="kpi"><b>${money(actualCost)}</b><span>تكلفة الشغل الفعلية</span></div><div class="kpi"><b>${money(waste)}</b><span>هوالك</span></div><div class="kpi"><b>${money(sales-actualCost-waste)}</b><span>الربح الفعلي</span></div></div><div class="hint">مشتريات الفترة: ${money(purchases)} — تظهر للمتابعة ولا تُخصم مرة ثانية من الربح.</div></div>${departmentDetails}`;
  }
  function screenHealth(){ return `<div class="card"><h2>فحص النظام</h2><button class="btn" onclick="ES27.health()">فحص الآن</button><div id="healthBox" class="hint">اضغط فحص الآن.</div></div>`; }

  function isSharedDeptName(dept){ return /مشترك|shared|عام/.test(nkey(dept)); }
  function selectedDeptTemplate(){ return visibleTemplates()[num(val('dlItemSel'))] || null; }
  function selectedDeptItemDepartment(){ const tpl=selectedDeptTemplate(); return tpl ? matDept(tpl) : (val('dlItemDept') || userDept() || ''); }
  function isSharedLineRecord(r){ return /نعم|true|yes|مشترك|shared/.test(nkey(r.sharedLine || r['بند مشترك'] || r.itemDepartment || r['قسم الصنف'] || '')) || isSharedDeptName(rowDept(r)); }
  function sameDeptInvoiceContext(r, order, customer){
    const okOrder = !order || nkey(rowOrderId(r)) === nkey(order);
    const okCustomer = !customer || nkey(rowCustomer(r)).includes(nkey(customer)) || nkey(customer).includes(nkey(rowCustomer(r)));
    return okOrder && okCustomer;
  }
  function deptSharedLines(){
    const order = val('dlOrder');
    const customer = val('dlCustomer');
    const d = userDept();
    return (state.data.deptLines||[]).filter(function(r){
      return isUnbilledDeptLine(r) && isSharedLineRecord(r) && sameDeptInvoiceContext(r, order, customer) && nkey(rowDept(r)) !== nkey(d);
    });
  }
  function deptSharedTable(){
    const rows = deptSharedLines();
    if(!rows.length) return '<div class="empty">لا توجد بنود مشتركة مسجلة من القسم الآخر لهذا العميل/الأوردر.</div>';
    return '<div class="hint strongHint">هذه البنود ظهرت إجباريًا لأنها مشتركة وسجلها القسم الآخر أولًا. لا تسجلها مرة ثانية.</div>' + table(rows,['مسجل بواسطة','الأوردر','العميل','البند','كمية','سعر'],r=>[esc(rowDept(r)),esc(rowOrderId(r)),esc(rowCustomer(r)),esc(rowItem(r)),esc(rowQty(r)),money(rowSale(r))]);
  }

  function laserBox(){
    const opts = materials().filter(r=>/ليزر|laser/i.test(String(matDept(r)+' '+matType(r)+' '+materialName(r)))).map(r=>`<option value="${esc(materialName(r))}">${esc(materialName(r))}</option>`).join('');
    return `<div class="laserCalcInner"><h3>🤖 حاسبة جابر / حساب شغلانة</h3><div class="grid six"><div class="field"><label>الخامة</label><select id="aiMat"><option></option>${opts}</select></div><div class="field"><label>عرض الشغل سم</label><input id="aiW" type="number"></div><div class="field"><label>ارتفاع الشغل سم</label><input id="aiH" type="number"></div><div class="field"><label>كمية</label><input id="aiQty" type="number" value="1"></div><div class="field"><label>هالك %</label><input id="aiWaste" type="number" value="10"></div><div class="field"><label>سعر بيع القطعة</label><input id="aiUnitSale" type="number" min="0" placeholder="اكتبه للعميل"></div></div><button class="btn secondary" onclick="ES27.aiLaser()">احسب وأضف للفاتورة</button><span id="aiMsg" class="pill"></span></div>`;
  }

  function rowBillingStatus(r){ return String(r.approvalStatus || r['حالة اعتماد القسم'] || r.billingStatus || r['حالة الفوترة'] || '').trim(); }
  function isDeptApprovedForFinal(r){ const st=nkey(rowBillingStatus(r)); return /معتمد|approved/.test(st) || (!st && !r.approvalStatus && !r['حالة اعتماد القسم'] && !r.billingStatus && !r['حالة الفوترة']); }
  function deptReviewRows(){ const order=val('dlOrder') || qs.get('orderId') || qs.get('order') || ''; const d=userDept(); return (state.data.deptLines||[]).filter(isUnbilledDeptLine).filter(r=>(!order || String(rowOrderId(r))===String(order)) && (!d || rowDept(r)===d)); }
  function customerByName(value){ const key=nkey(value||''); return (state.data.customers||[]).find(c=>nkey(customerMainName(c))===key) || (state.data.customers||[]).find(c=>key && nkey(customerMainName(c)).includes(key)) || null; }
  function deptCustomerDebtHtml(value){ const c=customerByName(value); return `<span class="customerDebtBadge ${customerDebtClass(c)}">${esc(customerDebtText(c))}</span>`; }
  function deptInvoiceStatsHtml(){ const rows=deptReviewRows(); const total=rows.reduce((s,r)=>s+rowLineTotal(r),0); const approved=rows.filter(isDeptApprovedForFinal).length; return `<div class="deptStat"><span>بنود المسودة</span><b>${rows.length}</b></div><div class="deptStat"><span>إجمالي القسم</span><b>${money(total)}</b></div><div class="deptStat"><span>المعتمد</span><b>${approved}</b></div><div class="deptStat"><span>كتالوج القسم</span><b>${visibleTemplates().length}</b></div>`; }
  function refreshDeptContextUi(){ const shared=$('deptSharedBox'); if(shared) shared.innerHTML=deptSharedTable(); const approval=$('deptApprovalBox'); if(approval) approval.innerHTML=deptApprovalTable(); const debt=$('deptCustomerDebt'); if(debt) debt.innerHTML=deptCustomerDebtHtml(val('dlCustomer')); const stats=$('deptInvoiceStats'); if(stats) stats.innerHTML=deptInvoiceStatsHtml(); const no=$('deptInvoiceNo'); if(no) no.textContent='فاتورة قسم '+(userDept()||'-')+' / '+(val('dlOrder')||'مسودة جديدة'); }
  function deptApprovalTable(){ const rows=deptReviewRows(); if(!rows.length) return '<div class="empty">لا توجد بنود مسجلة لهذا الأوردر في القسم حتى الآن.</div>'; const total=rows.reduce((s,r)=>s+rowLineTotal(r),0); return table(rows,['الحالة','الأوردر','البند','كمية','سعر الوحدة','الإجمالي'],r=>[esc(rowBillingStatus(r)||rowCloseStatus(r)||'قيد مراجعة القسم'),esc(rowOrderId(r)),esc(rowItem(r)),esc(rowQty(r)),money(rowSale(r)),money(rowLineTotal(r))])+'<div class="deptInvoiceTotal"><span>إجمالي مسودة القسم</span><b>'+money(total)+'</b></div>'; }
  function screenDept(){
    const d = userDept() || 'طباعة';
    const qOrder = esc(qs.get('orderId') || qs.get('order') || '');
    const qCustomer = esc(qs.get('customer') || qs.get('customerName') || '');
    return `<div class="deptInvoicePage">
      <section class="deptInvoiceHero">
        <div><span class="deptEyebrow">فاتورة تشغيل مترابطة مع كتالوج EasyStore</span><h2 id="deptInvoiceNo">فاتورة قسم ${esc(d)} / ${qOrder||'مسودة جديدة'}</h2><p>كل صنف محفوظ في البرنامج يظهر هنا بسعره وقسمه، وكل بند تسجله يرجع فورًا إلى حسابات وفواتير الأقسام.</p></div>
        <div class="deptHeroBadges"><span>القسم: ${esc(d)}</span><span>المزامنة: Google Sheets</span><button class="btn small secondary" onclick="ES27.go('deptPurchases')">🧾 مشتريات اليوم</button></div>
      </section>
      <section id="deptInvoiceStats" class="deptInvoiceStats">${deptInvoiceStatsHtml()}</section>
      <section class="card deptInvoiceEditor">
        <div class="deptSectionTitle"><div><span>1</span><h3>بيانات العميل والأوردر</h3></div><small>المديونية ظاهرة دائمًا بجوار العميل</small></div>
        <div class="grid four">
          <div class="field deptCustomerField"><label>اسم العميل</label><input id="dlCustomer" list="deptCustomerList" value="${qCustomer}" oninput="ES27.refreshDeptContext()" placeholder="اختار عميل TrendOS"><datalist id="deptCustomerList">${customerOptions()}</datalist><div id="deptCustomerDebt" class="deptDebtSlot">${deptCustomerDebtHtml(qCustomer)}</div></div>
          <div class="field"><label>رقم الأوردر</label><input id="dlOrder" value="${qOrder}" oninput="ES27.refreshDeptContext()" placeholder="مثال 1052"></div>
          <div class="field deptCatalogField"><label>الصنف من كتالوج البرنامج</label><select id="dlItemSel" onchange="ES27.applyDeptItem()"><option value="">اختار صنفًا محفوظًا</option>${itemOptions()}</select><input id="dlItem" readonly placeholder="يظهر اسم الصنف هنا"></div>
          <div class="field"><label>قسم الصنف</label><input id="dlItemDept" readonly placeholder="يتحدد من الكتالوج"></div>
        </div>
        <div class="catalogSyncBar"><span>↔ الأصناف متبادلة مع شاشة الأصناف ومطبخ الحسابات</span><button type="button" class="btn small secondary" onclick="ES27.load(true)">تحديث الأصناف الآن</button></div>
        <div class="deptSectionTitle"><div><span>2</span><h3>التسعير والتسجيل</h3></div><small>سعر الوحدة × الكمية = إجمالي البند</small></div>
        <div class="grid six deptPriceGrid"><div class="field"><label>الكمية</label><input id="dlQty" type="number" min="1" value="1" oninput="ES27.calcDept()"></div><div class="field"><label>سعر السيستم</label><input id="dlSystemSale" readonly></div><div class="field"><label>سعر الوحدة بالفاتورة</label><input id="dlSale" type="number" min="0" oninput="ES27.calcDept()"></div><div class="field"><label>فرق السعر للهوالك</label><input id="dlDiff" readonly></div><div class="field checkboxField"><label>بند مشترك</label><label class="checkLine"><input id="dlSharedLine" type="checkbox"> يظهر عند القسم الآخر</label></div><div class="field"><label>ملاحظات</label><input id="dlNotes" placeholder="تفاصيل التنفيذ أو المقاس"></div></div>
        ${isLaser()?'<div class="actions"><button class="btn secondary" onclick="ES27.toggleLaserCalc()">حاسبة الليزر / حساب شغلانة</button></div><div id="laserCalcBox" class="card softBox">'+laserBox()+'</div>':''}
        <div class="deptInvoiceActions"><button class="btn deptSaveBtn" onclick="ES27.saveDeptLine()">＋ تسجيل البند في المسودة</button><button class="btn secondary" onclick="ES27.refreshDeptContext()">تحديث المراجعة</button><button class="btn deptApproveBtn" onclick="ES27.approveDeptInvoice()">✓ اعتماد فاتورة القسم</button></div><div id="deptMsg"></div>
      </section>
      <section class="card deptReviewCard"><div class="deptSectionTitle"><div><span>3</span><h3>مراجعة الفاتورة قبل الاعتماد</h3></div><small>البنود المعتمدة فقط تنتقل للفاتورة النهائية</small></div><div id="deptApprovalBox">${deptApprovalTable()}</div></section>
      <section class="card deptSharedCard"><h3>البنود المشتركة من القسم الآخر</h3><div id="deptSharedBox">${deptSharedTable()}</div></section>
    </div>`;
  }
  function screenWaste(){ const rows=isAdmin()?scopedWasteLines():(state.data.wasteLines||[]).filter(r=>String(r.department||'')===userDept()); return `<div class="card"><h2>${esc(accountingScopeTitle('هوالك القسم'))}</h2><div class="grid four"><div class="field"><label>رقم الأوردر</label><input id="waOrder"></div><div class="field"><label>سبب الهالك</label><input id="waReason"></div><div class="field"><label>قيمة التالف</label><input id="waAmount" type="number"></div><div class="field"><label>تعويض</label><input id="waPaid" type="number"></div></div><button class="btn" onclick="ES27.saveWaste()">حفظ الهالك</button></div>${table(rows,['القسم','الأوردر','السبب','قيمة','تعويض'],r=>[esc(r.department),esc(r.orderId),esc(r.reason),money(r.amount),money(r.paid)])}`; }
  function screenFinalLegacy(){ return `<div class="card"><h2>تقفيل الفاتورة النهائية</h2><div class="grid three"><div class="field"><label>رقم الأوردر</label><input id="fiOrder"></div><div class="field"><label>العميل</label><input id="fiCustomer" list="custList"><datalist id="custList">${customerOptions()}</datalist></div><div class="field"><label>مدفوع</label><input id="fiPaid" type="number"></div></div><button class="btn secondary" onclick="ES27.collectDeptLines()">استدعاء أجزاء وائل وجابر</button><button class="btn" onclick="ES27.saveFinal()">تقفيل الفاتورة</button><div id="finalBox" class="invoiceBox"></div></div>`; }
  function screenFinal(){
    return `<div class="deptInvoicePage finalInvoicePage">
      <section class="deptInvoiceHero finalInvoiceHero">
        <div><span class="deptEyebrow">تقفيل موثوق من السيرفر</span><h2>الفاتورة النهائية الموحّدة</h2><p>يتم احتساب الإجمالي من بنود الأقسام المعتمدة داخل Google Sheets، ولا يتم الاعتماد على أرقام المتصفح.</p></div>
        <div class="deptHeroBadges"><span>V1889 Trusted Invoice</span><span>منع السحب المكرر</span></div>
      </section>
      <section class="card deptReviewCard"><div class="deptSectionTitle"><div><span>0</span><h3>فواتير محتاجة تقفيل</h3></div><small>أي أوردر عليه بنود أقسام معتمدة وغير مسحوبة يظهر هنا تلقائيًا</small></div>${pendingFinalTable()}</section>
      <section class="card deptInvoiceEditor">
        <div class="deptSectionTitle"><div><span>1</span><h3>بيانات الفاتورة</h3></div><small>الأوردر والعميل والمدفوع</small></div>
        <div class="grid three"><div class="field"><label>رقم الأوردر</label><input id="fiOrder" placeholder="رقم الأوردر"></div><div class="field customerField finalCustomerField"><label>العميل</label><input id="fiCustomer" placeholder="ابحث بالاسم أو الرقم" autocomplete="off" onfocus="ES27.focusFinalCustomer()" oninput="ES27.searchFinalCustomers(this.value)"><div id="fiCustomerDrop" class="customerDrop hidden"></div><div id="finalCustomerDebt" class="deptDebtSlot">${deptCustomerDebtHtml('')}</div></div><div class="field"><label>المدفوع</label><input id="fiPaid" type="number" value="0"></div></div>
        <div class="deptInvoiceActions"><button class="btn secondary" onclick="ES27.collectDeptLines()">استدعاء البنود المعتمدة</button><button class="btn deptApproveBtn" onclick="ES27.saveFinal()">تقفيل الفاتورة من السيرفر</button></div>
      </section>
      <section class="card deptReviewCard"><div class="deptSectionTitle"><div><span>2</span><h3>مراجعة البنود</h3></div><small>لن تُسحب البنود غير المعتمدة</small></div><div id="finalBox" class="invoiceBox"><div class="empty">اكتب رقم الأوردر ثم استدعِ البنود المعتمدة.</div></div></section>
      <section class="card deptReviewCard"><div class="deptSectionTitle"><div><span>3</span><h3>فواتير مقفولة للمراجعة</h3></div><small>ضياء فقط يقدر يرجع فاتورة للمراجعة، والربحية ظاهرة له فقط</small></div>${isAdmin()?'<div class="deptInvoiceActions"><button class="btn secondary" onclick="ES27.reconcileLegacyDebts()">مزامنة مديونيات الفواتير القديمة</button></div>':''}${closedFinalInvoicesTable()}</section>
    </div>`;
  }
  function screenDeptView(){ return `<div class="card"><h2>أجزاء الأقسام</h2>${table(state.data.deptLines,['أوردر','القسم','البند','كمية','سعر'],r=>[esc(r.orderId),esc(r.department),esc(r.itemName),esc(r.qty),money(r.sale)])}</div>`; }

  async function load(silent){
    if(state.loading) return;
    state.loading = true;
    if(!silent) msg('جاري تحميل البيانات...');
    try{
      const r = await api('getAccounting',{requestedRole:isAdmin()?'admin':isFinal()?'final':isLaser()?'laser':isPrint()?'print':'employee',requestedDepartment:userDept()});
      if(!r || r.success === false) throw new Error(r && r.message || 'تعذر تحميل البيانات');
      let customerRows = [];
      let supplierRows = [];
      try{ const cr=await api('getEasyStoreCustomers',{limit:1000}); if(cr&&cr.success) customerRows=cr.customers||[]; }catch(e){}
      try{ const sr=await api('getEasyStoreSuppliers',{}); if(sr&&sr.success) supplierRows=sr.suppliers||sr.rows||[]; }catch(e){}
      mergeData(normalizeIncomingData({
        materials: r.materials || r.rawMaterials || [],
        templates: r.templates || r.items || [],
        suppliers: supplierRows.length ? supplierRows : (r.suppliers || []),
        purchases: r.purchases || [],
        dailyPurchases: r.dailyPurchases || [],
        custodyEntries: r.custodyEntries || [],
        custodySummary: r.custodySummary || [],
        departmentDayCloses: r.departmentDayCloses || [],
        unclassifiedRows: r.unclassifiedRows || [],
        sales: r.sales || [],
        customers: customerRows.length ? customerRows : (r.customers || []),
        stockMoves: r.stockMoves || [],
        wasteLines: r.wasteLines || [],
        deptLines: r.deptLines || [],
        finalInvoices: r.finalInvoices || [],
        summary: r.summary || {}
      }));
      saveLocal(); render(); if(state.active==='sales' && (qs.get('pullLines') || qs.get('autoLoadCustomer') || qs.get('customer'))){ setTimeout(()=>{ try{ ES27.loadSaleCustomerFromInput(true); }catch(e){ try{ ES27.pullDeptCandidates(); }catch(x){} } },160); } msg('تم التحديث من الشيتات: ' + now());
    }catch(e){
      mergeData(); render(); msg('تنبيه: يعمل بنسخة محلية مؤقتة - ' + e.message, true);
    }finally{ state.loading = false; }
  }

  window.ES27 = {
    go(t){ if(!allowedScreens().includes(t)) return deny('هذه الشاشة غير متاحة لصلاحية المستخدم الحالي.'); state.active = t; shell(); if(t==='dailyClose'&&!state.dailyReport) this.loadDailyReport(); },
    load,
    setAccountingScope(scope){
      if(!isAdmin()) return deny('اختيار حسابات القسم متاح لضياء فقط.');
      scope=['all','laser','print'].includes(scope)?scope:'all';
      state.accountingScope=scope;
      try{ localStorage.setItem(ACCOUNTING_SCOPE_KEY,scope); }catch(e){}
      state.recipeComps=[]; state.salePulledLines=[]; state.purchaseRequestId='';
      shell(); flash('تم فتح '+accountingScopeLabel()+'.');
    },
    hardReload(){ const url = location.pathname + '?v=es45-v1920-custody-department-day-close-' + Date.now(); location.href = url; },
    async saveCustody(){
      if(!isAdmin()) return deny('تسليم العهدة عند ضياء فقط.');
      const employee=val('cuEmployee'),department=val('cuDept'),amount=num(val('cuAmount')),workDate=val('cuDate')||dailyPurchaseTodayKey(),paymentMethod=val('cuMethod')||'نقدي',notes=val('cuNotes');
      if(!employee||!department||amount<=0) return flash('اختر الموظف والقسم واكتب مبلغ عهدة أكبر من صفر.',true);
      if(!confirm('تسليم عهدة '+money(amount)+' إلى '+employee+' لقسم '+department+'؟')) return;
      try{const reply=await api('savePurchaseCustodyV1920',{employee,department,amount,workDate,paymentMethod,notes,requestId:'CUS-'+workDate+'-'+nkey(employee)+'-'+Date.now()});if(!reply||reply.success===false)throw new Error((reply&&reply.message)||'تعذر حفظ العهدة.');await load(true);flash(reply.message||'تم تسليم العهدة.');}catch(e){flash(e.message||'تعذر حفظ العهدة.',true);}
    },
    async closeCustody(encodedEmployee,department,workDate){
      if(!isAdmin()) return deny();let employee='';try{employee=decodeURIComponent(String(encodedEmployee||''));}catch(e){employee=String(encodedEmployee||'');}
      const summary=(state.data.custodySummary||[]).find(r=>nkey(r.employee)===nkey(employee)&&nkey(r.department)===nkey(department)&&String(r.workDate||'')===String(workDate||''));
      const resultText=summary&&summary.balance>0?'سيُسجل رد '+money(summary.balance)+' إلى الخزنة.':summary&&summary.balance<0?'سيُسجل دفع '+money(Math.abs(summary.balance))+' للموظف.':'لا يوجد فرق.';
      if(!confirm('تقفيل عهدة '+employee+'؟\n'+resultText))return;
      try{const reply=await api('closePurchaseCustodyV1920',{employee,department,workDate,paymentMethod:'نقدي',requestId:'CCL-'+workDate+'-'+nkey(employee)});if(!reply||reply.success===false)throw new Error((reply&&reply.message)||'تعذر تقفيل العهدة.');await load(true);flash(reply.message||'تم تقفيل العهدة.');}catch(e){flash(e.message||'تعذر تقفيل العهدة.',true);}
    },
    async loadDailyReport(){
      if(!isAdmin())return deny();const workDate=val('dcDate')||state.dailyReportDate||dailyPurchaseTodayKey(),department=val('dcDept')||state.dailyReportDepartment||'ليزر';state.dailyReportDate=workDate;state.dailyReportDepartment=department;
      try{const reply=await api('getDailyDepartmentReportV1920',{workDate,department});if(!reply||reply.success===false)throw new Error((reply&&reply.message)||'تعذر تحميل التقرير.');state.dailyReport=reply.report||null;state.data.departmentDayCloses=reply.closes||state.data.departmentDayCloses;render();flash('تم تجهيز تقرير '+department+' ليوم '+workDate+'.');}catch(e){flash(e.message||'تعذر تحميل التقرير.',true);}
    },
    async closeDepartmentDay(){
      if(!isAdmin())return deny();const workDate=val('dcDate')||state.dailyReportDate||dailyPurchaseTodayKey(),department=val('dcDept')||state.dailyReportDepartment||'ليزر';
      if(!confirm('حفظ تقفيل '+department+' ليوم '+workDate+'؟'))return;
      try{const reply=await api('closeDepartmentDayV1920',{workDate,department,requestId:'DAY-'+workDate+'-'+nkey(department),notes:'تقفيل من EasyStore ES45'});if(!reply||reply.success===false)throw new Error((reply&&reply.message)||'تعذر حفظ التقفيل.');state.dailyReport=reply.report||state.dailyReport;await load(true);flash(reply.message||'تم حفظ التقفيل.');}catch(e){flash(e.message||'تعذر حفظ التقفيل.',true);}
    },
    async classifyLegacy(index){
      if(!isAdmin())return deny();const row=(state.data.unclassifiedRows||[])[index],department=val('legacyDept'+index);if(!row)return flash('السجل غير موجود.',true);
      if(!confirm('تصنيف '+(row.label||'السجل')+' ضمن قسم '+department+'؟ لا يمكن تغييره من هذه الشاشة بعد الحفظ.'))return;
      try{const reply=await api('classifyLegacyAccountingRowV1920',{entity:row.entity,rowNumber:row.rowNumber,department});if(!reply||reply.success===false)throw new Error((reply&&reply.message)||'تعذر التصنيف.');await load(true);flash(reply.message||'تم التصنيف.');}catch(e){flash(e.message||'تعذر التصنيف.',true);}
    },
    async reversePurchase(encodedId,encodedInvoice){
      if(!isAdmin())return deny('عكس المشتريات عند ضياء فقط.');let id='',invoiceNo='';try{id=decodeURIComponent(String(encodedId||''));invoiceNo=decodeURIComponent(String(encodedInvoice||''));}catch(e){id=String(encodedId||'');invoiceNo=String(encodedInvoice||'');}
      const reason=prompt('اكتب سبب عكس المشتريات. لن يتم حذف الفاتورة:','تم الاعتماد بالخطأ');if(!reason)return;
      if(!confirm('تنفيذ عكس حركة المشتريات؟\nسيتم فحص المخزون ثم عكس المورد والخزنة أو العهدة.'))return;
      try{const reply=await api('reverseApprovedPurchaseV1920',{id,invoiceNo,reason});if(!reply||reply.success===false)throw new Error((reply&&reply.message)||'تعذر عكس المشتريات.');await load(true);flash(reply.message||'تم عكس المشتريات.');}catch(e){flash(e.message||'تعذر عكس المشتريات.',true);}
    },
    quickSearch(q){ q=nkey(q); if(!q) return; const found = templates().find(r=>nkey(templateName(r)).includes(q)) || materials().find(r=>nkey(materialName(r)).includes(q)); if(found) flash('تم العثور على: ' + (templateName(found)||materialName(found))); },
    async saveSupplier(){ if(!canManageAccounting()) return deny(); const s={name:val('supName'),phone:val('supPhone'),opening:num(val('supOpening')),address:val('supAddress')}; if(!s.name) return flash('اكتب اسم المورد',true); try{ const reply=await api('saveEasyStoreSupplier',s); if(!reply||reply.success===false) throw new Error((reply&&reply.message)||'تعذر حفظ المورد'); const i=state.data.suppliers.findIndex(x=>nkey(x.name||x.supplier)===nkey(s.name)); if(i>=0) state.data.suppliers[i]=s; else state.data.suppliers.unshift(s); saveLocal(); shell(); flash('تم حفظ المورد على السيرفر'); }catch(e){ flash('لم يتم حفظ المورد: '+(e.message||e),true); } },
    editSupplier(i){ const s=state.data.suppliers[i]; if(!s) return; set('supName',s.name||s.supplier); set('supPhone',s.phone); set('supOpening',s.opening||s.openingBalance); set('supAddress',s.address); },
    filterCustomers(){ const q=nkey(val('custSearch')); const rows=(state.data.customers||[]).filter(c=>nkey([c.name,c.customerName,c.phone,c.mobile].join(' ')).includes(q)); const box=$('custTable'); if(box) box.innerHTML=customersTable(rows); },
    resetCustomerAccountRequest(){ state.customerAccountRequestId=''; },
    closeCustomerAccount(){ state.customerAccountSelected=''; state.customerAccount=null; state.customerAccountRequestId=''; render(); },
    async openCustomerAccount(encodedName){
      if(!canFinalize()) return deny('حسابات العملاء عند ضياء / رحمة / ريفان فقط.');
      let name='';
      try{name=decodeURIComponent(String(encodedName||''));}catch(e){name=String(encodedName||'');}
      if(!name) return flash('اختر العميل أولًا.',true);
      state.customerAccountSelected=name;
      state.customerAccountRequestId='';
      state.customerAccount={loading:true};
      render();
      try{
        const reply=await api('getCustomerAccountV1915',{customerName:name});
        if(!reply || reply.success===false) throw new Error((reply&&reply.message)||'تعذر تحميل كشف الحساب.');
        state.customerAccount=reply;
        state.customerAccountSelected=(reply.customer&&reply.customer.name)||reply.partyName||name;
        const local=customerByName(state.customerAccountSelected);
        if(local){ local.debt=reply.balance; local.currentBalance=reply.balance; local.remainingBalance=reply.balance; }
        saveLocal(); render();
      }catch(e){ state.customerAccount={error:e.message||String(e)}; render(); }
    },
    async saveCustomerAccountMovement(){
      if(!canFinalize()) return deny('حسابات العملاء عند ضياء / رحمة / ريفان فقط.');
      const name=state.customerAccountSelected;
      const operation=val('caOperation')||'payment_received';
      const amount=num(val('caAmount'));
      const method=val('caMethod')||'نقدي';
      const refNo=val('caRef');
      const notes=val('caNotes');
      if(!name) return flash('اختر العميل أولًا.',true);
      if(amount<=0) return flash('اكتب مبلغًا أكبر من صفر.',true);
      if(!isAdmin() && operation!=='payment_received') return deny('إضافة المديونية والتسويات عند ضياء فقط.');
      const before=num(state.customerAccount&&state.customerAccount.balance);
      const decrease=operation==='payment_received'||operation==='adjustment_decrease';
      const after=before+(decrease?-amount:amount);
      if(decrease && amount>before) return flash('المبلغ أكبر من مديونية العميل الحالية '+money(before)+'.',true);
      const label=customerAccountOperationLabel({operation});
      if(!confirm(label+' بمبلغ '+money(amount)+' للعميل '+name+'؟\nالرصيد بعد الحركة: '+money(after))) return;
      if(!state.customerAccountRequestId) state.customerAccountRequestId='CUST-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
      const button=$('caSaveBtn');
      if(button){button.disabled=true;button.textContent='جاري الحفظ...';}
      try{
        const reply=await api('saveCustomerAccountMovementV1915',{customerName:name,operation,amount,paymentMethod:method,refNo,notes,requestId:state.customerAccountRequestId,source:'EasyStore ES44'});
        if(!reply || reply.success===false) throw new Error((reply&&reply.message)||'تعذر حفظ حركة العميل.');
        let account=null;
        try{ account=await api('getCustomerAccountV1915',{customerName:name}); }catch(refreshError){}
        if(account && account.success!==false) state.customerAccount=account;
        else if(state.customerAccount && state.customerAccount.success) state.customerAccount.balance=reply.balance;
        state.customerAccountRequestId='';
        const local=customerByName(name);
        const savedBalance=account&&account.success!==false?account.balance:reply.balance;
        if(local){ local.debt=savedBalance; local.currentBalance=savedBalance; local.remainingBalance=savedBalance; }
        saveLocal(); render(); flash((reply.message||'تم حفظ الحركة وتحديث حساب العميل.')+(account&&account.success!==false?'':' حدّث كشف الحساب لعرض الحركة الجديدة.'));
      }catch(e){
        if(button){button.disabled=false;button.textContent='إعادة محاولة الحفظ';}
        flash(e.message||'تعذر حفظ حركة العميل.',true);
      }
    },
    unlockCustomerDropdown(){ state.customerDropdownLocked=false; },
    closeFloatingPanels(){ closeFloatingPanels(); },
    async focusSaleCustomer(){
      state.customerDropdownLocked=false;
      const local=localCustomerMatches(val('saCustomer'));
      if(local.length){ renderCustomerDropdown(local); return; }
      renderCustomerDropdown([]);
      try{ const r=await api('getEasyStoreCustomers',{limit:80}); if(r&&r.success){ state.data.customers=r.customers||[]; saveLocal(); renderCustomerDropdown(localCustomerMatches(val('saCustomer'))); } }catch(e){}
    },
    searchSaleCustomers(q){
      state.customerDropdownLocked=false;
      const seq = ++state.customerSearchSeq;
      renderCustomerDropdown(localCustomerMatches(q));
      clearTimeout(state.customerSearchTimer);
      state.customerSearchTimer=setTimeout(async()=>{
        try{ const r=await api('searchCustomers',{q:q||'ا'}); if(seq !== state.customerSearchSeq || state.customerDropdownLocked) return; if(r&&r.success){ const map={}; (state.data.customers||[]).forEach(c=>{map[nkey((c.name||c.customerName)+'|'+(c.phone||c.mobile))]=c}); (r.customers||[]).forEach(c=>{map[nkey((c.name||c.customerName)+'|'+(c.phone||c.mobile))]=c}); state.data.customers=Object.values(map); saveLocal(); renderCustomerDropdown(localCustomerMatches(q)); } }catch(e){}
      },260);
    },
    pickSaleCustomer(i){ const box=$('saCustomerDrop'); const rows=(box&&box.__rows)||[]; const c=rows[i]; if(!c) return; state.customerDropdownLocked=true; state.customerSearchSeq++; clearTimeout(state.customerSearchTimer); set('saCustomer',customerMainName(c)); if(!$('saOrder')?.value && qs.get('orderId')) set('saOrder',qs.get('orderId')); closeFloatingPanels(); const inp=$('saCustomer'); if(inp) inp.blur(); this.loadSaleCustomer(c); },
    async focusFinalCustomer(){
      const local=localCustomerMatches(val('fiCustomer'));
      if(local.length){ renderFinalCustomerDropdown(local); return; }
      renderFinalCustomerDropdown([]);
      try{ const r=await api('getEasyStoreCustomers',{limit:80}); if(r&&r.success){ state.data.customers=r.customers||[]; saveLocal(); renderFinalCustomerDropdown(localCustomerMatches(val('fiCustomer'))); } }catch(e){}
    },
    searchFinalCustomers(q){
      renderFinalCustomerDropdown(localCustomerMatches(q));
      clearTimeout(state.customerSearchTimer);
      state.customerSearchTimer=setTimeout(async()=>{
        try{ const r=await api('searchCustomers',{q:q||'ا'}); if(r&&r.success){ const map={}; (state.data.customers||[]).forEach(c=>{map[nkey((c.name||c.customerName)+'|'+(c.phone||c.mobile))]=c}); (r.customers||[]).forEach(c=>{map[nkey((c.name||c.customerName)+'|'+(c.phone||c.mobile))]=c}); state.data.customers=Object.values(map); saveLocal(); renderFinalCustomerDropdown(localCustomerMatches(q)); } }catch(e){}
      },260);
      this.refreshFinalDebt();
    },
    pickFinalCustomer(i){
      const box=$('fiCustomerDrop'); const rows=(box&&box.__rows)||[]; const c=rows[i]; if(!c) return;
      set('fiCustomer',customerMainName(c));
      autoPickFinalOrderForCustomer(c);
      closeFloatingPanels();
      const inp=$('fiCustomer'); if(inp) inp.blur();
      this.refreshFinalDebt();
      this.collectDeptLines();
    },
    loadSaleCustomer(c){ loadSaleCustomerContext(c); },
    loadSaleCustomerFromInput(silent){ const q=val('saCustomer'); const c=state.saleSelectedCustomer || localCustomerMatches(q)[0] || {name:q}; if(c && customerMainName(c) && !state.saleSelectedCustomer) state.saleSelectedCustomer=c; loadSaleCustomerContext(c,{silent:!!silent}); },
    refreshSaleCustomerContext(){ const c=state.saleSelectedCustomer || localCustomerMatches(val('saCustomer'))[0] || {name:val('saCustomer')}; setInvoiceNoForContext(c); renderSalePulledBoxes(); renderSaleCustomerContext(c); },
    pickSaleOrder(order){ set('saOrder',order||''); const c=state.saleSelectedCustomer || localCustomerMatches(val('saCustomer'))[0] || {name:val('saCustomer')}; loadSaleCustomerContext(c); },
    pullDeptCandidates(){ const c=state.saleSelectedCustomer || localCustomerMatches(val('saCustomer'))[0] || {name:val('saCustomer')}; renderSalePulledBoxes(); renderSaleCustomerContext(c); flash('تم تحميل بنود الأقسام غير المفوترة المطابقة.'); },
    addAllCandidateLines(){ addAllCandidateLines(); renderSaleCustomerContext(state.saleSelectedCustomer || {name:val('saCustomer')}); },
    addPickedDeptLines(){ const rows=saleCandidateLines(); const picked={}; document.querySelectorAll('.saleLinePick:checked').forEach(ch=>picked[ch.dataset.key]=true); const cur=salePulledIds(); rows.forEach(r=>{ const key=nkey(rowLineId(r)||JSON.stringify(r)); if(picked[key] && !cur[key]) state.salePulledLines.push(r); }); renderSalePulledBoxes(); renderSaleCustomerContext(state.saleSelectedCustomer || {name:val('saCustomer')}); },
    removePulledLine(i){ state.salePulledLines.splice(i,1); renderSalePulledBoxes(); renderSaleCustomerContext(state.saleSelectedCustomer || {name:val('saCustomer')}); },
    toggleClientInvoiceMenu(ev){ ev&&ev.preventDefault(); ev&&ev.stopPropagation&&ev.stopPropagation(); const drop=$('saCustomerDrop'); if(drop){ drop.classList.add('hidden'); drop.innerHTML=''; drop.__rows=[]; } const m=$('clientInvoiceMenu'); if(m) m.classList.toggle('hidden'); },
    invoicePlainText(){ const rows=state.salePulledLines||[]; const lines=['فاتورة مطبعجي','رقم الفاتورة: '+val('saNo'),'رقم الأوردر: '+val('saOrder'),'العميل: '+val('saCustomer'),'--------------------']; if(rows.length){ rows.forEach((r,i)=>lines.push((i+1)+') '+rowDept(r)+' - '+rowItem(r)+' × '+rowQty(r)+' = '+money(rowLineTotal(r)))); } else { lines.push('1) '+(val('saItem')||'بند مطبعجي')+' × '+(val('saQty')||1)+' = '+money(num(val('saQty'))*num(val('saUnit')))); } lines.push('--------------------','الإجمالي: '+money(val('saTotal')),'المدفوع: '+money(val('saPaid')),'المتبقي: '+money(val('saRemain'))); return lines.join('\n'); },
    invoiceHtml(){ const rows=state.salePulledLines||[]; const trs=(rows.length?rows:[{department:'',itemName:val('saItem')||'بند مطبعجي',qty:val('saQty')||1,sale:val('saUnit')}]).map((r,i)=>`<tr><td>${i+1}</td><td>${esc(rowDept(r))}</td><td>${esc(rowItem(r))}</td><td>${esc(rowQty(r))}</td><td>${esc(money(rowLineTotal(r)))}</td></tr>`).join(''); return `<html dir="rtl"><head><title>فاتورة مطبعجي</title><style>body{font-family:Tahoma;padding:30px;background:#f8fafc}.box{max-width:780px;margin:auto;background:white;border:1px solid #ddd;padding:25px;border-radius:18px}h1{color:#0f766e}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:9px;text-align:right}.total{font-size:22px;color:#0f766e;font-weight:bold}</style></head><body><div class="box"><h1>فاتورة مطبعجي</h1><p>رقم: ${esc(val('saNo'))}</p><p>العميل: ${esc(val('saCustomer'))}</p><p>الأوردر: ${esc(val('saOrder'))}</p><table><thead><tr><th>#</th><th>القسم</th><th>البند</th><th>كمية</th><th>القيمة</th></tr></thead><tbody>${trs}</tbody></table><p class="total">الإجمالي: ${esc(money(val('saTotal')))}</p><p>المدفوع: ${esc(money(val('saPaid')))} / المتبقي: ${esc(money(val('saRemain')))}</p></div><script>setTimeout(()=>print(),400)<\/script></body></html>`; },
    showPricePreview(){ closeFloatingPanels(); alert(this.invoicePlainText()); },
    async copySaleText(){ closeFloatingPanels(); const t=this.invoicePlainText(); try{ await navigator.clipboard.writeText(t); flash('تم نسخ نص الفاتورة'); }catch(e){ prompt('انسخ نص الفاتورة',t); } },
    openSaleWhatsApp(){ closeFloatingPanels(); const t=this.invoicePlainText(); window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank'); },
    downloadSaleImage(){ closeFloatingPanels(); const canvas=document.createElement('canvas'); canvas.width=1200; canvas.height=900; const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,1200,900); ctx.fillStyle='#0f766e'; ctx.fillRect(0,0,1200,120); ctx.fillStyle='#fff'; ctx.font='bold 44px Arial'; ctx.textAlign='right'; ctx.fillText('فاتورة مطبعجي',1120,75); ctx.fillStyle='#111827'; ctx.font='28px Arial'; const lines=this.invoicePlainText().split('\n'); let y=170; lines.forEach(l=>{ ctx.fillText(l,1120,y); y+=42; }); const a=document.createElement('a'); a.download='matbagy-sale-'+(val('saNo')||Date.now())+'.png'; a.href=canvas.toDataURL('image/png'); a.click(); },
    async saveItem(){ if(!canManageAccounting()) return deny(); const p={department:val('itDept'),itemName:val('itName'),category:val('itType')||'صنف بيع',size:val('itSize'),salePrice:num(val('itSale')),fixedCost:num(val('itCost')),computedUnitCost:num(val('itCost')),active:'نعم',recordType:'template'}; if(!p.itemName) return flash('اكتب اسم الصنف',true); try{ const reply=await api('saveAccountingTemplate',Object.assign({upsert:'1'},p)); if(!reply||reply.success===false) throw new Error((reply&&reply.message)||'تعذر حفظ الصنف'); p.fixedCost=num(reply.calculatedCost); p.computedUnitCost=p.fixedCost; const res=upsertByNameDept(state.data.templates,p,templateName,matDept); saveLocal(); state.active='items'; shell(); flash(reply.message||(res.updated?'الصنف موجود وتم تحديثه في الكتالوج':'تم حفظ الصنف في الكتالوج')); }catch(e){ flash('لم يتم حفظ الصنف: '+(e.message||e),true); } },
    editItem(i){ const r=productTemplates()[i]; if(!r) return; set('itDept',matDept(r)); set('itName',templateName(r)); set('itType',r.category||matType(r)); set('itSize',r.size); set('itSale',matSale(r)); set('itCost',matCost(r)); },
    clearItemForm(){ ['itName','itSize','itSale','itCost'].forEach(id=>set(id,'')); },
    archiveItem(i){ if(!canManageAccounting()) return deny(); const r=productTemplates()[i]; if(!r || !confirm('إيقاف الصنف ' + templateName(r) + '؟')) return; r.active='لا'; r['مفعل']='لا'; saveLocal(); api('archiveAccountingTemplate',{itemName:templateName(r),department:matDept(r)}).catch(()=>{}); shell(); },
    resetDailyPurchaseRequest(){ state.dailyPurchaseRequestId=''; },
    calcDailyPurchase(){ const total=num(val('dpQty'))*num(val('dpUnit')); const payment=nkey(val('dpPayment')); set('dpTotal',total.toFixed(2)); set('dpPaid',(/اجل|آجل/.test(payment)?0:total).toFixed(2)); },
    async saveDailyPurchase(){
      if(!canUseDepartment()) return deny('تسجيل مشتريات اليوم متاح لجابر ووائل فقط.');
      this.calcDailyPurchase();
      if(!state.dailyPurchaseRequestId) state.dailyPurchaseRequestId='DPP-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
      const p={requestId:state.dailyPurchaseRequestId,supplier:val('dpSupplier'),receiptNo:val('dpReceipt'),material:val('dpMaterial'),qty:num(val('dpQty')),unit:num(val('dpUnit')),total:num(val('dpTotal')),paymentType:val('dpPayment')||'نقدي',paid:num(val('dpPaid')),notes:val('dpNotes')};
      if(!p.supplier||!p.material||p.qty<=0||p.unit<=0) return flash('اختار المورد والخامة واكتب كمية وسعرًا أكبر من صفر.',true);
      const button=$('dpSaveBtn'); if(button){button.disabled=true;button.textContent='جاري التسجيل...';}
      try{
        const reply=await api('saveDeptDailyPurchaseV1917',p);
        if(!reply||reply.success===false) throw new Error((reply&&reply.message)||'تعذر تسجيل مشتريات اليوم.');
        state.dailyPurchaseRequestId='';
        if(reply.purchase && !(state.data.dailyPurchases||[]).some(r=>nkey(r.id)===nkey(reply.purchase.id))) state.data.dailyPurchases.unshift(reply.purchase);
        if(!reply.duplicatePrevented && Number.isFinite(Number(reply.stockAfter))){
          const wantedName=nkey(p.material), wantedDept=nkey(userDept());
          const candidates=materialRows().filter(r=>nkey(materialName(r))===wantedName);
          const materialRow=candidates.find(r=>nkey(matDept(r))===wantedDept)||candidates.find(r=>/مشترك|عام/.test(nkey(matDept(r))));
          if(materialRow){ materialRow.stockQty=num(reply.stockAfter); materialRow.stock=num(reply.stockAfter); materialRow.balance=num(reply.stockAfter); materialRow['رصيد المخزن']=num(reply.stockAfter); }
          state.data.stockMoves.unshift({date:now(),department:userDept(),materialName:p.material,inQty:p.qty,outQty:0,balance:num(reply.stockAfter),source:'مشتريات اليوم - مخزون فوري'});
        }
        saveLocal(); shell(); flash(reply.message||'تم إرسال المشتريات لمراجعة ضياء.');
      }catch(e){ if(button){button.disabled=false;button.textContent='إعادة محاولة التسجيل';} flash(e.message||'تعذر تسجيل مشتريات اليوم.',true); }
    },
    async approveDailyPurchaseBatch(encodedEmployee,workDate){
      if(!isAdmin()) return deny('اعتماد مشتريات جابر ووائل عند ضياء فقط.');
      let employee=''; try{employee=decodeURIComponent(String(encodedEmployee||''));}catch(e){employee=String(encodedEmployee||'');}
      const group=dailyPurchasePendingGroups().find(g=>nkey(g.employee)===nkey(employee)&&String(g.date)===String(workDate));
      if(!group||!group.rows.length) return flash('لا توجد مشتريات معلقة لهذه المجموعة.',true);
      if(!confirm('اعتماد '+group.rows.length+' بند مشتريات لـ '+employee+' بإجمالي '+money(group.total)+'؟\nالمخزون مضاف بالفعل ولن يزيد مرة ثانية؛ سيتم تثبيت فواتير الموردين فقط.')) return;
      try{
        const reply=await api('approveDeptDailyPurchasesV1917',{employee,workDate,requestId:'DPP-BATCH-'+workDate+'-'+nkey(employee)});
        if(!reply||reply.success===false) throw new Error((reply&&reply.message)||'تعذر اعتماد مشتريات اليوم.');
        await load(true); flash(reply.message||'تم اعتماد مشتريات اليوم.',!!reply.partial);
      }catch(e){ flash(e.message||'تعذر اعتماد مشتريات اليوم.',true); }
    },
    async rejectDailyPurchase(encodedId){
      if(!isAdmin()) return deny('رفض مشتريات الأقسام عند ضياء فقط.');
      let id=''; try{id=decodeURIComponent(String(encodedId||''));}catch(e){id=String(encodedId||'');}
      if(!id||!confirm('رفض بند المشتريات هذا؟\nسيتم عكس الكمية من المخزون. إذا كان القسم استهلكها فلن يسمح النظام بالرفض.')) return;
      try{ const reply=await api('rejectDeptDailyPurchaseV1917',{id,reason:'مرفوض من ضياء بعد المراجعة'}); if(!reply||reply.success===false) throw new Error((reply&&reply.message)||'تعذر رفض البند.'); await load(true); flash(reply.message||'تم رفض البند.'); }catch(e){ flash(e.message||'تعذر رفض البند.',true); }
    },
    calcPurchase(){ const total=num(val('puQty'))*num(val('puUnit')); set('puTotal',total.toFixed(2)); set('puRemain',Math.max(0,total-num(val('puPaid'))).toFixed(2)); },
    refreshPurchaseMaterials(){ const select=$('puMat'); if(select) select.innerHTML='<option value="">اختار الخامة</option>'+purchaseMaterialOptions(val('puDept')); state.purchaseRequestId=''; },
    async savePurchase(){ if(!canManageAccounting()) return deny(); this.calcPurchase(); if(!state.purchaseRequestId) state.purchaseRequestId='PUR-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10); const p={requestId:state.purchaseRequestId,department:val('puDept')||accountingScopeDepartment(),no:val('puNo'),supplier:val('puSupplier'),paymentType:val('puPay'),dueDate:val('puDue'),material:val('puMat'),qty:num(val('puQty')),unit:num(val('puUnit')),paid:num(val('puPaid')),total:num(val('puTotal')),remain:num(val('puRemain')),notes:val('puNotes'),date:new Date().toISOString()}; if(!p.department) return flash('اختار قسم الليزر أو الطباعة أولًا.',true); if(!p.no||!p.supplier||!p.material||p.qty<=0||p.unit<0) return flash('رقم الفاتورة والمورد والخامة وكمية صحيحة مطلوبة.',true); try{ const reply=await api('saveEasyStorePurchaseV2',p); if(!reply||reply.success===false) throw new Error((reply&&reply.message)||'تعذر حفظ فاتورة الشراء'); state.purchaseRequestId=''; state.data.purchases.unshift(p); state.data.stockMoves.unshift({date:now(),department:p.department,materialName:p.material,inQty:p.qty,outQty:0,balance:reply.stockAfter,source:'فاتورة شراء '+p.no}); saveLocal(); shell(); flash('تم حفظ فاتورة الشراء على قسم '+p.department+' وتحديث المخزون'); }catch(e){ flash('لم يتم حفظ فاتورة الشراء: '+(e.message||e),true); } },
    applySaleItem(){ const r=selectedSaleTemplate(); if(!r) return; set('saUnit',matSale(r)); this.calcSale(); },
    calcSale(){ updateSaleTotalsFromPulled(); },
    async saveSale(){
      if(!canFinalize()) return deny();
      this.calcSale();
      const r=selectedSaleTemplate();
      const lineIds=salePulledLineIds();
      const pulledRows=state.salePulledLines||[];
      const manualQty=num(val('saQty'));
      const manualUnit=num(val('saUnit'));
      const manualAmount=manualQty*manualUnit;
      const manualDescription=(r?templateName(r):val('saItem'));
      const desc = pulledRows.map(x=>rowDept(x)+': '+rowItem(x)+' × '+rowQty(x)).join(' / ');
      const pulledOrders=salePulledDeptSummary().orders;
      if(!val('saCustomer')) return flash('اختار العميل قبل حفظ الفاتورة.',true);
      if(lineIds.length && !val('saOrder')) return flash('رقم الأوردر مطلوب لتقفيل بنود وائل/جابر.',true);
      if(lineIds.length && pulledOrders.length>1) return flash('لا يمكن تقفيل أكتر من أوردر في نفس الفاتورة. اختار رقم أوردر واحد ثم اسحب البنود.',true);
      if(!lineIds.length && !manualDescription && !manualAmount) return flash('أضف بند يدوي أو اسحب بنود وائل/جابر أولًا.',true);
      if(/^DRAFT/i.test(val('saNo')) || !val('saNo')) set('saNo', officialSaleNo());
      const p={no:val('saNo'),customer:val('saCustomer'),customerPhone:customerMainPhone(state.saleSelectedCustomer||{}),orderId:val('saOrder'),paymentType:val('saPay'),item:desc || manualDescription || 'فاتورة مبيعات موحدة',qty:manualQty||pulledRows.length||1,unit:manualUnit,discount:num(val('saDiscount')),paid:num(val('saPaid')),total:num(val('saTotal')),remain:num(val('saRemain')),notes:val('saNotes'),lineIds:JSON.stringify(lineIds),date:new Date().toISOString()};
      if(!state.saleRequestId) state.saleRequestId='SALE-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
      p.requestId=state.saleRequestId;
      flash('جاري حفظ الفاتورة على السيرفر...');
      try{
        if(lineIds.length){
          const res=await api('saveAccountingFinalInvoice',{orderId:p.orderId,customerName:p.customer,paymentType:p.paymentType,paid:p.paid,discount:p.discount,lineIds:JSON.stringify(lineIds),manualDescription:manualDescription||'',manualAmount:manualAmount||0,notes:p.notes,status:p.remain>0?'عليها باقي':'مدفوعة',requestId:p.requestId});
          if(!res || res.success===false) throw new Error((res&&res.message)||'تعذر تقفيل الفاتورة على السيرفر.');
          p.no=res.invoiceNo||p.no;
          p.invoiceNo=p.no;
          p.total=num(res.finalTotal)||p.total;
          p.paid=num(res.paid)||p.paid;
          p.remain=(res.remaining!==undefined)?num(res.remaining):p.remain;
          set('saNo',p.no); set('saTotal',p.total.toFixed(2)); set('saPaid',p.paid); set('saRemain',p.remain.toFixed(2));
          state.data.finalInvoices.unshift({invoiceNo:p.no,no:p.no,orderId:p.orderId,customer:p.customer,customerName:p.customer,total:p.total,finalTotal:p.total,paid:p.paid,remain:p.remain,remaining:p.remain,lineCount:res.lineCount,item:p.item,date:new Date().toISOString()});
        } else {
          const res=await api('saveEasyStoreSaleV2',p);
          if(!res || res.success===false) throw new Error((res&&res.message)||'تعذر حفظ فاتورة البيع على السيرفر.');
        }
        state.data.sales.unshift(p);
        if(!lineIds.length && p.item) state.data.stockMoves.unshift({date:now(),materialName:p.item,inQty:0,outQty:p.qty,balance:'',source:'فاتورة بيع '+p.no});
        pulledRows.forEach(x=>{ x.closeStatus='تم التقفيل'; x.invoiceNo=p.no; x['حالة التقفيل']='تم التقفيل'; x['رقم الفاتورة النهائية']=p.no; });
        saveLocal();
        state.salePulledLines=[]; state.saleSelectedCustomer=null; state.saleRequestId=''; shell(); flash('تم حفظ الفاتورة الرسمية رقم '+p.no+' وربطها ببنود وائل/جابر.');
      }catch(e){
        flash('لم يتم حفظ الفاتورة: '+(e.message||e),true);
      }
    },
    printSale(){ closeFloatingPanels(); const w=window.open('','_blank'); if(!w) return alert('اسمح بفتح نافذة الطباعة.'); w.document.write(this.invoiceHtml()); w.document.close(); },
    kitchenMode(mode){ const b=$('kitchenBox'); if(b) b.innerHTML = mode==='recipe' ? recipeForm() : rawForm(); },
    async saveRaw(){
      if(!canManageAccounting()) return deny();
      const p={department:val('rawDept'),materialName:val('rawName'),materialKind:materialKindLabel(val('rawKind')),materialClass:val('rawClass'),operationExpense:val('rawClass')==='مصروف تشغيل'?'نعم':'لا',operatingBand:val('rawOperatingBand'),operatingCalcMethod:val('rawOpMethod'),operatingUnitCost:num(val('rawOpCost')),unitCost:num(val('rawCost')),salePrice:num(val('rawSale')),stockQty:num(val('rawStock')),minStock:num(val('rawMin')),width:num(val('rawW')),height:num(val('rawH')),notes:val('rawNotes'),active:val('rawClass')==='متوقفة'?'لا':'نعم',recordType:'material'};
      if(!p.materialName) return flash('اكتب اسم الخامة',true);
      try{
        const reply=await api('saveAccountingMaterial',Object.assign({upsert:'1'},p));
        if(!reply||reply.success===false) throw new Error((reply&&reply.message)||'تعذر حفظ الخامة');
        const res=upsertByNameDept(state.data.materials,p,materialName,matDept);
        recalcTemplatesLocal(); saveLocal();
        api('recalcAccountingMaterialsCascade',{}).catch(()=>{});
        state.active='kitchen'; shell(); flash(res.updated?'تم تحديث الخامة على السيرفر وإعادة حساب الأصناف المرتبطة':'تم حفظ الخامة على السيرفر');
      }catch(e){ flash('لم يتم حفظ الخامة: '+(e.message||e),true); }
    },
    editRaw(i){ state.active='kitchen'; shell(); setTimeout(()=>{ const r=materialRows()[i]; if(!r) return; set('rawDept',matDept(r)); set('rawName',materialName(r)); set('rawClass',r.materialClass||r['تصنيف الخامة']||'خامة إنتاج'); set('rawKind',materialKindLabel(matType(r))); set('rawCost',matCost(r)); set('rawSale',matSale(r)); set('rawStock',matStock(r)); set('rawMin',matMin(r)); set('rawW',r.width||r.rawWidth||r['عرض']||''); set('rawH',r.height||r.rawHeight||r['طول']||''); set('rawOperatingBand',r.operatingBand||r['بند التشغيل']||'إنتاج مباشر'); set('rawOpMethod',r.operatingCalcMethod||r['طريقة توزيع التشغيل']||'لا يوزع'); set('rawOpCost',r.operatingUnitCost||r['قيمة التشغيل']||''); set('rawNotes',r.notes||r['ملاحظات']||''); flash('تم تحميل الخامة للتعديل'); },0); },
    clearRawForm(){ ['rawName','rawCost','rawSale','rawStock','rawMin','rawW','rawH','rawOpCost','rawNotes'].forEach(id=>set(id,'')); set('rawClass','خامة إنتاج'); set('rawKind','خامة عامة'); },
    updateCompCalc(useManual){ const m=matByName(val('compMat')); if(!m){ set('compCost',''); return; } const manual=num(val('compManualPieces')); if(useManual && manual>0){ const qty=1/manual; set('compQty',qty.toFixed(6)); set('compCost',(matCost(m)*qty).toFixed(4)); this.calcRecipe(); return; } const qty=num(val('compQty'))||1; set('compCost',(matCost(m)*qty).toFixed(4)); this.calcRecipe(); },
    aiComp(){ const m=matByName(val('compMat')); if(!m) return flash('اختار المكون',true); const sz=String(val('recSize')).replace(/[×*]/g,'x').split('x').map(num); const outW=sz[0]||0,outH=sz[1]||0, rawW=num(m.width||m.rawWidth||m['عرض']), rawH=num(m.height||m.rawHeight||m['طول']); let pieces=0; if(rawW&&rawH&&outW&&outH){ pieces=Math.max(Math.floor(rawW/outW)*Math.floor(rawH/outH),Math.floor(rawW/outH)*Math.floor(rawH/outW)); } const manual=num(val('compManualPieces')); const adopted=manual||pieces||1; const waste=Math.max(0,(pieces||adopted)-adopted); const qty=1/adopted; const cost=matCost(m)*qty; set('compAiPieces',pieces||''); set('compWaste',waste||''); set('compQty',qty.toFixed(6)); set('compCost',cost.toFixed(4)); this.calcRecipe(); },
    addComp(){ const name=val('compMat'); if(!name) return flash('اختار المكون',true); const m=matByName(name); let qty=num(val('compQty'))||1; let cost=num(val('compCost')); if(!cost && m) cost=matCost(m)*qty; const ex=state.recipeComps.findIndex(c=>nkey(c.materialName)===nkey(name)); const row={materialName:name,qty,cost}; if(ex>=0) state.recipeComps[ex]=row; else state.recipeComps.push(row); const c=$('compList'); if(c) c.innerHTML=compTable(); this.calcRecipe(); },
    removeComp(i){ state.recipeComps.splice(i,1); const c=$('compList'); if(c) c.innerHTML=compTable(); this.calcRecipe(); },
    clearComps(){ state.recipeComps=[]; const c=$('compList'); if(c) c.innerHTML=compTable(); this.calcRecipe(); },
    clearRecipeForm(){ state.recipeComps=[]; ['recName','recSize','recSale','recCost','recProfit','compQty','compAiPieces','compManualPieces','compWaste','compCost'].forEach(id=>set(id,'')); set('compQty','1'); const c=$('compList'); if(c) c.innerHTML=compTable(); },
    calcRecipe(){ const current = val('compMat') && !state.recipeComps.length ? num(val('compCost')) : 0; const cost=state.recipeComps.reduce((s,c)=>s+num(c.cost),0) + current; set('recCost',cost.toFixed(2)); const g=gp(cost,num(val('recSale'))); set('recProfit',g.profit.toFixed(2)); return cost; },
    async saveRecipe(){ if(!canManageAccounting()) return deny(); if(val('compMat') && !state.recipeComps.length) this.addComp(); const cost=this.calcRecipe(); const p={department:val('recDept'),itemName:val('recName'),size:val('recSize'),salePrice:num(val('recSale')),fixedCost:cost,computedUnitCost:cost,calculatedUnitCost:cost,componentsJson:JSON.stringify(state.recipeComps),category:'صنف بمكونات',recordType:'template',active:'نعم'}; if(!p.itemName) return flash('اكتب اسم الصنف',true); if(!state.recipeComps.length) return flash('أضف مكونًا واحدًا على الأقل للصنف.',true); try{ const reply=await api('saveAccountingTemplate',Object.assign({upsert:'1'},p)); if(!reply||reply.success===false) throw new Error((reply&&reply.message)||'تعذر حفظ الصنف بمكوناته'); p.fixedCost=num(reply.calculatedCost); p.computedUnitCost=p.fixedCost; p.calculatedUnitCost=p.fixedCost; if(reply.componentsJson) p.componentsJson=reply.componentsJson; const res=upsertByNameDept(state.data.templates,p,templateName,matDept); saveLocal(); state.active='kitchen'; shell(); flash(reply.message||(res.updated?'الصنف موجود وتم تحديثه في الكتالوج':'تم حفظ الصنف بمكوناته في الكتالوج')); }catch(e){ flash('لم يتم حفظ الصنف بمكوناته: '+(e.message||e),true); } },
    recalcCascade(){ if(!canManageAccounting()) return deny(); recalcTemplatesLocal(); saveLocal(); render(); flash('تم تحديث الأسعار المرتبطة محليًا.'); api('recalcAccountingMaterialsCascade',{}).catch(()=>{}); },
    applyDeptItem(){ const r=selectedDeptTemplate(); if(!r) return; state.laserQuote=null; set('dlItem',templateName(r)); set('dlItemDept',matDept(r)); set('dlSystemSale',matSale(r).toFixed(2)); set('dlSale',matSale(r).toFixed(2)); const sh=$('dlSharedLine'); if(sh){ sh.checked=isSharedDeptName(matDept(r)); sh.disabled=isSharedDeptName(matDept(r)); } this.calcDept(); refreshDeptContextUi(); },
    calcDept(){ const q=num(val('dlQty'))||1, sys=num(val('dlSystemSale')), sale=num(val('dlSale')); set('dlDiff',((sale-sys)*q).toFixed(2)); },
    renderDeptSharedLines(){ const b=$('deptSharedBox'); if(b) b.innerHTML=deptSharedTable(); },
    renderDeptApproval(){ const b=$('deptApprovalBox'); if(b) b.innerHTML=deptApprovalTable(); const stats=$('deptInvoiceStats'); if(stats) stats.innerHTML=deptInvoiceStatsHtml(); },
    refreshDeptContext(){ refreshDeptContextUi(); },
    approveDeptInvoiceLegacy(){ const order=val('dlOrder') || qs.get('orderId') || qs.get('order') || ''; const d=userDept(); if(!order) return flash('رقم الأوردر مطلوب للاعتماد.',true); const rows=deptReviewRows(); if(!rows.length) return flash('لا توجد بنود مسجلة للاعتماد.',true); if(!confirm('اعتماد فاتورة قسم '+d+' للأوردر '+order+'؟')) return; rows.forEach(r=>{ r.approvalStatus='معتمد من القسم'; r.billingStatus='معتمد من القسم'; r.closeStatus='معتمد من القسم'; r['حالة اعتماد القسم']='معتمد من القسم'; r['حالة الفوترة']='معتمد من القسم'; r['حالة التقفيل']='معتمد من القسم'; r.approvedBy=user.name; r.approvedAt=new Date().toISOString(); }); saveLocal(); api('approveAccountingDeptInvoice',{orderId:order,department:d,customerName:val('dlCustomer')}).then(res=>{ if(res&&res.success===false) flash(res.message||'تعذر الاعتماد على السيرفر',true); else flash((res&&res.message)||'تم اعتماد فاتورة القسم.'); }).catch(e=>flash(e.message||'تعذر اعتماد الفاتورة على السيرفر',true)); shell(); },
    async approveDeptInvoice(){
      if(!canUseDepartment()) return deny();
      const order=val('dlOrder') || qs.get('orderId') || qs.get('order') || '';
      const d=userDept();
      if(!order) return flash('رقم الأوردر مطلوب للاعتماد.',true);
      const rows=deptReviewRows();
      if(!rows.length) return flash('لا توجد بنود مسجلة للاعتماد.',true);
      if(!confirm('اعتماد فاتورة قسم '+d+' للأوردر '+order+'؟')) return;
      flash('جاري اعتماد فاتورة القسم على السيرفر...');
      try{
        const res=await api('approveAccountingDeptInvoice',{orderId:order,department:d,customerName:val('dlCustomer')});
        if(!res || res.success===false) throw new Error((res&&res.message)||'تعذر اعتماد الفاتورة على السيرفر.');
        rows.forEach(r=>{ r.approvalStatus='معتمد من القسم'; r.billingStatus='معتمد من القسم'; r.closeStatus='معتمد من القسم'; r['حالة اعتماد القسم']='معتمد من القسم'; r['حالة الفوترة']='معتمد من القسم'; r['حالة التقفيل']='معتمد من القسم'; r.approvedBy=user.name; r.approvedAt=new Date().toISOString(); });
        saveLocal(); shell(); flash(res.message||'تم اعتماد فاتورة القسم.');
      }catch(e){ flash(e.message||'تعذر اعتماد الفاتورة على السيرفر.',true); }
    },
    toggleLaserCalc(){ const b=$('laserCalcBox'); if(b) b.classList.toggle('hidden'); },
    async saveDeptLineAndOpenSales(){ const order=encodeURIComponent(val('dlOrder')); const customer=encodeURIComponent(val('dlCustomer')); const saved=await this.saveDeptLine(); if(saved) location.href='?screen=sales&orderId='+order+'&customer='+customer+'&v=es44-v1919-immediate-department-purchase-stock'; },
    async saveDeptLine(){ this.calcDept(); const tpl=selectedDeptTemplate(); const itemDept=tpl?matDept(tpl):val('dlItemDept'); const shared=($('dlSharedLine')&&$('dlSharedLine').checked)||isSharedDeptName(itemDept); const unitSale=num(val('dlSale')); const qty=num(val('dlQty'))||1; const quote=state.laserQuote||{}; const p={lineId:'DLINE-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),orderId:val('dlOrder'),customerName:val('dlCustomer'),department:userDept(),itemDepartment:itemDept||userDept(),sharedLine:shared?'نعم':'لا',billingStatus:'مسجل - قيد مراجعة القسم',closeStatus:'قيد مراجعة القسم',approvalStatus:'قيد مراجعة القسم',catalogItemId:tpl?(tpl.id||tpl.ID||tpl.catalogItemId||''):'',templateId:tpl?(tpl.id||tpl.ID||''):'',materialName:quote.materialName||(tpl?(tpl.materialName||tpl['الخامة']||''):''),itemName:val('dlItem'),qty:qty,systemSale:num(val('dlSystemSale')),systemSalePrice:num(val('dlSystemSale')),sale:unitSale,salePrice:unitSale,unitSalePrice:unitSale,lineTotal:unitSale*qty,diff:num(val('dlDiff')),laserDetailsJson:Object.keys(quote).length?JSON.stringify(quote):'',consumedAreaTotal:num(quote.consumedAreaTotal),wastePercent:num(quote.wastePercent),notes:val('dlNotes'),user:user.name,date:new Date().toISOString()}; if(!p.customerName||!p.orderId||!p.itemName){ flash('اسم العميل ورقم الأوردر والصنف مطلوبين.',true); return false; } if(shared){ const dup=(state.data.deptLines||[]).find(x=>isSharedLineRecord(x)&&sameDeptInvoiceContext(x,p.orderId,p.customerName)&&nkey(rowItem(x))===nkey(p.itemName)&&isUnbilledDeptLine(x)); if(dup){ flash('البند المشترك مسجل بالفعل بواسطة '+rowDept(dup)+' وسيظهر تلقائيًا عند القسم الآخر. لا تسجله مرتين.',true); return false; } } try{ const reply=await api('saveAccountingDeptLine',p); if(!reply||reply.success===false) throw new Error((reply&&reply.message)||'تعذر حفظ مسودة القسم'); if(reply.lineId){p.id=reply.lineId;p.ID=reply.lineId;} state.data.deptLines.unshift(p); if(p.diff) state.data.wasteLines.unshift({department:p.department,orderId:p.orderId,reason:'فرق سعر عن السيستم',amount:p.diff,paid:0}); saveLocal(); state.laserQuote=null; set('dlItemSel',''); set('dlItem',''); set('dlItemDept',''); set('dlSystemSale',''); set('dlSale',''); set('dlDiff',''); set('dlNotes',''); set('dlQty','1'); refreshDeptContextUi(); flash(shared?'تم حفظ بند مشترك في مسودة القسم وسيظهر عند القسم الآخر':'تم حفظ البند في مسودة فاتورة القسم. يمكنك إضافة بند جديد ثم الاعتماد.'); return true; }catch(e){ flash('لم يتم حفظ مسودة القسم: '+(e.message||e),true); return false; } },
    async aiLaser(){
      const material=val('aiMat'), w=num(val('aiW')), h=num(val('aiH')), q=num(val('aiQty'))||1, waste=num(val('aiWaste')), customerUnitSale=num(val('aiUnitSale'));
      if(!material||!w||!h) return flash('اختار خامة الليزر واكتب المقاس',true);
      if(customerUnitSale<=0) return flash('اكتب سعر بيع القطعة للعميل.',true);
      try{
        const quote=await api('calculateAccountingLaserQuoteV1913',{materialName:material,pieceWidth:w,pieceHeight:h,qty:q,wastePercent:waste,customerUnitSale:customerUnitSale});
        if(!quote||quote.success===false) throw new Error((quote&&quote.message)||'تعذر حساب الليزر');
        state.laserQuote=quote;
        set('dlItem','ليزر '+material+' '+w+'×'+h); set('dlItemDept','ليزر');
        const sh=$('dlSharedLine'); if(sh){ sh.checked=false; sh.disabled=false; }
        set('dlQty',q); set('dlSystemSale',num(quote.suggestedUnitSale).toFixed(2)); set('dlSale',num(quote.suggestedUnitSale).toFixed(2)); this.calcDept();
        const a=$('aiMsg'); if(a) a.textContent='ناتج تقريبي '+quote.estimatedPiecesPerSheet+' / سعر الوحدة المقترح '+money(quote.suggestedUnitSale);
      }catch(e){ state.laserQuote=null; flash('تعذر حساب الليزر: '+(e.message||e),true); }
    },
    async saveWaste(){ const p={department:userDept(),orderId:val('waOrder'),reason:val('waReason'),amount:num(val('waAmount')),paid:num(val('waPaid')),notes:'',date:new Date().toISOString()}; if(!p.orderId||!p.reason||p.amount<=0||p.paid<0) return flash('رقم الأوردر ونوع الهالك وقيمة تالف أكبر من صفر مطلوبة.',true); try{ const reply=await api('saveAccountingWaste',p); if(!reply||reply.success===false) throw new Error((reply&&reply.message)||'تعذر حفظ الهالك'); p.id=reply.id||''; p.user=user.name; state.data.wasteLines.unshift(p); saveLocal(); shell(); flash('تم حفظ الهالك على السيرفر'); }catch(e){ flash('لم يتم حفظ الهالك: '+(e.message||e),true); } },
    collectDeptLines(){
      const order=val('fiOrder');
      const rows=(state.data.deptLines||[]).filter(isUnbilledDeptLine).filter(isDeptApprovedForFinal).filter(r=>String(rowOrderId(r)||'')===String(order||''));
      const st=profitStatsForLines(rows);
      const heads=['القسم','مشترك','البند','كمية','سعر الوحدة','الإجمالي'];
      if(isAdmin()) heads.push('تكلفة/ربح');
      const b=$('finalBox');
      if(b) b.innerHTML = rows.length
        ? table(rows,heads,r=>{
            const base=[esc(rowDept(r)),isSharedLineRecord(r)?'<span class="pill warn">مشترك</span>':'-',esc(rowItem(r)),esc(rowQty(r)),money(rowSale(r)),money(rowLineTotal(r))];
            if(isAdmin()) base.push('<span class="profitOnly">تكلفة: '+money(lineCostTotal(r))+' / ربح: '+money(rowLineTotal(r)-lineCostTotal(r))+'</span>');
            return base;
          })+'<div class="softBox"><b>الإجمالي: '+money(st.total)+'</b>'+ (isAdmin()?' <span class="profitOnly">/ التكلفة: '+money(st.cost)+' / الربح: '+money(st.profit)+' / '+st.margin.toFixed(1)+'%</span>':'') +'</div>'
        : '<div class="empty">لا توجد بنود معتمدة وغير مسحوبة لهذا الأوردر.</div>';
    },
    pickPendingFinal(order, customer){ set('fiOrder',order||''); set('fiCustomer',customer||''); this.refreshFinalDebt(); this.collectDeptLines(); },
    async approvePendingFinal(order, customer){
      if(!isAdmin()) return flash('اعتماد فاتورة القسم من شاشة التقفيل متاح لضياء فقط.',true);
      const rows=(state.data.deptLines||[]).filter(isUnbilledDeptLine).filter(r=>String(rowOrderId(r)||'')===String(order||'') && (!customer || customerMatchesRow(r,{name:customer,customerName:customer})));
      const deps=Array.from(new Set(rows.filter(r=>!isDeptApprovedForFinal(r)).map(rowDept).filter(Boolean)));
      if(!rows.length) return flash('لا توجد بنود لهذا الأوردر.',true);
      if(!deps.length){ this.pickPendingFinal(order,customer); return; }
      if(!confirm('اعتماد فاتورة الأقسام للأوردر '+order+' ثم فتحها للتقفيل؟')) return;
      flash('جاري اعتماد فاتورة القسم على السيرفر...');
      try{
        for(const d of deps){
          const res=await api('approveAccountingDeptInvoice',{orderId:order,department:d,customerName:customer||''});
          if(!res || res.success===false) throw new Error((res&&res.message)||('تعذر اعتماد قسم '+d));
          rows.filter(r=>rowDept(r)===d).forEach(r=>{ r.approvalStatus='معتمد من القسم'; r.billingStatus='معتمد من القسم'; r.closeStatus='معتمد من القسم'; r['حالة اعتماد القسم']='معتمد من القسم'; r['حالة الفوترة']='معتمد من القسم'; r['حالة التقفيل']='معتمد من القسم'; });
        }
        saveLocal(); shell();
        setTimeout(()=>{ try{ ES27.pickPendingFinal(order,customer); }catch(e){} },120);
        flash('تم اعتماد البنود وفتحها للتقفيل.');
      }catch(e){ flash(e.message||'تعذر اعتماد فاتورة القسم.',true); }
    },
    async reconcileLegacyDebts(){
      if(!isAdmin()) return flash('مزامنة المديونيات القديمة متاحة لضياء فقط.',true);
      if(!confirm('مزامنة الفواتير القديمة الناقصة مع كشف حساب العملاء؟ لن يتم تكرار أي فاتورة مسجلة بالفعل.')) return;
      flash('جاري فحص الفواتير القديمة وترحيل القيود الناقصة...');
      try{
        const res=await api('reconcileLegacyCustomerDebtsV1914',{confirm:'RECONCILE_LEGACY_DEBTS',limit:1000});
        if(!res || res.success===false) throw new Error((res&&res.message)||'تعذر مزامنة المديونيات القديمة.');
        await load(true);
        flash(res.message||'تمت مزامنة المديونيات القديمة.');
      }catch(e){ flash(e.message||'تعذر مزامنة المديونيات القديمة.',true); }
    },
    reviewClosedInvoice(i){
      const inv=(state.data.finalInvoices||[])[i]; if(!inv) return;
      const no=finalInvoiceNo(inv);
      const rows=(state.data.deptLines||[]).filter(r=>rowFinalInvoice(r)===no);
      const total=num(inv.total||inv.finalTotal||inv['الإجمالي النهائي']||0) || rows.reduce((s,r)=>s+rowLineTotal(r),0);
      const st=profitStatsForLines(rows);
      const heads=['القسم','البند','كمية','سعر الوحدة','الإجمالي'];
      if(isAdmin()) heads.push('تكلفة/ربح');
      const b=$('finalBox');
      if(b) b.innerHTML='<div class="softBox"><b>فاتورة:</b> '+esc(no)+' / <b>عميل:</b> '+esc(finalInvoiceCustomer(inv))+' / <b>إجمالي:</b> '+money(total)+(isAdmin()?' <span class="profitOnly">/ تكلفة: '+money(st.cost)+' / ربح: '+money(total-st.cost)+'</span>':'')+'</div>'+(rows.length?table(rows,heads,r=>{ const base=[esc(rowDept(r)),esc(rowItem(r)),esc(rowQty(r)),money(rowSale(r)),money(rowLineTotal(r))]; if(isAdmin()) base.push('<span class="profitOnly">تكلفة: '+money(lineCostTotal(r))+' / ربح: '+money(rowLineTotal(r)-lineCostTotal(r))+'</span>'); return base; }):'<div class="empty">الفاتورة محفوظة لكن البنود المرتبطة غير موجودة في التحميل الحالي.</div>');
    },
    async reopenFinalInvoice(i){
      if(!isAdmin()) return flash('إرجاع الفاتورة للمراجعة متاح لضياء فقط.',true);
      const inv=(state.data.finalInvoices||[])[i]; if(!inv) return;
      const no=finalInvoiceNo(inv);
      if(!no) return flash('رقم الفاتورة غير واضح.',true);
      if(!confirm('إرجاع الفاتورة '+no+' للمراجعة؟ سيتم فتح بنود الأقسام للتقفيل من جديد وعمل عكس مالي للفاتورة القديمة.')) return;
      flash('جاري إرجاع الفاتورة للمراجعة على السيرفر...');
      try{
        const res=await api('reopenAccountingFinalInvoice',{invoiceNo:no,orderId:finalInvoiceOrder(inv),reason:'مراجعة ضياء'});
        if(!res || res.success===false) throw new Error((res&&res.message)||'تعذر إرجاع الفاتورة للمراجعة.');
        inv.status='تحت مراجعة ضياء'; inv['الحالة']='تحت مراجعة ضياء';
        (state.data.deptLines||[]).forEach(r=>{ if(rowFinalInvoice(r)===no){ r.closeStatus='معتمد من القسم'; r.billingStatus='معتمد من القسم'; r.invoiceNo=''; r['حالة التقفيل']='معتمد من القسم'; r['حالة الفوترة']='معتمد من القسم'; r['رقم الفاتورة النهائية']=''; } });
        saveLocal(); shell(); flash(res.message||'تم إرجاع الفاتورة للمراجعة.');
      }catch(e){ flash(e.message||'تعذر إرجاع الفاتورة للمراجعة.',true); }
    },
    async saveFinal(){
      if(!canFinalize()) return deny();
      const order=val('fiOrder');
      if(!order) return flash('رقم الأوردر مطلوب لتقفيل الفاتورة.',true);
      const rows=(state.data.deptLines||[]).filter(isUnbilledDeptLine).filter(isDeptApprovedForFinal).filter(r=>String(rowOrderId(r)||'')===String(order||''));
      const lineIds=rows.map(rowLineId).filter(Boolean);
      const p={orderId:order,customer:val('fiCustomer'),customerName:val('fiCustomer'),paymentType:val('fiPayment')||'نقدي',paid:num(val('fiPaid')),lineIds:JSON.stringify(lineIds),date:new Date().toISOString()};
      if(!state.finalRequestId) state.finalRequestId='FINAL-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
      p.requestId=state.finalRequestId;
      flash('جاري التحقق من البنود المعتمدة وتقفيل الفاتورة...');
      try{
        const res=await api('saveAccountingFinalInvoice',p);
        if(!res || res.success===false) throw new Error((res&&res.message)||'تعذر تقفيل الفاتورة على السيرفر.');
        const saved=Object.assign({},p,{no:res.invoiceNo,invoiceNo:res.invoiceNo,subtotal:res.subtotal,finalTotal:res.finalTotal,total:res.finalTotal,remaining:res.remaining,remain:res.remaining,trustedByServer:!!res.trustedByServer});
        state.data.finalInvoices.unshift(saved);
        rows.forEach(r=>{ r.closeStatus='تم التقفيل'; r.billingStatus='تم السحب للفاتورة النهائية'; r.invoiceNo=res.invoiceNo; r['حالة التقفيل']='تم التقفيل'; r['حالة الفوترة']='تم السحب للفاتورة النهائية'; r['رقم الفاتورة النهائية']=res.invoiceNo; });
        state.finalRequestId=''; saveLocal(); shell(); flash(res.message||('تم تقفيل الفاتورة رقم '+res.invoiceNo));
      }catch(e){ flash(e.message||'تعذر تقفيل الفاتورة على السيرفر.',true); }
    },
    refreshFinalDebt(){ const b=$('finalCustomerDebt'); if(b) b.innerHTML=deptCustomerDebtHtml(val('fiCustomer')); },
    health(){ const h=$('healthBox'); if(h) h.innerHTML='جاري الفحص...'; api('getAccounting').then(r=>{ if(h) h.innerHTML = r && r.success!==false ? '✅ الاتصال سليم والبيانات قابلة للتحميل. الإصدار: '+VERSION : '⚠️ الرد غير ناجح: '+esc(r.message); }).catch(e=>{ if(h) h.innerHTML='❌ فشل الاتصال: '+esc(e.message); }); }
  };

  function protectAction(name, allowed){
    const original=window.ES27[name];
    if(typeof original!=='function') return;
    window.ES27[name]=function(){ if(!allowed()) return deny(); return original.apply(this,arguments); };
  }
  ['saveDeptLine','saveDeptLineAndOpenSales','saveWaste'].forEach(name=>protectAction(name,canUseDepartment));



  document.addEventListener('click', function(ev){
    const target = ev.target;
    const insideCustomer = target && target.closest && target.closest('.customerField');
    const insideMenu = target && target.closest && target.closest('.menuWrap');
    if(!insideCustomer){
      const drop = $('saCustomerDrop');
      if(drop){ drop.classList.add('hidden'); drop.innerHTML=''; drop.__rows=[]; }
      const finalDrop = $('fiCustomerDrop');
      if(finalDrop){ finalDrop.classList.add('hidden'); finalDrop.innerHTML=''; finalDrop.__rows=[]; }
    }
    if(!insideMenu){
      const menu = $('clientInvoiceMenu');
      if(menu) menu.classList.add('hidden');
    }
  }, true);

  window.addEventListener('pagehide', closeFloatingPanels);
  window.addEventListener('blur', function(){ setTimeout(closeFloatingPanels, 80); });
  window.addEventListener('pageshow', function(){ setTimeout(closeFloatingPanels, 60); });
  window.addEventListener('keydown', function(ev){
    if(ev && ev.key==='Escape' && state.active==='customers' && state.customerAccountSelected) window.ES27.closeCustomerAccount();
  });

  window.ES = window.ES27;
  window.addEventListener('error', e => { console.error(e.error || e.message); msg('تم منع خطأ في EasyStore: ' + (e.message || ''), true); });
  mergeData();
  shell();
  setTimeout(()=>load(true), 350); // تحميل أولي مرة واحدة فقط - بدون polling
})();


/* V1886 - Dept invoice product catalog only */
window.EASYSTORE_V1886_PRODUCT_CATALOG_ONLY = true;


/* V1887 - Dept approval flow */
window.EASYSTORE_V1887_DEPT_APPROVAL_FLOW = true;
