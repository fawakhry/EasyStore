
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
  function tabs(){const list=[]; if(isFull())list.push(['kitchen','مطبخ الحسابات'],['raw','خامات أساسية'],['recipe','أصناف بمكونات'],['templates','بنود الفواتير'],['stock','المخزون'],['reports','تقارير']); else if(isPrint()||isLaser())list.push(['dept','فاتورة القسم'],['waste','هوالك القسم']); else if(isFinal())list.push(['final','تقفيل الفاتورة'],['deptView','أجزاء الأقسام']); else list.push(['dept','فاتورة القسم']); if(!st.active)st.active=list[0][0]; return '<div class="tabs">'+list.map(x=>`<button class="tab ${st.active===x[0]?'active':''}" onclick="ES.go('${x[0]}')">${x[1]}</button>`).join('')+'</div>'}
  function render(){app.innerHTML=`<div class="wrap"><div class="top"><div><h1>💰 إيزي ستور - مطبخ حسابات مطبعجي V4</h1><p>خامات أساسية ← أصناف بمكونات ← بنود تظهر في فواتير الموظفين ← خصم مخزون تلقائي.</p></div><div class="actions"><span class="badge">${esc(st.user.name)} / ${modeText()}</span><button class="btn secondary" onclick="ES.refresh()">تحديث</button><button class="btn secondary" onclick="window.close()">إغلاق</button></div></div><div id="mainMsg" class="msg"></div>${tabs()}<div id="screen"></div></div>`; renderScreen();}
  function renderScreen(){if(!$('screen'))return; const a=st.active; $('screen').innerHTML=a==='kitchen'?screenKitchen():a==='raw'?screenRaw():a==='recipe'?screenRecipe():a==='templates'?screenTemplates():a==='dept'?screenDept():a==='final'?screenFinal():a==='stock'?screenStock():a==='reports'?screenReports():a==='waste'?screenWaste():deptTable();}
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
  window.EASYSTORE_MATBAGY_VERSION = "V4 Patch22 - Manual Yield + Gaber Laser Materials";

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
    const rows = st.data.materials || [];
    return `<div class="card"><div class="sectionHead"><h3>الخامات والأصناف المحفوظة</h3>${isFull()?'<button class="btn secondary smallBtn" onclick="ES.recalcMaterials()">تحديث كل الأسعار المرتبطة</button>':''}</div><div class="hint small">زر تعديل يفتح الخامة أو الصنف بنفس بياناته. عند تغيير سعر/مقاس الخامة الأساسية يتم تحديث الأصناف المرتبطة بعد الحفظ والتحديث.</div><div class="tablewrap"><table><thead><tr><th>القسم</th><th>الاسم</th><th>النوع</th><th>رصيد</th><th>${canSeeCosts()?'تكلفة':''}</th><th>بيع</th><th>${canSeeCosts()?'مجمل الربح':''}</th><th>${canSeeCosts()?'نسبة الربح':''}</th><th>أبعاد</th><th>${isFull()?'إجراء':''}</th></tr></thead><tbody>${rows.map((r,i)=>{const cost=materialCost(r); const sale=materialSale(r); const gp=patch22GrossProfit(cost,sale); return `<tr><td>${esc(r.department)}</td><td>${esc(materialName(r))}</td><td>${esc(r.materialKind)}</td><td>${esc(r.stockQty||'')}</td><td>${canSeeCosts()?money(cost):''}</td><td>${money(sale)}</td><td>${canSeeCosts()?money(gp.profit):''}</td><td>${canSeeCosts()?gp.margin.toFixed(1)+'%':''}</td><td>${esc((r.width||'')+'×'+(r.height||''))}</td><td>${isFull()?`<button class="mini" onclick="ES.editMaterial(${i})">تعديل</button>`:''}</td></tr>`}).join('')||'<tr><td colspan="10">لا توجد خامات.</td></tr>'}</tbody></table></div></div>`;
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


  render(); refresh();
})();
