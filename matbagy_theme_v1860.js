/* EasyStore theme controller - V1890 safe: no version rewriting */
(function(){
  'use strict';
  window.EASYSTORE_CACHE_KILLER_THEME_LOCK = true;
  window.EASYSTORE_VERSION = 'ES33 V1893 Version Sync Lock';
  window.EASYSTORE_MATBAGY_VERSION = 'ES33 V1893 Version Sync Lock';
  var KEY_THEME='matbagy_ui_theme_v1860';
  var KEY_MODE='matbagy_ui_mode_v1860';
  var THEMES=[['green','مطبعجي'],['blue','أزرق'],['gold','ذهبي'],['purple','بنفسجي'],['slate','رمادي']];
  function get(k,d){try{return localStorage.getItem(k)||d;}catch(e){return d;}}
  function set(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  function systemDark(){return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;}
  function apply(){
    var theme=get(KEY_THEME,'green');
    var mode=get(KEY_MODE,'light');
    var realMode=(mode==='auto')?(systemDark()?'dark':'light'):mode;
    document.documentElement.setAttribute('data-matbagy-theme',theme);
    document.documentElement.setAttribute('data-matbagy-mode',realMode);
    document.documentElement.setAttribute('data-matbagy-mode-choice',mode);
    document.querySelectorAll('[data-mt-theme-select]').forEach(function(s){s.value=theme;});
    document.querySelectorAll('[data-mt-mode]').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-mt-mode')===mode);});
  }
  function makeSwitcher(floating){
    var box=document.createElement('div');
    box.className='matbagy-theme-switcher'+(floating?' matbagy-theme-floating':'');
    box.setAttribute('data-matbagy-theme-ui','1');
    var options=THEMES.map(function(t){return '<option value="'+t[0]+'">'+t[1]+'</option>';}).join('');
    box.innerHTML='<label>🎨 شكل البرنامج</label><select data-mt-theme-select>'+options+'</select><button type="button" data-mt-mode="light">فاتح</button><button type="button" data-mt-mode="dark">داكن</button><button type="button" data-mt-mode="auto">تلقائي</button>';
    box.querySelector('select').addEventListener('change',function(){set(KEY_THEME,this.value);apply();});
    box.querySelectorAll('button[data-mt-mode]').forEach(function(btn){btn.addEventListener('click',function(){set(KEY_MODE,this.getAttribute('data-mt-mode'));apply();});});
    return box;
  }
  function mount(){
    if(document.querySelector('[data-matbagy-theme-ui]')){apply();return;}
    var target=document.querySelector('.top-actions')||document.querySelector('.topbar')||document.querySelector('.top')||document.querySelector('.menu')||null;
    if(target){target.appendChild(makeSwitcher(false));}
    else{document.body.appendChild(makeSwitcher(true));}
    apply();
  }
  function polishVersion(){ try{window.EASYSTORE_VERSION='ES33 V1893 Version Sync Lock';window.EASYSTORE_MATBAGY_VERSION='ES33 V1893 Version Sync Lock';}catch(e){} }
  function groupDangerButtons(){
    document.querySelectorAll('button,.btn,.es16-btn').forEach(function(b){
      var t=(b.textContent||'').trim();
      if(/حذف|مسح|تهيئة|إلغاء|الغاء/.test(t)) b.classList.add('danger-soft');
      if(/تفعيل|حفظ|تحديث|اعتماد|تقفيل/.test(t)) b.classList.add('action-positive');
      if(/واتساب|إرسال|ارسال/.test(t)) b.classList.add('action-whatsapp');
    });
  }
  document.addEventListener('DOMContentLoaded',function(){mount();polishVersion();groupDangerButtons();});
  setTimeout(function(){mount();polishVersion();groupDangerButtons();},400);
  setTimeout(function(){mount();polishVersion();groupDangerButtons();},1800);
  /* V1879: no repeated visual interval */
  if(window.matchMedia){try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply);}catch(e){}}
})();
