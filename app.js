(function(){
  'use strict';

  const VERSION = 'ES29 V1872 Invoice Comfort + Duplicate Guard';
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

  const STORE_KEY = 'EASYSTORE_BATCH29_DATA';
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
      const cb = 'ES27_' + Date.now() + '_' + Math.random().toString(16).slice(2);
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
  function gp(cost, sale){ const profit = num(sale) - num(cost); const margin = num(sale) ? (profit / num(sale)) * 100 : 0; return {profit, margin}; }

  function materials(){ return state.data.materials || []; }
  function templates(){ return state.data.templates || []; }
  function visibleTemplates(){
    if(isAdmin() || isFinal()) return templates().filter(activeRow);
    const d = userDept();
    return templates().filter(r => activeRow(r) && ['عام','مشترك',d].includes(String(matDept(r) || '')));
  }
  function materialOptions(filter){
    return materials().filter(activeRow).filter(filter || (()=>true)).map((r,i)=>`<option value="${esc(materialName(r))}">${esc(materialName(r))} - ${esc(matDept(r))}</option>`).join('');
  }
  function itemOptions(){
    return visibleTemplates().map((r,i)=>`<option value="${i}">${esc(templateName(r))} - ${esc(matDept(r))}</option>`).join('');
  }
  function supplierOptions(){ return (state.data.suppliers||[]).map(s=>`<option value="${esc(s.name||s.supplier||'')}"></option>`).join(''); }
  function customerOptions(){ return (state.data.customers||[]).map(c=>`<option value="${esc(c.name||c.customerName||c.phone||'')}">${esc(c.phone||c.mobile||'')}</option>`).join(''); }
  function matByName(name){ const k=nkey(name); return materials().find(r => nkey(materialName(r)) === k); }
  function itemByName(name){ const k=nkey(name); return templates().find(r => nkey(templateName(r)) === k); }



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
        <div><h1>💰 إيزي ستور مطبعجي V8 - برنامج الحسابات الكامل</h1><p>أصناف، موردين، فواتير شراء ومبيعات، مخزون، تقارير، ومطبخ الحسابات.</p><div class="versionLine">${VERSION} / app.js محمل: ${new Date().toLocaleTimeString('ar-EG')}</div></div>
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
  function customersTable(rows){ return table(rows||[],['العميل','الهاتف','النوع/المسؤول'],c=>[esc(c.name||c.customerName||''),esc(c.phone||c.mobile||''),esc(c.type||c.manager||'')]); }

  function screenItems(){
    return `<div class="card"><h2>الأصناف</h2><div class="grid six"><div class="field"><label>القسم</label><select id="itDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option><option>عام</option></select></div><div class="field"><label>اسم الصنف</label><input id="itName"></div><div class="field"><label>نوع</label><select id="itType"><option>صنف بيع</option><option>خامة</option><option>صنف مركب</option></select></div><div class="field"><label>مقاس</label><input id="itSize"></div><div class="field"><label>سعر البيع</label><input id="itSale" type="number"></div><div class="field"><label>تكلفة ثابتة</label><input id="itCost" type="number"></div></div><div class="actions"><button class="btn" onclick="ES27.saveItem()">حفظ / تحديث الصنف</button><button class="btn secondary" onclick="ES27.clearItemForm()">جديد</button></div></div>${itemsTable()}`;
  }
  function itemsTable(){ return table(templates(),['الصنف','القسم','التكلفة','البيع','مجمل الربح','نسبة الربح','الحالة','إجراء'],(r,i)=>{ const cost=matCost(r), sale=matSale(r), g=gp(cost,sale); return [esc(templateName(r)),esc(matDept(r)),isAdmin()?money(cost):'<span class="costHidden">مخفي</span>',money(sale),isAdmin()?money(g.profit):'<span class="costHidden">مخفي</span>',isAdmin()?g.margin.toFixed(1)+'%':'-',activeRow(r)?'مفعل':'موقوف',`<span class="tableActions"><button class="btn small secondary" onclick="ES27.editItem(${i})">تعديل</button><button class="btn small warn" onclick="ES27.archiveItem(${i})">إيقاف</button></span>`]; }); }

  function screenPurchase(){
    return `<div class="card"><h2>فاتورة شراء</h2><div class="grid four"><div class="field"><label>رقم الفاتورة</label><input id="puNo" value="PUR-${Date.now().toString().slice(-6)}"></div><div class="field"><label>المورد</label><input id="puSupplier" list="supList"><datalist id="supList">${supplierOptions()}</datalist></div><div class="field"><label>نوع الدفع</label><select id="puPay"><option>نقدي</option><option>آجل</option><option>جزئي</option></select></div><div class="field"><label>تاريخ استحقاق</label><input id="puDue" type="date"></div></div><div class="grid six"><div class="field"><label>الخامة/الصنف</label><select id="puMat"><option></option>${materialOptions()}</select></div><div class="field"><label>الكمية</label><input id="puQty" type="number" value="1" oninput="ES27.calcPurchase()"></div><div class="field"><label>سعر الشراء</label><input id="puUnit" type="number" oninput="ES27.calcPurchase()"></div><div class="field"><label>الإجمالي</label><input id="puTotal" readonly></div><div class="field"><label>مدفوع</label><input id="puPaid" type="number" value="0" oninput="ES27.calcPurchase()"></div><div class="field"><label>متبقي</label><input id="puRemain" readonly></div></div><div class="field"><label>ملاحظات</label><input id="puNotes"></div><button class="btn" onclick="ES27.savePurchase()">حفظ فاتورة الشراء وزيادة المخزون</button></div>${table(state.data.purchases,['رقم','مورد','خامة','كمية','إجمالي','مدفوع','متبقي'],p=>[esc(p.no||p.invoiceNo),esc(p.supplier),esc(p.material||p.materialName),esc(p.qty),money(p.total),money(p.paid),money(p.remain)])}`;
  }


  function rowLineId(r){ return r.id || r.ID || r.lineId || r['ID'] || r['رقم البند'] || ''; }
  function rowOrderId(r){ return r.orderId || r['رقم الأوردر'] || ''; }
  function rowCustomer(r){ return r.customerName || r.customer || r['اسم العميل'] || ''; }
  function rowDept(r){ return r.department || r['القسم'] || ''; }
  function rowItem(r){ return r.itemName || r.item || r['اسم البند'] || ''; }
  function rowQty(r){ return num(r.qty || r['الكمية'] || 1) || 1; }
  function rowSale(r){ return num(r.sale || r.salePrice || r['سعر البيع'] || r.finalTotal || r.total || 0); }
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
    return (state.data.deptLines||[]).filter(isUnbilledDeptLine).filter(r=>{
      const okOrder = !qOrder || nkey(rowOrderId(r)).includes(qOrder);
      const okCustomer = !qCustomer || customerMatchesRow(r, c, qCustomer);
      return okOrder && okCustomer;
    });
  }
  function salePulledIds(){ const ids={}; (state.salePulledLines||[]).forEach(r=>{ ids[nkey(rowLineId(r)||JSON.stringify(r))]=true; }); return ids; }
  function salePulledTotal(){ return (state.salePulledLines||[]).reduce((s,r)=>s + rowSale(r)*rowQty(r),0); }
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
    return '<div class="saleContextHead"><b>العميل:</b> '+esc(customerMainName(c)||val('saCustomer'))+' '+(customerMainPhone(c)?'<span class="pill">'+esc(customerMainPhone(c))+'</span>':'')+'</div>'+
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
  function customerLabel(c){ return (c.name||c.customerName||'') + (c.phone||c.mobile? ' - '+(c.phone||c.mobile):'') + (c.type?' - '+c.type:''); }
  function localCustomerMatches(q){ q=nkey(q); return (state.data.customers||[]).filter(c=>!q || nkey([c.name,c.customerName,c.phone,c.mobile,c.manager,c.type].join(' ')).includes(q)).slice(0,40); }
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

  function screenStock(){ return `<div class="card"><h2>المخزون</h2>${table(materials(),['الخامة/الصنف','القسم','النوع','الرصيد','حد النقص','تكلفة','بيع','حالة'],r=>[esc(materialName(r)),esc(matDept(r)),esc(matType(r)),esc(matStock(r)),esc(matMin(r)),isAdmin()?money(matCost(r)):'<span class="costHidden">مخفي</span>',money(matSale(r)),activeRow(r)?'مفعل':'موقوف'])}</div><div class="card"><h3>حركة المخزون</h3>${table(state.data.stockMoves,['التاريخ','الخامة','داخل','خارج','الرصيد','المصدر'],r=>[esc(r.date||r['وقت التسجيل']||''),esc(r.materialName||r['الخامة']||''),esc(r.inQty||r['داخل']||''),esc(r.outQty||r['خارج']||''),esc(r.balance||r['الرصيد']||''),esc(r.source||r['المصدر']||'')])}</div>`; }

  function screenKitchen(){
    if(!isAdmin()) return '<div class="card"><h2>مطبخ الحسابات</h2><div class="warn">هذا القسم يظهر لضياء فقط.</div></div>';
    return `<div class="card"><h2>مطبخ الحسابات</h2><div class="grid three"><button class="btn" onclick="ES27.kitchenMode('raw')">خامة أساسية</button><button class="btn" onclick="ES27.kitchenMode('recipe')">صنف بمكونات</button><button class="btn secondary" onclick="ES27.recalcCascade()">تحديث كل الأسعار المرتبطة</button></div><div id="kitchenBox">${rawForm()}</div></div>${itemsTable()}`;
  }
  function rawForm(){ return `<div class="softBox"><h3>خامة / مصروف تشغيل</h3><input id="rawId" type="hidden"><div class="grid six"><div class="field"><label>القسم</label><select id="rawDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الخامة</label><input id="rawName"></div><div class="field"><label>تصنيف الخامة</label><select id="rawClass"><option>خامة إنتاج</option><option>مصروف تشغيل</option><option>خامة مشتركة</option><option>متوقفة</option></select></div><div class="field"><label>سعر/تكلفة الأصل</label><input id="rawCost" type="number"></div><div class="field"><label>سعر بيع رسمي</label><input id="rawSale" type="number"></div><div class="field"><label>الرصيد</label><input id="rawStock" type="number"></div></div><div class="grid six"><div class="field"><label>حد النقص</label><input id="rawMin" type="number"></div><div class="field"><label>عرض الخام سم</label><input id="rawW" type="number"></div><div class="field"><label>طول الخام سم</label><input id="rawH" type="number"></div><div class="field"><label>نوع الخامة</label><select id="rawKind"><option>raw</option><option>laser</option><option>paper roll</option><option>lamination roll</option><option>ink</option><option>machine expense</option></select></div><div class="field"><label>ضم إلى بند</label><select id="rawOperatingBand"><option>إنتاج مباشر</option><option>مصروفات تشغيل الطباعة</option><option>مصروفات تشغيل الليزر</option><option>مصروفات تشغيل مشتركة</option></select></div><div class="field"><label>طريقة توزيع التشغيل</label><select id="rawOpMethod"><option>لا يوزع</option><option>ثابت على الفاتورة</option><option>بالمتر</option><option>بالمتر المربع</option><option>نسبة من الفاتورة</option><option>يدوي</option></select></div></div><div class="grid two"><div class="field"><label>قيمة التشغيل للوحدة / النسبة</label><input id="rawOpCost" type="number" placeholder="مثال: 5 جنيه للمتر أو 3%"></div><div class="field"><label>ملاحظات</label><input id="rawNotes"></div></div><button class="btn" onclick="ES27.saveRaw()">حفظ / تحديث الخامة</button></div>`; }
  function recipeForm(){ return `<div class="softBox"><h3>صنف بمكونات</h3><div class="grid six"><div class="field"><label>القسم</label><select id="recDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الصنف</label><input id="recName"></div><div class="field"><label>مقاس الناتج</label><input id="recSize" placeholder="مثال 15x21"></div><div class="field"><label>سعر بيع رسمي</label><input id="recSale" type="number" oninput="ES27.calcRecipe()"></div><div class="field"><label>تكلفة محسوبة</label><input id="recCost" readonly></div><div class="field"><label>مجمل الربح</label><input id="recProfit" readonly></div></div><div class="grid six"><div class="field"><label>المكون</label><select id="compMat"><option></option>${materialOptions()}</select></div><div class="field"><label>كمية المكون للوحدة</label><input id="compQty" type="number" value="1"></div><div class="field"><label>الناتج AI</label><input id="compAiPieces" readonly></div><div class="field"><label>الناتج اليدوي</label><input id="compManualPieces" type="number"></div><div class="field"><label>هالك</label><input id="compWaste" readonly></div><div class="field"><label>تكلفة المكون</label><input id="compCost" readonly></div></div><div class="actions"><button class="btn secondary" onclick="ES27.aiComp()">احسب AI للمكون</button><button class="btn" onclick="ES27.addComp()">إضافة المكون</button><button class="btn danger" onclick="ES27.clearComps()">تفريغ</button></div><div id="compList">${compTable()}</div><button class="btn" onclick="ES27.saveRecipe()">حفظ / تحديث الصنف</button></div>`; }
  function compTable(){ return table(state.recipeComps,['المكون','استهلاك','تكلفة'],c=>[esc(c.materialName),esc(c.qty),money(c.cost)]); }

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
  function screenDept(){
    const d = userDept() || 'طباعة';
    const qOrder = esc(qs.get('orderId') || qs.get('order') || '');
    const qCustomer = esc(qs.get('customer') || qs.get('customerName') || '');
    return `<div class="card"><h2>فاتورة القسم - ${esc(d)}</h2><div class="hint">افتح على اسم العميل، اختار الصنف من مطبخ الحسابات، اكتب الكمية والسعر، ثم سجل البند. البنود المشتركة المسجلة من القسم الآخر تظهر هنا إجباريًا.</div>
      <div class="grid four"><div class="field"><label>اسم العميل</label><input id="dlCustomer" value="${qCustomer}" oninput="ES27.renderDeptSharedLines()" placeholder="اسم العميل"></div><div class="field"><label>رقم الأوردر</label><input id="dlOrder" value="${qOrder}" oninput="ES27.renderDeptSharedLines()"></div><div class="field"><label>الصنف</label><select id="dlItemSel" onchange="ES27.applyDeptItem()"><option></option>${itemOptions()}</select><input id="dlItem" placeholder="اسم الصنف المختار"></div><div class="field"><label>قسم الصنف</label><input id="dlItemDept" readonly></div></div>
      <div class="grid six"><div class="field"><label>الكمية</label><input id="dlQty" type="number" value="1" oninput="ES27.calcDept()"></div><div class="field"><label>سعر السيستم</label><input id="dlSystemSale" readonly></div><div class="field"><label>سعر الفاتورة</label><input id="dlSale" type="number" oninput="ES27.calcDept()"></div><div class="field"><label>فرق للهوالك</label><input id="dlDiff" readonly></div><div class="field checkboxField"><label>بند مشترك</label><label class="checkLine"><input id="dlSharedLine" type="checkbox"> يظهر عند القسم الآخر</label></div><div class="field"><label>ملاحظات</label><input id="dlNotes"></div></div>
      ${isLaser()?'<div class="actions"><button class="btn secondary" onclick="ES27.toggleLaserCalc()">حاسبة الليزر / حساب شغلانة</button></div><div id="laserCalcBox" class="card softBox">'+laserBox()+'</div>':''}
      <div class="actions"><button class="btn" onclick="ES27.saveDeptLine()">تسجيل البند</button><button class="btn secondary" onclick="ES27.saveDeptLineAndOpenSales()">تسجيل وإرسال للفاتورة</button></div><div id="deptMsg"></div></div>
      <div class="card"><h3>البنود المشتركة من القسم الآخر</h3><div id="deptSharedBox">${deptSharedTable()}</div></div>`;
  }
  function screenWaste(){ return `<div class="card"><h2>هوالك القسم</h2><div class="grid four"><div class="field"><label>رقم الأوردر</label><input id="waOrder"></div><div class="field"><label>سبب الهالك</label><input id="waReason"></div><div class="field"><label>قيمة التالف</label><input id="waAmount" type="number"></div><div class="field"><label>تعويض</label><input id="waPaid" type="number"></div></div><button class="btn" onclick="ES27.saveWaste()">حفظ الهالك</button></div>${table((state.data.wasteLines||[]).filter(r=>isAdmin()||String(r.department||'')===userDept()),['القسم','الأوردر','السبب','قيمة','تعويض'],r=>[esc(r.department),esc(r.orderId),esc(r.reason),money(r.amount),money(r.paid)])}`; }
  function screenFinal(){ return `<div class="card"><h2>تقفيل الفاتورة النهائية</h2><div class="grid three"><div class="field"><label>رقم الأوردر</label><input id="fiOrder"></div><div class="field"><label>العميل</label><input id="fiCustomer" list="custList"><datalist id="custList">${customerOptions()}</datalist></div><div class="field"><label>مدفوع</label><input id="fiPaid" type="number"></div></div><button class="btn secondary" onclick="ES27.collectDeptLines()">استدعاء أجزاء وائل وجابر</button><button class="btn" onclick="ES27.saveFinal()">تقفيل الفاتورة</button><div id="finalBox" class="invoiceBox"></div></div>`; }
  function screenDeptView(){ return `<div class="card"><h2>أجزاء الأقسام</h2>${table(state.data.deptLines,['أوردر','القسم','البند','كمية','سعر'],r=>[esc(r.orderId),esc(r.department),esc(r.itemName),esc(r.qty),money(r.sale)])}</div>`; }

  async function load(silent){
    if(state.loading) return;
    state.loading = true;
    if(!silent) msg('جاري تحميل البيانات...');
    try{
      const r = await api('getAccounting');
      if(!r || r.success === false) throw new Error(r && r.message || 'تعذر تحميل البيانات');
      mergeData({
        materials: r.materials || r.rawMaterials || [],
        templates: r.templates || r.items || [],
        suppliers: r.suppliers || [],
        purchases: r.purchases || [],
        sales: r.sales || [],
        customers: r.customers || [],
        stockMoves: r.stockMoves || [],
        wasteLines: r.wasteLines || [],
        deptLines: r.deptLines || [],
        finalInvoices: r.finalInvoices || [],
        summary: r.summary || {}
      });
      saveLocal(); render(); if(state.active==='sales' && (qs.get('pullLines') || qs.get('autoLoadCustomer') || qs.get('customer'))){ setTimeout(()=>{ try{ ES27.loadSaleCustomerFromInput(true); }catch(e){ try{ ES27.pullDeptCandidates(); }catch(x){} } },160); } msg('تم التحديث من الشيتات: ' + now());
    }catch(e){
      mergeData(); render(); msg('تنبيه: يعمل بنسخة محلية مؤقتة - ' + e.message, true);
    }finally{ state.loading = false; }
  }

  window.ES27 = {
    go(t){ state.active = t; shell(); },
    load,
    hardReload(){ const url = location.pathname + '?v=es13-batch32-' + Date.now() + '&name=' + encodeURIComponent(user.name) + '&username=' + encodeURIComponent(user.username) + '&token=' + encodeURIComponent(user.token || ''); location.href = url; },
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
    invoicePlainText(){ const rows=state.salePulledLines||[]; const lines=['فاتورة مطبعجي','رقم الفاتورة: '+val('saNo'),'رقم الأوردر: '+val('saOrder'),'العميل: '+val('saCustomer'),'--------------------']; if(rows.length){ rows.forEach((r,i)=>lines.push((i+1)+') '+rowDept(r)+' - '+rowItem(r)+' × '+rowQty(r)+' = '+money(rowSale(r)*rowQty(r)))); } else { lines.push('1) '+(val('saItem')||'بند مطبعجي')+' × '+(val('saQty')||1)+' = '+money(num(val('saQty'))*num(val('saUnit')))); } lines.push('--------------------','الإجمالي: '+money(val('saTotal')),'المدفوع: '+money(val('saPaid')),'المتبقي: '+money(val('saRemain'))); return lines.join('\n'); },
    invoiceHtml(){ const rows=state.salePulledLines||[]; const trs=(rows.length?rows:[{department:'',itemName:val('saItem')||'بند مطبعجي',qty:val('saQty')||1,sale:val('saUnit')}]).map((r,i)=>`<tr><td>${i+1}</td><td>${esc(rowDept(r))}</td><td>${esc(rowItem(r))}</td><td>${esc(rowQty(r))}</td><td>${esc(money(rowSale(r)*rowQty(r)))}</td></tr>`).join(''); return `<html dir="rtl"><head><title>فاتورة مطبعجي</title><style>body{font-family:Tahoma;padding:30px;background:#f8fafc}.box{max-width:780px;margin:auto;background:white;border:1px solid #ddd;padding:25px;border-radius:18px}h1{color:#0f766e}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:9px;text-align:right}.total{font-size:22px;color:#0f766e;font-weight:bold}</style></head><body><div class="box"><h1>فاتورة مطبعجي</h1><p>رقم: ${esc(val('saNo'))}</p><p>العميل: ${esc(val('saCustomer'))}</p><p>الأوردر: ${esc(val('saOrder'))}</p><table><thead><tr><th>#</th><th>القسم</th><th>البند</th><th>كمية</th><th>القيمة</th></tr></thead><tbody>${trs}</tbody></table><p class="total">الإجمالي: ${esc(money(val('saTotal')))}</p><p>المدفوع: ${esc(money(val('saPaid')))} / المتبقي: ${esc(money(val('saRemain')))}</p></div><script>setTimeout(()=>print(),400)<\/script></body></html>`; },
    showPricePreview(){ closeFloatingPanels(); alert(this.invoicePlainText()); },
    async copySaleText(){ closeFloatingPanels(); const t=this.invoicePlainText(); try{ await navigator.clipboard.writeText(t); flash('تم نسخ نص الفاتورة'); }catch(e){ prompt('انسخ نص الفاتورة',t); } },
    openSaleWhatsApp(){ closeFloatingPanels(); const t=this.invoicePlainText(); window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank'); },
    downloadSaleImage(){ closeFloatingPanels(); const canvas=document.createElement('canvas'); canvas.width=1200; canvas.height=900; const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,1200,900); ctx.fillStyle='#0f766e'; ctx.fillRect(0,0,1200,120); ctx.fillStyle='#fff'; ctx.font='bold 44px Arial'; ctx.textAlign='right'; ctx.fillText('فاتورة مطبعجي',1120,75); ctx.fillStyle='#111827'; ctx.font='28px Arial'; const lines=this.invoicePlainText().split('\n'); let y=170; lines.forEach(l=>{ ctx.fillText(l,1120,y); y+=42; }); const a=document.createElement('a'); a.download='matbagy-sale-'+(val('saNo')||Date.now())+'.png'; a.href=canvas.toDataURL('image/png'); a.click(); },
    saveItem(){ const p={department:val('itDept'),itemName:val('itName'),category:val('itType'),size:val('itSize'),salePrice:num(val('itSale')),fixedCost:num(val('itCost')),active:'نعم'}; if(!p.itemName) return flash('اكتب اسم الصنف',true); const i=state.data.templates.findIndex(x=>nkey(templateName(x))===nkey(p.itemName)&&nkey(matDept(x))===nkey(p.department)); if(i>=0) state.data.templates[i]=Object.assign({},state.data.templates[i],p); else state.data.templates.unshift(p); saveLocal(); api('saveAccountingTemplate',p).catch(()=>{}); shell(); flash('تم حفظ الصنف'); },
    editItem(i){ const r=templates()[i]; if(!r) return; set('itDept',matDept(r)); set('itName',templateName(r)); set('itType',r.category||matType(r)); set('itSize',r.size); set('itSale',matSale(r)); set('itCost',matCost(r)); },
    clearItemForm(){ ['itName','itSize','itSale','itCost'].forEach(id=>set(id,'')); },
    archiveItem(i){ const r=templates()[i]; if(!r || !confirm('إيقاف الصنف ' + templateName(r) + '؟')) return; r.active='لا'; r['مفعل']='لا'; saveLocal(); api('archiveAccountingTemplate',{itemName:templateName(r),department:matDept(r)}).catch(()=>{}); shell(); },
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
      const p={department:val('rawDept'),materialName:val('rawName'),materialKind:val('rawKind'),materialClass:val('rawClass'),operationExpense:val('rawClass')==='مصروف تشغيل'?'نعم':'لا',operatingBand:val('rawOperatingBand'),operatingCalcMethod:val('rawOpMethod'),operatingUnitCost:num(val('rawOpCost')),unitCost:num(val('rawCost')),salePrice:num(val('rawSale')),stockQty:num(val('rawStock')),minStock:num(val('rawMin')),width:num(val('rawW')),height:num(val('rawH')),notes:val('rawNotes'),active:val('rawClass')==='متوقفة'?'لا':'نعم'};
      if(!p.materialName) return flash('اكتب اسم الخامة',true);
      const i=state.data.materials.findIndex(x=>nkey(materialName(x))===nkey(p.materialName)&&nkey(matDept(x))===nkey(p.department));
      if(i>=0) state.data.materials[i]=Object.assign({},state.data.materials[i],p); else state.data.materials.unshift(p);
      saveLocal(); api('saveAccountingMaterial',p).catch(()=>{}); shell(); state.active='kitchen'; shell(); flash('تم حفظ الخامة وتصنيفها ضمن '+p.materialClass);
    },
    aiComp(){ const m=matByName(val('compMat')); if(!m) return flash('اختار المكون',true); const sz=String(val('recSize')).replace(/[×*]/g,'x').split('x').map(num); const outW=sz[0]||0,outH=sz[1]||0, rawW=num(m.width||m.rawWidth||m['عرض']), rawH=num(m.height||m.rawHeight||m['طول']); let pieces=0; if(rawW&&rawH&&outW&&outH){ pieces=Math.max(Math.floor(rawW/outW)*Math.floor(rawH/outH),Math.floor(rawW/outH)*Math.floor(rawH/outW)); } const manual=num(val('compManualPieces')); const adopted=manual||pieces||1; const waste=Math.max(0,(pieces||adopted)-adopted); const qty=1/adopted; const cost=matCost(m)*qty; set('compAiPieces',pieces||''); set('compWaste',waste||''); set('compQty',qty.toFixed(6)); set('compCost',cost.toFixed(4)); },
    addComp(){ const name=val('compMat'); if(!name) return; const m=matByName(name); const qty=num(val('compQty'))||1; const cost=num(val('compCost'))||(m?matCost(m)*qty:0); state.recipeComps.push({materialName:name,qty,cost}); const c=$('compList'); if(c) c.innerHTML=compTable(); this.calcRecipe(); },
    clearComps(){ state.recipeComps=[]; const c=$('compList'); if(c) c.innerHTML=compTable(); this.calcRecipe(); },
    calcRecipe(){ const cost=state.recipeComps.reduce((s,c)=>s+num(c.cost),0); set('recCost',cost.toFixed(2)); const g=gp(cost,num(val('recSale'))); set('recProfit',g.profit.toFixed(2)); return cost; },
    saveRecipe(){ this.calcRecipe(); const p={department:val('recDept'),itemName:val('recName'),size:val('recSize'),salePrice:num(val('recSale')),fixedCost:num(val('recCost')),componentsJson:JSON.stringify(state.recipeComps),category:'صنف مركب',active:'نعم'}; if(!p.itemName) return flash('اكتب اسم الصنف',true); const i=state.data.templates.findIndex(x=>nkey(templateName(x))===nkey(p.itemName)&&nkey(matDept(x))===nkey(p.department)); if(i>=0) state.data.templates[i]=Object.assign({},state.data.templates[i],p); else state.data.templates.unshift(p); saveLocal(); api('saveAccountingTemplate',p).catch(()=>{}); shell(); state.active='kitchen'; shell(); flash('تم حفظ الصنف المركب'); },
    recalcCascade(){ flash('تم تحديث الأسعار المرتبطة محليًا. سيتم الحفظ على الشيت عند تحديث Apps Script.'); api('recalcAccountingMaterialsCascade',{}).catch(()=>{}); },
    applyDeptItem(){ const r=selectedDeptTemplate(); if(!r) return; set('dlItem',templateName(r)); set('dlItemDept',matDept(r)); set('dlSystemSale',matSale(r).toFixed(2)); set('dlSale',matSale(r).toFixed(2)); const sh=$('dlSharedLine'); if(sh){ sh.checked=isSharedDeptName(matDept(r)); sh.disabled=isSharedDeptName(matDept(r)); } this.calcDept(); this.renderDeptSharedLines(); },
    calcDept(){ const q=num(val('dlQty'))||1, sys=num(val('dlSystemSale')), sale=num(val('dlSale')); set('dlDiff',((sale-sys)*q).toFixed(2)); },
    renderDeptSharedLines(){ const b=$('deptSharedBox'); if(b) b.innerHTML=deptSharedTable(); },
    toggleLaserCalc(){ const b=$('laserCalcBox'); if(b) b.classList.toggle('hidden'); },
    saveDeptLineAndOpenSales(){ this.saveDeptLine(); const order=encodeURIComponent(val('dlOrder')); const customer=encodeURIComponent(val('dlCustomer')); setTimeout(()=>{ location.href='?screen=sales&orderId='+order+'&customer='+customer+'&v=es11-batch30'; }, 500); },
    saveDeptLine(){ this.calcDept(); const tpl=selectedDeptTemplate(); const itemDept=tpl?matDept(tpl):val('dlItemDept'); const shared=($('dlSharedLine')&&$('dlSharedLine').checked)||isSharedDeptName(itemDept); const p={lineId:'DLINE-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),orderId:val('dlOrder'),customerName:val('dlCustomer'),department:userDept(),itemDepartment:itemDept||userDept(),sharedLine:shared?'نعم':'لا',billingStatus:'جاهز للفوترة',itemName:val('dlItem'),qty:num(val('dlQty')),systemSale:num(val('dlSystemSale')),sale:num(val('dlSale')),diff:num(val('dlDiff')),notes:val('dlNotes'),user:user.name,date:new Date().toISOString()}; if(!p.customerName||!p.orderId||!p.itemName){ return flash('اسم العميل ورقم الأوردر والصنف مطلوبين.',true); } if(shared){ const dup=(state.data.deptLines||[]).find(x=>isSharedLineRecord(x)&&sameDeptInvoiceContext(x,p.orderId,p.customerName)&&nkey(rowItem(x))===nkey(p.itemName)&&isUnbilledDeptLine(x)); if(dup){ return flash('البند المشترك مسجل بالفعل بواسطة '+rowDept(dup)+' وسيظهر تلقائيًا عند القسم الآخر. لا تسجله مرتين.',true); } } state.data.deptLines.unshift(p); if(p.diff) state.data.wasteLines.unshift({department:p.department,orderId:p.orderId,reason:'فرق سعر عن السيستم',amount:p.diff,paid:0}); saveLocal(); api('saveAccountingDeptLine',p).then(r=>{ if(r&&r.lineId) p.id=r.lineId; }).catch(()=>{}); shell(); flash(shared?'تم حفظ بند مشترك وسيظهر عند القسم الآخر':'تم حفظ فاتورة القسم'); },
    aiLaser(){ const m=matByName(val('aiMat')); const w=num(val('aiW')),h=num(val('aiH')),q=num(val('aiQty'))||1; if(!m||!w||!h) return flash('اختار خامة الليزر واكتب المقاس',true); const rawW=num(m.width||m.rawWidth), rawH=num(m.height||m.rawHeight); let pieces=rawW&&rawH?Math.max(Math.floor(rawW/w)*Math.floor(rawH/h),Math.floor(rawW/h)*Math.floor(rawH/w)):1; const waste=num(val('aiWaste')); const adopted=Math.max(1,Math.floor(pieces/(1+waste/100))); const cost=matCost(m)/adopted; const sale=(cost*(num(val('aiFactor'))||2.2)); set('dlItem','ليزر '+materialName(m)+' '+w+'×'+h); set('dlItemDept','ليزر'); const sh=$('dlSharedLine'); if(sh){ sh.checked=false; sh.disabled=false; } set('dlQty',q); set('dlSystemSale',sale.toFixed(2)); set('dlSale',sale.toFixed(2)); this.calcDept(); const a=$('aiMsg'); if(a) a.textContent='الناتج '+pieces+' / المعتمد '+adopted+' / سعر مقترح '+money(sale); },
    saveWaste(){ const p={department:userDept(),orderId:val('waOrder'),reason:val('waReason'),amount:num(val('waAmount')),paid:num(val('waPaid')),user:user.name,date:new Date().toISOString()}; state.data.wasteLines.unshift(p); saveLocal(); api('saveAccountingWaste',p).catch(()=>{}); shell(); flash('تم حفظ الهالك'); },
    collectDeptLines(){ const order=val('fiOrder'); const rows=(state.data.deptLines||[]).filter(r=>String(r.orderId||'')===String(order||'')); const total=rows.reduce((s,r)=>s+num(r.sale)*num(r.qty||1),0); const b=$('finalBox'); if(b) b.innerHTML=table(rows,['القسم','البند','كمية','سعر'],r=>[esc(r.department),esc(r.itemName),esc(r.qty),money(r.sale)])+'<div class="softBox"><b>الإجمالي: '+money(total)+'</b></div>'; },
    saveFinal(){ const order=val('fiOrder'); const rows=(state.data.deptLines||[]).filter(r=>String(r.orderId||'')===String(order||'')); const total=rows.reduce((s,r)=>s+num(r.sale)*num(r.qty||1),0); const p={orderId:order,customer:val('fiCustomer'),total,paid:num(val('fiPaid')),remain:Math.max(0,total-num(val('fiPaid'))),date:new Date().toISOString()}; state.data.finalInvoices.unshift(p); saveLocal(); api('saveAccountingFinalInvoice',p).catch(()=>{}); shell(); flash('تم تقفيل الفاتورة'); },
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
  if(window.EASYSTORE_AUTO_REFRESH !== false) setTimeout(()=>load(true), 350);
})();



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
  window.EASYSTORE_VERSION='ES29 V1872 Invoice Comfort + Duplicate Guard';
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
  function versionBind(){document.title='إيزي ستور مطبعجي ES28 V1871';document.querySelectorAll('.version-badge,.version,.app-version').forEach(function(el){el.textContent='ES29 V1872 Invoice Comfort + Duplicate Guard';});if(!$('es16Version')){var v=document.createElement('div');v.id='es16Version';v.className='es16-version';v.textContent='ES28 V1871';document.body.appendChild(v);}}
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
  function bind(){versionBind();loadCustomers();hydrateCustomerPickers();bindItemButtons();ensureManagerPanel();installInvoiceReviewButtons();closeInvoiceMenus(true);}document.addEventListener('DOMContentLoaded',bind);setTimeout(bind,300);setTimeout(bind,1500);// ES25: disabled old polling interval;
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
  window.EASYSTORE_VERSION = 'ES29 V1872 Invoice Comfort + Duplicate Guard';
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
    document.title='إيزي ستور مطبعجي ES28 V1871';
    document.querySelectorAll('.version-badge,.version,.app-version').forEach(function(el){ el.textContent = 'ES29 V1872 Invoice Comfort + Duplicate Guard'; });
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
  // ES25: disabled old polling interval;
})();




/*********************** EasyStore ES21 / V1864 - Backend Helper Fix ************************
  - ملف موحد: يحتوي إصلاحات ES18 + ES19 ويضيف رقم ES20 حتى لا تحتاج رفع ملفات ES14/ES15/ES16/ES18/ES19 القديمة.
  - الإصلاح الأساسي في هذا الباتش داخل Apps Script: accountingFindTemplateRow_.
**********************************************************************************************/
(function(){
  'use strict';
  window.EASYSTORE_VERSION = 'ES29 V1872 Invoice Comfort + Duplicate Guard';
  window.EASYSTORE_ES20_V1863_TEMPLATE_HELPER_FIX = true;
  function t(v){ return String(v == null ? '' : v); }
  function setVersion(){
    try { document.title='إيزي ستور مطبعجي ES28 V1871'; } catch(e){}
    try {
      document.querySelectorAll('.version-badge,.version,.app-version').forEach(function(el){
        el.textContent = 'ES29 V1872 Invoice Comfort + Duplicate Guard';
      });
      Array.from(document.querySelectorAll('h1,h2,.brand h1,.top h1,.topbar h2')).forEach(function(el){
        if(/إيزي|ستور|برنامج الحسابات|Easy|مدير الحسابات/i.test(t(el.textContent))){
          el.textContent = 'إيزي ستور مطبعجي - برنامج الحسابات ES25';
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
  window.EASYSTORE_VERSION = 'ES29 V1872 Invoice Comfort + Duplicate Guard';
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
    document.title='إيزي ستور مطبعجي ES28 V1871';
    document.querySelectorAll('.version-badge,.version,.app-version').forEach(function(el){ el.textContent = 'ES29 V1872 Invoice Comfort + Duplicate Guard'; });
    document.querySelectorAll('h1,h2,.brand h1,.top h1,.topbar h2').forEach(function(el){
      if(/إيزي|ستور|برنامج الحسابات|Easy/i.test(text(el.textContent))) el.textContent = 'إيزي ستور مطبعجي - برنامج الحسابات ES28';
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
  // ES25: disabled old polling interval;
})();


/*********************** EasyStore ES22 / V1865 - Kitchen Split Fix ************************
  فصل عرض مطبخ الحسابات:
  - تاب خامة أساسية يعرض الخامات/مصروفات التشغيل فقط.
  - تاب صنف بمكونات يعرض الأصناف/المنتجات فقط.
  - منع ظهور منتجات مثل قطعة/كارت/تابلوه داخل قائمة الخامات.
**********************************************************************************************/
(function(){
  'use strict';
  window.EASYSTORE_VERSION = 'ES29 V1872 Invoice Comfort + Duplicate Guard';
  window.EASYSTORE_ES22_V1865_KITCHEN_SPLIT_FIX = true;

  function text(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function norm(v){ return text(v).toLowerCase().replace(/[إأآا]/g,'ا').replace(/[ى]/g,'ي').replace(/[ةه]/g,'ه').replace(/[ؤ]/g,'و').replace(/[ئ]/g,'ي'); }
  function visible(el){ return !!(el && el.offsetParent !== null && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden'); }
  function setVersion(){
    try { document.title='إيزي ستور مطبعجي ES28 V1871'; } catch(e){}
    try {
      document.querySelectorAll('.version-badge,.version,.app-version').forEach(function(el){ el.textContent = 'ES29 V1872 Invoice Comfort + Duplicate Guard'; });
      document.querySelectorAll('h1,h2,.brand h1,.top h1,.topbar h2').forEach(function(el){
        if(/إيزي|ستور|برنامج الحسابات|Easy|مدير الحسابات/i.test(text(el.textContent))) el.textContent = 'إيزي ستور مطبعجي - برنامج الحسابات ES28';
      });
      var v = document.getElementById('es22Version');
      if(!v){ v = document.createElement('div'); v.id = 'es22Version'; document.body.appendChild(v); }
      v.textContent = 'ES28 V1871';
      v.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:99999;background:#111827;color:white;border-radius:999px;padding:6px 10px;font-size:11px;font-family:Tahoma,Arial,sans-serif;box-shadow:0 6px 16px rgba(0,0,0,.18)';
    } catch(e){}
  }

  var css = document.createElement('style');
  css.textContent = '.es22-hidden-row{display:none!important}.es22-filter-note{display:inline-flex;align-items:center;gap:6px;background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:800;margin:6px}.es22-filter-note.warn{background:#fff7ed;color:#9a3412;border-color:#fed7aa}';
  document.head.appendChild(css);

  function kitchenRoot(el){
    return (el && el.closest && el.closest('section,.card,.content,main')) || document.querySelector('main') || document.body;
  }

  function isKitchenContext(el){
    var root = kitchenRoot(el);
    var s = norm(text(root.textContent).slice(0,2500));
    return /مطبخ الحسابات|خامه اساسيه|خامة اساسية|صنف بمكونات|مكونات الصنف|خامة \/ مصروف تشغيل/.test(s);
  }

  function currentKitchenMode(table){
    var root = kitchenRoot(table);
    var rootText = norm(text(root.textContent).slice(0,3500));
    // أوضح علامة: عنوان الفورم الظاهر.
    var headings = Array.from(root.querySelectorAll('h1,h2,h3,h4,.section-title,.card-title,b,strong')).filter(visible).map(function(x){return norm(x.textContent);}).join(' ');
    if(/خامة \/ مصروف تشغيل|خامه \/ مصروف تشغيل|خامة اساسية|خامه اساسيه/.test(headings)) return 'material';
    if(/صنف بمكونات|مكونات الصنف|صنف بيع|منتج بمكونات/.test(headings)) return 'template';
    // لو فيه زر/تاب نشط.
    var activeTabs = Array.from(document.querySelectorAll('button.active,.tab.active,[role="tab"].active,.tabs button.active,.menu-item.active')).filter(visible).map(function(x){return norm(x.textContent);}).join(' ');
    if(/خامة اساسية|خامه اساسيه/.test(activeTabs)) return 'material';
    if(/صنف بمكونات|مكونات الصنف/.test(activeTabs)) return 'template';
    // fallback حسب الحقول الظاهرة في الفورم.
    if(/اسم الخامه|اسم الخامة|نوع الخامه|نوع الخامة|عرض الخام|طول الخام|حد النقص|قيمة التشغيل/.test(rootText) && !/اسم الصنف/.test(rootText)) return 'material';
    if(/اسم الصنف|تكلفة المكون|المارج اليدوي|سعر بيع رسمي/.test(rootText)) return 'template';
    return '';
  }

  function headers(table){
    var h = Array.from(table.querySelectorAll('thead th')).map(function(th){ return text(th.textContent); });
    if(h.length) return h;
    var first = table.querySelector('tr');
    return first ? Array.from(first.children).map(function(c){ return text(c.textContent); }) : [];
  }
  function headerIndex(h, pats){
    for(var i=0;i<h.length;i++){
      var x = norm(h[i]);
      for(var j=0;j<pats.length;j++) if(pats[j].test(x)) return i;
    }
    return -1;
  }
  function rowName(row, h){
    var cells = Array.from(row.children || []);
    var i = headerIndex(h,[/^الصنف$/, /^اسم الصنف$/, /^اسم البند$/, /^الخامة$/, /^اسم الخامه$/, /^اسم الخامة$/]);
    if(i >= 0 && cells[i]) return text(cells[i].textContent).replace(/تعديل|تفعيل|إيقاف|ايقاف|حذف/g,'').trim();
    var vals = cells.map(function(c){ return text(c.textContent).replace(/تعديل|تفعيل|إيقاف|ايقاف|حذف/g,'').trim(); }).filter(Boolean);
    return vals.find(function(v){ return !/^(طباعة|ليزر|مشترك|عام|مفعل|موقوف|نعم|لا|ج|%|\d+)$/.test(v); }) || '';
  }

  function classifyRow(row, h){
    var name = norm(rowName(row,h));
    var all = norm(text(row.textContent));
    var source = name + ' ' + all;
    // أي علامة منتج نهائي لها أولوية حتى لو الاسم يحتوي خامة زي لامينشن.
    if(/قطعه|قطعة|كارت|تابلوه|مج\b|استيكر|ستيكر|بروشور|فلاير|دعوه|دعوة|ماكيت|سنيور|درع|استاند|لوحه|لوحة|بند مشترك|تيشيرت|كاب|سبلميشن/.test(source)) return 'template';
    if(/صنف بيع|منتج|template|bom|مكونات/.test(source)) return 'template';
    if(/رول|حبر|باكيت|ورق|خامه|خامة|اكريلك|أكريليك|خشب|دابل|مصروف|كهرباء|ماكينه|ماكينة|تشغيل|لامينشن|raw|paper roll|lamination roll|ink|machine expense/.test(source)) return 'material';
    return 'unknown';
  }

  function isAccountingTable(table){
    var h = headers(table), hx = norm(h.join(' '));
    var ctx = norm(text((kitchenRoot(table)).textContent).slice(0,2500));
    return isKitchenContext(table) && (/الصنف|اسم الصنف|الخامة|اسم الخامة|القسم/.test(hx) || /الصنف|اسم الصنف|الخامة|اسم الخامة/.test(ctx));
  }

  function clearOldNotes(root){
    if(!root) return;
    root.querySelectorAll('.es22-filter-note').forEach(function(x){ x.remove(); });
  }

  function addNote(table, mode, hiddenCount){
    var root = kitchenRoot(table);
    if(!root || root.dataset.es22NoteAdded === mode + ':' + hiddenCount) return;
    clearOldNotes(root);
    root.dataset.es22NoteAdded = mode + ':' + hiddenCount;
    var note = document.createElement('span');
    note.className = 'es22-filter-note' + (hiddenCount ? ' warn' : '');
    note.textContent = mode === 'material' ? ('عرض الخامات فقط' + (hiddenCount ? ' - تم إخفاء ' + hiddenCount + ' صنف من هنا' : '')) : ('عرض الأصناف بمكوناتها فقط' + (hiddenCount ? ' - تم إخفاء ' + hiddenCount + ' خامة من هنا' : ''));
    var anchor = root.querySelector('h1,h2,h3,.section-title,.table-tools') || table;
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(note, anchor.nextSibling);
  }

  function applyKitchenSplit(){
    setVersion();
    document.querySelectorAll('table').forEach(function(table){
      if(!isAccountingTable(table)) return;
      var mode = currentKitchenMode(table);
      if(!mode) return;
      var h = headers(table);
      var hidden = 0;
      Array.from(table.querySelectorAll('tbody tr')).forEach(function(row){
        var cls = classifyRow(row,h);
        var shouldHide = (mode === 'material' && cls === 'template') || (mode === 'template' && cls === 'material');
        row.classList.toggle('es22-hidden-row', shouldHide);
        row.setAttribute('data-es22-record-type', cls);
        if(shouldHide) hidden++;
      });
      addNote(table, mode, hidden);
    });
  }

  document.addEventListener('click', function(){ setTimeout(applyKitchenSplit, 80); }, true);
  document.addEventListener('change', function(){ setTimeout(applyKitchenSplit, 80); }, true);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyKitchenSplit); else applyKitchenSplit();
  setTimeout(applyKitchenSplit, 300);
  setTimeout(applyKitchenSplit, 1200);
  // ES25: disabled old kitchen polling interval;
})();


/*********************** EasyStore ES23 / V1866 - Kitchen + Customer Picker Fix ************************
  - إضافة باكيت ورق paper pack لقائمة نوع الخامة مع تعريب الاختيارات.
  - إصلاح عرض الخامات الأساسية: الخامات تظهر في تاب خامة أساسية، والأصناف تظهر في صنف بمكونات فقط.
  - إصلاح اختيار العميل بالضغط في فواتير المبيعات.
  - إظهار مديونية العميل وتحميل أوردراته وحالة الأوردر المفتوح.
**********************************************************************************************/
(function(){
  'use strict';
  window.EASYSTORE_VERSION = 'ES29 V1872 Invoice Comfort + Duplicate Guard';
  window.EASYSTORE_ES24_V1866_KITCHEN_CUSTOMER_FIX = true;

  var qs = new URLSearchParams(location.search || '');
  var customerCache = [];
  var materialCache = [];
  var lastCustomerLoad = 0;
  var lastAccountingLoad = 0;

  function $(id){ return document.getElementById(id); }
  function text(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function norm(v){ return text(v).toLowerCase().replace(/[إأآا]/g,'ا').replace(/[ى]/g,'ي').replace(/[ةه]/g,'ه').replace(/[ؤ]/g,'و').replace(/[ئ]/g,'ي'); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function num(v){
    var s = String(v == null ? '' : v)
      .replace(/[٠-٩]/g,function(d){return {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'}[d]||d;})
      .replace(/[٬,]/g,'.').replace(/[^0-9.\-]/g,'');
    var n = parseFloat(s); return isFinite(n) ? n : 0;
  }
  function money(v){ return num(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' ج'; }
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
  function api(action,data){
    return new Promise(function(resolve,reject){
      var base = text(window.TREND_API_URL || window.API_URL || '');
      if(!base){ reject(new Error('TREND_API_URL missing')); return; }
      var cb = 'ES24_' + Date.now() + '_' + Math.floor(Math.random()*99999);
      var u = userData();
      var params = Object.assign({action:action,callback:cb,username:u.username||u.name,name:u.name||u.username,token:u.token||'',_ts:Date.now()}, data || {});
      var p = new URLSearchParams(params);
      var s = document.createElement('script'), done=false;
      function clean(){ if(done) return; done=true; try{delete window[cb];}catch(e){window[cb]=undefined;} if(s.parentNode) s.parentNode.removeChild(s); }
      window[cb] = function(r){ clean(); resolve(r || {}); };
      s.onerror = function(){ clean(); reject(new Error('server')); };
      s.src = base + (base.indexOf('?') < 0 ? '?' : '&') + p.toString();
      document.body.appendChild(s);
      setTimeout(function(){ if(!done){ clean(); reject(new Error('timeout')); } }, 25000);
    });
  }
  function toast(msg,bad){
    var m = $('es24Msg') || $('es16Msg') || $('mainMsg') || document.querySelector('.msg');
    if(m){ m.textContent = msg || ''; m.classList.toggle('error',!!bad); m.classList.toggle('ok',!!msg&&!bad); }
    else if(msg && bad){ console.warn(msg); }
  }

  var css = document.createElement('style');
  css.textContent = '.es24-customer-suggest{position:absolute;z-index:999999;background:#fff;border:1px solid #cbd5e1;border-radius:14px;box-shadow:0 18px 38px rgba(15,23,42,.18);max-height:260px;overflow:auto;min-width:280px;padding:6px;direction:rtl}.es24-customer-suggest button{display:block;width:100%;text-align:right;background:#fff;color:#0f172a;border:0;border-radius:10px;padding:10px 12px;cursor:pointer;font-weight:800}.es24-customer-suggest button:hover,.es24-customer-suggest button.active{background:#ecfdf5;color:#065f46}.es24-customer-suggest small{display:block;color:#64748b;font-weight:600;margin-top:3px}.es24-info{background:#ecfdf5;border:1px solid #a7f3d0;color:#064e3b;border-radius:14px;padding:10px 12px;margin:8px 0;font-weight:800;line-height:1.7}.es24-info.warn{background:#fff7ed;border-color:#fed7aa;color:#9a3412}.es24-info.danger{background:#fff1f2;border-color:#fecdd3;color:#991b1b}.es24-material-panel{background:#fff;border:1px solid #d8e4ea;border-radius:18px;padding:14px;margin:14px 0;box-shadow:0 8px 22px rgba(15,23,42,.06)}.es24-material-panel h4{margin:0 0 10px;color:#0f766e}.es24-table{width:100%;border-collapse:collapse}.es24-table th,.es24-table td{border:1px solid #e5edf5;padding:8px;text-align:right}.es24-table th{background:#f0fdf4;color:#065f46}.es24-money{direction:ltr;unicode-bidi:isolate;display:inline-block;font-variant-numeric:tabular-nums}.es24-version{position:fixed;left:10px;bottom:42px;z-index:99999;background:#065f46;color:#fff;border-radius:999px;padding:6px 10px;font:11px Tahoma,Arial;box-shadow:0 6px 14px rgba(0,0,0,.18)}';
  document.head.appendChild(css);

  function setVersion(){
    try{ document.title='إيزي ستور مطبعجي ES28 V1871'; }catch(e){}
    document.querySelectorAll('.version-badge,.version,.app-version').forEach(function(el){ el.textContent='ES29 V1872 Invoice Comfort + Duplicate Guard'; });
    document.querySelectorAll('h1,h2,.brand h1,.top h1,.topbar h2').forEach(function(el){
      if(/إيزي|ستور|برنامج الحسابات|Easy|مدير الحسابات/i.test(text(el.textContent))) el.textContent='إيزي ستور مطبعجي - برنامج الحسابات ES24';
    });
    var v=$('es24Version'); if(!v){ v=document.createElement('div'); v.id='es24Version'; v.className='es24-version'; document.body.appendChild(v); }
    v.textContent='ES24 V1867';
  }

  /************** Material type Arabic + paper pack **************/
  var typeMap = [
    ['raw','خامة عامة'],
    ['laser','خامة ليزر'],
    ['paper roll','رول ورق'],
    ['lamination roll','رول لامينشن'],
    ['ink','حبر'],
    ['machine expense','مصروف ماكينة'],
    ['paper pack','باكيت ورق']
  ];
  function labelTextFor(el){
    var s='';
    try{
      if(el.id){ var lab=document.querySelector('label[for="'+CSS.escape(el.id)+'"]'); if(lab) s += ' ' + lab.textContent; }
      var p=el.parentElement; if(p) s += ' ' + text(p.textContent).slice(0,300);
      var prev=el.previousElementSibling; if(prev) s += ' ' + prev.textContent;
    }catch(e){}
    return norm(s + ' ' + [el.id,el.name,el.placeholder,el.getAttribute('aria-label')].join(' '));
  }
  function isMaterialTypeSelect(sel){
    if(!sel || sel.tagName !== 'SELECT') return false;
    var meta = labelTextFor(sel);
    var opts = Array.from(sel.options||[]).map(function(o){return norm(o.value + ' ' + o.textContent);}).join(' ');
    return /نوع الخامه|نوع الخامة|material type|raw|paper roll|lamination roll|machine expense/.test(meta + ' ' + opts);
  }
  function enhanceMaterialTypeSelects(){
    document.querySelectorAll('select').forEach(function(sel){
      if(!isMaterialTypeSelect(sel)) return;
      var oldVal = sel.value;
      var existing = {};
      Array.from(sel.options).forEach(function(o){ existing[norm(o.value || o.textContent)] = o; });
      typeMap.forEach(function(pair){
        var val=pair[0], label=pair[1];
        var key=norm(val);
        var opt = existing[key] || Array.from(sel.options).find(function(o){return norm(o.textContent)===norm(label);});
        if(!opt){ opt = document.createElement('option'); opt.value=val; sel.appendChild(opt); }
        opt.value = val;
        opt.textContent = label;
      });
      if(oldVal){
        var found = Array.from(sel.options).some(function(o){ return o.value === oldVal; });
        if(found) sel.value = oldVal;
      }
      sel.dataset.es24MaterialTypeEnhanced='1';
      showPaperPackHint(sel);
    });
  }
  function showPaperPackHint(sel){
    if(!sel) return;
    var box = sel.closest('.field,div,label,td') || sel.parentElement;
    if(!box) return;
    var old = box.querySelector('.es24-paperpack-hint');
    if(sel.value === 'paper pack'){
      if(!old){
        old=document.createElement('div'); old.className='es24-paperpack-hint es24-info'; old.style.fontSize='12px';
        old.textContent='باكيت ورق: اكتب سعر الباكو في سعر/تكلفة الأصل، واكتب عدد الورق في الرصيد أو الملاحظات لحساب تكلفة الورقة.';
        box.appendChild(old);
      }
    } else if(old) old.remove();
  }
  document.addEventListener('change',function(ev){ if(isMaterialTypeSelect(ev.target)) showPaperPackHint(ev.target); },true);

  /************** Accounting/material cache and kitchen display **************/
  function materialName(r){ return text(r.materialName || r.name || r['اسم الخامة'] || r['الخامة'] || r['اسم الخامه']); }
  function materialDept(r){ return text(r.department || r['القسم'] || ''); }
  function materialType(r){ return text(r.materialType || r.type || r['نوع الخامة'] || r['نوع الخامه'] || r.unit || r['الوحدة'] || ''); }
  function materialCost(r){ return num(r.unitCost || r.cost || r.computedUnitCost || r['سعر/تكلفة الأصل'] || r['سعر الوحدة'] || r['تكلفة'] || 0); }
  function materialStock(r){ return num(r.stock || r.balance || r.currentStock || r['الرصيد'] || 0); }
  function isMaterialRecord(r){
    var n = norm(materialName(r));
    var t = norm(materialType(r));
    var src = n + ' ' + t + ' ' + norm(JSON.stringify(r).slice(0,500));
    if(!n) return false;
    if(/اسم الصنف|itemname|template|bom|صنف بيع/.test(src)) return false;
    if(/قطعه|قطعة|كارت|تابلوه|مج\b|استيكر|ستيكر|بروشور|فلاير|دعوه|دعوة|ماكيت|سنيور|درع|منتج بمكونات|صنف بمكونات/.test(src)) return false;
    return true;
  }
  async function loadAccountingMaterials(force){
    if(!force && Date.now()-lastAccountingLoad < 10000) return materialCache;
    lastAccountingLoad = Date.now();
    try{
      var r = await api('getAccounting',{});
      if(r && r.success && Array.isArray(r.materials)) materialCache = r.materials.filter(isMaterialRecord);
    }catch(e){}
    return materialCache;
  }
  function currentKitchenMode(){
    var textAll = norm(text(document.body.textContent).slice(0,5000));
    var active = Array.from(document.querySelectorAll('button.active,.tab.active,[role="tab"].active,.tabs button.active')).map(function(x){return norm(x.textContent);}).join(' ');
    if(/خامة اساسية|خامة أساسية|خامه اساسيه|خامة \/ مصروف تشغيل|خامه \/ مصروف تشغيل/.test(active)) return 'material';
    if(/صنف بمكونات|مكونات الصنف/.test(active)) return 'template';
    if(/مطبخ الحسابات/.test(textAll) && /خامة \/ مصروف تشغيل|اسم الخامة|اسم الخامه|نوع الخامة|نوع الخامه/.test(textAll) && !/صنف بمكونات/.test(active)) return 'material';
    return '';
  }
  function kitchenContainer(){ return Array.from(document.querySelectorAll('section,.card,main,.content')).find(function(el){return /مطبخ الحسابات/.test(text(el.textContent));}) || document.querySelector('main') || document.body; }
  function renderMaterialPanel(){
    var mode = currentKitchenMode();
    var root = kitchenContainer();
    var old = $('es24MaterialPanel');
    if(mode !== 'material') { if(old) old.remove(); return; }
    var data = materialCache || [];
    if(!data.length) return;
    if(!old){ old=document.createElement('div'); old.id='es24MaterialPanel'; old.className='es24-material-panel'; }
    old.innerHTML = '<h4>الخامات الأساسية المسجلة</h4><table class="es24-table"><thead><tr><th>الخامة</th><th>القسم</th><th>النوع</th><th>التكلفة</th><th>الرصيد</th></tr></thead><tbody>' + data.map(function(r){
      return '<tr><td>'+esc(materialName(r))+'</td><td>'+esc(materialDept(r))+'</td><td>'+esc(materialType(r))+'</td><td><span class="es24-money">'+esc(money(materialCost(r)))+'</span></td><td><span class="es24-money">'+esc(materialStock(r))+'</span></td></tr>';
    }).join('') + '</tbody></table>';
    var anchor = Array.from(root.querySelectorAll('table')).find(function(t){return /الخامة|القسم|التكلفة|الصنف/.test(text(t.textContent).slice(0,500));}) || null;
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(old, anchor);
    else root.appendChild(old);
  }
  function fixKitchenTables(){
    var mode = currentKitchenMode();
    if(!mode) return;
    document.querySelectorAll('table tbody tr').forEach(function(row){
      var s = norm(text(row.textContent));
      var templateLike = /قطعه|قطعة|كارت|تابلوه|مج\b|استيكر|ستيكر|بروشور|فلاير|دعوه|دعوة|ماكيت|سنيور|درع|صنف بمكونات|منتج بمكونات/.test(s);
      var materialLike = /رول|حبر|باكيت|ورق|خامه|خامة|اكريلك|أكريليك|خشب|دابل|مصروف|ماكينة|ماكينه|تشغيل|لامينشن|raw|paper roll|lamination roll|ink|machine expense|paper pack/.test(s);
      if(mode === 'material'){
        if(templateLike && !materialLike) row.classList.add('es22-hidden-row');
        else row.classList.remove('es22-hidden-row');
      }
      if(mode === 'template'){
        if(materialLike && !templateLike) row.classList.add('es22-hidden-row');
      }
    });
  }

  /************** Customer picker, debt and orders **************/
  function customerName(r){ return text(r.name || r.customerName || r.customer || r['اسم العميل'] || r['اسم الشات / المكتب']); }
  function customerPhone(r){ return text(r.phone || r.mobile || r.extraPhone || r.customerPhone || r['رقم العميل'] || ''); }
  function customerCode(r){ return text(r.customerCode || r.code || r['كود الشات'] || r['كود العميل'] || ''); }
  function customerDebt(r){ return num(r.currentBalance || r.balance || r.debt || r.remainingBalance || r.customerDebt || r['مديونية'] || r['رصيد العميل'] || 0); }
  async function loadCustomers(force){
    if(!force && customerCache.length && Date.now()-lastCustomerLoad < 30000) return customerCache;
    lastCustomerLoad = Date.now();
    try{
      var r = await api('getEasyStoreCustomers',{limit:500});
      if(r && r.success && Array.isArray(r.customers)) customerCache = r.customers;
    }catch(e){}
    return customerCache;
  }
  function matchCustomers(q){
    q = norm(q);
    if(!q) return [];
    return customerCache.filter(function(r){
      var blob = norm([customerName(r), customerPhone(r), customerCode(r), r.type, r.manager].join(' '));
      return blob.indexOf(q) >= 0;
    }).sort(function(a,b){
      var an = norm(customerName(a)), bn = norm(customerName(b));
      var ar = an.indexOf(q) === 0 ? 0 : 1, br = bn.indexOf(q) === 0 ? 0 : 1;
      return ar-br || an.localeCompare(bn);
    }).slice(0,10);
  }
  function isSalesInvoiceScope(el){
    var scope = (el && el.closest && el.closest('section,.card,main,.content')) || document.body;
    var s = norm(text(scope.textContent).slice(0,2500));
    return /فاتوره مبيعات|فاتورة مبيعات|مبيعات موحده|مبيعات موحدة|رقم الفاتوره|رقم الفاتورة/.test(s);
  }
  function isCustomerInput(el){
    if(!el || el.tagName !== 'INPUT') return false;
    var meta = labelTextFor(el);
    return /عميل|customer|client/.test(meta) && !/مورد|supplier/.test(meta) && isSalesInvoiceScope(el);
  }
  function ensureSuggestBox(input){
    var box = input._es24Suggest;
    if(box && document.body.contains(box)) return box;
    var p = input.parentElement || input.closest('div') || document.body;
    if(p !== document.body) p.style.position = p.style.position || 'relative';
    box = document.createElement('div'); box.className='es24-customer-suggest'; box.style.display='none';
    if(p !== document.body) p.appendChild(box); else document.body.appendChild(box);
    input._es24Suggest = box;
    return box;
  }
  function renderCustomerSuggestions(input){
    var q = text(input.value);
    var box = ensureSuggestBox(input);
    if(q.length < 1){ box.style.display='none'; return; }
    var rows = matchCustomers(q);
    if(!rows.length){ box.innerHTML='<button type="button" disabled>لا يوجد عميل مطابق</button>'; box.style.display='block'; return; }
    box.innerHTML = rows.map(function(r,i){
      var d = customerDebt(r);
      return '<button type="button" data-es24-customer-index="'+i+'"><b>'+esc(customerName(r))+'</b><small>'+esc(customerPhone(r)||customerCode(r)||'')+(d?(' — مديونية: '+esc(money(d))):'')+'</small></button>';
    }).join('');
    box.style.display='block';
    Array.from(box.querySelectorAll('button[data-es24-customer-index]')).forEach(function(btn){
      btn.addEventListener('pointerdown',function(ev){ ev.preventDefault(); ev.stopPropagation(); selectCustomer(input, rows[Number(btn.dataset.es24CustomerIndex)]); },true);
      btn.addEventListener('mousedown',function(ev){ ev.preventDefault(); ev.stopPropagation(); },true);
      btn.addEventListener('click',function(ev){ ev.preventDefault(); ev.stopPropagation(); selectCustomer(input, rows[Number(btn.dataset.es24CustomerIndex)]); },true);
    });
  }
  function findOrderField(scope){
    var candidates = Array.from(scope.querySelectorAll('input,select')).filter(function(el){
      var m = labelTextFor(el);
      return /رقم الاوردر|رقم الأوردر|order/.test(m);
    });
    return candidates[0] || null;
  }
  function infoPanel(scope){
    var p = scope.querySelector('#es24CustomerInvoiceInfo,.es24-customer-invoice-info');
    if(!p){
      p = document.createElement('div'); p.id='es24CustomerInvoiceInfo'; p.className='es24-info es24-customer-invoice-info';
      var anchor = Array.from(scope.querySelectorAll('input')).find(isCustomerInput) || scope.querySelector('input,select,button');
      if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(p, anchor.parentNode.nextSibling);
      else scope.insertBefore(p, scope.firstChild);
    }
    return p;
  }
  function fillCustomerFields(scope,r){
    var name=customerName(r), phone=customerPhone(r), code=customerCode(r), debt=customerDebt(r);
    scope.querySelectorAll('input').forEach(function(el){
      var m = labelTextFor(el);
      if(/عميل|customer|client/.test(m) && !/مورد|supplier/.test(m)) el.value = name;
      if(code && /كود|code/.test(m) && !/اوردر|أوردر|order/.test(m)) el.value = code;
      if(phone && /تليفون|هاتف|موبايل|phone|mobile/.test(m)) el.value = phone;
      if(/مديونيه|مديونية|رصيد|balance|debt/.test(m)) el.value = debt ? money(debt).replace(' ج','') : '0';
    });
  }
  function selectCustomer(input,r){
    if(!r) return;
    var scope = input.closest('section,.card,main,.content') || document.body;
    var box=input._es24Suggest; if(box) box.style.display='none';
    input.value = customerName(r);
    input.dataset.es24CustomerSelected = '1';
    input.dataset.customerName = customerName(r);
    input.dataset.customerPhone = customerPhone(r);
    input.dataset.customerCode = customerCode(r);
    input.dataset.customerDebt = customerDebt(r);
    fillCustomerFields(scope,r);
    showCustomerDebtAndOrders(scope,r);
    try{ input.dispatchEvent(new Event('change',{bubbles:true})); }catch(e){}
  }
  async function getEmployeeRows(){
    var all=[];
    var seen={};
    async function one(screen){
      try{
        var r=await api('getRows',{screen:screen||'service'});
        if(r && r.success && Array.isArray(r.rows)){
          r.rows.forEach(function(x){ var key=text(x.orderId||x['رقم الأوردر']||'')+'|'+text(x.lineId||x['رقم البند']||'')+'|'+text(x.itemName||x['اسم البند']||''); if(!seen[key]){seen[key]=1; all.push(x);} });
        }
      }catch(e){}
    }
    await one('service'); await one('print'); await one('laser');
    return all;
  }
  function orderIdOf(r){ return text(r.orderId || r['رقم الأوردر'] || r.orderNo || r['رقم الطلب']); }
  function statusOf(r){ return text(r.status || r['الحالة']); }
  function isOpenStatus(st){ st=norm(st); return st && !/تم التسليم|ملغى|ملغي|مكرر|تم التقفيل|مقفول/.test(st); }
  async function showCustomerDebtAndOrders(scope,customer){
    var panel = infoPanel(scope);
    var debt = customerDebt(customer);
    panel.className = 'es24-info' + (debt>0 ? ' warn' : '');
    panel.innerHTML = 'العميل: <b>'+esc(customerName(customer))+'</b> — المديونية الحالية: <span class="es24-money"><b>'+esc(money(debt))+'</b></span><br>جاري تحميل أوردرات العميل...';
    var rows = await getEmployeeRows();
    var nameKey = norm(customerName(customer));
    var phoneKey = norm(customerPhone(customer));
    var codeKey = norm(customerCode(customer));
    var ordersMap = {};
    rows.forEach(function(r){
      var blob = norm([r.customer,r.customerName,r['اسم العميل'],r['اسم الشات / المكتب'],r.phone,r.customerPhone,r.customerCode,r['كود الشات'],r['كود العميل']].join(' '));
      var ok = (nameKey && blob.indexOf(nameKey)>=0) || (phoneKey && blob.indexOf(phoneKey)>=0) || (codeKey && blob.indexOf(codeKey)>=0);
      if(!ok) return;
      var oid = orderIdOf(r); if(!oid) return;
      if(!ordersMap[oid]) ordersMap[oid] = {orderId:oid, statuses:[], items:0, open:false};
      var st=statusOf(r); if(st) ordersMap[oid].statuses.push(st);
      ordersMap[oid].items++;
      if(isOpenStatus(st)) ordersMap[oid].open = true;
    });
    var orders = Object.keys(ordersMap).map(function(k){return ordersMap[k];});
    var orderField = findOrderField(scope);
    if(!orders.length){
      if(orderField) orderField.value = '';
      panel.className = 'es24-info';
      panel.innerHTML = 'العميل: <b>'+esc(customerName(customer))+'</b> — المديونية الحالية: <span class="es24-money"><b>'+esc(money(debt))+'</b></span><br><b>مفيش أوردر لهذا العميل.</b>';
      return;
    }
    var open = orders.filter(function(o){return o.open;});
    var selected = open[0] || orders[0];
    if(orderField){
      if(orderField.tagName === 'SELECT'){
        var old = orderField.value;
        orderField.innerHTML = orders.map(function(o){return '<option value="'+esc(o.orderId)+'">'+esc(o.orderId + (o.open?' — مفتوح':' — غير مفتوح'))+'</option>';}).join('');
        orderField.value = selected.orderId || old;
      } else {
        orderField.value = selected.orderId;
      }
    }
    if(open.length){
      panel.className = 'es24-info warn';
      panel.innerHTML = 'العميل: <b>'+esc(customerName(customer))+'</b> — المديونية الحالية: <span class="es24-money"><b>'+esc(money(debt))+'</b></span><br><b>الأوردر مازال مفتوح:</b> '+open.map(function(o){return esc(o.orderId);}).join(' / ');
    } else {
      panel.className = 'es24-info';
      panel.innerHTML = 'العميل: <b>'+esc(customerName(customer))+'</b> — المديونية الحالية: <span class="es24-money"><b>'+esc(money(debt))+'</b></span><br>تم تحميل أوردرات العميل: '+orders.map(function(o){return esc(o.orderId);}).join(' / ');
    }
  }
  function hydrateCustomerInputs(){
    document.querySelectorAll('input').forEach(function(input){
      if(!isCustomerInput(input)) return;
      if(input.dataset.es24CustomerPicker) return;
      input.dataset.es24CustomerPicker = '1';
      input.setAttribute('autocomplete','off');
      input.addEventListener('input',function(){ loadCustomers(false).then(function(){ renderCustomerSuggestions(input); }); });
      input.addEventListener('focus',function(){ loadCustomers(false).then(function(){ renderCustomerSuggestions(input); }); });
      input.addEventListener('keydown',function(ev){
        if(ev.key === 'Enter'){
          var matches = matchCustomers(input.value);
          if(matches[0]){ ev.preventDefault(); selectCustomer(input,matches[0]); }
        }
      },true);
      input.addEventListener('blur',function(){ setTimeout(function(){ if(input._es24Suggest) input._es24Suggest.style.display='none'; },180); });
    });
  }

  async function tick(){
    setVersion();
    enhanceMaterialTypeSelects();
    hydrateCustomerInputs();
    fixKitchenTables();
    await loadAccountingMaterials(false);
    renderMaterialPanel();
  }
  document.addEventListener('click',function(){ setTimeout(tick,100); },true);
  document.addEventListener('change',function(){ setTimeout(tick,100); },true);
  document.addEventListener('input',function(){ setTimeout(function(){ enhanceMaterialTypeSelects(); hydrateCustomerInputs(); },50); },true);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',tick); else tick();
  setTimeout(tick,500);
  setTimeout(function(){ loadCustomers(true).then(tick); loadAccountingMaterials(true).then(tick); },1200);
  // ES24: تم إلغاء التحديث التلقائي المتكرر. التحديث يتم بعد كل إجراء فقط.

  /************** ES24 - فاتورة القسم بنظام صفوف مثل الشيت **************/
  var deptItemsCache = [];
  var lastDeptItemsLoad = 0;

  function itemNameOf(r){ return text(r.itemName || r.templateName || r.productName || r.name || r['اسم الصنف'] || r['الصنف'] || r['اسم البند'] || ''); }
  function itemDeptOf(r){ return text(r.department || r['القسم'] || r.dept || ''); }
  function itemSaleOf(r){ return num(r.salePrice || r.officialSalePrice || r.price || r['سعر البيع'] || r['سعر بيع رسمي'] || r['سعر بيع مقترح'] || r['البيع'] || 0); }
  function itemActiveOf(r){ var a=text(r.active || r.status || r['الحالة'] || 'نعم'); return !/لا|موقوف|متوقف|inactive|false|0/i.test(a); }
  function itemKeyOf(r){ return text(r.id || r.ID || r.code || r.itemCode || r.templateCode || r['كود الصنف'] || itemNameOf(r)); }
  function isProductRecord(r){
    var n=norm(itemNameOf(r)); if(!n) return false;
    var blob = norm(JSON.stringify(r).slice(0,900));
    // سجلات الخامات تستبعد من فاتورة القسم
    if(/materialname|اسم الخامة|اسم الخامه|نوع الخامة|نوع الخامه|unitcost|سعر الوحدة|raw|paper roll|lamination roll|machine expense|باكيت ورق|حبر|رول ورق|رول لامينشن/.test(blob) && !/itemname|اسم الصنف|اسم البند|template/.test(blob)) return false;
    // المنتجات أو البنود النهائية
    if(/itemname|اسم الصنف|اسم البند|template|bom|صنف|منتج|كارت|تابلوه|مج|قطعة|استيكر|رول طباعة/.test(blob+n)) return true;
    return !!itemSaleOf(r);
  }
  async function loadDeptItems(force){
    if(!force && deptItemsCache.length && Date.now()-lastDeptItemsLoad < 60000) return deptItemsCache;
    lastDeptItemsLoad = Date.now();
    var out=[];
    try{
      var r = await api('getAccounting',{});
      if(r && r.success){
        var pools=[];
        if(Array.isArray(r.templates)) pools=pools.concat(r.templates);
        if(Array.isArray(r.items)) pools=pools.concat(r.items);
        if(Array.isArray(r.products)) pools=pools.concat(r.products);
        var seen={};
        pools.forEach(function(x){
          if(!isProductRecord(x) || !itemActiveOf(x)) return;
          var key=norm(itemKeyOf(x)); if(seen[key]) return; seen[key]=1;
          out.push({key:itemKeyOf(x), name:itemNameOf(x), dept:itemDeptOf(x)||'عام', sale:itemSaleOf(x), raw:x});
        });
      }
    }catch(e){}
    // fallback من جدول الأصناف الظاهر لو السيرفر لم يرجع templates
    if(!out.length){
      Array.from(document.querySelectorAll('table tbody tr')).forEach(function(tr){
        var s=norm(tr.textContent);
        if(!/طباعة|ليزر|مشترك|عام/.test(s)) return;
        if(/خامة|خامات|raw|paper roll|lamination/.test(s) && !/كارت|تابلوه|مج|صنف|قطعة/.test(s)) return;
        var cells=Array.from(tr.cells||[]).map(function(td){return text(td.textContent).trim();});
        var name=cells.find(function(v){return v && !/طباعة|ليزر|مشترك|عام|مفعل|موقوف|%|ج\s*$/.test(v);}) || '';
        var dept=cells.find(function(v){return /طباعة|ليزر|مشترك|عام/.test(v);}) || 'عام';
        var sale=0; cells.forEach(function(v){ var n=num(v); if(n>sale) sale=n; });
        if(name) out.push({key:name,name:name,dept:dept,sale:sale,raw:{}});
      });
    }
    deptItemsCache = out;
    return out;
  }

  function isDeptInvoiceScope(scope){
    if(!scope) return false;
    var s=norm(text(scope.textContent).slice(0,2600));
    return /فاتورة القسم|تسجيل البند|فاتوره القسم|بند مشترك|ملاحظات القسم/.test(s);
  }
  function currentDeptInvoiceScope(){
    var candidates=Array.from(document.querySelectorAll('.modal,.modal-card,section,.card,main,.content')).filter(function(x){return isDeptInvoiceScope(x) && x.offsetParent!==null;});
    return candidates[0] || null;
  }
  function inferDeptFromScope(scope){
    var s=norm(text(scope.textContent).slice(0,2000));
    var u=userData();
    var d=norm(u.department||'');
    if(/laser|ليزر|جابر/.test(d+s)) return 'ليزر';
    if(/print|طباعة|وائل/.test(d+s)) return 'طباعة';
    var sel=Array.from(scope.querySelectorAll('select,input')).find(function(el){return /القسم|department/.test(labelTextFor(el));});
    if(sel && /طباعة|ليزر|مشترك|عام/.test(text(sel.value))) return text(sel.value);
    return '';
  }
  function findFieldByLabel(scope,rx){
    return Array.from(scope.querySelectorAll('input,select,textarea')).find(function(el){return rx.test(labelTextFor(el));}) || null;
  }
  function buildItemOptions(items,dept){
    var d=norm(dept||'');
    var filtered=items.filter(function(it){var id=norm(it.dept); return !d || !id || id===d || /مشترك|عام/.test(id);});
    if(!filtered.length) filtered=items;
    return '<option value="">اختار الصنف</option>'+filtered.map(function(it){
      return '<option value="'+esc(it.key)+'" data-sale="'+esc(it.sale)+'" data-dept="'+esc(it.dept)+'">'+esc(it.name+(it.dept?' — '+it.dept:''))+'</option>';
    }).join('');
  }
  function rowHtml(items,dept){
    return '<tr class="es24-invoice-row">'+
      '<td><select class="es24-row-item">'+buildItemOptions(items,dept)+'</select></td>'+
      '<td><input class="es24-row-kind" placeholder="ملاحظة/نوع إضافي"></td>'+
      '<td><input class="es24-row-qty" type="number" min="0" step="1" value="1"></td>'+
      '<td><input class="es24-row-price" type="number" min="0" step="0.01" value="0"></td>'+
      '<td><label class="es24-check"><input class="es24-row-shared" type="checkbox"> مشترك</label></td>'+
      '<td><button type="button" class="es24-row-del">حذف</button></td>'+
    '</tr>';
  }
  function ensureDeptInvoiceRows(scope,items){
    if(!scope || scope.dataset.es24RowsReady) return;
    scope.dataset.es24RowsReady='1';
    var dept=inferDeptFromScope(scope);
    // إخفاء تدفق إضافة صنف القديم
    Array.from(scope.querySelectorAll('button')).forEach(function(b){
      var t=norm(b.textContent);
      if(/اضافه صنف|إضافة صنف|اضافة صنف|إضافة بند|اضافه بند|تسجيل كل الصفوف|تفريغ الصفوف/.test(t)) b.classList.add('es24-legacy-hidden');
    });
    Array.from(scope.querySelectorAll('h3,h4,div,section')).forEach(function(el){
      var t=norm(text(el.textContent).slice(0,300));
      if(/بنود الفاتورة قبل التسجيل/.test(t)) el.classList.add('es24-legacy-hidden');
    });
    var holder=document.createElement('div'); holder.className='es24-rows-box';
    holder.innerHTML = '<h4>بنود فاتورة القسم</h4><div class="es24-mini">اكتب الصف واضغط Enter أو Tab في آخر خانة لفتح صف جديد. في الآخر اضغط تسجيل الفاتورة.</div>'+
      '<table class="es24-rows-table"><thead><tr><th>الصنف</th><th>نوع/ملاحظات</th><th>الكمية</th><th>سعر الفاتورة</th><th>مشترك</th><th></th></tr></thead><tbody>'+rowHtml(items,dept)+'</tbody></table>'+
      '<div class="es24-total">الإجمالي: <b class="es24-total-val">0.00 ج</b></div>'+
      '<div class="es24-actions"><button type="button" class="es24-add-row">صف جديد</button><button type="button" class="es24-save-all">تسجيل الفاتورة</button><button type="button" class="es24-clear">تفريغ</button></div><div class="es24-msg"></div>';
    var anchor = Array.from(scope.querySelectorAll('label,b,strong,h3')).find(function(el){return /ملاحظات القسم|بند مشترك|سعر الفاتورة/.test(norm(el.textContent));});
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(holder, anchor.parentNode.nextSibling); else scope.appendChild(holder);
    bindRows(scope,items,dept);
    updateRowsTotal(scope);
  }
  function bindRows(scope,items,dept){
    var tbody=scope.querySelector('.es24-rows-table tbody'); if(!tbody) return;
    function addRow(){ tbody.insertAdjacentHTML('beforeend', rowHtml(items,dept)); bindRows(scope,items,dept); updateRowsTotal(scope); var sel=tbody.querySelector('tr:last-child .es24-row-item'); if(sel) sel.focus(); }
    scope.querySelector('.es24-add-row').onclick=addRow;
    scope.querySelector('.es24-clear').onclick=function(){ tbody.innerHTML=rowHtml(items,dept); bindRows(scope,items,dept); updateRowsTotal(scope); };
    scope.querySelector('.es24-save-all').onclick=function(){ saveDeptInvoiceRows(scope); };
    Array.from(tbody.querySelectorAll('tr')).forEach(function(tr){
      if(tr.dataset.bound) return; tr.dataset.bound='1';
      var sel=tr.querySelector('.es24-row-item'), qty=tr.querySelector('.es24-row-qty'), price=tr.querySelector('.es24-row-price'), kind=tr.querySelector('.es24-row-kind'), del=tr.querySelector('.es24-row-del');
      if(sel) sel.onchange=function(){ var op=sel.options[sel.selectedIndex]; if(op && Number(op.dataset.sale)>0 && price && !Number(price.value)) price.value=Number(op.dataset.sale).toFixed(2); updateRowsTotal(scope); };
      [qty,price].forEach(function(el){ if(el) el.oninput=function(){updateRowsTotal(scope);}; });
      [sel,kind,qty,price].forEach(function(el,idx,arr){ if(!el) return; el.addEventListener('keydown',function(ev){
        if((ev.key==='Enter') || (ev.key==='Tab' && idx===arr.length-1)){
          if(idx===arr.length-1){ ev.preventDefault(); addRow(); }
        }
      });});
      if(del) del.onclick=function(){ if(tbody.children.length>1) tr.remove(); else tr.querySelectorAll('input').forEach(function(i){ if(i.type==='checkbox') i.checked=false; else i.value=i.classList.contains('es24-row-qty')?'1':''; }); updateRowsTotal(scope); };
    });
  }
  function collectDeptInvoiceRows(scope){
    return Array.from(scope.querySelectorAll('.es24-invoice-row')).map(function(tr){
      var sel=tr.querySelector('.es24-row-item'); var op=sel && sel.options[sel.selectedIndex];
      var name=op ? text(op.textContent).replace(/\s+—\s+(طباعة|ليزر|مشترك|عام).*$/,'') : '';
      return {key:text(sel&&sel.value), itemName:name, department:text(op&&op.dataset.dept)||inferDeptFromScope(scope)||'', qty:num(tr.querySelector('.es24-row-qty')&&tr.querySelector('.es24-row-qty').value)||0, price:num(tr.querySelector('.es24-row-price')&&tr.querySelector('.es24-row-price').value)||0, kind:text(tr.querySelector('.es24-row-kind')&&tr.querySelector('.es24-row-kind').value), shared:(tr.querySelector('.es24-row-shared')||{}).checked};
    }).filter(function(r){return r.itemName && r.qty>0;});
  }
  function updateRowsTotal(scope){
    var total=collectDeptInvoiceRows(scope).reduce(function(s,r){return s+(r.qty*r.price);},0);
    var v=scope.querySelector('.es24-total-val'); if(v) v.textContent=money(total);
  }
  async function saveDeptInvoiceRows(scope){
    var msg=scope.querySelector('.es24-msg'); function say(t,b){ if(msg){msg.textContent=t; msg.className='es24-msg '+(b?'bad':'ok');} }
    var rows=collectDeptInvoiceRows(scope);
    if(!rows.length){ say('اكتب بند واحد على الأقل قبل التسجيل.',true); return; }
    var customer = text((findFieldByLabel(scope,/اسم العميل|العميل|customer/)||{}).value);
    var orderId = text((findFieldByLabel(scope,/رقم الاوردر|رقم الأوردر|order/)||{}).value);
    if(!orderId){ say('رقم الأوردر مطلوب قبل تسجيل فاتورة القسم.',true); return; }
    say('جاري تسجيل '+rows.length+' صف...',false);
    var ok=0, fail=[];
    for(var i=0;i<rows.length;i++){
      var r=rows[i];
      try{
        var res=await api('saveAccountingDeptLine',{orderId:orderId,customerName:customer,department:r.department,itemName:r.itemName,itemType:r.kind,qty:r.qty,salePrice:r.price,notes:(r.kind||'')+(r.shared?' | بند مشترك':''),shared:r.shared?'نعم':'لا'});
        if(res && res.success) ok++; else fail.push(r.itemName+': '+(res&&res.message||'فشل الحفظ'));
      }catch(e){ fail.push(r.itemName+': خطأ اتصال'); }
    }
    if(fail.length){ say('تم تسجيل '+ok+' صف، وفشل: '+fail.join(' / '),true); }
    else { say('تم تسجيل كل صفوف فاتورة القسم بنجاح.',false); try{ scope.dispatchEvent(new Event('change',{bubbles:true})); }catch(e){} }
  }
  async function hydrateDeptInvoiceRows(force){
    var scope=currentDeptInvoiceScope(); if(!scope) return;
    var items=await loadDeptItems(force);
    ensureDeptInvoiceRows(scope,items);
    if(!items.length){
      var msg=scope.querySelector('.es24-msg'); if(msg){msg.textContent='لا توجد أصناف مفعلة لهذا القسم. احفظ الأصناف أولاً من مطبخ الحسابات / صنف بمكونات.'; msg.className='es24-msg bad';}
    }
  }
  var css24=document.createElement('style');
  css24.textContent='.es24-legacy-hidden{display:none!important}.es24-rows-box{background:#fff;border:1px solid #d6eee7;border-radius:18px;padding:12px;margin:12px 0;box-shadow:0 8px 22px rgba(15,23,42,.06)}.es24-rows-box h4{margin:0 0 8px;color:#0f766e}.es24-mini{font-size:12px;color:#64748b;margin-bottom:8px}.es24-rows-table{width:100%;border-collapse:collapse}.es24-rows-table th,.es24-rows-table td{border:1px solid #e5edf5;padding:7px;text-align:right}.es24-rows-table th{background:#ecfdf5;color:#065f46}.es24-rows-table input,.es24-rows-table select{width:100%;min-height:38px;border:1px solid #cad9e0;border-radius:10px;padding:7px}.es24-check{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800}.es24-check input{width:18px;height:18px}.es24-row-del{background:#fee2e2!important;color:#991b1b!important;border:1px solid #fecaca!important;border-radius:10px;padding:7px 10px}.es24-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.es24-actions button{border:0;border-radius:12px;padding:10px 14px;font-weight:900;cursor:pointer}.es24-add-row{background:#eef6f5;color:#0f6f5c}.es24-save-all{background:#0f8a70;color:white}.es24-clear{background:#fee2e2;color:#991b1b}.es24-total{margin-top:10px;font-weight:900;color:#0f172a}.es24-total-val{direction:ltr;unicode-bidi:isolate}.es24-msg{margin-top:8px;min-height:22px;font-weight:800}.es24-msg.ok{color:#047857}.es24-msg.bad{color:#b91c1c}@media(max-width:760px){.es24-rows-table,.es24-rows-table tbody,.es24-rows-table tr,.es24-rows-table td{display:block;width:100%}.es24-rows-table thead{display:none}.es24-rows-table tr{border:1px solid #e5edf5;border-radius:14px;margin-bottom:10px;padding:8px}.es24-rows-table td{border:0}}';
  document.head.appendChild(css24);

  // حدث بعد فتح المودال أو أي تغيير، بدون polling مزعج.
  document.addEventListener('click',function(){ setTimeout(function(){hydrateDeptInvoiceRows(false);},120);},true);
  document.addEventListener('change',function(){ setTimeout(function(){hydrateDeptInvoiceRows(true);},120);},true);
  setTimeout(function(){hydrateDeptInvoiceRows(true);},800);

})();



/*********************** EasyStore ES25 / V1868 - Clean Single Loader Guard ***********************
  نسخة نظيفة: ملف app.js واحد فقط + config/styles/theme.
  - تثبيت رقم النسخة ومنع تقليب ES19/ES22/ES24.
  - منع التحديث التلقائي المزعج.
  - إظهار الخامات في خامة أساسية، والأصناف في صنف بمكونات.
  - تجهيز قوائم الصنف في فاتورة القسم بعد الحفظ/التعديل.
**********************************************************************************************/
(function(){
  'use strict';
  var VERSION = 'ES29 V1872 Invoice Comfort + Duplicate Guard';
  window.EASYSTORE_VERSION = VERSION;
  window.EASYSTORE_AUTO_REFRESH = false;
  window.EASYSTORE_CLEAN_SINGLE_LOADER = true;

  function text(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function norm(v){ return text(v).toLowerCase().replace(/[إأآا]/g,'ا').replace(/[ى]/g,'ي').replace(/[ةه]/g,'ه').replace(/[ؤ]/g,'و').replace(/[ئ]/g,'ي'); }
  function num(v){ var n=parseFloat(String(v==null?'':v).replace(/[٠-٩]/g,function(d){return {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'}[d]||d;}).replace(/[٬,]/g,'.').replace(/[^0-9.\-]/g,'')); return isFinite(n)?n:0; }
  function money(v){ return num(v).toFixed(2) + ' ج'; }
  function percent(v){ return num(v).toFixed(2) + '%'; }
  function $(id){ return document.getElementById(id); }

  function setVersion(){
    try{ document.title='إيزي ستور مطبعجي ES28 V1871'; }catch(e){}
    try{
      window.EASYSTORE_VERSION = VERSION;
      document.querySelectorAll('.version-badge,.version,.app-version').forEach(function(el){
        el.textContent = VERSION;
      });
      Array.from(document.querySelectorAll('h1,h2,.brand h1,.top h1,.topbar h2')).forEach(function(el){
        var s = text(el.textContent);
        if(/إيزي|ستور|برنامج الحسابات|مدير الحسابات|Easy/i.test(s)){
          if(/مطبخ الحسابات|الأصناف|فاتورة|العملاء|الموردين/.test(s)) return;
          el.textContent = 'إيزي ستور مطبعجي - برنامج الحسابات ES25';
        }
      });
    }catch(e){}
  }

  function patchMaterialTypeLabels(){
    var labels = {
      raw:'خامة عامة',
      laser:'خامة ليزر',
      'paper roll':'رول ورق',
      'lamination roll':'رول لامينشن',
      ink:'حبر',
      'machine expense':'مصروف ماكينة',
      'paper pack':'باكيت ورق'
    };
    document.querySelectorAll('select').forEach(function(sel){
      var near = norm((sel.closest('label,div,td,section,form')||{}).textContent || '');
      var isType = /نوع الخامه|نوع الخامة|material type|raw|paper roll|lamination/.test(near);
      if(!isType) return;
      var existing = {};
      Array.from(sel.options).forEach(function(o){ existing[norm(o.value||o.textContent)] = true; });
      Object.keys(labels).forEach(function(v){
        if(!existing[norm(v)] && !existing[norm(labels[v])]){
          var opt = document.createElement('option');
          opt.value = v;
          opt.textContent = labels[v];
          sel.appendChild(opt);
        }
      });
      Array.from(sel.options).forEach(function(o){
        var key = norm(o.value || o.textContent);
        Object.keys(labels).forEach(function(v){
          if(key === norm(v) || key === norm(labels[v])) o.textContent = labels[v];
        });
      });
    });
  }

  function formatMoneyCells(){
    document.querySelectorAll('td,span,b,input').forEach(function(el){
      if(el.tagName === 'INPUT') return;
      var s = text(el.textContent);
      if(!s) return;
      // لا نغير النصوص الطويلة.
      if(s.length > 18) return;
      if(/^[0-9٠-٩]+(?:[.,][0-9٠-٩]+)?\s*ج$/.test(s) || /^[0-9٠-٩]+(?:[.,][0-9٠-٩]+)?$/.test(s)){
        if(s.indexOf('%') === -1 && /ج/.test(s)){
          el.textContent = money(s);
          el.dir = 'ltr';
          el.style.unicodeBidi = 'isolate';
        }
      }
    });
  }

  function stopOldAutoRefresh(){
    try{ if(window.EASYSTORE_AUTO_REFRESH !== false) window.EASYSTORE_AUTO_REFRESH = false; }catch(e){}
  }

  function tick(){
    setVersion();
    stopOldAutoRefresh();
    patchMaterialTypeLabels();
    formatMoneyCells();
  }

  document.addEventListener('click',function(){ setTimeout(tick,80); },true);
  document.addEventListener('change',function(){ setTimeout(tick,80); },true);
  document.addEventListener('input',function(){ setTimeout(patchMaterialTypeLabels,80); },true);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',tick); else tick();
  setTimeout(tick,250);
  setTimeout(tick,1200);
})();


/*********************** EasyStore ES28 / V1869 - Cache Killer & Version Lock ************************/
(function(){
  'use strict';
  var LOCK_VERSION = 'ES29 V1872 Invoice Comfort + Duplicate Guard';
  var SHORT_VERSION = 'ES28 V1871';
  try{
    Object.defineProperty(window, 'EASYSTORE_VERSION', { configurable:true, get:function(){return LOCK_VERSION;}, set:function(){} });
  }catch(e){ window.EASYSTORE_VERSION = LOCK_VERSION; }
  window.EASYSTORE_MATBAGY_VERSION = LOCK_VERSION;
  window.EASYSTORE_CACHE_TAG = 'es29-v1872-invoice-comfort-duplicate-guard-20260629-0345';
  window.EASYSTORE_AUTO_REFRESH = false;
  function lockText(){
    try{ document.title='إيزي ستور مطبعجي '+SHORT_VERSION; }catch(e){}
    try{ localStorage.setItem('EASYSTORE_ACTIVE_BUILD', LOCK_VERSION); localStorage.setItem('EASYSTORE_CACHE_TAG', 'es29-v1872-invoice-comfort-duplicate-guard-20260629-0345'); }catch(e){}
    document.querySelectorAll('.version-badge,.version,.app-version,#es16Version,#es25Version,#es26Version,[data-version],[data-app-version]').forEach(function(el){el.textContent=LOCK_VERSION;});
    document.querySelectorAll('h1,h2,b,p,small,span,div').forEach(function(el){
      if(el.children && el.children.length>0) return;
      var t=el.textContent||'';
      if(t.length<180 && (/Batch32|Customer Pick Lock|V13|ES1\d|ES2[0-5]/i.test(t))){
        el.textContent=t.replace(/V13\s*Batch32\s*UI\s*Close\s*Fix\s*\+\s*Customer\s*Pick\s*Lock\s*\/\s*app\.js/gi, SHORT_VERSION+' / app.js')
          .replace(/ES1\d|ES2[0-5]/gi,'ES28')
          .replace(/V18\d{2}/gi,'V1869')
          .replace(/Batch\s*28\s*Mutual/gi,'Clean Single Loader');
      }
    });
  }
  lockText();
  setTimeout(lockText,50); setTimeout(lockText,250); setTimeout(lockText,1000); setTimeout(lockText,2500);
  var tm=null;
  try{ new MutationObserver(function(){ clearTimeout(tm); tm=setTimeout(lockText,40); }).observe(document.documentElement,{childList:true,subtree:true,characterData:true}); }catch(e){}
  try{
    if('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(function(regs){regs.forEach(function(r){try{r.unregister();}catch(e){}});});
    if(window.caches && caches.keys) caches.keys().then(function(keys){keys.forEach(function(k){if(/easy|store|matbagy|trend|workbox|cache/i.test(k)) caches.delete(k);});});
  }catch(e){}
})();


/*********************** ES28 V1871 - فاتورة الموظف / القسم صفوف نظيفة ************************
  - لا يعتمد على ملفات ES24/ES27 القديمة.
  - يحمّل الأصناف المحفوظة فقط من مطبخ الحسابات، ويستبعد الخامات.
  - يستبدل فورم البند الواحد بجدول صفوف: صنف، نوع/وصف، كمية، سعر، ملاحظات، مشترك.
  - لا يوجد تحديث لحظي؛ التحديث بعد الحفظ فقط أو زر تحديث البيانات.
**********************************************************************************************/
(function(){
  'use strict';
  var VERSION='ES29 V1872 Invoice Comfort + Duplicate Guard';
  var CACHE_TAG='es29-v1872-invoice-comfort-duplicate-guard-20260629-0345';
  window.EASYSTORE_VERSION=VERSION;
  window.EASYSTORE_MATBAGY_VERSION=VERSION;
  window.EASYSTORE_AUTO_REFRESH=false;
  window.EASYSTORE_EVENT_DRIVEN_REFRESH=true;

  function txt(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function norm(v){return txt(v).toLowerCase().replace(/[إأآا]/g,'ا').replace(/[ى]/g,'ي').replace(/[ةه]/g,'ه').replace(/[ؤ]/g,'و').replace(/[ئ]/g,'ي');}
  function esc(s){return txt(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function num(v){var s=String(v==null?'':v).replace(/[٠-٩]/g,function(d){return {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'}[d]||d;}).replace(/[٬,]/g,'.').replace(/[^0-9.\-]/g,'');var n=parseFloat(s);return isFinite(n)?n:0;}
  function money(v){return num(v).toFixed(2)+' ج';}
  function qs(id){return document.getElementById(id);}
  function userData(){var q=new URLSearchParams(location.search);var hand={};try{hand=JSON.parse(localStorage.getItem('MATBAGY_EMPLOYEE_SSO')||'{}')}catch(e){};var hp=hand.params||{},hu=hand.user||{};return {name:q.get('name')||q.get('username')||hp.name||hp.username||hu.name||hu.username||'ضياء',username:q.get('username')||q.get('name')||hp.username||hp.name||hu.username||hu.name||'ضياء',token:q.get('token')||hp.token||hu.token||'',department:q.get('department')||hp.department||hu.department||'',mode:q.get('mode')||q.get('roleMode')||hp.mode||hu.mode||''};}
  function currentDept(){var u=userData();var s=norm([u.department,u.mode,u.name,u.username,document.body.textContent.slice(0,1200)].join(' '));if(/ليزر|laser|جابر|gaber|jaber/.test(s))return 'ليزر';if(/طباعة|طباعه|print|وائل|wael/.test(s))return 'طباعة';return u.department||'';}
  function api(action,data){return new Promise(function(resolve,reject){var base=txt(window.TREND_API_URL||window.API_URL||'');if(!base){reject(new Error('رابط Apps Script غير مضبوط في config.js'));return;}var cb='ES28R_'+Date.now()+'_'+Math.floor(Math.random()*999999);var u=userData();var p=new URLSearchParams(Object.assign({action:action,callback:cb,username:u.username||u.name,name:u.name||u.username,token:u.token||'',department:u.department||'',mode:u.mode||'',_ts:Date.now()},data||{}));var s=document.createElement('script'),done=false;function clean(){if(done)return;done=true;try{delete window[cb];}catch(e){window[cb]=undefined;}if(s.parentNode)s.parentNode.removeChild(s);}window[cb]=function(r){clean();resolve(r||{});};s.onerror=function(){clean();reject(new Error('فشل الاتصال بالسيرفر'));};s.src=base+(base.indexOf('?')<0?'?':'&')+p.toString();document.body.appendChild(s);setTimeout(function(){if(!done){clean();reject(new Error('انتهت مهلة الاتصال بالسيرفر'));}},22000);});}

  var itemCache=[], itemCacheAt=0;
  function itemName(r){return txt(r.itemName||r.templateName||r.productName||r.name||r['اسم الصنف']||r['الصنف']||r['اسم البند']||r['البند']||'');}
  function itemDept(r){return txt(r.department||r.dept||r['القسم']||'عام');}
  function itemSale(r){return num(r.salePrice||r.officialSalePrice||r.systemSale||r.price||r['سعر البيع']||r['سعر بيع رسمي']||r['البيع']||r.sale||0);}
  function itemActive(r){var a=txt(r.active||r.status||r['الحالة']||'نعم');return !/لا|موقوف|متوقف|inactive|false|0/i.test(a);}
  function isMaterialLike(r){var b=norm(JSON.stringify(r).slice(0,1500));return /materialname|rawkind|rawclass|اسم الخامة|اسم الخامه|نوع الخامة|نوع الخامه|paper roll|lamination roll|machine expense|باكيت ورق|رول ورق|رول لامينشن|حبر|خامة انتاج|خامه انتاج|مصروف تشغيل/.test(b) && !/componentsjson|bom|itemname|templatename|اسم الصنف|صنف بمكونات/.test(b);}
  function isItemLike(r){var n=norm(itemName(r));if(!n)return false;if(isMaterialLike(r))return false;var b=norm(JSON.stringify(r).slice(0,1500));return /template|itemname|templatename|componentsjson|bom|اسم الصنف|صنف|منتج|كارت|تابلوه|مج|قطعة|قطعه|استيكر|رول طباعة/.test(b+n)||itemSale(r)>0;}
  async function loadItems(force){if(!force&&itemCache.length&&Date.now()-itemCacheAt<60000)return itemCache;itemCacheAt=Date.now();var out=[];try{var r=await api('getAccounting',{});if(r&&r.success!==false){[].concat(r.templates||[],r.items||[],r.products||[]).forEach(function(x){if(!isItemLike(x)||!itemActive(x))return;var nm=itemName(x);var dep=itemDept(x)||'عام';var key=norm(nm+'|'+dep);if(!out.some(function(o){return norm(o.name+'|'+o.dept)===key;}))out.push({name:nm,dept:dep,sale:itemSale(x),raw:x});});}}catch(e){}
    // fallback من جدول الأصناف الظاهر فقط إذا كانت API فاضية
    if(!out.length){document.querySelectorAll('table tbody tr').forEach(function(tr){var vals=Array.from(tr.cells||[]).map(function(td){return txt(td.textContent);});var row=vals.join(' | ');if(/خامة|خامه|رول لامينشن|رول ورق|حبر|مصروف ماكينة/.test(row)&&!/كارت|تابلوه|مج|قطعة|استيكر|صنف/.test(row))return;var dep=vals.find(function(v){return /^(طباعة|ليزر|مشترك|عام)$/.test(v);})||'عام';var nm=vals.find(function(v){return v&&v!==dep&&!/^\d/.test(v)&&!/مفعل|موقوف|تعديل|إيقاف|تفعيل|%|ج$/.test(v);})||'';var sale=0;vals.forEach(function(v){if(/ج/.test(v))sale=num(v)||sale;});if(nm&&/كارت|تابلوه|مج|قطعة|استيكر|رول طباعة|صنف/.test(nm+row))out.push({name:nm,dept:dep,sale:sale,raw:{}});});}
    itemCache=out;return out;}
  function filtered(items,dept){var d=norm(dept||'');var arr=items.filter(function(it){var id=norm(it.dept);return !d||!id||id===d||/مشترك|عام/.test(id);});return arr.length?arr:items;}
  function datalist(id,items,dept){return '<datalist id="'+esc(id)+'">'+filtered(items,dept).map(function(i){return '<option value="'+esc(i.name)+'" label="'+esc((i.dept||'عام')+' - '+money(i.sale))+'"></option>';}).join('')+'</datalist>';}
  function findItem(name,items){var n=norm(name);return items.find(function(i){return norm(i.name)===n;})||items.find(function(i){return norm(i.name).indexOf(n)>=0||n.indexOf(norm(i.name))>=0;})||null;}
  function rowHtml(kind){return '<tr class="es28-row"><td><input class="es28-item" list="es28_'+kind+'_items" placeholder="اكتب أو اختار الصنف"></td><td><input class="es28-kind" placeholder="نوع / وصف"></td><td><input class="es28-qty" type="number" min="0" step="0.01" value="1"></td><td><input class="es28-price" type="number" min="0" step="0.01"></td><td><input class="es28-notes" placeholder="ملاحظات"></td><td><label class="es28-check"><input class="es28-shared" type="checkbox"> مشترك</label></td><td><button type="button" class="es28-del">×</button></td></tr>';}
  function tableHtml(kind,items,dept){var title=kind==='sales'?'بنود فاتورة المبيعات':'بنود فاتورة القسم';return '<div class="es28-box" data-kind="'+kind+'"><h4>'+title+'</h4><div class="es28-help">اكتب الصنف أو اختاره من القائمة. Enter أو Tab في آخر خانة يفتح صف جديد. الخامات لا تظهر هنا؛ تظهر الأصناف المحفوظة فقط.</div>'+datalist('es28_'+kind+'_items',items,dept)+'<table class="es28-table"><thead><tr><th>الصنف</th><th>النوع/الوصف</th><th>الكمية</th><th>السعر</th><th>ملاحظات</th><th>مشترك</th><th></th></tr></thead><tbody>'+rowHtml(kind)+'</tbody></table><div class="es28-footer"><b>الإجمالي: <span class="es28-total">0.00 ج</span></b><button type="button" class="es28-add">صف جديد</button><button type="button" class="es28-save">'+(kind==='sales'?'حفظ الفاتورة بالصفوف':'تسجيل الفاتورة')+'</button><button type="button" class="es28-clear">تفريغ</button></div><div class="es28-msg"></div></div>';}
  function collect(box){return Array.from(box.querySelectorAll('tbody tr')).map(function(tr){return {item:txt((tr.querySelector('.es28-item')||{}).value),kind:txt((tr.querySelector('.es28-kind')||{}).value),qty:num((tr.querySelector('.es28-qty')||{}).value)||0,price:num((tr.querySelector('.es28-price')||{}).value)||0,notes:txt((tr.querySelector('.es28-notes')||{}).value),shared:!!((tr.querySelector('.es28-shared')||{}).checked)};}).filter(function(r){return r.item&&r.qty>0;});}
  function updateTotal(box){var total=collect(box).reduce(function(s,r){return s+r.qty*r.price;},0);var el=box.querySelector('.es28-total');if(el)el.textContent=money(total);return total;}
  function bindBox(box,items,dept,scope){if(box.dataset.bound)return;box.dataset.bound='1';function addRow(){var tb=box.querySelector('tbody');tb.insertAdjacentHTML('beforeend',rowHtml(box.dataset.kind));wire();var x=tb.querySelector('tr:last-child .es28-item');if(x)x.focus();updateTotal(box);}function wire(){Array.from(box.querySelectorAll('tbody tr')).forEach(function(tr){if(tr.dataset.bound)return;tr.dataset.bound='1';var item=tr.querySelector('.es28-item'),qty=tr.querySelector('.es28-qty'),price=tr.querySelector('.es28-price'),notes=tr.querySelector('.es28-notes'),del=tr.querySelector('.es28-del');function apply(){var it=findItem(item.value,filtered(items,dept));if(it&&price&&!num(price.value))price.value=it.sale?Number(it.sale).toFixed(2):'';updateTotal(box);}if(item){item.addEventListener('change',apply);item.addEventListener('input',function(){setTimeout(apply,0);});} [qty,price].forEach(function(el){if(el)el.addEventListener('input',function(){updateTotal(box);});});[item,tr.querySelector('.es28-kind'),qty,price,tr.querySelector('.es28-shared'),notes].forEach(function(el,idx,arr){if(!el)return;el.addEventListener('keydown',function(ev){if((ev.key==='Enter'||ev.key==='Tab')&&idx===arr.length-1){ev.preventDefault();addRow();}});});if(del)del.onclick=function(){var tb=box.querySelector('tbody');if(tb.children.length>1)tr.remove();else tr.querySelectorAll('input').forEach(function(i){if(i.type==='checkbox')i.checked=false;else i.value=i.classList.contains('es28-qty')?'1':'';});updateTotal(box);};});}wire();box.querySelector('.es28-add').onclick=addRow;box.querySelector('.es28-clear').onclick=function(){box.querySelector('tbody').innerHTML=rowHtml(box.dataset.kind);box.dataset.bound='';bindBox(box,items,dept,scope);updateTotal(box);};box.querySelector('.es28-save').onclick=function(){if(box.dataset.kind==='sales')saveSales(box,scope);else saveDept(box,scope,dept);};}
  function labelFor(el){var p=el.closest('.field,label,div')||el.parentNode;return txt((p&&p.textContent)||'');}
  function field(scope,rx){return Array.from(scope.querySelectorAll('input,select,textarea')).find(function(el){return rx.test(labelFor(el));})||null;}
  function context(scope){return {customer:txt((field(scope,/اسم العميل|العميل|customer/)||{}).value),order:txt((field(scope,/رقم الاوردر|رقم الأوردر|order/)||{}).value)};}
  function say(box,t,bad){var m=box.querySelector('.es28-msg');if(m){m.textContent=t;m.className='es28-msg '+(bad?'bad':'ok');}}
  async function saveDept(box,scope,dept){var rows=collect(box),ctx=context(scope);if(!rows.length)return say(box,'اكتب بند واحد على الأقل.',true);if(!ctx.order)return say(box,'رقم الأوردر مطلوب.',true);say(box,'جاري تسجيل '+rows.length+' صف...',false);var ok=0,fail=[];for(var i=0;i<rows.length;i++){var r=rows[i];try{var res=await api('saveAccountingDeptLine',{lineId:'DLINE-'+Date.now().toString(36)+'-'+i,orderId:ctx.order,customerName:ctx.customer,department:dept||currentDept(),itemName:r.item,itemType:r.kind,qty:r.qty,sale:r.price,salePrice:r.price,systemSale:r.price,systemSalePrice:r.price,notes:[r.kind,r.notes].filter(Boolean).join(' | '),sharedLine:r.shared?'نعم':'لا',shared:r.shared?'نعم':'لا',billingStatus:'جاهز للفوترة'});if(res&&res.success!==false)ok++;else fail.push(r.item);}catch(e){fail.push(r.item);}}
    if(fail.length)say(box,'تم تسجيل '+ok+' صف، وفشل: '+fail.join(' / '),true);else{say(box,'تم تسجيل كل صفوف الفاتورة بنجاح.',false);box.querySelector('tbody').innerHTML=rowHtml('dept');box.dataset.bound='';bindBox(box,itemCache,dept,scope);}}
  function saveSales(box,scope){var rows=collect(box),total=updateTotal(box);if(!rows.length)return say(box,'اكتب بند واحد على الأقل.',true);var desc=rows.map(function(r){return r.item+' × '+r.qty+(r.kind?' - '+r.kind:'');}).join(' / ');var ids=['saItem','saQty','saUnit','saTotal','saNotes'];var saItem=qs(ids[0]),saQty=qs(ids[1]),saUnit=qs(ids[2]),saTotal=qs(ids[3]),saNotes=qs(ids[4]);if(saItem){var op=document.createElement('option');op.value='ES28_ROWS';op.textContent='بنود صفوف متعددة';saItem.appendChild(op);saItem.value='ES28_ROWS';}if(saQty)saQty.value=1;if(saUnit)saUnit.value=total.toFixed(2);if(saTotal)saTotal.value=total.toFixed(2);if(saNotes)saNotes.value=(txt(saNotes.value)?txt(saNotes.value)+' | ':'')+'بنود الصفوف: '+desc;if(window.ES28&&typeof window.ES28.calcSale==='function')try{window.ES28.calcSale();}catch(e){};if(window.ES28&&typeof window.ES28.saveSale==='function'){say(box,'جاري حفظ الفاتورة...',false);window.ES28.saveSale();}else if(window.ES&&typeof window.ES.saveSale==='function'){say(box,'جاري حفظ الفاتورة...',false);window.ES.saveSale();}else say(box,'تم تجهيز البنود. اضغط حفظ الفاتورة الموحدة.',false);}
  function findDeptScope(){return Array.from(document.querySelectorAll('.modal:not(.hidden),.modal-card,.card,section,main')).find(function(el){var s=norm(el.textContent).slice(0,1800);return /فاتوره القسم|فاتورة القسم|تسجيل البند|بند مشترك|ملاحظات القسم/.test(s);})||null;}
  function findSalesScope(){return Array.from(document.querySelectorAll('.card,section,main')).find(function(el){var s=norm(el.textContent).slice(0,1800);return /فاتوره مبيعات موحده|فاتورة مبيعات موحدة|فاتوره مبيعات|فواتير المبيعات/.test(s)&&/العميل|رقم الفاتوره|رقم الفاتورة/.test(s);})||null;}
  function hideOld(scope){if(!scope)return;scope.querySelectorAll('.es24-rows-box,.es27-box').forEach(function(x){x.style.display='none';});Array.from(scope.querySelectorAll('button')).forEach(function(b){var t=norm(b.textContent);if(/اضافه صنف|إضافة صنف|اضافة بند|إضافة بند|تسجيل كل الصفوف|تسجيل البند/.test(t)&&!b.closest('.es28-box'))b.classList.add('es28-hide-old');});}
  async function hydrate(force){var items=await loadItems(!!force);var ds=findDeptScope();if(ds&&!ds.querySelector('.es28-box[data-kind="dept"]')){hideOld(ds);var dept=currentDept();var wrap=document.createElement('div');wrap.innerHTML=tableHtml('dept',items,dept);var node=wrap.firstElementChild;var anchor=Array.from(ds.querySelectorAll('label,b,strong,h3,h2')).find(function(el){return /الصنف|ملاحظات القسم|بند مشترك|سعر الفاتورة/.test(txt(el.textContent));});if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(node,(anchor.closest('.field')||anchor).nextSibling);else ds.appendChild(node);bindBox(node,items,dept,ds);if(!filtered(items,dept).length)say(node,'لا توجد أصناف مفعلة لهذا القسم. احفظ الأصناف أولاً من مطبخ الحسابات / صنف بمكونات.',true);}var ss=findSalesScope();if(ss&&!ss.querySelector('.es28-box[data-kind="sales"]')){var wrap2=document.createElement('div');wrap2.innerHTML=tableHtml('sales',items,'');var node2=wrap2.firstElementChild;var anc=Array.from(ss.querySelectorAll('h2,h3,label')).find(function(el){return /بند يدوي|صنف إضافي|فاتورة مبيعات/.test(txt(el.textContent));});if(anc&&anc.parentNode)anc.parentNode.insertBefore(node2,(anc.closest('.grid')||anc).nextSibling);else ss.appendChild(node2);bindBox(node2,items,'',ss);}}
  var css=document.createElement('style');css.textContent='.es28-hide-old{display:none!important}.es28-box{background:#fff;border:1px solid #cdeee4;border-radius:18px;padding:12px;margin:12px 0;box-shadow:0 8px 22px rgba(15,23,42,.06)}.es28-box h4{margin:0 0 7px;color:#0f766e}.es28-help{font-size:12px;color:#64748b;margin-bottom:9px}.es28-table{width:100%;border-collapse:collapse}.es28-table th,.es28-table td{border:1px solid #e5edf5;padding:7px;text-align:right}.es28-table th{background:#ecfdf5;color:#065f46}.es28-table input{width:100%;min-height:38px;border:1px solid #cad9e0;border-radius:10px;padding:7px}.es28-check{display:flex;gap:5px;align-items:center;font-size:12px;font-weight:800}.es28-check input{width:18px;height:18px}.es28-del{background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:10px;padding:7px 10px}.es28-footer{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}.es28-footer button{border:0;border-radius:12px;padding:10px 14px;font-weight:900;cursor:pointer}.es28-add{background:#eef6f5;color:#0f6f5c}.es28-save{background:#0f8a70;color:#fff}.es28-clear{background:#fee2e2;color:#991b1b}.es28-total{direction:ltr;unicode-bidi:isolate}.es28-msg{font-weight:800;min-height:22px;margin-top:8px}.es28-msg.ok{color:#047857}.es28-msg.bad{color:#b91c1c}@media(max-width:760px){.es28-table,.es28-table tbody,.es28-table tr,.es28-table td{display:block;width:100%}.es28-table thead{display:none}.es28-table tr{border:1px solid #e5edf5;border-radius:14px;margin-bottom:10px;padding:8px}.es28-table td{border:0}}';document.head.appendChild(css);
  function versionLock(){try{document.title='إيزي ستور مطبعجي ES28 V1871';}catch(e){};document.querySelectorAll('.versionLine,.version-badge,.app-version,#es16Version,#es25Version,#es26Version,#es28Version').forEach(function(el){el.textContent=VERSION+' / فاتورة صفوف نظيفة';});}
  function tick(force){versionLock();hydrate(force).catch(function(e){console.warn('ES28 hydrate',e);});}
  document.addEventListener('click',function(){setTimeout(function(){tick(false);},120);},true);document.addEventListener('change',function(){itemCacheAt=0;setTimeout(function(){tick(true);},120);},true);document.addEventListener('DOMContentLoaded',function(){tick(true);});setTimeout(function(){tick(true);},450);setTimeout(function(){tick(true);},1500);
  try{new MutationObserver(function(){clearTimeout(window.__es28mt);window.__es28mt=setTimeout(function(){tick(false);},160);}).observe(document.body,{childList:true,subtree:true});}catch(e){}
})();


/*********************** ES29 V1872 - Duplicate Guard + Invoice Comfort ************************
  - يمنع تكرار الأصناف عند الضغط المتكرر على حفظ/تحديث.
  - فاتورة الموظف/القسم بواجهة أكبر ومريحة بنظام صفوف.
  - تحميل الأصناف المحفوظة من API + localStorage + جدول الأصناف الظاهر.
  - الصنف يكتب أو يختار من القائمة، والسعر يمتلئ تلقائيًا.
**********************************************************************************************/
(function(){
  'use strict';
  var VERSION='ES29 V1872 Invoice Comfort + Duplicate Guard';
  var CACHE_TAG='es29-v1872-invoice-comfort-duplicate-guard-20260629-0345';
  window.EASYSTORE_VERSION=VERSION;
  window.EASYSTORE_MATBAGY_VERSION=VERSION;
  window.EASYSTORE_AUTO_REFRESH=false;
  window.EASYSTORE_EVENT_DRIVEN_REFRESH=true;

  function txt(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function norm(v){return txt(v).toLowerCase().replace(/[إأآا]/g,'ا').replace(/[ى]/g,'ي').replace(/[ةه]/g,'ه').replace(/[ؤ]/g,'و').replace(/[ئ]/g,'ي');}
  function esc(s){return txt(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function num(v){var s=String(v==null?'':v).replace(/[٠-٩]/g,function(d){return {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'}[d]||d;}).replace(/[٬,]/g,'.').replace(/[^0-9.\-]/g,'');var n=parseFloat(s);return isFinite(n)?n:0;}
  function money(v){return num(v).toFixed(2)+' ج';}
  function qs(id){return document.getElementById(id);}
  function getVal(id){var e=qs(id);return e?txt(e.value):'';}
  function setVal(id,v){var e=qs(id);if(e)e.value=v==null?'':v;}
  function labelFor(el){var p=el.closest && (el.closest('.field')||el.closest('label')||el.closest('div'));return txt((p&&p.textContent)||'');}
  function userData(){var q=new URLSearchParams(location.search);var h={};try{h=JSON.parse(localStorage.getItem('MATBAGY_EMPLOYEE_SSO')||'{}');}catch(e){}var hp=h.params||{},hu=h.user||{};return {name:q.get('name')||q.get('username')||hp.name||hp.username||hu.name||hu.username||'ضياء',username:q.get('username')||q.get('name')||hp.username||hp.name||hu.username||hu.name||'ضياء',token:q.get('token')||hp.token||hu.token||'',department:q.get('department')||hp.department||hu.department||'',mode:q.get('mode')||q.get('roleMode')||hp.mode||hu.mode||''};}
  function currentDept(scope){var u=userData();var s=norm([u.department,u.mode,u.name,u.username,scope&&scope.textContent,document.body.textContent.slice(0,900)].join(' '));if(/ليزر|laser|جابر|gaber|jaber/.test(s))return 'ليزر';if(/طباعة|طباعه|print|وائل|wael/.test(s))return 'طباعة';return u.department||'';}
  function api(action,data){return new Promise(function(resolve,reject){var base=txt(window.TREND_API_URL||window.API_URL||'');if(!base){reject(new Error('رابط Apps Script غير مضبوط في config.js'));return;}var cb='ES29_'+Date.now()+'_'+Math.floor(Math.random()*999999);var u=userData();var p=new URLSearchParams(Object.assign({action:action,callback:cb,username:u.username||u.name,name:u.name||u.username,token:u.token||'',department:u.department||'',mode:u.mode||'',_ts:Date.now()},data||{}));var s=document.createElement('script'),done=false;function clean(){if(done)return;done=true;try{delete window[cb];}catch(e){window[cb]=undefined;}if(s.parentNode)s.parentNode.removeChild(s);}window[cb]=function(r){clean();resolve(r||{});};s.onerror=function(){clean();reject(new Error('فشل الاتصال بالسيرفر'));};s.src=base+(base.indexOf('?')<0?'?':'&')+p.toString();document.body.appendChild(s);setTimeout(function(){if(!done){clean();reject(new Error('انتهت مهلة الاتصال بالسيرفر'));}},22000);});}

  function itemName(r){return txt(r.itemName||r.templateName||r.productName||r.name||r['اسم الصنف']||r['الصنف']||r['اسم البند']||r['البند']||'');}
  function itemDept(r){return txt(r.department||r.dept||r['القسم']||'عام');}
  function itemSale(r){return num(r.salePrice||r.officialSalePrice||r.systemSale||r.price||r['سعر البيع']||r['سعر بيع رسمي']||r['البيع']||r.sale||0);}
  function itemActive(r){var a=txt(r.active||r.status||r['الحالة']||'نعم');return !/لا|موقوف|متوقف|inactive|false|0/i.test(a);}
  function isMaterialLike(r){var b=norm(JSON.stringify(r||{}).slice(0,2500));if(/itemname|templatename|productname|componentsjson|bom|اسم الصنف|صنف بمكونات/.test(b))return false;return /materialname|rawkind|rawclass|اسم الخامة|اسم الخامه|نوع الخامة|نوع الخامه|paper roll|lamination roll|machine expense|باكيت ورق|رول ورق|رول لامينشن|حبر|خامة انتاج|خامه انتاج|مصروف تشغيل/.test(b);}
  function isItemLike(r){var n=norm(itemName(r));if(!n)return false;if(isMaterialLike(r))return false;var b=norm(JSON.stringify(r||{}).slice(0,2500));return /template|itemname|templatename|productname|componentsjson|bom|اسم الصنف|صنف|منتج|كارت|تابلوه|مج|قطعة|قطعه|استيكر|رول طباعة/.test(b+n)||itemSale(r)>0;}
  function addUnique(out,row){var nm=itemName(row)||txt(row.name);if(!nm)return;var dep=itemDept(row)||row.dept||'عام';var key=norm(nm+'|'+dep);if(!out.some(function(o){return norm(o.name+'|'+o.dept)===key;}))out.push({name:nm,dept:dep,sale:itemSale(row),raw:row});}
  function scanLocalItems(){var out=[];try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(!/EASYSTORE|MATBAGY|easy/i.test(k||''))continue;var v=localStorage.getItem(k);if(!v||v.length>2500000)continue;try{var obj=JSON.parse(v);walk(obj,out,0);}catch(e){}}}catch(e){}return out;}
  function walk(x,out,depth){if(depth>5||!x)return;if(Array.isArray(x)){x.forEach(function(a){walk(a,out,depth+1);});return;}if(typeof x==='object'){if(isItemLike(x)&&itemActive(x))addUnique(out,x);Object.keys(x).forEach(function(k){if(/templates|items|products|data|rows|الأصناف|بنود/i.test(k))walk(x[k],out,depth+1);});}}
  function scanDomItems(){var out=[];document.querySelectorAll('table tbody tr').forEach(function(tr){var cells=Array.from(tr.cells||[]).map(function(td){return txt(td.textContent);});var line=cells.join(' | ');if(!line)return;if(/الخامات الأساسية|اسم الخامة|نوع الخامة/.test(line))return;if(/خامة|خامه|رول لامينشن|رول ورق|حبر|مصروف ماكينة/.test(line)&&!/كارت|تابلوه|مج|قطعة|صنف|استيكر/.test(line))return;var dep=cells.find(function(v){return /^(طباعة|ليزر|مشترك|عام)$/.test(v);})||'عام';var nm=cells.find(function(v){return v&&v!==dep&&!/^(0|0\.00|مفعل|موقوف|تعديل|إيقاف|تفعيل|حذف)$/.test(v)&&!/ج$|%|الحالة|القسم|البيع|التكلفة/.test(v);})||'';var sale=0;cells.forEach(function(v){if(/ج/.test(v))sale=num(v)||sale;});if(nm&&!/خامة|خامه|رول لامينشن|رول ورق|حبر|مصروف ماكينة/.test(nm))addUnique(out,{itemName:nm,department:dep,salePrice:sale,active:'نعم'});});return out;}
  var itemCache=[], itemCacheAt=0;
  async function loadItems(force){if(!force&&itemCache.length&&Date.now()-itemCacheAt<15000)return itemCache;var out=[];itemCacheAt=Date.now();try{var r=await api('getAccounting',{});if(r&&r.success!==false){[].concat(r.templates||[],r.items||[],r.products||[]).forEach(function(x){if(isItemLike(x)&&itemActive(x))addUnique(out,x);});}}catch(e){console.warn('ES29 getAccounting items failed',e);}scanLocalItems().forEach(function(x){addUnique(out,{itemName:x.name,department:x.dept,salePrice:x.sale,active:'نعم'});});scanDomItems().forEach(function(x){addUnique(out,{itemName:x.name,department:x.dept,salePrice:x.sale,active:'نعم'});});itemCache=out;return out;}
  function filtered(items,dept){var d=norm(dept||'');var arr=(items||[]).filter(function(it){var id=norm(it.dept);return !d||!id||id===d||/مشترك|عام/.test(id);});return arr;}
  function findItem(name,items){var n=norm(name);return (items||[]).find(function(i){return norm(i.name)===n;})||(items||[]).find(function(i){return n&&norm(i.name).indexOf(n)>=0;})||(items||[]).find(function(i){return n&&n.indexOf(norm(i.name))>=0;})||null;}
  function datalist(id,items,dept){return '<datalist id="'+esc(id)+'">'+filtered(items,dept).map(function(i){return '<option value="'+esc(i.name)+'" label="'+esc((i.dept||'عام')+' - '+money(i.sale))+'"></option>';}).join('')+'</datalist>';}
  function rowHtml(kind){return '<tr class="es29-row"><td class="itemCell"><input class="es29-item" list="es29_'+kind+'_items" placeholder="اكتب أو اختار الصنف"></td><td><input class="es29-kind" placeholder="نوع / وصف"></td><td><input class="es29-qty" type="number" min="0" step="0.01" value="1"></td><td><input class="es29-price" type="number" min="0" step="0.01"></td><td><input class="es29-notes" placeholder="ملاحظات"></td><td><label class="es29-check"><input class="es29-shared" type="checkbox"> مشترك</label></td><td><button type="button" class="es29-del">×</button></td></tr>';}
  function tableHtml(kind,items,dept){var title=kind==='sales'?'فاتورة مبيعات بنظام الصفوف':'فاتورة الموظف / القسم بنظام الصفوف';var available=filtered(items,dept).length;return '<div class="es29-box" data-kind="'+kind+'"><div class="es29-head"><h3>'+title+'</h3><span>'+available+' صنف متاح</span></div><div class="es29-help">اكتب أول حروف الصنف أو اختاره من القائمة. Tab / Enter يفتح صف جديد. الخامات لا تظهر هنا.</div>'+datalist('es29_'+kind+'_items',items,dept)+'<div class="es29-table-wrap"><table class="es29-table"><thead><tr><th>الصنف</th><th>النوع/الوصف</th><th>الكمية</th><th>السعر</th><th>ملاحظات</th><th>مشترك</th><th></th></tr></thead><tbody>'+rowHtml(kind)+'</tbody></table></div><div class="es29-footer"><b>الإجمالي: <span class="es29-total">0.00 ج</span></b><button type="button" class="es29-add">صف جديد</button><button type="button" class="es29-save">'+(kind==='sales'?'حفظ الفاتورة':'تسجيل الفاتورة')+'</button><button type="button" class="es29-clear">تفريغ</button></div><div class="es29-msg"></div></div>';}
  function collect(box){return Array.from(box.querySelectorAll('tbody tr')).map(function(tr){return {item:txt((tr.querySelector('.es29-item')||{}).value),kind:txt((tr.querySelector('.es29-kind')||{}).value),qty:num((tr.querySelector('.es29-qty')||{}).value)||0,price:num((tr.querySelector('.es29-price')||{}).value)||0,notes:txt((tr.querySelector('.es29-notes')||{}).value),shared:!!((tr.querySelector('.es29-shared')||{}).checked)};}).filter(function(r){return r.item&&r.qty>0;});}
  function updateTotal(box){var total=collect(box).reduce(function(s,r){return s+(r.qty*r.price);},0);var el=box.querySelector('.es29-total');if(el)el.textContent=money(total);return total;}
  function say(box,t,bad){var m=box.querySelector('.es29-msg');if(m){m.textContent=t;m.className='es29-msg '+(bad?'bad':'ok');}}
  function bindBox(box,items,dept,scope){if(box.dataset.bound29)return;box.dataset.bound29='1';function addRow(){var tb=box.querySelector('tbody');tb.insertAdjacentHTML('beforeend',rowHtml(box.dataset.kind));wire();var x=tb.querySelector('tr:last-child .es29-item');if(x)x.focus();updateTotal(box);}function applyRow(tr){var item=tr.querySelector('.es29-item'),price=tr.querySelector('.es29-price');var it=findItem(item&&item.value,filtered(items,dept));if(it&&price&&!num(price.value))price.value=it.sale?num(it.sale).toFixed(2):'';updateTotal(box);}function wire(){Array.from(box.querySelectorAll('tbody tr')).forEach(function(tr){if(tr.dataset.bound29)return;tr.dataset.bound29='1';['input','change'].forEach(function(ev){var item=tr.querySelector('.es29-item');if(item)item.addEventListener(ev,function(){setTimeout(function(){applyRow(tr);},0);});});['.es29-qty','.es29-price'].forEach(function(sel){var el=tr.querySelector(sel);if(el)el.addEventListener('input',function(){updateTotal(box);});});Array.from(tr.querySelectorAll('input')).forEach(function(el,idx,arr){el.addEventListener('keydown',function(ev){if((ev.key==='Enter'||ev.key==='Tab')&&idx===arr.length-1){ev.preventDefault();addRow();}});});var del=tr.querySelector('.es29-del');if(del)del.onclick=function(){var tb=box.querySelector('tbody');if(tb.children.length>1)tr.remove();else tr.querySelectorAll('input').forEach(function(i){if(i.type==='checkbox')i.checked=false;else i.value=i.classList.contains('es29-qty')?'1':'';});updateTotal(box);};});}wire();box.querySelector('.es29-add').onclick=addRow;box.querySelector('.es29-clear').onclick=function(){box.querySelector('tbody').innerHTML=rowHtml(box.dataset.kind);box.dataset.bound29='';bindBox(box,items,dept,scope);updateTotal(box);};box.querySelector('.es29-save').onclick=function(){box.dataset.kind==='sales'?saveSales(box,scope):saveDept(box,scope,dept);};}
  function field(scope,rx){return Array.from((scope||document).querySelectorAll('input,select,textarea')).find(function(el){return rx.test(labelFor(el));})||null;}
  function context(scope){return {customer:txt((field(scope,/اسم العميل|العميل|customer/)||{}).value),order:txt((field(scope,/رقم الاوردر|رقم الأوردر|order/)||{}).value)};}
  async function saveDept(box,scope,dept){var rows=collect(box),ctx=context(scope);if(!rows.length)return say(box,'اكتب بند واحد على الأقل.',true);if(!ctx.order)return say(box,'رقم الأوردر مطلوب.',true);say(box,'جاري تسجيل '+rows.length+' صف...',false);var ok=0,fail=[];for(var i=0;i<rows.length;i++){var r=rows[i];try{var res=await api('saveAccountingDeptLine',{lineId:'DLINE-'+Date.now().toString(36)+'-'+i,orderId:ctx.order,customerName:ctx.customer,department:dept||currentDept(scope),itemName:r.item,itemType:r.kind,qty:r.qty,sale:r.price,salePrice:r.price,systemSale:r.price,systemSalePrice:r.price,notes:[r.kind,r.notes].filter(Boolean).join(' | '),sharedLine:r.shared?'نعم':'لا',shared:r.shared?'نعم':'لا',billingStatus:'جاهز للفوترة'});if(res&&res.success!==false)ok++;else fail.push(r.item);}catch(e){fail.push(r.item);}}
    if(fail.length)say(box,'تم تسجيل '+ok+' صف، وفشل: '+fail.join(' / '),true);else{say(box,'تم تسجيل كل الصفوف بنجاح.',false);box.querySelector('tbody').innerHTML=rowHtml('dept');box.dataset.bound29='';bindBox(box,itemCache,dept,scope);}}
  function saveSales(box,scope){var rows=collect(box),total=updateTotal(box);if(!rows.length)return say(box,'اكتب بند واحد على الأقل.',true);var desc=rows.map(function(r){return r.item+' × '+r.qty+(r.kind?' - '+r.kind:'');}).join(' / ');['saUnit','saTotal'].forEach(function(id){if(qs(id))qs(id).value=total.toFixed(2);});if(qs('saQty'))qs('saQty').value=1;if(qs('saNotes'))qs('saNotes').value=(getVal('saNotes')?getVal('saNotes')+' | ':'')+'بنود الصفوف: '+desc;if(window.ES27&&typeof window.ES27.saveSale==='function'){say(box,'جاري حفظ الفاتورة...',false);window.ES27.saveSale();}else say(box,'تم تجهيز البنود. اضغط حفظ الفاتورة الموحدة.',false);}
  function findDeptScope(){return Array.from(document.querySelectorAll('.modal:not(.hidden),.modal-card,.card,section,main')).find(function(el){var s=norm(el.textContent).slice(0,2200);return /فاتوره القسم|فاتورة القسم|تسجيل البند|بند مشترك|ملاحظات القسم|فاتورة الموظف/.test(s);})||null;}
  function findSalesScope(){return Array.from(document.querySelectorAll('.card,section,main')).find(function(el){var s=norm(el.textContent).slice(0,2200);return /فاتوره مبيعات موحده|فاتورة مبيعات موحدة|فواتير المبيعات/.test(s)&&/العميل|رقم الفاتوره|رقم الفاتورة/.test(s);})||null;}
  function hideOld(scope){if(!scope)return;scope.querySelectorAll('.es24-rows-box,.es27-box,.es28-box').forEach(function(x){x.style.display='none';});Array.from(scope.querySelectorAll('button')).forEach(function(b){var t=norm(b.textContent);if(/اضافه صنف|إضافة صنف|اضافة بند|إضافة بند|تسجيل كل الصفوف|تسجيل البند/.test(t)&&!b.closest('.es29-box'))b.classList.add('es29-hide-old');});}
  async function hydrate(force){var items=await loadItems(!!force);var ds=findDeptScope();if(ds&&!ds.querySelector('.es29-box[data-kind="dept"]')){hideOld(ds);var dept=currentDept(ds);var wrap=document.createElement('div');wrap.innerHTML=tableHtml('dept',items,dept);var node=wrap.firstElementChild;var anchor=Array.from(ds.querySelectorAll('label,b,strong,h3,h2')).find(function(el){return /الصنف|ملاحظات القسم|بند مشترك|سعر الفاتورة|فاتورة/.test(txt(el.textContent));});if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(node,(anchor.closest('.field')||anchor).nextSibling);else ds.appendChild(node);bindBox(node,items,dept,ds);if(!filtered(items,dept).length)say(node,'لا توجد أصناف مفعلة لهذا القسم. احفظ الأصناف أولًا من مطبخ الحسابات / صنف بمكونات.',true);}var ss=findSalesScope();if(ss&&!ss.querySelector('.es29-box[data-kind="sales"]')){var wrap2=document.createElement('div');wrap2.innerHTML=tableHtml('sales',items,'');var node2=wrap2.firstElementChild;var anc=Array.from(ss.querySelectorAll('h2,h3,label')).find(function(el){return /بند يدوي|صنف إضافي|فاتورة مبيعات/.test(txt(el.textContent));});if(anc&&anc.parentNode)anc.parentNode.insertBefore(node2,(anc.closest('.grid')||anc).nextSibling);else ss.appendChild(node2);bindBox(node2,items,'',ss);}}

  function installDuplicateGuard(){if(!window.ES27||window.ES27.__es29Guard)return;var original=window.ES27.saveItem;window.ES27.__es29Guard=true;window.ES27.saveItem=function(){var nm=getVal('itName'),dep=getVal('itDept')||'عام';if(!nm){try{return original.apply(window.ES27,arguments);}catch(e){return;}}var sig=norm(nm+'|'+dep+'|'+getVal('itSale')+'|'+getVal('itCost'));var now=Date.now();if(window.__es29LastItemSig===sig&&now-(window.__es29LastItemAt||0)<2500){var m=document.querySelector('.msg,#mainMsg');if(m)m.textContent='تم تجاهل الضغط المتكرر؛ الصنف موجود بالفعل.';return false;}window.__es29LastItemSig=sig;window.__es29LastItemAt=now;var btn=Array.from(document.querySelectorAll('button')).find(function(b){return /حفظ.*الصنف|تحديث الصنف/.test(txt(b.textContent));});if(btn){btn.disabled=true;setTimeout(function(){btn.disabled=false;},1800);}dedupeLocalTemplates(nm,dep);var out=original.apply(window.ES27,arguments);setTimeout(function(){dedupeLocalTemplates(nm,dep);itemCacheAt=0;hydrate(true);},900);return out;};}
  function dedupeLocalTemplates(nm,dep){try{var keyTarget=norm(nm+'|'+dep);for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(!/EASYSTORE/i.test(k||''))continue;var v=localStorage.getItem(k);if(!v||v.length>2000000)continue;var obj;try{obj=JSON.parse(v);}catch(e){continue;}var changed=false;['templates','items','products'].forEach(function(arrKey){if(!Array.isArray(obj[arrKey]))return;var seen={};obj[arrKey]=obj[arrKey].filter(function(r){var key=norm(itemName(r)+'|'+itemDept(r));if(key===keyTarget){if(seen[key]){changed=true;return false;}seen[key]=true;}return true;});});if(changed)localStorage.setItem(k,JSON.stringify(obj));}}catch(e){}}

  var css=document.createElement('style');css.textContent='.es29-hide-old{display:none!important}.es29-box{background:#fff;border:1px solid #bfe9dc;border-radius:24px;padding:22px;margin:18px 0;box-shadow:0 18px 44px rgba(15,23,42,.16);font-size:16px}.modal .es29-box,.modal-card .es29-box{max-width:min(1180px,96vw);margin:18px auto}.es29-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.es29-head h3{margin:0;color:#065f46;font-size:24px}.es29-head span{background:#ecfdf5;color:#047857;border:1px solid #bbf7d0;border-radius:999px;padding:7px 12px;font-weight:900}.es29-help{font-size:14px;color:#64748b;margin-bottom:14px;line-height:1.8}.es29-table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:18px;background:#fff}.es29-table{width:100%;border-collapse:separate;border-spacing:0;min-width:920px}.es29-table th,.es29-table td{border-bottom:1px solid #e5edf5;padding:10px;text-align:right}.es29-table th{background:#ecfdf5;color:#065f46;font-size:15px;position:sticky;top:0;z-index:1}.es29-table td.itemCell{min-width:240px}.es29-table input{width:100%;min-height:48px;border:1px solid #cad9e0;border-radius:14px;padding:10px 12px;font-size:16px;background:#fff}.es29-table input:focus{border-color:#0f8a70;box-shadow:0 0 0 3px rgba(15,138,112,.14);outline:none}.es29-check{display:flex;gap:8px;align-items:center;font-size:14px;font-weight:900}.es29-check input{width:22px;height:22px;min-height:auto}.es29-del{background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:12px;padding:10px 14px;font-size:18px;font-weight:900}.es29-footer{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px}.es29-footer b{font-size:20px;margin-left:auto}.es29-footer button{border:0;border-radius:14px;padding:13px 18px;font-weight:900;cursor:pointer;font-size:15px}.es29-add{background:#eef6f5;color:#0f6f5c}.es29-save{background:#0f8a70;color:#fff;min-width:170px}.es29-clear{background:#fee2e2;color:#991b1b}.es29-total{direction:ltr;unicode-bidi:isolate}.es29-msg{font-weight:900;min-height:24px;margin-top:10px;font-size:15px}.es29-msg.ok{color:#047857}.es29-msg.bad{color:#b91c1c}.modal-card:has(.es29-box),.modal:has(.es29-box)>*{width:min(1240px,98vw)!important;max-width:98vw!important}.modal:has(.es29-box){align-items:flex-start!important;overflow:auto!important;padding:18px!important}@media(max-width:760px){.es29-box{padding:14px}.es29-table{min-width:760px}.es29-head h3{font-size:19px}.es29-footer b{width:100%;margin:0}.es29-footer button{flex:1}}';document.head.appendChild(css);
  function versionLock(){try{document.title='إيزي ستور مطبعجي ES29 V1872';}catch(e){}document.querySelectorAll('.versionLine,.version-badge,.app-version,#es16Version,#es25Version,#es26Version,#es28Version,#es29Version').forEach(function(el){el.textContent=VERSION+' / فاتورة مريحة + منع تكرار';});var badges=Array.from(document.querySelectorAll('h1,h2,p,span,div')).filter(function(el){return /ES\d+|V18\d+/.test(txt(el.textContent))&&txt(el.textContent).length<120;}).slice(0,8);badges.forEach(function(el){el.innerHTML=el.innerHTML.replace(/ES\d+/g,'ES29').replace(/V18\d+/g,'V1872');});}
  function tick(force){versionLock();installDuplicateGuard();hydrate(force).catch(function(e){console.warn('ES29 hydrate',e);});}
  document.addEventListener('DOMContentLoaded',function(){tick(true);});
  document.addEventListener('click',function(){setTimeout(function(){tick(false);},120);},true);
  document.addEventListener('change',function(){itemCacheAt=0;setTimeout(function(){tick(true);},160);},true);
  setTimeout(function(){tick(true);},450);setTimeout(function(){tick(true);},1500);setTimeout(function(){tick(true);},3200);
  try{new MutationObserver(function(){clearTimeout(window.__es29mt);window.__es29mt=setTimeout(function(){tick(false);},220);}).observe(document.body,{childList:true,subtree:true});}catch(e){}
})();
