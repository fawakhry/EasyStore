# Current recovery status — 2026-11-10

## آخر حالة معتمدة — حصيلة هذا الشات، 10 نوفمبر 2026

هذا الملخص هو نقطة الاستكمال الحالية، ويقدّم على عبارات «التالي» القديمة في السجل أدناه. الفرع النشط لهذا العمل هو `opensource/no-activation` في `fawakhry/EasyStore`؛ فرع `recovery/easystore-4.2.2` يحتفظ بنقطة الاسترجاع السابقة، و`main` لم يُعدّل في هذا الشات. لا تبدأ مشروع حسابات جديدًا ولا تعِد التفكيك أو إصلاح الموارد المنجز.

### ما تحقق في الشات

1. روجع المستودع والكتاب وسجل التعديلات: عند بداية المراجعة كان فرعا recovery وopensource عند `1835bb0`، وكانت آخر نتيجة موثقة وصول النسخة المسترجعة إلى شاشة التسجيل. المصدر المسترجع الكامل والتجميعات سُلّمت في حزم خاصة؛ GitHub العام يحتوي التوثيق وأدوات الاسترجاع.
2. أكد المالك طلب إلغاء التراخيص والمفاتيح. نُفذ تعديل مسار البداية لإلغاء طلب المفتاح وشاشة التسجيل، مع إبقاء دخول مستخدمي البرنامج وإعدادات SQL. لم يُنشأ مفتاح بديل، ولم يُمنح ترخيص مفتوح المصدر للمكتبات أو الأصول الأصلية، ولم يُرفع المصدر المسترجع علنًا.
3. نجح بناء نسخة عدم طلب التفعيل بصفر أخطاء. فحص IL أثبت غياب إنشاء مكونات التفعيل من مسار البداية، وبقاء إنشاء واجهة الدخول/الاتصال الأصلية. استعيدت بيانات RVA الـ19 وتحققت بايتاتها والمورد المضمن. اختبار موارد موجّه على .NET8 حمّل المورد وفك نصًا معروفًا بطول 144 حرفًا.
4. صورة المالك `image(20261110-150418).png` أظهرت شاشة الاتصال بقاعدة البيانات بدل التسجيل: تأكد تجاوز التسجيل فعليًا على ويندوز لهذه النسخة، ولم يتأكد اتصال قاعدة البيانات أو الدخول إلى الوظائف.
5. بقيت قائمة Server فارغة. طُلب فحص services.msc، وقال المالك إن SQL Server غير موجود وإنه سيثبته. ثم أرسل `image(20261110-185227).png` وتظهر فيها جلسة SQL Management Studio Express متصلة بـ`SERVER-PC\SQLEXPRESS` بينما قائمة السيرفر داخل إيزي ستور فارغة. نجاح اتصال SSMS دليل منفصل عن اتصال إيزي ستور؛ لا يوجد دليل على حساب SQL/كلمة مرور معدّين للبرنامج.
6. جُرّب زر «تحميل» دون ظهور سيرفر. أظهرت `image(20261110-185948).png` خدمة SQL Server Browser موجودة، Startup type=Manual وحالتها Stopped. بعد توجيهه إلى Start قال المالك إنه ضغط Start وما زال البرنامج لا يحمل القائمة؛ لم تصل صورة تثبت Running أو رسالة خطأ للخدمة، لذلك لا نجزم بسبب فشل الاكتشاف.
7. روجع كود الاتصال: خانة Server كانت DropDownList، وتستخدم القراءة من SelectedItem؛ فلا يمكن تجاوز فشل الاكتشاف بكتابة الاسم يدويًا. نُفذ تعديل يجعلها قابلة للكتابة ويستخدم Text.Trim في الاتصال وحفظ اسم السيرفر، مع اختيار محلي مقترح `Environment.MachineName\SQLEXPRESS` والاحتفاظ بالاسم المكتوب أثناء إعادة تحميل القائمة وحماية الاختيار من القائمة الفارغة.
8. بُني تحديث الاتصال اليدوي بصفر أخطاء، مع 47106 تحذيرات من المصدر المسترجع. فحص IL تحقق من قابلية تحرير خانة السيرفر وعدم اشتراط SelectedItem وبقاء إلغاء طلب التفعيل وتهيئة الموارد. استعيدت بيانات RVA الـ19 وتحققت الموارد، ونجح اختبار النص ذي 144 حرفًا. لم يجر اختبار واجهة هذه التجميعة على ويندوز هنا.
9. سُلّمت الحزمة الجديدة مع تعليمات إغلاق البرنامج والاحتفاظ بملف EXE السابق خارج runtime ثم استبدال EXE فقط بجانب DLLs والإعدادات الحالية، وكتابة `SERVER-PC\SQLEXPRESS` دون الضغط على «تحميل». آخر رسالة من المالك هي طلب تحديث الكتاب؛ لم يرسل بعد نتيجة تجربة حزمة الاتصال اليدوي.

### الحزم الخاصة المسلّمة في هذا الشات

| الحزمة | الحجم بالبايت | SHA-256 |
| --- | ---: | --- |
| EasyStore_NoActivation_Update_20261110.zip | 24475939 | b5a454a298b0e54ddf903dffa0133409787be478c3fe675c9e4ea185195d6857 |
| EasyStore_Manual_Server_Update_20261110.zip | 24487071 | 45194a52253d5afa40b0e93b332ae5f1e5366dfdf5cb92439c4f20f510b7124f |

بصمة EXE الأحدث: `2FC789525C6B5ED944DA03FB101DE19190A00ED10D0A5C782EFDA68AEC1C1E2E`. حزمة الاتصال اليدوي تشمل تعديل عدم طلب التفعيل وإصلاحات الموارد السابقة ومصادر التغييرات وأدلة التحقق، لكنها تحديث لنسخة التجربة وليست مثبتًا كاملًا أو مثبت SQL.

### نقطة الاستكمال الملزمة

- البدء بتجربة **EasyStore_Manual_Server_Update_20261110.zip** على جهاز المالك، والتأكد من ظهور/إمكانية كتابة `SERVER-PC\SQLEXPRESS`.
- التحقق من طريقة دخول SQL المتاحة. البرنامج ما زال يستخدم مصادقة SQL؛ لا تفترض أن حساب `sa` مفعل أو أن كلمة مروره معروفة، ولا تخلط بين كلمة مرور SQL وكلمة مرور مستخدم البرنامج أو مفتاح التفعيل الملغى.
- بعد التحقق من حساب SQL، تجربة Connect وتسجيل نص أي خطأ فعلي، ثم ربط نسخة منفصلة من قاعدة البرنامج وتجربة الدخول. لا يوجد دليل حتى الآن على إرفاق MDF/LDF أو ظهور قاعدة البرنامج في قائمته.
- بعدها اختبار بيع وشراء وتحصل ومرتجع وتقارير وطباعة ببيانات اختبار قبل اعتماد التشغيل.
- لم تُنفّذ قاعدة البيانات هنا، ولم تُستورد أرصدة أو عملاء أو أوردرات، ولم يبدأ ربط ترند. لا توصف النسخة بأنها برنامج حسابات مختبر بالكامل أو جاهز للعمل الفعلي.
- تعليمات التفعيل بمفتاح صالح الواردة في نقاط التوقف القديمة أصبحت تاريخية بعد توجيه المالك وتعديل عدم طلب التفعيل.

---

## Historical resource-fix and recovery records

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


## 10 نوفمبر 2026 — تأكيد تجاوز التسجيل وإصلاح قائمة السيرفر الفارغة
أرسل المالك صورة نسخة عدم طلب التفعيل وهي تعرض شاشة اتصال قاعدة البيانات؛ هذا يؤكد تجاوز شاشة التسجيل على جهازه، ولا يثبت اتصال SQL أو نجاح الحسابات. ثُبّت SQL لاحقًا وظهرت جلسة SSMS متصلة بـSERVER-PC\SQLEXPRESS، لكن قائمة البرنامج بقيت فارغة بعد تشغيل خدمة SQL Server Browser.
عُدّلت خانة Server لتسمح بالكتابة المباشرة، واستبدلت قراءات SelectedItem في الاتصال وحفظ اسم السيرفر بقراءة النص المكتوب بعد Trim. أضيف اختيار محلي مقترح Environment.MachineName\SQLEXPRESS مع الحفاظ على النص المكتوب عند تفريغ/إعادة تحميل الاختيارات، وحماية اختيار أول عنصر من القائمة الفارغة. الاكتشاف لم يعد شرطًا للاتصال. لم تغيّر طريقة مصادقة SQL أو أسماء المستخدمين/كلمات المرور.
نجح البناء بصفر أخطاء (47106 تحذيرات) والتحقق من IL بأن خانة السيرفر قابلة للتحرير ولا تشترط SelectedItem، مع بقاء مسار عدم طلب التفعيل والانتقال إلى واجهة الاتصال. استعيدت وتحققت بيانات RVA الـ19 والموارد، ونجح اختبار فك النص بطول 144 حرفًا. لم تختبر واجهة هذه التجميعة على ويندوز هنا ولم تنفذ عملية SQL أو ربط ترند.
الحزمة الخاصة EasyStore_Manual_Server_Update_20261110.zip؛ الحجم 24487071 بايت؛ SHA-256: 45194a52253d5afa40b0e93b332ae5f1e5366dfdf5cb92439c4f20f510b7124f. بصمة EXE: 2FC789525C6B5ED944DA03FB101DE19190A00ED10D0A5C782EFDA68AEC1C1E2E. المصدر والتجميعة لم ينشرا على المستودع العام.
التالي: استبدال EXE في runtime لنسخة التجربة، كتابة SERVER-PC\SQLEXPRESS دون زر تحميل، وإدخال حساب SQL الموجود ثم Connect. إن لم يجهز حساب SQL بعد، فهذه خطوة إعداد مستقلة. ربط نسخة قاعدة معزولة واختبار الدخول والوظائف لم يثبتا بعد.
