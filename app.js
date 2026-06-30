(function(){
  'use strict';

  var BUILD = window.EASYSTORE_BUILD || 'EasyStore V1884 Data Normalizer Production';
  var API_URL = String(window.EASYSTORE_API_URL || window.TREND_API_URL || window.API_URL || '').trim();
  var app = document.getElementById('app');
  var state = {
    user:null,
    active:'dashboard',
    kitchenMode:'raw',
    recipeComps:[],
    finalLines:[],
    message:'',
    loading:false,
    data:{customers:[],users:[],materials:[],templates:[],deptLines:[],finalInvoices:[],purchases:[],wasteLines:[],stockMoves:[],cashbox:[],ledger:[],audit:[]}
  };

  var DEFAULT_USERS = [
    {name:'ضياء',username:'diaa',password:'1234',role:'admin',department:'مشترك'},
    {name:'رحمه',username:'rahma',password:'1234',role:'sales',department:'مبيعات'},
    {name:'ريفان',username:'revan',password:'1234',role:'sales',department:'مبيعات'},
    {name:'وائل',username:'wael',password:'1234',role:'print',department:'طباعة'},
    {name:'جابر',username:'gaber',password:'1234',role:'laser',department:'ليزر'}
  ];
  var MATERIAL_KIND_LABELS = {
    raw:'خامة عامة', laser:'خامة ليزر', 'paper roll':'رول ورق', 'lamination roll':'رول لامينشن', ink:'حبر', 'machine expense':'مصروف ماكينة', 'paper pack':'باكيت ورق',
    'خامة عامة':'خامة عامة','خامة ليزر':'خامة ليزر','رول ورق':'رول ورق','رول لامينشن':'رول لامينشن','حبر':'حبر','مصروف ماكينة':'مصروف ماكينة','باكيت ورق':'باكيت ورق'
  };

  function $(id){ return document.getElementById(id); }
  function text(v){ return v===undefined || v===null ? '' : String(v); }
  function esc(v){ return text(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function num(v){ var n = Number(text(v).replace(/,/g,'')); return isFinite(n)?n:0; }
  function money(v){ return num(v).toLocaleString('ar-EG',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function id(prefix){ return prefix + '_' + Date.now() + '_' + Math.floor(Math.random()*99999); }
  function now(){ return new Date().toLocaleString('ar-EG'); }
  function key(s){ return text(s).trim().replace(/[ـ\u064B-\u065F\u0670]/g,'').replace(/[إأآا]/g,'ا').replace(/[ةه]$/,'ه').replace(/\s+/g,' ').toLowerCase(); }
  function truth(v){ var s=text(v).toLowerCase(); return !(v===false || s==='false' || s==='0' || s==='no' || s==='موقوف' || s==='محذوف'); }
  function isAdmin(){ return state.user && state.user.role==='admin'; }
  function isSales(){ return state.user && (state.user.role==='admin' || state.user.role==='sales'); }
  function isDept(){ return state.user && (state.user.role==='print' || state.user.role==='laser'); }
  function userDept(){ return state.user ? (state.user.department || (state.user.role==='print'?'طباعة':state.user.role==='laser'?'ليزر':'مشترك')) : ''; }
  function canCosts(){ return isAdmin(); }
  function canReports(){ return isAdmin(); }
  function setMsg(m,bad){ state.message = m ? '<div class="notice '+(bad?'bad':'ok')+'">'+esc(m)+'</div>' : ''; render(); }
  function setInline(id,msg,bad){ var el=$(id); if(el) el.innerHTML = msg ? '<div class="notice '+(bad?'bad':'ok')+'">'+esc(msg)+'</div>' : ''; }
  function q(obj){ var p=new URLSearchParams(); Object.keys(obj||{}).forEach(function(k){ if(obj[k]!==undefined && obj[k]!==null) p.set(k, obj[k]); }); return p.toString(); }
  function pick(row, keys){ row=row||{}; for(var i=0;i<keys.length;i++){ var v=row[keys[i]]; if(v!==undefined && v!==null && text(v).trim()!=='') return v; } return ''; }
  function normalizeCustomerRow(r){ var name=pick(r,['name','customerName','اسم الشات / المكتب','اسم العميل']); var phone=pick(r,['phone','mobile','customerPhone','رقم العميل الأساسي','رقم الهاتف','رقم العميل']); return Object.assign({},r,{id:text(pick(r,['id','كود العميل','ID'])||phone||name),name:text(name),customerName:text(name),phone:text(phone),mobile:text(phone),type:text(pick(r,['type','نوع العميل'])),balance:num(pick(r,['balance','رصيد العميل','رصيد العميل.1','مديونية حالية','مديونية','الرصيد الحالي'])),openOrders:num(pick(r,['openOrders','أوردر مفتوح','أوردرات مفتوحة']))}); }
  function normalizeMaterialRow(r){ var name=pick(r,['name','materialName','اسم الخامة','الخامة']); return Object.assign({},r,{id:text(pick(r,['id','ID'])),name:text(name),materialName:text(name),department:text(pick(r,['department','القسم']))||'مشترك',kind:text(pick(r,['kind','rawKind','نوع الخامة','تصنيف الخامة']))||'raw',itemType:text(pick(r,['itemType']))||'raw',cost:num(pick(r,['cost','unitCost','calculatedUnitCost','تكلفة محسوبة','سعر الوحدة','التكلفة'])),salePrice:num(pick(r,['salePrice','sale','price','سعر بيع رسمي','سعر البيع','سعر بيع مقترح'])),stock:num(pick(r,['stock','balance','رصيد المخزن','الرصيد'])),minStock:num(pick(r,['minStock','حد تنبيه النقص'])),active:pick(r,['active','مفعل','مفعل؟'])||true}); }
  function normalizeTemplateRow(r){ var name=pick(r,['name','itemName','templateName','اسم البند','اسم الصنف','اسم المنتج']); return Object.assign({},r,{id:text(pick(r,['id','ID','كود المنتج'])),name:text(name),itemName:text(name),department:text(pick(r,['department','القسم']))||'مشترك',itemType:text(pick(r,['itemType','التصنيف']))||'product',size:text(pick(r,['size','المقاس'])),salePrice:num(pick(r,['salePrice','sale','price','سعر بيع مقترح','سعر بيع رسمي','سعر البيع'])),cost:num(pick(r,['cost','calculatedCost','إجمالي التكلفة','تكلفة محسوبة','التكلفة'])),profit:num(pick(r,['profit','الربح'])),components:pick(r,['components','componentsJson','مكونات الخامة','المكونات'])||'[]',active:pick(r,['active','مفعل','مفعل؟'])||true}); }
  function normalizeDeptLineRow(r){ var oid=pick(r,['orderId','رقم الأوردر','كود الأوردر']); var lid=pick(r,['id','lineId','رقم البند']); var item=pick(r,['itemName','name','اسم البند / نوع الشغل','اسم البند','نوع الشغل الأصلي','اللي اتعمل فعليًا']); var sale=num(pick(r,['sale','price','سعر البيع','سعر ضياء','سعر النظام','الإجمالي','total'])); var qty=num(pick(r,['qty','الكمية'])||1); return Object.assign({},r,{id:text(lid),orderId:text(oid),customerName:text(pick(r,['customerName','اسم الشات / المكتب','اسم العميل'])),customerPhone:text(pick(r,['customerPhone','رقم العميل الأساسي','رقم الهاتف','رقم العميل'])),department:text(pick(r,['department','القسم','قسم الصنف']))||'مشترك',itemName:text(item),qty:qty,sale:sale,systemSale:num(pick(r,['systemSale','سعر النظام','سعر ضياء'])),total:num(pick(r,['total','الإجمالي']))||qty*sale,status:text(pick(r,['status','الحالة','حالة التقفيل','حالة الفوترة']))||'غير مفوتر',shared:text(pick(r,['shared','بند مشترك','مشترك'])),cost:num(pick(r,['cost','إجمالي التكلفة','تكلفة النظام']))}); }
  function normalizeInvoiceRow(r){ return Object.assign({},r,{id:text(pick(r,['id','ID','رقم الفاتورة'])),invoiceNo:text(pick(r,['invoiceNo','رقم الفاتورة'])),customerName:text(pick(r,['customerName','اسم العميل'])),customerPhone:text(pick(r,['customerPhone','رقم العميل','رقم الهاتف'])),orderId:text(pick(r,['orderId','رقم الأوردر'])),total:num(pick(r,['total','الإجمالي النهائي','الإجمالي'])),paid:num(pick(r,['paid','المدفوع'])),remaining:num(pick(r,['remaining','الباقي','المتبقي'])),status:text(pick(r,['status','الحالة'])),linesJson:pick(r,['linesJson','بنود الأقسام'])}); }
  function normalizePayloadArray(k, arr){ arr=Array.isArray(arr)?arr:[]; if(k==='customers') return arr.map(normalizeCustomerRow).filter(function(c){return text(c.name)||text(c.phone);}); if(k==='materials') return arr.map(normalizeMaterialRow).filter(function(x){return text(x.name);}); if(k==='templates') return arr.map(normalizeTemplateRow).filter(function(x){return text(x.name);}); if(k==='deptLines') return arr.map(normalizeDeptLineRow).filter(function(x){return text(x.orderId)||text(x.customerName)||text(x.itemName);}); if(k==='finalInvoices') return arr.map(normalizeInvoiceRow); return arr; }

  function api(action,data){
    data = data || {};
    if(!API_URL) return Promise.reject(new Error('رابط السيرفر غير مضبوط في config.js'));
    return new Promise(function(resolve,reject){
      var callback = 'EASYSTORE_CLEAN_' + Date.now() + '_' + Math.floor(Math.random()*99999);
      var done = false;
      var script = document.createElement('script');
      function clean(){ if(done) return; done=true; try{ delete window[callback]; }catch(e){ window[callback]=undefined; } if(script.parentNode) script.parentNode.removeChild(script); }
      window[callback] = function(res){ clean(); resolve(res || {}); };
      script.onerror = function(){ clean(); reject(new Error('فشل الاتصال بالسيرفر')); };
      script.src = API_URL + (API_URL.indexOf('?')>=0?'&':'?') + q(Object.assign({}, data, {action:action, callback:callback, _t:Date.now()}));
      document.body.appendChild(script);
      window.setTimeout(function(){ if(!done){ clean(); reject(new Error('انتهت مهلة الاتصال بالسيرفر')); } }, 25000);
    });
  }

  function normalizeUser(u){
    var name = text(u.name || u.fullName || u.username || 'مستخدم');
    var rawRole = key(u.role || u.mode || '');
    var r = rawRole.indexOf('admin')>=0 || rawRole==='full' || name==='ضياء' ? 'admin' : rawRole.indexOf('print')>=0 || name==='وائل' ? 'print' : rawRole.indexOf('laser')>=0 || name==='جابر' ? 'laser' : 'sales';
    return {name:name,username:text(u.username||name),role:r,department:text(u.department || (r==='print'?'طباعة':r==='laser'?'ليزر':r==='sales'?'مبيعات':'مشترك'))};
  }
  function loginFallback(username,password){
    var ukey=key(username), pass=text(password).trim();
    return DEFAULT_USERS.find(function(u){ return (key(u.username)===ukey || key(u.name)===ukey) && (!u.password || !pass || u.password===pass); });
  }
  function showLogin(error){
    app.innerHTML = '<div class="loginShell"><div class="loginCard"><div class="brand"><div class="logo">ES</div><div><h1 style="margin:0">EasyStore مطبعجي</h1><div class="muted">'+esc(BUILD)+'</div></div></div>'+(error?'<div class="notice bad">'+esc(error)+'</div>':'')+'<div class="field"><label>اسم المستخدم</label><input id="loginUser" placeholder="ضياء / رحمه / ريفان / وائل / جابر"></div><div class="field"><label>كلمة المرور</label><input id="loginPass" type="password" placeholder="اتركها فارغة أو اكتب 1234"></div><button id="loginBtn" class="btn" style="width:100%">دخول</button><div class="actions" style="margin-top:10px;justify-content:center"><button type="button" class="btn small ghost" data-login="ضياء">ضياء</button><button type="button" class="btn small ghost" data-login="رحمه">رحمه</button><button type="button" class="btn small ghost" data-login="ريفان">ريفان</button><button type="button" class="btn small ghost" data-login="وائل">وائل</button><button type="button" class="btn small ghost" data-login="جابر">جابر</button></div><p class="muted" style="font-size:12px">النسخة تحميل واحد. كلمة المرور الافتراضية: فارغة أو 1234. أزرار الأسماء تفتح محليًا حتى لو السيرفر لا يرد.</p></div></div>';
    $('loginBtn').onclick=login;
    Array.prototype.forEach.call(app.querySelectorAll('[data-login]'), function(b){ b.onclick=function(){ $('loginUser').value=b.getAttribute('data-login'); $('loginPass').value=''; login(); }; });
    ['loginUser','loginPass'].forEach(function(x){ var el=$(x); if(el) el.addEventListener('keydown',function(ev){ if(ev.key==='Enter') login(); }); });
    var f=$('loginUser'); if(f) f.focus();
  }
  function login(){
    var username=text($('loginUser').value).trim(), password=text($('loginPass').value).trim();
    if(!username){ showLogin('اكتب اسم المستخدم أو اضغط على اسم من الأزرار السريعة.'); return; }

    // V1884: افتح مستخدمي التشغيل الداخليين محليًا أولًا، ثم حمّل البيانات من السيرفر إن كان متاحًا.
    var fb = loginFallback(username,password);
    if(fb){
      state.user=normalizeUser(fb);
      try{ sessionStorage.setItem('EASYSTORE_USER', JSON.stringify(state.user)); }catch(e){}
      state.active = state.user.role==='print' || state.user.role==='laser' ? 'dept' : 'dashboard';
      render();
      load(true);
      return;
    }

    if(API_URL){
      api('login',{username:username,password:password,app:'EasyStore'}).then(function(res){
        if(!res.success) throw new Error(res.message || 'بيانات الدخول غير صحيحة');
        state.user = normalizeUser(res.user || res);
        try{ sessionStorage.setItem('EASYSTORE_USER', JSON.stringify(state.user)); }catch(e){}
        state.active = state.user.role==='print' || state.user.role==='laser' ? 'dept' : 'dashboard';
        render(); return load(false);
      }).catch(function(e){
        showLogin((e.message || 'تعذر الدخول') + ' — جرّب الاسم العربي: ضياء / رحمه / ريفان / وائل / جابر أو كلمة المرور 1234.');
      });
    } else {
      showLogin('رابط السيرفر غير مضبوط، واسم المستخدم غير موجود ضمن مستخدمي التشغيل الداخليين.');
    }
  }

  function load(silent){
    if(!state.user) return Promise.resolve();
    state.loading = true; if(!silent) render();
    if(!API_URL){ state.loading=false; if(!silent) setMsg('تم فتح البرنامج بدون سيرفر. اضبط config.js للربط بالشيت.', true); return Promise.resolve(); }
    return api('getAccounting',{username:state.user.username,role:state.user.role,department:state.user.department}).then(function(res){
      if(!res.success) throw new Error(res.message || 'تعذر تحميل الحسابات');
      ['customers','users','materials','templates','deptLines','finalInvoices','purchases','wasteLines','stockMoves','cashbox','ledger','audit'].forEach(function(k){ state.data[k]=normalizePayloadArray(k, res[k]); });
      state.loading=false;
      if(!silent) setMsg('تم تحديث البيانات يدويًا: '+now()); else render();
    }).catch(function(e){ state.loading=false; setMsg(e.message || 'خطأ في تحميل البيانات', true); });
  }

  function materialName(r){ return text(r.name || r.materialName || r['الخامة'] || r['اسم الخامة']); }
  function matDept(r){ return text(r.department || r.dept || r['القسم'] || 'مشترك'); }
  function matKind(r){ return text(r.kind || r.rawKind || r.typeLabel || r['نوع الخامة'] || r.type || 'raw'); }
  function matCost(r){ return num(r.cost || r.unitCost || r.calculatedUnitCost || r['التكلفة'] || 0); }
  function matSale(r){ return num(r.salePrice || r.sale || r.price || r['سعر البيع'] || 0); }
  function matStock(r){ return num(r.stock || r.balance || r['الرصيد'] || 0); }
  function productName(r){ return text(r.name || r.itemName || r.templateName || r['اسم الصنف']); }
  function productDept(r){ return text(r.department || r.dept || r['القسم'] || 'مشترك'); }
  function productSale(r){ return num(r.salePrice || r.sale || r.price || r['سعر البيع'] || 0); }
  function productCost(r){ return num(r.cost || r.calculatedCost || r['التكلفة'] || 0); }
  function productComponents(r){ try{ var c = r.components || r.componentsJson || r['المكونات']; return Array.isArray(c)?c:JSON.parse(c||'[]'); }catch(e){ return []; } }
  function materialRows(){ return (state.data.materials||[]).filter(function(r){ return truth(r.active!==undefined?r.active:r.status) && text(r.itemType||r.type||'raw') !== 'product'; }); }
  function productRows(){ return (state.data.templates||[]).filter(function(r){ return truth(r.active!==undefined?r.active:r.status); }); }
  function productsForDept(){
    var dept = userDept();
    return productRows().filter(function(r){ var d=productDept(r); return isAdmin() || isSales() || d===dept || d==='مشترك' || text(r.shared)==='true'; });
  }
  function materialLabel(kind){ return MATERIAL_KIND_LABELS[text(kind)] || MATERIAL_KIND_LABELS[key(kind)] || text(kind) || 'خامة عامة'; }
  function customerName(c){ return text(c.name || c.customerName || c['اسم العميل']); }
  function customerPhone(c){ return text(c.phone || c.mobile || c.customerPhone || c['رقم العميل']); }

  function render(){
    if(!state.user){ showLogin(); return; }
    app.innerHTML = '<div class="topbar"><div class="topInner"><div class="brand"><div class="logo">ES</div><div><b>EasyStore مطبعجي - برنامج الحسابات</b><div class="muted">'+esc(BUILD)+'</div></div></div><div class="topActions"><span class="pill">'+esc(state.user.name)+' • '+esc(state.user.department)+'</span><button class="btn light" id="refreshBtn">تحديث البيانات</button><button class="btn secondary" id="reloadBtn">تحديث البرنامج</button><button class="btn danger" id="logoutBtn">خروج</button></div></div></div><main class="appShell">'+state.message+(state.loading?'<div class="notice">جار تحميل البيانات...</div>':'')+tabs()+screen()+'<div class="footer">'+esc(BUILD)+' — لا يوجد تحديث تلقائي؛ التحديث يدوي أو بعد حفظ/تعديل/حذف.</div></main>';
    bindGlobal(); bindScreen();
  }
  function availableTabs(){
    var tabs = [];
    if(isAdmin() || isSales()) tabs.push(['dashboard','الرئيسية'],['sales','فاتورة المبيعات'],['customers','العملاء والحسابات']);
    if(isAdmin()) tabs.push(['kitchen','مطبخ الحسابات'],['purchase','المشتريات'],['stock','المخزون'],['reports','الأرباح والتقارير'],['zero','تهيئة وضع الصفر']);
    if(isDept() || isAdmin()) tabs.push(['dept','فاتورة القسم']);
    if(isAdmin() || isSales()) tabs.push(['deptView','أجزاء الأقسام'],['cashbox','الخزنة']);
    tabs.push(['health','فحص النظام']);
    return tabs;
  }
  function tabs(){ return '<div class="tabs">'+availableTabs().map(function(t){ return '<button class="tab '+(state.active===t[0]?'active':'')+'" data-tab="'+t[0]+'">'+t[1]+'</button>'; }).join('')+'</div>'; }
  function bindGlobal(){
    document.querySelectorAll('[data-tab]').forEach(function(b){ b.onclick=function(){ state.active=b.getAttribute('data-tab'); state.message=''; render(); }; });
    var r=$('refreshBtn'); if(r) r.onclick=function(){ load(false); };
    var rr=$('reloadBtn'); if(rr) rr.onclick=function(){ location.reload(); };
    var l=$('logoutBtn'); if(l) l.onclick=function(){ try{sessionStorage.removeItem('EASYSTORE_USER');}catch(e){} state.user=null; showLogin(); };
  }
  function screen(){
    var s=state.active;
    if(s==='kitchen') return screenKitchen();
    if(s==='dept') return screenDept();
    if(s==='sales') return screenSales();
    if(s==='customers') return screenCustomers();
    if(s==='purchase') return screenPurchase();
    if(s==='stock') return screenStock();
    if(s==='reports') return screenReports();
    if(s==='zero') return screenZero();
    if(s==='deptView') return screenDeptView();
    if(s==='cashbox') return screenCashbox();
    if(s==='health') return screenHealth();
    return screenDashboard();
  }
  function screenDashboard(){
    var deptTotal = (state.data.deptLines||[]).filter(function(x){ return text(x.status)!=='مفوتر'; }).reduce(function(a,b){ return a+num(b.total||b.sale); },0);
    var invTotal = (state.data.finalInvoices||[]).reduce(function(a,b){ return a+num(b.total); },0);
    var remaining = (state.data.finalInvoices||[]).reduce(function(a,b){ return a+num(b.remaining); },0);
    return '<div class="grid four"><div class="card"><h3>الخامات الأساسية</h3><div class="stat">'+materialRows().length+'</div></div><div class="card"><h3>الأصناف بمكوناتها</h3><div class="stat">'+productRows().length+'</div></div><div class="card"><h3>أجزاء غير مفوترة</h3><div class="stat">'+money(deptTotal)+'</div></div><div class="card"><h3>متبقي العملاء</h3><div class="stat">'+money(remaining)+'</div></div></div><div class="card"><h2>ملخص التشغيل</h2><p class="muted">الخامات منفصلة عن الأصناف. فواتير الأقسام تسحب الأصناف بمكوناتها فقط، وفاتورة البيع النهائية منفصلة.</p></div>';
  }
  function screenKitchen(){
    if(!isAdmin()) return '<div class="empty">مطبخ الحسابات متاح لضياء فقط.</div>';
    return '<div class="card"><div class="sectionHead"><h2>مطبخ الحسابات</h2><div class="toolbar"><span class="pill">عدد الخامات الأساسية: '+materialRows().length+'</span><span class="pill">عدد الأصناف بمكوناتها: '+productRows().length+'</span></div></div><div class="tabs"><button class="tab '+(state.kitchenMode==='raw'?'active':'')+'" id="rawModeBtn">الخامات الأساسية</button><button class="tab '+(state.kitchenMode==='recipe'?'active':'')+'" id="recipeModeBtn">صنف بمكونات</button><button class="tab" id="recalcBtn">إعادة حساب الأصناف المرتبطة</button></div><div id="kitchenForm">'+(state.kitchenMode==='recipe'?recipeForm():rawForm())+'</div></div>'+materialTable()+'<div class="card"><div class="sectionHead"><h3>الأصناف بمكوناتها</h3><span class="pill">'+productRows().length+' صنف</span></div>'+productTable()+'</div>';
  }
  function rawForm(){
    return '<div class="softBox"><h3>تسجيل خامة أساسية</h3><input id="rawId" type="hidden"><div class="grid six"><div class="field"><label>القسم</label><select id="rawDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الخامة</label><input id="rawName"></div><div class="field"><label>نوع الخامة</label><select id="rawKind"><option value="raw">خامة عامة</option><option value="laser">خامة ليزر</option><option value="paper roll">رول ورق</option><option value="lamination roll">رول لامينشن</option><option value="ink">حبر</option><option value="machine expense">مصروف ماكينة</option><option value="paper pack">باكيت ورق</option></select></div><div class="field"><label>تكلفة الوحدة</label><input id="rawCost" type="number" step="0.01"></div><div class="field"><label>سعر بيع رسمي إن وجد</label><input id="rawSale" type="number" step="0.01"></div><div class="field"><label>رصيد افتتاحي</label><input id="rawStock" type="number" step="0.01"></div></div><div class="grid six"><div class="field"><label>حد النقص</label><input id="rawMin" type="number" step="0.01"></div><div class="field"><label>عرض الخام سم</label><input id="rawW" type="number" step="0.01"></div><div class="field"><label>طول الخام سم</label><input id="rawH" type="number" step="0.01"></div><div class="field"><label>بند تشغيل</label><select id="rawBand"><option>إنتاج مباشر</option><option>مصروفات تشغيل الطباعة</option><option>مصروفات تشغيل الليزر</option><option>مصروفات تشغيل مشتركة</option></select></div><div class="field"><label>طريقة توزيع التشغيل</label><select id="rawMethod"><option>لا يوزع</option><option>ثابت على الفاتورة</option><option>بالمتر</option><option>بالمتر المربع</option><option>نسبة من الفاتورة</option><option>يدوي</option></select></div><div class="field"><label>قيمة التشغيل</label><input id="rawOpCost" type="number" step="0.01"></div></div><div class="field"><label>ملاحظات</label><input id="rawNotes"></div><div class="actions"><button class="btn" id="saveRawBtn">حفظ / تحديث الخامة</button><button class="btn secondary" id="clearRawBtn">جديد</button></div></div>';
  }
  function materialOptions(){ return materialRows().map(function(m){ var label=materialName(m)+' — '+matDept(m)+' — '+materialLabel(matKind(m)); return '<option value="'+esc(m.id||materialName(m))+'">'+esc(label)+'</option>'; }).join(''); }
  function recipeForm(){
    return '<div class="softBox"><h3>تسجيل صنف بمكونات</h3><input id="recId" type="hidden"><div class="grid six"><div class="field"><label>القسم</label><select id="recDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الصنف</label><input id="recName"></div><div class="field"><label>مقاس الناتج</label><input id="recSize" placeholder="15x21"></div><div class="field"><label>سعر بيع رسمي</label><input id="recSale" type="number" step="0.01"></div><div class="field"><label>تكلفة محسوبة</label><input id="recCost" readonly></div><div class="field"><label>مجمل الربح</label><input id="recProfit" readonly></div></div><div class="grid six"><div class="field"><label>المكون</label><select id="compMaterial"><option></option>'+materialOptions()+'</select></div><div class="field"><label>كمية مستخدمة</label><input id="compQty" type="number" step="0.01" value="1"></div><div class="field"><label>عدد الناتج</label><input id="compOutput" type="number" step="0.01" value="1"></div><div class="field"><label>الهالك %</label><input id="compWaste" type="number" step="0.01" value="0"></div><div class="field"><label>تكلفة المكون</label><input id="compCost" readonly></div><div class="field"><label>AI الناتج من المقاس</label><input id="compAutoOutput" readonly></div></div><div class="actions"><button class="btn secondary" id="autoCompBtn">احسب الناتج</button><button class="btn" id="addCompBtn">إضافة المكون</button><button class="btn danger" id="clearCompsBtn">تفريغ المكونات</button></div><div id="compList">'+compTable()+'</div><div class="actions"><button class="btn" id="saveRecipeBtn">حفظ / تحديث الصنف</button><button class="btn secondary" id="clearRecipeBtn">جديد</button></div><p class="muted">إذا اخترت مكونًا ولم تضغط إضافة، سيتم ضمه تلقائيًا عند حفظ الصنف.</p></div>';
  }
  function materialTable(){
    var rows=materialRows();
    if(!rows.length) return '<div class="card"><h3>الخامات الأساسية المسجلة</h3><div class="empty">لا توجد خامات أساسية بعد.</div></div>';
    return '<div class="card"><div class="sectionHead"><h3>الخامات الأساسية المسجلة</h3><span class="pill">'+rows.length+' خامة</span></div><div class="tableWrap"><table><thead><tr><th>الخامة</th><th>القسم</th><th>النوع</th><th>التكلفة</th><th>الرصيد</th><th>تعديل</th></tr></thead><tbody>'+rows.map(function(r,i){ return '<tr><td>'+esc(materialName(r))+'</td><td>'+esc(matDept(r))+'</td><td>'+esc(materialLabel(matKind(r)))+'</td><td>'+(canCosts()?money(matCost(r)):'<span class="costHidden">مخفي</span>')+'</td><td>'+money(matStock(r))+'</td><td><button class="btn small secondary" data-edit-raw="'+i+'">تعديل</button></td></tr>'; }).join('')+'</tbody></table></div></div>';
  }
  function productTable(){
    var rows=productRows(); if(!rows.length) return '<div class="empty">لا توجد أصناف بمكونات بعد.</div>';
    return '<div class="tableWrap"><table><thead><tr><th>الصنف</th><th>القسم</th><th>سعر البيع</th><th>التكلفة</th><th>الربح</th><th>المكونات</th><th>تعديل</th></tr></thead><tbody>'+rows.map(function(r,i){ var comps=productComponents(r); var cost=productCost(r); return '<tr><td>'+esc(productName(r))+'</td><td>'+esc(productDept(r))+'</td><td>'+money(productSale(r))+'</td><td>'+(canCosts()?money(cost):'<span class="costHidden">مخفي</span>')+'</td><td>'+(canCosts()?money(productSale(r)-cost):'<span class="costHidden">مخفي</span>')+'</td><td>'+comps.length+'</td><td><button class="btn small secondary" data-edit-rec="'+i+'">تعديل</button></td></tr>'; }).join('')+'</tbody></table></div>';
  }
  function compTable(){
    if(!state.recipeComps.length) return '<div class="empty">لم تضف مكونات بعد.</div>';
    return '<div class="tableWrap"><table><thead><tr><th>المكون</th><th>الكمية</th><th>عدد الناتج</th><th>هالك</th><th>التكلفة</th><th>حذف</th></tr></thead><tbody>'+state.recipeComps.map(function(c,i){ return '<tr><td>'+esc(c.materialName)+'</td><td>'+esc(c.qty)+'</td><td>'+esc(c.outputCount)+'</td><td>'+esc(c.wastePercent)+'%</td><td>'+money(c.cost)+'</td><td><button class="btn small danger" data-del-comp="'+i+'">حذف</button></td></tr>'; }).join('')+'</tbody></table></div>';
  }
  function screenDept(){
    var items = productsForDept();
    var empty = !items.length ? '<div class="notice bad">لا توجد أصناف مفعلة لهذا القسم</div>' : '';
    return '<div class="card"><div class="sectionHead"><h2>فاتورة القسم</h2><span class="pill">'+esc(userDept())+'</span></div>'+empty+'<div class="grid four"><div class="field"><label>اسم العميل</label><input id="dlCustomer" list="deptCustomers"></div><div class="field"><label>هاتف العميل</label><input id="dlPhone"></div><div class="field"><label>رقم الأوردر</label><input id="dlOrder"></div><div class="field"><label>الصنف</label><select id="dlItem"><option></option>'+items.map(function(p){ return '<option value="'+esc(p.id||productName(p))+'">'+esc(productName(p)+' — '+productDept(p))+'</option>'; }).join('')+'</select></div></div><div class="grid six"><div class="field"><label>الكمية</label><input id="dlQty" type="number" step="0.01" value="1"></div><div class="field"><label>سعر السيستم</label><input id="dlSystemSale" readonly></div><div class="field"><label>سعر الفاتورة</label><input id="dlSale" type="number" step="0.01"></div><div class="field"><label>الإجمالي</label><input id="dlTotal" readonly></div><div class="field"><label>فرق للهوالك</label><input id="dlDiff" readonly></div><div class="field"><label>بند مشترك</label><select id="dlShared"><option value="false">لا</option><option value="true">نعم</option></select></div></div><div class="field"><label>ملاحظات</label><input id="dlNotes"></div><div class="actions"><button class="btn" id="saveDeptBtn">تسجيل البند</button><button class="btn secondary" id="saveDeptOpenSalesBtn">تسجيل وإرساله لفاتورة البيع</button></div><datalist id="deptCustomers">'+customerDatalist()+'</datalist><div id="deptMsg"></div></div>'+laserCalculator()+deptLinesTable((state.data.deptLines||[]).filter(function(x){ return isAdmin() || isSales() || text(x.department)===userDept() || text(x.shared)==='true'; }));
  }
  function laserCalculator(){
    if(!(isAdmin() || userDept()==='ليزر')) return '';
    return '<div class="card"><h2>حاسبة جابر للمقاسات</h2><div class="grid six"><div class="field"><label>الخامة</label><select id="laserMat"><option></option>'+materialRows().filter(function(m){return matDept(m)==='ليزر'||matDept(m)==='مشترك';}).map(function(m){return '<option value="'+esc(m.id||materialName(m))+'">'+esc(materialName(m))+'</option>';}).join('')+'</select></div><div class="field"><label>عرض الشغل سم</label><input id="laserW" type="number" step="0.01"></div><div class="field"><label>ارتفاع الشغل سم</label><input id="laserH" type="number" step="0.01"></div><div class="field"><label>كمية</label><input id="laserQty" type="number" value="1"></div><div class="field"><label>هالك %</label><input id="laserWaste" type="number" value="10"></div><div class="field"><label>معامل البيع</label><input id="laserFactor" type="number" value="2.2"></div></div><button class="btn secondary" id="laserCalcBtn">احسب السعر</button><span id="laserMsg" class="pill"></span></div>';
  }
  function deptLinesTable(rows){
    if(!rows.length) return '<div class="card"><h3>أجزاء الأقسام</h3><div class="empty">لا توجد بنود مسجلة.</div></div>';
    return '<div class="card"><h3>أجزاء الأقسام</h3><div class="tableWrap"><table><thead><tr><th>الأوردر</th><th>العميل</th><th>القسم</th><th>الصنف</th><th>كمية</th><th>سعر</th><th>إجمالي</th><th>الحالة</th></tr></thead><tbody>'+rows.map(function(r){ return '<tr><td>'+esc(r.orderId)+'</td><td>'+esc(r.customerName)+'</td><td>'+esc(r.department)+'</td><td>'+esc(r.itemName)+'</td><td>'+esc(r.qty)+'</td><td>'+money(r.sale)+'</td><td>'+money(r.total||num(r.qty)*num(r.sale))+'</td><td>'+esc(r.status||'غير مفوتر')+'</td></tr>'; }).join('')+'</tbody></table></div></div>';
  }
  function screenSales(){
    if(!isSales()) return '<div class="empty">فاتورة المبيعات متاحة للمبيعات والإدارة فقط.</div>';
    return '<div class="card"><div class="sectionHead"><h2>فاتورة المبيعات النهائية</h2><span class="pill">منفصلة عن فاتورة القسم</span></div><div class="grid four"><div class="field"><label>العميل</label><input id="fiCustomer" list="saleCustomers"></div><div class="field"><label>هاتف العميل</label><input id="fiPhone"></div><div class="field"><label>رقم الأوردر</label><input id="fiOrder"></div><div class="field"><label>مدفوع</label><input id="fiPaid" type="number" step="0.01" value="0"></div></div><div class="actions"><button class="btn secondary" id="pullDeptBtn">تحميل بنود الأقسام غير المفوترة</button><button class="btn secondary" id="addManualBtn">إضافة بند يدوي</button><button class="btn danger" id="addDiscountBtn">إضافة خصم</button></div><datalist id="saleCustomers">'+customerDatalist()+'</datalist><div id="finalLinesBox" class="invoiceBox">'+finalLinesHtml()+'</div><div class="actions"><button class="btn" id="saveFinalBtn">حفظ الفاتورة النهائية</button></div><div id="finalMsg"></div></div>'+finalInvoicesTable();
  }
  function finalLinesHtml(){
    if(!state.finalLines.length) return '<div class="empty">لا توجد بنود في الفاتورة.</div>';
    var subtotal=state.finalLines.reduce(function(a,b){ return a+num(b.total); },0); var paid=num($('fiPaid')&&$('fiPaid').value); var total=subtotal; var rem=total-paid;
    return '<div class="tableWrap"><table><thead><tr><th>البند</th><th>القسم</th><th>كمية</th><th>سعر</th><th>إجمالي</th><th>حذف</th></tr></thead><tbody>'+state.finalLines.map(function(l,i){ return '<tr><td>'+esc(l.itemName)+'</td><td>'+esc(l.department||'بيع')+'</td><td>'+esc(l.qty)+'</td><td>'+money(l.sale)+'</td><td>'+money(l.total)+'</td><td><button class="btn small danger" data-del-final="'+i+'">حذف</button></td></tr>'; }).join('')+'</tbody></table></div><div class="grid three"><div class="pill">الإجمالي: '+money(total)+'</div><div class="pill">المدفوع: '+money(paid)+'</div><div class="pill '+(rem>0?'warn':'')+'">المتبقي: '+money(rem)+'</div></div>';
  }
  function finalInvoicesTable(){
    var rows=state.data.finalInvoices||[]; if(!rows.length) return '<div class="card"><h3>الفواتير النهائية</h3><div class="empty">لا توجد فواتير محفوظة.</div></div>';
    return '<div class="card"><h3>الفواتير النهائية</h3><div class="tableWrap"><table><thead><tr><th>رقم</th><th>العميل</th><th>الأوردر</th><th>إجمالي</th><th>مدفوع</th><th>متبقي</th></tr></thead><tbody>'+rows.map(function(r){ return '<tr><td>'+esc(r.invoiceNo||r.id)+'</td><td>'+esc(r.customerName)+'</td><td>'+esc(r.orderId)+'</td><td>'+money(r.total)+'</td><td>'+money(r.paid)+'</td><td>'+money(r.remaining)+'</td></tr>'; }).join('')+'</tbody></table></div></div>';
  }
  function customerDatalist(){ return (state.data.customers||[]).map(function(c){ return '<option value="'+esc(customerName(c))+'">'+esc(customerPhone(c))+'</option>'; }).join(''); }
  function screenCustomers(){
    if(!isSales()) return '<div class="empty">العملاء والحسابات للمبيعات والإدارة فقط.</div>';
    return '<div class="card"><div class="sectionHead"><h2>العملاء والحسابات</h2><span class="pill">'+(state.data.customers||[]).length+' عميل</span></div><div class="grid four"><div class="field"><label>اختيار العميل</label><input id="accCustomer" list="accCustomers"></div><div class="field"><label>هاتف</label><input id="accPhone"></div><div class="field"><label>نوع/مسؤول</label><input id="accType"></div><div class="field"><label>رصيد افتتاحي</label><input id="accOpening" type="number" step="0.01"></div></div><div class="actions"><button class="btn" id="saveCustomerBtn">حفظ / تحديث العميل</button><button class="btn secondary" id="loadCustomerAccountBtn">عرض الحساب</button></div><datalist id="accCustomers">'+customerDatalist()+'</datalist><div id="customerAccountBox"></div></div>'+customersTable();
  }
  function customersTable(){
    var rows=state.data.customers||[]; if(!rows.length) return '<div class="empty">لا يوجد عملاء.</div>';
    return '<div class="card"><h3>قائمة العملاء</h3><div class="tableWrap"><table><thead><tr><th>العميل</th><th>الهاتف</th><th>الرصيد</th><th>فواتير</th><th>مدفوع</th><th>متبقي</th><th>أوردر مفتوح</th></tr></thead><tbody>'+rows.map(function(c){ var acc=calcCustomerAccount(customerName(c),customerPhone(c)); return '<tr><td>'+esc(customerName(c))+'</td><td>'+esc(customerPhone(c))+'</td><td>'+money(c.balance||acc.remaining)+'</td><td>'+money(acc.total)+'</td><td>'+money(acc.paid)+'</td><td>'+money(acc.remaining)+'</td><td>'+(acc.openOrders?'<span class="pill warn">'+acc.openOrders+'</span>':'0')+'</td></tr>'; }).join('')+'</tbody></table></div></div>';
  }
  function calcCustomerAccount(name,phone){
    var invoices=(state.data.finalInvoices||[]).filter(function(i){ return text(i.customerName)===name || (phone && text(i.customerPhone)===phone); });
    var total=invoices.reduce(function(a,b){return a+num(b.total);},0), paid=invoices.reduce(function(a,b){return a+num(b.paid);},0), rem=invoices.reduce(function(a,b){return a+num(b.remaining);},0);
    var open=(state.data.deptLines||[]).filter(function(l){ return text(l.status)!=='مفوتر' && (text(l.customerName)===name || (phone && text(l.customerPhone)===phone)); }).length;
    return {invoices:invoices,total:total,paid:paid,remaining:rem,openOrders:open};
  }
  function screenPurchase(){ return '<div class="card"><h2>فاتورة مشتريات</h2><div class="grid four"><div class="field"><label>المورد</label><input id="puSupplier"></div><div class="field"><label>البند</label><input id="puItem"></div><div class="field"><label>القسم</label><select id="puDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>الإجمالي</label><input id="puTotal" type="number" step="0.01"></div></div><button class="btn" id="savePurchaseBtn">حفظ المشتريات</button></div>'+simpleTable('فواتير المشتريات',state.data.purchases||[],['supplier','itemName','department','total'],['المورد','البند','القسم','الإجمالي']); }
  function screenStock(){ return '<div class="card"><h2>المخزون</h2>'+stockTable()+'</div>'+simpleTable('حركة المخزون',state.data.stockMoves||[],['materialName','inQty','outQty','balance','source'],['الخامة','داخل','خارج','الرصيد','المصدر']); }
  function stockTable(){ var rows=materialRows(); if(!rows.length) return '<div class="empty">لا توجد خامات.</div>'; return '<div class="tableWrap"><table><thead><tr><th>الخامة</th><th>القسم</th><th>نوع</th><th>رصيد</th><th>حد نقص</th><th>تكلفة</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(materialName(r))+'</td><td>'+esc(matDept(r))+'</td><td>'+esc(materialLabel(matKind(r)))+'</td><td>'+money(matStock(r))+'</td><td>'+money(r.minStock)+'</td><td>'+(canCosts()?money(matCost(r)):'<span class="costHidden">مخفي</span>')+'</td></tr>';}).join('')+'</tbody></table></div>'; }
  function screenReports(){ if(!canReports()) return '<div class="empty">الأرباح والتقارير لضياء فقط.</div>'; var sales=(state.data.finalInvoices||[]).reduce(function(a,b){return a+num(b.total);},0); var costs=(state.data.finalInvoices||[]).reduce(function(a,b){ var lines=parseLines(b.linesJson||b.lines); return a+lines.reduce(function(x,l){return x+num(l.cost||0)*num(l.qty||1);},0); },0); var profit=sales-costs; return '<div class="grid three"><div class="card"><h3>مبيعات</h3><div class="stat">'+money(sales)+'</div></div><div class="card"><h3>تكاليف مباشرة</h3><div class="stat">'+money(costs)+'</div></div><div class="card"><h3>مجمل الربح</h3><div class="stat">'+money(profit)+'</div></div></div>'+simpleTable('سجل المراجعة',state.data.audit||[],['timestamp','user','action','details'],['الوقت','المستخدم','العملية','التفاصيل']); }
  function parseLines(v){ try{return Array.isArray(v)?v:JSON.parse(v||'[]');}catch(e){return [];} }
  function screenZero(){ if(!isAdmin()) return '<div class="empty">زر تهيئة وضع الصفر ظاهر لضياء فقط.</div>'; return '<div class="zeroBox"><h2>تهيئة لوضع الصفر</h2><p>يمسح بيانات الحسابات والتشغيل ويحتفظ بالعملاء والمستخدمين والصلاحيات وإعدادات المنصة الأساسية. سيتم طلب تأكيد قوي قبل التنفيذ.</p><div class="field"><label>اكتب كلمة تهيئة للتأكيد</label><input id="zeroConfirm" placeholder="تهيئة"></div><button class="btn danger" id="zeroBtn">تهيئة لوضع الصفر</button><div id="zeroMsg"></div></div>'; }
  function screenDeptView(){ return deptLinesTable(state.data.deptLines||[]); }
  function screenCashbox(){ return '<div class="card"><h2>الخزنة</h2><div class="grid four"><div class="field"><label>نوع الحركة</label><select id="cashType"><option>تحصيل من عميل</option><option>دفع لمورد</option><option>مصروف تشغيل</option><option>إيداع</option><option>سحب</option></select></div><div class="field"><label>الطرف</label><input id="cashParty"></div><div class="field"><label>المبلغ</label><input id="cashAmount" type="number" step="0.01"></div><div class="field"><label>ملاحظات</label><input id="cashNotes"></div></div><button class="btn" id="saveCashBtn">حفظ حركة الخزنة</button></div>'+simpleTable('حركة الخزنة',state.data.cashbox||[],['timestamp','type','party','amount','notes'],['الوقت','النوع','الطرف','المبلغ','ملاحظات']); }
  function screenHealth(){ return '<div class="card"><h2>فحص النظام</h2><button class="btn" id="healthBtn">فحص الآن</button><div id="healthBox" class="notice">اضغط فحص الآن للتأكد من الشيتات والAPI.</div></div>'; }
  function simpleTable(title,rows,keys,labels){ if(!rows.length) return '<div class="card"><h3>'+esc(title)+'</h3><div class="empty">لا توجد بيانات.</div></div>'; return '<div class="card"><h3>'+esc(title)+'</h3><div class="tableWrap"><table><thead><tr>'+labels.map(function(l){return '<th>'+esc(l)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+keys.map(function(k){return '<td>'+esc(r[k]||'')+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div></div>'; }

  function bindScreen(){
    var rb=$('rawModeBtn'); if(rb) rb.onclick=function(){ state.kitchenMode='raw'; render(); };
    var cb=$('recipeModeBtn'); if(cb) cb.onclick=function(){ state.kitchenMode='recipe'; render(); };
    var recalc=$('recalcBtn'); if(recalc) recalc.onclick=recalcCascade;
    var saveRaw=$('saveRawBtn'); if(saveRaw) saveRaw.onclick=saveRawData;
    var clearRaw=$('clearRawBtn'); if(clearRaw) clearRaw.onclick=function(){ state.kitchenMode='raw'; render(); };
    document.querySelectorAll('[data-edit-raw]').forEach(function(b){ b.onclick=function(){ editRaw(Number(b.getAttribute('data-edit-raw'))); }; });
    var addComp=$('addCompBtn'); if(addComp) addComp.onclick=function(){ addComponent(false); };
    var clearComps=$('clearCompsBtn'); if(clearComps) clearComps.onclick=function(){ state.recipeComps=[]; render(); };
    var auto=$('autoCompBtn'); if(auto) auto.onclick=autoComponentOutput;
    ['compMaterial','compQty','compOutput','compWaste','recSale'].forEach(function(i){ var el=$(i); if(el) el.oninput=updateComponentCost; if(el && i==='compMaterial') el.onchange=updateComponentCost; });
    var saveRec=$('saveRecipeBtn'); if(saveRec) saveRec.onclick=saveRecipeData;
    var clearRec=$('clearRecipeBtn'); if(clearRec) clearRec.onclick=function(){ state.recipeComps=[]; state.kitchenMode='recipe'; render(); };
    document.querySelectorAll('[data-del-comp]').forEach(function(b){ b.onclick=function(){ state.recipeComps.splice(Number(b.getAttribute('data-del-comp')),1); render(); }; });
    document.querySelectorAll('[data-edit-rec]').forEach(function(b){ b.onclick=function(){ editRecipe(Number(b.getAttribute('data-edit-rec'))); }; });
    var dlItem=$('dlItem'); if(dlItem) dlItem.onchange=applyDeptItem;
    ['dlQty','dlSale'].forEach(function(i){ var el=$(i); if(el) el.oninput=calcDeptLine; });
    var saveDept=$('saveDeptBtn'); if(saveDept) saveDept.onclick=function(){ saveDeptLine(false); };
    var saveDeptOpen=$('saveDeptOpenSalesBtn'); if(saveDeptOpen) saveDeptOpen.onclick=function(){ saveDeptLine(true); };
    var laser=$('laserCalcBtn'); if(laser) laser.onclick=calcLaser;
    var pull=$('pullDeptBtn'); if(pull) pull.onclick=pullDeptLines;
    var addM=$('addManualBtn'); if(addM) addM.onclick=addManualLine;
    var addD=$('addDiscountBtn'); if(addD) addD.onclick=addDiscountLine;
    var saveFinal=$('saveFinalBtn'); if(saveFinal) saveFinal.onclick=saveFinalInvoice;
    document.querySelectorAll('[data-del-final]').forEach(function(b){ b.onclick=function(){ state.finalLines.splice(Number(b.getAttribute('data-del-final')),1); refreshFinalLinesBox(); }; });
    var paid=$('fiPaid'); if(paid) paid.oninput=refreshFinalLinesBox;
    var acc=$('accCustomer'); if(acc) acc.oninput=fillCustomerFields;
    var saveCustomer=$('saveCustomerBtn'); if(saveCustomer) saveCustomer.onclick=saveCustomerData;
    var loadAccount=$('loadCustomerAccountBtn'); if(loadAccount) loadAccount.onclick=showAccount;
    var pu=$('savePurchaseBtn'); if(pu) pu.onclick=savePurchase;
    var zero=$('zeroBtn'); if(zero) zero.onclick=zeroReset;
    var cash=$('saveCashBtn'); if(cash) cash.onclick=saveCash;
    var health=$('healthBtn'); if(health) health.onclick=healthCheck;
  }

  function findMaterialByInput(value){ var v=text(value); return materialRows().find(function(m){ return text(m.id)===v || materialName(m)===v; }); }
  function findProductByInput(value){ var v=text(value); return productRows().find(function(p){ return text(p.id)===v || productName(p)===v; }); }
  function rawPayload(){ return {id:text($('rawId').value),name:text($('rawName').value).trim(),department:text($('rawDept').value),kind:text($('rawKind').value),cost:num($('rawCost').value),salePrice:num($('rawSale').value),stock:num($('rawStock').value),minStock:num($('rawMin').value),width:num($('rawW').value),height:num($('rawH').value),operatingBand:text($('rawBand').value),opMethod:text($('rawMethod').value),opCost:num($('rawOpCost').value),notes:text($('rawNotes').value),itemType:'raw',active:true,updatedBy:state.user.name}; }
  function saveRawData(){ var p=rawPayload(); if(!p.name){ setMsg('اكتب اسم الخامة.',true); return; } api('saveAccountingMaterial',p).then(function(res){ if(!res.success) throw new Error(res.message||'لم يتم حفظ الخامة'); return load(true); }).then(function(){ setMsg('تم حفظ / تحديث الخامة بدون تكرار.'); }).catch(function(e){ setMsg(e.message,true); }); }
  function editRaw(i){ var r=materialRows()[i]; if(!r) return; state.kitchenMode='raw'; render(); $('rawId').value=text(r.id); $('rawDept').value=matDept(r); $('rawName').value=materialName(r); $('rawKind').value=text(r.kind||'raw'); $('rawCost').value=matCost(r); $('rawSale').value=matSale(r); $('rawStock').value=matStock(r); $('rawMin').value=num(r.minStock); $('rawW').value=num(r.width); $('rawH').value=num(r.height); $('rawBand').value=text(r.operatingBand||'إنتاج مباشر'); $('rawMethod').value=text(r.opMethod||'لا يوزع'); $('rawOpCost').value=num(r.opCost); $('rawNotes').value=text(r.notes); window.scrollTo({top:0,behavior:'smooth'}); }
  function autoComponentOutput(){ var m=findMaterialByInput($('compMaterial').value); if(!m){ updateComponentCost(); return; } var rec=parseSize(text($('recSize').value)); var out=0; if(rec.w && rec.h && num(m.width) && num(m.height)){ out=Math.floor(num(m.width)/rec.w)*Math.floor(num(m.height)/rec.h); } if(!out && rec.w && rec.h && num(m.width)*num(m.height)>0){ out=Math.floor((num(m.width)*num(m.height))/(rec.w*rec.h)); } if(!out) out=1; $('compOutput').value=out; $('compAutoOutput').value=out; updateComponentCost(); }
  function parseSize(s){ var m=text(s).replace(/[×*]/g,'x').match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i); return m?{w:num(m[1]),h:num(m[2])}:{w:0,h:0}; }
  function calcCompCost(m,qty,out,waste){ out=Math.max(1,num(out)); return matCost(m) * Math.max(0,num(qty)) / out * (1 + Math.max(0,num(waste))/100); }
  function updateComponentCost(){ var m=findMaterialByInput($('compMaterial')&&$('compMaterial').value); if(!m){ if($('compCost')) $('compCost').value=''; return; } var cost=calcCompCost(m,$('compQty').value,$('compOutput').value,$('compWaste').value); if($('compCost')) $('compCost').value=money(cost); calcRecipeTotals(); }
  function addComponent(silent){ var m=findMaterialByInput($('compMaterial').value); if(!m){ if(!silent) alert('اختر خامة أساسية كمكون.'); return false; } var c={materialId:text(m.id),materialName:materialName(m),materialDept:matDept(m),qty:num($('compQty').value)||1,outputCount:Math.max(1,num($('compOutput').value)||1),wastePercent:num($('compWaste').value),unitCost:matCost(m)}; c.cost=calcCompCost(m,c.qty,c.outputCount,c.wastePercent); state.recipeComps.push(c); if(silent){ updateComponentCost(); } else { render(); } return true; }
  function calcRecipeTotals(){ var total=state.recipeComps.reduce(function(a,b){return a+num(b.cost);},0); var m=$('compMaterial')&&findMaterialByInput($('compMaterial').value); if(m) total += calcCompCost(m,$('compQty').value,$('compOutput').value,$('compWaste').value); var sale=num($('recSale')&&$('recSale').value); if($('recCost')) $('recCost').value=money(total); if($('recProfit')) $('recProfit').value=money(sale-total); return total; }
  function recipePayload(){ if($('compMaterial') && $('compMaterial').value && !state.recipeComps.some(function(c){ return c.materialId===text($('compMaterial').value); })) addComponent(true); var cost=state.recipeComps.reduce(function(a,b){return a+num(b.cost);},0); var sale=num($('recSale').value); return {id:text($('recId').value),name:text($('recName').value).trim(),department:text($('recDept').value),size:text($('recSize').value),salePrice:sale,cost:cost,profit:sale-cost,components:JSON.stringify(state.recipeComps),itemType:'product',active:true,updatedBy:state.user.name}; }
  function saveRecipeData(){ var p=recipePayload(); if(!p.name){ setMsg('اكتب اسم الصنف.',true); return; } if(!state.recipeComps.length){ setMsg('اختر مكونًا واحدًا على الأقل.',true); return; } api('saveAccountingTemplate',p).then(function(res){ if(!res.success) throw new Error(res.message||'لم يتم حفظ الصنف'); state.recipeComps=[]; return load(true); }).then(function(){ setMsg('تم حفظ / تحديث الصنف بدون تكرار.'); }).catch(function(e){ setMsg(e.message,true); }); }
  function editRecipe(i){ var r=productRows()[i]; if(!r) return; state.kitchenMode='recipe'; state.recipeComps=productComponents(r); render(); $('recId').value=text(r.id); $('recDept').value=productDept(r); $('recName').value=productName(r); $('recSize').value=text(r.size||''); $('recSale').value=productSale(r); $('recCost').value=money(productCost(r)); $('recProfit').value=money(productSale(r)-productCost(r)); window.scrollTo({top:0,behavior:'smooth'}); }
  function recalcCascade(){ api('recalculateAccountingMaterialsCascade',{username:state.user.username}).then(function(res){ if(!res.success) throw new Error(res.message||'فشل إعادة الحساب'); return load(true); }).then(function(){ setMsg('تم إعادة حساب الأصناف المرتبطة بالخامات.'); }).catch(function(e){ setMsg(e.message,true); }); }
  function applyDeptItem(){ var p=findProductByInput($('dlItem').value); if(!p) return; $('dlSystemSale').value=money(productSale(p)); $('dlSale').value=productSale(p); calcDeptLine(); }
  function calcDeptLine(){ var p=findProductByInput($('dlItem')&&$('dlItem').value); var qty=num($('dlQty')&&$('dlQty').value)||1; var sys=p?productSale(p):num($('dlSystemSale')&&$('dlSystemSale').value); var sale=num($('dlSale')&&$('dlSale').value); var total=qty*sale; if($('dlTotal')) $('dlTotal').value=money(total); if($('dlDiff')) $('dlDiff').value=money((sale-sys)*qty); }
  function deptPayload(){ var p=findProductByInput($('dlItem').value); var qty=num($('dlQty').value)||1; var sale=num($('dlSale').value); return {orderId:text($('dlOrder').value).trim()||id('ORDER'),customerName:text($('dlCustomer').value).trim(),customerPhone:text($('dlPhone').value).trim(),department:userDept()==='مشترك' && p ? productDept(p) : userDept(),itemId:p?text(p.id):'',itemName:p?productName(p):'',qty:qty,systemSale:p?productSale(p):sale,sale:sale,total:qty*sale,diff:(sale-(p?productSale(p):sale))*qty,shared:text($('dlShared').value),status:'غير مفوتر',notes:text($('dlNotes').value),createdBy:state.user.name,cost:p?productCost(p):0}; }
  function saveDeptLine(openSales){ var p=deptPayload(); if(!p.customerName || !p.itemName){ setInline('deptMsg','اختر العميل والصنف.',true); return; } api('saveAccountingDeptLine',p).then(function(res){ if(!res.success) throw new Error(res.message||'لم يتم حفظ بند القسم'); return load(true); }).then(function(){ if(openSales){ state.active='sales'; state.finalLines=[]; render(); $('fiCustomer').value=p.customerName; $('fiPhone').value=p.customerPhone; $('fiOrder').value=p.orderId; pullDeptLines(); } else setMsg('تم تسجيل بند القسم.'); }).catch(function(e){ setInline('deptMsg',e.message,true); }); }
  function calcLaser(){ var m=findMaterialByInput($('laserMat').value); if(!m){ $('laserMsg').textContent='اختر خامة'; return; } var w=num($('laserW').value), h=num($('laserH').value), qty=num($('laserQty').value)||1, waste=num($('laserWaste').value), factor=num($('laserFactor').value)||2; var rawArea=Math.max(1,num(m.width)*num(m.height)); var jobArea=Math.max(1,w*h*qty); var cost=matCost(m)*jobArea/rawArea*(1+waste/100); var sale=cost*factor; $('laserMsg').textContent='تكلفة '+money(cost)+' / بيع مقترح '+money(sale); }
  function pullDeptLines(){ var customer=text($('fiCustomer').value).trim(); var phone=text($('fiPhone').value).trim(); var order=text($('fiOrder').value).trim(); var rows=(state.data.deptLines||[]).filter(function(l){ return text(l.status)!=='مفوتر' && (!customer || text(l.customerName)===customer) && (!phone || text(l.customerPhone)===phone) && (!order || text(l.orderId)===order); }); state.finalLines=rows.map(function(l){ return {deptLineId:l.id,orderId:l.orderId,customerName:l.customerName,customerPhone:l.customerPhone,department:l.department,itemName:l.itemName,qty:num(l.qty),sale:num(l.sale),total:num(l.total||num(l.qty)*num(l.sale)),cost:num(l.cost)}; }); refreshFinalLinesBox(); if(!rows.length) setInline('finalMsg','لا توجد بنود أقسام غير مفوترة لهذا الاختيار.',true); else setInline('finalMsg','تم تحميل '+rows.length+' بند من الأقسام.'); }
  function addManualLine(){ var name=prompt('اسم البند اليدوي'); if(!name) return; var qty=num(prompt('الكمية','1'))||1; var sale=num(prompt('سعر الوحدة','0')); state.finalLines.push({itemName:name,department:'بند يدوي',qty:qty,sale:sale,total:qty*sale,cost:0}); refreshFinalLinesBox(); }
  function addDiscountLine(){ var val=num(prompt('قيمة الخصم','0')); if(!val) return; state.finalLines.push({itemName:'خصم',department:'خصم',qty:1,sale:-Math.abs(val),total:-Math.abs(val),cost:0}); refreshFinalLinesBox(); }
  function refreshFinalLinesBox(){ var box=$('finalLinesBox'); if(box) box.innerHTML=finalLinesHtml(); document.querySelectorAll('[data-del-final]').forEach(function(b){ b.onclick=function(){ state.finalLines.splice(Number(b.getAttribute('data-del-final')),1); refreshFinalLinesBox(); }; }); }
  function saveFinalInvoice(){ if(!state.finalLines.length){ setInline('finalMsg','لا توجد بنود للحفظ.',true); return; } var subtotal=state.finalLines.reduce(function(a,b){return a+num(b.total);},0); var paid=num($('fiPaid').value); var p={invoiceNo:id('INV'),customerName:text($('fiCustomer').value).trim(),customerPhone:text($('fiPhone').value).trim(),orderId:text($('fiOrder').value).trim(),linesJson:JSON.stringify(state.finalLines),subtotal:subtotal,discount:0,total:subtotal,paid:paid,remaining:subtotal-paid,status:'محفوظة',createdBy:state.user.name,deptLineIds:JSON.stringify(state.finalLines.map(function(l){return l.deptLineId;}).filter(Boolean))}; if(!p.customerName){ setInline('finalMsg','اختر العميل.',true); return; } api('saveAccountingFinalInvoice',p).then(function(res){ if(!res.success) throw new Error(res.message||'لم يتم حفظ الفاتورة'); state.finalLines=[]; return load(true); }).then(function(){ setMsg('تم حفظ الفاتورة النهائية وربطها بحساب العميل.'); }).catch(function(e){ setInline('finalMsg',e.message,true); }); }
  function fillCustomerFields(){ var v=text($('accCustomer').value).trim(); var c=(state.data.customers||[]).find(function(x){ return customerName(x)===v || customerPhone(x)===v; }); if(!c) return; $('accPhone').value=customerPhone(c); $('accType').value=text(c.type); $('accOpening').value=num(c.openingBalance||c.balance); var acc=calcCustomerAccount(customerName(c),customerPhone(c)); if(acc.openOrders) $('customerAccountBox').innerHTML='<div class="notice bad">هذا العميل لديه '+acc.openOrders+' أوردر مفتوح.</div>'; }
  function saveCustomerData(){ var p={name:text($('accCustomer').value).trim(),phone:text($('accPhone').value).trim(),type:text($('accType').value),openingBalance:num($('accOpening').value),username:state.user.username}; if(!p.name){ setMsg('اكتب اسم العميل.',true); return; } api('saveCustomer',p).then(function(res){ if(!res.success) throw new Error(res.message||'لم يتم حفظ العميل'); return load(true); }).then(function(){ setMsg('تم حفظ / تحديث العميل.'); }).catch(function(e){ setMsg(e.message,true); }); }
  function showAccount(){ var name=text($('accCustomer').value).trim(), phone=text($('accPhone').value).trim(); var acc=calcCustomerAccount(name,phone); var box=$('customerAccountBox'); box.innerHTML='<div class="invoiceBox"><div class="grid four"><span class="pill">الفواتير: '+money(acc.total)+'</span><span class="pill">المدفوع: '+money(acc.paid)+'</span><span class="pill '+(acc.remaining>0?'warn':'')+'">المتبقي: '+money(acc.remaining)+'</span><span class="pill '+(acc.openOrders?'bad':'')+'">الأوردرات المفتوحة: '+acc.openOrders+'</span></div></div>'+finalInvoicesTableFor(acc.invoices); }
  function finalInvoicesTableFor(rows){ if(!rows.length) return '<div class="empty">لا توجد فواتير لهذا العميل.</div>'; return '<div class="tableWrap"><table><thead><tr><th>رقم</th><th>إجمالي</th><th>مدفوع</th><th>متبقي</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r.invoiceNo||r.id)+'</td><td>'+money(r.total)+'</td><td>'+money(r.paid)+'</td><td>'+money(r.remaining)+'</td></tr>';}).join('')+'</tbody></table></div>'; }
  function savePurchase(){ var p={supplier:text($('puSupplier').value),itemName:text($('puItem').value),department:text($('puDept').value),total:num($('puTotal').value),createdBy:state.user.name}; if(!p.supplier||!p.itemName){ setMsg('اكتب المورد والبند.',true); return; } api('saveEasyStorePurchase',p).then(function(res){ if(!res.success) throw new Error(res.message||'لم يتم حفظ المشتريات'); return load(true); }).then(function(){ setMsg('تم حفظ فاتورة المشتريات.'); }).catch(function(e){ setMsg(e.message,true); }); }
  function zeroReset(){ var c=text($('zeroConfirm').value).trim(); if(c!=='تهيئة'){ setInline('zeroMsg','اكتب كلمة تهيئة للتأكيد.',true); return; } if(!confirm('تأكيد نهائي: سيتم مسح بيانات الحسابات والتشغيل مع الاحتفاظ بالعملاء والمستخدمين.')) return; api('zeroResetAccounting',{username:state.user.username,confirm:'تهيئة'}).then(function(res){ if(!res.success) throw new Error(res.message||'فشل التهيئة'); return load(true); }).then(function(){ setMsg('تمت تهيئة وضع الصفر بنجاح.'); }).catch(function(e){ setInline('zeroMsg',e.message,true); }); }
  function saveCash(){ var p={type:text($('cashType').value),party:text($('cashParty').value),amount:num($('cashAmount').value),notes:text($('cashNotes').value),createdBy:state.user.name}; api('saveCashboxTransaction',{type:p.type,party:p.party,amount:p.amount,notes:p.notes,createdBy:p.createdBy}).then(function(res){ if(!res.success) throw new Error(res.message||'لم يتم حفظ الحركة'); return load(true); }).then(function(){ setMsg('تم حفظ حركة الخزنة.'); }).catch(function(e){ setMsg(e.message,true); }); }
  function healthCheck(){ api('easyStoreSystemHealth',{username:state.user.username}).then(function(res){ $('healthBox').className='notice ok'; $('healthBox').textContent=(res.message||'النظام سليم')+' — الشيتات: '+((res.sheets||[]).length); }).catch(function(e){ $('healthBox').className='notice bad'; $('healthBox').textContent=e.message; }); }

  window.EasyStore = {load:function(){load(false);},version:BUILD};
  document.addEventListener('DOMContentLoaded',function(){ try{ var u=JSON.parse(sessionStorage.getItem('EASYSTORE_USER')||'null'); if(u){ state.user=u; render(); load(true); return; } }catch(e){} render(); });
  if(document.readyState!=='loading') render();
})();
