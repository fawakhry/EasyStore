EasyStore Matbagy V1

الهدف:
برنامج حسابات منفصل يفتح من TrendOS بدون يوزر وباسورد.

طريقة الرفع:
1) اعمل Repo جديد في GitHub باسم EasyStore.
2) ارفع الملفات داخل هذا الفولدر:
   index.html
   app.js
   styles.css
   config.js
3) من Settings > Pages: اختار Branch main و Root.
4) الرابط بعد الرفع:
   https://fawakhry.github.io/EasyStore/

TrendOS Patch 19 مضبوط على هذا الرابط في config.js:
window.MATBAGY_EASY_STORE_URL = "https://fawakhry.github.io/EasyStore/";

لو اسم الريبو مختلف، عدل هذا السطر داخل TrendOS.

مهم:
- EasyStore لا يحتوي شاشة Login.
- الدخول يأتي من TrendOS فقط عبر SSO Params.
- يستخدم نفس Apps Script الخاص بـ TrendOS لحفظ شيتات الحسابات.
- لازم ترفع GS الخاص بـ Patch 19 أو الأحدث وتعمل Deploy New Version.
