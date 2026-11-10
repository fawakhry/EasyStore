# Resource startup failure identified; targeted fix passed (2026-11-10)

The user startup log reached EnableVisualStyles and then failed while constructing the first form: string-reader type initialization threw NullReferenceException because GetManifestResourceStream("Easy Store V4.2$") returned null.

Original metadata contains a <Module>..cctor calling the resource resolver bootstrap; recovered C# had no module initializer. The embedded Easy Store V4.2& bytes were intact. Restored the original bootstrap call in diagnostic Main before the original entry point. The unpacker now reads DeflateStream until EOF instead of assuming full reads. No DES/format/license branch was removed.

Cold targeted smoke test on .NET 8 host, invoking the actual new bootstrap helper from EXE: resource missing before initialization, available after; packed resource assembly loads; a known UI string decodes to 144 characters. This is not a Windows/.NET 3.5 UI/runtime test.

ComponentResourceManager source adaptation restores original simple type resource names after identifier normalization. All 312 constructor sites / 306 types map to actual packed resources. Full UI resource deserialization is not tested.

Compilation: zero errors. Post-build: 19 RVA fields byte-verified; original embedded resource matches. Database and Trend integration untouched. Windows test pending.

Artifact: EasyStore_Resource_Startup_Fix_20261110.tar.gz (24,351,110 bytes). SHA-256: 00592f8e1bfa650f1e375af22b7a4260a577a3e2b717d567d70bdac265d63459. Contains 321 verified files, including 313 changed C# source files, diagnostic EXE and smoke/coverage evidence. Apply to the existing isolated runtime test folder, retain dependencies, run Run_EasyStore_Diagnostic.cmd and inspect the next startup log if necessary.

Original startup crash evidence is now understood; successful full Windows startup is not yet established. Public branch remains documentation/our generic utilities only; original application source remains privately delivered.


## Windows startup confirmed to registration screen
The user supplied a screenshot after the resource fix showing the Arabic registration UI, with no startup-crash dialog. This verifies that startup progressed past the previous string-resource initialization failure to registration on the user's Windows machine. Original license validation remains intact. No activation key was supplied/tested in the evidence. SQL attachment, authenticated screens, accounting functions and Trend import remain unverified. Device identifier is not copied into this public documentation.


## 10 نوفمبر 2026 — إلغاء طلب مفتاح التفعيل من نسخة التجربة
بناءً على توجيه المالك أزيل إنشاء مدير الترخيص وفحص الرقم المسلسل وفتح شاشة التسجيل/إعادة التشغيل من مسار بدء التشغيل. إعداد فئة النسخة محلي ولا يعتمد على مفتاح أو بصمة جهاز أو خادم تفعيل؛ لم تولّد مفاتيح ولم تعدّل إعدادات التفعيل المحفوظة. لا تزال مكونات التسجيل القديمة ضمن المصدر المسترجع ككود غير مستدعى من مسار التشغيل. هذا تعديل لسلوك التشغيل ولا يقرر منح ترخيص مفتوح المصدر للأصول أو المكتبات الأصلية.
نجح بناء المصدر مع إصلاح الموارد السابق بصفر أخطاء (47106 تحذيرات من المصدر المسترجع). تحقق IL من غياب مراجع التفعيل في شاشة البداية، وعدم وجود إنشاء لمكونات التفعيل من خارج مكوناتها القديمة، مع الاحتفاظ بإنشاء واجهة الدخول الأصلية. استعيدت وتحققت بيانات RVA الـ19 والمورد المضمن. نجح اختبار تحميل الموارد وفك نص معروف بطول 144 حرفًا تحت .NET8، وليس اختبار واجهة ويندوز.
ملف واجهة الدخول RecoveredType_0200020B.cs وإعداد runtime وملفات MDF/LDF مطابقة للحزمة السابقة. لم تفتح قاعدة البيانات ولم ينفذ ربط ترند أو استيراد عملاء/أوردرات. لم يعطّل تسجيل دخول المستخدمين أو كلمات مرورهم.
حزمة التحديث الخاصة: EasyStore_NoActivation_Update_20261110.zip؛ الحجم 24475939 بايت؛ SHA-256: b5a454a298b0e54ddf903dffa0133409787be478c3fe675c9e4ea185195d6857. تشمل EXE ومصادر التغييرات وإصلاحات الموارد السابقة وأدلة التحقق، 323 ملفًا. بصمة EXE: 63EAB67993FD740B6567A2339C7FD055AB36ED14B60A83E6AE55FA585564442F. الملف التنفيذي والمصدر المسترجع لم ينشرا في المستودع العام.
نقطة الاستكمال: وضع EXE داخل runtime لنسخة التجربة السابقة مع الاحتفاظ بالمكتبات والإعدادات، ثم تجربة ويندوز للتأكد من الانتقال لشاشة الدخول/إعداد الاتصال؛ بعد ذلك اختبار قاعدة منفصلة ودورة تشغيل فعلية. هذه التجميعة الجديدة لم تختبر على ويندوز حتى الآن، ولا يثبت نجاح البناء سلامة البيع أو التقارير أو الربط.
