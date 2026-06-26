
/*********************** EasyStore Patch 23 - SSO Recovery Before Boot ***********************/
(function(){
  try {
    var qs = new URLSearchParams(location.search);
    var hasUser = qs.get('username') || qs.get('name') || qs.get('token');
    var handoff = localStorage.getItem('MATBAGY_EMPLOYEE_SSO');
    if (!hasUser && handoff) {
      var data = JSON.parse(handoff || '{}');
      var p = data.params || {};
      var u = data.user || {};
      var next = new URLSearchParams(location.search);
      next.set('from','trendos');
      next.set('sso','1');
      next.set('employeeSSO','1');
      next.set('skipLogin','1');
      next.set('noPhone','1');
      next.set('noActivation','1');
      next.set('username', p.username || u.username || u.name || 'ضياء');
      next.set('name', p.name || u.name || u.username || 'ضياء');
      next.set('token', p.token || u.token || '');
      next.set('mode', p.mode || p.roleMode || u.mode || 'full');
      next.set('roleMode', p.roleMode || p.mode || u.mode || 'full');
      next.set('department', p.department || u.department || '');
      location.replace(location.pathname + '?' + next.toString());
    }
  } catch (e) {}
})();


(function(){
  const app=document.getElementById('app');
  const qs=new URLSearchParams(location.search);
  const st={
    user:{username:qs.get('username')||qs.get('name')||'ضياء',name:qs.get('name')||qs.get('username')||'ضياء',token:qs.get('token')||'',mode:qs.get('mode')||qs.get('roleMode')||'',department:qs.get('department')||''},
    active:'',data:{materials:[],templates:[],deptLines:[],finalInvoices:[],wasteLines:[],stockMoves:[],summary:{}},recipeComps:[],selectedLines:[]
  };
  const $=id=>document.getElementById(id);
  const val=id=>$(id)?$(id).value:'';
  const set=(id,v)=>{if($(id))$(id).value=(v==null?'':v)};
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const num=v=>{const n=parseFloat(String(v||'').replace(/[٬,]/g,'.'));return isNaN(n)?0:n};
  const money=n=>num(n).toLocaleString('ar-EG',{maximumFractionDigits:2})+' ج';
  const nkey=v=>String(v||'').toLowerCase().replace(/[إأآا]/g,'ا').replace(/[ى]/g,'ي').replace(/[ؤ]/g,'و').replace(/[ئ]/g,'ي').replace(/[ةه]/g,'ه').trim();
  const key=()=>nkey([st.user.username,st.user.name,st.user.mode,st.user.department].join(' '));
  const isFull=()=>/ضياء|diaa|admin|full|kitchen/.test(key());
  const isLaser=()=>/جابر|gaber|jaber|laser|ليزر/.test(key());
  const isPrint=()=>/وائل|wael|print|طباع/.test(key());
  const isFinal=()=>/رحمه|رحمة|ريفان|ريڤان|rahma|revan|rivan|final/.test(key());
  const dept=()=>isLaser()?'ليزر':isPrint()?'طباعة':(st.user.department||'');
  const canSeeCosts=()=>isFull();
  function msg(id,t,bad){if($(id)){ $(id).className='msg '+(bad?'bad':''); $(id).textContent=t||''; }}
  function params(extra){return new URLSearchParams(Object.assign({username:st.user.username,token:st.user.token},extra||{})).toString()}
  function localSave(){localStorage.setItem('EASYSTORE_MATBAGY_V3',JSON.stringify(st.data));}
  function localLoad(){try{return JSON.parse(localStorage.getItem('EASYSTORE_MATBAGY_V3')||'{}')}catch(e){return {}}}
  function api(action,data){return new Promise((resolve,reject)=>{const base=(window.TREND_API_URL||'').trim(); if(!base)return reject(new Error('رابط Web App غير مضبوط')); const cb='ES2CB_'+Date.now()+'_'+Math.random().toString(16).slice(2); window[cb]=r=>{cleanup();resolve(r||{})}; const s=document.createElement('script'); s.src=base+'?action='+encodeURIComponent(action)+'&callback='+cb+'&'+params(data); s.onerror=()=>{cleanup();reject(new Error('فشل الاتصال بالسيرفر'))}; function cleanup(){delete window[cb]; if(s.parentNode)s.parentNode.removeChild(s)} document.body.appendChild(s); setTimeout(()=>{if(window[cb]){cleanup();reject(new Error('انتهت مهلة الاتصال'))}},18000);});}
  function modeText(){return isFull()?'ضياء - مطبخ الحسابات':isLaser()?'جابر - ليزر + حاسبة AI':isPrint()?'وائل - فواتير طباعة':isFinal()?'رحمة/ريفان - تقفيل نهائي':'موظف'}
  async function refresh(){msg('mainMsg','جاري تحميل بيانات الحسابات...'); try{const r=await api('getAccounting'); if(!r.success)throw new Error(r.message||'تعذر التحميل'); st.data={materials:r.materials||[],templates:r.templates||[],deptLines:r.deptLines||[],finalInvoices:r.finalInvoices||[],wasteLines:r.wasteLines||[],stockMoves:r.stockMoves||[],summary:r.summary||{}}; localSave(); msg('mainMsg','تم التحديث من الشيتات.');}catch(e){st.data=Object.assign(st.data,localLoad()); msg('mainMsg','تنبيه: يعمل بنسخة محلية مؤقتة - '+e.message,true);} renderScreen();}
  function materialName(r){return r.materialName||r['اسم الخامة']||''}
  function templateName(r){return r.itemName||r['اسم البند']||''}
  function matByName(n){const k=nkey(n); return (st.data.materials||[]).find(r=>nkey(materialName(r))===k)}
  function templateByIndex(i){return filteredTemplates()[num(i)]}
  function materialCost(r){return num(r.computedUnitCost||r.calculatedUnitCost||r.unitCost||r['تكلفة محسوبة']||r['سعر الوحدة'])}
  function materialKind(r){return String(r.materialKind||r['نوع الخامة']||'').toLowerCase()}
  function materialComps(r){try{const v=r.componentsJson||r['مكونات الخامة']||'[]'; const a=JSON.parse(v||'[]'); return Array.isArray(a)?a:[]}catch(e){return []}}
  function materialByIndex(i){return (st.data.materials||[])[num(i)]}
  function setSelectValue(id,v){const el=$(id); if(!el)return; v=String(v==null?'':v); if(v && ![...el.options].some(o=>String(o.value)===v)){const opt=document.createElement('option'); opt.value=v; opt.textContent=v; el.appendChild(opt);} el.value=v;}
  function materialSale(r){return num(r.salePrice||r['سعر بيع رسمي']||r['سعر بيع مقترح'])}
  function sizeParts(v){const p=String(v||'').replace(/[×*]/g,'x').split('x').map(num); return {w:p[0]||0,h:p[1]||0}}
  function calcCut(rawW,rawH,outW,outH,waste){
    rawW=num(rawW);rawH=num(rawH);outW=num(outW);outH=num(outH);waste=num(waste);
    if(!rawW||!rawH||!outW||!outH)return {pieces:0,consumption:0,cost:0,orientation:''};
    const a=Math.floor(rawW/outW)*Math.floor(rawH/outH); const b=Math.floor(rawW/outH)*Math.floor(rawH/outW); const pieces=Math.max(a,b); const orientation=b>a?'تدوير':'عادي';
    const consumption=pieces? (1/pieces)*(1+waste/100):0; return {pieces,consumption,orientation};
  }
  function materialOptions(filter){return (st.data.materials||[]).filter(r=>!filter||filter(r)).map(r=>`<option value="${esc(materialName(r))}">${esc(materialName(r))} - ${esc(r.department||'')}</option>`).join('')}
  function templateOptions(){return filteredTemplates().map((r,i)=>`<option value="${i}">${esc(templateName(r))} - ${esc(r.department||'')}</option>`).join('')}
  function filteredTemplates(){return (st.data.templates||[]).filter(r=>isFull()||['عام','مشترك',dept()].includes(String(r.department||'')))}
  function tabs(){const list=[]; if(isFull())list.push(['dashboard','لوحة الحسابات'],['items','الأصناف'],['purchase','فواتير الشراء'],['sales','فواتير المبيعات'],['stock','المخزون'],['reports','التقارير'],['kitchen','مطبخ الحسابات'],['raw','خامات أساسية'],['recipe','أصناف بمكونات'],['templates','بنود الفواتير']); else if(isPrint()||isLaser())list.push(['dept','فاتورة القسم'],['waste','هوالك القسم']); else if(isFinal())list.push(['final','تقفيل الفاتورة'],['sales','فواتير المبيعات'],['deptView','أجزاء الأقسام']); else list.push(['dept','فاتورة القسم']); if(!st.active)st.active=list[0][0]; return '<div class="tabs">'+list.map(x=>`<button class="tab ${st.active===x[0]?'active':''}" onclick="ES.go('${x[0]}')">${x[1]}</button>`).join('')+'</div>'}
  function render(){app.innerHTML=`<div class="wrap"><div class="top"><div><h1>💰 إيزي ستور مطبعجي V7 - برنامج الحسابات الكامل</h1><p>أصناف وفواتير شراء ومبيعات ومخزون وتقارير + مطبخ الحسابات والخامات المركبة.</p></div><div class="actions"><span class="badge">${esc(st.user.name)} / ${modeText()}</span><button class="btn secondary" onclick="ES.refresh()">تحديث</button><button class="btn secondary" onclick="window.close()">إغلاق</button></div></div><div id="mainMsg" class="msg"></div>${tabs()}<div id="screen"></div></div>`; renderScreen();}
  function renderScreen(){if(!$('screen'))return; const a=st.active; $('screen').innerHTML=a==='dashboard'?screenDashboard():a==='items'?screenItems():a==='purchase'?screenPurchase():a==='sales'?screenSales():a==='kitchen'?screenKitchen():a==='raw'?screenRaw():a==='recipe'?screenRecipe():a==='templates'?screenTemplates():a==='dept'?screenDept():a==='final'?screenFinal():a==='stock'?screenStock():a==='reports'?screenReports():a==='waste'?screenWaste():deptTable();}

  function es24LocalList(k){try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return []}}
  function es24SaveLocal(k,a){localStorage.setItem(k,JSON.stringify(a||[]))}
  function screenDashboard(){return `<div class="card"><h2>لوحة الحسابات</h2><div class="grid four"><button class="btn" onclick="ES.go('items')">الأصناف</button><button class="btn" onclick="ES.go('purchase')">فواتير الشراء</button><button class="btn" onclick="ES.go('sales')">فواتير المبيعات</button><button class="btn" onclick="ES.go('kitchen')">مطبخ الحسابات</button></div><div class="hint">البرنامج كامل: الأصناف، فواتير الشراء، فواتير المبيعات، المخزون، التقارير، ومطبخ الخامات المركبة.</div></div>${screenReports()}`}
  function screenItems(){return `<div class="card"><h2>الأصناف</h2><div class="hint small">دي الأصناف والبنود التي تظهر للموظفين في الفواتير. مطبخ الحسابات يبني تكلفة الصنف، وهنا يظهر سعره وبياناته.</div></div>${templatesTable()}${materialsTable()}`}
  function screenPurchase(){const rows=es24LocalList('ES24_PURCHASES');return `<div class="card"><h2>فاتورة شراء</h2><div class="grid four"><div class="field"><label>رقم الفاتورة</label><input id="purNo"></div><div class="field"><label>المورد</label><input id="purSupplier"></div><div class="field"><label>الخامة</label><select id="purMat"><option></option>${materialOptions()}</select></div><div class="field"><label>الكمية</label><input id="purQty" type="number"></div></div><div class="grid three"><div class="field"><label>سعر الوحدة</label><input id="purUnit" type="number"></div><div class="field"><label>ملاحظات</label><input id="purNotes"></div><div class="field"><label>&nbsp;</label><button class="btn" onclick="ES.savePurchase()">حفظ فاتورة الشراء</button></div></div><div id="purMsg"></div></div><div class="card"><h3>فواتير شراء محفوظة</h3><div class="tablewrap"><table><thead><tr><th>الفاتورة</th><th>المورد</th><th>الخامة</th><th>الكمية</th><th>الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.no)}</td><td>${esc(r.supplier)}</td><td>${esc(r.material)}</td><td>${esc(r.qty)}</td><td>${money(r.unit)}</td><td>${money(r.total)}</td></tr>`).join('')||'<tr><td colspan="6">لا توجد فواتير شراء.</td></tr>'}</tbody></table></div></div>`}
  function screenSales(){const rows=es24LocalList('ES24_SALES');return `<div class="card"><h2>فاتورة مبيعات</h2><div class="grid four"><div class="field"><label>رقم الفاتورة</label><input id="salNo"></div><div class="field"><label>العميل</label><input id="salCustomer"></div><div class="field"><label>البند</label><select id="salItem"><option></option>${templateOptions()}</select></div><div class="field"><label>الكمية</label><input id="salQty" type="number"></div></div><div class="grid three"><div class="field"><label>سعر الوحدة</label><input id="salUnit" type="number"></div><div class="field"><label>ملاحظات</label><input id="salNotes"></div><div class="field"><label>&nbsp;</label><button class="btn" onclick="ES.saveSale()">حفظ فاتورة المبيعات</button></div></div><div id="salMsg"></div></div><div class="card"><h3>فواتير مبيعات محفوظة</h3><div class="tablewrap"><table><thead><tr><th>الفاتورة</th><th>العميل</th><th>البند</th><th>الكمية</th><th>الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.no)}</td><td>${esc(r.customer)}</td><td>${esc(r.item)}</td><td>${esc(r.qty)}</td><td>${money(r.unit)}</td><td>${money(r.total)}</td></tr>`).join('')||'<tr><td colspan="6">لا توجد فواتير مبيعات.</td></tr>'}</tbody></table></div></div>${finalTable()}`}
  function screenKitchen(){return `<div class="card"><h2>مطبخ الحسابات</h2><div class="hint">ابدأ بتسجيل الخامات الأساسية: رول لامينشن، رول ورق، فوتوبلوك، خشب. بعد ذلك أنشئ أصناف بمكونات مثل قطعة لامينشن 15×21، كارت 15×21، ثم تابلوه 15×21. عند استخدام البند في الفاتورة يتم خصم الاستهلاك تلقائياً من الرول أو الخامة الأصلية.</div><div class="grid four"><button class="btn" onclick="ES.go('raw')">1) خامات أساسية</button><button class="btn" onclick="ES.go('recipe')">2) أصناف بمكونات</button><button class="btn" onclick="ES.go('templates')">3) بنود الفواتير</button><button class="btn secondary" onclick="ES.initSheets()">تجهيز الشيتات</button></div></div>${screenReports()}`}
  function screenRaw(){if(!isFull())return '<div class="card"><div class="msg bad">تسجيل الخامات الأساسية عند ضياء فقط.</div></div>'; return `<div class="card"><h2>خامة أساسية في المخزن</h2><div class="hint small">اكتب أو عدّل الخامة الأساسية. عند تغيير السعر أو المقاس اضغط حفظ ثم تحديث الأسعار؛ سيتم إعادة حساب كل الأصناف المرتبطة بنفس المكونات.</div><input id="rawId" type="hidden"><div class="grid four"><div class="field"><label>القسم</label><select id="rawDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الخامة</label><input id="rawName" placeholder="رول لامينشن / رول ورق 30 / فوتوبلوك 15×21"></div><div class="field"><label>الوحدة</label><input id="rawUnit" placeholder="رول / شيت / قطعة"></div><div class="field"><label>رصيد المخزن</label><input id="rawStock" type="number" placeholder="مثلاً 1 رول"></div></div><div class="grid four"><div class="field"><label>سعر الوحدة</label><input id="rawCost" type="number"></div><div class="field"><label>سعر بيع رسمي اختياري</label><input id="rawSale" type="number"></div><div class="field"><label>عرض الخام بالسم</label><input id="rawW" type="number" placeholder="مثلاً 30"></div><div class="field"><label>طول الخام بالسم</label><input id="rawH" type="number" placeholder="مثلاً 5000 لرول 50 متر"></div></div><div class="grid two"><div class="field"><label>حد تنبيه النقص</label><input id="rawMin" type="number"></div><div class="field"><label>ملاحظات</label><input id="rawNotes"></div></div><div class="actions"><button class="btn" onclick="ES.saveRaw()">حفظ / تحديث الخامة الأساسية</button><button class="btn secondary" onclick="ES.recalcMaterials()">تحديث أسعار كل البنود المرتبطة</button><button class="btn secondary" onclick="ES.clearRawForm()">خامة جديدة</button></div><div id="rawMsg"></div></div>${materialsTable()}`}
  function screenRecipe(){if(!isFull())return '<div class="card"><div class="msg bad">إنشاء الأصناف بمكونات عند ضياء فقط.</div></div>'; return `<div class="card"><h2>صنف / خامة بمكونات</h2><div class="hint small">الصنف المركب محفوظ بمعادلاته. عند تعديل سعر أو مقاس أي خامة أصلية، اضغط تحديث الأسعار وسيعاد حساب تكلفة الأصناف المركبة تلقائياً.</div><input id="recId" type="hidden"><div class="grid four"><div class="field"><label>القسم</label><select id="recDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الصنف المحفوظ</label><input id="recName" placeholder="قطعة لامينشن 15×21"></div><div class="field"><label>مقاس الناتج</label><input id="recSize" placeholder="15x21" oninput="ES.aiPreviewComp()"></div><div class="field"><label>سعر بيع رسمي</label><input id="recSale" type="number"></div></div><div class="grid four"><div class="field"><label>هالك %</label><input id="recWaste" type="number" value="5" oninput="ES.aiPreviewComp()"></div><div class="field"><label>تكلفة محسوبة</label><input id="recCost" readonly></div><div class="field"><label>عدد الناتج من الأصل</label><input id="recOutputCount" readonly></div><div class="field"><label>استهلاك الأصل للوحدة</label><input id="recUnitCons" readonly></div></div><hr><h3>إضافة مكون للصنف</h3><div class="grid four"><div class="field"><label>اختار خامة / صنف سابق</label><select id="compMat" onchange="ES.aiPreviewComp()"><option></option>${materialOptions()}</select></div><div class="field"><label>كمية المكون للوحدة</label><input id="compQty" type="number" value="1"></div><div class="field"><label>تكلفة المكون</label><input id="compCost" readonly></div><div class="field"><label>الناتج من الرول/الشيت</label><input id="compPieces" readonly></div></div><div class="actions"><button class="btn secondary" onclick="ES.aiPreviewComp()">احسب AI للمكون</button><button class="btn" onclick="ES.addComp()">إضافة المكون</button><button class="btn danger" onclick="ES.clearComps()">تفريغ المكونات</button></div><div id="compMsg"></div><div id="compList"></div><div class="actions"><button class="btn secondary" onclick="ES.calcRecipe()">احسب تكلفة الصنف</button><button class="btn" onclick="ES.saveRecipe()">حفظ / تحديث الصنف</button><button class="btn secondary" onclick="ES.recalcMaterials()">تحديث أسعار كل البنود المرتبطة</button><button class="btn secondary" onclick="ES.clearRecipeForm()">صنف جديد</button></div><div id="recMsg"></div></div>${materialsTable()}`}
  function compListHtml(){return `<div class="card"><h3>مكونات الصنف الحالي</h3>${st.recipeComps.length?'<div class="tablewrap"><table><thead><tr><th>المكون</th><th>الاستهلاك للوحدة</th><th>تكلفة</th><th>طريقة الحساب</th><th></th></tr></thead><tbody>'+st.recipeComps.map((c,i)=>`<tr><td>${esc(c.materialName)}</td><td>${c.qty}</td><td>${money(c.cost)}</td><td>${esc(c.method||'يدوي')}</td><td><button class="btn small danger" onclick="ES.removeComp(${i})">حذف</button></td></tr>`).join('')+'</tbody></table></div>':'<div class="muted">لا توجد مكونات بعد.</div>'}</div>`}
  function screenTemplates(){const form=isFull()?`<div class="card"><h2>بند يظهر للموظفين في الفواتير</h2><div class="grid four"><div class="field"><label>القسم</label><select id="tplDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>التصنيف</label><input id="tplCat" placeholder="تابلوهات / كروت / ليزر"></div><div class="field"><label>اسم البند</label><input id="tplName" placeholder="تابلوه 15×21"></div><div class="field"><label>المقاس</label><input id="tplSize" placeholder="15x21"></div></div><div class="grid four"><div class="field"><label>الصنف/الخامة المرتبطة</label><select id="tplMat"><option></option>${materialOptions()}</select></div><div class="field"><label>تكلفة ثابتة</label><input id="tplFixed" type="number" value="0"></div><div class="field"><label>تكلفة حبر</label><input id="tplInk" type="number" value="0"></div><div class="field"><label>سعر بيع رسمي</label><input id="tplSale" type="number"></div></div><div class="actions"><button class="btn" onclick="ES.saveTemplate()">حفظ البند للموظفين</button></div><div id="tplMsg"></div></div>`:''; return form+templatesTable()}
  function screenDept(){const ai=isLaser()?laserAIBox():''; return `<div class="card"><h2>فاتورة القسم</h2><div class="hint">الموظف يختار بند فقط. أسعار الخامات والتكلفة مخفية. يمكن تعديل سعر القطعة في الفاتورة فقط، والفرق يذهب تلقائياً إلى هوالك القسم.</div><div class="grid four"><div class="field"><label>رقم الأوردر</label><input id="dlOrder"></div><div class="field"><label>اسم العميل</label><input id="dlCustomer"></div><div class="field"><label>القسم</label><input id="dlDept" value="${esc(dept()||'طباعة')}" readonly></div><div class="field"><label>الكمية</label><input id="dlQty" type="number" value="1" oninput="ES.calcDept()"></div></div><div class="grid three"><div class="field"><label>اختار البند</label><select id="dlTpl" onchange="ES.applyTemplate()"><option></option>${templateOptions()}</select></div><div class="field"><label>اسم البند</label><input id="dlItem" readonly></div><div class="field"><label>سعر القطعة في الفاتورة</label><input id="dlSale" type="number" oninput="ES.calcDept()"></div></div><input id="dlMat" type="hidden"><input id="dlSystemSale" type="hidden"><input id="dlDiff" type="hidden"><div class="totalBox"><div>سعر السيستم<b id="sysText">0 ج</b></div><div>إجمالي الفاتورة<b id="totalText">0 ج</b></div><div>فرق السعر للهوالك<b id="diffText">0 ج</b></div><div>الباقي تالف على الموظف<b id="remainText">0 ج</b></div></div><div class="grid three"><div class="field"><label>تالف خامات عليه</label><input id="dlDamage" type="number" value="0" oninput="ES.calcDept()"></div><div class="field"><label>عوض منهم</label><input id="dlCovered" type="number" value="0" oninput="ES.calcDept()"></div><div class="field"><label>ملاحظات</label><input id="dlNotes"></div></div>${ai}<div class="actions"><button class="btn" onclick="ES.saveDeptLine()">حفظ فاتورة القسم وخصم المخزون</button></div><div id="deptMsg"></div></div>${deptTable()}`}
  function laserAIBox(){return `<div class="card"><h3>🤖 حاسبة جابر AI للمقاسات المتغيرة</h3><div class="grid four"><div class="field"><label>عرض الشغل سم</label><input id="aiW" type="number"></div><div class="field"><label>ارتفاع الشغل سم</label><input id="aiH" type="number"></div><div class="field"><label>سعر لوح الليزر</label><input id="aiPrice" type="number"></div><div class="field"><label>مقاس اللوح سم</label><input id="aiSheet" value="122x244"></div></div><div class="actions"><button class="btn secondary" onclick="ES.aiLaser()">احسب سعر مقترح</button><span id="aiMsg" class="pill"></span></div></div>`}
  function screenFinal(){return `<div class="card"><h2>تقفيل فاتورة العميل</h2><div class="grid four"><div class="field"><label>رقم الأوردر</label><input id="fiOrder"></div><div class="field"><label>اسم العميل</label><input id="fiCustomer"></div><div class="field"><label>خصم</label><input id="fiDiscount" type="number" value="0" oninput="ES.calcFinal()"></div><div class="field"><label>مدفوع</label><input id="fiPaid" type="number" value="0" oninput="ES.calcFinal()"></div></div><div class="grid four"><div class="field"><label>بند يدوي</label><input id="fiManualDesc"></div><div class="field"><label>قيمة بند يدوي</label><input id="fiManualAmount" type="number" value="0" oninput="ES.calcFinal()"></div><div class="field"><label>الإجمالي</label><input id="fiTotal" readonly></div><div class="field"><label>الباقي</label><input id="fiRemain" readonly></div></div><div class="actions"><button class="btn secondary" onclick="ES.loadFinalLines()">استدعاء أجزاء وائل وجابر</button><button class="btn" onclick="ES.saveFinal()">تقفيل الفاتورة</button><button class="btn secondary" onclick="ES.printInvoice()">PDF / طباعة</button></div><div id="finalMsg"></div><div id="finalLines"></div></div>${finalTable()}`}
  function materialsTable(){const rows=st.data.materials||[];return `<div class="card"><div class="sectionHead"><h3>الخامات والأصناف المحفوظة</h3>${isFull()?'<button class="btn secondary smallBtn" onclick="ES.recalcMaterials()">تحديث كل الأسعار المرتبطة</button>':''}</div><div class="hint small">زر تعديل يفتح الخامة أو الصنف بنفس بياناته. أي تعديل في سعر/مقاس خامة أصلية يتم تطبيقه على الأصناف المركبة بعد الحفظ والتحديث.</div><div class="tablewrap"><table><thead><tr><th>القسم</th><th>الاسم</th><th>النوع</th><th>رصيد</th><th>${canSeeCosts()?'تكلفة':''}</th><th>بيع</th><th>أبعاد</th><th>${isFull()?'إجراء':''}</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${esc(r.department)}</td><td>${esc(materialName(r))}</td><td>${esc(r.materialKind)}</td><td>${esc(r.stockQty||'')}</td><td>${canSeeCosts()?money(materialCost(r)):''}</td><td>${money(materialSale(r))}</td><td>${esc((r.width||'')+'×'+(r.height||''))}</td><td>${isFull()?`<button class="mini" onclick="ES.editMaterial(${i})">تعديل</button>`:''}</td></tr>`).join('')||'<tr><td colspan="8">لا توجد خامات.</td></tr>'}</tbody></table></div></div>`}
  function screenStock(){return `<div class="card"><h2>المخزون وحركة الخصم</h2><div class="hint">أي فاتورة قسم محفوظة تخصم تلقائياً من الخامات الأصلية. إذا مكون ناقص يمنع الحفظ برسالة واضحة.</div></div>${materialsTable()}${stockMovesTable()}`}
  function stockMovesTable(){const rows=st.data.stockMoves||[];return `<div class="card"><h3>حركة المخزون</h3><div class="tablewrap"><table><thead><tr><th>وقت</th><th>الأوردر</th><th>البند</th><th>الخامة الأصلية</th><th>الكمية المخصومة</th><th>الرصيد بعد</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r['وقت الحركة']||r.createdAt||'')}</td><td>${esc(r.orderId||r['رقم الأوردر']||'')}</td><td>${esc(r.itemName||r['اسم البند']||'')}</td><td>${esc(r.materialName||r['الخامة']||'')}</td><td>${esc(r.qtyOut||r['كمية منصرفة']||'')}</td><td>${esc(r.balanceAfter||r['رصيد بعد الحركة']||'')}</td></tr>`).join('')||'<tr><td colspan="6">لا توجد حركة مخزون.</td></tr>'}</tbody></table></div></div>`}
  function screenWaste(){const rows=st.data.wasteLines||[];return `<div class="card"><h2>هوالك القسم</h2><div class="tablewrap"><table><thead><tr><th>الأوردر</th><th>القسم</th><th>البند</th><th>فرق السعر</th><th>تالف</th><th>تعويض</th><th>الباقي</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.orderId)}</td><td>${esc(r.department)}</td><td>${esc(r.itemName)}</td><td>${money(r.priceDiff)}</td><td>${money(r.damageCost)}</td><td>${money(r.damageCovered)}</td><td>${money(r.damageRemaining||r['الباقي'])}</td></tr>`).join('')||'<tr><td colspan="7">لا يوجد هوالك.</td></tr>'}</tbody></table></div></div>`}
  function finalTable(){const rows=st.data.finalInvoices||[];return `<div class="card"><h3>الفواتير النهائية</h3><div class="tablewrap"><table><thead><tr><th>الفاتورة</th><th>الأوردر</th><th>العميل</th><th>الإجمالي</th><th>الباقي</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.invoiceNo)}</td><td>${esc(r.orderId)}</td><td>${esc(r.customerName)}</td><td>${money(r.finalTotal)}</td><td>${money(r.remaining)}</td></tr>`).join('')||'<tr><td colspan="5">لا توجد فواتير.</td></tr>'}</tbody></table></div></div>`}
  function screenReports(){return `<div class="card"><h2>تقارير مختصرة</h2></div>${deptTable()}${screenWaste()}${stockMovesTable()}`}
  function updateCompList(){if($('compList'))$('compList').innerHTML=compListHtml()}
  window.ES={
    go(x){st.active=x;render()},refresh,
    clearRawForm(){['rawId','rawName','rawUnit','rawStock','rawCost','rawSale','rawW','rawH','rawMin','rawNotes'].forEach(id=>set(id,'')); setSelectValue('rawDept','طباعة'); msg('rawMsg','خامة جديدة جاهزة.');},
    clearRecipeForm(){['recId','recName','recSize','recSale','recCost','recOutputCount','recUnitCons'].forEach(id=>set(id,'')); set('recWaste','5'); setSelectValue('recDept','طباعة'); st.recipeComps=[]; updateCompList(); msg('recMsg','صنف جديد جاهز.');},
    editMaterial(i){const r=materialByIndex(i); if(!r)return; const comps=materialComps(r); const kind=materialKind(r); if(comps.length || kind.indexOf('recipe')!==-1 || kind.indexOf('composite')!==-1 || kind.indexOf('مكونات')!==-1){st.active='recipe'; renderScreen(); set('recId',r.id||r.ID||''); setSelectValue('recDept',r.department||'طباعة'); set('recName',materialName(r)); set('recSize',r.outputSize||''); set('recSale',r.salePrice||r['سعر بيع رسمي']||''); set('recWaste',r.wastePercent||'5'); st.recipeComps=comps.map(c=>({materialName:c.materialName||c.name||c['اسم الخامة']||'',qty:num(c.qty||c.quantity||c['استهلاك'])||1,cost:num(c.cost||c['تكلفة'])||0,method:c.method||c['طريقة']||'محفوظ'})); updateCompList(); this.calcRecipe(); msg('recMsg','تم تحميل الصنف للتعديل: '+materialName(r)); } else {st.active='raw'; renderScreen(); set('rawId',r.id||r.ID||''); setSelectValue('rawDept',r.department||'طباعة'); set('rawName',materialName(r)); set('rawUnit',r.unit||''); set('rawStock',r.stockQty||''); set('rawCost',r.unitCost||r['سعر الوحدة']||''); set('rawSale',r.salePrice||r['سعر بيع رسمي']||''); set('rawW',r.width||''); set('rawH',r.height||''); set('rawMin',r.minStock||''); set('rawNotes',r.notes||''); msg('rawMsg','تم تحميل الخامة للتعديل: '+materialName(r));}},
    async recalcMaterials(){try{msg('mainMsg','جاري تحديث أسعار الخامات والأصناف المرتبطة...'); const r=await api('recalculateAccountingMaterials'); msg('mainMsg',r.message,!r.success); await refresh();}catch(e){msg('mainMsg','تعذر تحديث الأسعار: '+e.message,true)}},
    async initSheets(){try{const r=await api('initAccounting');msg('mainMsg',r.message,!r.success);refresh()}catch(e){msg('mainMsg',e.message,true)}},
    async saveRaw(){const p={materialId:val('rawId'),department:val('rawDept'),materialName:val('rawName'),materialKind:'raw',unit:val('rawUnit'),stockQty:val('rawStock'),minStock:val('rawMin'),unitCost:val('rawCost'),salePrice:val('rawSale'),width:val('rawW'),height:val('rawH'),wastePercent:0,calculatedUnitCost:val('rawCost'),componentsJson:'[]',formula:'خامة أساسية مباشرة',notes:val('rawNotes'),active:'نعم'}; if(!p.materialName)return msg('rawMsg','اكتب اسم الخامة.',true); try{const r=await api('saveAccountingMaterial',p);msg('rawMsg',r.message,!r.success);refresh()}catch(e){st.data.materials.unshift(Object.assign({computedUnitCost:p.unitCost},p));localSave();msg('rawMsg','حفظ محلي مؤقت: '+e.message,true);renderScreen()}},
    aiPreviewComp(){const m=matByName(val('compMat')); if(!m)return; const sp=sizeParts(val('recSize')); let qty=num(val('compQty'))||1, pieces=0, cost=0, method='يدوي'; if(num(m.width)&&num(m.height)&&sp.w&&sp.h){const c=calcCut(m.width,m.height,sp.w,sp.h,val('recWaste')); pieces=c.pieces; if(pieces){qty=c.consumption; cost=materialCost(m)*qty; method='AI: '+pieces+' قطعة من الأصل - '+c.orientation; set('compQty',qty.toFixed(6)); set('compPieces',pieces); set('compCost',cost.toFixed(4)); set('recOutputCount',pieces); set('recUnitCons',qty.toFixed(6)); msg('compMsg','AI حسب أن '+materialName(m)+' يطلع '+pieces+' قطعة من مقاس '+val('recSize')+'.'); return;}} cost=materialCost(m)*qty; set('compCost',cost.toFixed(4)); set('compPieces',''); msg('compMsg','حساب يدوي للمكون.');},
    addComp(){const name=val('compMat'); if(!name)return msg('compMsg','اختار المكون أولاً.',true); const m=matByName(name); const qty=num(val('compQty'))||1; const cost=num(val('compCost'))||(m?materialCost(m)*qty:0); const method=$('compPieces')&&val('compPieces')?'AI من المقاس':'يدوي'; st.recipeComps.push({materialName:name,qty:+qty.toFixed(6),cost:+cost.toFixed(4),method}); updateCompList(); this.calcRecipe();},
    removeComp(i){st.recipeComps.splice(i,1);updateCompList();this.calcRecipe()}, clearComps(){st.recipeComps=[];updateCompList();this.calcRecipe()},
    calcRecipe(){const total=st.recipeComps.reduce((s,c)=>s+num(c.cost),0); set('recCost',total.toFixed(2)); return total},
    async saveRecipe(){const name=val('recName'); if(!name)return msg('recMsg','اكتب اسم الصنف.',true); if(!st.recipeComps.length)return msg('recMsg','أضف مكونات الصنف أولاً.',true); const total=this.calcRecipe(); const p={materialId:val('recId'),department:val('recDept'),materialName:name,materialKind:'recipe',unit:'قطعة',stockQty:'',minStock:'',unitCost:total,calculatedUnitCost:total,salePrice:val('recSale'),width:'',height:'',wastePercent:val('recWaste'),componentsJson:JSON.stringify(st.recipeComps),formula:'AI recipe from components',outputSize:val('recSize'),outputCount:val('recOutputCount'),unitConsumption:val('recUnitCons'),active:'نعم'}; try{const r=await api('saveAccountingMaterial',p);msg('recMsg',r.message,!r.success);st.recipeComps=[];refresh()}catch(e){st.data.materials.unshift(Object.assign({computedUnitCost:total},p));localSave();msg('recMsg','حفظ محلي مؤقت: '+e.message,true);renderScreen()}},
    async saveTemplate(){const p={department:val('tplDept'),category:val('tplCat'),itemName:val('tplName'),size:val('tplSize'),materialName:val('tplMat'),inkCost:val('tplInk'),fixedCost:val('tplFixed'),salePrice:val('tplSale'),active:'نعم'}; if(!p.itemName)return msg('tplMsg','اكتب اسم البند.',true); try{const r=await api('saveAccountingTemplate',p);msg('tplMsg',r.message,!r.success);refresh()}catch(e){st.data.templates.unshift(p);localSave();msg('tplMsg','حفظ محلي مؤقت: '+e.message,true);renderScreen()}},
    applyTemplate(){const t=templateByIndex(val('dlTpl')); if(!t)return; set('dlItem',templateName(t)); set('dlMat',t.materialName||''); set('dlSystemSale',num(t.salePrice).toFixed(2)); set('dlSale',num(t.salePrice).toFixed(2)); this.calcDept();},
    calcDept(){const q=num(val('dlQty'))||1, sys=num(val('dlSystemSale')), sale=num(val('dlSale')); const diff=(sale-sys)*q; const total=sale*q; const rem=Math.max(0,num(val('dlDamage'))-num(val('dlCovered'))); if($('sysText'))$('sysText').textContent=money(sys); if($('totalText'))$('totalText').textContent=money(total); if($('diffText'))$('diffText').textContent=money(diff); if($('remainText'))$('remainText').textContent=money(rem); set('dlDiff',diff.toFixed(2));},
    aiLaser(){const w=num(val('aiW')),h=num(val('aiH')),price=num(val('aiPrice')); const s=sizeParts(val('aiSheet')); const c=calcCut(s.w,s.h,w,h,15); const cost=c.pieces?price*c.consumption:0; const suggested=cost*2.2; set('dlSale',suggested.toFixed(2)); if($('aiMsg'))$('aiMsg').textContent='تكلفة خامة '+money(cost)+' / سعر مقترح '+money(suggested); this.calcDept();},
    async saveDeptLine(){this.calcDept(); const p={orderId:val('dlOrder'),customerName:val('dlCustomer'),department:val('dlDept'),itemName:val('dlItem'),qty:val('dlQty'),materialName:val('dlMat'),materialQty:val('dlQty'),systemSalePrice:val('dlSystemSale'),salePrice:val('dlSale'),priceDiff:val('dlDiff'),damageCost:val('dlDamage'),damageCovered:val('dlCovered'),notes:val('dlNotes')}; if(!p.orderId||!p.itemName)return msg('deptMsg','رقم الأوردر والبند مطلوبين.',true); try{const r=await api('saveAccountingDeptLine',p);msg('deptMsg',r.message,!r.success); if(r.success)refresh();}catch(e){msg('deptMsg','لم يتم الحفظ على السيرفر: '+e.message,true)}},
    loadFinalLines(){const order=val('fiOrder'); const rows=(st.data.deptLines||[]).filter(r=>String(r.orderId)===String(order)&&String(r.closeStatus||'مفتوح')!=='تم التقفيل'); $('finalLines').innerHTML='<div class="invoiceBox"><h3>أجزاء الأقسام</h3>'+ (rows.map(r=>`<label style="display:block;margin:8px 0"><input type="checkbox" checked value="${esc(r.id||r.ID)}" onchange="ES.calcFinal()"> ${esc(r.department)} - ${esc(r.itemName)} - ${money(r.salePrice)}</label>`).join('')||'لا توجد أجزاء مفتوحة')+'</div>'; this.calcFinal();},
    calcFinal(){const ids=[...document.querySelectorAll('#finalLines input:checked')].map(x=>x.value); const rows=(st.data.deptLines||[]).filter(r=>ids.includes(String(r.id||r.ID))); st.selectedLines=ids; const subtotal=rows.reduce((s,r)=>s+num(r.salePrice),0)+num(val('fiManualAmount')); const final=Math.max(0,subtotal-num(val('fiDiscount'))); set('fiTotal',final.toFixed(2)); set('fiRemain',Math.max(0,final-num(val('fiPaid'))).toFixed(2));},
    async saveFinal(){this.calcFinal(); const p={orderId:val('fiOrder'),customerName:val('fiCustomer'),lineIds:JSON.stringify(st.selectedLines),manualDescription:val('fiManualDesc'),manualAmount:val('fiManualAmount'),subtotal:val('fiTotal'),discount:val('fiDiscount'),finalTotal:val('fiTotal'),paid:val('fiPaid'),remaining:val('fiRemain')}; try{const r=await api('saveAccountingFinalInvoice',p);msg('finalMsg',r.message,!r.success);refresh()}catch(e){msg('finalMsg',e.message,true)}},
    printInvoice(){this.calcFinal(); const w=window.open('','_blank'); w.document.write(`<html dir="rtl"><head><title>فاتورة مطبعجي</title><style>body{font-family:Tahoma;padding:30px}.box{border:1px solid #ccc;padding:25px;max-width:700px;margin:auto}h1{text-align:center;color:#0f766e}</style></head><body><div class="box"><h1>فاتورة مطبعجي</h1><p>رقم الأوردر: ${esc(val('fiOrder'))}</p><p>العميل: ${esc(val('fiCustomer'))}</p><h2>الإجمالي: ${money(val('fiTotal'))}</h2><h2>المدفوع: ${money(val('fiPaid'))}</h2><h2>الباقي: ${money(val('fiRemain'))}</h2></div><script>print()<\/script></body></html>`);}
  };

  /*********************** EasyStore Patch 22 - Manual Yield + Gross Profit + Gaber Laser Materials ***********************/
  window.EASYSTORE_MATBAGY_VERSION = "V7 Batch25 - Full Accounting Core";

  function patch22GrossProfit(cost, sale) {
    cost = num(cost); sale = num(sale);
    const profit = sale - cost;
    const margin = sale ? (profit / sale) * 100 : 0;
    return { profit, margin };
  }

  function patch22LaserMaterials() {
    return (st.data.materials || []).filter(function (r) {
      const d = String(r.department || '').trim();
      const k = String(r.materialKind || '').toLowerCase();
      const name = nkey(materialName(r));
      const hasSize = num(r.width) && num(r.height);
      const isLaserDept = d === 'ليزر' || d === 'مشترك' || name.indexOf('ليزر') !== -1 || name.indexOf('اكريلك') !== -1 || name.indexOf('خشب') !== -1 || name.indexOf('دابل') !== -1;
      const isRaw = !k || k === 'raw' || k.indexOf('raw') !== -1 || k.indexOf('خامة') !== -1;
      return isLaserDept && isRaw && hasSize;
    });
  }

  function patch22TemplateGross(r) {
    const m = matByName(r.materialName || r['اسم الخامة'] || '');
    const cost = materialCost(m || {}) + num(r.inkCost || 0) + num(r.fixedCost || 0);
    const sale = num(r.salePrice || r['سعر بيع رسمي'] || 0);
    return patch22GrossProfit(cost, sale);
  }

  materialsTable = function () {
    const rows = (st.data.materials || []).filter(r => String(r.active || r['مفعل'] || 'نعم') !== 'لا');
    return `<div class="card"><div class="sectionHead"><h3>الخامات والأصناف المحفوظة</h3>${isFull()?'<button class="btn secondary smallBtn" onclick="ES.recalcMaterials()">تحديث كل الأسعار المرتبطة</button>':''}</div><div class="hint small">تعديل يفتح الخامة أو الصنف بنفس بياناته. إيقاف يخفيه من اختيارات الموظفين مع الحفاظ على التقارير القديمة.</div><div class="tablewrap"><table><thead><tr><th>القسم</th><th>الاسم</th><th>النوع</th><th>رصيد</th><th>${canSeeCosts()?'تكلفة':''}</th><th>بيع</th><th>${canSeeCosts()?'مجمل الربح':''}</th><th>${canSeeCosts()?'نسبة الربح':''}</th><th>أبعاد</th><th>${isFull()?'إجراء':''}</th></tr></thead><tbody>${rows.map((r,i)=>{const originalIndex=(st.data.materials||[]).indexOf(r); const cost=materialCost(r); const sale=materialSale(r); const gp=patch22GrossProfit(cost,sale); return `<tr><td>${esc(r.department)}</td><td>${esc(materialName(r))}</td><td>${esc(r.materialKind)}</td><td>${esc(r.stockQty||'')}</td><td>${canSeeCosts()?money(cost):''}</td><td>${money(sale)}</td><td>${canSeeCosts()?money(gp.profit):''}</td><td>${canSeeCosts()?gp.margin.toFixed(1)+'%':''}</td><td>${esc((r.width||'')+'×'+(r.height||''))}</td><td>${isFull()?`<button class="mini" onclick="ES.editMaterial(${originalIndex})">تعديل</button> <button class="mini dangerMini" onclick="ES.archiveMaterial(${originalIndex})">إيقاف</button>`:''}</td></tr>`}).join('')||'<tr><td colspan="10">لا توجد خامات.</td></tr>'}</tbody></table></div></div>`;
  };

  screenRecipe = function () {
    if(!isFull())return '<div class="card"><div class="msg bad">إنشاء الأصناف بمكونات عند ضياء فقط.</div></div>';
    return `<div class="card"><h2>صنف / خامة بمكونات</h2><div class="hint small">AI يحسب الناتج من الرول/الشيت، ويمكنك تعديل الناتج يدويًا لحساب الهالك الفعلي. مجمل الربح يظهر بعد إضافة المكونات.</div><input id="recId" type="hidden"><div class="grid four"><div class="field"><label>القسم</label><select id="recDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الصنف المحفوظ</label><input id="recName" placeholder="قطعة لامينشن 15×21"></div><div class="field"><label>مقاس الناتج</label><input id="recSize" placeholder="15x21" oninput="ES.aiPreviewComp()"></div><div class="field"><label>سعر بيع رسمي</label><input id="recSale" type="number" oninput="ES.calcRecipe()"></div></div><div class="grid four"><div class="field"><label>هالك % احتياطي</label><input id="recWaste" type="number" value="5" oninput="ES.aiPreviewComp()"></div><div class="field"><label>تكلفة محسوبة</label><input id="recCost" readonly></div><div class="field"><label>مجمل الربح</label><input id="recProfit" readonly></div><div class="field"><label>نسبة الربح %</label><input id="recMargin" readonly></div></div><div class="grid four"><div class="field"><label>عدد الناتج AI</label><input id="recOutputCount" readonly></div><div class="field"><label>عدد الناتج اليدوي</label><input id="compManualPieces" type="number" placeholder="اختياري" oninput="ES.aiPreviewComp()"></div><div class="field"><label>هالك محسوب</label><input id="compWastePieces" readonly></div><div class="field"><label>استهلاك الأصل للوحدة</label><input id="recUnitCons" readonly></div></div><hr><h3>إضافة مكون للصنف</h3><div class="grid four"><div class="field"><label>اختار خامة / صنف سابق</label><select id="compMat" onchange="ES.aiPreviewComp()"><option></option>${materialOptions()}</select></div><div class="field"><label>كمية المكون للوحدة</label><input id="compQty" type="number" value="1" oninput="ES.aiPreviewComp()"></div><div class="field"><label>تكلفة المكون</label><input id="compCost" readonly></div><div class="field"><label>الناتج المعتمد</label><input id="compPieces" readonly></div></div><div class="actions"><button class="btn secondary" onclick="ES.aiPreviewComp()">احسب AI للمكون</button><button class="btn" onclick="ES.addComp()">إضافة المكون</button><button class="btn danger" onclick="ES.clearComps()">تفريغ المكونات</button></div><div id="compMsg"></div><div id="compList"></div><div class="actions"><button class="btn secondary" onclick="ES.calcRecipe()">احسب تكلفة الصنف</button><button class="btn" onclick="ES.saveRecipe()">حفظ / تحديث الصنف</button><button class="btn secondary" onclick="ES.recalcMaterials()">تحديث أسعار كل البنود المرتبطة</button><button class="btn secondary" onclick="ES.clearRecipeForm()">صنف جديد</button></div><div id="recMsg"></div></div>${materialsTable()}`;
  };

  compListHtml = function () {
    return `<div class="card"><h3>مكونات الصنف الحالي</h3>${st.recipeComps.length?'<div class="tablewrap"><table><thead><tr><th>المكون</th><th>الاستهلاك للوحدة</th><th>تكلفة</th><th>طريقة الحساب</th><th></th></tr></thead><tbody>'+st.recipeComps.map((c,i)=>`<tr><td>${esc(c.materialName)}</td><td>${c.qty}</td><td>${money(c.cost)}</td><td>${esc(c.method||'يدوي')}</td><td><button class="btn small danger" onclick="ES.removeComp(${i})">حذف</button></td></tr>`).join('')+'</tbody></table></div>':'<div class="muted">لا توجد مكونات بعد.</div>'}</div>`;
  };

  laserAIBox = function () {
    const opts = patch22LaserMaterials().map(function(r){ return `<option value="${esc(materialName(r))}">${esc(materialName(r))} - ${esc(r.width||'')}×${esc(r.height||'')}</option>`; }).join('');
    return `<div class="card laser-ai-box"><h3>🤖 حاسبة جابر AI من خامات الليزر المسجلة في EasyStore</h3><div class="hint small">جابر يختار خامة الليزر فقط. التكلفة الداخلية مخفية، والسعر المقترح يتحسب من بيانات ضياء في مطبخ الحسابات.</div><div class="grid four"><div class="field"><label>خامة الليزر</label><select id="aiLaserMaterial" onchange="ES.aiLaser()"><option></option>${opts}</select></div><div class="field"><label>عرض الشغل سم</label><input id="aiW" type="number" oninput="ES.aiLaser()"></div><div class="field"><label>ارتفاع الشغل سم</label><input id="aiH" type="number" oninput="ES.aiLaser()"></div><div class="field"><label>الكمية</label><input id="aiQty" type="number" value="1" oninput="ES.aiLaser()"></div></div><div class="grid four"><div class="field"><label>هالك %</label><input id="aiWaste" type="number" value="10" oninput="ES.aiLaser()"></div><div class="field"><label>تشغيل للقطعة</label><input id="aiLabor" type="number" value="0" oninput="ES.aiLaser()"></div><div class="field"><label>معامل البيع</label><input id="aiFactor" type="number" value="2.2" step="0.1" oninput="ES.aiLaser()"></div><div class="field"><label>اسم البند</label><input id="aiItemName" placeholder="مثلاً ليزر خشب 20×30"></div></div><div class="actions"><button class="btn secondary" onclick="ES.aiLaser()">احسب من خامات الليزر</button><button class="btn" onclick="ES.applyLaserAIToInvoice()">تطبيق على الفاتورة</button><span id="aiMsg" class="pill"></span></div></div>`;
  };

  const oldCalcRecipePatch22 = window.ES.calcRecipe;
  window.ES.calcRecipe = function () {
    const total = st.recipeComps.reduce((s,c)=>s+num(c.cost),0);
    set('recCost', total.toFixed(2));
    const sale = num(val('recSale'));
    const gp = patch22GrossProfit(total, sale);
    set('recProfit', gp.profit.toFixed(2));
    set('recMargin', gp.margin.toFixed(1));
    return total;
  };

  window.ES.aiPreviewComp = function () {
    const m = matByName(val('compMat'));
    if(!m) return;
    const sp = sizeParts(val('recSize'));
    let qty = num(val('compQty')) || 1;
    let pieces = 0, adopted = 0, cost = 0, method = 'يدوي';
    if(num(m.width)&&num(m.height)&&sp.w&&sp.h){
      const c = calcCut(m.width,m.height,sp.w,sp.h,0);
      pieces = c.pieces;
      const manual = num(val('compManualPieces'));
      adopted = manual > 0 ? manual : Math.floor(pieces / (1 + num(val('recWaste'))/100));
      if(!adopted && pieces) adopted = pieces;
      if(adopted){
        qty = 1 / adopted;
        const wastePieces = Math.max(0, pieces - adopted);
        cost = materialCost(m) * qty;
        method = 'AI: '+pieces+' قطعة / معتمد: '+adopted+' / هالك: '+wastePieces;
        set('compQty', qty.toFixed(6));
        set('compPieces', adopted);
        set('compCost', cost.toFixed(4));
        set('recOutputCount', pieces);
        set('compWastePieces', wastePieces);
        set('recUnitCons', qty.toFixed(6));
        msg('compMsg','AI حسب '+pieces+' قطعة. المعتمد '+adopted+' قطعة، والهالك '+wastePieces+'.');
        return;
      }
    }
    cost = materialCost(m) * qty;
    set('compCost', cost.toFixed(4));
    set('compPieces','');
    set('compWastePieces','');
    msg('compMsg','حساب يدوي للمكون.');
  };

  window.ES.addComp = function () {
    const name = val('compMat');
    if(!name) return msg('compMsg','اختار المكون أولاً.',true);
    const m = matByName(name);
    const qty = num(val('compQty')) || 1;
    const cost = num(val('compCost')) || (m ? materialCost(m)*qty : 0);
    const method = val('compPieces') ? ('AI/يدوي - ناتج معتمد '+val('compPieces')+(val('compWastePieces') ? ' - هالك '+val('compWastePieces') : '')) : 'يدوي';
    st.recipeComps.push({materialName:name,qty:+qty.toFixed(6),cost:+cost.toFixed(4),method});
    updateCompList();
    this.calcRecipe();
  };

  window.ES.clearRecipeForm = function () {
    ['recId','recName','recSize','recSale','recCost','recOutputCount','recUnitCons','compManualPieces','compWastePieces','recProfit','recMargin'].forEach(id=>set(id,''));
    set('recWaste','5'); setSelectValue('recDept','طباعة'); st.recipeComps=[]; updateCompList(); msg('recMsg','صنف جديد جاهز.');
  };

  window.ES.aiLaser = function () {
    const m = matByName(val('aiLaserMaterial'));
    const w = num(val('aiW')), h = num(val('aiH')), q = num(val('aiQty')) || 1;
    if(!m || !w || !h){ if($('aiMsg')) $('aiMsg').textContent='اختار الخامة واكتب المقاس.'; return; }
    const c = calcCut(m.width, m.height, w, h, 0);
    const waste = num(val('aiWaste')) || 0;
    const adopted = c.pieces ? Math.max(1, Math.floor(c.pieces / (1 + waste/100))) : 0;
    const consumption = adopted ? 1/adopted : 0;
    const hiddenCost = materialCost(m) * consumption;
    const suggested = (hiddenCost * (num(val('aiFactor')) || 2.2)) + num(val('aiLabor'));
    const total = suggested * q;
    const itemName = val('aiItemName') || ('ليزر '+materialName(m)+' '+w+'×'+h);
    set('dlMat', materialName(m));
    set('dlItem', itemName);
    set('dlQty', q);
    set('dlSystemSale', suggested.toFixed(2));
    set('dlSale', suggested.toFixed(2));
    if($('aiMsg')) $('aiMsg').textContent='الناتج من اللوح: '+c.pieces+' / المعتمد بعد الهالك: '+adopted+' / سعر مقترح: '+money(suggested);
    this.calcDept();
  };

  window.ES.applyLaserAIToInvoice = function () {
    this.aiLaser();
    const item = val('aiItemName') || val('dlItem');
    if(item) set('dlItem', item);
    msg('deptMsg','تم تطبيق حاسبة جابر على الفاتورة. يمكن تعديل سعر القطعة هنا فقط، والفرق يذهب للهوالك.');
  };


  // Batch 24 - EasyStore full screens + delete/archive + purchase/sales
  window.EASYSTORE_MATBAGY_VERSION = "V7 Batch25 - Full Accounting Core";
  window.ES.savePurchase = async function(){
    const qty=num(val('purQty')), unit=num(val('purUnit'));
    const rec={no:val('purNo')||('PUR-'+Date.now()), supplier:val('purSupplier'), material:val('purMat'), qty, unit, total:qty*unit, notes:val('purNotes')};
    const arr=es24LocalList('ES24_PURCHASES'); arr.unshift(rec); es24SaveLocal('ES24_PURCHASES',arr);
    try{ const r=await api('saveEasyStorePurchase',{invoiceNo:rec.no,supplier:rec.supplier,materialName:rec.material,qty:rec.qty,unitPrice:rec.unit,notes:rec.notes}); msg('purMsg',r.message,!r.success); }catch(e){ msg('purMsg','تم الحفظ محليًا مؤقتًا: '+e.message,true); }
    renderScreen();
  };
  window.ES.saveSale = async function(){
    const t=templateByIndex(val('salItem')); const qty=num(val('salQty')), unit=num(val('salUnit')) || num(t&&t.salePrice);
    const rec={no:val('salNo')||('SAL-'+Date.now()), customer:val('salCustomer'), item:t?templateName(t):val('salItem'), qty, unit, total:qty*unit, notes:val('salNotes')};
    const arr=es24LocalList('ES24_SALES'); arr.unshift(rec); es24SaveLocal('ES24_SALES',arr);
    try{ const r=await api('saveEasyStoreSale',{invoiceNo:rec.no,customer:rec.customer,itemName:rec.item,qty:rec.qty,unitPrice:rec.unit,notes:rec.notes}); msg('salMsg',r.message,!r.success); }catch(e){ msg('salMsg','تم الحفظ محليًا مؤقتًا: '+e.message,true); }
    renderScreen();
  };
  window.ES.archiveMaterial = async function(i){
    const r=(st.data.materials||[])[num(i)]; if(!r)return;
    if(!confirm('إيقاف/إخفاء '+materialName(r)+' من اختيارات الموظفين؟\nسيظل محفوظًا للتقارير والفواتير القديمة.'))return;
    try{ const res=await api('archiveAccountingMaterial',{materialId:r.id||r.ID,materialName:materialName(r),department:r.department||''}); msg('mainMsg',res.message,!res.success); await refresh(); }
    catch(e){ r.active='لا'; r['مفعل']='لا'; localSave(); msg('mainMsg','تم الإيقاف محليًا مؤقتًا: '+e.message,true); renderScreen(); }
  };


  render(); refresh();
})();


/*********************** EasyStore Patch 23 - Button Safety Layer ***********************/
(function(){
  window.EASYSTORE_MATBAGY_VERSION = "V7 Batch25 - Full Accounting Core";

  function call(fn, args) {
    try {
      if (window.ES && typeof window.ES[fn] === 'function') return window.ES[fn].apply(window.ES, args || []);
    } catch (e) {
      alert((e && e.message) || 'تعذر تنفيذ الأمر.');
    }
  }
  function txt(el){ return (el && el.textContent || '').replace(/\s+/g,' ').trim(); }
  function note(t, bad){
    var m = document.getElementById('mainMsg');
    if (!m) return;
    m.className = 'msg ' + (bad ? 'bad' : '');
    m.textContent = t || '';
  }
  function goByText(t) {
    if (/لوحة الحسابات/.test(t)) return call('go',['dashboard']);
    if (/الأصناف$/.test(t)) return call('go',['items']);
    if (/فواتير الشراء/.test(t)) return call('go',['purchase']);
    if (/فواتير المبيعات/.test(t)) return call('go',['sales']);
    if (/مطبخ الحسابات/.test(t)) return call('go',['kitchen']);
    if (/خامات أساسية/.test(t)) return call('go',['raw']);
    if (/أصناف بمكونات|صنف/.test(t)) return call('go',['recipe']);
    if (/بنود الفواتير/.test(t)) return call('go',['templates']);
    if (/المخزون/.test(t)) return call('go',['stock']);
    if (/تقارير/.test(t)) return call('go',['reports']);
    if (/فاتورة القسم/.test(t)) return call('go',['dept']);
    if (/هوالك/.test(t)) return call('go',['waste']);
    if (/تقفيل الفاتورة/.test(t)) return call('go',['final']);
  }
  document.addEventListener('click', function(ev){
    var b = ev.target && ev.target.closest && ev.target.closest('button');
    if (!b) return;
    var t = txt(b);
    if (!t) return;
    if (t === 'تحديث' || /تحديث$/.test(t)) { ev.preventDefault(); return call('refresh'); }
    if (t === 'إغلاق') { ev.preventDefault(); try{ window.close(); }catch(e){} if(!window.closed) history.back(); return; }
    if (/تجهيز الشيتات/.test(t)) { ev.preventDefault(); return call('initSheets'); }
    if (/تحديث كل الأسعار|تحديث أسعار|تحديث كل البنود/.test(t)) { ev.preventDefault(); return call('recalcMaterials'); }
    if (/احسب AI|احسب من خامات الليزر/.test(t)) { ev.preventDefault(); return call('aiLaser'); }
    if (/تطبيق على الفاتورة/.test(t)) { ev.preventDefault(); return call('applyLaserAIToInvoice'); }
    if (/احسب تكلفة الصنف/.test(t)) { ev.preventDefault(); return call('calcRecipe'); }
    if (/حفظ \/ تحديث الصنف/.test(t)) { ev.preventDefault(); return call('saveRecipe'); }
    if (/حفظ \/ تحديث الخامة/.test(t)) { ev.preventDefault(); return call('saveRaw'); }
    if (/حفظ البند للموظفين/.test(t)) { ev.preventDefault(); return call('saveTemplate'); }
    if (/حفظ فاتورة القسم/.test(t)) { ev.preventDefault(); return call('saveDeptLine'); }
    if (/تقفيل الفاتورة النهائية/.test(t)) { ev.preventDefault(); return call('saveFinal'); }
    if (/طباعة|PDF/.test(t) && /فاتورة/.test(document.body.textContent || '')) { try { return call('printInvoice'); } catch(e){} }
    goByText(t);
  }, true);

  setTimeout(function(){
    note('Batch 24 جاهز: EasyStore كامل + تحميل تلقائي + أصناف/شراء/مبيعات/مخزون/تقارير.', false);
  }, 1200);
})();


/*********************** Batch 25 - EasyStore Full Accounting Core Screens ***********************/
(function(){
  window.EASYSTORE_MATBAGY_VERSION = "V7 Batch25 - Full Accounting Core";
  const B25 = { data:{materials:[],templates:[],stockMoves:[],deptLines:[],finalInvoices:[],wasteLines:[],summary:{}}, suppliers:[], purchases:[], sales:[], customers:[], active:'dashboard' };
  const qs = new URLSearchParams(location.search);
  const user = { name: qs.get('name') || qs.get('username') || 'ضياء', username: qs.get('username') || qs.get('name') || 'ضياء', token: qs.get('token') || '' };
  const $ = id => document.getElementById(id);
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const num = v => { const n=parseFloat(String(v||'').replace(/[٬,]/g,'.')); return isNaN(n)?0:n; };
  const money = n => num(n).toLocaleString('ar-EG',{maximumFractionDigits:2})+' ج';
  const nkey = v => String(v||'').toLowerCase().replace(/[إأآا]/g,'ا').replace(/[ى]/g,'ي').replace(/[ةه]/g,'ه').trim();
  const val = id => $(id) ? $(id).value : '';
  const set = (id,v) => { if($(id)) $(id).value = v == null ? '' : v; };
  function msg(t,bad){ const m=$('mainMsg'); if(m){m.className='msg '+(bad?'bad':''); m.textContent=t||'';} }
  function api(action, data){ return new Promise((resolve,reject)=>{ const base=(window.TREND_API_URL||'').trim(); if(!base) return reject(new Error('رابط Web App غير مضبوط')); const cb='ES25_'+Date.now()+'_'+Math.random().toString(16).slice(2); window[cb]=r=>{cleanup(); resolve(r||{})}; const s=document.createElement('script'); const p=new URLSearchParams(Object.assign({action, callback:cb, username:user.username, name:user.name, token:user.token}, data||{})); s.src=base+'?'+p.toString(); s.onerror=()=>{cleanup(); reject(new Error('فشل الاتصال بالسيرفر'))}; function cleanup(){try{delete window[cb]}catch(e){} if(s.parentNode)s.parentNode.removeChild(s)} document.body.appendChild(s); setTimeout(()=>{if(window[cb]){cleanup(); reject(new Error('انتهت مهلة الاتصال'))}},20000); }); }
  function saveLocal(){ localStorage.setItem('ES25_SUPPLIERS', JSON.stringify(B25.suppliers)); localStorage.setItem('ES25_PURCHASES', JSON.stringify(B25.purchases)); localStorage.setItem('ES25_SALES', JSON.stringify(B25.sales)); }
  function loadLocal(){ try{B25.suppliers=JSON.parse(localStorage.getItem('ES25_SUPPLIERS')||'[]')}catch(e){} try{B25.purchases=JSON.parse(localStorage.getItem('ES25_PURCHASES')||'[]')}catch(e){} try{B25.sales=JSON.parse(localStorage.getItem('ES25_SALES')||'[]')}catch(e){} try{const d=JSON.parse(localStorage.getItem('EASYSTORE_MATBAGY_V3')||'{}'); if(d && typeof d==='object') B25.data=Object.assign(B25.data,d);}catch(e){} }
  function materialName(r){ return r.materialName || r['اسم الخامة'] || ''; }
  function itemName(r){ return r.itemName || r['اسم البند'] || materialName(r) || ''; }
  function materialCost(r){ return num(r.computedUnitCost || r.calculatedUnitCost || r.unitCost || r['تكلفة محسوبة'] || r['سعر الوحدة']); }
  function materialSale(r){ return num(r.salePrice || r['سعر بيع رسمي'] || r['سعر بيع مقترح']); }
  function templates(){ return (B25.data.templates||[]).filter(r => String(r.active||r['مفعل']||'نعم') !== 'لا'); }
  function materials(){ return (B25.data.materials||[]).filter(r => String(r.active||r['مفعل']||'نعم') !== 'لا'); }
  function matOptions(){ return materials().map(r=>`<option value="${esc(materialName(r))}">${esc(materialName(r))} - ${esc(r.department||'')}</option>`).join(''); }
  function itemOptions(){ return templates().map((r,i)=>`<option value="${i}">${esc(itemName(r))} - ${money(r.salePrice)}</option>`).join(''); }
  function supplierOptions(){ return B25.suppliers.map(s=>`<option value="${esc(s.name)}">${esc(s.name)}</option>`).join(''); }
  function customerOptions(){ return B25.customers.map(c=>`<option value="${esc(c.name||c.customerName||c.phone||'')}">${esc(c.name||c.customerName||'عميل')} ${esc(c.phone||'')}</option>`).join(''); }
  function totals(list, field){ return (list||[]).reduce((s,r)=>s+num(r[field]||r.total),0); }
  async function loadAll(){
    loadLocal(); msg('جاري تحديث EasyStore تلقائيًا...');
    try { if (window.ES && typeof window.ES.refresh==='function') await window.ES.refresh(); } catch(e){}
    loadLocal();
    try { const r=await api('getAccounting'); if(r.success){ B25.data=Object.assign(B25.data,{materials:r.materials||[],templates:r.templates||[],stockMoves:r.stockMoves||[],deptLines:r.deptLines||[],finalInvoices:r.finalInvoices||[],wasteLines:r.wasteLines||[],summary:r.summary||{}}); localStorage.setItem('EASYSTORE_MATBAGY_V3', JSON.stringify(B25.data)); }} catch(e){ msg('تنبيه: البيانات من النسخة المحلية - '+e.message,true); }
    try { const s=await api('getEasyStoreSuppliers'); if(s.success) B25.suppliers=s.suppliers||B25.suppliers; } catch(e){}
    try { const c=await api('searchCustomers',{q:''}); if(c.success) B25.customers=c.customers||c.rows||[]; } catch(e){}
    saveLocal(); render25(B25.active); msg('تم تحميل EasyStore Batch 25.');
  }
  function ensureExtraTabs(){
    const tabs=document.querySelector('.tabs'); if(!tabs || tabs.dataset.batch25) return; tabs.dataset.batch25='1';
    [['suppliers','الموردين'],['customers','العملاء'],['health','فحص النظام']].forEach(x=>{ const b=document.createElement('button'); b.className='tab'; b.textContent=x[1]; b.onclick=()=>render25(x[0]); tabs.insertBefore(b, tabs.firstChild); });
  }
  function shell(title, body){ return `<div class="es25-head"><h2>${title}</h2><div class="hint small">EasyStore V7 Batch25 - برنامج حسابات كامل: موردين، أصناف، شراء، مبيعات، مخزون، تقارير، ومطبخ حسابات.</div></div>${body}`; }
  function table(rows, headers, map){ return `<div class="tablewrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr>${map(r,i).map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${headers.length}">لا توجد بيانات.</td></tr>`}</tbody></table></div>`; }
  function screenDashboard(){ const sales=totals(B25.sales,'total'); const pur=totals(B25.purchases,'total'); const stock=materials().length; return shell('لوحة الحسابات',`<div class="grid four"><div class="kpi"><b>${money(sales)}</b><span>مبيعات محفوظة</span></div><div class="kpi"><b>${money(pur)}</b><span>مشتريات محفوظة</span></div><div class="kpi"><b>${stock}</b><span>خامات وأصناف</span></div><div class="kpi"><b>${B25.suppliers.length}</b><span>موردين</span></div></div><div class="grid four"><button class="btn" onclick="ES.go('suppliers')">إضافة مورد</button><button class="btn" onclick="ES.go('items')">إضافة صنف</button><button class="btn" onclick="ES.go('purchase')">فاتورة شراء</button><button class="btn" onclick="ES.go('sales')">فاتورة مبيعات</button></div>`); }
  function screenSuppliers(){ return shell('الموردين',`<div class="card"><h3>إضافة / تعديل مورد</h3><div class="grid four"><div class="field"><label>اسم المورد</label><input id="supName"></div><div class="field"><label>تليفون</label><input id="supPhone"></div><div class="field"><label>رصيد افتتاحي</label><input id="supOpening" type="number"></div><div class="field"><label>العنوان</label><input id="supAddress"></div></div><button class="btn" onclick="ES25.saveSupplier()">حفظ المورد</button><div id="supMsg"></div></div>${table(B25.suppliers,['المورد','تليفون','رصيد افتتاحي','مديونية تقديرية','إجراء'],(s,i)=>[esc(s.name),esc(s.phone),money(s.opening),money((B25.purchases||[]).filter(p=>p.supplier===s.name).reduce((a,p)=>a+num(p.remain),0)),`<button class="mini" onclick="ES25.editSupplier(${i})">تعديل</button>`])}`); }
  function screenCustomers(){ const rows=B25.customers||[]; return shell('العملاء',`<div class="card"><h3>عملاء TrendOS</h3><div class="hint small">العملاء هنا يتم سحبهم من شيت العملاء الأساسي في TrendOS لاختيارهم في فواتير البيع.</div><input id="custSearch" placeholder="بحث باسم العميل أو الهاتف" oninput="ES25.filterCustomers()"></div><div id="custTable">${customersTable(rows)}</div>`); }
  function customersTable(rows){ return table(rows.slice(0,80),['العميل','الهاتف','النوع','ملاحظات'],c=>[esc(c.name||c.customerName||''),esc(c.phone||c.mobile||''),esc(c.type||''),esc(c.notes||'')]); }
  function screenItems(){ return shell('الأصناف',`<div class="card"><h3>إضافة صنف يظهر في فواتير الموظفين</h3><div class="grid four"><div class="field"><label>القسم</label><select id="itDept"><option>طباعة</option><option>ليزر</option><option>مشترك</option></select></div><div class="field"><label>اسم الصنف</label><input id="itName"></div><div class="field"><label>التصنيف</label><input id="itCat"></div><div class="field"><label>المقاس</label><input id="itSize"></div></div><div class="grid four"><div class="field"><label>الخامة / الوصفة المرتبطة</label><select id="itMat"><option></option>${matOptions()}</select></div><div class="field"><label>سعر البيع الرسمي</label><input id="itSale" type="number"></div><div class="field"><label>تكلفة ثابتة</label><input id="itFixed" type="number" value="0"></div><div class="field"><label>حبر / تشغيل</label><input id="itInk" type="number" value="0"></div></div><button class="btn" onclick="ES25.saveItem()">حفظ الصنف</button><div id="itMsg"></div></div>${itemsTables()}`); }
  function itemsTables(){ const rows=templates(); return table(rows,['القسم','الصنف','المقاس','خامة مرتبطة','تكلفة','بيع','ربح','إجراء'],(r,i)=>{ const m=materials().find(x=>nkey(materialName(x))===nkey(r.materialName)); const cost=materialCost(m||{})+num(r.fixedCost)+num(r.inkCost); const sale=num(r.salePrice); return [esc(r.department),esc(itemName(r)),esc(r.size||''),esc(r.materialName||''),money(cost),money(sale),money(sale-cost),`<button class="mini" onclick="ES25.editItem(${i})">تعديل</button> <button class="mini dangerMini" onclick="ES25.archiveItem(${i})">إيقاف</button>`]; }); }
  function screenPurchase(){ return shell('فواتير الشراء',`<div class="card"><h3>فاتورة شراء</h3><div class="grid four"><div class="field"><label>رقم الفاتورة</label><input id="puNo" value="PUR-${Date.now().toString().slice(-6)}"></div><div class="field"><label>المورد</label><input list="supList" id="puSupplier"><datalist id="supList">${supplierOptions()}</datalist></div><div class="field"><label>نقدي / آجل</label><select id="puPay"><option>نقدي</option><option>آجل</option><option>جزئي</option></select></div><div class="field"><label>تاريخ الاستحقاق</label><input id="puDue" type="date"></div></div><div class="grid five"><div class="field"><label>الخامة / الصنف</label><select id="puMat"><option></option>${matOptions()}</select></div><div class="field"><label>الكمية</label><input id="puQty" type="number" value="1" oninput="ES25.calcPurchase()"></div><div class="field"><label>سعر الشراء</label><input id="puUnit" type="number" oninput="ES25.calcPurchase()"></div><div class="field"><label>مدفوع</label><input id="puPaid" type="number" value="0" oninput="ES25.calcPurchase()"></div><div class="field"><label>الإجمالي</label><input id="puTotal" readonly></div></div><div class="grid two"><div class="field"><label>المتبقي</label><input id="puRemain" readonly></div><div class="field"><label>ملاحظات</label><input id="puNotes"></div></div><button class="btn" onclick="ES25.savePurchase()">حفظ فاتورة الشراء وزيادة المخزون</button><div id="puMsg"></div></div>${table(B25.purchases,['رقم','المورد','الخامة','الكمية','الإجمالي','مدفوع','متبقي'],p=>[esc(p.no),esc(p.supplier),esc(p.material),esc(p.qty),money(p.total),money(p.paid),money(p.remain)])}`); }
  function screenSales(){ return shell('فواتير المبيعات',`<div class="card"><h3>فاتورة مبيعات</h3><div class="grid four"><div class="field"><label>رقم الفاتورة</label><input id="saNo" value="SAL-${Date.now().toString().slice(-6)}"></div><div class="field"><label>العميل</label><input list="custList" id="saCustomer"><datalist id="custList">${customerOptions()}</datalist></div><div class="field"><label>رقم الأوردر</label><input id="saOrder"></div><div class="field"><label>نقدي / آجل</label><select id="saPay"><option>نقدي</option><option>آجل</option><option>جزئي</option></select></div></div><div class="grid five"><div class="field"><label>الصنف</label><select id="saItem" onchange="ES25.applySaleItem()"><option></option>${itemOptions()}</select></div><div class="field"><label>الكمية</label><input id="saQty" type="number" value="1" oninput="ES25.calcSale()"></div><div class="field"><label>سعر البيع</label><input id="saUnit" type="number" oninput="ES25.calcSale()"></div><div class="field"><label>خصم</label><input id="saDiscount" type="number" value="0" oninput="ES25.calcSale()"></div><div class="field"><label>مدفوع</label><input id="saPaid" type="number" value="0" oninput="ES25.calcSale()"></div></div><div class="grid three"><div class="field"><label>الإجمالي</label><input id="saTotal" readonly></div><div class="field"><label>المتبقي</label><input id="saRemain" readonly></div><div class="field"><label>ملاحظات</label><input id="saNotes"></div></div><div class="actions"><button class="btn" onclick="ES25.saveSale()">حفظ فاتورة البيع وخصم المخزون</button><button class="btn secondary" onclick="ES25.printSale()">PDF / طباعة</button></div><div id="saMsg"></div></div>${table(B25.sales,['رقم','العميل','الصنف','الكمية','الإجمالي','مدفوع','متبقي'],s=>[esc(s.no),esc(s.customer),esc(s.item),esc(s.qty),money(s.total),money(s.paid),money(s.remain)])}`); }
  function screenStock(){ return shell('المخزون',`${table(materials(),['الخامة/الصنف','القسم','النوع','الرصيد','حد النقص','تكلفة','بيع'],r=>[esc(materialName(r)),esc(r.department),esc(r.materialKind),esc(r.stockQty||''),esc(r.minStock||''),money(materialCost(r)),money(materialSale(r))])}<h3>حركة المخزون</h3>${table(B25.data.stockMoves||[],['التاريخ','الخامة','داخل','خارج','الرصيد','المصدر'],r=>[esc(r.date||r['وقت التسجيل']||''),esc(r.materialName||r['الخامة']||''),esc(r.inQty||r['داخل']||''),esc(r.outQty||r['خارج']||''),esc(r.balance||r['الرصيد']||''),esc(r.source||r['المصدر']||'')])}`); }
  function screenReports(){ const sales=totals(B25.sales,'total'), purchases=totals(B25.purchases,'total'); return shell('التقارير',`<div class="grid four"><div class="kpi"><b>${money(sales)}</b><span>إجمالي مبيعات</span></div><div class="kpi"><b>${money(purchases)}</b><span>إجمالي مشتريات</span></div><div class="kpi"><b>${money(sales-purchases)}</b><span>صافي تقديري</span></div><div class="kpi"><b>${materials().filter(m=>num(m.stockQty)<=num(m.minStock)&&num(m.minStock)>0).length}</b><span>خامات تحت الحد</span></div></div>${table(materials().filter(m=>num(m.stockQty)<=num(m.minStock)&&num(m.minStock)>0),['خامة ناقصة','الرصيد','حد النقص','القسم'],m=>[esc(materialName(m)),esc(m.stockQty||''),esc(m.minStock||''),esc(m.department||'')])}`); }
  function screenHealth(){ return shell('فحص النظام',`<div class="card"><button class="btn" onclick="ES25.health()">فحص الآن</button><div id="healthBox" class="hint">اضغط فحص الآن للتحقق من الاتصال والبيانات.</div></div>`); }
  function render25(tab){ B25.active=tab||B25.active||'dashboard'; ensureExtraTabs(); const sc=$('screen'); if(!sc) return; const m={dashboard:screenDashboard,suppliers:screenSuppliers,customers:screenCustomers,items:screenItems,purchase:screenPurchase,sales:screenSales,stock:screenStock,reports:screenReports,health:screenHealth}; if(m[B25.active]){ sc.innerHTML=m[B25.active](); document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b.textContent.indexOf(tabLabel(B25.active))!==-1)); } }
  function tabLabel(t){ return ({dashboard:'لوحة',suppliers:'الموردين',customers:'العملاء',items:'الأصناف',purchase:'الشراء',sales:'المبيعات',stock:'المخزون',reports:'التقارير',health:'فحص'})[t]||''; }
  const oldGo = window.ES && window.ES.go;
  if(window.ES){ window.ES.go = function(tab){ if(['dashboard','suppliers','customers','items','purchase','sales','stock','reports','health'].includes(tab)) return render25(tab); return oldGo ? oldGo.call(window.ES, tab) : null; }; }
  window.ES25 = {
    render: render25, load: loadAll,
    saveSupplier: async function(){ const s={name:val('supName'),phone:val('supPhone'),opening:num(val('supOpening')),address:val('supAddress')}; if(!s.name) return; const i=B25.suppliers.findIndex(x=>nkey(x.name)===nkey(s.name)); if(i>=0) B25.suppliers[i]=s; else B25.suppliers.unshift(s); saveLocal(); try{await api('saveEasyStoreSupplier',s)}catch(e){} render25('suppliers'); },
    editSupplier:function(i){ const s=B25.suppliers[i]; if(!s)return; set('supName',s.name); set('supPhone',s.phone); set('supOpening',s.opening); set('supAddress',s.address); },
    filterCustomers:function(){ const q=nkey(val('custSearch')); const rows=(B25.customers||[]).filter(c=>nkey([c.name,c.customerName,c.phone,c.mobile].join(' ')).includes(q)); const box=$('custTable'); if(box) box.innerHTML=customersTable(rows); },
    saveItem:async function(){ const p={department:val('itDept'),category:val('itCat'),itemName:val('itName'),size:val('itSize'),materialName:val('itMat'),salePrice:val('itSale'),fixedCost:val('itFixed'),inkCost:val('itInk'),active:'نعم'}; if(!p.itemName) return; B25.data.templates.unshift(p); localStorage.setItem('EASYSTORE_MATBAGY_V3',JSON.stringify(B25.data)); try{await api('saveAccountingTemplate',p)}catch(e){} render25('items'); },
    editItem:function(i){ const r=templates()[i]; if(!r)return; set('itDept',r.department); set('itName',itemName(r)); set('itCat',r.category); set('itSize',r.size); set('itMat',r.materialName); set('itSale',r.salePrice); set('itFixed',r.fixedCost); set('itInk',r.inkCost); },
    archiveItem:async function(i){ const r=templates()[i]; if(!r || !confirm('إيقاف الصنف '+itemName(r)+'؟')) return; r.active='لا'; localStorage.setItem('EASYSTORE_MATBAGY_V3',JSON.stringify(B25.data)); try{await api('archiveAccountingTemplate',{itemName:itemName(r),department:r.department})}catch(e){} render25('items'); },
    calcPurchase:function(){ const total=num(val('puQty'))*num(val('puUnit')); set('puTotal',total.toFixed(2)); set('puRemain',Math.max(0,total-num(val('puPaid'))).toFixed(2)); },
    savePurchase:async function(){ this.calcPurchase(); const p={no:val('puNo'),supplier:val('puSupplier'),paymentType:val('puPay'),dueDate:val('puDue'),material:val('puMat'),qty:num(val('puQty')),unit:num(val('puUnit')),paid:num(val('puPaid')),total:num(val('puTotal')),remain:num(val('puRemain')),notes:val('puNotes')}; B25.purchases.unshift(p); saveLocal(); try{await api('saveEasyStorePurchaseV2',p)}catch(e){try{await api('saveEasyStorePurchase',{invoiceNo:p.no,supplier:p.supplier,materialName:p.material,qty:p.qty,unitPrice:p.unit,notes:p.notes})}catch(x){}} render25('purchase'); },
    applySaleItem:function(){ const r=templates()[num(val('saItem'))]; if(r){set('saUnit',num(r.salePrice).toFixed(2)); this.calcSale();} },
    calcSale:function(){ const total=Math.max(0,num(val('saQty'))*num(val('saUnit'))-num(val('saDiscount'))); set('saTotal',total.toFixed(2)); set('saRemain',Math.max(0,total-num(val('saPaid'))).toFixed(2)); },
    saveSale:async function(){ this.calcSale(); const r=templates()[num(val('saItem'))]; const p={no:val('saNo'),customer:val('saCustomer'),orderId:val('saOrder'),paymentType:val('saPay'),item:r?itemName(r):val('saItem'),qty:num(val('saQty')),unit:num(val('saUnit')),discount:num(val('saDiscount')),paid:num(val('saPaid')),total:num(val('saTotal')),remain:num(val('saRemain')),notes:val('saNotes')}; B25.sales.unshift(p); saveLocal(); try{await api('saveEasyStoreSaleV2',p)}catch(e){try{await api('saveEasyStoreSale',{invoiceNo:p.no,customer:p.customer,itemName:p.item,qty:p.qty,unitPrice:p.unit,notes:p.notes})}catch(x){}} render25('sales'); },
    printSale:function(){ const w=window.open('','_blank'); w.document.write('<html dir="rtl"><head><title>فاتورة بيع</title><style>body{font-family:Tahoma;padding:30px}.box{max-width:700px;margin:auto;border:1px solid #ccc;padding:25px}</style></head><body><div class="box"><h1>فاتورة مطبعجي</h1><p>العميل: '+esc(val('saCustomer'))+'</p><p>الإجمالي: '+esc(val('saTotal'))+'</p><p>المدفوع: '+esc(val('saPaid'))+'</p><p>المتبقي: '+esc(val('saRemain'))+'</p></div><script>print()<\/script></body></html>'); },
    health:async function(){ const h=$('healthBox'); h.innerHTML='جاري الفحص...'; try{ const r=await api('getAccounting'); h.innerHTML=r.success?'✅ الاتصال سليم / الشيتات موجودة / البيانات قابلة للتحميل':'⚠️ اتصال موجود لكن الرد غير ناجح: '+esc(r.message); }catch(e){h.innerHTML='❌ فشل الاتصال: '+esc(e.message);} }
  };
  setTimeout(function(){ ensureExtraTabs(); loadAll(); }, 900);
  setInterval(ensureExtraTabs, 3000);
})();
