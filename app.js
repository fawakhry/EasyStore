(function(){
  'use strict';

  const VERSION = 'V8 Batch27 Stable Rebuild';
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
  const isLaser = () => /جابر|gaber|jaber|laser|ليزر/.test(roleKey());
  const isPrint = () => /وائل|wael|print|طباع/.test(roleKey());
  const isFinal = () => /رحمه|رحمة|ريفان|ريڤان|rahma|revan|rivan|final/.test(roleKey());
  const roleText = () => isAdmin() ? 'ضياء / مطبخ الحسابات' : isLaser() ? 'جابر / الليزر' : isPrint() ? 'وائل / الطباعة' : isFinal() ? 'رحمة أو ريفان / تقفيل فواتير' : 'موظف';
  const userDept = () => isLaser() ? 'ليزر' : isPrint() ? 'طباعة' : (user.department || '');

  const STORE_KEY = 'EASYSTORE_BATCH27_DATA';
  const state = {
    active: 'dashboard',
    loading: false,
    data: {
      materials: [], templates: [], suppliers: [], purchases: [], sales: [], customers: [],
      stockMoves: [], wasteLines: [], deptLines: [], finalInvoices: [], summary: {}
    },
    recipeComps: []
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

  function screenSales(){
    return `<div class="card"><h2>فاتورة مبيعات</h2><div class="grid four"><div class="field"><label>رقم الفاتورة</label><input id="saNo" value="SAL-${Date.now().toString().slice(-6)}"></div><div class="field"><label>العميل</label><input id="saCustomer" list="custList"><datalist id="custList">${customerOptions()}</datalist></div><div class="field"><label>رقم الأوردر</label><input id="saOrder"></div><div class="field"><label>نوع الدفع</label><select id="saPay"><option>نقدي</option><option>آجل</option><option>جزئي</option></select></div></div><div class="grid six"><div class="field"><label>الصنف</label><select id="saItem" onchange="ES27.applySaleItem()"><option></option>${itemOptions()}</select></div><div class="field"><label>الكمية</label><input id="saQty" type="number" value="1" oninput="ES27.calcSale()"></div><div class="field"><label>سعر البيع</label><input id="saUnit" type="number" oninput="ES27.calcSale()"></div><div class="field"><label>خصم</label><input id="saDiscount" type="number" value="0" oninput="ES27.calcSale()"></div><div class="field"><label>الإجمالي</label><input id="saTotal" readonly></div><div class="field"><label>مدفوع</label><input id="saPaid" type="number" value="0" oninput="ES27.calcSale()"></div></div><div class="grid two"><div class="field"><label>متبقي</label><input id="saRemain" readonly></div><div class="field"><label>ملاحظات</label><input id="saNotes"></div></div><div class="actions"><button class="btn" onclick="ES27.saveSale()">حفظ فاتورة البيع وخصم المخزون</button><button class="btn secondary" onclick="ES27.printSale()">PDF / طباعة</button></div></div>${table(state.data.sales,['رقم','عميل','صنف','كمية','إجمالي','مدفوع','متبقي'],s=>[esc(s.no||s.invoiceNo),esc(s.customer),esc(s.item||s.itemName),esc(s.qty),money(s.total),money(s.paid),money(s.remain)])}`;
  }

  function screenStock(){ return `<div class="card"><h2>المخزون</h2>${table(materials(),['الخامة/الصنف','القسم','النوع','الرصيد','حد النقص','تكلفة','بيع','حالة'],r=>[esc(materialName(r)),esc(matDept(r)),esc(matType(r)),esc(matStock(r)),esc(matMin(r)),isAdmin()?money(matCost(r)):'<span class="costHidden">مخفي</span>',money(matSale(r)),activeRow(r)?'مفعل':'موقوف'])}</div><div class="card"><h3>حركة المخزون</h3>${table(state.data.stockMoves,['التاريخ','الخامة','داخل','خارج','الرصيد','المصدر'],r=>[esc(r.date||r['وقت التسجيل']||''),esc(r.materialName||r['الخامة']||''),esc(r.inQty||r['داخل']||''),esc(r.outQty||r['خارج']||''),esc(r.balance||r['الرصيد']||''),esc(r.source||r['المصدر']||'')])}</div>`; }

  function screenKitchen(){
    if(!isAdmin()) return '<div class="card"><h2>مطبخ الحسابات</h2><div class="warn">هذا القسم يظهر لضياء فقط.</div></div>';
    return `<div class="card"><h2>مطبخ الحسابات</h2><div class="grid three"><button class="btn" onclick="ES27.kitchenMode('raw')">خامة أساسية</button><button class="btn" onclick="ES27.kitchenMode('recipe')">صنف بمكونات</button><button class="btn secondary" onclick="ES27.recalcCascade()">تحديث كل الأسعار المرتبطة</button></div><div id="kitchenBox">${rawForm()}</div></div>${itemsTable()}`;
  }
  function rawForm(){ return `<div class="softBox"><h3>خامة أساسية</h3><input id="rawId" type="hidden"><div class="grid six"><div class="field"><label>القسم</label><select id="rawDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الخامة</label><input id="rawName"></div><div class="field"><label>سعر/تكلفة الأصل</label><input id="rawCost" type="number"></div><div class="field"><label>سعر بيع رسمي</label><input id="rawSale" type="number"></div><div class="field"><label>الرصيد</label><input id="rawStock" type="number"></div><div class="field"><label>حد النقص</label><input id="rawMin" type="number"></div></div><div class="grid four"><div class="field"><label>عرض الخام سم</label><input id="rawW" type="number"></div><div class="field"><label>طول الخام سم</label><input id="rawH" type="number"></div><div class="field"><label>نوع الخامة</label><select id="rawKind"><option>raw</option><option>laser</option><option>paper roll</option><option>lamination roll</option></select></div><div class="field"><label>ملاحظات</label><input id="rawNotes"></div></div><button class="btn" onclick="ES27.saveRaw()">حفظ / تحديث الخامة</button></div>`; }
  function recipeForm(){ return `<div class="softBox"><h3>صنف بمكونات</h3><div class="grid six"><div class="field"><label>القسم</label><select id="recDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الصنف</label><input id="recName"></div><div class="field"><label>مقاس الناتج</label><input id="recSize" placeholder="مثال 15x21"></div><div class="field"><label>سعر بيع رسمي</label><input id="recSale" type="number" oninput="ES27.calcRecipe()"></div><div class="field"><label>تكلفة محسوبة</label><input id="recCost" readonly></div><div class="field"><label>مجمل الربح</label><input id="recProfit" readonly></div></div><div class="grid six"><div class="field"><label>المكون</label><select id="compMat"><option></option>${materialOptions()}</select></div><div class="field"><label>كمية المكون للوحدة</label><input id="compQty" type="number" value="1"></div><div class="field"><label>الناتج AI</label><input id="compAiPieces" readonly></div><div class="field"><label>الناتج اليدوي</label><input id="compManualPieces" type="number"></div><div class="field"><label>هالك</label><input id="compWaste" readonly></div><div class="field"><label>تكلفة المكون</label><input id="compCost" readonly></div></div><div class="actions"><button class="btn secondary" onclick="ES27.aiComp()">احسب AI للمكون</button><button class="btn" onclick="ES27.addComp()">إضافة المكون</button><button class="btn danger" onclick="ES27.clearComps()">تفريغ</button></div><div id="compList">${compTable()}</div><button class="btn" onclick="ES27.saveRecipe()">حفظ / تحديث الصنف</button></div>`; }
  function compTable(){ return table(state.recipeComps,['المكون','استهلاك','تكلفة'],c=>[esc(c.materialName),esc(c.qty),money(c.cost)]); }

  function screenReports(){
    if(!isAdmin()) return '<div class="card"><h2>التقارير</h2><div class="warn">التقارير والأرباح لضياء فقط.</div></div>';
    const sales = (state.data.sales||[]).reduce((s,r)=>s+num(r.total||r.amount),0);
    const purchases = (state.data.purchases||[]).reduce((s,r)=>s+num(r.total||r.amount),0);
    const waste = (state.data.wasteLines||[]).reduce((s,r)=>s+num(r.amount||r.wasteAmount||r.remain),0);
    return `<div class="card"><h2>التقارير</h2><div class="grid four"><div class="kpi"><b>${money(sales)}</b><span>مبيعات</span></div><div class="kpi"><b>${money(purchases)}</b><span>مشتريات</span></div><div class="kpi"><b>${money(sales-purchases-waste)}</b><span>ربح تقديري</span></div><div class="kpi"><b>${money(waste)}</b><span>هوالك</span></div></div></div>`;
  }
  function screenHealth(){ return `<div class="card"><h2>فحص النظام</h2><button class="btn" onclick="ES27.health()">فحص الآن</button><div id="healthBox" class="hint">اضغط فحص الآن.</div></div>`; }

  function laserBox(){
    const opts = materials().filter(r=>/ليزر|laser/i.test(String(matDept(r)+' '+matType(r)+' '+materialName(r)))).map(r=>`<option value="${esc(materialName(r))}">${esc(materialName(r))}</option>`).join('');
    return `<div class="card"><h3>🤖 حاسبة جابر AI من خامات الليزر</h3><div class="grid six"><div class="field"><label>الخامة</label><select id="aiMat"><option></option>${opts}</select></div><div class="field"><label>عرض الشغل</label><input id="aiW" type="number"></div><div class="field"><label>ارتفاع الشغل</label><input id="aiH" type="number"></div><div class="field"><label>كمية</label><input id="aiQty" type="number" value="1"></div><div class="field"><label>هالك %</label><input id="aiWaste" type="number" value="10"></div><div class="field"><label>معامل بيع</label><input id="aiFactor" type="number" value="2.2"></div></div><button class="btn secondary" onclick="ES27.aiLaser()">احسب سعر الليزر</button><span id="aiMsg" class="pill"></span></div>`;
  }
  function screenDept(){
    const d = userDept() || 'طباعة';
    return `${isLaser()?laserBox():''}<div class="card"><h2>فاتورة القسم - ${esc(d)}</h2><div class="grid six"><div class="field"><label>رقم الأوردر</label><input id="dlOrder"></div><div class="field"><label>اسم البند</label><select id="dlItemSel" onchange="ES27.applyDeptItem()"><option></option>${itemOptions()}</select><input id="dlItem" placeholder="أو اكتب بند"></div><div class="field"><label>الكمية</label><input id="dlQty" type="number" value="1" oninput="ES27.calcDept()"></div><div class="field"><label>سعر السيستم</label><input id="dlSystemSale" readonly></div><div class="field"><label>سعر الفاتورة</label><input id="dlSale" type="number" oninput="ES27.calcDept()"></div><div class="field"><label>فرق للهوالك</label><input id="dlDiff" readonly></div></div><div class="field"><label>ملاحظات</label><input id="dlNotes"></div><button class="btn" onclick="ES27.saveDeptLine()">حفظ فاتورة القسم</button><div id="deptMsg"></div></div>`;
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
      saveLocal(); render(); msg('تم التحديث من الشيتات: ' + now());
    }catch(e){
      mergeData(); render(); msg('تنبيه: يعمل بنسخة محلية مؤقتة - ' + e.message, true);
    }finally{ state.loading = false; }
  }

  window.ES27 = {
    go(t){ state.active = t; shell(); },
    load,
    hardReload(){ const url = location.pathname + '?v=es8-batch27-' + Date.now() + '&name=' + encodeURIComponent(user.name) + '&username=' + encodeURIComponent(user.username) + '&token=' + encodeURIComponent(user.token || ''); location.href = url; },
    quickSearch(q){ q=nkey(q); if(!q) return; const found = templates().find(r=>nkey(templateName(r)).includes(q)) || materials().find(r=>nkey(materialName(r)).includes(q)); if(found) flash('تم العثور على: ' + (templateName(found)||materialName(found))); },
    saveSupplier(){ const s={name:val('supName'),phone:val('supPhone'),opening:num(val('supOpening')),address:val('supAddress')}; if(!s.name) return flash('اكتب اسم المورد',true); const i=state.data.suppliers.findIndex(x=>nkey(x.name||x.supplier)===nkey(s.name)); if(i>=0) state.data.suppliers[i]=s; else state.data.suppliers.unshift(s); saveLocal(); api('saveEasyStoreSupplier',s).catch(()=>{}); shell(); flash('تم حفظ المورد'); },
    editSupplier(i){ const s=state.data.suppliers[i]; if(!s) return; set('supName',s.name||s.supplier); set('supPhone',s.phone); set('supOpening',s.opening||s.openingBalance); set('supAddress',s.address); },
    filterCustomers(){ const q=nkey(val('custSearch')); const rows=(state.data.customers||[]).filter(c=>nkey([c.name,c.customerName,c.phone,c.mobile].join(' ')).includes(q)); const box=$('custTable'); if(box) box.innerHTML=customersTable(rows); },
    saveItem(){ const p={department:val('itDept'),itemName:val('itName'),category:val('itType'),size:val('itSize'),salePrice:num(val('itSale')),fixedCost:num(val('itCost')),active:'نعم'}; if(!p.itemName) return flash('اكتب اسم الصنف',true); const i=state.data.templates.findIndex(x=>nkey(templateName(x))===nkey(p.itemName)&&nkey(matDept(x))===nkey(p.department)); if(i>=0) state.data.templates[i]=Object.assign({},state.data.templates[i],p); else state.data.templates.unshift(p); saveLocal(); api('saveAccountingTemplate',p).catch(()=>{}); shell(); flash('تم حفظ الصنف'); },
    editItem(i){ const r=templates()[i]; if(!r) return; set('itDept',matDept(r)); set('itName',templateName(r)); set('itType',r.category||matType(r)); set('itSize',r.size); set('itSale',matSale(r)); set('itCost',matCost(r)); },
    clearItemForm(){ ['itName','itSize','itSale','itCost'].forEach(id=>set(id,'')); },
    archiveItem(i){ const r=templates()[i]; if(!r || !confirm('إيقاف الصنف ' + templateName(r) + '؟')) return; r.active='لا'; r['مفعل']='لا'; saveLocal(); api('archiveAccountingTemplate',{itemName:templateName(r),department:matDept(r)}).catch(()=>{}); shell(); },
    calcPurchase(){ const total=num(val('puQty'))*num(val('puUnit')); set('puTotal',total.toFixed(2)); set('puRemain',Math.max(0,total-num(val('puPaid'))).toFixed(2)); },
    savePurchase(){ this.calcPurchase(); const p={no:val('puNo'),supplier:val('puSupplier'),paymentType:val('puPay'),dueDate:val('puDue'),material:val('puMat'),qty:num(val('puQty')),unit:num(val('puUnit')),paid:num(val('puPaid')),total:num(val('puTotal')),remain:num(val('puRemain')),notes:val('puNotes'),date:new Date().toISOString()}; state.data.purchases.unshift(p); state.data.stockMoves.unshift({date:now(),materialName:p.material,inQty:p.qty,outQty:0,balance:'',source:'فاتورة شراء '+p.no}); saveLocal(); api('saveEasyStorePurchaseV2',p).catch(()=>{}); shell(); flash('تم حفظ فاتورة الشراء'); },
    applySaleItem(){ const r=visibleTemplates()[num(val('saItem'))]; if(!r) return; set('saUnit',matSale(r)); this.calcSale(); },
    calcSale(){ const total=Math.max(0,num(val('saQty'))*num(val('saUnit'))-num(val('saDiscount'))); set('saTotal',total.toFixed(2)); set('saRemain',Math.max(0,total-num(val('saPaid'))).toFixed(2)); },
    saveSale(){ this.calcSale(); const r=visibleTemplates()[num(val('saItem'))]; const p={no:val('saNo'),customer:val('saCustomer'),orderId:val('saOrder'),paymentType:val('saPay'),item:r?templateName(r):val('saItem'),qty:num(val('saQty')),unit:num(val('saUnit')),discount:num(val('saDiscount')),paid:num(val('saPaid')),total:num(val('saTotal')),remain:num(val('saRemain')),notes:val('saNotes'),date:new Date().toISOString()}; state.data.sales.unshift(p); state.data.stockMoves.unshift({date:now(),materialName:p.item,inQty:0,outQty:p.qty,balance:'',source:'فاتورة بيع '+p.no}); saveLocal(); api('saveEasyStoreSaleV2',p).catch(()=>{}); shell(); flash('تم حفظ فاتورة البيع'); },
    printSale(){ const w=window.open('','_blank'); w.document.write(`<html dir="rtl"><head><title>فاتورة مطبعجي</title><style>body{font-family:Tahoma;padding:30px}.box{max-width:720px;margin:auto;border:1px solid #ddd;padding:25px;border-radius:14px}h1{color:#0f766e}</style></head><body><div class="box"><h1>فاتورة مطبعجي</h1><p>العميل: ${esc(val('saCustomer'))}</p><p>الإجمالي: ${esc(val('saTotal'))}</p><p>المدفوع: ${esc(val('saPaid'))}</p><p>المتبقي: ${esc(val('saRemain'))}</p></div><script>print()<\/script></body></html>`); },
    kitchenMode(mode){ const b=$('kitchenBox'); if(b) b.innerHTML = mode==='recipe' ? recipeForm() : rawForm(); },
    saveRaw(){ const p={department:val('rawDept'),materialName:val('rawName'),materialKind:val('rawKind'),unitCost:num(val('rawCost')),salePrice:num(val('rawSale')),stockQty:num(val('rawStock')),minStock:num(val('rawMin')),width:num(val('rawW')),height:num(val('rawH')),notes:val('rawNotes'),active:'نعم'}; if(!p.materialName) return flash('اكتب اسم الخامة',true); const i=state.data.materials.findIndex(x=>nkey(materialName(x))===nkey(p.materialName)&&nkey(matDept(x))===nkey(p.department)); if(i>=0) state.data.materials[i]=Object.assign({},state.data.materials[i],p); else state.data.materials.unshift(p); saveLocal(); api('saveAccountingMaterial',p).catch(()=>{}); shell(); state.active='kitchen'; shell(); flash('تم حفظ الخامة'); },
    aiComp(){ const m=matByName(val('compMat')); if(!m) return flash('اختار المكون',true); const sz=String(val('recSize')).replace(/[×*]/g,'x').split('x').map(num); const outW=sz[0]||0,outH=sz[1]||0, rawW=num(m.width||m.rawWidth||m['عرض']), rawH=num(m.height||m.rawHeight||m['طول']); let pieces=0; if(rawW&&rawH&&outW&&outH){ pieces=Math.max(Math.floor(rawW/outW)*Math.floor(rawH/outH),Math.floor(rawW/outH)*Math.floor(rawH/outW)); } const manual=num(val('compManualPieces')); const adopted=manual||pieces||1; const waste=Math.max(0,(pieces||adopted)-adopted); const qty=1/adopted; const cost=matCost(m)*qty; set('compAiPieces',pieces||''); set('compWaste',waste||''); set('compQty',qty.toFixed(6)); set('compCost',cost.toFixed(4)); },
    addComp(){ const name=val('compMat'); if(!name) return; const m=matByName(name); const qty=num(val('compQty'))||1; const cost=num(val('compCost'))||(m?matCost(m)*qty:0); state.recipeComps.push({materialName:name,qty,cost}); const c=$('compList'); if(c) c.innerHTML=compTable(); this.calcRecipe(); },
    clearComps(){ state.recipeComps=[]; const c=$('compList'); if(c) c.innerHTML=compTable(); this.calcRecipe(); },
    calcRecipe(){ const cost=state.recipeComps.reduce((s,c)=>s+num(c.cost),0); set('recCost',cost.toFixed(2)); const g=gp(cost,num(val('recSale'))); set('recProfit',g.profit.toFixed(2)); return cost; },
    saveRecipe(){ this.calcRecipe(); const p={department:val('recDept'),itemName:val('recName'),size:val('recSize'),salePrice:num(val('recSale')),fixedCost:num(val('recCost')),componentsJson:JSON.stringify(state.recipeComps),category:'صنف مركب',active:'نعم'}; if(!p.itemName) return flash('اكتب اسم الصنف',true); const i=state.data.templates.findIndex(x=>nkey(templateName(x))===nkey(p.itemName)&&nkey(matDept(x))===nkey(p.department)); if(i>=0) state.data.templates[i]=Object.assign({},state.data.templates[i],p); else state.data.templates.unshift(p); saveLocal(); api('saveAccountingTemplate',p).catch(()=>{}); shell(); state.active='kitchen'; shell(); flash('تم حفظ الصنف المركب'); },
    recalcCascade(){ flash('تم تحديث الأسعار المرتبطة محليًا. سيتم الحفظ على الشيت عند تحديث Apps Script.'); api('recalcAccountingMaterialsCascade',{}).catch(()=>{}); },
    applyDeptItem(){ const r=visibleTemplates()[num(val('dlItemSel'))]; if(!r) return; set('dlItem',templateName(r)); set('dlSystemSale',matSale(r).toFixed(2)); set('dlSale',matSale(r).toFixed(2)); this.calcDept(); },
    calcDept(){ const q=num(val('dlQty'))||1, sys=num(val('dlSystemSale')), sale=num(val('dlSale')); set('dlDiff',((sale-sys)*q).toFixed(2)); },
    saveDeptLine(){ this.calcDept(); const p={orderId:val('dlOrder'),department:userDept(),itemName:val('dlItem'),qty:num(val('dlQty')),systemSale:num(val('dlSystemSale')),sale:num(val('dlSale')),diff:num(val('dlDiff')),notes:val('dlNotes'),user:user.name,date:new Date().toISOString()}; state.data.deptLines.unshift(p); if(p.diff) state.data.wasteLines.unshift({department:p.department,orderId:p.orderId,reason:'فرق سعر عن السيستم',amount:p.diff,paid:0}); saveLocal(); api('saveAccountingDeptLine',p).catch(()=>{}); shell(); flash('تم حفظ فاتورة القسم'); },
    aiLaser(){ const m=matByName(val('aiMat')); const w=num(val('aiW')),h=num(val('aiH')),q=num(val('aiQty'))||1; if(!m||!w||!h) return flash('اختار خامة الليزر واكتب المقاس',true); const rawW=num(m.width||m.rawWidth), rawH=num(m.height||m.rawHeight); let pieces=rawW&&rawH?Math.max(Math.floor(rawW/w)*Math.floor(rawH/h),Math.floor(rawW/h)*Math.floor(rawH/w)):1; const waste=num(val('aiWaste')); const adopted=Math.max(1,Math.floor(pieces/(1+waste/100))); const cost=matCost(m)/adopted; const sale=(cost*(num(val('aiFactor'))||2.2)); set('dlItem','ليزر '+materialName(m)+' '+w+'×'+h); set('dlQty',q); set('dlSystemSale',sale.toFixed(2)); set('dlSale',sale.toFixed(2)); this.calcDept(); const a=$('aiMsg'); if(a) a.textContent='الناتج '+pieces+' / المعتمد '+adopted+' / سعر مقترح '+money(sale); },
    saveWaste(){ const p={department:userDept(),orderId:val('waOrder'),reason:val('waReason'),amount:num(val('waAmount')),paid:num(val('waPaid')),user:user.name,date:new Date().toISOString()}; state.data.wasteLines.unshift(p); saveLocal(); api('saveAccountingWaste',p).catch(()=>{}); shell(); flash('تم حفظ الهالك'); },
    collectDeptLines(){ const order=val('fiOrder'); const rows=(state.data.deptLines||[]).filter(r=>String(r.orderId||'')===String(order||'')); const total=rows.reduce((s,r)=>s+num(r.sale)*num(r.qty||1),0); const b=$('finalBox'); if(b) b.innerHTML=table(rows,['القسم','البند','كمية','سعر'],r=>[esc(r.department),esc(r.itemName),esc(r.qty),money(r.sale)])+'<div class="softBox"><b>الإجمالي: '+money(total)+'</b></div>'; },
    saveFinal(){ const order=val('fiOrder'); const rows=(state.data.deptLines||[]).filter(r=>String(r.orderId||'')===String(order||'')); const total=rows.reduce((s,r)=>s+num(r.sale)*num(r.qty||1),0); const p={orderId:order,customer:val('fiCustomer'),total,paid:num(val('fiPaid')),remain:Math.max(0,total-num(val('fiPaid'))),date:new Date().toISOString()}; state.data.finalInvoices.unshift(p); saveLocal(); api('saveAccountingFinalInvoice',p).catch(()=>{}); shell(); flash('تم تقفيل الفاتورة'); },
    health(){ const h=$('healthBox'); if(h) h.innerHTML='جاري الفحص...'; api('getAccounting').then(r=>{ if(h) h.innerHTML = r && r.success!==false ? '✅ الاتصال سليم والبيانات قابلة للتحميل. الإصدار: '+VERSION : '⚠️ الرد غير ناجح: '+esc(r.message); }).catch(e=>{ if(h) h.innerHTML='❌ فشل الاتصال: '+esc(e.message); }); }
  };

  window.ES = window.ES27;
  window.addEventListener('error', e => { console.error(e.error || e.message); msg('تم منع خطأ في EasyStore: ' + (e.message || ''), true); });
  mergeData();
  shell();
  if(window.EASYSTORE_AUTO_REFRESH !== false) setTimeout(()=>load(true), 350);
})();
