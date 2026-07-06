(function(){
  'use strict';

  const VERSION = 'ES32 V1880 Clean Core';
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

  function readSso(){
    let handoff = {};
    try{ handoff = JSON.parse(localStorage.getItem('MATBAGY_EMPLOYEE_SSO') || '{}'); }catch(e){}
    const hp = handoff.params || {};
    const hu = handoff.user || {};
    return {
      name: qs.get('name') || qs.get('username') || hp.name || hp.username || hu.name || hu.username || 'ضياء',
      username: qs.get('username') || qs.get('name') || hp.username || hp.name || hu.username || hu.name || 'ضياء',
      token: qs.get('token') || hp.token || hu.token || '',
      mode: qs.get('mode') || qs.get('roleMode') || hp.mode || hp.roleMode || hu.mode || '',
      department: qs.get('department') || hp.department || hu.department || ''
    };
  }

  const user = readSso();
  const roleKey = () => nkey([user.name,user.username,user.mode,user.department].join(' '));
  const isAdmin = () => /ضياء|diaa|admin|full|kitchen|اداره|إدارة/.test(roleKey());
  const isLaser = () => /جابر|gaber|jaber|laser|ليزر/.test(roleKey()) || qs.get('laserAi') === '1' || qs.get('mode') === 'laser' || qs.get('department') === 'ليزر';
  const isPrint = () => !isLaser() && (/وائل|wael|print|طباع/.test(roleKey()) || qs.get('mode') === 'print' || qs.get('department') === 'طباعة');
  const isFinal = () => /رحمه|رحمة|ريفان|ريڤان|rahma|revan|rivan|final/.test(roleKey());
  const roleText = () => isAdmin() ? 'ضياء / مطبخ الحسابات' : isLaser() ? 'جابر / الليزر' : isPrint() ? 'وائل / الطباعة' : isFinal() ? 'رحمة أو ريفان / تقفيل فواتير' : 'موظف';
  const userDept = () => isLaser() ? 'ليزر' : isPrint() ? 'طباعة' : (user.department || '');


  function initialScreen(){
    const s = String(qs.get('screen') || qs.get('tab') || qs.get('view') || '').toLowerCase();
    if(/final/.test(s)) return 'final';
    if(/dept/.test(s)) return 'dept';
    if(/sales|sale|invoice|فاتورة/.test(s)) return 'sales';
    if(/kitchen|raw|materials/.test(s)) return 'kitchen';
    if(qs.get('laserAi') === '1' || qs.get('mode') === 'laser') return 'dept';
    return 'dashboard';
  }

  const STORE_KEY = 'EASYSTORE_CLEAN_V1880_DATA';
  const state = {
    active: initialScreen(),
    loading: false,
    data: {
      materials: [], templates: [], suppliers: [], purchases: [], sales: [], customers: [],
      stockMoves: [], wasteLines: [], deptLines: [], finalInvoices: [], summary: {}
    },
    recipeComps: [], salePulledLines: [], saleSelectedCustomer: null, saleCustomerContext: null, customerSearchTimer: null, customerSearchSeq: 0, customerDropdownLocked: false
  };

  function saveLocal(){ localStorage.setItem(STORE_KEY, JSON.stringify(state.data)); }
  function loadLocal(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }catch(e){ return {}; } }
  function mergeData(d){
    const local = loadLocal();
    state.data = Object.assign({materials:[],templates:[],suppliers:[],purchases:[],sales:[],customers:[],stockMoves:[],wasteLines:[],deptLines:[],finalInvoices:[],summary:{}}, local, d || {});
    ['materials','templates','suppliers','purchases','sales','customers','stockMoves','wasteLines','deptLines','finalInvoices'].forEach(k=>{ if(!Array.isArray(state.data[k])) state.data[k] = []; });
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
    if(isAdmin() || isFinal()) return list;
    const d = userDept();
    return list.filter(r => activeRow(r) && ['عام','مشترك',d].includes(String(matDept(r) || '')));
  }
  function materialOptions(filter){
    return materialRows().filter(activeRow).filter(filter || (()=>true)).map((r,i)=>`<option value="${esc(materialName(r))}">${esc(materialName(r))} - ${esc(matDept(r))}</option>`).join('');
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



  function closeFloatingPanels(){
    const drop = $('saCustomerDrop');
    if(drop){
      drop.classList.add('hidden');
      drop.innerHTML = '';
      drop.__rows = [];
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
    if(isAdmin()) list = [['dashboard','لوحة الحسابات'],['suppliers','الموردين'],['customers','العملاء'],['items','الأصناف'],['purchase','فواتير الشراء'],['sales','فواتير المبيعات'],['stock','المخزون'],['kitchen','مطبخ الحسابات'],['reports','التقارير'],['health','فحص النظام']];
    else if(isPrint() || isLaser()) list = [['dept','فاتورة القسم'],['waste','هوالك القسم'],['stock','الأصناف المتاحة']];
    else if(isFinal()) list = [['sales','فواتير المبيعات'],['final','تقفيل الفاتورة'],['customers','العملاء'],['deptView','أجزاء الأقسام']];
    else list = [['dashboard','لوحة الحسابات'],['sales','فواتير المبيعات']];
    if(!list.some(x=>x[0] === state.active)) state.active = list[0][0];
    return `<div class="tabs">${list.map(x=>`<button class="tab ${state.active===x[0]?'active':''}" onclick="ES27.go('${x[0]}')">${x[1]}</button>`).join('')}</div>`;
  }

  function shell(){
    app.innerHTML = `<div class="wrap">
      <div class="top">
        <div><h1>💰 إيزي ستور مطبعجي - برنامج الحسابات ES32</h1><p>أصناف، موردين، فواتير شراء ومبيعات، مخزون، تقارير، ومطبخ الحسابات.</p><div class="versionLine">${VERSION} / app.js محمل: ${new Date().toLocaleTimeString('ar-EG')}</div></div>
        <div class="actions"><span class="badge">${esc(user.name)} - ${esc(roleText())}</span><button class="btn secondary" onclick="ES27.load(true)">تحديث البيانات</button><button class="btn secondary" onclick="ES27.hardReload()">تحديث البرنامج</button><button class="btn secondary" onclick="history.back()">إغلاق</button></div>
      </div>
      <div id="mainMsg" class="msg"></div>
      ${tabs()}
      <div id="screen"></div>
    </div>`;
    render();
  }

  function render(){
    const sc = $('screen'); if(!sc) return;
    const m = {dashboard:screenDashboard,suppliers:screenSuppliers,customers:screenCustomers,items:screenItems,purchase:screenPurchase,sales:screenSales,stock:screenStock,kitchen:screenKitchen,reports:screenReports,health:screenHealth,dept:screenDept,waste:screenWaste,final:screenFinal,deptView:screenDeptView};
    sc.innerHTML = (m[state.active] || screenDashboard)();
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', nkey(b.textContent).includes(nkey(tabLabel(state.active)))));
  }
  function tabLabel(t){ return ({dashboard:'لوحة',suppliers:'الموردين',customers:'العملاء',items:'الأصناف',purchase:'الشراء',sales:'المبيعات',stock:'المخزون',kitchen:'مطبخ',reports:'التقارير',health:'فحص',dept:'فاتورة',waste:'هوالك',final:'تقفيل',deptView:'أجزاء'})[t] || ''; }

  function screenDashboard(){
    const sales = (state.data.sales||[]).reduce((s,r)=>s+num(r.total||r.amount),0);
    const purchases = (state.data.purchases||[]).reduce((s,r)=>s+num(r.total||r.amount),0);
    const lows = materials().filter(m=>activeRow(m)&&matMin(m)>0&&matStock(m)<=matMin(m));
    return `<div class="card"><div class="toolbar"><h2>لوحة الحسابات</h2><input class="searchInput" placeholder="بحث سريع" oninput="ES27.quickSearch(this.value)"></div><div class="grid four"><div class="kpi"><b>${money(sales)}</b><span>مبيعات مسجلة</span></div><div class="kpi"><b>${money(purchases)}</b><span>مشتريات مسجلة</span></div><div class="kpi"><b>${money(sales-purchases)}</b><span>صافي تقديري</span></div><div class="kpi"><b>${lows.length}</b><span>خامات تحت الحد</span></div></div><div class="quickbar"><button class="btn" onclick="ES27.go('items')">الأصناف</button><button class="btn" onclick="ES27.go('purchase')">فاتورة شراء</button><button class="btn" onclick="ES27.go('sales')">فاتورة مبيعات</button><button class="btn" onclick="ES27.go('kitchen')">مطبخ الحسابات</button><button class="btn secondary" onclick="ES27.load(true)">تحديث الآن</button></div></div>${lows.length?'<div class="card"><h3>تنبيهات النواقص</h3>'+table(lows,['الخامة','الرصيد','حد النقص','القسم'],r=>[esc(materialName(r)),esc(matStock(r)),esc(matMin(r)),esc(matDept(r))])+'</div>':''}`;
  }

  function screenSuppliers(){
    return `<div class="card"><h2>الموردين</h2><div class="grid four"><div class="field"><label>اسم المورد</label><input id="supName"></div><div class="field"><label>هاتف</label><input id="supPhone"></div><div class="field"><label>رصيد افتتاحي</label><input id="supOpening" type="number"></div><div class="field"><label>عنوان / ملاحظات</label><input id="supAddress"></div></div><button class="btn" onclick="ES27.saveSupplier()">حفظ / تحديث المورد</button></div>${table(state.data.suppliers,['المورد','الهاتف','رصيد افتتاحي','إجراء'],(s,i)=>[esc(s.name||s.supplier),esc(s.phone||''),money(s.opening||s.openingBalance),`<button class="btn small secondary" onclick="ES27.editSupplier(${i})">تعديل</button>`])}`;
  }

  function screenCustomers(){
    return `<div class="card"><h2>العملاء</h2><div class="hint">العملاء يتم سحبهم من TrendOS قدر الإمكان. ابحث بالاسم أو الرقم.</div><input id="custSearch" class="searchInput" placeholder="بحث عن عميل" oninput="ES27.filterCustomers()"><div id="custTable">${customersTable(state.data.customers)}</div></div>`;
  }
  function customersTable(rows){ return table(rows||[],['العميل','الهاتف','النوع/المسؤول','المديونية'],c=>[esc(c.name||c.customerName||''),esc(c.phone||c.mobile||''),esc(c.type||c.manager||''),`<span class="customerDebtBadge ${customerDebtClass(c)}">${esc(customerDebtText(c))}</span>`]); }

  function screenItems(){
    return `<div class="card"><h2>الأصناف</h2><div class="grid six"><div class="field"><label>القسم</label><select id="itDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option><option>عام</option></select></div><div class="field"><label>اسم الصنف</label><input id="itName"></div><div class="field"><label>نوع</label><select id="itType"><option>صنف بيع</option><option>خامة</option><option>صنف مركب</option></select></div><div class="field"><label>مقاس</label><input id="itSize"></div><div class="field"><label>سعر البيع</label><input id="itSale" type="number"></div><div class="field"><label>تكلفة ثابتة</label><input id="itCost" type="number"></div></div><div class="actions"><button class="btn" onclick="ES27.saveItem()">حفظ / تحديث الصنف</button><button class="btn secondary" onclick="ES27.clearItemForm()">جديد</button></div></div>${itemsTable()}`;
  }
  function itemsTable(){ return table(productTemplates(),['الصنف','القسم','التكلفة','البيع','مجمل الربح','نسبة الربح','الحالة','إجراء'],(r,i)=>{ const cost=matCost(r), sale=matSale(r), g=gp(cost,sale); return [esc(templateName(r)),esc(matDept(r)),isAdmin()?money(cost):'<span class="costHidden">مخفي</span>',money(sale),isAdmin()?money(g.profit):'<span class="costHidden">مخفي</span>',isAdmin()?g.margin.toFixed(1)+'%':'-',activeRow(r)?'مفعل':'موقوف',`<span class="tableActions"><button class="btn small secondary" onclick="ES27.editItem(${i})">تعديل</button><button class="btn small warn" onclick="ES27.archiveItem(${i})">إيقاف</button></span>`]; }); }

  function screenPurchase(){
    return `<div class="card"><h2>فاتورة شراء</h2><div class="grid four"><div class="field"><label>رقم الفاتورة</label><input id="puNo" value="PUR-${Date.now().toString().slice(-6)}"></div><div class="field"><label>المورد</label><input id="puSupplier" list="supList"><datalist id="supList">${supplierOptions()}</datalist></div><div class="field"><label>نوع الدفع</label><select id="puPay"><option>نقدي</option><option>آجل</option><option>جزئي</option></select></div><div class="field"><label>تاريخ استحقاق</label><input id="puDue" type="date"></div></div><div class="grid six"><div class="field"><label>الخامة/الصنف</label><select id="puMat"><option></option>${materialOptions()}</select></div><div class="field"><label>الكمية</label><input id="puQty" type="number" value="1" oninput="ES27.calcPurchase()"></div><div class="field"><label>سعر الشراء</label><input id="puUnit" type="number" oninput="ES27.calcPurchase()"></div><div class="field"><label>الإجمالي</label><input id="puTotal" readonly></div><div class="field"><label>مدفوع</label><input id="puPaid" type="number" value="0" oninput="ES27.calcPurchase()"></div><div class="field"><label>متبقي</label><input id="puRemain" readonly></div></div><div class="field"><label>ملاحظات</label><input id="puNotes"></div><button class="btn" onclick="ES27.savePurchase()">حفظ فاتورة الشراء وزيادة المخزون</button></div>${table(state.data.purchases,['رقم','مورد','خامة','كمية','إجمالي','مدفوع','متبقي'],p=>[esc(p.no||p.invoiceNo),esc(p.supplier),esc(p.material||p.materialName),esc(p.qty),money(p.total),money(p.paid),money(p.remain)])}`;
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
  function updateSaleTotalsFromPulled(){
    const pulled = salePulledTotal();
    const manual = num(val('saQty'))*num(val('saUnit'));
    const total = Math.max(0, pulled + manual - num(val('saDiscount')));
    set('saTotal', total.toFixed(2));
    set('saRemain', Math.max(0,total-num(val('saPaid'))).toFixed(2));
    const b=$('salePulledSummary'); if(b) b.innerHTML = '<b>إجمالي بنود وائل/جابر:</b> '+money(pulled)+' / <b>إجمالي الفاتورة:</b> '+money(total);
  }
  function salePulledTable(){
    const rows = state.salePulledLines || [];
    if(!rows.length) return '<div class="empty">لم يتم سحب بنود من الأقسام بعد.</div>';
    return table(rows,['القسم','رقم الأوردر','البند','كمية','سعر','حذف'],(r,i)=>[esc(rowDept(r)),esc(rowOrderId(r)),esc(rowItem(r)),esc(rowQty(r)),money(rowSale(r)),`<button class="btn small danger" onclick="ES27.removePulledLine(${i})">حذف</button>`]);
  }
  function saleCandidateTable(rows){
    rows = rows || saleCandidateLines();
    if(!rows.length) return '<div class="empty">لا توجد بنود غير مفوترة مطابقة للعميل/الأوردر.</div>';
    const picked=salePulledIds();
    return table(rows,['ضم','القسم','الأوردر','العميل','البند','كمية','سعر'],(r,i)=>{
      const key=nkey(rowLineId(r)||JSON.stringify(r));
      return [`<input type="checkbox" class="saleLinePick" data-key="${esc(key)}" ${picked[key]?'checked':''}>`,esc(rowDept(r)),esc(rowOrderId(r)),esc(rowCustomer(r)),esc(rowItem(r)),esc(rowQty(r)),money(rowSale(r))];
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
  function orderIdsForCustomer(c){
    const map={};
    (state.data.deptLines||[]).forEach(r=>{ if(customerMatchesRow(r,c) && rowOrderId(r)) map[rowOrderId(r)] = true; });
    (state.data.sales||[]).forEach(r=>{ if(saleMatchesCustomer(r,c) && saleOrderId(r)) map[saleOrderId(r)] = true; });
    (state.data.finalInvoices||[]).forEach(r=>{ if(saleMatchesCustomer(r,c) && saleOrderId(r)) map[saleOrderId(r)] = true; });
    return Object.keys(map).filter(Boolean);
  }
  function saleDraftNo(order,c){
    const base = String(order || customerMainPhone(c) || customerMainName(c) || Date.now()).replace(/[^0-9A-Za-z\u0600-\u06FF_-]+/g,'').slice(-12) || Date.now().toString().slice(-6);
    return 'DRAFT-' + base;
  }
  function officialSaleNo(){ return 'ES-' + Date.now().toString().slice(-7); }
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
  function operatingExpenseRows(){ return materials().filter(r=>/تشغيل|مصروف|operation/i.test(String(r.materialClass||r.operationExpense||r['تصنيف الخامة']||r['ضم إلى مصروفات التشغيل']||matType(r)||''))); }
  function screenSales(){
    const qOrder = esc(qs.get('orderId') || qs.get('order') || '');
    const qCustomer = esc(qs.get('customer') || qs.get('customerName') || '');
    return `<div class="card"><h2>فاتورة مبيعات موحدة</h2>
      <div class="hint">اكتب جزء من اسم العميل أو اضغط على الخانة لتحميل عملاء المنصة. تقدر تسحب بنود وائل وجابر غير المفوترة وتطلع فاتورة واحدة للعميل.</div>
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
      <div class="actions"><button class="btn secondary" onclick="ES27.pullDeptCandidates()">سحب بنود وائل وجابر</button><button class="btn" onclick="ES27.addPickedDeptLines()">ضم البنود المحددة</button><button class="btn" onclick="ES27.saveSale()">حفظ الفاتورة الموحدة</button><span class="menuWrap"><button class="btn secondary" onclick="ES27.toggleClientInvoiceMenu(event)">فاتورة العميل ▾</button><span id="clientInvoiceMenu" class="clientInvoiceMenu hidden"><button onclick="ES27.showPricePreview()">عرض التسعير</button><button onclick="ES27.printSale()">PDF / طباعة</button><button onclick="ES27.downloadSaleImage()">صورة</button><button onclick="ES27.copySaleText()">نسخ نص الفاتورة</button><button onclick="ES27.openSaleWhatsApp()">إرسال واتساب</button></span></span></div>
      <div id="salePulledSummary" class="softBox"></div>
    </div>
    <div class="split"><div class="card"><h3>بنود غير مفوترة من الأقسام</h3><div id="saleCandidatesBox">${saleCandidateTable()}</div></div><div class="card"><h3>البنود المضمومة للفاتورة</h3><div id="salePulledBox">${salePulledTable()}</div></div></div>
    ${table(state.data.sales,['رقم','عميل','صنف/تجميع','كمية','إجمالي','مدفوع','متبقي'],s=>[esc(s.no||s.invoiceNo),esc(s.customer),esc(s.item||s.itemName||s.description),esc(s.qty),money(s.total),money(s.paid),money(s.remain)])}`;
  }

  function screenStock(){ return `<div class="card"><h2>المخزون</h2>${table(materialRows(),['الخامة/الصنف','القسم','النوع','الرصيد','حد النقص','تكلفة','بيع','حالة'],r=>[esc(materialName(r)),esc(matDept(r)),esc(materialKindLabel(matType(r))),esc(matStock(r)),esc(matMin(r)),isAdmin()?money(matCost(r)):'<span class="costHidden">مخفي</span>',money(matSale(r)),activeRow(r)?'مفعل':'موقوف'])}</div><div class="card"><h3>حركة المخزون</h3>${table(state.data.stockMoves,['التاريخ','الخامة','داخل','خارج','الرصيد','المصدر'],r=>[esc(r.date||r['وقت التسجيل']||''),esc(r.materialName||r['الخامة']||''),esc(r.inQty||r['داخل']||''),esc(r.outQty||r['خارج']||''),esc(r.balance||r['الرصيد']||''),esc(r.source||r['المصدر']||'')])}</div>`; }

  function screenKitchen(){
    if(!isAdmin()) return '<div class="card"><h2>مطبخ الحسابات</h2><div class="warn">هذا القسم يظهر لضياء فقط.</div></div>';
    return `<div class="card"><h2>مطبخ الحسابات</h2><div class="hint">الخامات الأساسية منفصلة عن الأصناف بمكوناتها. لا توجد رسائل إخفاء أو خلط بين القائمتين.</div><div class="grid three"><button class="btn" onclick="ES27.kitchenMode('raw')">خامة أساسية</button><button class="btn" onclick="ES27.kitchenMode('recipe')">صنف بمكونات</button><button class="btn secondary" onclick="ES27.recalcCascade()">تحديث كل الأسعار المرتبطة</button></div><div id="kitchenBox">${rawForm()}</div></div>${materialTable()}<div class="card"><div class="toolbar"><h3>الأصناف بمكوناتها</h3><span class="pill">${productTemplates().length} صنف</span></div>${itemsTable()}</div>`;
  }
  function rawForm(){ return `<div class="softBox"><h3>خامة أساسية / مصروف تشغيل</h3><input id="rawId" type="hidden"><div class="grid six"><div class="field"><label>القسم</label><select id="rawDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الخامة</label><input id="rawName"></div><div class="field"><label>تصنيف الخامة</label><select id="rawClass"><option>خامة إنتاج</option><option>مصروف تشغيل</option><option>خامة مشتركة</option><option>متوقفة</option></select></div><div class="field"><label>سعر/تكلفة الأصل</label><input id="rawCost" type="number"></div><div class="field"><label>سعر بيع رسمي</label><input id="rawSale" type="number"></div><div class="field"><label>الرصيد / افتتاحي</label><input id="rawStock" type="number"></div></div><div class="grid six"><div class="field"><label>حد النقص</label><input id="rawMin" type="number"></div><div class="field"><label>عرض الخام سم</label><input id="rawW" type="number"></div><div class="field"><label>طول الخام سم</label><input id="rawH" type="number"></div><div class="field"><label>نوع الخامة</label><select id="rawKind"><option>خامة عامة</option><option>خامة ليزر</option><option>رول ورق</option><option>رول لامينشن</option><option>باكيت ورق</option><option>حبر</option><option>مصروف ماكينة</option></select></div><div class="field"><label>ضم إلى بند</label><select id="rawOperatingBand"><option>إنتاج مباشر</option><option>مصروفات تشغيل الطباعة</option><option>مصروفات تشغيل الليزر</option><option>مصروفات تشغيل مشتركة</option></select></div><div class="field"><label>طريقة توزيع التشغيل</label><select id="rawOpMethod"><option>لا يوزع</option><option>ثابت على الفاتورة</option><option>بالمتر</option><option>بالمتر المربع</option><option>نسبة من الفاتورة</option><option>يدوي</option></select></div></div><div class="grid two"><div class="field"><label>قيمة التشغيل للوحدة / النسبة</label><input id="rawOpCost" type="number" placeholder="مثال: 5 جنيه للمتر أو 3%"></div><div class="field"><label>ملاحظات</label><input id="rawNotes"></div></div><div class="actions"><button class="btn" onclick="ES27.saveRaw()">حفظ / تحديث الخامة</button><button class="btn secondary" onclick="ES27.clearRawForm()">جديد</button></div></div>`; }
  function materialTable(){ return `<div class="card"><div class="toolbar"><h3>الخامات الأساسية المسجلة</h3><span class="pill">${materialRows().length} خامة</span></div>` + table(materialRows(),['الخامة','القسم','النوع','التكلفة','الرصيد','تعديل'],(r,i)=>[esc(materialName(r)),esc(matDept(r)),esc(materialKindLabel(matType(r))),isAdmin()?money(matCost(r)):'<span class="costHidden">مخفي</span>',esc(matStock(r)),`<button class="btn small secondary" onclick="ES27.editRaw(${i})">تعديل</button>`]) + `</div>`; }
  function recipeForm(){ return `<div class="softBox"><h3>صنف بمكونات</h3><div class="grid six"><div class="field"><label>القسم</label><select id="recDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الصنف</label><input id="recName"></div><div class="field"><label>مقاس الناتج</label><input id="recSize" placeholder="مثال 15x21" oninput="ES27.updateCompCalc()"></div><div class="field"><label>سعر بيع رسمي</label><input id="recSale" type="number" oninput="ES27.calcRecipe()"></div><div class="field"><label>تكلفة محسوبة</label><input id="recCost" readonly></div><div class="field"><label>مجمل الربح</label><input id="recProfit" readonly></div></div><div class="grid six"><div class="field"><label>المكون</label><select id="compMat" onchange="ES27.updateCompCalc()"><option></option>${materialOptions()}</select></div><div class="field"><label>كمية المكون للوحدة</label><input id="compQty" type="number" value="1" oninput="ES27.updateCompCalc(false)"></div><div class="field"><label>الناتج AI</label><input id="compAiPieces" readonly></div><div class="field"><label>الناتج اليدوي</label><input id="compManualPieces" type="number" oninput="ES27.updateCompCalc(true)"></div><div class="field"><label>هالك</label><input id="compWaste" readonly></div><div class="field"><label>تكلفة المكون</label><input id="compCost" readonly></div></div><div class="actions"><button class="btn secondary" onclick="ES27.aiComp()">احسب AI للمكون</button><button class="btn" onclick="ES27.addComp()">إضافة المكون</button><button class="btn danger" onclick="ES27.clearComps()">تفريغ</button></div><div id="compList">${compTable()}</div><div class="actions"><button class="btn" onclick="ES27.saveRecipe()">حفظ / تحديث الصنف</button><button class="btn secondary" onclick="ES27.clearRecipeForm()">جديد</button></div><div class="hint">لو اخترت مكون ولم تضغط إضافة المكون، سيتم ضمه تلقائيًا عند الحفظ.</div></div>`; }
  function compTable(){ return table(state.recipeComps,['المكون','استهلاك','تكلفة','حذف'],(c,i)=>[esc(c.materialName),esc(c.qty),money(c.cost),`<button class="btn small danger" onclick="ES27.removeComp(${i})">حذف</button>`]); }

  function screenReports(){
    if(!isAdmin()) return '<div class="card"><h2>التقارير</h2><div class="warn">التقارير والأرباح لضياء فقط.</div></div>';
    const sales = (state.data.sales||[]).reduce((s,r)=>s+num(r.total||r.amount),0);
    const purchases = (state.data.purchases||[]).reduce((s,r)=>s+num(r.total||r.amount),0);
    const waste = (state.data.wasteLines||[]).reduce((s,r)=>s+num(r.amount||r.wasteAmount||r.remain),0);
    const operating = operatingExpenseRows().reduce((s,r)=>s + num(r.operatingUnitCost || r['قيمة التشغيل'] || r.unitCost || r.cost),0);
    return `<div class="card"><h2>التقارير</h2><div class="grid four"><div class="kpi"><b>${money(sales)}</b><span>مبيعات</span></div><div class="kpi"><b>${money(purchases)}</b><span>مشتريات</span></div><div class="kpi"><b>${money(waste)}</b><span>هوالك</span></div><div class="kpi"><b>${money(sales-purchases-waste-operating)}</b><span>صافي تقديري بعد التشغيل</span></div></div></div><div class="card"><h3>مصروفات التشغيل المسجلة</h3>${table(operatingExpenseRows(),['البند','القسم','باند التشغيل','طريقة التوزيع','القيمة'],r=>[esc(materialName(r)),esc(matDept(r)),esc(r.operatingBand||r['بند التشغيل']||''),esc(r.operatingCalcMethod||r['طريقة توزيع التشغيل']||''),money(r.operatingUnitCost||r['قيمة التشغيل']||r.unitCost)])}</div>`;
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
    return `<div class="laserCalcInner"><h3>🤖 حاسبة جابر / حساب شغلانة</h3><div class="grid six"><div class="field"><label>الخامة</label><select id="aiMat"><option></option>${opts}</select></div><div class="field"><label>عرض الشغل سم</label><input id="aiW" type="number"></div><div class="field"><label>ارتفاع الشغل سم</label><input id="aiH" type="number"></div><div class="field"><label>كمية</label><input id="aiQty" type="number" value="1"></div><div class="field"><label>هالك %</label><input id="aiWaste" type="number" value="10"></div><div class="field"><label>معامل بيع</label><input id="aiFactor" type="number" value="2.2"></div></div><button class="btn secondary" onclick="ES27.aiLaser()">احسب وأضف للفاتورة</button><span id="aiMsg" class="pill"></span></div>`;
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
        <div class="deptHeroBadges"><span>القسم: ${esc(d)}</span><span>المزامنة: Google Sheets</span></div>
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
  function screenWaste(){ return `<div class="card"><h2>هوالك القسم</h2><div class="grid four"><div class="field"><label>رقم الأوردر</label><input id="waOrder"></div><div class="field"><label>سبب الهالك</label><input id="waReason"></div><div class="field"><label>قيمة التالف</label><input id="waAmount" type="number"></div><div class="field"><label>تعويض</label><input id="waPaid" type="number"></div></div><button class="btn" onclick="ES27.saveWaste()">حفظ الهالك</button></div>${table((state.data.wasteLines||[]).filter(r=>isAdmin()||String(r.department||'')===userDept()),['القسم','الأوردر','السبب','قيمة','تعويض'],r=>[esc(r.department),esc(r.orderId),esc(r.reason),money(r.amount),money(r.paid)])}`; }
  function screenFinalLegacy(){ return `<div class="card"><h2>تقفيل الفاتورة النهائية</h2><div class="grid three"><div class="field"><label>رقم الأوردر</label><input id="fiOrder"></div><div class="field"><label>العميل</label><input id="fiCustomer" list="custList"><datalist id="custList">${customerOptions()}</datalist></div><div class="field"><label>مدفوع</label><input id="fiPaid" type="number"></div></div><button class="btn secondary" onclick="ES27.collectDeptLines()">استدعاء أجزاء وائل وجابر</button><button class="btn" onclick="ES27.saveFinal()">تقفيل الفاتورة</button><div id="finalBox" class="invoiceBox"></div></div>`; }
  function screenFinal(){
    return `<div class="deptInvoicePage finalInvoicePage">
      <section class="deptInvoiceHero finalInvoiceHero">
        <div><span class="deptEyebrow">تقفيل موثوق من السيرفر</span><h2>الفاتورة النهائية الموحّدة</h2><p>يتم احتساب الإجمالي من بنود الأقسام المعتمدة داخل Google Sheets، ولا يتم الاعتماد على أرقام المتصفح.</p></div>
        <div class="deptHeroBadges"><span>V1889 Trusted Invoice</span><span>منع السحب المكرر</span></div>
      </section>
      <section class="card deptInvoiceEditor">
        <div class="deptSectionTitle"><div><span>1</span><h3>بيانات الفاتورة</h3></div><small>الأوردر والعميل والمدفوع</small></div>
        <div class="grid three"><div class="field"><label>رقم الأوردر</label><input id="fiOrder" placeholder="رقم الأوردر"></div><div class="field"><label>العميل</label><input id="fiCustomer" list="custList" placeholder="ابحث بالاسم أو الرقم" oninput="ES27.refreshFinalDebt()"><datalist id="custList">${customerOptions()}</datalist><div id="finalCustomerDebt" class="deptDebtSlot">${deptCustomerDebtHtml('')}</div></div><div class="field"><label>المدفوع</label><input id="fiPaid" type="number" value="0"></div></div>
        <div class="deptInvoiceActions"><button class="btn secondary" onclick="ES27.collectDeptLines()">استدعاء البنود المعتمدة</button><button class="btn deptApproveBtn" onclick="ES27.saveFinal()">تقفيل الفاتورة من السيرفر</button></div>
      </section>
      <section class="card deptReviewCard"><div class="deptSectionTitle"><div><span>2</span><h3>مراجعة البنود</h3></div><small>لن تُسحب البنود غير المعتمدة</small></div><div id="finalBox" class="invoiceBox"><div class="empty">اكتب رقم الأوردر ثم استدعِ البنود المعتمدة.</div></div></section>
    </div>`;
  }
  function screenDeptView(){ return `<div class="card"><h2>أجزاء الأقسام</h2>${table(state.data.deptLines,['أوردر','القسم','البند','كمية','سعر'],r=>[esc(r.orderId),esc(r.department),esc(r.itemName),esc(r.qty),money(r.sale)])}</div>`; }

  async function load(silent){
    if(state.loading) return;
    state.loading = true;
    if(!silent) msg('جاري تحميل البيانات...');
    try{
      const r = await api('getAccounting');
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
    go(t){ state.active = t; shell(); },
    load,
    hardReload(){ const url = location.pathname + '?v=es32-v1880-clean-core-' + Date.now() + '&name=' + encodeURIComponent(user.name) + '&username=' + encodeURIComponent(user.username) + '&token=' + encodeURIComponent(user.token || ''); location.href = url; },
    quickSearch(q){ q=nkey(q); if(!q) return; const found = templates().find(r=>nkey(templateName(r)).includes(q)) || materials().find(r=>nkey(materialName(r)).includes(q)); if(found) flash('تم العثور على: ' + (templateName(found)||materialName(found))); },
    saveSupplier(){ const s={name:val('supName'),phone:val('supPhone'),opening:num(val('supOpening')),address:val('supAddress')}; if(!s.name) return flash('اكتب اسم المورد',true); const i=state.data.suppliers.findIndex(x=>nkey(x.name||x.supplier)===nkey(s.name)); if(i>=0) state.data.suppliers[i]=s; else state.data.suppliers.unshift(s); saveLocal(); api('saveEasyStoreSupplier',s).catch(()=>{}); shell(); flash('تم حفظ المورد'); },
    editSupplier(i){ const s=state.data.suppliers[i]; if(!s) return; set('supName',s.name||s.supplier); set('supPhone',s.phone); set('supOpening',s.opening||s.openingBalance); set('supAddress',s.address); },
    filterCustomers(){ const q=nkey(val('custSearch')); const rows=(state.data.customers||[]).filter(c=>nkey([c.name,c.customerName,c.phone,c.mobile].join(' ')).includes(q)); const box=$('custTable'); if(box) box.innerHTML=customersTable(rows); },
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
    saveItem(){ const p={department:val('itDept'),itemName:val('itName'),category:val('itType')||'صنف بيع',size:val('itSize'),salePrice:num(val('itSale')),fixedCost:num(val('itCost')),computedUnitCost:num(val('itCost')),active:'نعم',recordType:'template'}; if(!p.itemName) return flash('اكتب اسم الصنف',true); const res=upsertByNameDept(state.data.templates,p,templateName,matDept); saveLocal(); api('saveAccountingTemplate',Object.assign({upsert:'1'},p)).then(r=>{ if(r&&r.success===false) return flash(r.message||'تعذر مزامنة الصنف',true); load(true); }).catch(e=>flash('تم الحفظ محليًا وتعذرت مزامنة الصنف: '+(e.message||''),true)); shell(); flash(res.updated?'الصنف موجود وتم تحديثه في الكتالوج':'تم حفظ الصنف في الكتالوج'); },
    editItem(i){ const r=productTemplates()[i]; if(!r) return; set('itDept',matDept(r)); set('itName',templateName(r)); set('itType',r.category||matType(r)); set('itSize',r.size); set('itSale',matSale(r)); set('itCost',matCost(r)); },
    clearItemForm(){ ['itName','itSize','itSale','itCost'].forEach(id=>set(id,'')); },
    archiveItem(i){ const r=productTemplates()[i]; if(!r || !confirm('إيقاف الصنف ' + templateName(r) + '؟')) return; r.active='لا'; r['مفعل']='لا'; saveLocal(); api('archiveAccountingTemplate',{itemName:templateName(r),department:matDept(r)}).catch(()=>{}); shell(); },
    calcPurchase(){ const total=num(val('puQty'))*num(val('puUnit')); set('puTotal',total.toFixed(2)); set('puRemain',Math.max(0,total-num(val('puPaid'))).toFixed(2)); },
    savePurchase(){ this.calcPurchase(); const p={no:val('puNo'),supplier:val('puSupplier'),paymentType:val('puPay'),dueDate:val('puDue'),material:val('puMat'),qty:num(val('puQty')),unit:num(val('puUnit')),paid:num(val('puPaid')),total:num(val('puTotal')),remain:num(val('puRemain')),notes:val('puNotes'),date:new Date().toISOString()}; state.data.purchases.unshift(p); state.data.stockMoves.unshift({date:now(),materialName:p.material,inQty:p.qty,outQty:0,balance:'',source:'فاتورة شراء '+p.no}); saveLocal(); api('saveEasyStorePurchaseV2',p).catch(()=>{}); shell(); flash('تم حفظ فاتورة الشراء'); },
    applySaleItem(){ const r=visibleTemplates()[num(val('saItem'))]; if(!r) return; set('saUnit',matSale(r)); this.calcSale(); },
    calcSale(){ updateSaleTotalsFromPulled(); },
    async saveSale(){
      this.calcSale();
      const r=visibleTemplates()[num(val('saItem'))];
      const lineIds=salePulledLineIds();
      const desc = (state.salePulledLines||[]).map(x=>rowDept(x)+': '+rowItem(x)+' × '+rowQty(x)).join(' / ');
      if(/^DRAFT/i.test(val('saNo')) || !val('saNo')) set('saNo', officialSaleNo());
      const p={no:val('saNo'),customer:val('saCustomer'),customerPhone:customerMainPhone(state.saleSelectedCustomer||{}),orderId:val('saOrder'),paymentType:val('saPay'),item:desc || (r?templateName(r):val('saItem')) || 'فاتورة مبيعات موحدة',qty:num(val('saQty'))||1,unit:num(val('saUnit')),discount:num(val('saDiscount')),paid:num(val('saPaid')),total:num(val('saTotal')),remain:num(val('saRemain')),notes:val('saNotes'),lineIds:JSON.stringify(lineIds),date:new Date().toISOString()};
      state.data.sales.unshift(p);
      if(p.item) state.data.stockMoves.unshift({date:now(),materialName:p.item,inQty:0,outQty:p.qty,balance:'',source:'فاتورة بيع '+p.no});
      (state.salePulledLines||[]).forEach(x=>{ x.closeStatus='تم التقفيل'; x.invoiceNo=p.no; x['حالة التقفيل']='تم التقفيل'; x['رقم الفاتورة النهائية']=p.no; });
      saveLocal();
      try{ await api('saveEasyStoreSaleV2',p); }catch(e){}
      if(lineIds.length){ try{ await api('saveAccountingFinalInvoice',{orderId:p.orderId,customerName:p.customer,subtotal:p.total,discount:num(val('saDiscount')),finalTotal:p.total,paid:p.paid,remaining:p.remain,lineIds:JSON.stringify(lineIds),notes:p.notes,status:p.remain>0?'عليها باقي':'مدفوعة'}); }catch(e){} }
      state.salePulledLines=[]; state.saleSelectedCustomer=null; shell(); flash('تم حفظ الفاتورة الرسمية رقم '+p.no+' وربطها ببنود وائل/جابر.');
    },
    printSale(){ closeFloatingPanels(); const w=window.open('','_blank'); if(!w) return alert('اسمح بفتح نافذة الطباعة.'); w.document.write(this.invoiceHtml()); w.document.close(); },
    kitchenMode(mode){ const b=$('kitchenBox'); if(b) b.innerHTML = mode==='recipe' ? recipeForm() : rawForm(); },
    saveRaw(){
      const p={department:val('rawDept'),materialName:val('rawName'),materialKind:materialKindLabel(val('rawKind')),materialClass:val('rawClass'),operationExpense:val('rawClass')==='مصروف تشغيل'?'نعم':'لا',operatingBand:val('rawOperatingBand'),operatingCalcMethod:val('rawOpMethod'),operatingUnitCost:num(val('rawOpCost')),unitCost:num(val('rawCost')),salePrice:num(val('rawSale')),stockQty:num(val('rawStock')),minStock:num(val('rawMin')),width:num(val('rawW')),height:num(val('rawH')),notes:val('rawNotes'),active:val('rawClass')==='متوقفة'?'لا':'نعم',recordType:'material'};
      if(!p.materialName) return flash('اكتب اسم الخامة',true);
      const res=upsertByNameDept(state.data.materials,p,materialName,matDept);
      recalcTemplatesLocal();
      saveLocal(); api('saveAccountingMaterial',Object.assign({upsert:'1'},p)).catch(()=>{}); api('recalcAccountingMaterialsCascade',{}).catch(()=>{}); state.active='kitchen'; shell(); flash(res.updated?'الخامة موجودة وتم تحديثها وإعادة حساب الأصناف المرتبطة':'تم حفظ الخامة');
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
    saveRecipe(){ if(val('compMat') && !state.recipeComps.length) this.addComp(); const cost=this.calcRecipe(); const p={department:val('recDept'),itemName:val('recName'),size:val('recSize'),salePrice:num(val('recSale')),fixedCost:cost,computedUnitCost:cost,calculatedUnitCost:cost,componentsJson:JSON.stringify(state.recipeComps),category:'صنف بمكونات',recordType:'template',active:'نعم'}; if(!p.itemName) return flash('اكتب اسم الصنف',true); const res=upsertByNameDept(state.data.templates,p,templateName,matDept); saveLocal(); api('saveAccountingTemplate',Object.assign({upsert:'1'},p)).then(r=>{ if(r&&r.success===false) return flash(r.message||'تعذر مزامنة الصنف',true); load(true); }).catch(e=>flash('تم الحفظ محليًا وتعذرت مزامنة الصنف: '+(e.message||''),true)); state.active='kitchen'; shell(); flash(res.updated?'الصنف موجود وتم تحديثه في الكتالوج':'تم حفظ الصنف بمكوناته في الكتالوج'); },
    recalcCascade(){ recalcTemplatesLocal(); saveLocal(); render(); flash('تم تحديث الأسعار المرتبطة محليًا.'); api('recalcAccountingMaterialsCascade',{}).catch(()=>{}); },
    applyDeptItem(){ const r=selectedDeptTemplate(); if(!r) return; set('dlItem',templateName(r)); set('dlItemDept',matDept(r)); set('dlSystemSale',matSale(r).toFixed(2)); set('dlSale',matSale(r).toFixed(2)); const sh=$('dlSharedLine'); if(sh){ sh.checked=isSharedDeptName(matDept(r)); sh.disabled=isSharedDeptName(matDept(r)); } this.calcDept(); refreshDeptContextUi(); },
    calcDept(){ const q=num(val('dlQty'))||1, sys=num(val('dlSystemSale')), sale=num(val('dlSale')); set('dlDiff',((sale-sys)*q).toFixed(2)); },
    renderDeptSharedLines(){ const b=$('deptSharedBox'); if(b) b.innerHTML=deptSharedTable(); },
    renderDeptApproval(){ const b=$('deptApprovalBox'); if(b) b.innerHTML=deptApprovalTable(); const stats=$('deptInvoiceStats'); if(stats) stats.innerHTML=deptInvoiceStatsHtml(); },
    refreshDeptContext(){ refreshDeptContextUi(); },
    approveDeptInvoiceLegacy(){ const order=val('dlOrder') || qs.get('orderId') || qs.get('order') || ''; const d=userDept(); if(!order) return flash('رقم الأوردر مطلوب للاعتماد.',true); const rows=deptReviewRows(); if(!rows.length) return flash('لا توجد بنود مسجلة للاعتماد.',true); if(!confirm('اعتماد فاتورة قسم '+d+' للأوردر '+order+'؟')) return; rows.forEach(r=>{ r.approvalStatus='معتمد من القسم'; r.billingStatus='معتمد من القسم'; r.closeStatus='معتمد من القسم'; r['حالة اعتماد القسم']='معتمد من القسم'; r['حالة الفوترة']='معتمد من القسم'; r['حالة التقفيل']='معتمد من القسم'; r.approvedBy=user.name; r.approvedAt=new Date().toISOString(); }); saveLocal(); api('approveAccountingDeptInvoice',{orderId:order,department:d,customerName:val('dlCustomer')}).then(res=>{ if(res&&res.success===false) flash(res.message||'تعذر الاعتماد على السيرفر',true); else flash((res&&res.message)||'تم اعتماد فاتورة القسم.'); }).catch(e=>flash(e.message||'تعذر اعتماد الفاتورة على السيرفر',true)); shell(); },
    async approveDeptInvoice(){
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
    saveDeptLineAndOpenSales(){ this.saveDeptLine(); const order=encodeURIComponent(val('dlOrder')); const customer=encodeURIComponent(val('dlCustomer')); setTimeout(()=>{ location.href='?screen=sales&orderId='+order+'&customer='+customer+'&v=es32-v1880-clean-core'; }, 500); },
    saveDeptLine(){ this.calcDept(); const tpl=selectedDeptTemplate(); const itemDept=tpl?matDept(tpl):val('dlItemDept'); const shared=($('dlSharedLine')&&$('dlSharedLine').checked)||isSharedDeptName(itemDept); const unitSale=num(val('dlSale')); const qty=num(val('dlQty'))||1; const p={lineId:'DLINE-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),orderId:val('dlOrder'),customerName:val('dlCustomer'),department:userDept(),itemDepartment:itemDept||userDept(),sharedLine:shared?'نعم':'لا',billingStatus:'مسجل - قيد مراجعة القسم',closeStatus:'قيد مراجعة القسم',approvalStatus:'قيد مراجعة القسم',catalogItemId:tpl?(tpl.id||tpl.ID||tpl.catalogItemId||''):'',templateId:tpl?(tpl.id||tpl.ID||''):'',materialName:tpl?(tpl.materialName||tpl['الخامة']||''):'',itemName:val('dlItem'),qty:qty,systemSale:num(val('dlSystemSale')),systemSalePrice:num(val('dlSystemSale')),sale:unitSale,salePrice:unitSale,unitSalePrice:unitSale,lineTotal:unitSale*qty,diff:num(val('dlDiff')),notes:val('dlNotes'),user:user.name,date:new Date().toISOString()}; if(!p.customerName||!p.orderId||!p.itemName){ return flash('اسم العميل ورقم الأوردر والصنف مطلوبين.',true); } if(shared){ const dup=(state.data.deptLines||[]).find(x=>isSharedLineRecord(x)&&sameDeptInvoiceContext(x,p.orderId,p.customerName)&&nkey(rowItem(x))===nkey(p.itemName)&&isUnbilledDeptLine(x)); if(dup){ return flash('البند المشترك مسجل بالفعل بواسطة '+rowDept(dup)+' وسيظهر تلقائيًا عند القسم الآخر. لا تسجله مرتين.',true); } } state.data.deptLines.unshift(p); if(p.diff) state.data.wasteLines.unshift({department:p.department,orderId:p.orderId,reason:'فرق سعر عن السيستم',amount:p.diff,paid:0}); saveLocal(); api('saveAccountingDeptLine',p).then(r=>{ if(r&&r.lineId){p.id=r.lineId;p.ID=r.lineId;} saveLocal(); }).catch(e=>flash('تم حفظ المسودة محليًا وتعذر تأكيدها على السيرفر: '+(e.message||''),true)); set('dlItemSel',''); set('dlItem',''); set('dlItemDept',''); set('dlSystemSale',''); set('dlSale',''); set('dlDiff',''); set('dlNotes',''); set('dlQty','1'); refreshDeptContextUi(); flash(shared?'تم حفظ بند مشترك في مسودة القسم وسيظهر عند القسم الآخر':'تم حفظ البند في مسودة فاتورة القسم. يمكنك إضافة بند جديد ثم الاعتماد.'); },
    aiLaser(){ const m=matByName(val('aiMat')); const w=num(val('aiW')),h=num(val('aiH')),q=num(val('aiQty'))||1; if(!m||!w||!h) return flash('اختار خامة الليزر واكتب المقاس',true); const rawW=num(m.width||m.rawWidth), rawH=num(m.height||m.rawHeight); let pieces=rawW&&rawH?Math.max(Math.floor(rawW/w)*Math.floor(rawH/h),Math.floor(rawW/h)*Math.floor(rawH/w)):1; const waste=num(val('aiWaste')); const adopted=Math.max(1,Math.floor(pieces/(1+waste/100))); const cost=matCost(m)/adopted; const sale=(cost*(num(val('aiFactor'))||2.2)); set('dlItem','ليزر '+materialName(m)+' '+w+'×'+h); set('dlItemDept','ليزر'); const sh=$('dlSharedLine'); if(sh){ sh.checked=false; sh.disabled=false; } set('dlQty',q); set('dlSystemSale',sale.toFixed(2)); set('dlSale',sale.toFixed(2)); this.calcDept(); const a=$('aiMsg'); if(a) a.textContent='الناتج '+pieces+' / المعتمد '+adopted+' / سعر مقترح '+money(sale); },
    saveWaste(){ const p={department:userDept(),orderId:val('waOrder'),reason:val('waReason'),amount:num(val('waAmount')),paid:num(val('waPaid')),user:user.name,date:new Date().toISOString()}; state.data.wasteLines.unshift(p); saveLocal(); api('saveAccountingWaste',p).catch(()=>{}); shell(); flash('تم حفظ الهالك'); },
    collectDeptLines(){ const order=val('fiOrder'); const rows=(state.data.deptLines||[]).filter(isUnbilledDeptLine).filter(isDeptApprovedForFinal).filter(r=>String(rowOrderId(r)||'')===String(order||'')); const total=rows.reduce((s,r)=>s+rowLineTotal(r),0); const b=$('finalBox'); if(b) b.innerHTML=table(rows,['القسم','البند','كمية','سعر الوحدة','الإجمالي'],r=>[esc(rowDept(r)),esc(rowItem(r)),esc(rowQty(r)),money(rowSale(r)),money(rowLineTotal(r))])+'<div class="softBox"><b>الإجمالي: '+money(total)+'</b></div>'; },
    async saveFinal(){
      const order=val('fiOrder');
      if(!order) return flash('رقم الأوردر مطلوب لتقفيل الفاتورة.',true);
      const rows=(state.data.deptLines||[]).filter(isUnbilledDeptLine).filter(isDeptApprovedForFinal).filter(r=>String(rowOrderId(r)||'')===String(order||''));
      const lineIds=rows.map(rowLineId).filter(Boolean);
      const p={orderId:order,customer:val('fiCustomer'),customerName:val('fiCustomer'),paid:num(val('fiPaid')),lineIds:JSON.stringify(lineIds),date:new Date().toISOString()};
      flash('جاري التحقق من البنود المعتمدة وتقفيل الفاتورة...');
      try{
        const res=await api('saveAccountingFinalInvoice',p);
        if(!res || res.success===false) throw new Error((res&&res.message)||'تعذر تقفيل الفاتورة على السيرفر.');
        const saved=Object.assign({},p,{no:res.invoiceNo,invoiceNo:res.invoiceNo,subtotal:res.subtotal,finalTotal:res.finalTotal,total:res.finalTotal,remaining:res.remaining,remain:res.remaining,trustedByServer:!!res.trustedByServer});
        state.data.finalInvoices.unshift(saved);
        rows.forEach(r=>{ r.closeStatus='تم التقفيل'; r.billingStatus='تم السحب للفاتورة النهائية'; r.invoiceNo=res.invoiceNo; r['حالة التقفيل']='تم التقفيل'; r['حالة الفوترة']='تم السحب للفاتورة النهائية'; r['رقم الفاتورة النهائية']=res.invoiceNo; });
        saveLocal(); shell(); flash(res.message||('تم تقفيل الفاتورة رقم '+res.invoiceNo));
      }catch(e){ flash(e.message||'تعذر تقفيل الفاتورة على السيرفر.',true); }
    },
    refreshFinalDebt(){ const b=$('finalCustomerDebt'); if(b) b.innerHTML=deptCustomerDebtHtml(val('fiCustomer')); },
    health(){ const h=$('healthBox'); if(h) h.innerHTML='جاري الفحص...'; api('getAccounting').then(r=>{ if(h) h.innerHTML = r && r.success!==false ? '✅ الاتصال سليم والبيانات قابلة للتحميل. الإصدار: '+VERSION : '⚠️ الرد غير ناجح: '+esc(r.message); }).catch(e=>{ if(h) h.innerHTML='❌ فشل الاتصال: '+esc(e.message); }); }
  };



  document.addEventListener('click', function(ev){
    const target = ev.target;
    const insideCustomer = target && target.closest && target.closest('.customerField');
    const insideMenu = target && target.closest && target.closest('.menuWrap');
    if(!insideCustomer){
      const drop = $('saCustomerDrop');
      if(drop){ drop.classList.add('hidden'); drop.innerHTML=''; drop.__rows=[]; }
    }
    if(!insideMenu){
      const menu = $('clientInvoiceMenu');
      if(menu) menu.classList.add('hidden');
    }
  }, true);

  window.addEventListener('pagehide', closeFloatingPanels);
  window.addEventListener('blur', function(){ setTimeout(closeFloatingPanels, 80); });
  window.addEventListener('pageshow', function(){ setTimeout(closeFloatingPanels, 60); });

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
