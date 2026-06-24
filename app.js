
(function(){
  const app = document.getElementById('app');
  const qs = new URLSearchParams(location.search);
  const st = {
    user:{
      username: qs.get('username') || qs.get('name') || 'موظف',
      name: qs.get('name') || qs.get('username') || 'موظف',
      token: qs.get('token') || '',
      mode: qs.get('mode') || qs.get('roleMode') || 'full',
      department: qs.get('department') || ''
    },
    active:'',
    data:{materials:[],templates:[],deptLines:[],finalInvoices:[],wasteLines:[]},
    selectedLines:[]
  };
  const $ = id => document.getElementById(id);
  const val = id => ($(id) ? $(id).value : '');
  const set = (id,v) => { if($(id)) $(id).value = v; };
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const num = v => { const n = parseFloat(String(v||'').replace(',', '.')); return isNaN(n)?0:n; };
  const money = n => num(n).toLocaleString('ar-EG', {maximumFractionDigits:2}) + ' ج';
  const modeText = () => isFull() ? 'ضياء - مطبخ الحسابات' : isLaser() ? 'جابر - ليزر + AI' : isPrint() ? 'وائل - طباعة' : isFinal() ? 'رحمة / ريفان - تقفيل' : 'موظف';
  const key = () => (st.user.username + ' ' + st.user.name + ' ' + st.user.mode).toLowerCase();
  const isFull = () => /ضياء|diaa|admin|full|kitchen/.test(key());
  const isLaser = () => /جابر|gaber|jaber|laser/.test(key());
  const isPrint = () => /وائل|wael|print/.test(key());
  const isFinal = () => /رحمه|رحمة|ريفان|ريڤان|rahma|revan|rivan|final/.test(key());
  const dept = () => isLaser() ? 'ليزر' : isPrint() ? 'طباعة' : (st.user.department || '');
  const canSeeCosts = () => isFull();
  function msg(id,t,bad){ if($(id)){ $(id).className='msg '+(bad?'bad':''); $(id).textContent=t||''; }}
  function localSave(){ localStorage.setItem('EASYSTORE_MATBAGY_V1', JSON.stringify(st.data)); }
  function localLoad(){ try{ return JSON.parse(localStorage.getItem('EASYSTORE_MATBAGY_V1')||'{}'); }catch(e){ return {}; } }
  function params(extra){ return new URLSearchParams(Object.assign({username:st.user.username, token:st.user.token}, extra||{})).toString(); }
  function api(action, data){
    return new Promise((resolve,reject)=>{
      const base=(window.TREND_API_URL||'').trim();
      if(!base) return reject(new Error('رابط Web App غير مضبوط'));
      const cb='ESCB_'+Date.now()+'_'+Math.random().toString(16).slice(2);
      window[cb]=r=>{ cleanup(); resolve(r||{}); };
      const s=document.createElement('script');
      s.src=base+'?action='+encodeURIComponent(action)+'&callback='+cb+'&'+params(data);
      s.onerror=()=>{ cleanup(); reject(new Error('فشل الاتصال بالسيرفر')); };
      function cleanup(){ delete window[cb]; if(s.parentNode) s.parentNode.removeChild(s); }
      document.body.appendChild(s);
      setTimeout(()=>{ if(window[cb]){ cleanup(); reject(new Error('انتهت مهلة الاتصال')); }},18000);
    });
  }
  async function refresh(){
    msg('mainMsg','جاري التحديث...');
    try{
      const r=await api('getAccounting');
      if(!r.success) throw new Error(r.message||'تعذر التحميل');
      st.data={materials:r.materials||[],templates:r.templates||[],deptLines:r.deptLines||[],finalInvoices:r.finalInvoices||[],wasteLines:r.wasteLines||[],summary:r.summary||{}};
      msg('mainMsg','تم التحديث من شيتات الحسابات.');
    }catch(e){
      st.data=Object.assign(st.data, localLoad());
      msg('mainMsg','يعمل بنسخة محلية مؤقتة: '+e.message, true);
    }
    renderScreen();
  }
  function tabs(){
    const list=[];
    if(isFull()) list.push(['kitchen','مطبخ الأسعار'],['materials','الخامات والتركيبات'],['templates','البنود'],['dept','فاتورة قسم'],['final','تقفيل نهائي'],['reports','تقارير']);
    else if(isLaser()||isPrint()) list.push(['dept','فاتورة القسم'],['waste','هوالك القسم']);
    else if(isFinal()) list.push(['final','تقفيل نهائي'],['deptView','أجزاء الأقسام']);
    if(!st.active) st.active=(list[0]||['dept'])[0];
    return '<div class="tabs">'+list.map(x=>`<button class="tab ${st.active===x[0]?'active':''}" onclick="ES.go('${x[0]}')">${x[1]}</button>`).join('')+'</div>';
  }
  function render(){
    app.innerHTML=`<div class="wrap"><div class="top"><div class="brand"><h1>💰 إيزي ستور حسابات مطبعجي</h1><p>يفتح من TrendOS بدون يوزر وباسورد، وكل موظف يرى شاشته فقط.</p></div><div class="actions"><span class="badge">${esc(st.user.name)} / ${modeText()}</span><button class="btn secondary" onclick="ES.refresh()">تحديث</button><button class="btn secondary" onclick="window.close()">إغلاق</button></div></div><div id="mainMsg" class="msg"></div>${tabs()}<div id="screen"></div></div>`;
    renderScreen();
  }
  function renderScreen(){
    if(!$('screen')) return;
    const a=st.active;
    $('screen').innerHTML = a==='kitchen'?screenKitchen():a==='materials'?screenMaterials():a==='templates'?screenTemplates():a==='dept'?screenDept():a==='final'?screenFinal():a==='reports'?screenReports():a==='waste'?screenWaste():deptTable();
  }
  function screenKitchen(){ return `<div class="card"><h2>مطبخ الأسعار</h2><div class="hint">هنا ضياء فقط يسجل الخامات والتركيبات والبنود الرسمية. بعد الحفظ تظهر البنود تلقائياً في فواتير وائل وجابر ورحمه/ريفان.</div><div class="grid three"><button class="btn" onclick="ES.go('materials')">الخامات والتركيبات</button><button class="btn" onclick="ES.go('templates')">البنود المسعرة</button><button class="btn secondary" onclick="ES.initSheets()">تجهيز شيتات الحسابات</button></div></div>${screenReports()}`; }
  function materialOptions(){ return (st.data.materials||[]).map(r=>`<option>${esc(r.materialName||r['اسم الخامة']||'')}</option>`).join(''); }
  function templateOptions(){ return (st.data.templates||[]).filter(r=>isFull()||['عام','مشترك',dept()].includes(String(r.department||''))).map((r,i)=>`<option value="${i}">${esc(r.itemName||'')}</option>`).join(''); }
  function screenMaterials(){
    if(!isFull()) return '<div class="card"><h2>الخامات</h2><div class="msg bad">إضافة وتعديل الخامات عند ضياء فقط.</div></div>';
    return `<div class="card"><h2>الخامات والتركيبات</h2><div class="hint">الخامة المركبة مثال: تابلوه 20×30 = كارت 20×30:1, لامينشن:1, خشبة:1</div><div class="row"><div class="field"><label>القسم</label><select id="matDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الخامة</label><input id="matName"></div><div class="field"><label>نوع الخامة</label><select id="matKind"><option value="raw">خامة مباشرة</option><option value="recipe">خامة بمكونات</option></select></div><div class="field"><label>الوحدة</label><input id="matUnit"></div></div><div class="row"><div class="field"><label>رصيد المخزن</label><input id="matStock" type="number"></div><div class="field"><label>حد النقص</label><input id="matMin" type="number"></div><div class="field"><label>سعر الوحدة</label><input id="matCost" type="number"></div><div class="field"><label>سعر بيع رسمي</label><input id="matSale" type="number"></div></div><div class="row"><div class="field"><label>نسبة الهالك %</label><input id="matWaste" type="number" value="10"></div><div class="field"><label>تكلفة محسوبة</label><input id="matCalc" readonly></div></div><div class="field"><label>المكونات</label><textarea id="matComps" placeholder="كارت 20×30:1, لامينشن:1, خشبة:1"></textarea></div><div class="actions"><button class="btn secondary" onclick="ES.calcMaterial()">احسب</button><button class="btn" onclick="ES.saveMaterial()">حفظ / تحديث</button><button class="btn secondary" onclick="ES.recalc()">إعادة حساب التركيبات</button></div><div id="matMsg"></div></div>${materialsTable()}`;
  }
  function materialsTable(){ const rows=st.data.materials||[]; return `<div class="card"><h3>الخامات المحفوظة</h3><div class="tablewrap"><table><thead><tr><th>القسم</th><th>الخامة</th><th>النوع</th><th>رصيد</th><th>تكلفة</th><th>بيع</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.department)}</td><td>${esc(r.materialName||r['اسم الخامة'])}</td><td>${esc(r.materialKind||r['نوع الخامة'])}</td><td>${esc(r.stockQty)}</td><td>${money(r.computedUnitCost||r.unitCost)}</td><td>${money(r.salePrice||r['سعر بيع رسمي'])}</td></tr>`).join('')||'<tr><td colspan="6">لا توجد خامات.</td></tr>'}</tbody></table></div></div>`; }
  function screenTemplates(){
    const form=isFull()?`<div class="card"><h2>بند يظهر في فواتير الموظفين</h2><div class="row"><div class="field"><label>القسم</label><select id="tplDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>التصنيف</label><input id="tplCat"></div><div class="field"><label>اسم البند</label><input id="tplName"></div><div class="field"><label>المقاس</label><input id="tplSize"></div></div><div class="row"><div class="field"><label>الخامة / التركيبة</label><select id="tplMat"><option></option>${materialOptions()}</select></div><div class="field"><label>تكلفة حبر</label><input id="tplInk" type="number"></div><div class="field"><label>تكلفة ثابتة</label><input id="tplFixed" type="number"></div><div class="field"><label>سعر بيع رسمي</label><input id="tplSale" type="number"></div></div><div class="actions"><button class="btn" onclick="ES.saveTemplate()">حفظ البند</button></div><div id="tplMsg"></div></div>`:'';
    return form + templatesTable();
  }
  function templatesTable(){ const rows=st.data.templates||[]; return `<div class="card"><h3>البنود المسعرة</h3><div class="tablewrap"><table><thead><tr><th>القسم</th><th>البند</th><th>الخامة</th><th>السعر</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.department)}</td><td>${esc(r.itemName)}</td><td>${esc(r.materialName)}</td><td>${money(r.salePrice)}</td></tr>`).join('')||'<tr><td colspan="4">لا توجد بنود.</td></tr>'}</tbody></table></div></div>`; }
  function screenDept(){
    return `<div class="card"><h2>فاتورة القسم ${dept()}</h2><div class="hint">وائل وجابر يختاروا البند فقط. التكلفة الداخلية لا تظهر لهم. تعديل السعر داخل الفاتورة فقط، والفرق يتحول لهوالك القسم.</div><div class="row"><div class="field"><label>رقم الأوردر</label><input id="dlOrder"></div><div class="field"><label>رقم البند</label><input id="dlLine"></div><div class="field"><label>اسم العميل</label><input id="dlCustomer"></div><div class="field"><label>القسم</label><select id="dlDept"><option ${dept()==='طباعة'?'selected':''}>طباعة</option><option ${dept()==='ليزر'?'selected':''}>ليزر</option><option>مشترك</option></select></div></div><div class="row"><div class="field"><label>اختار بند</label><select id="dlTpl" onchange="ES.applyTemplate()"><option value="">اختار</option>${templateOptions()}</select></div><div class="field"><label>اسم البند</label><input id="dlItem"></div><div class="field"><label>الخامة</label><select id="dlMat"><option></option>${materialOptions()}</select></div><div class="field"><label>الكمية</label><input id="dlQty" type="number" value="1" oninput="ES.calcDept()"></div></div><div class="row"><div class="field"><label>سعر السيستم</label><input id="dlSystemSale" readonly></div><div class="field"><label>سعر القطعة في الفاتورة</label><input id="dlSale" type="number" oninput="ES.calcDept()"></div><div class="field"><label>فرق السعر</label><input id="dlDiff" readonly></div><div class="field"><label>إجمالي البيع</label><input id="dlTotal" readonly></div></div>${isLaser()?laserAi():''}<div class="row"><div class="field"><label>تالف خامات عليه</label><input id="dlDamage" type="number" value="0" oninput="ES.calcDept()"></div><div class="field"><label>عوض منهم</label><input id="dlCovered" type="number" value="0" oninput="ES.calcDept()"></div><div class="field"><label>الباقي عليه</label><input id="dlRemain" readonly></div><div class="field"><label>ملاحظات</label><input id="dlNotes"></div></div><div style="${canSeeCosts()?'':'display:none'}"><div class="row"><div class="field"><label>تكلفة الخامة</label><input id="dlMatCost" type="number"></div><div class="field"><label>تشغيل</label><input id="dlLabor" type="number"></div><div class="field"><label>أخرى</label><input id="dlOther" type="number"></div><div class="field"><label>تكلفة النظام</label><input id="dlSystemCost" type="number"></div></div></div><div class="actions"><button class="btn" onclick="ES.saveDeptLine()">حفظ فاتورة القسم</button></div><div id="deptMsg"></div></div>${deptTable()}`;
  }
  function laserAi(){ return `<div class="card"><h3>🤖 حاسبة AI لجابر</h3><div class="row"><div class="field"><label>عرض القطعة سم</label><input id="aiW" type="number"></div><div class="field"><label>طول القطعة سم</label><input id="aiH" type="number"></div><div class="field"><label>سعر اللوح</label><input id="aiPrice" type="number"></div><div class="field"><label>مقاس اللوح</label><input id="aiSize" value="122x244"></div></div><div class="actions"><button class="btn secondary" onclick="ES.aiLaser()">احسب مقترح</button><span id="aiMsg" class="pill"></span></div></div>`; }
  function deptTable(){ const rows=st.data.deptLines||[]; return `<div class="card"><h3>أجزاء الأقسام</h3><div class="tablewrap"><table><thead><tr><th>الأوردر</th><th>القسم</th><th>البند</th><th>بيع</th><th>فرق</th><th>هوالك</th><th>الحالة</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.orderId)}</td><td>${esc(r.department)}</td><td>${esc(r.itemName)}</td><td>${money(r.salePrice)}</td><td>${money(r.priceDiff)}</td><td>${money(r.damageRemaining)}</td><td>${esc(r.closeStatus||'مفتوح')}</td></tr>`).join('')||'<tr><td colspan="7">لا توجد فواتير أقسام.</td></tr>'}</tbody></table></div></div>`; }
  function screenFinal(){ return `<div class="card"><h2>تقفيل فاتورة العميل</h2><div class="row"><div class="field"><label>رقم الأوردر</label><input id="fiOrder"></div><div class="field"><label>اسم العميل</label><input id="fiCustomer"></div><div class="field"><label>خصم</label><input id="fiDiscount" type="number" value="0" oninput="ES.calcFinal()"></div><div class="field"><label>مدفوع</label><input id="fiPaid" type="number" value="0" oninput="ES.calcFinal()"></div></div><div class="row"><div class="field"><label>بند يدوي</label><input id="fiManualDesc"></div><div class="field"><label>قيمة بند يدوي</label><input id="fiManualAmount" type="number" value="0" oninput="ES.calcFinal()"></div><div class="field"><label>الإجمالي</label><input id="fiTotal" readonly></div><div class="field"><label>الباقي</label><input id="fiRemain" readonly></div></div><div class="actions"><button class="btn secondary" onclick="ES.loadFinalLines()">استدعاء أجزاء وائل وجابر</button><button class="btn" onclick="ES.saveFinal()">تقفيل الفاتورة</button><button class="btn secondary" onclick="ES.printInvoice()">PDF / طباعة</button></div><div id="finalMsg"></div><div id="finalLines"></div><div id="printArea" style="display:none"></div></div>${finalTable()}`; }
  function finalTable(){ const rows=st.data.finalInvoices||[]; return `<div class="card"><h3>الفواتير النهائية</h3><div class="tablewrap"><table><thead><tr><th>الفاتورة</th><th>الأوردر</th><th>العميل</th><th>الإجمالي</th><th>الباقي</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.invoiceNo)}</td><td>${esc(r.orderId)}</td><td>${esc(r.customerName)}</td><td>${money(r.finalTotal)}</td><td>${money(r.remaining)}</td></tr>`).join('')||'<tr><td colspan="5">لا توجد فواتير.</td></tr>'}</tbody></table></div></div>`; }
  function screenWaste(){ const rows=st.data.wasteLines||[]; return `<div class="card"><h2>هوالك القسم</h2><div class="tablewrap"><table><thead><tr><th>الأوردر</th><th>القسم</th><th>البند</th><th>فرق سعر</th><th>تالف</th><th>تعويض</th><th>الباقي</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.orderId)}</td><td>${esc(r.department)}</td><td>${esc(r.itemName)}</td><td>${money(r.priceDiff)}</td><td>${money(r.damageCost)}</td><td>${money(r.damageCovered)}</td><td>${money(r.damageRemaining||r['الباقي'])}</td></tr>`).join('')||'<tr><td colspan="7">لا يوجد هوالك.</td></tr>'}</tbody></table></div></div>`; }
  function screenReports(){ return `<div class="card"><h2>تقارير مختصرة</h2>${deptTable()}${screenWaste()}</div>`; }
  function components(txt){ return String(txt||'').split(/,|\n/).map(x=>x.trim()).filter(Boolean).map(x=>{let p=x.split(/:|=/);return {name:(p[0]||'').trim(),qty:num(p[1]||1)||1};}); }
  function matByName(n){ return (st.data.materials||[]).find(r=>String(r.materialName||r['اسم الخامة'])===String(n)); }
  function tplList(){ return (st.data.templates||[]).filter(r=>isFull()||['عام','مشترك',dept()].includes(String(r.department||''))); }
  window.ES={
    go(x){st.active=x;render();},refresh,
    async initSheets(){try{let r=await api('initAccounting'); msg('mainMsg',r.message,!r.success); refresh();}catch(e){msg('mainMsg',e.message,true)}},
    calcMaterial(){let total=num(val('matCost')); if(val('matKind')==='recipe'){ total=0; components(val('matComps')).forEach(c=>{let m=matByName(c.name); total += num(m&&(m.computedUnitCost||m.unitCost))*c.qty;});} total*=1+num(val('matWaste'))/100; set('matCalc',total.toFixed(2));},
    async saveMaterial(){this.calcMaterial(); const p={department:val('matDept'),materialName:val('matName'),materialKind:val('matKind'),unit:val('matUnit'),stockQty:val('matStock'),minStock:val('matMin'),unitCost:val('matCost'),salePrice:val('matSale'),wastePercent:val('matWaste'),calculatedUnitCost:val('matCalc'),componentsJson:JSON.stringify(components(val('matComps')).map(c=>({materialName:c.name,qty:c.qty}))),active:'نعم'}; try{let r=await api('saveAccountingMaterial',p); msg('matMsg',r.message,!r.success); refresh();}catch(e){st.data.materials.unshift(Object.assign({computedUnitCost:p.calculatedUnitCost},p)); localSave(); msg('matMsg','حفظ محلي مؤقت: '+e.message,true); renderScreen();}},
    async recalc(){try{let r=await api('recalculateAccountingMaterials'); msg('matMsg',r.message,!r.success); refresh();}catch(e){msg('matMsg',e.message,true)}},
    async saveTemplate(){const p={department:val('tplDept'),category:val('tplCat'),itemName:val('tplName'),size:val('tplSize'),materialName:val('tplMat'),inkCost:val('tplInk'),fixedCost:val('tplFixed'),salePrice:val('tplSale'),active:'نعم'}; try{let r=await api('saveAccountingTemplate',p); msg('tplMsg',r.message,!r.success); refresh();}catch(e){st.data.templates.unshift(p); localSave(); msg('tplMsg','حفظ محلي مؤقت: '+e.message,true); renderScreen();}},
    applyTemplate(){const t=tplList()[num(val('dlTpl'))]; if(!t)return; set('dlItem',t.itemName); set('dlMat',t.materialName); set('dlSystemSale',num(t.salePrice).toFixed(2)); set('dlSale',num(t.salePrice).toFixed(2)); const m=matByName(t.materialName); const cost=num(m&&(m.computedUnitCost||m.unitCost))+num(t.inkCost)+num(t.fixedCost); set('dlMatCost',num(m&&(m.computedUnitCost||m.unitCost)).toFixed(2)); set('dlLabor',num(t.fixedCost).toFixed(2)); set('dlOther',num(t.inkCost).toFixed(2)); set('dlSystemCost',cost.toFixed(2)); this.calcDept();},
    calcDept(){const q=num(val('dlQty'))||1, sys=num(val('dlSystemSale')), sale=num(val('dlSale')); set('dlDiff',((sale-sys)*q).toFixed(2)); set('dlTotal',(sale*q).toFixed(2)); set('dlRemain',Math.max(0,num(val('dlDamage'))-num(val('dlCovered'))).toFixed(2));},
    aiLaser(){const w=num(val('aiW')), h=num(val('aiH')), price=num(val('aiPrice')); const parts=String(val('aiSize')||'122x244').split(/x|×|\*/).map(num); const area=(parts[0]||122)*(parts[1]||244); const cost=area? price*((w*h)/area)*1.15:0; set('dlMatCost',cost.toFixed(2)); set('dlSystemCost',cost.toFixed(2)); if($('aiMsg')) $('aiMsg').textContent='تكلفة مقترحة '+money(cost);},
    async saveDeptLine(){this.calcDept(); const p={orderId:val('dlOrder'),lineId:val('dlLine'),customerName:val('dlCustomer'),department:val('dlDept'),itemType:'قسم فقط',itemName:val('dlItem'),qty:val('dlQty'),materialName:val('dlMat'),materialQty:1,materialCost:val('dlMatCost'),laborCost:val('dlLabor'),otherCost:val('dlOther'),systemCost:val('dlSystemCost'),systemSalePrice:val('dlSystemSale'),salePrice:val('dlSale'),priceDiff:val('dlDiff'),damageCost:val('dlDamage'),damageCovered:val('dlCovered'),damageRemaining:val('dlRemain'),notes:val('dlNotes')}; try{let r=await api('saveAccountingDeptLine',p); msg('deptMsg',r.message,!r.success); refresh();}catch(e){st.data.deptLines.unshift(Object.assign({id:'LOCAL-'+Date.now(),closeStatus:'مفتوح'},p)); if(num(p.priceDiff)||num(p.damageRemaining)) st.data.wasteLines.unshift(p); localSave(); msg('deptMsg','حفظ محلي مؤقت: '+e.message,true); renderScreen();}},
    loadFinalLines(){const order=val('fiOrder'); const rows=(st.data.deptLines||[]).filter(r=>String(r.orderId)===String(order)&&String(r.closeStatus||'مفتوح')!=='تم التقفيل'); $('finalLines').innerHTML='<div class="invoiceBox"><h3>أجزاء الأقسام</h3>'+ (rows.map(r=>`<label style="display:block;margin:8px 0"><input type="checkbox" checked value="${esc(r.id||r.ID)}" onchange="ES.calcFinal()"> ${esc(r.department)} - ${esc(r.itemName)} - ${money(r.salePrice)}</label>`).join('')||'لا توجد أجزاء مفتوحة') + '</div>'; this.calcFinal();},
    calcFinal(){const ids=[...document.querySelectorAll('#finalLines input:checked')].map(x=>x.value); const rows=(st.data.deptLines||[]).filter(r=>ids.includes(String(r.id||r.ID))); st.selectedLines=ids; const total=rows.reduce((s,r)=>s+num(r.salePrice),0)+num(val('fiManualAmount'))-num(val('fiDiscount')); set('fiTotal',Math.max(0,total).toFixed(2)); set('fiRemain',Math.max(0,total-num(val('fiPaid'))).toFixed(2));},
    async saveFinal(){this.calcFinal(); const p={orderId:val('fiOrder'),customerName:val('fiCustomer'),lineIds:JSON.stringify(st.selectedLines),manualDescription:val('fiManualDesc'),manualAmount:val('fiManualAmount'),subtotal:val('fiTotal'),discount:val('fiDiscount'),finalTotal:val('fiTotal'),paid:val('fiPaid'),remaining:val('fiRemain')}; try{let r=await api('saveAccountingFinalInvoice',p); msg('finalMsg',r.message,!r.success); refresh();}catch(e){st.data.finalInvoices.unshift(Object.assign({invoiceNo:'LOCAL-'+Date.now()},p)); localSave(); msg('finalMsg','حفظ محلي مؤقت: '+e.message,true); renderScreen();}},
    printInvoice(){this.calcFinal(); const w=window.open('','_blank'); w.document.write(`<html dir="rtl"><head><title>فاتورة مطبعجي</title><style>body{font-family:Tahoma;padding:30px}.box{border:1px solid #ccc;padding:25px;max-width:700px;margin:auto}h1{text-align:center;color:#07866f}</style></head><body><div class="box"><h1>فاتورة مطبعجي</h1><p>رقم الأوردر: ${esc(val('fiOrder'))}</p><p>العميل: ${esc(val('fiCustomer'))}</p><h2>الإجمالي: ${money(val('fiTotal'))}</h2><h2>المدفوع: ${money(val('fiPaid'))}</h2><h2>الباقي: ${money(val('fiRemain'))}</h2></div><script>print()<\/script></body></html>`);},
  };
  render(); refresh();
})();
