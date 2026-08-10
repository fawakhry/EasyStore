// V1880 clean package backend. Contains duplicate guard / zero reset fixes from V1877.
/************************************************************
 * TrendOS Operations - Google Apps Script Backend
 * نسخة كاملة موحدة V1851: أرقام أوردرات صغيرة بدون حروف + TrendOS + Matbagy Bridge + Pricing Fix:
 * 1) تسجيل الدخول
 * 2) عرض البنود في البرنامج
 * 3) إضافة الأوردر في شيت الأوردرات + بنود الأوردرات
 * 4) حفظ الحالة والملاحظات في الشيتين
 * 5) تربيط الحالة العامة وعدد البنود الجاهزة وغير الجاهزة
 * 6) مساعد واتساب لكل المستخدمين: رد حالة + رسالة انتهاء + تسجيل الإرسال
 * 7) رسالة تسجيل أوردر تلقائية بعد الإضافة + تاريخ تسليم متوقع
 * 8) إصلاح أرقام العملاء وحفظ الصفر في بداية الرقم
 * 9) قراءة معرفة واتس AI من عمود المفتاح + قوالب واتساب من الشيت
 * 10) متابعة كل قسم: شغل اليوم، المتأخر، تم التسليم اليوم، الجاهز، العاجل والعادي
 * 11) أرقام الأوردرات الجديدة أرقام قصيرة فقط بدون حروف لتسهيل كتابتها للعميل
 ************************************************************/

const SHEET_NAME_USERS = "المستخدمين";
const SHEET_NAME_LINES = "بنود الأوردرات";
const SHEET_NAME_ORDERS = "الأوردرات";
const SHEET_NAME_CUSTOMERS = "العملاء";
const SHEET_NAME_ACTIVITY = "سجل حركة الأوردرات";
const SHEET_NAME_AI_KNOWLEDGE = "معرفة واتس AI";
const SHEET_NAME_AI_SETTINGS = "إعدادات واتس AI";
const SHEET_NAME_AI_LOG = "سجل واتس AI";
const SHEET_NAME_AI_ORDERS_VIEW = "AI_Orders_View";
const SHEET_NAME_INVOICE_PRICING = "بنود تسعير الفاتورة";
const SHEET_NAME_ACC_MATERIALS = "حسابات - الخامات";
const SHEET_NAME_ACC_TEMPLATES = "حسابات - البنود الثابتة";
const SHEET_NAME_ACC_DEPT_LINES = "حسابات - فواتير الأقسام";
const SHEET_NAME_ACC_FINAL_INVOICES = "حسابات - الفواتير النهائية";
const SHEET_NAME_ACC_WASTE = "حسابات - هوالك الأقسام";
const SHEET_NAME_ACC_STOCK_MOVES = "حسابات - حركة المخزون";
const MATBAGY_ACCOUNTING_VERSION = "V1914_LEGACY_DEBT_RECONCILE";
const DEFAULT_PASSWORD = "";
function employeeDefaultPassword_() {
  try { return normalize_(PropertiesService.getScriptProperties().getProperty("EMPLOYEE_DEFAULT_PASSWORD")); } catch (err) { return ""; }
}
const SHEET_NAME_MARKET_VENDORS = "ماركت بليس - البائعين";
const SHEET_NAME_MARKET_PRODUCTS = "ماركت بليس - المنتجات";

// اتركه فاضي لو السكريبت مربوط بنفس الشيت.
// لو السكريبت Standalone اضبط TRENDOS_SPREADSHEET_ID داخل Script Properties ولا تضع المعرف في الكود العام.
const SPREADSHEET_ID = "";

function doGet(e) {
  e = e || { parameter: {} };

  const v1900Response = trendosV1900TryRoute_(e, null);
  if (v1900Response) return v1900Response;

  const v1898Response = trendosV1898TryRoute_(e, null);
  if (v1898Response) return v1898Response;

  const action = normalize_(e.parameter.action);
  const callback = normalize_(e.parameter.callback);

  let result;

  try {
    if (!action && cleanPhone_(e.parameter.phone || e.parameter.customerPhone || e.parameter.code)) {
      result = mbActivate_(e);
    } else if (!action) {
      result = {
        success: false,
        message: "Action غير معروف. افتح رابط البرنامج من GitHub Pages، ورابط Apps Script يستخدم كـ API فقط."
      };
    } else if (action === "activate" || action === "checkActivation" || action === "activation" || action === "activateClient" || action === "clientActivate" || action === "loginClient") result = mbActivate_(e);
    else if (action === "checkSession" || action === "clientSession") result = mbCheckSession_(e);
    else if (action === "createOrder" || action === "createMatbagyOrder" || action === "clientCreateOrder") result = mbCreateOrder_(e);
    else if (action === "getOrderStatus" || action === "orderStatus" || action === "clientOrderStatus") result = mbGetOrderStatus_(e);
    else if (action === "ping") result = healthCheck_();
    else if (action === "trendosV1903Ping") result = trendosV1903Ping_();
    else if (action === "health") result = healthCheck_();
    else if (action === "trendosV1900Ping" || action === "previewReadyPickupDelivery" || action === "deliverReadyPickupBulk") result = trendosV1900MainRouteObject_(e, null);
    else if (action === "login") result = login_(e);
    else if (action === "verifyEmployeeSession") result = verifyEmployeeSession_(e);
    else if (action === "customerLogin") result = customerLogin_(e);
    else if (action === "getCustomerOrders") result = getCustomerOrders_(e);
    else if (action === "createCustomerDraft") result = createCustomerDraft_(e);
    else if (action === "addCustomerDraftItem") result = addCustomerDraftItem_(e);
    else if (action === "submitCustomerDraft") result = submitCustomerDraft_(e);
    else if (action === "getOrderConversation") result = getOrderConversation_(e);
    else if (action === "sendOrderConversationMessage") result = sendOrderConversationMessage_(e);
    else if (action === "initOrderConversations") result = initOrderConversationsNow();
    else if (action === "initCustomerDrafts") result = initCustomerDraftsNow();
    else if (action === "createCustomerPortalOrder") result = createCustomerPortalOrder_(e);
    else if (action === "changeCustomerPassword") result = changeCustomerPassword_(e);
    else if (action === "initCustomerPortal") result = initCustomerPortalNow();
    else if (action === "getRows") result = getRows_(e);
    else if (action === "getUrgentNotifications") result = getUrgentNotifications_(e);
    else if (action === "getDashboard") result = getDashboard_(e);
    else if (action === "getPlatformSections") result = getPlatformSections_(e);
    else if (action === "initPlatformSections") result = initPlatformSectionsNow();
    else if (action === "getFranchiseBranches") result = getFranchiseBranches_(e);
    else if (action === "getServiceProviderRoutes") result = getServiceProviderRoutes_(e);
    else if (action === "getMarketplace") result = getMarketplace_(e);
    else if (action === "initMarketplace") result = initMarketplaceNow();
    else if (action === "initServiceProviderRoutes") result = initServiceProviderRoutesNow();
    else if (action === "getWhiteLabelSettings") result = getWhiteLabelSettings_(e);
    else if (action === "getLeadPhoneNumbers") result = getLeadPhoneNumbers_(e);
    else if (action === "initFranchiseBranches") result = initFranchiseBranchesNow();
    else if (action === "assignCustomerBranch") result = assignCustomerBranch_(e);
    else if (action === "getPlatformAds") result = getPlatformAds_(e);
    else if (action === "deletePlatformAd") result = deletePlatformAd_(e);
    else if (action === "initPlatformAds") result = initPlatformAdsNow();
    else if (action === "getActivityLog") result = getActivityLog_(e);
    else if (action === "initKnowledge" || action === "initAiKnowledge") result = initAiKnowledgeNow();
    else if (action === "getKnowledge") result = getKnowledge_(e);
    else if (action === "getAiKnowledge" || action === "getKnowledgePublic") result = getAiKnowledge_(e);
    else if (action === "rebuildAIOrdersView" || action === "refreshAIOrdersView" || action === "initAIOrdersView") result = rebuildAIOrdersView_(e);
    else if (action === "getAIOrdersView" || action === "getAiOrdersView") result = getAIOrdersView_(e);
    else if (action === "getAIOrderStatus" || action === "getAiOrderStatus" || action === "aiOrderStatus" || action === "getAIOrderReply" || action === "getAiOrderReply" || action === "aiOrderReply") result = getAIOrderStatusV1891_(e);
    else if (action === "getAiSettings") result = getAiSettings_(e);
    else if (action === "renderAiTemplate") result = renderAiTemplate_(e);
    else if (action === "saveKnowledge") result = saveKnowledge_(e);
    else if (action === "getKnowledgeContext") result = getKnowledgeContext_(e);
    else if (action === "updateLine") result = updateLine_(e);
    else if (action === "createInvoiceLine") result = createInvoiceLine_(e);
    else if (action === "initAccounting") result = initAccountingNow_(e);
    else if (action === "getAccounting") result = getAccounting_(e);
    else if (action === "calculateAccountingLaserQuoteV1913") result = calculateAccountingLaserQuoteV1913_(e);
    else if (action === "saveAccountingMaterial") result = saveAccountingMaterial_(e);
    else if (action === "archiveAccountingMaterial") result = archiveAccountingMaterial_(e);
    else if (action === "activateAccountingMaterial") result = activateAccountingMaterial_(e);
    else if (action === "saveEasyStorePurchase") result = saveEasyStorePurchase_(e);
    else if (action === "saveEasyStoreSale") result = saveEasyStoreSale_(e);

    else if (action === "getEasyStoreSuppliers") result = getEasyStoreSuppliers_(e);
    else if (action === "saveEasyStoreSupplier") result = saveEasyStoreSupplier_(e);
    else if (action === "saveEasyStorePurchaseV2") result = saveEasyStorePurchaseV2_(e);
    else if (action === "saveEasyStoreSaleV2") result = saveEasyStoreSaleV2_(e);
    else if (action === "archiveAccountingTemplate") result = archiveAccountingTemplate_(e);
    else if (action === "activateAccountingTemplate") result = activateAccountingTemplate_(e);
    else if (action === "easyStoreSystemHealth") result = easyStoreSystemHealth_(e);
    else if (action === "recalculateAccountingMaterials" || action === "recalcAccountingMaterialsCascade" || action === "recalculateAccountingMaterialsCascade") result = recalculateAccountingMaterials_(e);
    else if (action === "getMatbagyNotes") result = getMatbagyNotes_(e);
    else if (action === "saveMatbagyNote") result = saveMatbagyNote_(e);
    else if (action === "saveAccountingTemplate") result = saveAccountingTemplate_(e);
    else if (action === "saveAccountingDeptLine") result = saveAccountingDeptLine_(e);
    else if (action === "saveAccountingWaste") result = saveAccountingWaste_(e);
    else if (action === "approveAccountingDeptInvoice" || action === "approveDeptInvoiceV1887") result = approveAccountingDeptInvoiceV1887_(e);
    else if (action === "getDeptInvoiceDraftV1887") result = getDeptInvoiceDraftV1887_(e);
    else if (action === "saveAccountingFinalInvoice") result = saveAccountingFinalInvoice_(e);
    else if (action === "reopenAccountingFinalInvoice") result = reopenAccountingFinalInvoice_(e);
    else if (action === "markCustomerNotified") result = markCustomerNotified_(e);
    else if (action === "changePassword") result = changePassword_(e);
    else if (action === "createManualOrder") result = createManualOrder_(e);
    else if (action === "searchCustomers") result = searchCustomers_(e);
    else if (action === "getEasyStoreCustomers") result = getEasyStoreCustomers_(e);
    else if (action === "getPartyAccountV1858" || action === "getCustomerAccount" || action === "getSupplierAccount") result = getPartyAccountV1858_(e);
    else if (action === "savePartyLedgerTransaction" || action === "saveCustomerDebt" || action === "saveCustomerPayment" || action === "saveSupplierPayment") result = savePartyLedgerTransactionV1858_(e);
    else if (action === "getPartyLedgerV1858" || action === "getAccountsLedger") result = getAccountsLedgerV1858_(e);
    else if (action === "createCustomer") result = createCustomer_(e);
    else if (action === "ensureDemoCustomer") result = ensureDemoCustomer_(e);
    else if (action === "syncAll") result = runAdminMaintenance_(e, action, syncTrendOSNow);
    else if (action === "cleanStart") result = runAdminMaintenance_(e, action, cleanStartKeepCustomersNow);
    else if (action === "fixPhones") result = runAdminMaintenance_(e, action, fixPhoneColumnsNow);
    else if (action === "fillMissingPhones") result = runAdminMaintenance_(e, action, fillMissingOrderPhonesNow);
    else if (action === "fixDebtColumns") result = runAdminMaintenance_(e, action, fixDebtColumnsNow);
    else if (action === "debugCustomerDebt") result = runAdminMaintenance_(e, action, debugCustomerDebt_);
    else if (action === "reconcileLegacyCustomerDebtsV1914") result = runAdminMaintenance_(e, action, reconcileLegacyCustomerDebtsV1914_);

    else if (action === "getCustomerPortalAccountsV1859") result = getCustomerPortalAccountsV1859_(e);
    else if (action === "createInvoiceReviewMessageV1859" || action === "sendInvoiceReviewLink") result = createInvoiceReviewMessageV1859_(e);
    else if (action === "saveCashboxTransactionV1859") result = saveCashboxTransactionV1859_(e);
    else if (action === "getCashboxTransactionsV1859") result = getCashboxTransactionsV1859_(e);
    else if (action === "closeDayV1859") result = closeDayV1859_(e);
    else if (action === "getAuditLogV1859") result = getAuditLogV1859_(e);
    else if (action === "saveAuditLogV1859") result = saveAuditLogV1859_(e);
    else if (action === "resetAccountingToZeroV1861" || action === "resetAccountingToZeroV1877" || action === "zeroResetAccounting" || action === "factoryResetAccountingKeepCustomers") result = resetAccountingToZeroV1861_(e);
    else if (action === "backupAndClearAccountingMaterialsV1859" || action === "clearAccountingMaterials") result = backupAndClearAccountingMaterialsV1859_(e);
    else if (action === "activateAccountingItemV1859") result = activateAccountingItemV1859_(e);
    else if (action === "updateAccountingItemV1859") result = updateAccountingItemV1859_(e);
    else result = { success: false, message: "Action غير معروف." };
  } catch (err) {
    result = {
      success: false,
      message: "خطأ في السيرفر: " + (err && err.message ? err.message : err)
    };
  }

  return output_(result, callback);
}

function doPost(e) {
  e = e || { parameter: {}, postData: null };
  let payload = {};
  try {
    if (e.postData && e.postData.contents) payload = JSON.parse(e.postData.contents);
  } catch (err) {
    payload = {};
  }

  const v1900Response = trendosV1900TryRoute_(e, payload);
  if (v1900Response) return v1900Response;

  const v1898Response = trendosV1898TryRoute_(e, payload);
  if (v1898Response) return v1898Response;

  const action = normalize_(payload.action || (e.parameter && e.parameter.action));

  let result;
  try {
    if (action === "trendosV1900Ping" || action === "previewReadyPickupDelivery" || action === "deliverReadyPickupBulk") result = trendosV1900MainRouteObject_(e, payload);
    else if (action === "uploadCustomerDraftFile") result = uploadCustomerDraftFile_(payload);
    else if (action === "uploadOrderConversationFile") result = uploadOrderConversationFile_(payload);
    else if (action === "uploadPlatformAd") result = uploadPlatformAd_(payload);
    else if (action === "savePlatformSection") result = savePlatformSection_(payload);
    else if (action === "saveFranchiseBranch") result = saveFranchiseBranch_(payload);
    else if (action === "saveServiceProviderRoute") result = saveServiceProviderRoute_(payload);
    else if (action === "saveMarketplaceVendor") result = saveMarketplaceVendor_(payload);
    else if (action === "saveMarketplaceProduct") result = saveMarketplaceProduct_(payload);
    else if (action === "saveWhiteLabelSettings") result = saveWhiteLabelSettings_(payload);
    else result = { success: false, message: "Action POST غير معروف." };
  } catch (err) {
    result = { success: false, message: "خطأ في رفع الملفات: " + (err && err.message ? err.message : err) };
  }
  return output_(result, "");
}

function ss_() {
  let configuredSpreadsheetId = SPREADSHEET_ID;
  try { configuredSpreadsheetId = normalize_(PropertiesService.getScriptProperties().getProperty("TRENDOS_SPREADSHEET_ID")) || configuredSpreadsheetId; } catch (err) {}
  if (configuredSpreadsheetId) return SpreadsheetApp.openById(configuredSpreadsheetId);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("لا يمكن فتح الشيت. اربط السكريبت بالشيت أو اضبط TRENDOS_SPREADSHEET_ID في Script Properties.");
  return ss;
}

function output_(data, callback) {
  const json = JSON.stringify(data);
  callback = normalize_(callback);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]{0,100}$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function normalize_(v) {
  return String(v === null || v === undefined ? "" : v).trim();
}

function safeCustomerTypeForValidation_(value) {
  const raw = normalize_(value);
  if (!raw) return "خارجي";
  const key = raw.replace(/\s+/g, " ").trim();
  const allowed = ["جملة", "جملة VIP", "خارجي", "نوع العميل"];
  if (allowed.indexOf(key) !== -1) return key;
  const lower = key.toLowerCase();
  if (lower.indexOf("vip") !== -1) return "جملة VIP";
  if (key.indexOf("جمل") !== -1 || lower.indexOf("wholesale") !== -1) return "جملة";
  return "خارجي";
}

function normalizeKey_(v) {
  return normalize_(v).replace(/\s+/g, " ");
}

function searchKey_(v) {
  return normalize_(v)
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/[ى]/g, "ي")
    .replace(/[ؤ]/g, "و")
    .replace(/[ئ]/g, "ي")
    .replace(/[ةه]/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function headersMap_(sheet) {
  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  headers.forEach(function (h, i) {
    const key = normalizeKey_(h);
    if (key) map[key] = i + 1;
  });
  return map;
}

function firstCol_(h, names, fallback) {
  for (let i = 0; i < names.length; i++) {
    const name = normalizeKey_(names[i]);
    if (h[name]) return h[name];
  }
  return fallback || 0;
}

function ensureHeader_(sheet, headerName) {
  let h = headersMap_(sheet);
  if (!h[headerName]) {
    sheet.getRange(1, sheet.getLastColumn() + 1).setValue(headerName);
    SpreadsheetApp.flush();
    h = headersMap_(sheet);
  }
  return h[headerName];
}

function safeSet_(sheet, row, col, value) {
  if (sheet && row > 0 && col > 0) sheet.getRange(row, col).setValue(value);
}

function valueAt_(row, col) {
  if (!col) return "";
  return row[col - 1];
}

function isSheetErrorValue_(value) {
  const s = String(value == null ? "" : value).trim().toUpperCase();
  return s.indexOf("#ERROR") !== -1 ||
    s.indexOf("#VALUE") !== -1 ||
    s.indexOf("#REF") !== -1 ||
    s.indexOf("#N/A") !== -1 ||
    s.indexOf("#DIV/0") !== -1 ||
    s.indexOf("#NAME") !== -1 ||
    s.indexOf("#NUM") !== -1;
}

function cleanText_(value) {
  if (value instanceof Date) return value;
  if (isSheetErrorValue_(value)) return "";
  return normalize_(value);
}

function arabicDigitsToEnglish_(value) {
  const map = { "٠":"0", "١":"1", "٢":"2", "٣":"3", "٤":"4", "٥":"5", "٦":"6", "٧":"7", "٨":"8", "٩":"9" };
  return normalize_(value).replace(/[٠-٩]/g, function (d) { return map[d] || d; });
}

function isPhoneHeader_(key) {
  const k = normalizeKey_(key).toLowerCase();
  return k.indexOf("رقم العميل") !== -1 ||
    k.indexOf("رقم الهاتف") !== -1 ||
    k.indexOf("رقم إضاف") !== -1 ||
    k.indexOf("phone") !== -1;
}

function cleanPhone_(value) {
  let s = arabicDigitsToEnglish_(value);
  if (!s || isSheetErrorValue_(s)) return "";

  // نحفظ أرقام العملاء كأرقام فقط، ونرجع صفر الموبايل المصري لو Google Sheet شاله.
  let digits = s.replace(/[^0-9]/g, "");
  if (!digits) return "";

  // 00201xxxxxxxxx -> 01xxxxxxxxx
  if (digits.indexOf("0020") === 0 && digits.length >= 14) digits = "0" + digits.slice(4);
  // 201xxxxxxxxx -> 01xxxxxxxxx
  else if (digits.indexOf("20") === 0 && digits.length === 12) digits = "0" + digits.slice(2);
  // 1xxxxxxxxx -> 01xxxxxxxxx
  else if (digits.length === 10 && digits.charAt(0) === "1") digits = "0" + digits;

  return digits;
}

function phoneColumns_(sheet) {
  const h = headersMap_(sheet);
  const cols = [];
  Object.keys(h).forEach(function (key) {
    if (isPhoneHeader_(key)) cols.push(h[key]);
  });
  return cols.filter(function (c, i, arr) { return c && arr.indexOf(c) === i; });
}

function setPhoneColumnsAsText_(sheet, rowNumber) {
  if (!sheet) return;
  const cols = phoneColumns_(sheet);
  cols.forEach(function (col) {
    const row = rowNumber || 2;
    const numRows = rowNumber ? 1 : Math.max(1, sheet.getMaxRows() - 1);
    sheet.getRange(row, col, numRows, 1).setNumberFormat("@");
  });
}

function dateText_(value) {
  if (!value || isSheetErrorValue_(value)) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return formatDateAr_(value);
  }
  const s = normalize_(value);
  if (!s) return "";
  const d = new Date(s);
  if (!isNaN(d.getTime())) return formatDateAr_(d);
  return s;
}

function isReadyStatus_(status) {
  const s = normalize_(status);
  return s === "تم التنفيذ" || s === "جاهز للاستلام" || s === "تم التسليم";
}

function isHiddenFromUserScreens_(status) {
  const s = normalize_(status);
  return s === "جاهز للاستلام" || s === "تم التسليم" || s === "مكرر" || s === "تم التنفيذ" || s === "جاهز للطباعة" || s === "ملغى";
}

function isHeatPressFlag_(value) {
  const s = normalize_(value).toLowerCase();
  return s === "نعم" || s === "true" || s === "1" || s === "on" || s === "مكبس" || s === "yes";
}

function priorityRank_(priority) {
  const p = normalize_(priority) || "عادي";
  if (p === "عاجل" || p === "VIP") return 0;
  if (p === "عادي") return 1;
  if (p === "مؤجل") return 2;
  return 9;
}

function isStoppedStatus_(status) {
  const s = normalize_(status);
  return s === "متوقف";
}

function parseDateValue_(value) {
  if (!value || isSheetErrorValue_(value)) return null;
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) return new Date(value.getTime());
  const s0 = normalize_(value);
  if (!s0) return null;
  const m = s0.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s0);
  return isNaN(d.getTime()) ? null : d;
}

function startOfToday_() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isOverdueStatus_(status) {
  const s = normalize_(status);
  return !isHiddenFromUserScreens_(s) && !isReadyStatus_(s) && !isStoppedStatus_(s);
}

function isOverdueByExpected_(status, expectedDate) {
  if (!isOverdueStatus_(status)) return false;
  const d = parseDateValue_(expectedDate);
  if (!d) return false;
  d.setHours(0, 0, 0, 0);
  return d < startOfToday_();
}


function addDays_(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateAr_(date) {
  if (!date) return "";
  const tz = Session.getScriptTimeZone();
  return Utilities.formatDate(new Date(date), tz, "yyyy/MM/dd");
}

function expectedDeliveryDate_(createdAt) {
  // سياسة ترند مول: نستلم يوم، نشتغل اليوم التالي، والعميل يستلم اليوم الثالث.
  return addDays_(new Date(createdAt), 2);
}

function expectedDeliveryText_(createdAt) {
  return formatDateAr_(expectedDeliveryDate_(createdAt));
}

function healthCheck_() {
  const ss = ss_();
  const users = ss.getSheetByName(SHEET_NAME_USERS);
  const orders = ss.getSheetByName(SHEET_NAME_ORDERS);
  const lines = ss.getSheetByName(SHEET_NAME_LINES);

  return {
    success: true,
    spreadsheet: ss.getName(),
    hasUsers: !!users,
    hasOrders: !!orders,
    hasLines: !!lines,
    ordersRows: orders ? orders.getLastRow() : 0,
    linesRows: lines ? lines.getLastRow() : 0,
    sheets: ss.getSheets().map(function (s) { return s.getName(); })
  };
}

/*********************** المستخدمين والدخول ***********************/

function ensureUsersSetup_() {
  const sheet = ss_().getSheetByName(SHEET_NAME_USERS);
  if (!sheet) throw new Error("شيت المستخدمين غير موجود.");
  ensureHeader_(sheet, "Token");
  ensureHeader_(sheet, "آخر دخول");
}

function findUser_(username) {
  ensureUsersSetup_();

  const sheet = ss_().getSheetByName(SHEET_NAME_USERS);
  const data = sheet.getDataRange().getValues();
  const h = headersMap_(sheet);

  const colName = firstCol_(h, ["اسم المستخدم", "Username"], 1);
  const colDept = firstCol_(h, ["القسم", "Department"], 0);
  const colRole = firstCol_(h, ["الصلاحية", "Role"], 0);
  const colActive = firstCol_(h, ["مفعل؟", "مفعل", "Active"], 0);
  const colPassword = firstCol_(h, ["كلمة المرور", "Password"], 0);
  const colMustChange = firstCol_(h, ["يجب تغيير كلمة المرور؟", "Must Change Password"], 0);
  const colToken = firstCol_(h, ["Token"], 0);
  const colLastLogin = firstCol_(h, ["آخر دخول", "Last Login"], 0);

  if (!colName) throw new Error('عمود "اسم المستخدم" غير موجود في شيت المستخدمين.');
  if (!colPassword) throw new Error('عمود "كلمة المرور" غير موجود في شيت المستخدمين.');

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = normalize_(row[colName - 1]);
    if (name === normalize_(username)) {
      return {
        sheet: sheet,
        rowNumber: i + 1,
        username: name,
        department: colDept ? normalize_(row[colDept - 1]) : "",
        role: colRole ? normalize_(row[colRole - 1]) : "",
        active: colActive ? normalize_(row[colActive - 1]) : "نعم",
        password: normalize_(row[colPassword - 1]) || employeeDefaultPassword_(),
        mustChange: colMustChange ? normalize_(row[colMustChange - 1]) : "",
        token: colToken ? normalize_(row[colToken - 1]) : "",
        colPassword: colPassword,
        colToken: colToken,
        colLastLogin: colLastLogin
      };
    }
  }
  return null;
}

function roleFromArabic_(role, department) {
  const r = normalize_(role).toLowerCase();
  const d = normalize_(department).toLowerCase();

  if (r.indexOf("مدير") !== -1 || r === "admin") return "admin";
  if (d.indexOf("طباعة") !== -1 || r.indexOf("طباعة") !== -1 || r === "print") return "print";
  if (d.indexOf("ليزر") !== -1 || r.indexOf("ليزر") !== -1 || r === "laser") return "laser";
  if (d.indexOf("مكبس") !== -1 || r.indexOf("مكبس") !== -1 || r === "press") return "press";
  if (r.indexOf("خدمة") !== -1 || d.indexOf("خدمة") !== -1 || r === "service") return "service";
  return "service";
}

function login_(e) {
  const username = normalize_(e.parameter.username);
  const password = normalize_(e.parameter.password);

  if (!username || !password) return { success: false, message: "اكتب اسم المستخدم وكلمة المرور." };

  const user = findUser_(username);
  if (!user) return { success: false, message: "المستخدم غير موجود." };
  if (user.active && user.active !== "نعم") return { success: false, message: "هذا المستخدم غير مفعل." };
  if (user.password !== password) return { success: false, message: "كلمة المرور غير صحيحة." };

  const token = Utilities.getUuid();
  safeSet_(user.sheet, user.rowNumber, user.colToken, token);
  safeSet_(user.sheet, user.rowNumber, user.colLastLogin, new Date());
  SpreadsheetApp.flush();

  return {
    success: true,
    user: {
      username: user.username,
      name: user.username,
      department: user.department,
      role: roleFromArabic_(user.role, user.department),
      mustChange: user.mustChange === "نعم" || (!!employeeDefaultPassword_() && user.password === employeeDefaultPassword_()),
      token: token
    }
  };
}

function authorize_(username, token) {
  const user = findUser_(normalize_(username));
  if (!user) return { ok: false, message: "المستخدم غير موجود." };
  if (user.active && user.active !== "نعم") return { ok: false, message: "هذا المستخدم غير مفعل." };
  if (!token || user.token !== normalize_(token)) return { ok: false, message: "انتهت الجلسة. سجل الدخول مرة أخرى." };
  return { ok: true, user: user };
}

function runAdminMaintenance_(e, action, handler) {
  const params = e && e.parameter ? e.parameter : {};
  const auth = authorize_(params.username, params.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const role = roleFromArabic_(auth.user.role, auth.user.department);
  const userKey = searchKey_(auth.user.username || auth.user.name || "");
  const isAdmin = role === "admin" || userKey.indexOf("ضياء") !== -1 || userKey.indexOf("diaa") !== -1;
  if (!isAdmin) return { success: false, message: "أوامر الصيانة متاحة للمدير فقط." };

  if (action === "cleanStart" && normalize_(params.confirm) !== "CLEAN_START_KEEP_CUSTOMERS") {
    return { success: false, message: "تأكيد cleanStart غير صحيح. لم يتم حذف أو تغيير أي بيانات." };
  }

  if (typeof handler !== "function") return { success: false, message: "أمر الصيانة غير متاح." };
  return handler(e);
}

function verifyEmployeeSession_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const role = roleFromArabic_(auth.user.role, auth.user.department);
  const ok = accountingUserMode_(auth.user) !== "none";
  if (!ok) return { success: false, message: "هذا المستخدم غير مصرح له بفتح ملفات مطبعجي." };

  return {
    success: true,
    user: {
      username: auth.user.username,
      department: auth.user.department,
      role: role,
      active: auth.user.active || "نعم"
    }
  };
}

function changePassword_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const oldPassword = normalize_(e.parameter.oldPassword);
  const newPassword = normalize_(e.parameter.newPassword);

  if (!oldPassword || !newPassword) return { success: false, message: "اكتب كلمة المرور القديمة والجديدة." };
  if (newPassword.length < 4) return { success: false, message: "كلمة المرور الجديدة لا تقل عن 4 أرقام/حروف." };
  if (auth.user.password !== oldPassword) return { success: false, message: "كلمة المرور القديمة غير صحيحة." };

  safeSet_(auth.user.sheet, auth.user.rowNumber, auth.user.colPassword, newPassword);
  const h = headersMap_(auth.user.sheet);
  if (h["يجب تغيير كلمة المرور؟"]) safeSet_(auth.user.sheet, auth.user.rowNumber, h["يجب تغيير كلمة المرور؟"], "لا");
  SpreadsheetApp.flush();

  return { success: true, message: "تم تغيير كلمة المرور." };
}

/*********************** العملاء ***********************/

function searchCustomers_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const q = searchKey_(e.parameter.q);
  if (!q) return { success: true, customers: [] };

  const sheet = ss_().getSheetByName(SHEET_NAME_CUSTOMERS);
  if (!sheet) return { success: false, message: "شيت العملاء غير موجود." };

  const data = sheet.getDataRange().getValues();
  const h = headersMap_(sheet);

  const colName = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 1);
  const colManager = firstCol_(h, ["اسم المسؤول", "المسؤول", "Manager"], 2);
  const colPhone = firstCol_(h, ["رقم العميل الأساسي", "رقم العميل", "رقم الهاتف", "Phone"], 3);
  const colExtra = firstCol_(h, ["رقم إضافي", "رقم إضافى", "Extra Phone"], 4);
  const colType = firstCol_(h, ["نوع العميل", "Customer Type"], 5);
  const colActive = firstCol_(h, ["مفعل؟", "مفعل", "Active"], 0);
  const colDebt = firstCol_(h, ["مديونية حالية", "رصيد العميل", "مديونية", "customerDebt", "remainingBalance"], 0);

  const out = [];
  const seen = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (colActive && normalize_(row[colActive - 1]) && normalize_(row[colActive - 1]) !== "نعم") continue;

    const name = normalize_(row[colName - 1]);
    const manager = colManager ? normalize_(row[colManager - 1]) : "";
    const phone = colPhone ? cleanPhone_(row[colPhone - 1]) : "";
    const extra = colExtra ? cleanPhone_(row[colExtra - 1]) : "";
    const type = colType ? normalize_(row[colType - 1]) : "";
    const debt = colDebt ? parseDebtAmount_(row[colDebt - 1]) : 0;

    const blob = searchKey_([name, manager, phone, extra, type].join(" "));
    if (blob.indexOf(q) !== -1) {
      const key = name + "|" + phone;
      if (!seen[key]) {
        seen[key] = true;
        out.push({ name: name, manager: manager, phone: phone || extra, extraPhone: extra, type: type, debt: debt, debtAmount: debt, currentBalance: debt, remainingBalance: debt });
      }
    }
    if (out.length >= 12) break;
  }

  return { success: true, customers: out };
}


function customerCols_(sheet) {
  const h = headersMap_(sheet);
  return {
    name: firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 1),
    manager: firstCol_(h, ["اسم المسؤول", "المسؤول", "Manager"], 2),
    phone: firstCol_(h, ["رقم العميل الأساسي", "رقم العميل", "رقم الهاتف", "Phone"], 3),
    extra: firstCol_(h, ["رقم إضافي", "رقم إضافى", "Extra Phone"], 4),
    type: firstCol_(h, ["نوع العميل", "Customer Type"], 5),
    active: firstCol_(h, ["مفعل؟", "مفعل", "Active"], 0)
  };
}

function buildCustomerPhoneMap_() {
  const sheet = ss_().getSheetByName(SHEET_NAME_CUSTOMERS);
  const map = {};
  if (!sheet || sheet.getLastRow() < 2) return map;

  setPhoneColumnsAsText_(sheet);

  const data = sheet.getDataRange().getValues();
  const c = customerCols_(sheet);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const active = c.active ? normalize_(row[c.active - 1]) : "نعم";
    if (active && active !== "نعم") continue;

    const name = normalize_(row[c.name - 1]);
    if (!name) continue;

    const phone = c.phone ? cleanPhone_(row[c.phone - 1]) : "";
    const extraPhone = c.extra ? cleanPhone_(row[c.extra - 1]) : "";
    const manager = c.manager ? normalize_(row[c.manager - 1]) : "";
    const type = c.type ? normalize_(row[c.type - 1]) : "";
    const key = searchKey_(name);

    if (!map[key] || (!map[key].phone && (phone || extraPhone))) {
      map[key] = {
        name: name,
        phone: phone || extraPhone,
        extraPhone: extraPhone,
        manager: manager,
        type: type
      };
    }
  }

  return map;
}

function findCustomerInfoByName_(customerName) {
  const nameKey = searchKey_(customerName);
  if (!nameKey) return { name: "", phone: "", extraPhone: "", manager: "", type: "" };

  const map = buildCustomerPhoneMap_();
  if (map[nameKey]) return map[nameKey];

  // لو الاسم في الأوردر مختلف بسيط عن الاسم في العملاء، نعمل بحث احتياطي يحتوي الاسم.
  const keys = Object.keys(map);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].indexOf(nameKey) !== -1 || nameKey.indexOf(keys[i]) !== -1) {
      return map[keys[i]];
    }
  }

  return { name: normalize_(customerName), phone: "", extraPhone: "", manager: "", type: "" };
}


function canCreateCustomer_(user) {
  const role = roleFromArabic_(user.role, user.department);
  const username = searchKey_(user.username || "");
  return role === "admin" || role === "service" || username === "ضياء" || username === "رحمه";
}

function createCustomer_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canCreateCustomer_(auth.user)) return { success: false, message: "ليس لديك صلاحية إضافة عميل." };

  const customerName = normalize_(e.parameter.customerName || e.parameter.name);
  const manager = normalize_(e.parameter.manager) || auth.user.username;
  const phone = cleanPhone_(e.parameter.phone || e.parameter.customerPhone);
  const extraPhone = cleanPhone_(e.parameter.extraPhone || e.parameter.customerExtraPhone);
  const customerType = safeCustomerTypeForValidation_(e.parameter.customerType || e.parameter.type);
  const active = normalize_(e.parameter.active) || "نعم";
  const notes = normalize_(e.parameter.notes);

  if (!customerName) return { success: false, message: "اسم الشات / العميل مطلوب." };

  const sheet = ss_().getSheetByName(SHEET_NAME_CUSTOMERS);
  if (!sheet) return { success: false, message: "شيت العملاء غير موجود." };

  // تأكد من وجود الأعمدة الاختيارية بدون المساس بالعملاء الحاليين
  ensureHeaderIfAnyMissing_(sheet, ["اسم الشات / المكتب", "اسم المسؤول", "رقم العميل الأساسي", "رقم إضافي", "نوع العميل", "مفعل؟", "ملاحظات", "تاريخ الإضافة", "آخر تحديث"]);

  const h = headersMap_(sheet);
  const colName = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 1);
  const colPhone = firstCol_(h, ["رقم العميل الأساسي", "رقم العميل", "رقم الهاتف", "Phone"], 3);
  const colExtra = firstCol_(h, ["رقم إضافي", "رقم إضافى", "Extra Phone"], 4);
  const colActive = firstCol_(h, ["مفعل؟", "مفعل", "Active"], 0);

  const data = sheet.getDataRange().getValues();
  const nameKey = searchKey_(customerName);
  const phoneKey = searchKey_(phone);
  const extraKey = searchKey_(extraPhone);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const existingName = searchKey_(valueAt_(row, colName));
    const existingPhone = searchKey_(valueAt_(row, colPhone));
    const existingExtra = searchKey_(valueAt_(row, colExtra));
    const existingActive = colActive ? normalize_(valueAt_(row, colActive)) : "نعم";

    if (existingName && existingName === nameKey) {
      return { success: false, message: "العميل موجود بالفعل بنفس الاسم في شيت العملاء." };
    }
    if (phoneKey && (phoneKey === existingPhone || phoneKey === existingExtra)) {
      return { success: false, message: "رقم العميل موجود بالفعل في شيت العملاء." };
    }
    if (extraKey && (extraKey === existingPhone || extraKey === existingExtra)) {
      return { success: false, message: "الرقم الإضافي موجود بالفعل في شيت العملاء." };
    }
  }

  const now = new Date();
  appendByHeaders_(sheet, {
    "اسم الشات / المكتب": customerName,
    "اسم العميل": customerName,
    "اسم المسؤول": manager,
    "رقم العميل الأساسي": phone,
    "رقم العميل": phone,
    "رقم الهاتف": phone,
    "رقم إضافي": extraPhone,
    "رقم إضافى": extraPhone,
    "نوع العميل": customerType,
    "مفعل؟": active,
    "مفعل": active,
    "ملاحظات": notes,
    "تاريخ الإضافة": now,
    "آخر تحديث": now
  });

  SpreadsheetApp.flush();

  return {
    success: true,
    message: "تم إضافة العميل في شيت العملاء.",
    customer: {
      name: customerName,
      manager: manager,
      phone: phone,
      extraPhone: extraPhone,
      type: customerType,
      active: active
    }
  };
}

function ensureHeaderIfAnyMissing_(sheet, headers) {
  headers.forEach(function(headerName) {
    ensureHeader_(sheet, headerName);
  });
}


/*********************** متابعة اليوم وسجل الحركة ***********************/

function ensureActivityLogSheet_() {
  const sheet = mbEnsureSheet_(SHEET_NAME_ACTIVITY, [
    "الوقت",
    "رقم الأوردر",
    "رقم البند",
    "اسم العميل",
    "القسم",
    "الإجراء",
    "من حالة",
    "إلى حالة",
    "ملاحظات قديمة",
    "ملاحظات جديدة",
    "بواسطة",
    "تفاصيل"
  ]);
  return sheet;
}

function appendActivityLog_(info) {
  try {
    const sheet = ensureActivityLogSheet_();
    appendByHeaders_(sheet, {
      "الوقت": info.time || new Date(),
      "رقم الأوردر": info.orderId || "",
      "رقم البند": info.lineId || "",
      "اسم العميل": info.customer || "",
      "القسم": info.department || "",
      "الإجراء": info.action || "تعديل",
      "من حالة": info.oldStatus || "",
      "إلى حالة": info.newStatus || "",
      "ملاحظات قديمة": info.oldNotes || "",
      "ملاحظات جديدة": info.newNotes || "",
      "بواسطة": info.by || "",
      "تفاصيل": info.details || ""
    });
  } catch (err) {
    Logger.log("appendActivityLog_ Error: " + (err && err.message ? err.message : err));
  }
}

function getActivityLog_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const sheet = ss_().getSheetByName(SHEET_NAME_ACTIVITY);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, rows: [] };

  const limit = Math.min(Number(e.parameter.limit || 50) || 50, 200);
  const lastRow = sheet.getLastRow();
  const start = Math.max(2, lastRow - limit + 1);
  const data = sheet.getRange(start, 1, lastRow - start + 1, sheet.getLastColumn()).getValues();
  const h = headersMap_(sheet);

  const rows = data.map(function(row) {
    return {
      time: dateText_(valueAt_(row, firstCol_(h, ["الوقت"], 1))) || valueAt_(row, firstCol_(h, ["الوقت"], 1)),
      orderId: normalize_(valueAt_(row, firstCol_(h, ["رقم الأوردر"], 2))),
      lineId: normalize_(valueAt_(row, firstCol_(h, ["رقم البند"], 3))),
      customer: normalize_(valueAt_(row, firstCol_(h, ["اسم العميل"], 4))),
      department: normalize_(valueAt_(row, firstCol_(h, ["القسم"], 5))),
      action: normalize_(valueAt_(row, firstCol_(h, ["الإجراء"], 6))),
      oldStatus: normalize_(valueAt_(row, firstCol_(h, ["من حالة"], 7))),
      newStatus: normalize_(valueAt_(row, firstCol_(h, ["إلى حالة"], 8))),
      by: normalize_(valueAt_(row, firstCol_(h, ["بواسطة"], 11))),
      details: normalize_(valueAt_(row, firstCol_(h, ["تفاصيل"], 12)))
    };
  }).reverse();

  return { success: true, rows: rows };
}

function getDashboard_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const screen = normalize_(e.parameter.screen || "service");
  const lines = ss_().getSheetByName(SHEET_NAME_LINES);
  if (!lines) return { success: false, message: "شيت بنود الأوردرات غير موجود." };
  if (lines.getLastRow() < 2) return { success: true, dashboard: emptyDashboard_(screen) };

  const data = lines.getDataRange().getValues();
  const h = headersMap_(lines);

  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colOrderCode = firstCol_(h, ["كود الأوردر"], 2);
  const colDept = firstCol_(h, ["القسم", "Department"], 5);
  const colQty = firstCol_(h, ["الكمية", "Qty"], 8);
  const colPriority = firstCol_(h, ["الأولوية", "Priority"], 10);
  const colStatus = firstCol_(h, ["الحالة", "Status"], 11);
  const colUpdated = firstCol_(h, ["آخر تحديث", "Updated At"], 13);
  const colReceivedAt = firstCol_(h, ["تاريخ الاستلام", "تاريخ الإنشاء", "Received At"], 0);
  const colExpectedAt = firstCol_(h, ["تاريخ التسليم المتوقع", "Expected Delivery"], 0);
  const colExpectedText = firstCol_(h, ["الوقت المتوقع"], 0);
  const colPress = firstCol_(h, ["مكبس", "مكبس حراري", "مكبس؟", "Press", "Heat Press"], 0);

  const dashboard = emptyDashboard_(screen);
  const today = startOfToday_();
  const yesterday = addDays_(today, -1);
  const tomorrow = addDays_(today, 1);
  const todayWorkOrderSet = {};
  const activeOrderSet = {};
  const deliveredTodayOrderSet = {};
  const readyOrderSet = {};
  const overdueOrderSet = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const orderId = normalize_(valueAt_(row, colOrderId)) || normalize_(valueAt_(row, colOrderCode));
    const status = normalize_(valueAt_(row, colStatus)) || "طلب جديد";
    const priority = normalize_(valueAt_(row, colPriority)) || "عادي";
    const dept = normalize_(valueAt_(row, colDept)) || "غير محدد";
    const press = isHeatPressFlag_(valueAt_(row, colPress));
    const qty = Number(valueAt_(row, colQty)) || 1;
    const expectedRaw = valueAt_(row, colExpectedAt) || valueAt_(row, colExpectedText);
    const receivedRaw = valueAt_(row, colReceivedAt);
    const updatedRaw = valueAt_(row, colUpdated);

    if (!orderId && !dept) continue;
    if (!dashboardMatchesScreen_(screen, dept, press)) continue;

    const received = parseDateValue_(receivedRaw);
    let expected = parseDateValue_(expectedRaw);
    if (!expected && received) expected = addDays_(received, 2);
    const updated = parseDateValue_(updatedRaw);

    if (status === "تم التسليم") {
      dashboard.delivered++;
      if (isSameDay_(updated, today)) {
        dashboard.deliveredToday++;
        if (orderId) deliveredTodayOrderSet[orderId] = true;
      }
    }
    if (status === "جاهز للاستلام") {
      dashboard.readyForPickup++;
      if (orderId) readyOrderSet[orderId] = true;
    }
    if (status === "مكرر") dashboard.duplicate++;

    if (!isHiddenFromUserScreens_(status)) {
      dashboard.activeLines++;
      dashboard.activeSheets += qty;
      if (orderId) activeOrderSet[orderId] = true;

      if (priority === "عاجل" || priority === "VIP") dashboard.urgent++;
      else if (!priority || priority === "عادي") dashboard.normal++;
      else if (priority === "مؤجل") dashboard.delayedPriority++;

      dashboard.byDepartment[dept] = (dashboard.byDepartment[dept] || 0) + 1;
      if (press || dept === "مكبس") dashboard.heatPress++;
      if (status === "متوقف") dashboard.problems++;

      if (isOverdueByExpected_(status, expected || expectedRaw)) {
        dashboard.overdue++;
        if (orderId) overdueOrderSet[orderId] = true;
      }

      // شغل اليوم = مستلم امبارح + تسليمه بكرة، حسب قاعدة ترند مول:
      // يوم استلام، اليوم التالي تنفيذ، اليوم الثالث تسليم.
      if (isSameDay_(received, yesterday) && isSameDay_(expected, tomorrow)) {
        dashboard.todayWorkLines++;
        dashboard.todayWorkSheets += qty;
        if (orderId) todayWorkOrderSet[orderId] = true;
      }
    }
  }

  dashboard.todayWorkOrders = Object.keys(todayWorkOrderSet).length;
  dashboard.todayOrders = dashboard.todayWorkOrders;
  dashboard.activeOrders = Object.keys(activeOrderSet).length;
  dashboard.deliveredTodayOrders = Object.keys(deliveredTodayOrderSet).length;
  dashboard.readyOrders = Object.keys(readyOrderSet).length;
  dashboard.overdueOrders = Object.keys(overdueOrderSet).length;
  dashboard.updatedAt = formatDateAr_(new Date());
  return { success: true, dashboard: dashboard };
}

function emptyDashboard_(screen) {
  const nameMap = { service: "خدمة العملاء", print: "الطباعة", laser: "الليزر", press: "المكبس" };
  return {
    screen: screen || "service",
    departmentName: nameMap[screen] || "خدمة العملاء",
    todayOrders: 0,
    todayWorkOrders: 0,
    todayWorkLines: 0,
    todayWorkSheets: 0,
    activeOrders: 0,
    activeLines: 0,
    activeSheets: 0,
    urgent: 0,
    normal: 0,
    delayedPriority: 0,
    overdue: 0,
    overdueOrders: 0,
    problems: 0,
    readyForPickup: 0,
    readyOrders: 0,
    delivered: 0,
    deliveredToday: 0,
    deliveredTodayOrders: 0,
    duplicate: 0,
    heatPress: 0,
    byDepartment: { "طباعة": 0, "ليزر": 0, "مكبس": 0 }
  };
}

function dashboardMatchesScreen_(screen, department, heatPress) {
  screen = normalize_(screen || "service");
  department = normalize_(department);
  // V1846: الأقسام في بوابة العميل تُفصل كبنود طباعة/ليزر.
  // لو ظهر سطر قديم فيه "طباعة + ليزر" نعرضه في الشاشتين بدل ما يختفي من الليزر.
  if (screen === "print") return department === "طباعة" || department.indexOf("طباعة") !== -1;
  if (screen === "laser") return department === "ليزر" || department.indexOf("ليزر") !== -1;
  if (screen === "press") return !!heatPress;
  return true;
}

function isSameDay_(date, target) {
  if (!date || !target) return false;
  const a = new Date(date.getTime ? date.getTime() : date);
  const b = new Date(target.getTime ? target.getTime() : target);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return false;
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return a.getTime() === b.getTime();
}

/*********************** عرض البنود ***********************/

function getRows_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const screen = normalize_(e.parameter.screen);
  const lines = ss_().getSheetByName(SHEET_NAME_LINES);
  if (!lines) return { success: false, message: "شيت بنود الأوردرات غير موجود." };

  ensureWhatsAppHeaders_(lines);
  ensurePressColumn_(lines);
  ensureFlyPrintColumn_(lines);

  const data = lines.getDataRange().getValues();
  const h = headersMap_(lines);
  const rows = [];

  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colOrderCode = firstCol_(h, ["كود الأوردر"], 2);
  const colCustomer = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 3);
  const colDept = firstCol_(h, ["القسم", "Department"], 5);
  const colLineId = firstCol_(h, ["رقم البند", "Line ID"], 6);
  const colItem = firstCol_(h, ["اسم البند / نوع الشغل", "اسم البند", "Item Name"], 7);
  const colQty = firstCol_(h, ["الكمية", "Qty"], 8);
  const colAssigned = firstCol_(h, ["مسؤول القسم", "Assigned To"], 9);
  const colPriority = firstCol_(h, ["الأولوية", "Priority"], 10);
  const colStatus = firstCol_(h, ["الحالة", "Status"], 11);
  const colReady = firstCol_(h, ["جاهز؟", "جاهز", "Ready"], 12);
  const colUpdated = firstCol_(h, ["آخر تحديث", "Updated At"], 13);
  const colNotes = firstCol_(h, ["ملاحظات", "Notes"], 14);
  const colPhone = firstCol_(h, ["رقم العميل الخارجي", "رقم العميل", "رقم الهاتف", "Phone"], 17);
  const colPress = firstCol_(h, ["مكبس", "مكبس حراري", "مكبس؟", "Press", "Heat Press"], 0);
  const colCustomerNotified = firstCol_(h, ["تم إبلاغ العميل؟"], 0);
  const colNotifyAt = firstCol_(h, ["وقت الإبلاغ"], 0);
  const colNotifyBy = firstCol_(h, ["تم الإبلاغ بواسطة"], 0);
  const colLastWaMessage = firstCol_(h, ["آخر رسالة واتساب"], 0);
  const colLastWaAt = firstCol_(h, ["آخر وقت واتساب"], 0);
  const colLastWaBy = firstCol_(h, ["آخر واتساب بواسطة"], 0);
  const colReceivedAt = firstCol_(h, ["تاريخ الاستلام", "تاريخ الإنشاء", "Received At"], 0);
  const colExpectedAt = firstCol_(h, ["تاريخ التسليم المتوقع", "Expected Delivery"], 0);
  const colExpectedText = firstCol_(h, ["الوقت المتوقع"], 0);
  const colRegistrationSent = firstCol_(h, ["تم إرسال رسالة التسجيل؟"], 0);
  const colCustomerSourceV1903 = firstCol_(h, ["مصدر الطلب", "Source"], 0);
  const colExternalIdV1903 = firstCol_(h, ["علامة العميل الخارجي", "رقم/علامة العميل", "معرف العميل الخارجي", "External Customer ID"], 0);
  const colCustomerModeV1903 = firstCol_(h, ["نوع إدخال العميل", "Customer Mode"], 0);
  const customerPhoneMap = buildCustomerPhoneMap_();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const orderId = normalize_(valueAt_(row, colOrderId)) || normalize_(valueAt_(row, colOrderCode));
    const lineId = normalize_(valueAt_(row, colLineId));
    const department = normalize_(valueAt_(row, colDept));
    const status = normalize_(valueAt_(row, colStatus));

    if (!orderId && !lineId) continue;

    if (screen === "print" && department !== "طباعة") continue;
    if (screen === "laser" && department !== "ليزر") continue;
    if (screen === "press" && department !== "مكبس" && normalize_(valueAt_(row, colPress)) !== "نعم") continue;

    // لا نخفي الصفوف هنا؛ الواجهة هي التي تخفيها افتراضيًا.
    // هذا يسمح بفلاتر محسوبة مثل "تسليمات اليوم" أن تظهر عند الطلب.

    const customerName = normalize_(valueAt_(row, colCustomer));
    let customerPhone = cleanPhone_(valueAt_(row, colPhone));
    const customerLookup = customerPhoneMap[searchKey_(customerName)] || {};
    if (!customerPhone && customerLookup.phone) {
      customerPhone = customerLookup.phone;
      if (colPhone) {
        try {
          lines.getRange(i + 1, colPhone).setNumberFormat("@").setValue(customerPhone);
        } catch (phoneWriteErr) {}
      }
    }

    rows.push({
      rowNumber: i + 1,
      orderId: orderId,
      orderCode: normalize_(valueAt_(row, colOrderCode)) || orderId,
      lineId: lineId,
      customer: customerName,
      customerPhone: customerPhone,
      customerSource: normalize_(valueAt_(row, colCustomerSourceV1903)),
      source: normalize_(valueAt_(row, colCustomerSourceV1903)),
      externalCustomerId: normalize_(valueAt_(row, colExternalIdV1903)),
      customerMode: normalize_(valueAt_(row, colCustomerModeV1903)),
      department: department,
      itemName: normalize_(valueAt_(row, colItem)),
      qty: valueAt_(row, colQty) || 1,
      assignedTo: normalize_(valueAt_(row, colAssigned)),
      priority: normalize_(valueAt_(row, colPriority)) || "عادي",
      status: status || "طلب جديد",
      ready: normalize_(valueAt_(row, colReady)),
      heatPress: normalize_(valueAt_(row, colPress)),
      updatedAt: dateText_(valueAt_(row, colUpdated)) || valueAt_(row, colUpdated),
      notes: normalize_(valueAt_(row, colNotes)),
      customerNotified: normalize_(valueAt_(row, colCustomerNotified)),
      notifiedAt: dateText_(valueAt_(row, colNotifyAt)) || valueAt_(row, colNotifyAt),
      notifiedBy: normalize_(valueAt_(row, colNotifyBy)),
      lastWhatsAppMessage: normalize_(valueAt_(row, colLastWaMessage)),
      lastWhatsAppAt: dateText_(valueAt_(row, colLastWaAt)) || valueAt_(row, colLastWaAt),
      lastWhatsAppBy: normalize_(valueAt_(row, colLastWaBy)),
      receivedAt: dateText_(valueAt_(row, colReceivedAt)) || valueAt_(row, colReceivedAt),
      expectedDeliveryAt: dateText_(valueAt_(row, colExpectedAt)) || valueAt_(row, colExpectedAt),
      expectedDeliveryText: dateText_(valueAt_(row, colExpectedText)) || dateText_(valueAt_(row, colExpectedAt)),
      overdue: isOverdueByExpected_(status || "طلب جديد", valueAt_(row, colExpectedAt) || valueAt_(row, colExpectedText)) ? "نعم" : "لا",
      registrationSent: normalize_(valueAt_(row, colRegistrationSent))
    });
  }

  rows.sort(function (a, b) {
    const pa = priorityRank_(a.priority);
    const pb = priorityRank_(b.priority);
    if (pa !== pb) return pa - pb;
    return String(a.orderId).localeCompare(String(b.orderId));
  });

  return { success: true, rows: rows };
}


function ensureWhatsAppHeaders_(sheet) {
  ensureHeaderIfAnyMissing_(sheet, [
    "تم إبلاغ العميل؟",
    "وقت الإبلاغ",
    "تم الإبلاغ بواسطة",
    "آخر رسالة واتساب",
    "آخر وقت واتساب",
    "آخر واتساب بواسطة",
    "نوع رسالة واتساب",
    "تم إرسال رسالة التسجيل؟",
    "وقت رسالة التسجيل",
    "رسالة التسجيل بواسطة",
    "تاريخ الاستلام",
    "تاريخ التسليم المتوقع",
    "الوقت المتوقع",
    "مكبس حراري"
  ]);
}

function findLineTarget_(sheet, rowNumber, lineId, orderIdParam) {
  const h = headersMap_(sheet);
  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colOrderCode = firstCol_(h, ["كود الأوردر"], 2);
  const colLineId = firstCol_(h, ["رقم البند", "Line ID"], 6);

  let targetRow = 0;
  let orderId = normalize_(orderIdParam);

  if (rowNumber > 1 && rowNumber <= sheet.getLastRow()) {
    targetRow = rowNumber;
    orderId = orderId || normalize_(sheet.getRange(targetRow, colOrderId).getValue()) || normalize_(sheet.getRange(targetRow, colOrderCode).getValue());
  }

  if (!targetRow && lineId) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (normalize_(valueAt_(data[i], colLineId)) === lineId) {
        targetRow = i + 1;
        orderId = orderId || normalize_(valueAt_(data[i], colOrderId)) || normalize_(valueAt_(data[i], colOrderCode));
        break;
      }
    }
  }

  if (!targetRow && orderId) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const oid = normalize_(valueAt_(data[i], colOrderId)) || normalize_(valueAt_(data[i], colOrderCode));
      if (oid === orderId) {
        targetRow = i + 1;
        break;
      }
    }
  }

  return { rowNumber: targetRow, orderId: orderId };
}

function markCustomerNotified_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const rowNumber = Number(e.parameter.rowNumber || 0);
  const lineId = normalize_(e.parameter.lineId);
  const orderIdParam = normalize_(e.parameter.orderId);
  const whatsappType = normalize_(e.parameter.whatsappType) || "status_reply";
  const message = normalize_(e.parameter.message);

  const ss = ss_();
  const lines = ss.getSheetByName(SHEET_NAME_LINES);
  if (!lines) return { success: false, message: "شيت بنود الأوردرات غير موجود." };

  ensureWhatsAppHeaders_(lines);
  ensurePressColumn_(lines);
  const target = findLineTarget_(lines, rowNumber, lineId, orderIdParam);
  if (!target.rowNumber) return { success: false, message: "لم يتم العثور على البند لتسجيل الواتساب." };

  const h = headersMap_(lines);
  const now = new Date();
  const by = auth.user.username || normalize_(e.parameter.username);

  safeSet_(lines, target.rowNumber, h["آخر رسالة واتساب"], message);
  safeSet_(lines, target.rowNumber, h["آخر وقت واتساب"], now);
  safeSet_(lines, target.rowNumber, h["آخر واتساب بواسطة"], by);
  safeSet_(lines, target.rowNumber, h["نوع رسالة واتساب"], whatsappType);

  if (whatsappType === "ready_notify") {
    safeSet_(lines, target.rowNumber, h["تم إبلاغ العميل؟"], "نعم");
    safeSet_(lines, target.rowNumber, h["وقت الإبلاغ"], now);
    safeSet_(lines, target.rowNumber, h["تم الإبلاغ بواسطة"], by);
  }

  if (whatsappType === "order_registered") {
    safeSet_(lines, target.rowNumber, h["تم إرسال رسالة التسجيل؟"], "نعم");
    safeSet_(lines, target.rowNumber, h["وقت رسالة التسجيل"], now);
    safeSet_(lines, target.rowNumber, h["رسالة التسجيل بواسطة"], by);
  }

  if (target.orderId) syncWhatsAppToOrder_(target.orderId, whatsappType, message, now, by);

  try {
    const rowValues = lines.getRange(target.rowNumber, 1, 1, lines.getLastColumn()).getValues()[0];
    const h2 = headersMap_(lines);
    appendActivityLog_({
      time: now,
      orderId: target.orderId,
      lineId: normalize_(valueAt_(rowValues, firstCol_(h2, ["رقم البند", "Line ID"], 6))),
      customer: normalize_(valueAt_(rowValues, firstCol_(h2, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 3))),
      department: normalize_(valueAt_(rowValues, firstCol_(h2, ["القسم", "Department"], 5))),
      action: "رسالة واتساب",
      oldStatus: "",
      newStatus: normalize_(valueAt_(rowValues, firstCol_(h2, ["الحالة", "Status"], 11))),
      by: by,
      details: whatsappType + " | " + message
    });
  } catch (logErr) {}

  SpreadsheetApp.flush();
  return {
    success: true,
    message: "تم تسجيل رسالة الواتساب في الشيت.",
    orderId: target.orderId,
    rowNumber: target.rowNumber,
    whatsappType: whatsappType
  };
}

function syncWhatsAppToOrder_(orderId, whatsappType, message, now, by) {
  orderId = normalize_(orderId);
  if (!orderId) return;

  const ss = ss_();
  const orders = ss.getSheetByName(SHEET_NAME_ORDERS);
  if (!orders) return;

  ensureWhatsAppHeaders_(orders);

  const h = headersMap_(orders);
  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colOrderCode = firstCol_(h, ["كود الأوردر"], 2);
  let rowNumber = 0;

  const lastRow = orders.getLastRow();
  if (lastRow > 1) {
    const data = orders.getRange(2, 1, lastRow - 1, orders.getLastColumn()).getValues();
    for (let i = 0; i < data.length; i++) {
      const oid = normalize_(valueAt_(data[i], colOrderId)) || normalize_(valueAt_(data[i], colOrderCode));
      if (oid === orderId) {
        rowNumber = i + 2;
        break;
      }
    }
  }

  if (!rowNumber) {
    syncOrderFromLines_(orderId);
    return syncWhatsAppToOrder_(orderId, whatsappType, message, now, by);
  }

  const h2 = headersMap_(orders);
  safeSet_(orders, rowNumber, h2["آخر رسالة واتساب"], message);
  safeSet_(orders, rowNumber, h2["آخر وقت واتساب"], now);
  safeSet_(orders, rowNumber, h2["آخر واتساب بواسطة"], by);
  safeSet_(orders, rowNumber, h2["نوع رسالة واتساب"], whatsappType);

  if (whatsappType === "ready_notify") {
    safeSet_(orders, rowNumber, h2["تم إبلاغ العميل؟"], "نعم");
    safeSet_(orders, rowNumber, h2["وقت الإبلاغ"], now);
    safeSet_(orders, rowNumber, h2["تم الإبلاغ بواسطة"], by);
  }

  if (whatsappType === "order_registered") {
    safeSet_(orders, rowNumber, h2["تم إرسال رسالة التسجيل؟"], "نعم");
    safeSet_(orders, rowNumber, h2["وقت رسالة التسجيل"], now);
    safeSet_(orders, rowNumber, h2["رسالة التسجيل بواسطة"], by);
  }
}

/*********************** حفظ الحالة والتربيط ***********************/

function updateLine_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const rowNumber = Number(e.parameter.rowNumber || 0);
  const lineId = normalize_(e.parameter.lineId);
  const orderIdParam = normalize_(e.parameter.orderId);
  const status = normalize_(e.parameter.status) || "طلب جديد";
  const notes = normalize_(e.parameter.notes);

  const sheet = ss_().getSheetByName(SHEET_NAME_LINES);
  if (!sheet) return { success: false, message: "شيت بنود الأوردرات غير موجود." };

  const h = headersMap_(sheet);
  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colLineId = firstCol_(h, ["رقم البند", "Line ID"], 6);
  const colStatus = firstCol_(h, ["الحالة", "Status"], 11);
  const colReady = firstCol_(h, ["جاهز؟", "جاهز", "Ready"], 12);
  const colUpdated = firstCol_(h, ["آخر تحديث", "Updated At"], 13);
  const colNotes = firstCol_(h, ["ملاحظات", "Notes"], 14);

  if (!colStatus) return { success: false, message: 'عمود "الحالة" غير موجود في شيت بنود الأوردرات.' };
  if (!lineId && !rowNumber && !orderIdParam) return { success: false, message: "رقم البند أو رقم الصف ناقص." };

  let targetRow = 0;
  let orderId = orderIdParam;

  if (rowNumber > 1 && rowNumber <= sheet.getLastRow()) {
    targetRow = rowNumber;
    orderId = orderId || normalize_(sheet.getRange(targetRow, colOrderId).getValue());
  }

  if (!targetRow && lineId) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (normalize_(data[i][colLineId - 1]) === lineId) {
        targetRow = i + 1;
        orderId = orderId || normalize_(data[i][colOrderId - 1]);
        break;
      }
    }
  }

  if (!targetRow) return { success: false, message: "البند غير موجود في الشيت." };

  const oldStatus = colStatus ? normalize_(sheet.getRange(targetRow, colStatus).getValue()) : "";
  const oldNotes = colNotes ? normalize_(sheet.getRange(targetRow, colNotes).getValue()) : "";
  const rowValues = sheet.getRange(targetRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colCustomer = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 3);
  const colDept = firstCol_(h, ["القسم", "Department"], 5);

  const now = new Date();
  safeSet_(sheet, targetRow, colStatus, status);
  if (colNotes) safeSet_(sheet, targetRow, colNotes, notes);
  if (colUpdated) safeSet_(sheet, targetRow, colUpdated, now);
  if (colReady) safeSet_(sheet, targetRow, colReady, isReadyStatus_(status) ? "نعم" : "لا");

  if (orderId) syncOrderFromLines_(orderId);

  if (oldStatus !== status || oldNotes !== notes) {
    appendActivityLog_({
      time: now,
      orderId: orderId,
      lineId: lineId || normalize_(sheet.getRange(targetRow, colLineId).getValue()),
      customer: normalize_(valueAt_(rowValues, colCustomer)),
      department: normalize_(valueAt_(rowValues, colDept)),
      action: "تعديل حالة / ملاحظات",
      oldStatus: oldStatus,
      newStatus: status,
      oldNotes: oldNotes,
      newNotes: notes,
      by: auth.user.username,
      details: "تم الحفظ من شاشة TrendOS"
    });
  }

  SpreadsheetApp.flush();
  return {
    success: true,
    message: "تم حفظ الحالة في الشيت.",
    rowNumber: targetRow,
    orderId: orderId,
    lineId: lineId,
    status: status
  };
}

function syncOrderFromLines_(orderId) {
  orderId = normalize_(orderId);
  if (!orderId) return;

  const ss = ss_();
  const lines = ss.getSheetByName(SHEET_NAME_LINES);
  if (!lines) return;

  const data = lines.getDataRange().getValues();
  const h = headersMap_(lines);

  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colOrderCode = firstCol_(h, ["كود الأوردر"], 2);
  const colCustomer = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 3);
  const colDept = firstCol_(h, ["القسم", "Department"], 5);
  const colItem = firstCol_(h, ["اسم البند / نوع الشغل", "اسم البند", "Item Name"], 7);
  const colQty = firstCol_(h, ["الكمية", "Qty"], 8);
  const colPriority = firstCol_(h, ["الأولوية", "Priority"], 10);
  const colStatus = firstCol_(h, ["الحالة", "Status"], 11);
  const colUpdated = firstCol_(h, ["آخر تحديث", "Updated At"], 13);
  const colPhone = firstCol_(h, ["رقم العميل الخارجي", "رقم العميل", "رقم الهاتف", "Phone"], 17);
  const colReceivedAt = firstCol_(h, ["تاريخ الاستلام", "تاريخ الإنشاء", "Received At"], 0);
  const colExpectedAt = firstCol_(h, ["تاريخ التسليم المتوقع", "Expected Delivery"], 0);
  const colExpectedText = firstCol_(h, ["الوقت المتوقع"], 0);

  const matched = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const oid = normalize_(valueAt_(row, colOrderId)) || normalize_(valueAt_(row, colOrderCode));
    if (oid === orderId) matched.push(row);
  }
  if (!matched.length) return;

  let readyCount = 0;
  let stoppedCount = 0;
  let deliveredCount = 0;
  let duplicateCount = 0;
  let hasInProgress = false;
  let hasNew = false;

  matched.forEach(function (row) {
    const st = normalize_(valueAt_(row, colStatus));
    if (isReadyStatus_(st)) readyCount++;
    if (isStoppedStatus_(st)) stoppedCount++;
    if (st === "تم التسليم") deliveredCount++;
    if (st === "مكرر") duplicateCount++;
    if (st === "بدأ التنفيذ" || st === "تحت التنفيذ") hasInProgress = true;
    if (!st || st === "طلب جديد" || st === "جاهز للطباعة") hasNew = true;
  });

  const total = matched.length;
  const notReady = total - readyCount;
  let generalStatus = "طلب جديد";

  if (duplicateCount === total) generalStatus = "مكرر";
  else if (stoppedCount > 0) generalStatus = "مشكلة/متوقف";
  else if (deliveredCount === total) generalStatus = "تم التسليم";
  else if (readyCount === total) generalStatus = "جاهز للاستلام";
  else if (readyCount > 0) generalStatus = "تسليم جزئي";
  else if (hasInProgress) generalStatus = "تحت التنفيذ";
  else if (hasNew) generalStatus = "طلب جديد";

  const first = matched[0];
  const baseNow = new Date();
  const receivedAt = valueAt_(first, colReceivedAt) || baseNow;
  const expectedAt = valueAt_(first, colExpectedAt) || expectedDeliveryDate_(receivedAt);
  const expectedText = normalize_(valueAt_(first, colExpectedText)) || formatDateAr_(expectedAt);
  const summary = {
    orderId: orderId,
    now: receivedAt,
    customerName: normalize_(valueAt_(first, colCustomer)),
    customerPhone: cleanPhone_(valueAt_(first, colPhone)),
    customerType: "",
    department: normalize_(valueAt_(first, colDept)),
    itemName: normalize_(valueAt_(first, colItem)),
    qty: valueAt_(first, colQty) || 1,
    priority: normalize_(valueAt_(first, colPriority)) || "عادي",
    status: generalStatus,
    lineCount: total,
    readyCount: readyCount,
    notReadyCount: notReady,
    partial: readyCount > 0 && readyCount < total ? "نعم" : "لا",
    updatedAt: baseNow,
    receivedAt: receivedAt,
    expectedDeliveryAt: expectedAt,
    expectedDeliveryText: expectedText
  };

  upsertOrderSummary_(summary);
}

function upsertOrderSummary_(o) {
  const ss = ss_();
  const sheet = ss.getSheetByName(SHEET_NAME_ORDERS);
  if (!sheet) return;
  ensureWhatsAppHeaders_(sheet);
  ensurePressColumn_(sheet);
  ensureFlyPrintColumn_(sheet);

  const h = headersMap_(sheet);
  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colOrderCode = firstCol_(h, ["كود الأوردر"], 2);

  let rowNumber = 0;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, Math.max(colOrderId, colOrderCode, 1)).getValues();
    for (let i = 0; i < ids.length; i++) {
      const row = ids[i];
      const oid = normalize_(colOrderId ? row[colOrderId - 1] : "") || normalize_(colOrderCode ? row[colOrderCode - 1] : "");
      if (oid === o.orderId) {
        rowNumber = i + 2;
        break;
      }
    }
  }

  const values = {
    "رقم الأوردر": o.orderId,
    "كود الأوردر": o.orderId,
    "تاريخ الإنشاء": o.now,
    "اسم الشات / المكتب": o.customerName,
    "اسم العميل": o.customerName,
    "اسم المسؤول": o.manager || "",
    "رقم العميل": cleanPhone_(o.customerPhone),
    "رقم العميل الخارجي": cleanPhone_(o.customerPhone),
    "نوع العميل": o.customerType,
    "القسم الرئيسي": o.department,
    "القسم": o.department,
    "وصف مختصر": o.itemName,
    "وصف الأوردر": o.itemName,
    "الأولوية": o.priority,
    "الحالة العامة": o.status,
    "الحالة": o.status,
    "آخر تحديث": o.updatedAt || o.now,
    "عدد البنود": o.lineCount || 1,
    "بنود جاهزة": o.readyCount || 0,
    "بنود غير جاهزة": o.notReadyCount === undefined ? 0 : o.notReadyCount,
    "تسليم جزئي؟": o.partial || "لا",
    "ملاحظات": o.notes || "",
    "تاريخ الاستلام": o.receivedAt || o.now,
    "تاريخ التسليم المتوقع": o.expectedDeliveryAt || expectedDeliveryDate_(o.now),
    "الوقت المتوقع": o.expectedDeliveryText || expectedDeliveryText_(o.now),
    "مكبس حراري": o.heatPress ? "نعم" : "لا",
    "تم إبلاغ العميل؟": o.customerNotified || "لا",
    "تم إرسال رسالة التسجيل؟": o.registrationSent || "لا",
    "كود الشات": o.customerCode || "",
    "مصدر الطلب": o.source || "داخلي",
    "أنشئ بواسطة": o.createdBy || "الموظف",
    "ملاحظات العميل": o.customerNotes || "",
    "فاصل واتساب": o.whatsappSeparator || "",
    "تأكيد فاصل واتساب": o.whatsappSeparatorStatus || "غير مطلوب"
  };

  if (rowNumber) updateByHeaders_(sheet, rowNumber, values, true);
  else appendByHeaders_(sheet, values);
}

/*********************** إضافة أوردر ***********************/

function canCreateOrder_(user) {
  const role = roleFromArabic_(user.role, user.department);
  return role === "admin" || role === "service";
}

function createManualOrder_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canCreateOrder_(auth.user)) return { success: false, message: "ليس لديك صلاحية إضافة أوردر." };

  const customerName = normalize_(e.parameter.customerName);
  const customerInfo = findCustomerInfoByName_(customerName);
  const customerPhone = cleanPhone_(e.parameter.customerPhone) || customerInfo.phone || customerInfo.extraPhone || "";
  const customerType = safeCustomerTypeForValidation_(e.parameter.customerType || customerInfo.type || "");
  const department = normalize_(e.parameter.department);
  const heatPress = isHeatPressFlag_(e.parameter.heatPress || e.parameter.press || e.parameter.isPress);
  const flyPrint = department === "طباعة" && isFlyPrintFlag_(e.parameter.flyPrint || e.parameter.quickPrint || e.parameter.fastPrint || e.parameter["طباعة على الطاير"]);
  let itemName = normalize_(e.parameter.itemName);
  const qty = Number(e.parameter.qty || 1) || 1;
  const priority = flyPrint ? "عاجل" : (normalize_(e.parameter.priority) || "عادي");
  const status = normalize_(e.parameter.status) || "طلب جديد";
  const assignedToParam = normalize_(e.parameter.assignedTo);
  const notes = normalize_(e.parameter.notes);

  if (!customerName || !department) return { success: false, message: "اسم الشات والقسم مطلوبين." };
  if (!itemName) itemName = "أوردر جديد - " + department;

  const ss = ss_();
  const lines = ss.getSheetByName(SHEET_NAME_LINES);
  if (!lines) return { success: false, message: "شيت بنود الأوردرات غير موجود." };
  ensureWhatsAppHeaders_(lines);
  ensurePressColumn_(lines);
  ensureFlyPrintColumn_(lines);

  const now = new Date();
  const expectedDeliveryAt = flyPrint ? new Date(now) : expectedDeliveryDate_(now);
  const expectedDeliveryText = flyPrint ? (formatDateAr_(expectedDeliveryAt) + " - نفس اليوم") : formatDateAr_(expectedDeliveryAt);
  const orderId = makeOrderId_(lines, now);

  let departments = [];
  if (department === "متعدد الأقسام") {
    departments = [
      { department: "طباعة", assignedTo: "وائل", suffix: "طباعة" },
      { department: "ليزر", assignedTo: "جابر", suffix: "ليزر" }
    ];
  } else {
    departments = [
      { department: department, assignedTo: assignedToParam || defaultAssigned_(department), suffix: department }
    ];
  }

  const readyCount = isReadyStatus_(status) ? departments.length : 0;

  upsertOrderSummary_({
    orderId: orderId,
    now: now,
    customerName: customerName,
    customerPhone: customerPhone,
    customerType: customerType,
    department: department,
    itemName: itemName,
    qty: qty,
    priority: priority,
    status: status,
    lineCount: departments.length,
    readyCount: readyCount,
    notReadyCount: departments.length - readyCount,
    partial: readyCount > 0 && readyCount < departments.length ? "نعم" : "لا",
    notes: notes,
    receivedAt: now,
    expectedDeliveryAt: expectedDeliveryAt,
    expectedDeliveryText: expectedDeliveryText,
    heatPress: heatPress
  });

  departments.forEach(function (d, idx) {
    const lineNo = String(idx + 1).padStart(2, "0");
    const lineId = orderId + "-" + lineNo;
    appendLine_(ss, {
      orderId: orderId,
      lineId: lineId,
      now: now,
      customerName: customerName,
      customerPhone: customerPhone,
      customerType: customerType,
      department: d.department,
      itemName: departments.length > 1 ? (itemName + " - " + d.suffix) : itemName,
      qty: qty,
      priority: priority,
      status: status,
      assignedTo: d.assignedTo,
      notes: notes,
      receivedAt: now,
      expectedDeliveryAt: expectedDeliveryAt,
      expectedDeliveryText: expectedDeliveryText,
      heatPress: (d.department === "مكبس") || (heatPress && d.department === "طباعة")
    });
  });

  appendActivityLog_({
    time: now,
    orderId: orderId,
    lineId: orderId + "-01",
    customer: customerName,
    department: department,
    action: "تسجيل أوردر جديد",
    oldStatus: "",
    newStatus: status,
    oldNotes: "",
    newNotes: notes,
    by: auth.user.username,
    details: "عدد البنود: " + departments.length + " | الأولوية: " + priority + (heatPress ? " | مكبس حراري" : "")
  });

  SpreadsheetApp.flush();

  return {
    success: true,
    orderId: orderId,
    lineId: orderId + "-01",
    linesCreated: departments.length,
    expectedDeliveryAt: expectedDeliveryAt,
    expectedDeliveryText: expectedDeliveryText,
    message: "تم إضافة الأوردر في الشيتين."
  };
}

function defaultAssigned_(department) {
  if (department === "طباعة") return "وائل";
  if (department === "ليزر") return "جابر";
  if (department === "مكبس") return "المكبس";
  if (department === "متعدد الأقسام") return "وائل + جابر";
  return "";
}

/************************************************************
 * SIMPLE NUMERIC ORDER ID - V1838
 * من الآن رقم الأوردر الجديد يكون رقمًا صغيرًا بدون حروف.
 * مثال: 1001 ثم 1002.
 * لا يغير أرقام الأوردرات القديمة مثل TM2606...، ويمنع التكرار بالقفل.
 ************************************************************/
function makeOrderId_(sheet, now, skipLock) {
  const lock = skipLock ? null : LockService.getScriptLock();
  if (lock) lock.waitLock(20000);

  try {
    const props = PropertiesService.getScriptProperties();
    const key = "TRENDOS_NEXT_SIMPLE_ORDER_NO";

    let next = Number(props.getProperty(key) || 0);
    if (!next || next < 1) {
      next = getNextSimpleOrderNumber_(sheet);
    }

    const orderId = String(next);
    props.setProperty(key, String(next + 1));
    return orderId;
  } finally {
    if (lock) lock.releaseLock();
  }
}

function getNextSimpleOrderNumber_(fallbackSheet) {
  const ss = ss_();
  let maxNo = 1000; // أول رقم جديد سيكون 1001، رقم صغير وسهل للعميل

  [SHEET_NAME_LINES, SHEET_NAME_ORDERS].forEach(function(sheetName) {
    const sheet = ss.getSheetByName(sheetName) || fallbackSheet;
    if (!sheet || sheet.getLastRow() < 2) return;

    const h = headersMap_(sheet);
    const orderCols = [
      h["رقم الأوردر"],
      h["كود الأوردر"],
      h["Order ID"],
      h["orderId"]
    ].filter(Boolean);

    if (!orderCols.length) return;

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getDisplayValues();
    data.forEach(function(row) {
      orderCols.forEach(function(col) {
        const raw = String(row[col - 1] || "").trim();
        // نحسب الأرقام البسيطة فقط، ولا نحسب أكواد TM القديمة
        if (/^\d{1,7}$/.test(raw)) {
          const n = Number(raw);
          if (n > maxNo) maxNo = n;
        }
      });
    });
  });

  return maxNo + 1;
}

function resetSimpleOrderCounterNow(startFrom) {
  const n = Number(startFrom || 1001);
  PropertiesService.getScriptProperties().setProperty("TRENDOS_NEXT_SIMPLE_ORDER_NO", String(n));
  return { success: true, nextOrderNumber: n, message: "تم ضبط أول رقم أوردر جديد على: " + n };
}

function appendLine_(ss, o) {
  const sheet = ss.getSheetByName(SHEET_NAME_LINES);
  if (!sheet) return;

  const ready = isReadyStatus_(o.status) ? "نعم" : "لا";

  appendByHeaders_(sheet, {
    "رقم الأوردر": o.orderId,
    "كود الأوردر": o.orderId,
    "اسم الشات / المكتب": o.customerName,
    "اسم العميل": o.customerName,
    "رقم العميل": cleanPhone_(o.customerPhone),
    "رقم العميل الخارجي": cleanPhone_(o.customerPhone),
    "نوع العميل": o.customerType,
    "القسم الرئيسي": o.department,
    "القسم الرئيسي": o.department,
    "القسم": o.department,
    "رقم البند": o.lineId,
    "Line ID": o.lineId,
    "اسم البند / نوع الشغل": o.itemName,
    "اسم البند": o.itemName,
    "الكمية": o.qty,
    "مسؤول القسم": o.assignedTo,
    "الأولوية": o.priority,
    "الحالة": o.status,
    "جاهز؟": ready,
    "آخر تحديث": o.now,
    "ملاحظات": o.notes,
    "مكبس حراري": (o.department === "مكبس" || o.heatPress) ? "نعم" : "لا",
    "تاريخ الاستلام": o.receivedAt || o.now,
    "تاريخ التسليم المتوقع": o.expectedDeliveryAt || expectedDeliveryDate_(o.now),
    "الوقت المتوقع": o.expectedDeliveryText || expectedDeliveryText_(o.now),
    "تم إبلاغ العميل؟": "لا",
    "تم إرسال رسالة التسجيل؟": "لا",
    "آخر رسالة واتساب": "",
    "آخر وقت واتساب": "",
    "آخر واتساب بواسطة": "",
    "نوع رسالة واتساب": "",
    "كود الشات": o.customerCode || "",
    "مصدر الطلب": o.source || "داخلي",
    "أنشئ بواسطة": o.createdBy || "الموظف",
    "ملاحظات العميل": o.customerNotes || "",
    "فاصل واتساب": o.whatsappSeparator || "",
    "تأكيد فاصل واتساب": o.whatsappSeparatorStatus || "غير مطلوب"
  });
}

/*********************** أدوات كتابة حسب الهيدر ***********************/

function appendByHeaders_(sheet, values) {
  const h = headersMap_(sheet);
  const lastCol = Math.max(1, sheet.getLastColumn());
  const row = new Array(lastCol).fill("");

  Object.keys(values).forEach(function (key) {
    const col = h[normalizeKey_(key)];
    if (col) row[col - 1] = isPhoneHeader_(key) ? cleanPhone_(values[key]) : values[key];
  });

  const nextRow = sheet.getLastRow() + 1;
  setPhoneColumnsAsText_(sheet, nextRow);
  sheet.getRange(nextRow, 1, 1, lastCol).setValues([row]);
}

function updateByHeaders_(sheet, rowNumber, values, skipCreateDate) {
  const h = headersMap_(sheet);
  Object.keys(values).forEach(function (key) {
    if (skipCreateDate && key === "تاريخ الإنشاء") return;
    const col = h[normalizeKey_(key)];
    if (col) {
      const range = sheet.getRange(rowNumber, col);
      if (isPhoneHeader_(key)) {
        range.setNumberFormat("@");
        range.setValue(cleanPhone_(values[key]));
      } else {
        range.setValue(values[key]);
      }
    }
  });
}

/*********************** مزامنة آمنة اختيارية ***********************/

function syncTrendOSNow() {
  const lines = ss_().getSheetByName(SHEET_NAME_LINES);
  if (!lines) return { success: false, message: "شيت بنود الأوردرات غير موجود." };

  const h = headersMap_(lines);
  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colOrderCode = firstCol_(h, ["كود الأوردر"], 2);
  const data = lines.getDataRange().getValues();
  const ids = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const oid = normalize_(valueAt_(row, colOrderId)) || normalize_(valueAt_(row, colOrderCode));
    if (oid) ids[oid] = true;
  }

  const keys = Object.keys(ids);
  const limit = Math.min(keys.length, 120);
  for (let i = 0; i < limit; i++) {
    syncOrderFromLines_(keys[i]);
  }

  SpreadsheetApp.flush();
  return {
    success: true,
    message: "تمت مزامنة دفعة آمنة من الأوردرات.",
    totalOrdersFound: keys.length,
    syncedNow: limit
  };
}

function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    if (sheet.getName() !== SHEET_NAME_LINES) return;
    if (e.range.getRow() <= 1) return;

    const h = headersMap_(sheet);
    const colStatus = firstCol_(h, ["الحالة", "Status"], 11);
    const colNotes = firstCol_(h, ["ملاحظات", "Notes"], 14);
    if (e.range.getColumn() !== colStatus && e.range.getColumn() !== colNotes) return;

    const rowNumber = e.range.getRow();
    const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
    const colUpdated = firstCol_(h, ["آخر تحديث", "Updated At"], 13);
    const colReady = firstCol_(h, ["جاهز؟", "جاهز", "Ready"], 12);

    const status = normalize_(sheet.getRange(rowNumber, colStatus).getValue());
    const orderId = normalize_(sheet.getRange(rowNumber, colOrderId).getValue());

    if (colUpdated) sheet.getRange(rowNumber, colUpdated).setValue(new Date());
    if (colReady) sheet.getRange(rowNumber, colReady).setValue(isReadyStatus_(status) ? "نعم" : "لا");
    if (orderId) syncOrderFromLines_(orderId);

    SpreadsheetApp.flush();
  } catch (err) {
    Logger.log("onEdit TrendOS Error: " + (err && err.message ? err.message : err));
  }
}


/************************************************************
 * CLEAN START - يحذف كل الأوردرات والبنود ويترك العملاء والمستخدمين
 * شغّل الدالة cleanStartKeepCustomersNow من قائمة Run مرة واحدة فقط
 ************************************************************/
function fixPhoneColumnsNow() {
  const ss = ss_();
  const targetSheets = [SHEET_NAME_CUSTOMERS, SHEET_NAME_ORDERS, SHEET_NAME_LINES];
  let sheetsFixed = 0;
  let cellsFixed = 0;

  targetSheets.forEach(function (name) {
    const sheet = ss.getSheetByName(name);
    if (!sheet || sheet.getLastRow() < 2) return;
    const cols = phoneColumns_(sheet);
    if (!cols.length) return;

    cols.forEach(function (col) {
      const range = sheet.getRange(2, col, sheet.getLastRow() - 1, 1);
      range.setNumberFormat("@");
      const values = range.getValues();
      const out = values.map(function (r) { return [cleanPhone_(r[0])]; });
      range.setValues(out);
      cellsFixed += out.length;
    });
    sheetsFixed++;
  });

  SpreadsheetApp.flush();
  return {
    success: true,
    message: "تم ضبط أعمدة أرقام العملاء كنص وإرجاع الصفر في بداية أرقام الموبايل.",
    sheetsFixed: sheetsFixed,
    cellsFixed: cellsFixed
  };
}


function fillMissingOrderPhonesNow() {
  const ss = ss_();
  const customerMap = buildCustomerPhoneMap_();
  const now = new Date();
  let linesUpdated = 0;
  let ordersUpdated = 0;

  function fillSheet_(sheetName, customerHeaders, phoneHeaders) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return 0;

    setPhoneColumnsAsText_(sheet);

    const data = sheet.getDataRange().getValues();
    const h = headersMap_(sheet);
    const colCustomer = firstCol_(h, customerHeaders, 0);
    const colPhone = firstCol_(h, phoneHeaders, 0);
    const colUpdated = firstCol_(h, ["آخر تحديث", "Updated At"], 0);
    if (!colCustomer || !colPhone) return 0;

    let updated = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const customerName = normalize_(row[colCustomer - 1]);
      if (!customerName) continue;
      const currentPhone = cleanPhone_(row[colPhone - 1]);
      if (currentPhone) continue;

      const customerInfo = customerMap[searchKey_(customerName)] || findCustomerInfoByName_(customerName);
      const phone = customerInfo.phone || customerInfo.extraPhone || "";
      if (!phone) continue;

      sheet.getRange(i + 1, colPhone).setNumberFormat("@").setValue(phone);
      if (colUpdated) sheet.getRange(i + 1, colUpdated).setValue(now);
      updated++;
    }
    return updated;
  }

  linesUpdated = fillSheet_(SHEET_NAME_LINES,
    ["اسم الشات / المكتب", "اسم العميل", "Customer Name"],
    ["رقم العميل الخارجي", "رقم العميل", "رقم الهاتف", "Phone"]
  );

  ordersUpdated = fillSheet_(SHEET_NAME_ORDERS,
    ["اسم الشات / المكتب", "اسم العميل", "Customer Name"],
    ["رقم العميل الخارجي", "رقم العميل", "رقم الهاتف", "Phone", "رقم العميل الأساسي"]
  );

  SpreadsheetApp.flush();

  return {
    success: true,
    message: "تم استكمال أرقام العملاء الناقصة من شيت العملاء.",
    linesUpdated: linesUpdated,
    ordersUpdated: ordersUpdated
  };
}

function cleanStartKeepCustomersNow() {
  const ss = ss_();
  const result = {
    success: true,
    spreadsheet: ss.getName(),
    url: ss.getUrl(),
    cleared: [],
    kept: [SHEET_NAME_CUSTOMERS, SHEET_NAME_USERS],
    message: "تم تصفير التشغيل: حذف الأوردرات والبنود فقط مع ترك العملاء والمستخدمين."
  };

  const mainSheetsToClear = [
    SHEET_NAME_ORDERS,
    SHEET_NAME_LINES,
    "لوحة التحكم",
    "واجهة الإدارة",
    "واجهة الطباعة",
    "واجهة الليزر",
    "واجهة خدمة العملاء",
    "واجهة المكبس",
    "طلبات V2",
    "طلبات التطبيق",
    "طلبات واتساب",
    "التنبيهات",
    "واجهة الطلبات",
    "واجهة خدمة العملاء",
    SHEET_NAME_ACTIVITY
  ];

  mainSheetsToClear.forEach(function(name){
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    cleanSheetBodyOnly_(sheet);
    result.cleared.push(name);
  });

  // إزالة الفلاتر من كل الشيتات حتى شيت العملاء، بدون حذف داتا العملاء
  ss.getSheets().forEach(function(sheet){
    try {
      const filter = sheet.getFilter();
      if (filter) filter.remove();
    } catch(e) {}
  });

  // إزالة مشاكل التحقق من البيانات في شيتات التشغيل ثم إعادة القوائم الصحيحة فقط
  resetTrendOSValidations_();

  SpreadsheetApp.flush();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function cleanSheetBodyOnly_(sheet) {
  try {
    const filter = sheet.getFilter();
    if (filter) filter.remove();
  } catch(e) {}

  const lastRow = sheet.getLastRow();
  const maxRows = sheet.getMaxRows();
  const maxCols = sheet.getMaxColumns();

  if (maxRows > 1) {
    const body = sheet.getRange(2, 1, maxRows - 1, maxCols);
    body.clearContent();
    body.clearNote();
    body.clearDataValidations();
  }
}

function resetTrendOSValidations_() {
  const ss = ss_();

  const lines = ss.getSheetByName(SHEET_NAME_LINES);
  if (lines) {
    const h = headersMap_(lines);
    clearAllBodyValidations_(lines);
    setDropdownByHeader_(lines, h, ["القسم", "Department"], ["طباعة", "ليزر", "مكبس", "متعدد الأقسام"]);
    setDropdownByHeader_(lines, h, ["الأولوية", "Priority"], ["عاجل", "عادي", "مؤجل"]);
    setDropdownByHeader_(lines, h, ["الحالة", "Status"], ["طلب جديد", "بدأ التنفيذ", "تحت التنفيذ", "جاهز للاستلام", "تم التسليم", "متوقف", "مكرر", "ملغى"]);
    setDropdownByHeader_(lines, h, ["جاهز؟", "جاهز", "Ready"], ["نعم", "لا"]);
    setDropdownByHeader_(lines, h, ["مكبس حراري", "مكبس؟"], ["نعم", "لا"]);
  }

  const orders = ss.getSheetByName(SHEET_NAME_ORDERS);
  if (orders) {
    const h = headersMap_(orders);
    clearAllBodyValidations_(orders);
    setDropdownByHeader_(orders, h, ["القسم الرئيسي", "القسم", "Department"], ["طباعة", "ليزر", "مكبس", "متعدد الأقسام"]);
    setDropdownByHeader_(orders, h, ["الأولوية", "Priority"], ["عاجل", "عادي", "مؤجل"]);
    setDropdownByHeader_(orders, h, ["الحالة العامة", "الحالة", "Status"], ["طلب جديد", "بدأ التنفيذ", "تحت التنفيذ", "جاهز للاستلام", "تم التسليم", "متوقف", "مكرر", "ملغى"]);
    setDropdownByHeader_(orders, h, ["تسليم جزئي؟"], ["نعم", "لا"]);
  }
}

function clearAllBodyValidations_(sheet) {
  const maxRows = sheet.getMaxRows();
  const maxCols = sheet.getMaxColumns();
  if (maxRows > 1) sheet.getRange(2, 1, maxRows - 1, maxCols).clearDataValidations();
}

function setDropdownByHeader_(sheet, headerMap, names, values) {
  const col = firstCol_(headerMap, names, 0);
  if (!col) return;
  const maxRows = sheet.getMaxRows();
  if (maxRows <= 1) return;
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, col, maxRows - 1, 1).setDataValidation(rule);
}


/*********************** معرفة واتس AI - V1823 ***********************/

function canManageKnowledge_(user) {
  const role = roleFromArabic_(user.role, user.department);
  const username = searchKey_(user.username || "");
  return role === "admin" || role === "service" || username === "ضياء" || username === "رحمه" || username === "رحمة";
}

function aiKnowledgeHeaders_() {
  return [
    "ID",
    "القسم",
    "العنوان",
    "المفتاح",
    "الكلمات المفتاحية",
    "النص",
    "الأولوية",
    "مفعل؟",
    "آخر تحديث",
    "بواسطة",
    "ملاحظات"
  ];
}

function ensureAiKnowledgeSheet_() {
  const ss = ss_();
  let sheet = ss.getSheetByName(SHEET_NAME_AI_KNOWLEDGE);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME_AI_KNOWLEDGE);

  const headers = aiKnowledgeHeaders_();
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    ensureHeaderIfAnyMissing_(sheet, headers);
  }

  sheet.setFrozenRows(1);
  try {
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight("bold").setBackground("#111827").setFontColor("#ffffff");
    sheet.autoResizeColumns(1, Math.min(sheet.getLastColumn(), headers.length));
  } catch (e) {}

  return sheet;
}

function ensureAiSettingsSheet_() {
  const ss = ss_();
  let sheet = ss.getSheetByName(SHEET_NAME_AI_SETTINGS);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME_AI_SETTINGS);
  const headers = ["المفتاح", "القيمة", "ملاحظات"];
  if (sheet.getLastRow() < 1) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  else ensureHeaderIfAnyMissing_(sheet, headers);

  const defaults = [
    ["brand_name", "Trend Mall", "اسم التوقيع في رسائل الواتساب"],
    ["default_delivery_days", "2", "يوم التسجيل + يومين = التسليم المتوقع"],
    ["handoff_users", "رحمه,ضياء", "التحويل للدعم عند عدم وضوح الطلب"],
    ["tone", "مصري بسيط ومحترم ومختصر", "نبرة رد واتس AI"],
    ["do_not_give_final_price", "نعم", "لا يعطي سعر نهائي إلا من الأسعار المعتمدة"],
    ["new_work_new_order", "نعم", "أي شغل جديد بعد رقم أوردر سابق يسجل أوردر جديد"]
  ];
  seedSheetIfEmpty_(sheet, defaults, 1);
  return sheet;
}

function ensureAiLogSheet_() {
  const ss = ss_();
  let sheet = ss.getSheetByName(SHEET_NAME_AI_LOG);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME_AI_LOG);
  const headers = ["التاريخ", "رقم العميل", "اسم العميل", "رسالة العميل", "رد AI", "نوع النية", "رقم الأوردر", "ملاحظات"];
  if (sheet.getLastRow() < 1) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  else ensureHeaderIfAnyMissing_(sheet, headers);
  return sheet;
}

function seedSheetIfEmpty_(sheet, rows, keyCol) {
  if (sheet.getLastRow() > 1) return;
  if (!rows || !rows.length) return;
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function defaultAiKnowledgeRows_() {
  const now = new Date();
  return [
    ["KB-0001", "قواعد التشغيل", "مصدر الحقيقة", "source_of_truth", "شيت, حالة, أوردر, معرفة", "Google Sheet هو مصدر الحقيقة في TrendOS. لا يتم تأكيد حالة أوردر أو رقم أو ميعاد إلا من الشيت أو من بيانات الأوردر الظاهرة في النظام.", "عالية", "نعم", now, "System", ""],
    ["KB-0002", "سياسة التسليم", "التسليم المتوقع", "delivery_policy", "تسليم, استلام, ميعاد, وقت", "سياسة التشغيل: يوم تسجيل الأوردر هو يوم استلام الشغل، اليوم التالي للتنفيذ، واليوم الثالث لتسليم العميل. لذلك التسليم المتوقع = تاريخ التسجيل + يومين.", "عالية", "نعم", now, "System", ""],
    ["KB-0003", "قواعد التشغيل", "الشغل الجديد يسجل أوردر جديد", "new_work_new_order", "شغل جديد, رقم جديد, اوردر جديد", "لو العميل بعت شغل جديد بعد تسجيل أوردر سابق، يتم تسجيل الشغل كأوردر جديد برقم جديد حتى لو لنفس العميل، لأن كل رقم أوردر له متابعة وحالة مستقلة.", "عالية", "نعم", now, "System", ""],
    ["KB-0004", "ردود واتساب", "رسالة تسجيل اوردر", "order_registered", "تسجيل, تم التسجيل, رقم الأوردر", "أهلاً يا {customer_name} 🌟\nتم تسجيل أوردر جديد لحضرتك بنجاح.\nرقم الأوردر: {order_id}\nالقسم: {department}\nنوع الشغل: {item_name}\nالتسليم المتوقع: {expected_delivery}\n\nمهم: أي شغل جديد يتم إرساله بعد كده هيتسجل كأوردر جديد برقم جديد.\n{business_name}", "عالية", "نعم", now, "System", ""],
    ["KB-0005", "ردود واتساب", "رد حالة الأوردر", "status_reply", "الحالة, خلص, جاهز, متابعة", "أهلاً يا {customer_name} 🌟\nالأوردر رقم {order_id} حالته حالياً: {status}\nالقسم: {department}\nنوع الشغل: {item_name}\nالتسليم المتوقع: {expected_delivery}\n{business_name}", "عالية", "نعم", now, "System", ""],
    ["KB-0006", "ردود واتساب", "رسالة جاهز للاستلام", "ready_notify", "جاهز, استلام, خلص", "أهلاً يا {customer_name} 🌟\nالأوردر رقم {order_id} جاهز للاستلام.\nالقسم: {department}\nنوع الشغل: {item_name}\nبرجاء الحضور للاستلام في أقرب وقت مناسب.\n{business_name}", "عالية", "نعم", now, "System", ""],
    ["KB-0007", "قواعد التشغيل", "الحالات المخفية", "hidden_statuses", "مكرر, تم التسليم, جاهز للاستلام, تم التنفيذ, جاهز للطباعة, ملغى", "الحالات جاهز للاستلام وتم التسليم ومكرر وملغى لا تظهر في شاشة المستخدمين اليومية بعد حفظها، لكنها تظل محفوظة في الشيت للمتابعة والسجل ويمكن عرض ملغى من فلتر الحالة.", "عادية", "نعم", now, "System", ""],
    ["KB-0008", "قواعد التشغيل", "الأولوية الافتراضية", "default_priority", "عاجل, عادي, أولوية", "الأولوية الافتراضية عند تسجيل الأوردر هي عادي، وليس عاجل، حتى لا يتم تسجيل كل الأوردرات كعاجلة بالخطأ. شاشة التشغيل تعرض العاجل أولًا ثم العادي.", "عادية", "نعم", now, "System", ""],
    ["KB-0009", "قواعد التشغيل", "المكبس الحراري", "heat_press", "مكبس, حراري, طباعة", "لو الأوردر طباعة أو متعدد الأقسام وتم تعليم مكبس حراري، يظهر بعلامة حمراء مكبس في شاشة الأوردرات وشاشة المكبس حتى يتم تجميع شغل المكبس مرة واحدة يوميًا.", "عالية", "نعم", now, "System", ""],
    ["KB-0010", "الخدمات والأقسام", "الأقسام الأساسية", "departments", "طباعة, ليزر, مكبس, فنيل", "أقسام التشغيل الأساسية في TrendOS: خدمة العملاء، طباعة، ليزر، مكبس. الأوردر قد يكون قسم واحد أو متعدد الأقسام، وكل قسم له متابعة مستقلة.", "عادية", "نعم", now, "System", ""],
    ["KB-0011", "الممنوعات", "عدم الوعد بدون بيانات", "no_fake_promises", "سعر, وعد, خلص, تأكيد", "لا يعطي AI سعر نهائي أو وعد تسليم مؤكد خارج بيانات الشيت. إذا البيانات ناقصة أو غير واضحة، يحول العميل لرحمه أو ضياء.", "عالية", "نعم", now, "System", ""],
    ["KB-0012", "تحويل للدعم", "متى يتم التحويل", "human_escalation", "دعم, موظف, غير واضح, مشكلة", "يتم تحويل العميل للدعم إذا طلب سعر غير موجود في المعرفة، أو أرسل شكوى، أو سأل عن تعديل تصميم، أو كانت حالة الأوردر غير موجودة، أو لم يتم التعرف على رقم الهاتف/الأوردر.", "عالية", "نعم", now, "System", ""],
    ["KB-0013", "الأسعار والخدمات", "الخدمات الحالية", "services", "تابلوهات, براويز, مجات, سلوبتات, تيشرتات, دروع, ليزر", "الخدمات التي يقدمها مطبعجي/ترند مول تشمل: تابلوهات وبراويز، مجات، سلوبتات، تيشرتات، دروع، فنيل، ليزر، طباعة بانر، لامنيشن، فوتوبلوك، ومستلزمات حفلات التخرج. الأسعار النهائية تكون من القوائم المعتمدة فقط.", "عادية", "نعم", now, "System", ""],
    ["KB-0014", "ردود واتساب", "نبرة الرد", "tone", "أسلوب, رد, لهجة", "نبرة الرد تكون مصرية بسيطة ومحترمة ومختصرة. يبدأ الرد بتحية لطيفة، ويذكر البيانات المهمة فقط بدون إطالة.", "عادية", "نعم", now, "System", ""]
  ];
}

function initAiKnowledgeNow() {
  const knowledge = ensureAiKnowledgeSheet_();
  ensureAiSettingsSheet_();
  ensureAiLogSheet_();

  if (knowledge.getLastRow() < 2) {
    const rows = defaultAiKnowledgeRows_();
    knowledge.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  SpreadsheetApp.flush();
  return {
    success: true,
    message: "تم تجهيز شيت معرفة واتس AI والقوالب والإعدادات.",
    knowledgeRows: Math.max(0, knowledge.getLastRow() - 1),
    sheetName: SHEET_NAME_AI_KNOWLEDGE
  };
}

function getKnowledge_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canManageKnowledge_(auth.user)) return { success: false, message: "ليس لديك صلاحية إدارة معرفة واتس AI." };

  const sheet = ensureAiKnowledgeSheet_();
  if (sheet.getLastRow() < 2) initAiKnowledgeNow();

  const data = sheet.getDataRange().getDisplayValues();
  const h = headersMap_(sheet);
  const rows = [];

  const colId = firstCol_(h, ["ID"], 1);
  const colCategory = firstCol_(h, ["القسم"], 2);
  const colTitle = firstCol_(h, ["العنوان"], 3);
  const colKey = firstCol_(h, ["المفتاح", "key"], 4);
  const colKeywords = firstCol_(h, ["الكلمات المفتاحية"], 5);
  const colContent = firstCol_(h, ["النص", "المحتوى"], 6);
  const colPriority = firstCol_(h, ["الأولوية"], 7);
  const colActive = firstCol_(h, ["مفعل؟", "مفعل"], 8);
  const colUpdated = firstCol_(h, ["آخر تحديث"], 9);
  const colBy = firstCol_(h, ["بواسطة"], 10);
  const colNotes = firstCol_(h, ["ملاحظات"], 11);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = normalize_(valueAt_(row, colId));
    const title = normalize_(valueAt_(row, colTitle));
    if (!id && !title) continue;
    rows.push({
      rowNumber: i + 1,
      id: id,
      category: normalize_(valueAt_(row, colCategory)),
      title: title,
      key: normalize_(valueAt_(row, colKey)),
      keywords: normalize_(valueAt_(row, colKeywords)),
      content: normalize_(valueAt_(row, colContent)),
      priority: normalize_(valueAt_(row, colPriority)) || "عادية",
      active: normalize_(valueAt_(row, colActive)) || "نعم",
      updatedAt: dateText_(valueAt_(row, colUpdated)),
      by: normalize_(valueAt_(row, colBy)),
      notes: normalize_(valueAt_(row, colNotes))
    });
  }

  rows.sort(function(a, b) {
    const rank = { "عالية": 0, "عادية": 1, "منخفضة": 2 };
    const ra = rank[a.priority] === undefined ? 9 : rank[a.priority];
    const rb = rank[b.priority] === undefined ? 9 : rank[b.priority];
    if (ra !== rb) return ra - rb;
    return String(a.id).localeCompare(String(b.id));
  });

  return { success: true, rows: rows, count: rows.length, sheetName: SHEET_NAME_AI_KNOWLEDGE };
}

function makeKnowledgeId_() {
  const tz = Session.getScriptTimeZone();
  return "KB-" + Utilities.formatDate(new Date(), tz, "yyMMddHHmmss");
}

function saveKnowledge_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canManageKnowledge_(auth.user)) return { success: false, message: "ليس لديك صلاحية حفظ معرفة واتس AI." };

  const sheet = ensureAiKnowledgeSheet_();
  const h = headersMap_(sheet);
  const id = normalize_(e.parameter.id) || makeKnowledgeId_();
  const title = normalize_(e.parameter.title);
  const content = normalize_(e.parameter.content);

  if (!title || !content) return { success: false, message: "العنوان والمحتوى مطلوبين." };

  let rowNumber = 0;
  if (sheet.getLastRow() > 1) {
    const colId = firstCol_(h, ["ID"], 1);
    const ids = sheet.getRange(2, colId, sheet.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (normalize_(ids[i][0]) === id) {
        rowNumber = i + 2;
        break;
      }
    }
  }

  const values = {
    "ID": id,
    "القسم": normalize_(e.parameter.category) || "قواعد التشغيل",
    "العنوان": title,
    "المفتاح": normalize_(e.parameter.key),
    "الكلمات المفتاحية": normalize_(e.parameter.keywords),
    "النص": content,
    "المحتوى": content,
    "الأولوية": normalize_(e.parameter.priority) || "عادية",
    "مفعل؟": normalize_(e.parameter.active) || "نعم",
    "آخر تحديث": new Date(),
    "بواسطة": auth.user.username,
    "ملاحظات": normalize_(e.parameter.notes)
  };

  if (rowNumber) updateByHeaders_(sheet, rowNumber, values, false);
  else appendByHeaders_(sheet, values);

  SpreadsheetApp.flush();
  return { success: true, message: "تم حفظ قاعدة المعرفة.", id: id };
}

function getKnowledgeContext_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canManageKnowledge_(auth.user)) return { success: false, message: "ليس لديك صلاحية عرض سياق المعرفة." };
  return { success: true, context: buildAiKnowledgeContext_() };
}

function buildAiKnowledgeContext_() {
  const sheet = ensureAiKnowledgeSheet_();
  if (sheet.getLastRow() < 2) initAiKnowledgeNow();
  const data = sheet.getDataRange().getValues();
  const h = headersMap_(sheet);
  const activeRows = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const active = normalize_(valueAt_(row, firstCol_(h, ["مفعل؟"], 7))) || "نعم";
    if (active !== "نعم") continue;
    const category = normalize_(valueAt_(row, firstCol_(h, ["القسم"], 2)));
    const title = normalize_(valueAt_(row, firstCol_(h, ["العنوان"], 3)));
    const content = normalize_(valueAt_(row, firstCol_(h, ["النص", "المحتوى"], 6)));
    if (!title || !content) continue;
    activeRows.push("[" + category + "] " + title + ": " + content);
  }

  return activeRows.join("\n");
}


/*********************** قراءة عامة لقوالب معرفة واتس AI ***********************/

function getAiKnowledge_(e) {
  e = e || { parameter: {} };
  const sheet = ensureAiKnowledgeSheet_();
  if (sheet.getLastRow() < 2) initAiKnowledgeNow();

  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return { success: true, count: 0, knowledge: [] };

  const h = headersMap_(sheet);
  const rows = [];

  const colId = firstCol_(h, ["ID"], 1);
  const colCategory = firstCol_(h, ["القسم"], 2);
  const colTitle = firstCol_(h, ["العنوان"], 3);
  const colKey = firstCol_(h, ["المفتاح", "key"], 4);
  const colKeywords = firstCol_(h, ["الكلمات المفتاحية"], 5);
  const colText = firstCol_(h, ["النص", "المحتوى"], 6);
  const colPriority = firstCol_(h, ["الأولوية"], 7);
  const colActive = firstCol_(h, ["مفعل؟", "مفعل"], 8);
  const colUpdated = firstCol_(h, ["آخر تحديث"], 9);
  const colBy = firstCol_(h, ["بواسطة"], 10);
  const colNotes = firstCol_(h, ["ملاحظات"], 11);

  const keyFilter = normalize_(e.parameter.key || e.parameter.title || e.parameter.keyword || "");
  const qFilter = searchKey_(e.parameter.q || e.parameter.query || "");
  const sectionFilter = normalize_(e.parameter.section || e.parameter.category || "");

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const id = normalize_(valueAt_(row, colId));
    const section = normalize_(valueAt_(row, colCategory));
    const title = normalize_(valueAt_(row, colTitle));
    const key = normalize_(valueAt_(row, colKey));
    const keywords = normalize_(valueAt_(row, colKeywords));
    let text = normalize_(valueAt_(row, colText));
    const active = normalize_(valueAt_(row, colActive)) || "نعم";

    if (!text) text = findLongestKnowledgeTextInRow_(row);
    if (!id && !title && !key && !text) continue;
    if (active !== "نعم") continue;
    if (sectionFilter && section !== sectionFilter) continue;

    const blob = searchKey_([id, section, title, key, keywords, text].join(" "));
    if (keyFilter) {
      const wanted = searchKey_(keyFilter);
      const directKey = searchKey_(key);
      if (directKey !== wanted && blob.indexOf(wanted) === -1) continue;
    }
    if (qFilter && blob.indexOf(qFilter) === -1) continue;

    rows.push({
      id: id,
      section: section,
      title: title,
      key: key,
      keywords: keywords,
      text: text,
      priority: normalize_(valueAt_(row, colPriority)),
      active: active,
      updatedAt: valueAt_(row, colUpdated),
      by: normalize_(valueAt_(row, colBy)),
      notes: normalize_(valueAt_(row, colNotes))
    });
  }

  return { success: true, count: rows.length, knowledge: rows };
}

function renderAiTemplate_(e) {
  e = e || { parameter: {} };
  const p = e.parameter || {};
  const key = normalize_(p.key || p.title || p.template || "");
  if (!key) return { success: false, message: "اكتب key للقالب المطلوب." };

  const templateItem = findAiTemplateByKey_(key);
  if (!templateItem) return { success: false, message: "لم أجد قالب معرفة بالمفتاح: " + key };

  let text = templateItem.text || "";
  const settings = getAiSettingsMap_();

  const vars = {
    customer_name: normalize_(p.customer_name || p.customerName || p.customer || "العميل"),
    order_id: normalize_(p.order_id || p.orderId || p.order || ""),
    line_id: normalize_(p.line_id || p.lineId || ""),
    department: normalize_(p.department || p.dept || ""),
    item_name: normalize_(p.item_name || p.itemName || p.item || ""),
    status: normalize_(p.status || ""),
    expected_delivery: normalize_(p.expected_delivery || p.expectedDelivery || p.expectedDeliveryText || ""),
    business_name: normalize_(settings.brand_name || settings.business_name || "Trend Mall"),
    phone: cleanPhone_(p.phone || p.customerPhone || "")
  };

  Object.keys(vars).forEach(function(name) {
    text = text.replace(new RegExp("\\{" + name + "\\}", "g"), vars[name]);
  });

  text = text
    .replace(/\{اسم_العميل\}/g, vars.customer_name)
    .replace(/\{رقم_الأوردر\}/g, vars.order_id)
    .replace(/\{القسم\}/g, vars.department)
    .replace(/\{نوع_الشغل\}/g, vars.item_name)
    .replace(/\{الحالة\}/g, vars.status)
    .replace(/\{التسليم_المتوقع\}/g, vars.expected_delivery)
    .replace(/\{اسم_البيزنس\}/g, vars.business_name);

  return {
    success: true,
    key: key,
    matchedKey: templateItem.key,
    title: templateItem.title,
    message: text,
    variables: vars
  };
}

function findAiTemplateByKey_(key) {
  const wanted = searchKey_(key);
  const res = getAiKnowledge_({ parameter: {} });
  if (!res.success || !res.knowledge) return null;

  for (let i = 0; i < res.knowledge.length; i++) {
    const item = res.knowledge[i];
    const directKey = searchKey_(item.key || "");
    if (directKey && directKey === wanted) return item;

    const blob = searchKey_([item.id, item.title, item.keywords].join(" "));
    if (blob === wanted || blob.indexOf(wanted) !== -1) return item;
  }
  return null;
}

function getAiSettings_(e) {
  const settings = getAiSettingsMap_();
  const rows = [];
  Object.keys(settings).forEach(function(k) {
    rows.push({ key: k, value: settings[k] });
  });
  return { success: true, count: rows.length, settings: settings, rows: rows };
}

function getAiSettingsMap_() {
  const sheet = ensureAiSettingsSheet_();
  const values = sheet.getDataRange().getDisplayValues();
  const settings = {};
  for (let i = 1; i < values.length; i++) {
    const key = normalize_(values[i][0]);
    const value = normalize_(values[i][1]);
    if (key) settings[key] = value;
  }
  return settings;
}

function findLongestKnowledgeTextInRow_(row) {
  let best = "";
  row.forEach(function(cell) {
    const s = normalize_(cell);
    if (!s) return;
    if (s.length <= best.length) return;
    if (s.indexOf("KB-") === 0) return;
    if (s === "نعم" || s === "لا" || s === "عالية" || s === "عادية" || s === "System") return;
    best = s;
  });
  return best;
}

function logAiWhatsApp_(phone, customerName, incoming, reply, intent, orderId, notes) {
  const sheet = ensureAiLogSheet_();
  appendByHeaders_(sheet, {
    "التاريخ": new Date(),
    "رقم العميل": cleanPhone_(phone),
    "اسم العميل": customerName || "",
    "رسالة العميل": incoming || "",
    "رد AI": reply || "",
    "نوع النية": intent || "",
    "رقم الأوردر": orderId || "",
    "ملاحظات": notes || ""
  });
}

/*********************** نهاية معرفة واتس AI - V1823 ***********************/

/************************************************************
 * V1828 - بنود تسعير الفاتورة بعد انتهاء القسم
 ************************************************************/



/************************************************************
 * Patch 15 - نوت مطبعجي مستقل عن قاعدة واتس AI
 ************************************************************/
function ensureMatbagyNotesSheet_() {
  return mbEnsureSheet_("نوت مطبعجي", ["ID", "وقت الحفظ", "القسم", "العنوان", "النوت", "حفظ بواسطة", "آخر تحديث"]);
}

function getMatbagyNotes_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  const sheet = ensureMatbagyNotesSheet_();
  const rows = accSheetRows_(sheet).slice(-80).reverse().map(function(r) {
    return {
      id: r["ID"] || r.id || "",
      category: r["القسم"] || "عام",
      title: r["العنوان"] || "",
      content: r["النوت"] || "",
      by: r["حفظ بواسطة"] || "",
      time: r["وقت الحفظ"] ? String(r["وقت الحفظ"]) : ""
    };
  });
  return { success: true, notes: rows };
}

function saveMatbagyNote_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  const title = normalize_(e.parameter.title);
  const content = normalize_(e.parameter.content);
  if (!content) return { success: false, message: "اكتب النوت." };
  const now = new Date();
  appendByHeaders_(ensureMatbagyNotesSheet_(), {
    "ID": "NOTE-" + Utilities.getUuid().slice(0, 8),
    "وقت الحفظ": now,
    "القسم": normalize_(e.parameter.category) || "عام",
    "العنوان": title || ("نوت مطبعجي - " + (normalize_(e.parameter.category) || "الجميع")),
    "النوت": content,
    "حفظ بواسطة": auth.user.username || auth.user.name || "موظف",
    "آخر تحديث": now
  });
  return { success: true, message: "تم حفظ النوت في شيت نوت مطبعجي." };
}

/************************************************************
 * Patch 11 - حسابات مطبعجي حسب القسم
 ************************************************************/

function accMaterialsHeaders_() {
  return ["ID", "وقت التسجيل", "القسم", "اسم الخامة", "نوع الخامة", "تصنيف الخامة", "ضم إلى مصروفات التشغيل", "بند التشغيل", "طريقة توزيع التشغيل", "قيمة التشغيل", "الوحدة", "رصيد المخزن", "حد تنبيه النقص", "سعر الوحدة", "تكلفة محسوبة", "سعر بيع رسمي", "سعر الباكو", "عدد الورق في الباكو", "تكلفة الورقة", "مقاس الورقة", "عرض الخام", "طول الخام", "نسبة الهالك", "مقاس ناتج الخامة", "عدد الناتج من الخامة الأساسية", "استهلاك من الأصل للوحدة", "طريقة حساب المخزون", "وحدة خصم المخزون", "مكونات الخامة", "معادلة التكلفة", "ملاحظات", "مفعل", "مسجل بواسطة", "آخر تحديث", "آخر حساب"];
}

function accTemplatesHeaders_() {
  return ["ID", "وقت التسجيل", "القسم", "التصنيف", "اسم البند", "المقاس", "الخامة", "الناتج", "تكلفة حبر", "تكلفة ثابتة", "تكلفة محسوبة", "سعر بيع مقترح", "مكونات الصنف", "ملاحظات", "مفعل", "مسجل بواسطة", "آخر تحديث"];
}

function accDeptLinesHeaders_() {
  return ["ID", "وقت التسجيل", "رقم الأوردر", "رقم البند", "اسم العميل", "القسم", "نوع البند", "اسم البند", "الكمية", "الخامة", "استهلاك الخامة", "تكلفة الخامة", "تكلفة تشغيل", "تكلفة أخرى", "إجمالي التكلفة", "تكلفة النظام", "سعر النظام", "فرق السعر", "تكلفة التالف", "تعويض التالف", "باقي على الموظف", "سعر البيع", "الربح", "قسم الصنف", "بند مشترك", "حالة الفوترة", "حالة اعتماد القسم", "اعتمد القسم بواسطة", "وقت اعتماد القسم", "دفعة اعتماد القسم", "ملاحظات اعتماد القسم", "مسحوب للفاتورة النهائية؟", "ملاحظات", "مسجل بواسطة", "حالة التقفيل", "رقم الفاتورة النهائية", "آخر تحديث"];
}

function accFinalInvoicesHeaders_() {
  return ["رقم الفاتورة", "وقت التقفيل", "رقم الأوردر", "اسم العميل", "بنود الأقسام", "بند يدوي", "قيمة بند يدوي", "الإجمالي قبل الخصم", "الخصم", "الإجمالي النهائي", "المدفوع", "الباقي", "الحالة", "قفل بواسطة", "ملاحظات", "آخر تحديث"];
}

function accWasteHeaders_() {
  return ["ID", "وقت التسجيل", "رقم الأوردر", "رقم البند", "القسم", "اسم البند", "نوع الهالك", "سعر النظام", "سعر مسجل", "فرق السعر", "تكلفة التالف", "تعويض التالف", "الباقي", "مسجل بواسطة", "ملاحظات", "آخر تحديث"];
}

function accStockMovesHeaders_() {
  return ["ID", "وقت الحركة", "نوع الحركة", "رقم الأوردر", "رقم البند", "القسم", "اسم البند", "الخامة", "كمية واردة", "كمية منصرفة", "رصيد قبل الحركة", "رصيد بعد الحركة", "مسجل بواسطة", "ملاحظات"];
}

function ensureAccountingSheets_() {
  const materials = mbEnsureSheet_(SHEET_NAME_ACC_MATERIALS, accMaterialsHeaders_());
  const templates = mbEnsureSheet_(SHEET_NAME_ACC_TEMPLATES, accTemplatesHeaders_());
  const deptLines = mbEnsureSheet_(SHEET_NAME_ACC_DEPT_LINES, accDeptLinesHeaders_());
  const finalInvoices = mbEnsureSheet_(SHEET_NAME_ACC_FINAL_INVOICES, accFinalInvoicesHeaders_());
  const waste = mbEnsureSheet_(SHEET_NAME_ACC_WASTE, accWasteHeaders_());
  const stockMoves = mbEnsureSheet_(SHEET_NAME_ACC_STOCK_MOVES, accStockMovesHeaders_());
  ensureHeaderIfAnyMissing_(templates, ["تكلفة محسوبة", "مكونات الصنف"]);
  ensureHeaderIfAnyMissing_(deptLines, ["تفاصيل المكونات", "تفاصيل حاسبة الليزر", "مساحة مستهلكة", "نسبة الهالك", "مخزون مخصوم؟", "وقت خصم المخزون"]);
  ensureHeaderIfAnyMissing_(finalInvoices, ["مفتاح العملية", "حالة العكس المالي", "وقت العكس المالي"]);
  ensureHeaderIfAnyMissing_(stockMoves, ["كمية واردة", "كمية منصرفة"]);
  seedAccountingTemplates_(templates);
  return { materials: materials, templates: templates, deptLines: deptLines, finalInvoices: finalInvoices, waste: waste, stockMoves: stockMoves };
}

function seedAccountingTemplates_(sheet) {
  if (!sheet || sheet.getLastRow() > 1) return;
  try { if (PropertiesService.getDocumentProperties().getProperty("MATBAGY_ACCOUNTING_ZERO_RESET") === "1") return; } catch(err) {}
  const now = new Date();
  const rows = [
    ["ACC-TPL-001", now, "طباعة", "لامنيشن", "كارت 15×21 من رول لامينشن", "15×21", "رول لامينشن", "", "", "", "", "املأ عدد الكروت التي يخرجها الرول", "نعم", "النظام", now],
    ["ACC-TPL-002", now, "طباعة", "لامنيشن", "كارت 20×30 من رول لامينشن", "20×30", "رول لامينشن", "", "", "", "", "", "نعم", "النظام", now],
    ["ACC-TPL-003", now, "طباعة", "لامنيشن", "تابلوه 30×40 من رول لامينشن", "30×40", "رول لامينشن", "", "", "", "", "", "نعم", "النظام", now],
    ["ACC-TPL-004", now, "طباعة", "لامنيشن", "تابلوه 40×50 من رول لامينشن", "40×50", "رول لامينشن", "", "", "", "", "", "نعم", "النظام", now],
    ["ACC-TPL-005", now, "طباعة", "لامنيشن", "تابلوه 50×60 من رول لامينشن", "50×60", "رول لامينشن", "", "", "", "", "", "نعم", "النظام", now],
    ["ACC-TPL-006", now, "طباعة", "لامنيشن", "تابلوه 60×90 من رول لامينشن", "60×90", "رول لامينشن", "", "", "", "", "", "نعم", "النظام", now],
    ["ACC-TPL-007", now, "طباعة", "رولات طباعة", "رول طباعة 30 سم", "30 سم", "رول طباعة", "", "", "", "", "", "نعم", "النظام", now],
    ["ACC-TPL-008", now, "طباعة", "رولات طباعة", "رول طباعة 50 سم", "50 سم", "رول طباعة", "", "", "", "", "", "نعم", "النظام", now],
    ["ACC-TPL-009", now, "طباعة", "رولات طباعة", "رول طباعة 60 سم", "60 سم", "رول طباعة", "", "", "", "", "", "نعم", "النظام", now],
    ["ACC-TPL-010", now, "طباعة", "حبر بلوتر", "استهلاك حبر بلوتر", "متر/سم", "حبر بلوتر", "", "", "", "", "حدد تكلفة الحبر حسب المقاس", "نعم", "النظام", now],
    ["ACC-TPL-011", now, "مشترك", "ماكيت / سنيور مشترك", "بند مشترك ماكيت / سنيور", "حسب الشغل", "طباعة + ليزر", "", "", "", "", "كل قسم يسجل الجزء الخاص به ثم يتم التجميع النهائي", "نعم", "النظام", now]
  ];
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function accountingUserMode_(user) {
  const key = searchKey_(user.username || user.name || "");
  const role = roleFromArabic_(user.role, user.department);
  if (role === "admin" || key.indexOf("ضياء") !== -1 || key.indexOf("diaa") !== -1) return "full";
  if (key.indexOf("رحمه") !== -1 || key.indexOf("رحمة") !== -1 || key.indexOf("rahma") !== -1 || key.indexOf("ريفان") !== -1 || key.indexOf("ريڤان") !== -1 || key.indexOf("revan") !== -1 || key.indexOf("rivan") !== -1) return "final";
  if (role === "print" || key.indexOf("وائل") !== -1 || key.indexOf("wael") !== -1) return "print";
  if (role === "laser" || key.indexOf("جابر") !== -1 || key.indexOf("gaber") !== -1 || key.indexOf("jaber") !== -1) return "laser";
  return "none";
}

function accountingDepartmentForMode_(mode) {
  if (mode === "print") return "طباعة";
  if (mode === "laser") return "ليزر";
  return "";
}

function accountingAuthorize_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { ok: false, message: auth.message };
  const mode = accountingUserMode_(auth.user);
  if (mode === "none") return { ok: false, message: "ليس لديك صلاحية حسابات مطبعجي." };
  auth.mode = mode;
  auth.department = accountingDepartmentForMode_(mode);
  return auth;
}

function accSheetRows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const h = headersMap_(sheet);
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return data.map(function(row, idx) {
    const obj = { rowNumber: idx + 2 };
    Object.keys(h).forEach(function(header) {
      obj[header] = valueAt_(row, h[header]);
    });
    // أسماء انجليزية مريحة للواجهة
    obj.id = obj["ID"] || obj["رقم الفاتورة"] || "";
    obj.department = obj["القسم"] || "";
    obj.materialName = obj["اسم الخامة"] || obj["الخامة"] || "";
    obj.unit = obj["الوحدة"] || "";
    obj.stockQty = obj["رصيد المخزن"] || "";
    obj.minStock = obj["حد تنبيه النقص"] || "";
    obj.unitCost = obj["سعر الوحدة"] || "";
    obj.computedUnitCost = obj["تكلفة محسوبة"] || obj["سعر الوحدة"] || "";
    obj.materialKind = obj["نوع الخامة"] || "";
    obj.materialClass = obj["تصنيف الخامة"] || "";
    obj.operationExpense = obj["ضم إلى مصروفات التشغيل"] || "";
    obj.operatingBand = obj["بند التشغيل"] || "";
    obj.operatingCalcMethod = obj["طريقة توزيع التشغيل"] || "";
    obj.operatingUnitCost = obj["قيمة التشغيل"] || "";
    obj.componentsJson = obj["مكونات الصنف"] || obj["مكونات الخامة"] || "";
    obj.formula = obj["معادلة التكلفة"] || "";
    obj.notes = obj["ملاحظات"] || "";
    obj.width = obj["عرض الخام"] || "";
    obj.height = obj["طول الخام"] || "";
    obj.wastePercent = obj["نسبة الهالك"] || "";
    obj.outputSize = obj["مقاس ناتج الخامة"] || "";
    obj.outputCount = obj["عدد الناتج من الخامة الأساسية"] || obj["الناتج"] || "";
    obj.unitConsumption = obj["استهلاك من الأصل للوحدة"] || "";
    obj.stockMode = obj["طريقة حساب المخزون"] || "";
    obj.stockDeductUnit = obj["وحدة خصم المخزون"] || "";
    obj.category = obj["التصنيف"] || "";
    obj.itemName = obj["اسم البند"] || "";
    obj.catalogItemId = obj["كود الصنف"] || "";
    obj.size = obj["المقاس"] || "";
    obj.outputCount = obj["الناتج"] || "";
    obj.inkCost = obj["تكلفة حبر"] || "";
    obj.fixedCost = obj["تكلفة محسوبة"] || obj["تكلفة ثابتة"] || "";
    obj.salePrice = obj["سعر البيع"] || obj["سعر بيع مقترح"] || obj["سعر بيع رسمي"] || "";
    obj.unitSalePrice = obj["سعر الوحدة"] || "";
    obj.packPrice = obj["سعر الباكو"] || "";
    obj.packSheets = obj["عدد الورق في الباكو"] || "";
    obj.sheetCost = obj["تكلفة الورقة"] || "";
    obj.paperSize = obj["مقاس الورقة"] || "";
    obj.orderId = obj["رقم الأوردر"] || "";
    obj.lineId = obj["رقم البند"] || "";
    obj.customerName = obj["اسم العميل"] || "";
    if (obj["سعر البيع"] !== undefined && obj["سعر البيع"] !== "") {
      obj.lineTotal = parseMoney_(obj["سعر البيع"]);
      if (!obj.unitSalePrice) obj.unitSalePrice = obj.lineTotal / (parseMoney_(obj["الكمية"]) || 1);
    }
    obj.itemType = obj["نوع البند"] || "";
    obj.itemDepartment = obj["قسم الصنف"] || "";
    obj.sharedLine = obj["بند مشترك"] || "";
    obj.billingStatus = obj["حالة الفوترة"] || "";
    obj.totalCost = obj["إجمالي التكلفة"] || "";
    obj.materialCost = obj["تكلفة الخامة"] || "";
    obj.systemCost = obj["تكلفة النظام"] || "";
    obj.priceDiff = obj["فرق السعر"] || "";
    obj.damageCost = obj["تكلفة التالف"] || "";
    obj.damageCovered = obj["تعويض التالف"] || "";
    obj.damageRemaining = obj["باقي على الموظف"] || "";
    obj.reason = obj["نوع الهالك"] || "";
    obj.amount = obj["تكلفة التالف"] || obj["فرق السعر"] || "";
    obj.paid = obj["تعويض التالف"] || "";
    obj.closeStatus = obj["حالة التقفيل"] || "";
    obj.invoiceNo = obj["رقم الفاتورة"] || obj["رقم الفاتورة النهائية"] || "";
    obj.finalTotal = obj["الإجمالي النهائي"] || "";
    obj.paid = obj["المدفوع"] || "";
    obj.remaining = obj["الباقي"] || "";
    obj.createdBy = obj["مسجل بواسطة"] || obj["قفل بواسطة"] || "";
    obj.createdAt = obj["وقت الحركة"] || obj["وقت التسجيل"] || "";
    obj.moveType = obj["نوع الحركة"] || "";
    obj.qtyIn = obj["كمية واردة"] || "";
    obj.qtyOut = obj["كمية منصرفة"] || "";
    obj.inQty = parseMoney_(obj.qtyIn) || (parseMoney_(obj.qtyOut) < 0 ? Math.abs(parseMoney_(obj.qtyOut)) : "");
    obj.outQty = parseMoney_(obj.qtyOut) > 0 ? parseMoney_(obj.qtyOut) : "";
    obj.balanceBefore = obj["رصيد قبل الحركة"] || "";
    obj.balanceAfter = obj["رصيد بعد الحركة"] || "";
    obj.balance = obj.balanceAfter;
    obj.source = obj.moveType || obj["ملاحظات"] || "";
    return obj;
  });
}

function accountingFilterRows_(rows, auth, kind) {
  const mode = auth.mode;
  if (mode === "full") return rows;
  if (mode === "final") {
    if (kind === "deptLines") return rows;
    if (kind === "finalInvoices") return rows;
    return rows.filter(function(r) { const d = normalize_(r.department); return d === "مشترك" || d === "عام"; });
  }
  const dept = auth.department;
  return rows.filter(function(r) {
    const d = normalize_(r.department || r["القسم"]);
    return d === dept || d === "مشترك" || d === "عام";
  });
}

function accountingSummary_(deptLines) {
  const map = {};
  deptLines.forEach(function(r) {
    const dept = normalize_(r.department || r["القسم"]) || "غير محدد";
    if (!map[dept]) map[dept] = { department: dept, sales: 0, cost: 0, profit: 0, count: 0 };
    const sales = parseMoney_(r.salePrice || r["سعر البيع"]);
    const cost = parseMoney_(r.totalCost || r["إجمالي التكلفة"]);
    map[dept].sales += sales;
    map[dept].cost += cost;
    map[dept].profit += (sales - cost);
    map[dept].count += 1;
  });
  return { byDepartment: Object.keys(map).map(function(k) { return map[k]; }) };
}

function initAccountingNow_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  ensureAccountingSheets_();
  SpreadsheetApp.flush();
  return { success: true, message: "تم تجهيز شيتات حسابات مطبعجي: الخامات، البنود، فواتير الأقسام، الفواتير النهائية، هوالك الأقسام، وحركة المخزون." };
}

function getAccounting_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  const sheets = ensureAccountingSheets_();
  const materials = accountingFilterRows_(accSheetRows_(sheets.materials), auth, "materials");
  const templates = accountingFilterRows_(accSheetRows_(sheets.templates), auth, "templates");
  const deptLinesAll = accSheetRows_(sheets.deptLines);
  const deptLines = accountingFilterRows_(deptLinesAll, auth, "deptLines");
  const finalInvoices = accountingFilterRows_(accSheetRows_(sheets.finalInvoices), auth, "finalInvoices");
  const wasteLines = accountingFilterRows_(accSheetRows_(sheets.waste), auth, "deptLines");
  const stockMoves = accountingFilterRows_(accSheetRows_(sheets.stockMoves), auth, "deptLines");
  return {
    success: true,
    permissions: { mode: auth.mode, department: auth.department, canManageMaterials: auth.mode === "full", canCloseFinalInvoice: auth.mode === "full" || auth.mode === "final", canEnterDeptLine: auth.mode === "full" || auth.mode === "print" || auth.mode === "laser" },
    materials: materials,
    templates: templates,
    deptLines: deptLines,
    finalInvoices: finalInvoices,
    wasteLines: wasteLines,
    stockMoves: stockMoves,
    summary: auth.mode === "full" ? accountingSummary_(deptLinesAll) : accountingSummary_(deptLines)
  };
}


function accountingMaterialKey_(name) {
  return searchKey_(normalize_(name || ""));
}

function accountingFindMaterialRow_(sheet, name, department) {
  const h = headersMap_(sheet);
  const data = sheet.getDataRange().getValues();
  const key = accountingMaterialKey_(name);
  const dept = normalize_(department || "");
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowName = accountingMaterialKey_(valueAt_(row, h[normalizeKey_("اسم الخامة")]));
    const rowDept = normalize_(valueAt_(row, h[normalizeKey_("القسم")]));
    if (rowName === key && (!dept || rowDept === dept)) return i + 1;
  }
  return 0;
}

function accountingFindTemplateRow_(sheet, name, department) {
  if (!sheet) return 0;
  const h = headersMap_(sheet);
  const data = sheet.getDataRange().getValues();
  const key = accountingMaterialKey_(name);
  const dept = normalize_(department || "");
  const colName = firstCol_(h, ["اسم البند", "اسم الصنف", "itemName", "templateName"], 0);
  const colDept = firstCol_(h, ["القسم", "department"], 0);
  if (!colName || !key) return 0;
  for (let i = 1; i < data.length; i++) {
    const rowName = accountingMaterialKey_(valueAt_(data[i], colName));
    const rowDept = colDept ? normalize_(valueAt_(data[i], colDept)) : "";
    if (rowName === key && (!dept || rowDept === dept)) return i + 1;
  }
  return 0;
}


function accountingFindMaterialRowById_(sheet, id) {
  id = normalize_(id || "");
  if (!sheet || !id) return 0;
  const h = headersMap_(sheet);
  const colId = h[normalizeKey_("ID")];
  if (!colId || sheet.getLastRow() < 2) return 0;
  const values = sheet.getRange(2, colId, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (normalize_(values[i][0]) === id) return i + 2;
  }
  return 0;
}

function accountingParseComponents_(value) {
  value = normalize_(value || "");
  if (!value) return [];
  try {
    const arr = JSON.parse(value);
    return Array.isArray(arr) ? arr : [];
  } catch (err) {
    return [];
  }
}

function accountingRecalculateMaterialsSheet_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return 0;
  mbEnsureSheet_(SHEET_NAME_ACC_MATERIALS, accMaterialsHeaders_());
  const h = headersMap_(sheet);
  const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  const data = dataRange.getValues();
  const colName = h[normalizeKey_("اسم الخامة")];
  const colUnitCost = h[normalizeKey_("سعر الوحدة")];
  const colComputed = h[normalizeKey_("تكلفة محسوبة")];
  const colKind = h[normalizeKey_("نوع الخامة")];
  const colComponents = h[normalizeKey_("مكونات الخامة")];
  const colLastCalc = h[normalizeKey_("آخر حساب")];
  const now = new Date();
  const costMap = {};

  data.forEach(function(row) {
    const name = accountingMaterialKey_(valueAt_(row, colName));
    if (!name) return;
    const baseCost = parseMoney_(valueAt_(row, colComputed)) || parseMoney_(valueAt_(row, colUnitCost));
    costMap[name] = baseCost;
  });

  for (let pass = 0; pass < 5; pass++) {
    data.forEach(function(row) {
      const name = accountingMaterialKey_(valueAt_(row, colName));
      if (!name) return;
      const kind = normalize_(valueAt_(row, colKind));
      const comps = accountingParseComponents_(valueAt_(row, colComponents));
      let total = parseMoney_(valueAt_(row, colUnitCost));
      if (kind === "composite" || kind === "خامة بمكونات" || comps.length) {
        total = 0;
        comps.forEach(function(c) {
          const cKey = accountingMaterialKey_(c.materialName || c.name || c["اسم الخامة"]);
          const qty = parseMoney_(c.qty || c.quantity || c["استهلاك"]);
          const extra = parseMoney_(c.extraCost || c.extra || c["تكلفة إضافية"]);
          total += (qty * (costMap[cKey] || 0)) + extra;
        });
      }
      costMap[name] = total;
    });
  }

  let updated = 0;
  data.forEach(function(row, idx) {
    const name = accountingMaterialKey_(valueAt_(row, colName));
    if (!name) return;
    const total = costMap[name] || 0;
    if (colComputed) row[colComputed - 1] = total;
    const kind = normalize_(valueAt_(row, colKind));
    const comps = accountingParseComponents_(valueAt_(row, colComponents));
    if ((kind === "composite" || comps.length) && colUnitCost) row[colUnitCost - 1] = total;
    if (colLastCalc) row[colLastCalc - 1] = now;
    updated++;
  });
  dataRange.setValues(data);
  SpreadsheetApp.flush();
  return updated;
}

function recalculateAccountingMaterials_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (auth.mode !== "full") return { success: false, message: "تحديث الخامات عند ضياء فقط." };
  const sheet = ensureAccountingSheets_().materials;
  const count = accountingRecalculateMaterialsSheet_(sheet);
  return { success: true, message: "تم تحديث تكلفة " + count + " خامة بنفس المعادلات." };
}

function saveAccountingMaterial_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (auth.mode !== "full") return { success: false, message: "إضافة الخامات عند ضياء فقط." };
  const name = normalize_(e.parameter.materialName);
  if (!name) return { success: false, message: "اسم الخامة مطلوب." };
  const sheet = ensureAccountingSheets_().materials;
  const now = new Date();
  const department = normalize_(e.parameter.department) || "طباعة";
  const kind = normalize_(e.parameter.materialKind) || "raw";
  const packPriceFix5 = parseMoney_(e.parameter.packPrice || e.parameter.rawPackPrice || 0);
  const packSheetsFix5 = parseMoney_(e.parameter.packSheets || e.parameter.rawPackSheets || 0);
  const paperPackFix5 = (kind === "paper pack" || kind === "باكيت ورق" || kind === "paper_pack");
  if (paperPackFix5 && packPriceFix5 && packSheetsFix5) {
    e.parameter.unitCost = packPriceFix5 / packSheetsFix5;
    e.parameter.calculatedUnitCost = packPriceFix5 / packSheetsFix5;
    e.parameter.outputCount = packSheetsFix5;
    e.parameter.unit = "ورقة";
    e.parameter.notes = normalize_(e.parameter.notes || "") + "\n[Fix5 باكيت ورق] سعر الباكو: " + packPriceFix5 + " / عدد الورق: " + packSheetsFix5 + " / تكلفة الورقة: " + (packPriceFix5 / packSheetsFix5);
  }
  const comps = normalize_(e.parameter.componentsJson || "");
  const calculated = parseMoney_(e.parameter.calculatedUnitCost) || parseMoney_(e.parameter.unitCost);
  const values = {
    "ID": "MAT-" + Utilities.getUuid().slice(0, 8),
    "وقت التسجيل": now,
    "القسم": department,
    "اسم الخامة": name,
    "نوع الخامة": kind,
    "تصنيف الخامة": normalize_(e.parameter.materialClass),
    "ضم إلى مصروفات التشغيل": normalize_(e.parameter.operationExpense),
    "بند التشغيل": normalize_(e.parameter.operatingBand),
    "طريقة توزيع التشغيل": normalize_(e.parameter.operatingCalcMethod),
    "قيمة التشغيل": parseMoney_(e.parameter.operatingUnitCost),
    "الوحدة": normalize_(e.parameter.unit),
    "رصيد المخزن": parseMoney_(e.parameter.stockQty),
    "حد تنبيه النقص": parseMoney_(e.parameter.minStock),
    "سعر الوحدة": parseMoney_(e.parameter.unitCost),
    "تكلفة محسوبة": calculated,
    "سعر بيع رسمي": parseMoney_(e.parameter.salePrice),
    "سعر الباكو": packPriceFix5 || parseMoney_(e.parameter.packPrice),
    "عدد الورق في الباكو": packSheetsFix5 || parseMoney_(e.parameter.packSheets),
    "تكلفة الورقة": paperPackFix5 ? calculated : parseMoney_(e.parameter.sheetCost || e.parameter.rawSheetCost),
    "مقاس الورقة": normalize_(e.parameter.paperSize || e.parameter.rawPaperSize),
    "عرض الخام": parseMoney_(e.parameter.width),
    "طول الخام": parseMoney_(e.parameter.height),
    "نسبة الهالك": parseMoney_(e.parameter.wastePercent),
    "مقاس ناتج الخامة": normalize_(e.parameter.outputSize),
    "عدد الناتج من الخامة الأساسية": parseMoney_(e.parameter.outputCount),
    "استهلاك من الأصل للوحدة": parseMoney_(e.parameter.unitConsumption),
    "طريقة حساب المخزون": normalize_(e.parameter.stockMode),
    "وحدة خصم المخزون": normalize_(e.parameter.stockDeductUnit),
    "مكونات الخامة": comps,
    "معادلة التكلفة": normalize_(e.parameter.formula),
    "ملاحظات": normalize_(e.parameter.notes),
    "مفعل": normalize_(e.parameter.active) || "نعم",
    "مسجل بواسطة": auth.user.username,
    "آخر تحديث": now,
    "آخر حساب": now
  };
  const materialId = normalize_(e.parameter.materialId || e.parameter.id || "");
  let existingRow = materialId ? accountingFindMaterialRowById_(sheet, materialId) : 0;
  if (!existingRow) existingRow = accountingFindMaterialRow_(sheet, name, department);
  if (existingRow) {
    delete values["ID"];
    delete values["وقت التسجيل"];
    updateByHeaders_(sheet, existingRow, values, true);
  } else {
    appendByHeaders_(sheet, values);
  }
  accountingRecalculateMaterialsSheet_(sheet);
  return { success: true, message: existingRow ? "تم تحديث الخامة وإعادة حساب الخامات المرتبطة بها." : "تم حفظ الخامة وإعادة حساب التكلفة." };
}

function saveAccountingTemplate_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (auth.mode !== "full") return { success: false, message: "إضافة البنود الثابتة عند ضياء فقط." };
  const itemName = normalize_(e.parameter.itemName || e.parameter.templateName || e.parameter.productName || e.parameter.name);
  if (!itemName) return { success: false, message: "اسم البند الثابت مطلوب." };
  const sheet = ensureAccountingSheets_().templates;
  const now = new Date();
  const department = normalize_(e.parameter.department) || "طباعة";
  const componentsJson = normalize_(e.parameter.componentsJson || e.parameter.components || "");
  const components = accountingParseComponents_(componentsJson);
  if (componentsJson && !components.length) return { success: false, message: "صيغة مكونات الصنف غير صحيحة." };
  const materialsSheet = ensureAccountingSheets_().materials;
  const safeComponents = [];
  for (let componentIndex = 0; componentIndex < components.length; componentIndex++) {
    const component = components[componentIndex] || {};
    const componentName = normalize_(component.materialName || component.material || component.name);
    const componentQty = parseMoney_(component.qty || component.quantity || component.consumption || component.unitConsumption || component["استهلاك"] || component["استهلاك من الأصل للوحدة"]);
    if (!componentName || componentQty <= 0) return { success: false, message: "كل مكون يجب أن يحتوي على اسم خامة وكمية أكبر من صفر." };
    if (!accountingFindMaterialRow_(materialsSheet, componentName, "")) return { success: false, message: "المكون غير مسجل ضمن الخامات الأساسية: " + componentName };
    safeComponents.push({ materialName: componentName, qty: componentQty });
  }
  const calculatedCost = safeComponents.length ? safeComponents.reduce(function(total, component){
    return total + (accountingMaterialUnitCost_(materialsSheet, component.materialName) * component.qty);
  }, 0) : parseMoney_(e.parameter.calculatedUnitCost || e.parameter.computedUnitCost || e.parameter.fixedCost || e.parameter.cost || e.parameter.unitCost);
  const values = {
    "ID": "TPL-" + Utilities.getUuid().slice(0, 8),
    "وقت التسجيل": now,
    "القسم": department,
    "التصنيف": normalize_(e.parameter.category || e.parameter.itemType || "صنف بيع"),
    "اسم البند": itemName,
    "المقاس": normalize_(e.parameter.size),
    "الخامة": normalize_(e.parameter.materialName),
    "الناتج": parseMoney_(e.parameter.outputCount),
    "تكلفة حبر": parseMoney_(e.parameter.inkCost),
    "تكلفة ثابتة": calculatedCost,
    "تكلفة محسوبة": calculatedCost,
    "سعر بيع مقترح": parseMoney_(e.parameter.salePrice || e.parameter.price || e.parameter.systemSale),
    "مكونات الصنف": safeComponents.length ? JSON.stringify(safeComponents) : "",
    "ملاحظات": normalize_(e.parameter.notes),
    "مفعل": normalize_(e.parameter.active) || "نعم",
    "مسجل بواسطة": auth.user.username,
    "آخر تحديث": now
  };
  let existingRow = 0;
  try { existingRow = accountingFindTemplateRow_(sheet, itemName, department); } catch(err) { existingRow = 0; }
  if (!existingRow) {
    try { existingRow = accountingFindTemplateRow_(sheet, itemName, ""); } catch(err2) { existingRow = 0; }
  }
  if (existingRow) {
    delete values["ID"];
    delete values["وقت التسجيل"];
    updateByHeaders_(sheet, existingRow, values, true);
    return { success: true, message: "الصنف موجود وتم تحديثه بدل إضافته مرة أخرى.", updated: true, rowNumber: existingRow, calculatedCost: calculatedCost, componentsJson: values["مكونات الصنف"], version: MATBAGY_ACCOUNTING_VERSION };
  }
  appendByHeaders_(sheet, values);
  return { success: true, message: "تم حفظ الصنف.", updated: false, calculatedCost: calculatedCost, componentsJson: values["مكونات الصنف"], version: MATBAGY_ACCOUNTING_VERSION };
}


function accountingMaterialCache_(sheet) {
  const h = headersMap_(sheet);
  const last = sheet.getLastRow();
  const data = last > 1 ? sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues() : [];
  const byName = {};
  data.forEach(function(row, idx) {
    const name = normalize_(valueAt_(row, h[normalizeKey_("اسم الخامة")]));
    if (!name) return;
    byName[accountingMaterialKey_(name)] = { row: row, rowNumber: idx + 2, name: name };
  });
  return { h: h, data: data, byName: byName, sheet: sheet };
}

function accountingComponentQty_(c) {
  return parseMoney_(c.qty || c.quantity || c.consumption || c.unitConsumption || c["استهلاك"] || c["استهلاك من الأصل للوحدة"]) || 1;
}

function accountingCollectStockRequirements_(cache, materialName, qty, req, path) {
  materialName = normalize_(materialName);
  qty = parseMoney_(qty) || 0;
  if (!materialName || !qty) return { ok: true };
  path = path || [];
  if (path.length > 12) return { ok: false, message: "توجد دائرة مغلقة في مكونات الخامات: " + path.join(" > ") };
  const key = accountingMaterialKey_(materialName);
  const info = cache.byName[key];
  if (!info) return { ok: false, message: "الخامة غير مسجلة في المخزن: " + materialName };
  const h = cache.h;
  const comps = accountingParseComponents_(valueAt_(info.row, h[normalizeKey_("مكونات الخامة")]));
  if (comps && comps.length) {
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i] || {};
      const cName = normalize_(c.materialName || c.name || c["اسم الخامة"] || c.material || c["الخامة"]);
      const cQty = accountingComponentQty_(c);
      if (!cName) continue;
      const r = accountingCollectStockRequirements_(cache, cName, qty * cQty, req, path.concat([materialName]));
      if (!r.ok) return r;
    }
    return { ok: true };
  }
  if (!req[key]) req[key] = { name: info.name, qty: 0, rowNumber: info.rowNumber };
  req[key].qty += qty;
  return { ok: true };
}

function accountingMaterialUnitCost_(sheet, materialName) {
  const cache = accountingMaterialCache_(sheet);
  const info = cache.byName[accountingMaterialKey_(materialName)];
  if (!info) return 0;
  const h = cache.h;
  return parseMoney_(valueAt_(info.row, h[normalizeKey_("تكلفة محسوبة")])) || parseMoney_(valueAt_(info.row, h[normalizeKey_("سعر الوحدة")])) || 0;
}

function accountingDeductMaterialStock_(sheets, materialName, qty, ctx) {
  materialName = normalize_(materialName);
  qty = parseMoney_(qty) || 0;
  if (!materialName || !qty) return { ok: true, message: "لا يوجد مخزون مرتبط بالبند." };
  const cache = accountingMaterialCache_(sheets.materials);
  const req = {};
  const collected = accountingCollectStockRequirements_(cache, materialName, qty, req, []);
  if (!collected.ok) return collected;
  const h = cache.h;
  const colStock = h[normalizeKey_("رصيد المخزن")];
  const colUpdate = h[normalizeKey_("آخر تحديث")];
  const missing = [];
  Object.keys(req).forEach(function(k) {
    const info = cache.byName[k];
    const available = parseMoney_(valueAt_(info.row, colStock));
    if (available + 0.000001 < req[k].qty) {
      missing.push(req[k].name + " مطلوب " + req[k].qty.toFixed(4) + " والمتاح " + available.toFixed(4));
    }
  });
  if (missing.length) return { ok: false, message: "لا يمكن استخراج " + (ctx.itemName || materialName) + "؛ ناقص: " + missing.join(" / ") };
  const now = ctx.now || new Date();
  Object.keys(req).forEach(function(k) {
    const info = cache.byName[k];
    const before = parseMoney_(valueAt_(info.row, colStock));
    const after = before - req[k].qty;
    if (colStock) sheets.materials.getRange(info.rowNumber, colStock).setValue(after);
    if (colUpdate) sheets.materials.getRange(info.rowNumber, colUpdate).setValue(now);
    appendByHeaders_(sheets.stockMoves, {
      "ID": "STK-" + Utilities.getUuid().slice(0, 8),
      "وقت الحركة": now,
      "نوع الحركة": "صرف تلقائي من فاتورة قسم",
      "رقم الأوردر": ctx.orderId || "",
      "رقم البند": ctx.lineId || "",
      "القسم": ctx.department || "",
      "اسم البند": ctx.itemName || "",
      "الخامة": req[k].name,
      "كمية منصرفة": req[k].qty,
      "رصيد قبل الحركة": before,
      "رصيد بعد الحركة": after,
      "مسجل بواسطة": ctx.username || "",
      "ملاحظات": ctx.notes || ""
    });
  });
  SpreadsheetApp.flush();
  return { ok: true, message: "تم خصم المخزون تلقائياً." };
}

function saveAccountingDeptLine_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!(auth.mode === "full" || auth.mode === "print" || auth.mode === "laser")) return { success: false, message: "تسجيل فاتورة القسم متاح لوائل وجابر وضياء فقط." };
  const orderId = normalize_(e.parameter.orderId);
  const itemName = normalize_(e.parameter.itemName);
  if (!orderId || !itemName) return { success: false, message: "رقم الأوردر واسم البند مطلوبين." };
  const sheets = ensureAccountingSheets_();
  ensureV1887DeptApprovalColumns_(sheets.deptLines);
  ensureHeaderIfAnyMissing_(sheets.deptLines, ["كود الصنف", "سعر الوحدة"]);
  let department = normalize_(e.parameter.department) || auth.department || "طباعة";
  if (auth.mode === "print") department = "طباعة";
  if (auth.mode === "laser") department = "ليزر";
  const qty = parseMoney_(e.parameter.qty) || 1;
  let materialName = normalize_(e.parameter.materialName);
  const now = new Date();
  const lineUniqueId = "DLINE-" + Utilities.getUuid().slice(0, 8);
  const templateId = normalize_(e.parameter.catalogItemId || e.parameter.templateId || e.parameter.itemId);
  let laserInput = {};
  let laserQuote = null;
  const laserJson = normalize_(e.parameter.laserDetailsJson || e.parameter.laserQuoteJson);
  if (laserJson) {
    try { laserInput = JSON.parse(laserJson); } catch (err) { return { success: false, message: "بيانات حاسبة الليزر غير صحيحة." }; }
    if (!laserInput || typeof laserInput !== "object" || Array.isArray(laserInput)) return { success: false, message: "بيانات حاسبة الليزر غير صحيحة." };
    laserInput.materialName = normalize_(laserInput.materialName || materialName);
    laserInput.qty = qty;
    laserQuote = accountingLaserQuoteCoreV1913_(sheets.materials, laserInput);
    if (!laserQuote.success) return laserQuote;
    materialName = laserQuote.materialName;
  }
  const templateComponents = accountingTemplateComponentsV1913_(sheets.templates, templateId, itemName, department);
  const componentDetails = templateComponents.map(function(component){
    const name = normalize_(component.materialName || component.material || component.name);
    const qtyPerUnit = accountingComponentQty_(component);
    const totalQty = qtyPerUnit * qty;
    const unitCost = accountingMaterialUnitCost_(sheets.materials, name);
    return { materialName: name, qtyPerUnit: qtyPerUnit, totalQty: totalQty, unitCost: unitCost, totalCost: unitCost * totalQty };
  }).filter(function(component){ return !!component.materialName; });
  const storedLaserDetails = laserQuote ? {
    materialName: laserQuote.materialName,
    sheetWidth: laserQuote.sheetWidth,
    sheetHeight: laserQuote.sheetHeight,
    pieceWidth: laserQuote.pieceWidth,
    pieceHeight: laserQuote.pieceHeight,
    qty: laserQuote.qty,
    wastePercent: laserQuote.wastePercent,
    consumedAreaPerPiece: laserQuote.consumedAreaPerPiece,
    consumedAreaTotal: laserQuote.consumedAreaTotal,
    estimatedPiecesPerSheet: laserQuote.estimatedPiecesPerSheet
  } : null;
  let materialCost = componentDetails.length ? componentDetails.reduce(function(total, component){ return total + component.totalCost; }, 0) : (laserQuote ? laserQuote.materialCostTotal : 0);
  if (!componentDetails.length && !laserQuote && materialName) materialCost = accountingMaterialUnitCost_(sheets.materials, materialName) * qty;
  const laborCost = parseMoney_(e.parameter.laborCost);
  const otherCost = parseMoney_(e.parameter.otherCost);
  const totalCost = materialCost + laborCost + otherCost;
  const systemCost = totalCost;
  const systemSale = parseMoney_(e.parameter.systemSalePrice || e.parameter.systemSale);
  const salePriceUnit = parseMoney_(e.parameter.salePrice || e.parameter.sale || e.parameter.unitSalePrice);
  const saleTotal = salePriceUnit * qty;
  const priceDiff = parseMoney_(e.parameter.priceDiff) || ((salePriceUnit - systemSale) * qty);
  const damageCost = parseMoney_(e.parameter.damageCost);
  const damageCovered = parseMoney_(e.parameter.damageCovered);
  const damageRemaining = parseMoney_(e.parameter.damageRemaining) || Math.max(0, damageCost - damageCovered);
  const profit = saleTotal - totalCost;
  const itemDepartment = normalize_(e.parameter.itemDepartment) || department;
  const sharedLine = normalize_(e.parameter.sharedLine) || (itemDepartment === "مشترك" ? "نعم" : "لا");
  const billingStatus = normalize_(e.parameter.billingStatus) || "مسجل - قيد مراجعة القسم";
  appendByHeaders_(sheets.deptLines, {
    "ID": lineUniqueId,
    "وقت التسجيل": now,
    "رقم الأوردر": orderId,
    "رقم البند": normalize_(e.parameter.lineId),
    "اسم العميل": normalize_(e.parameter.customerName),
    "القسم": department,
    "نوع البند": normalize_(e.parameter.itemType) || "قسم فقط",
    "اسم البند": itemName,
    "كود الصنف": templateId,
    "الكمية": qty,
    "الخامة": materialName,
    "استهلاك الخامة": laserQuote ? laserQuote.consumedAreaTotal / (laserQuote.sheetWidth * laserQuote.sheetHeight) : qty,
    "تفاصيل المكونات": componentDetails.length ? JSON.stringify(componentDetails) : "",
    "تفاصيل حاسبة الليزر": storedLaserDetails ? JSON.stringify(storedLaserDetails) : "",
    "مساحة مستهلكة": laserQuote ? laserQuote.consumedAreaTotal : 0,
    "نسبة الهالك": laserQuote ? laserQuote.wastePercent : 0,
    "مخزون مخصوم؟": "لا",
    "تكلفة الخامة": materialCost,
    "تكلفة تشغيل": laborCost,
    "تكلفة أخرى": otherCost,
    "إجمالي التكلفة": totalCost,
    "تكلفة النظام": systemCost,
    "سعر النظام": systemSale,
    "فرق السعر": priceDiff,
    "تكلفة التالف": damageCost,
    "تعويض التالف": damageCovered,
    "باقي على الموظف": damageRemaining,
    "سعر البيع": saleTotal,
    "سعر الوحدة": salePriceUnit,
    "الربح": profit,
    "قسم الصنف": itemDepartment,
    "بند مشترك": sharedLine,
    "حالة الفوترة": billingStatus,
    "حالة اعتماد القسم": normalize_(e.parameter.approvalStatus) || "قيد مراجعة القسم",
    "اعتمد القسم بواسطة": "",
    "وقت اعتماد القسم": "",
    "دفعة اعتماد القسم": "",
    "ملاحظات اعتماد القسم": "",
    "مسحوب للفاتورة النهائية؟": "لا",
    "ملاحظات": normalize_(e.parameter.notes),
    "مسجل بواسطة": auth.user.username,
    "حالة التقفيل": normalize_(e.parameter.closeStatus) || "قيد مراجعة القسم",
    "رقم الفاتورة النهائية": "",
    "آخر تحديث": now
  });
  if (priceDiff || damageCost || damageRemaining) {
    appendByHeaders_(sheets.waste, {
      "ID": "WASTE-" + Utilities.getUuid().slice(0, 8),
      "وقت التسجيل": now,
      "رقم الأوردر": orderId,
      "رقم البند": normalize_(e.parameter.lineId),
      "القسم": department,
      "اسم البند": itemName,
      "نوع الهالك": priceDiff ? "فرق سعر فاتورة" : "تالف خامات",
      "سعر النظام": systemSale,
      "سعر مسجل": salePriceUnit,
      "فرق السعر": priceDiff,
      "تكلفة التالف": damageCost,
      "تعويض التالف": damageCovered,
      "الباقي": damageRemaining,
      "مسجل بواسطة": auth.user.username,
      "ملاحظات": normalize_(e.parameter.notes),
      "آخر تحديث": now
    });
  }
  return { success: true, message: "تم تسجيل مسودة فاتورة القسم. سيُخصم المخزون عند اعتماد القسم." , lineId: lineUniqueId, stockDeducted: false, version: MATBAGY_ACCOUNTING_VERSION };
}

function saveAccountingWaste_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!(auth.mode === "full" || auth.mode === "print" || auth.mode === "laser")) {
    return { success: false, message: "تسجيل هوالك الأقسام متاح لضياء ومسؤول القسم فقط." };
  }
  const p = e.parameter || {};
  const orderId = normalize_(p.orderId);
  const reason = normalize_(p.reason || p.wasteType);
  const amount = parseMoney_(p.amount || p.damageCost);
  const paid = parseMoney_(p.paid || p.damageCovered);
  if (!orderId || !reason) return { success: false, message: "رقم الأوردر وسبب الهالك مطلوبان." };
  if (amount <= 0 || paid < 0) return { success: false, message: "قيمة التالف يجب أن تكون أكبر من صفر، والتعويض لا يمكن أن يكون سالبًا." };
  if (paid > amount) return { success: false, message: "التعويض لا يمكن أن يزيد عن قيمة التالف." };
  let department = normalize_(p.department) || auth.department || "عام";
  if (auth.mode === "print") department = "طباعة";
  if (auth.mode === "laser") department = "ليزر";
  const id = "WASTE-" + Utilities.getUuid().slice(0, 8);
  const now = new Date();
  const remaining = Math.max(0, amount - paid);
  const sheets = ensureAccountingSheets_();
  appendByHeaders_(sheets.waste, {
    "ID": id,
    "وقت التسجيل": now,
    "رقم الأوردر": orderId,
    "رقم البند": normalize_(p.lineId),
    "القسم": department,
    "اسم البند": normalize_(p.itemName),
    "نوع الهالك": reason,
    "سعر النظام": 0,
    "سعر مسجل": 0,
    "فرق السعر": 0,
    "تكلفة التالف": amount,
    "تعويض التالف": paid,
    "الباقي": remaining,
    "مسجل بواسطة": auth.user.username,
    "ملاحظات": normalize_(p.notes),
    "آخر تحديث": now
  });
  SpreadsheetApp.flush();
  return { success: true, id: id, department: department, amount: amount, paid: paid, remaining: remaining, message: "تم حفظ الهالك على السيرفر.", version: MATBAGY_ACCOUNTING_VERSION };
}

function accountingCollectDeptStockV1913_(cache, row, h, requirements) {
  const alreadyDeducted = searchKey_(valueAt_(row, firstCol_(h, ["مخزون مخصوم؟"], 0)));
  if (alreadyDeducted === "نعم" || alreadyDeducted === "yes" || alreadyDeducted === "true") return { ok: true };
  let details = [];
  try { details = JSON.parse(normalize_(valueAt_(row, firstCol_(h, ["تفاصيل المكونات"], 0))) || "[]"); } catch (err) { details = []; }
  if (Array.isArray(details) && details.length) {
    for (let i = 0; i < details.length; i++) {
      const component = details[i] || {};
      const result = accountingCollectStockRequirements_(cache, normalize_(component.materialName), parseMoney_(component.totalQty), requirements, []);
      if (!result.ok) return result;
    }
    return { ok: true };
  }
  let laser = {};
  try { laser = JSON.parse(normalize_(valueAt_(row, firstCol_(h, ["تفاصيل حاسبة الليزر"], 0))) || "{}"); } catch (err2) { laser = {}; }
  if (laser && laser.materialName && parseMoney_(laser.consumedAreaTotal) > 0) {
    const materialInfo = cache.byName[accountingMaterialKey_(laser.materialName)];
    if (!materialInfo) return { ok: false, message: "الخامة غير مسجلة في المخزن: " + laser.materialName };
    const rawWidth = parseMoney_(valueAt_(materialInfo.row, firstCol_(cache.h, ["عرض الخام"], 0)));
    const rawHeight = parseMoney_(valueAt_(materialInfo.row, firstCol_(cache.h, ["طول الخام"], 0)));
    if (!rawWidth || !rawHeight) return { ok: false, message: "أبعاد الشيت غير مكتملة للخامة " + laser.materialName };
    return accountingCollectStockRequirements_(cache, laser.materialName, parseMoney_(laser.consumedAreaTotal) / (rawWidth * rawHeight), requirements, []);
  }
  const materialName = normalize_(valueAt_(row, firstCol_(h, ["الخامة"], 0)));
  const consumption = parseMoney_(valueAt_(row, firstCol_(h, ["استهلاك الخامة"], 0))) || parseMoney_(valueAt_(row, firstCol_(h, ["الكمية"], 0)));
  if (!materialName || !consumption) return { ok: true };
  return accountingCollectStockRequirements_(cache, materialName, consumption, requirements, []);
}

function accountingApplyStockRequirementsV1913_(sheets, cache, requirements, ctx) {
  const missing = [];
  const colStock = firstCol_(cache.h, ["رصيد المخزن"], 0);
  const colUpdate = firstCol_(cache.h, ["آخر تحديث"], 0);
  Object.keys(requirements).forEach(function(key){
    const info = cache.byName[key];
    const available = info ? parseMoney_(valueAt_(info.row, colStock)) : 0;
    if (!info || available + 0.000001 < requirements[key].qty) missing.push(requirements[key].name + " مطلوب " + requirements[key].qty.toFixed(4) + " والمتاح " + available.toFixed(4));
  });
  if (missing.length) return { ok: false, message: "تعذر اعتماد القسم بسبب نقص المخزون: " + missing.join(" / ") };
  const now = ctx.now || new Date();
  Object.keys(requirements).forEach(function(key){
    const info = cache.byName[key];
    const before = parseMoney_(valueAt_(info.row, colStock));
    const after = before - requirements[key].qty;
    sheets.materials.getRange(info.rowNumber, colStock).setValue(after);
    if (colUpdate) sheets.materials.getRange(info.rowNumber, colUpdate).setValue(now);
    appendByHeaders_(sheets.stockMoves, {
      "ID": "STK-" + Utilities.getUuid().slice(0, 8), "وقت الحركة": now, "نوع الحركة": "صرف عند اعتماد القسم",
      "رقم الأوردر": ctx.orderId || "", "رقم البند": ctx.batchId || "", "القسم": ctx.department || "", "اسم البند": "اعتماد فاتورة قسم",
      "الخامة": requirements[key].name, "كمية واردة": 0, "كمية منصرفة": requirements[key].qty, "رصيد قبل الحركة": before, "رصيد بعد الحركة": after,
      "مسجل بواسطة": ctx.username || "", "ملاحظات": "خصم مجمع بعد اعتماد القسم"
    });
  });
  return { ok: true };
}

function makeAccountingInvoiceNo_(sheet, now) {
  const serial = Math.max(1, sheet.getLastRow());
  const ymd = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd");
  return "ACC-" + ymd + "-" + String(serial).padStart(4, "0");
}

function saveAccountingFinalInvoice_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!(auth.mode === "full" || auth.mode === "final")) return { success: false, message: "تقفيل الفاتورة عند رحمه أو ريفان أو ضياء فقط." };
  const orderId = normalize_(e.parameter.orderId);
  const customerName = normalize_(e.parameter.customerName);
  if (!orderId || !customerName) return { success: false, message: "رقم الأوردر واسم العميل مطلوبين." };
  const sheets = ensureAccountingSheets_();
  const now = new Date();
  const invoiceNo = makeAccountingInvoiceNo_(sheets.finalInvoices, now);
  let lineIds = [];
  try { lineIds = JSON.parse(normalize_(e.parameter.lineIds) || "[]"); } catch (err) { lineIds = []; }
  const subtotal = parseMoney_(e.parameter.subtotal);
  const discount = parseMoney_(e.parameter.discount);
  const finalTotal = parseMoney_(e.parameter.finalTotal);
  const paid = parseMoney_(e.parameter.paid);
  const remaining = parseMoney_(e.parameter.remaining);
  appendByHeaders_(sheets.finalInvoices, {
    "رقم الفاتورة": invoiceNo,
    "وقت التقفيل": now,
    "رقم الأوردر": orderId,
    "اسم العميل": customerName,
    "بنود الأقسام": lineIds.join(", "),
    "بند يدوي": normalize_(e.parameter.manualDescription),
    "قيمة بند يدوي": parseMoney_(e.parameter.manualAmount),
    "الإجمالي قبل الخصم": subtotal,
    "الخصم": discount,
    "الإجمالي النهائي": finalTotal,
    "المدفوع": paid,
    "الباقي": remaining,
    "الحالة": normalize_(e.parameter.status) || (remaining > 0 ? "عليها باقي" : "مدفوعة"),
    "قفل بواسطة": auth.user.username,
    "ملاحظات": normalize_(e.parameter.notes),
    "آخر تحديث": now
  });
  markAccountingDeptLinesClosed_(sheets.deptLines, lineIds, invoiceNo, now);
  return { success: true, message: "تم تقفيل الفاتورة النهائية رقم " + invoiceNo, invoiceNo: invoiceNo };
}

function markAccountingDeptLinesClosed_(sheet, lineIds, invoiceNo, now) {
  if (!lineIds || !lineIds.length || !sheet || sheet.getLastRow() < 2) return;
  const h = headersMap_(sheet);
  const colId = firstCol_(h, ["ID"], 1);
  const colStatus = firstCol_(h, ["حالة التقفيل"], 0);
  const colInvoice = firstCol_(h, ["رقم الفاتورة النهائية"], 0);
  const colUpdate = firstCol_(h, ["آخر تحديث"], 0);
  const colPulled = ensureHeader_(sheet, "مسحوب للفاتورة النهائية؟");
  if (!colId) return;
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const wanted = {};
  lineIds.forEach(function(id) { wanted[normalize_(id)] = true; });
  data.forEach(function(row, idx) {
    const id = normalize_(valueAt_(row, colId));
    if (!wanted[id]) return;
    const rn = idx + 2;
    if (colStatus) sheet.getRange(rn, colStatus).setValue("تم التقفيل");
    if (colInvoice) sheet.getRange(rn, colInvoice).setValue(invoiceNo);
    if (colUpdate) sheet.getRange(rn, colUpdate).setValue(now);
    if (colPulled) sheet.getRange(rn, colPulled).setValue("نعم");
  });
}

function ensureInvoicePricingSheet_() {
  const headers = [
    "وقت التسجيل",
    "رقم الأوردر",
    "رقم البند",
    "اسم العميل",
    "رقم العميل",
    "القسم",
    "نوع الشغل الأصلي",
    "اللي اتعمل فعليًا",
    "الكمية",
    "ملاحظات القسم",
    "حالة التسعير",
    "سعر ضياء",
    "الإجمالي",
    "مسعر بواسطة",
    "آخر تحديث",
    "تم إنشاء فاتورة؟",
    "رقم الفاتورة",
    "تم الإرسال بواسطة"
  ];
  return mbEnsureSheet_(SHEET_NAME_INVOICE_PRICING, headers);
}

function findLineSnapshotForInvoice_(rowNumber, lineId, orderId) {
  const sheet = ss_().getSheetByName(SHEET_NAME_LINES);
  if (!sheet || sheet.getLastRow() < 2) return {};
  const h = headersMap_(sheet);
  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colLineId = firstCol_(h, ["رقم البند", "Line ID"], 6);
  const colCustomer = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 3);
  const colDept = firstCol_(h, ["القسم", "Department"], 5);
  const colItem = firstCol_(h, ["اسم البند / نوع الشغل", "اسم البند", "Item Name"], 7);
  const colQty = firstCol_(h, ["الكمية", "Qty"], 8);
  const colStatus = firstCol_(h, ["الحالة", "Status"], 11);
  const colNotes = firstCol_(h, ["ملاحظات", "Notes"], 14);
  const colPhone = firstCol_(h, ["رقم العميل الخارجي", "رقم العميل", "رقم الهاتف", "Phone"], 17);

  let targetRow = 0;
  if (rowNumber > 1 && rowNumber <= sheet.getLastRow()) targetRow = rowNumber;

  const data = sheet.getDataRange().getValues();
  if (!targetRow && lineId) {
    for (let i = 1; i < data.length; i++) {
      if (normalize_(valueAt_(data[i], colLineId)) === lineId) {
        targetRow = i + 1;
        break;
      }
    }
  }
  if (!targetRow && orderId) {
    for (let i = 1; i < data.length; i++) {
      const oid = normalize_(valueAt_(data[i], colOrderId));
      if (oid === orderId) {
        targetRow = i + 1;
        break;
      }
    }
  }
  if (!targetRow) return {};

  const row = sheet.getRange(targetRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  return {
    rowNumber: targetRow,
    orderId: normalize_(valueAt_(row, colOrderId)),
    lineId: normalize_(valueAt_(row, colLineId)),
    customerName: normalize_(valueAt_(row, colCustomer)),
    customerPhone: cleanPhone_(valueAt_(row, colPhone)),
    department: normalize_(valueAt_(row, colDept)),
    itemName: normalize_(valueAt_(row, colItem)),
    qty: valueAt_(row, colQty) || 1,
    status: normalize_(valueAt_(row, colStatus)),
    notes: normalize_(valueAt_(row, colNotes))
  };
}

function createInvoiceLine_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const rowNumber = Number(e.parameter.rowNumber || 0);
  const lineIdParam = normalize_(e.parameter.lineId);
  const orderIdParam = normalize_(e.parameter.orderId);
  const snap = findLineSnapshotForInvoice_(rowNumber, lineIdParam, orderIdParam);

  const orderId = normalize_(e.parameter.orderId) || snap.orderId;
  const lineId = normalize_(e.parameter.lineId) || snap.lineId;
  const customerName = normalize_(e.parameter.customerName) || snap.customerName;
  const customerPhone = cleanPhone_(e.parameter.customerPhone) || snap.customerPhone;
  const department = normalize_(e.parameter.department) || snap.department;
  const itemName = normalize_(e.parameter.itemName) || snap.itemName;
  const workDone = normalize_(e.parameter.workDone || e.parameter.description);
  const qty = Number(e.parameter.qty || snap.qty || 1) || 1;
  const notes = normalize_(e.parameter.notes) || snap.notes;

  if (!orderId && !lineId) return { success: false, message: "رقم الأوردر أو رقم البند مطلوب." };
  if (!workDone) return { success: false, message: "اكتب ما تم تنفيذه فعليًا قبل إرسال البند للتسعير." };

  const sheet = ensureInvoicePricingSheet_();
  const now = new Date();

  appendByHeaders_(sheet, {
    "وقت التسجيل": now,
    "رقم الأوردر": orderId,
    "رقم البند": lineId,
    "اسم العميل": customerName,
    "رقم العميل": customerPhone,
    "القسم": department,
    "نوع الشغل الأصلي": itemName,
    "اللي اتعمل فعليًا": workDone,
    "الكمية": qty,
    "ملاحظات القسم": notes,
    "حالة التسعير": "في انتظار تسعير ضياء",
    "سعر ضياء": "",
    "الإجمالي": "",
    "مسعر بواسطة": "",
    "آخر تحديث": now,
    "تم إنشاء فاتورة؟": "لا",
    "رقم الفاتورة": "",
    "تم الإرسال بواسطة": auth.user.username
  });

  appendActivityLog_({
    time: now,
    orderId: orderId,
    lineId: lineId,
    customer: customerName,
    department: department,
    action: "إرسال بند للتسعير",
    oldStatus: "",
    newStatus: "في انتظار تسعير ضياء",
    oldNotes: "",
    newNotes: workDone,
    by: auth.user.username,
    details: "تم فتح بند فاتورة من شاشة القسم بعد الانتهاء"
  });

  SpreadsheetApp.flush();
  return {
    success: true,
    message: "تم إرسال بند الفاتورة لضياء للتسعير.",
    orderId: orderId,
    lineId: lineId,
    pricingStatus: "في انتظار تسعير ضياء"
  };
}

/************************************************************
 * V1829 OVERRIDES - Pricing fix + Debt hold + Dept score
 ************************************************************/

function parseMoney_(value) {
  let s = arabicDigitsToEnglish_(value);
  if (!s || isSheetErrorValue_(s)) return 0;
  s = String(s).replace(/,/g, '.').replace(/[^0-9.\-]/g, '');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

// قراءة المديونية تكون صارمة حتى لا يتم اعتبار رقم تليفون/كود طويل كمديونية.
function parseDebtAmount_(value) {
  let s = arabicDigitsToEnglish_(value);
  if (!s || isSheetErrorValue_(s)) return 0;
  s = String(s).trim();
  const digitsOnly = s.replace(/[^0-9]/g, '');
  // تجاهل أرقام التليفون والأكواد الطويلة، مثل 010... أو 201... أو 16 رقم.
  if (digitsOnly.length >= 8) return 0;
  s = s.replace(/,/g, '.').replace(/[^0-9.\-]/g, '');
  const n = Number(s);
  if (isNaN(n) || n <= 0) return 0;
  if (n > 500000) return 0;
  return n;
}

function ensureCustomerDebtHeaders_() {
  const sheet = ss_().getSheetByName(SHEET_NAME_CUSTOMERS);
  if (!sheet) return null;
  ensureHeaderIfAnyMissing_(sheet, ["مديونية", "ملاحظات المديونية", "آخر تحديث مديونية"]);
  return sheet;
}

function customerCols_(sheet) {
  const h = headersMap_(sheet);
  return {
    name: firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 1),
    manager: firstCol_(h, ["اسم المسؤول", "المسؤول", "Manager"], 2),
    phone: firstCol_(h, ["رقم العميل الأساسي", "رقم العميل", "رقم الهاتف", "Phone"], 3),
    extra: firstCol_(h, ["رقم إضافي", "رقم إضافى", "Extra Phone"], 4),
    type: firstCol_(h, ["نوع العميل", "Customer Type"], 5),
    active: firstCol_(h, ["مفعل؟", "مفعل", "Active"], 0),
    // مصدر المديونية الوحيد داخل شيت العملاء هو العمود الصريح: مديونية
    debt: firstCol_(h, ["مديونية"], 0),
    debtNotes: firstCol_(h, ["ملاحظات المديونية", "ملاحظات الدين", "Debt Notes"], 0)
  };
}

function buildCustomerPhoneMap_() {
  const sheet = ensureCustomerDebtHeaders_() || ss_().getSheetByName(SHEET_NAME_CUSTOMERS);
  const map = {};
  if (!sheet || sheet.getLastRow() < 2) return map;

  setPhoneColumnsAsText_(sheet);

  const data = sheet.getDataRange().getValues();
  const c = customerCols_(sheet);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const active = c.active ? normalize_(row[c.active - 1]) : "نعم";
    if (active && active !== "نعم") continue;

    const name = normalize_(row[c.name - 1]);
    if (!name) continue;

    const phone = c.phone ? cleanPhone_(row[c.phone - 1]) : "";
    const extraPhone = c.extra ? cleanPhone_(row[c.extra - 1]) : "";
    const manager = c.manager ? normalize_(row[c.manager - 1]) : "";
    const type = c.type ? normalize_(row[c.type - 1]) : "";
    const debtAmount = c.debt ? parseDebtAmount_(row[c.debt - 1]) : 0;
    const debtNotes = c.debtNotes ? normalize_(row[c.debtNotes - 1]) : "";
    const branchCode = c.branchCode ? normalize_(row[c.branchCode - 1]) : "";
    const branchName = c.branchName ? normalize_(row[c.branchName - 1]) : "";
    const key = searchKey_(name);

    if (!map[key] || (!map[key].phone && (phone || extraPhone))) {
      map[key] = {
        name: name,
        phone: phone || extraPhone,
        extraPhone: extraPhone,
        manager: manager,
        type: type,
        debtAmount: debtAmount,
        debtHold: debtAmount > 0 ? "نعم" : "لا",
        debtNotes: debtNotes,
        branchCode: branchCode,
        branchName: branchName
      };
    }
  }

  return map;
}

function findCustomerInfoByName_(customerName) {
  const nameKey = searchKey_(customerName);
  if (!nameKey) return { name: "", phone: "", extraPhone: "", manager: "", type: "", debtAmount: 0, debtHold: "لا", debtNotes: "" };

  const map = buildCustomerPhoneMap_();
  if (map[nameKey]) return map[nameKey];

  const keys = Object.keys(map);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].indexOf(nameKey) !== -1 || nameKey.indexOf(keys[i]) !== -1) {
      return map[keys[i]];
    }
  }

  return { name: normalize_(customerName), phone: "", extraPhone: "", manager: "", type: "", debtAmount: 0, debtHold: "لا", debtNotes: "" };
}

function isCustomerDebtBlocked_(customerName) {
  const info = findCustomerInfoByName_(customerName);
  const amount = parseDebtAmount_(info.debtAmount);
  return { hasDebt: amount > 0, amount: amount, notes: info.debtNotes || "" };
}

function ensureWhatsAppHeaders_(sheet) {
  ensureHeaderIfAnyMissing_(sheet, [
    "تم إبلاغ العميل؟",
    "وقت الإبلاغ",
    "تم الإبلاغ بواسطة",
    "آخر رسالة واتساب",
    "آخر وقت واتساب",
    "آخر واتساب بواسطة",
    "نوع رسالة واتساب",
    "تم إرسال رسالة التسجيل؟",
    "وقت رسالة التسجيل",
    "رسالة التسجيل بواسطة",
    "تاريخ الاستلام",
    "تاريخ التسليم المتوقع",
    "الوقت المتوقع",
    "مكبس حراري",
    "مديونية العميل",
    "إيقاف بسبب مديونية؟",
    "ملاحظات المديونية",
    "كود الشات",
    "مصدر الطلب",
    "أنشئ بواسطة",
    "ملاحظات العميل",
    "فاصل واتساب",
    "تأكيد فاصل واتساب"
  ]);
}

function createCustomer_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canCreateCustomer_(auth.user)) return { success: false, message: "ليس لديك صلاحية إضافة عميل." };

  const customerName = normalize_(e.parameter.customerName || e.parameter.name);
  const manager = normalize_(e.parameter.manager) || auth.user.username;
  const phone = cleanPhone_(e.parameter.phone || e.parameter.customerPhone);
  const extraPhone = cleanPhone_(e.parameter.extraPhone || e.parameter.customerExtraPhone);
  const customerType = safeCustomerTypeForValidation_(e.parameter.customerType || e.parameter.type);
  const debtAmount = parseDebtAmount_(e.parameter.debtAmount || e.parameter.debt || 0);
  const branchCode = normalize_(e.parameter.franchiseBranchCode || e.parameter.branchCode);
  const branchName = normalize_(e.parameter.franchiseBranchName || e.parameter.branchName);
  const active = normalize_(e.parameter.active) || "نعم";
  const notes = normalize_(e.parameter.notes);

  if (!customerName) return { success: false, message: "اسم الشات / العميل مطلوب." };

  const sheet = ensureCustomerDebtHeaders_();
  if (!sheet) return { success: false, message: "شيت العملاء غير موجود." };

  ensureHeaderIfAnyMissing_(sheet, ["اسم الشات / المكتب", "اسم المسؤول", "رقم العميل الأساسي", "رقم إضافي", "نوع العميل", "مفعل؟", "ملاحظات", "تاريخ الإضافة", "آخر تحديث", "مديونية", "ملاحظات المديونية", "آخر تحديث مديونية", "كود فرع مطبعجي", "اسم فرع مطبعجي", "آخر تحديث فرع العميل"]);

  const h = headersMap_(sheet);
  const colName = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 1);
  const colPhone = firstCol_(h, ["رقم العميل الأساسي", "رقم العميل", "رقم الهاتف", "Phone"], 3);
  const colExtra = firstCol_(h, ["رقم إضافي", "رقم إضافى", "Extra Phone"], 4);
  const data = sheet.getDataRange().getValues();
  const nameKey = searchKey_(customerName);
  const phoneKey = searchKey_(phone);
  const extraKey = searchKey_(extraPhone);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const existingName = searchKey_(valueAt_(row, colName));
    const existingPhone = searchKey_(valueAt_(row, colPhone));
    const existingExtra = searchKey_(valueAt_(row, colExtra));
    if (existingName && existingName === nameKey) return { success: false, message: "العميل موجود بالفعل بنفس الاسم في شيت العملاء." };
    if (phoneKey && (phoneKey === existingPhone || phoneKey === existingExtra)) return { success: false, message: "رقم العميل موجود بالفعل في شيت العملاء." };
    if (extraKey && (extraKey === existingPhone || extraKey === existingExtra)) return { success: false, message: "الرقم الإضافي موجود بالفعل في شيت العملاء." };
  }

  const now = new Date();
  appendByHeaders_(sheet, {
    "اسم الشات / المكتب": customerName,
    "اسم العميل": customerName,
    "اسم المسؤول": manager,
    "رقم العميل الأساسي": phone,
    "رقم العميل": phone,
    "رقم الهاتف": phone,
    "رقم إضافي": extraPhone,
    "رقم إضافى": extraPhone,
    "نوع العميل": customerType,
    "مفعل؟": active,
    "مفعل": active,
    "ملاحظات": notes,
    "مديونية": debtAmount,
    "ملاحظات المديونية": debtAmount > 0 ? "مديونية حالية" : "",
    "آخر تحديث مديونية": debtAmount > 0 ? now : "",
    "كود فرع مطبعجي": branchCode,
    "اسم فرع مطبعجي": branchName,
    "آخر تحديث فرع العميل": branchCode ? now : "",
    "تاريخ الإضافة": now,
    "آخر تحديث": now
  });

  SpreadsheetApp.flush();
  // V1843: بعد إضافة العميل يتم تجهيز كود الشات وكلمة مرور افتراضية تلقائيًا.
  let portalCode = "";
  try {
    const initRes = initCustomerPortalNow();
    const foundPortal = findCustomerInfoByName_(customerName);
    const portalSheet = ensureCustomerPortalHeaders_();
    const portalCols = customerCols_(portalSheet);
    const portalData = portalSheet.getDataRange().getValues();
    const key = searchKey_(customerName);
    for (let pi = 1; pi < portalData.length; pi++) {
      if (searchKey_(valueAt_(portalData[pi], portalCols.name)) === key) {
        portalCode = normalize_(valueAt_(portalData[pi], portalCols.code));
        break;
      }
    }
  } catch (portalErr) {}
  const customerDefaultPassword = customerDefaultPassword_();
  return { success: true, message: "تم إضافة العميل في شيت العملاء." + (portalCode ? " كود الشات: " + portalCode + " | كلمة المرور المؤقتة: " + customerDefaultPassword : ""), customer: { name: customerName, manager: manager, phone: phone, extraPhone: extraPhone, type: customerType, active: active, debtAmount: debtAmount, branchCode: branchCode, branchName: branchName, customerCode: portalCode, defaultPassword: customerDefaultPassword } };
}

function ensureDemoCustomer_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canCreateCustomer_(auth.user)) return { success: false, message: "ليس لديك صلاحية تجهيز عميل التجربة." };

  const sheet = ensureCustomerPortalHeaders_();
  ensureHeaderIfAnyMissing_(sheet, ["اسم الشات / المكتب", "اسم العميل", "اسم المسؤول", "رقم العميل الأساسي", "رقم العميل", "رقم إضافي", "نوع العميل", "مفعل؟", "ملاحظات", "تاريخ الإضافة", "آخر تحديث", "مديونية", "كود الشات", "كود العميل", "كلمة مرور العميل", "يجب تغيير كلمة المرور"]);

  const h = headersMap_(sheet);
  const cols = customerCols_(sheet);
  const data = sheet.getDataRange().getValues();
  const demoName = "ضياء";
  const demoCode = "diaa";
  const demoPassword = customerDefaultPassword_();
  const now = new Date();
  let rowNumber = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const nameKey = searchKey_(valueAt_(row, cols.name));
    const codeKey = normalize_(valueAt_(row, cols.code));
    if (nameKey === searchKey_(demoName) || codeKey === demoCode || codeKey === "ضياء") {
      rowNumber = i + 1;
      break;
    }
  }

  if (!rowNumber) {
    appendByHeaders_(sheet, {
      "اسم الشات / المكتب": demoName,
      "اسم العميل": demoName,
      "اسم المسؤول": auth.user.username || "ضياء",
      "رقم العميل الأساسي": "",
      "رقم العميل": "",
      "رقم إضافي": "",
      "نوع العميل": "خارجي",
      "مفعل؟": "نعم",
      "مفعل": "نعم",
      "ملاحظات": "عميل تجربة ثابت لاستخدام ضياء في اختبار بوابة العملاء بدل شات العملاء الحقيقيين.",
      "مديونية": 0,
      "كود الشات": demoCode,
      "كود العميل": demoCode,
      "كلمة مرور العميل": hashCustomerPassword_(demoPassword),
      "يجب تغيير كلمة المرور": "لا",
      "تاريخ الإضافة": now,
      "آخر تحديث": now
    });
  } else {
    safeSet_(sheet, rowNumber, cols.name, demoName);
    if (cols.manager) safeSet_(sheet, rowNumber, cols.manager, auth.user.username || "ضياء");
    if (cols.type) safeSet_(sheet, rowNumber, cols.type, "خارجي");
    if (cols.active) safeSet_(sheet, rowNumber, cols.active, "نعم");
    if (cols.debt) safeSet_(sheet, rowNumber, cols.debt, 0);
    safeSet_(sheet, rowNumber, cols.code, demoCode);
    const customerCodeCol = firstCol_(h, ["كود العميل"], 0);
    if (customerCodeCol) safeSet_(sheet, rowNumber, customerCodeCol, demoCode);
    safeSet_(sheet, rowNumber, cols.pass, hashCustomerPassword_(demoPassword));
    safeSet_(sheet, rowNumber, cols.mustChange, "لا");
    const notesCol = firstCol_(h, ["ملاحظات"], 0);
    if (notesCol) safeSet_(sheet, rowNumber, notesCol, "عميل تجربة ثابت لاستخدام ضياء في اختبار بوابة العملاء بدل شات العملاء الحقيقيين.");
    const updatedCol = firstCol_(h, ["آخر تحديث"], 0);
    if (updatedCol) safeSet_(sheet, rowNumber, updatedCol, now);
  }

  SpreadsheetApp.flush();
  return {
    success: true,
    message: "تم تجهيز عميل التجربة. كود الشات: diaa | كلمة المرور: 1234",
    customer: { name: demoName, customerCode: demoCode, password: demoPassword }
  };
}

function upsertOrderSummary_(o) {
  const ss = ss_();
  const sheet = ss.getSheetByName(SHEET_NAME_ORDERS);
  if (!sheet) return;
  ensureWhatsAppHeaders_(sheet);

  const h = headersMap_(sheet);
  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colOrderCode = firstCol_(h, ["كود الأوردر"], 2);

  let rowNumber = 0;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, Math.max(colOrderId, colOrderCode, 1)).getValues();
    for (let i = 0; i < ids.length; i++) {
      const row = ids[i];
      const oid = normalize_(colOrderId ? row[colOrderId - 1] : "") || normalize_(colOrderCode ? row[colOrderCode - 1] : "");
      if (oid === o.orderId) { rowNumber = i + 2; break; }
    }
  }

  const values = {
    "رقم الأوردر": o.orderId,
    "كود الأوردر": o.orderId,
    "تاريخ الإنشاء": o.now,
    "اسم الشات / المكتب": o.customerName,
    "اسم العميل": o.customerName,
    "اسم المسؤول": o.manager || "",
    "رقم العميل": cleanPhone_(o.customerPhone),
    "رقم العميل الخارجي": cleanPhone_(o.customerPhone),
    "نوع العميل": o.customerType,
    "القسم الرئيسي": o.department,
    "القسم": o.department,
    "وصف مختصر": o.itemName,
    "وصف الأوردر": o.itemName,
    "الأولوية": o.priority,
    "الحالة العامة": o.status,
    "الحالة": o.status,
    "آخر تحديث": o.updatedAt || o.now,
    "عدد البنود": o.lineCount || 1,
    "بنود جاهزة": o.readyCount || 0,
    "بنود غير جاهزة": o.notReadyCount === undefined ? 0 : o.notReadyCount,
    "تسليم جزئي؟": o.partial || "لا",
    "ملاحظات": o.notes || "",
    "تاريخ الاستلام": o.receivedAt || o.now,
    "تاريخ التسليم المتوقع": o.expectedDeliveryAt || expectedDeliveryDate_(o.now),
    "الوقت المتوقع": o.expectedDeliveryText || expectedDeliveryText_(o.now),
    "مكبس حراري": o.heatPress ? "نعم" : "لا",
    "طباعة على الطاير": o.flyPrint ? "نعم" : "لا",
    "مديونية العميل": parseMoney_(o.debtAmount || 0),
    "إيقاف بسبب مديونية؟": parseMoney_(o.debtAmount || 0) > 0 ? "نعم" : "لا",
    "ملاحظات المديونية": o.debtNotes || "",
    "تم إبلاغ العميل؟": o.customerNotified || "لا",
    "تم إرسال رسالة التسجيل؟": o.registrationSent || "لا",
    "كود الشات": o.customerCode || "",
    "كود العميل": o.customerCode || "",
    "مصدر الطلب": o.source || "",
    "أنشئ بواسطة": o.createdBy || "",
    "ملاحظات العميل": o.customerNotes || "",
    "رابط فولدر الطلب": o.orderFolderUrl || o.draftFolderUrl || "",
    "رقم المسودة": o.draftId || "",
    "كود فرع مطبعجي": o.franchiseBranchCode || "",
    "اسم فرع مطبعجي": o.franchiseBranchName || ""
  };

  if (rowNumber) updateByHeaders_(sheet, rowNumber, values, true);
  else appendByHeaders_(sheet, values);
}

function appendLine_(ss, o) {
  const sheet = ss.getSheetByName(SHEET_NAME_LINES);
  if (!sheet) return;
  ensureWhatsAppHeaders_(sheet);
  ensurePressColumn_(sheet);
  ensureFlyPrintColumn_(sheet);

  const ready = isReadyStatus_(o.status) ? "نعم" : "لا";
  appendByHeaders_(sheet, {
    "رقم الأوردر": o.orderId,
    "كود الأوردر": o.orderId,
    "اسم الشات / المكتب": o.customerName,
    "اسم العميل": o.customerName,
    "رقم العميل": cleanPhone_(o.customerPhone),
    "رقم العميل الخارجي": cleanPhone_(o.customerPhone),
    "نوع العميل": o.customerType,
    "القسم": o.department,
    "رقم البند": o.lineId,
    "Line ID": o.lineId,
    "اسم البند / نوع الشغل": o.itemName,
    "اسم البند": o.itemName,
    "الكمية": o.qty,
    "مسؤول القسم": o.assignedTo,
    "الأولوية": o.priority,
    "الحالة": o.status,
    "جاهز؟": ready,
    "آخر تحديث": o.now,
    "ملاحظات": o.notes,
    "مكبس حراري": (o.department === "مكبس" || o.heatPress) ? "نعم" : "لا",
    "طباعة على الطاير": o.flyPrint ? "نعم" : "لا",
    "مديونية العميل": parseMoney_(o.debtAmount || 0),
    "إيقاف بسبب مديونية؟": parseMoney_(o.debtAmount || 0) > 0 ? "نعم" : "لا",
    "ملاحظات المديونية": o.debtNotes || "",
    "تاريخ الاستلام": o.receivedAt || o.now,
    "تاريخ التسليم المتوقع": o.expectedDeliveryAt || expectedDeliveryDate_(o.now),
    "الوقت المتوقع": o.expectedDeliveryText || expectedDeliveryText_(o.now),
    "تم إبلاغ العميل؟": "لا",
    "تم إرسال رسالة التسجيل؟": "لا",
    "آخر رسالة واتساب": "",
    "آخر وقت واتساب": "",
    "آخر واتساب بواسطة": "",
    "نوع رسالة واتساب": "",
    "كود الشات": o.customerCode || "",
    "كود العميل": o.customerCode || "",
    "مصدر الطلب": o.source || "",
    "أنشئ بواسطة": o.createdBy || "",
    "ملاحظات العميل": o.customerNotes || "",
    "فاصل واتساب": o.whatsappSeparator || "",
    "تأكيد فاصل واتساب": o.whatsappSeparatorStatus || "",
    "رابط فولدر البند": o.itemFolderUrl || "",
    "رابط ملفات البند": o.filesText || "",
    "كود فرع مطبعجي": o.franchiseBranchCode || "",
    "اسم فرع مطبعجي": o.franchiseBranchName || "",
    "رقم المسودة": o.draftId || "",
    "كود فرع مطبعجي": o.franchiseBranchCode || "",
    "اسم فرع مطبعجي": o.franchiseBranchName || ""
  });
}

function createManualOrder_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canCreateOrder_(auth.user)) return { success: false, message: "ليس لديك صلاحية إضافة أوردر." };

  const customerName = normalize_(e.parameter.customerName);
  const customerInfo = findCustomerInfoByName_(customerName);
  const debtAmount = parseDebtAmount_(customerInfo.debtAmount || 0);
  const debtNotes = customerInfo.debtNotes || "";
  const customerPhone = cleanPhone_(e.parameter.customerPhone) || customerInfo.phone || customerInfo.extraPhone || "";
  const customerType = safeCustomerTypeForValidation_(e.parameter.customerType || customerInfo.type || "");
  const department = normalize_(e.parameter.department);
  const heatPress = isHeatPressFlag_(e.parameter.heatPress || e.parameter.press || e.parameter.isPress);
  const flyPrint = department === "طباعة" && isFlyPrintFlag_(e.parameter.flyPrint || e.parameter.quickPrint || e.parameter.fastPrint || e.parameter["طباعة على الطاير"]);
  let itemName = normalize_(e.parameter.itemName);
  const qty = Number(e.parameter.qty || 1) || 1;
  const priority = flyPrint ? "عاجل" : (normalize_(e.parameter.priority) || "عادي");
  const status = normalize_(e.parameter.status) || "طلب جديد";
  const assignedToParam = normalize_(e.parameter.assignedTo);
  let notes = normalize_(e.parameter.notes);

  if (!customerName || !department) return { success: false, message: "اسم الشات والقسم مطلوبين." };
  if (!itemName) itemName = "أوردر جديد - " + department;
  if (debtAmount > 0) notes = (notes ? notes + " | " : "") + "تنبيه مديونية: " + debtAmount + " ج. لا يتم التسليم قبل السداد.";

  const ss = ss_();
  const lines = ss.getSheetByName(SHEET_NAME_LINES);
  if (!lines) return { success: false, message: "شيت بنود الأوردرات غير موجود." };
  ensureWhatsAppHeaders_(lines);
  ensurePressColumn_(lines);
  ensureFlyPrintColumn_(lines);

  const now = new Date();
  const expectedDeliveryAt = flyPrint ? new Date(now) : expectedDeliveryDate_(now);
  const expectedDeliveryText = flyPrint ? (formatDateAr_(expectedDeliveryAt) + " - نفس اليوم") : formatDateAr_(expectedDeliveryAt);
  const orderId = makeOrderId_(lines, now);

  let departments = [];
  if (department === "متعدد الأقسام") {
    departments = [
      { department: "طباعة", assignedTo: "وائل", suffix: "طباعة" },
      { department: "ليزر", assignedTo: "جابر", suffix: "ليزر" }
    ];
  } else {
    departments = [{ department: department, assignedTo: assignedToParam || defaultAssigned_(department), suffix: department }];
  }

  const readyCount = isReadyStatus_(status) ? departments.length : 0;
  upsertOrderSummary_({
    orderId: orderId,
    now: now,
    customerName: customerName,
    customerPhone: customerPhone,
    customerType: customerType,
    department: department,
    itemName: itemName,
    qty: qty,
    priority: priority,
    status: status,
    lineCount: departments.length,
    readyCount: readyCount,
    notReadyCount: departments.length - readyCount,
    partial: readyCount > 0 && readyCount < departments.length ? "نعم" : "لا",
    notes: notes,
    receivedAt: now,
    expectedDeliveryAt: expectedDeliveryAt,
    expectedDeliveryText: expectedDeliveryText,
    heatPress: heatPress,
    flyPrint: flyPrint,
    debtAmount: debtAmount,
    debtNotes: debtNotes
  });

  departments.forEach(function(d, idx) {
    const lineNo = String(idx + 1).padStart(2, "0");
    const lineId = orderId + "-" + lineNo;
    appendLine_(ss, {
      orderId: orderId,
      lineId: lineId,
      now: now,
      customerName: customerName,
      customerPhone: customerPhone,
      customerType: customerType,
      department: d.department,
      itemName: departments.length > 1 ? (itemName + " - " + d.suffix) : itemName,
      qty: qty,
      priority: priority,
      status: status,
      assignedTo: d.assignedTo,
      notes: notes,
      receivedAt: now,
      expectedDeliveryAt: expectedDeliveryAt,
      expectedDeliveryText: expectedDeliveryText,
      heatPress: heatPress,
      flyPrint: flyPrint,
      debtAmount: debtAmount,
      debtNotes: debtNotes
    });
  });

  appendActivityLog_({ time: now, orderId: orderId, lineId: orderId + "-01", customer: customerName, department: department, action: "إنشاء أوردر", newStatus: status, by: auth.user.username, details: debtAmount > 0 ? "تم تسجيل الأوردر مع تنبيه مديونية" : "تم تسجيل أوردر جديد" });

  SpreadsheetApp.flush();
  return {
    success: true,
    orderId: orderId,
    lineId: orderId + "-01",
    linesCreated: departments.length,
    expectedDeliveryAt: expectedDeliveryAt,
    expectedDeliveryText: expectedDeliveryText,
    debtAmount: debtAmount,
    debtHold: debtAmount > 0 ? "نعم" : "لا",
    debtInfo: { hasDebt: debtAmount > 0, amount: debtAmount, notes: debtNotes },
    message: debtAmount > 0 ? "تم إضافة الأوردر مع تنبيه مديونية العميل." : "تم إضافة الأوردر في الشيتين."
  };
}

function getRows_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const screen = normalize_(e.parameter.screen);
  const lines = ss_().getSheetByName(SHEET_NAME_LINES);
  if (!lines) return { success: false, message: "شيت بنود الأوردرات غير موجود." };
  ensureWhatsAppHeaders_(lines);
  ensurePressColumn_(lines);
  ensureFlyPrintColumn_(lines);

  const data = lines.getDataRange().getValues();
  const h = headersMap_(lines);
  const rows = [];

  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colOrderCode = firstCol_(h, ["كود الأوردر"], 2);
  const colCustomer = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 3);
  const colDept = firstCol_(h, ["القسم", "Department"], 5);
  const colLineId = firstCol_(h, ["رقم البند", "Line ID"], 6);
  const colItem = firstCol_(h, ["اسم البند / نوع الشغل", "اسم البند", "Item Name"], 7);
  const colQty = firstCol_(h, ["الكمية", "Qty"], 8);
  const colAssigned = firstCol_(h, ["مسؤول القسم", "Assigned To"], 9);
  const colPriority = firstCol_(h, ["الأولوية", "Priority"], 10);
  const colStatus = firstCol_(h, ["الحالة", "Status"], 11);
  const colReady = firstCol_(h, ["جاهز؟", "جاهز", "Ready"], 12);
  const colUpdated = firstCol_(h, ["آخر تحديث", "Updated At"], 13);
  const colNotes = firstCol_(h, ["ملاحظات", "Notes"], 14);
  const colPhone = firstCol_(h, ["رقم العميل الخارجي", "رقم العميل", "رقم الهاتف", "Phone"], 17);
  const colPress = firstCol_(h, ["مكبس", "مكبس حراري", "مكبس؟", "Press", "Heat Press"], 0);
  const colFlyPrint = firstCol_(h, ["طباعة على الطاير", "طباعة ع الطاير", "طباعة فورية", "Ready Print", "Fly Print", "Quick Print"], 0);
  const colDebt = firstCol_(h, ["مديونية العميل"], 0);
  const colDebtHold = firstCol_(h, ["إيقاف بسبب مديونية؟", "مديونية؟"], 0);
  const colDebtNotes = firstCol_(h, ["ملاحظات المديونية"], 0);
  const colCustomerNotified = firstCol_(h, ["تم إبلاغ العميل؟"], 0);
  const colNotifyAt = firstCol_(h, ["وقت الإبلاغ"], 0);
  const colNotifyBy = firstCol_(h, ["تم الإبلاغ بواسطة"], 0);
  const colLastWaMessage = firstCol_(h, ["آخر رسالة واتساب"], 0);
  const colLastWaAt = firstCol_(h, ["آخر وقت واتساب"], 0);
  const colLastWaBy = firstCol_(h, ["آخر واتساب بواسطة"], 0);
  const colReceivedAt = firstCol_(h, ["تاريخ الاستلام", "تاريخ الإنشاء", "Received At"], 0);
  const colExpectedAt = firstCol_(h, ["تاريخ التسليم المتوقع", "Expected Delivery"], 0);
  const colExpectedText = firstCol_(h, ["الوقت المتوقع"], 0);
  const colRegistrationSent = firstCol_(h, ["تم إرسال رسالة التسجيل؟"], 0);
  const colCustomerSourceV1903 = firstCol_(h, ["مصدر الطلب", "Source"], 0);
  const colExternalIdV1903 = firstCol_(h, ["علامة العميل الخارجي", "رقم/علامة العميل", "معرف العميل الخارجي", "External Customer ID"], 0);
  const colCustomerModeV1903 = firstCol_(h, ["نوع إدخال العميل", "Customer Mode"], 0);
  const customerMap = buildCustomerPhoneMap_();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const orderId = normalize_(valueAt_(row, colOrderId)) || normalize_(valueAt_(row, colOrderCode));
    const lineId = normalize_(valueAt_(row, colLineId));
    const department = normalize_(valueAt_(row, colDept));
    const status = normalize_(valueAt_(row, colStatus));
    if (!orderId && !lineId) continue;
    const press = isHeatPressFlag_(valueAt_(row, colPress));
    if (!dashboardMatchesScreen_(screen, department, press)) continue;

    const customerName = normalize_(valueAt_(row, colCustomer));
    const customerLookup = customerMap[searchKey_(customerName)] || {};
    let customerPhone = cleanPhone_(valueAt_(row, colPhone));
    if (!customerPhone && customerLookup.phone) {
      customerPhone = customerLookup.phone;
      if (colPhone) { try { lines.getRange(i + 1, colPhone).setNumberFormat("@").setValue(customerPhone); } catch (phoneWriteErr) {} }
    }
    // يتم تحديث عرض المديونية من شيت العملاء فقط.
    let debtAmount = customerLookup.debtAmount ? parseDebtAmount_(customerLookup.debtAmount) : 0;
    const debtHold = debtAmount > 0 ? "نعم" : "لا";

    rows.push({
      rowNumber: i + 1,
      orderId: orderId,
      orderCode: normalize_(valueAt_(row, colOrderCode)) || orderId,
      lineId: lineId,
      customer: customerName,
      customerPhone: customerPhone,
      customerSource: normalize_(valueAt_(row, colCustomerSourceV1903)),
      source: normalize_(valueAt_(row, colCustomerSourceV1903)),
      externalCustomerId: normalize_(valueAt_(row, colExternalIdV1903)),
      customerMode: normalize_(valueAt_(row, colCustomerModeV1903)),
      department: department,
      itemName: normalize_(valueAt_(row, colItem)),
      qty: valueAt_(row, colQty) || 1,
      assignedTo: normalize_(valueAt_(row, colAssigned)),
      priority: normalize_(valueAt_(row, colPriority)) || "عادي",
      status: status || "طلب جديد",
      ready: normalize_(valueAt_(row, colReady)),
      heatPress: normalize_(valueAt_(row, colPress)),
      flyPrint: normalize_(valueAt_(row, colFlyPrint)),
      quickPrint: normalize_(valueAt_(row, colFlyPrint)),
      debtAmount: debtAmount,
      debtHold: debtHold,
      debtNotes: normalize_(valueAt_(row, colDebtNotes)) || customerLookup.debtNotes || "",
      updatedAt: dateText_(valueAt_(row, colUpdated)) || valueAt_(row, colUpdated),
      notes: normalize_(valueAt_(row, colNotes)),
      customerNotified: normalize_(valueAt_(row, colCustomerNotified)),
      notifiedAt: dateText_(valueAt_(row, colNotifyAt)) || valueAt_(row, colNotifyAt),
      notifiedBy: normalize_(valueAt_(row, colNotifyBy)),
      lastWhatsAppMessage: normalize_(valueAt_(row, colLastWaMessage)),
      lastWhatsAppAt: dateText_(valueAt_(row, colLastWaAt)) || valueAt_(row, colLastWaAt),
      lastWhatsAppBy: normalize_(valueAt_(row, colLastWaBy)),
      receivedAt: dateText_(valueAt_(row, colReceivedAt)) || valueAt_(row, colReceivedAt),
      expectedDeliveryAt: dateText_(valueAt_(row, colExpectedAt)) || valueAt_(row, colExpectedAt),
      expectedDeliveryText: dateText_(valueAt_(row, colExpectedText)) || dateText_(valueAt_(row, colExpectedAt)),
      overdue: isOverdueByExpected_(status || "طلب جديد", valueAt_(row, colExpectedAt) || valueAt_(row, colExpectedText)) ? "نعم" : "لا",
      registrationSent: normalize_(valueAt_(row, colRegistrationSent))
    });
  }

  rows.sort(function(a, b) {
    const pa = priorityRank_(a.priority);
    const pb = priorityRank_(b.priority);
    if (pa !== pb) return pa - pb;
    return String(a.orderId).localeCompare(String(b.orderId));
  });
  return { success: true, rows: rows };
}

function updateLine_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const rowNumber = Number(e.parameter.rowNumber || 0);
  const lineId = normalize_(e.parameter.lineId);
  const orderIdParam = normalize_(e.parameter.orderId);
  const status = normalize_(e.parameter.status) || "طلب جديد";
  const notes = normalize_(e.parameter.notes);

  const sheet = ss_().getSheetByName(SHEET_NAME_LINES);
  if (!sheet) return { success: false, message: "شيت بنود الأوردرات غير موجود." };
  ensureWhatsAppHeaders_(sheet);

  const h = headersMap_(sheet);
  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colLineId = firstCol_(h, ["رقم البند", "Line ID"], 6);
  const colStatus = firstCol_(h, ["الحالة", "Status"], 11);
  const colReady = firstCol_(h, ["جاهز؟", "جاهز", "Ready"], 12);
  const colUpdated = firstCol_(h, ["آخر تحديث", "Updated At"], 13);
  const colNotes = firstCol_(h, ["ملاحظات", "Notes"], 14);
  const colCustomer = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 3);
  const colDept = firstCol_(h, ["القسم", "Department"], 5);
  const colDebt = firstCol_(h, ["مديونية العميل"], 0);
  const colDebtHold = firstCol_(h, ["إيقاف بسبب مديونية؟", "مديونية؟"], 0);

  if (!colStatus) return { success: false, message: 'عمود "الحالة" غير موجود في شيت بنود الأوردرات.' };
  if (!lineId && !rowNumber && !orderIdParam) return { success: false, message: "رقم البند أو رقم الصف ناقص." };

  let targetRow = 0;
  let orderId = orderIdParam;
  if (rowNumber > 1 && rowNumber <= sheet.getLastRow()) {
    targetRow = rowNumber;
    orderId = orderId || normalize_(sheet.getRange(targetRow, colOrderId).getValue());
  }
  if (!targetRow && lineId) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (normalize_(data[i][colLineId - 1]) === lineId) {
        targetRow = i + 1;
        orderId = orderId || normalize_(data[i][colOrderId - 1]);
        break;
      }
    }
  }
  if (!targetRow) return { success: false, message: "البند غير موجود في الشيت." };

  const rowValues = sheet.getRange(targetRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  const customerName = normalize_(valueAt_(rowValues, colCustomer));
  // قرار إيقاف التسليم يعتمد على شيت العملاء فقط، وليس على رقم قديم داخل الأوردر.
  const debtInfo = isCustomerDebtBlocked_(customerName);
  const debtAmount = parseDebtAmount_(debtInfo.amount || 0);
  const debtHold = debtAmount > 0;
  if (debtHold && (status === "جاهز للاستلام" || status === "تم التسليم")) {
    return { success: false, message: "لا يمكن تحويل الأوردر إلى " + status + " لأن العميل عليه مديونية " + debtAmount + " ج. برجاء تقفيل المديونية أولاً." };
  }

  const oldStatus = colStatus ? normalize_(sheet.getRange(targetRow, colStatus).getValue()) : "";
  const oldNotes = colNotes ? normalize_(sheet.getRange(targetRow, colNotes).getValue()) : "";
  const now = new Date();
  safeSet_(sheet, targetRow, colStatus, status);
  if (colNotes) safeSet_(sheet, targetRow, colNotes, notes);
  if (colUpdated) safeSet_(sheet, targetRow, colUpdated, now);
  if (colReady) safeSet_(sheet, targetRow, colReady, isReadyStatus_(status) ? "نعم" : "لا");
  if (colDebt) safeSet_(sheet, targetRow, colDebt, debtAmount);
  if (colDebtHold) safeSet_(sheet, targetRow, colDebtHold, debtAmount > 0 ? "نعم" : "لا");

  if (orderId) syncOrderFromLines_(orderId);
  if (oldStatus !== status || oldNotes !== notes) {
    appendActivityLog_({ time: now, orderId: orderId, lineId: lineId || normalize_(sheet.getRange(targetRow, colLineId).getValue()), customer: customerName, department: normalize_(valueAt_(rowValues, colDept)), action: "تعديل حالة / ملاحظات", oldStatus: oldStatus, newStatus: status, oldNotes: oldNotes, newNotes: notes, by: auth.user.username, details: debtAmount > 0 ? "تم الحفظ مع تنبيه مديونية" : "تم الحفظ من شاشة TrendOS" });
  }

  SpreadsheetApp.flush();
  return { success: true, message: "تم حفظ الحالة في الشيت.", rowNumber: targetRow, orderId: orderId, lineId: lineId, status: status, debtAmount: debtAmount, debtHold: debtAmount > 0 ? "نعم" : "لا" };
}

function getDashboard_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const screen = normalize_(e.parameter.screen || "service");
  const lines = ss_().getSheetByName(SHEET_NAME_LINES);
  if (!lines) return { success: false, message: "شيت بنود الأوردرات غير موجود." };
  if (lines.getLastRow() < 2) return { success: true, dashboard: emptyDashboard_(screen) };
  ensureWhatsAppHeaders_(lines);
  ensurePressColumn_(lines);
  ensureFlyPrintColumn_(lines);

  const data = lines.getDataRange().getValues();
  const h = headersMap_(lines);
  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colOrderCode = firstCol_(h, ["كود الأوردر"], 2);
  const colDept = firstCol_(h, ["القسم", "Department"], 5);
  const colQty = firstCol_(h, ["الكمية", "Qty"], 8);
  const colPriority = firstCol_(h, ["الأولوية", "Priority"], 10);
  const colStatus = firstCol_(h, ["الحالة", "Status"], 11);
  const colUpdated = firstCol_(h, ["آخر تحديث", "Updated At"], 13);
  const colReceivedAt = firstCol_(h, ["تاريخ الاستلام", "تاريخ الإنشاء", "Received At"], 0);
  const colExpectedAt = firstCol_(h, ["تاريخ التسليم المتوقع", "Expected Delivery"], 0);
  const colExpectedText = firstCol_(h, ["الوقت المتوقع"], 0);
  const colPress = firstCol_(h, ["مكبس", "مكبس حراري", "مكبس؟", "Press", "Heat Press"], 0);
  const colFlyPrint = firstCol_(h, ["طباعة على الطاير", "طباعة ع الطاير", "طباعة فورية", "Ready Print", "Fly Print", "Quick Print"], 0);
  const colDebt = firstCol_(h, ["مديونية العميل"], 0);

  const dashboard = emptyDashboard_(screen);
  const today = startOfToday_();
  const yesterday = addDays_(today, -1);
  const tomorrow = addDays_(today, 1);
  const todayWorkOrderSet = {}, activeOrderSet = {}, deliveredTodayOrderSet = {}, readyOrderSet = {}, overdueOrderSet = {};
  let todayWorkDoneLines = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const orderId = normalize_(valueAt_(row, colOrderId)) || normalize_(valueAt_(row, colOrderCode));
    const status = normalize_(valueAt_(row, colStatus)) || "طلب جديد";
    const priority = normalize_(valueAt_(row, colPriority)) || "عادي";
    const dept = normalize_(valueAt_(row, colDept)) || "غير محدد";
    const press = isHeatPressFlag_(valueAt_(row, colPress));
    const qty = Number(valueAt_(row, colQty)) || 1;
    const expectedRaw = valueAt_(row, colExpectedAt) || valueAt_(row, colExpectedText);
    const receivedRaw = valueAt_(row, colReceivedAt);
    const updatedRaw = valueAt_(row, colUpdated);
    if (!orderId && !dept) continue;
    if (!dashboardMatchesScreen_(screen, dept, press)) continue;

    const received = parseDateValue_(receivedRaw);
    let expected = parseDateValue_(expectedRaw);
    if (!expected && received) expected = addDays_(received, 2);
    const updated = parseDateValue_(updatedRaw);
    const debtAmount = colDebt ? parseDebtAmount_(valueAt_(row, colDebt)) : 0;
    if (debtAmount > 0) dashboard.debtOrders = (dashboard.debtOrders || 0) + 1;

    if (status === "تم التسليم") {
      dashboard.delivered++;
      if (isSameDay_(updated, today)) { dashboard.deliveredToday++; if (orderId) deliveredTodayOrderSet[orderId] = true; }
    }
    if (status === "جاهز للاستلام") { dashboard.readyForPickup++; if (orderId) readyOrderSet[orderId] = true; }
    if (status === "مكرر") dashboard.duplicate++;

    const isTodayWork = isSameDay_(received, yesterday) && isSameDay_(expected, tomorrow);
    if (isTodayWork) {
      dashboard.todayWorkLines++;
      dashboard.todayWorkSheets += qty;
      if (orderId) todayWorkOrderSet[orderId] = true;
      if (isReadyStatus_(status) || status === "تم التسليم") todayWorkDoneLines++;
    }

    if (!isHiddenFromUserScreens_(status)) {
      dashboard.activeLines++;
      dashboard.activeSheets += qty;
      if (orderId) activeOrderSet[orderId] = true;
      if (priority === "عاجل" || priority === "VIP") dashboard.urgent++;
      else if (!priority || priority === "عادي") dashboard.normal++;
      else if (priority === "مؤجل") dashboard.delayedPriority++;
      dashboard.byDepartment[dept] = (dashboard.byDepartment[dept] || 0) + 1;
      if (press || dept === "مكبس") dashboard.heatPress++;
      if (status === "متوقف") dashboard.problems++;
      if (isOverdueByExpected_(status, expected || expectedRaw)) { dashboard.overdue++; if (orderId) overdueOrderSet[orderId] = true; }
    }
  }

  dashboard.todayWorkOrders = Object.keys(todayWorkOrderSet).length;
  dashboard.todayOrders = dashboard.todayWorkOrders;
  dashboard.activeOrders = Object.keys(activeOrderSet).length;
  dashboard.deliveredTodayOrders = Object.keys(deliveredTodayOrderSet).length;
  dashboard.readyOrders = Object.keys(readyOrderSet).length;
  dashboard.overdueOrders = Object.keys(overdueOrderSet).length;
  dashboard.todayWorkDoneLines = todayWorkDoneLines;
  const target = Math.max(1, dashboard.todayWorkLines + dashboard.overdue);
  dashboard.completionPercent = Math.min(100, Math.round((todayWorkDoneLines / Math.max(1, dashboard.todayWorkLines)) * 100));
  dashboard.timeScore = Math.max(0, Math.round(100 - ((dashboard.overdue / target) * 100)));
  dashboard.performanceScore = Math.round((dashboard.completionPercent * 0.6) + (dashboard.timeScore * 0.4));
  dashboard.updatedAt = formatDateAr_(new Date());
  return { success: true, dashboard: dashboard };
}

function emptyDashboard_(screen) {
  const nameMap = { service: "خدمة العملاء", print: "الطباعة", laser: "الليزر", press: "المكبس" };
  return {
    screen: screen || "service", departmentName: nameMap[screen] || "خدمة العملاء", todayOrders: 0, todayWorkOrders: 0, todayWorkLines: 0, todayWorkSheets: 0, todayWorkDoneLines: 0, activeOrders: 0, activeLines: 0, activeSheets: 0, urgent: 0, normal: 0, delayedPriority: 0, overdue: 0, overdueOrders: 0, problems: 0, readyForPickup: 0, readyOrders: 0, delivered: 0, deliveredToday: 0, deliveredTodayOrders: 0, duplicate: 0, heatPress: 0, debtOrders: 0, completionPercent: 0, timeScore: 100, performanceScore: 0, byDepartment: { "طباعة": 0, "ليزر": 0, "مكبس": 0 }
  };
}

/************************************************************
 * V1830 - FIX PRICING SHEET HELPER
 * يحل خطأ: mbEnsureSheet_ is not defined
 * يستخدمه شيت: بنود تسعير الفاتورة
 ************************************************************/
function mbEnsureSheet_(name, headers) {
  const ss = ss_();
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  headers = headers || [];
  if (!headers.length) return sheet;

  let currentHeaders = [];

  if (sheet.getLastRow() >= 1 && sheet.getLastColumn() >= 1) {
    currentHeaders = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getDisplayValues()[0]
      .map(function (h) {
        return String(h || "").trim();
      });
  }

  const isEmptyHeader = !currentHeaders.length || currentHeaders.every(function (h) {
    return !h;
  });

  if (isEmptyHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    headers.forEach(function (header) {
      header = String(header || "").trim();
      if (!header) return;

      if (currentHeaders.indexOf(header) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
        currentHeaders.push(header);
      }
    });
  }

  try {
    sheet.setFrozenRows(1);
  } catch (err) {}

  return sheet;
}


/************************************************************
 * Matbagy Client Bridge V1831
 * يعيد تفعيل تطبيق مطبعجي شيتات مع نفس سيرفر TrendOS
 * actions:
 * activate / checkActivation / checkSession / createOrder / getOrderStatus
 ************************************************************/

const MB_SHEET_SESSIONS = "جلسات العملاء";
const MB_SOURCE_NAME = "تطبيق مطبعجي شيتات";
const MB_DEFAULT_DEPARTMENT = "طباعة";
const MB_DEFAULT_PRIORITY = "عادي";

function mbParamPhone_(e) {
  return cleanPhone_(
    e.parameter.phone ||
    e.parameter.customerPhone ||
    e.parameter.mobile ||
    e.parameter.whatsapp ||
    e.parameter.code ||
    ""
  );
}

function mbActivate_(e) {
  const phone = mbParamPhone_(e);
  const deviceId = normalize_(e.parameter.deviceId || e.parameter.device || "");

  if (!phone) {
    return { success: false, found: false, message: "برجاء إدخال رقم الهاتف." };
  }

  const customer = mbFindCustomerByPhone_(phone);
  if (!customer) {
    return {
      success: false,
      found: false,
      active: false,
      message: "الرقم غير مسجل أو غير مفعل في شيت العملاء."
    };
  }

  mbUpsertSession_(customer, deviceId);

  return {
    success: true,
    found: true,
    active: true,
    customer: {
      name: customer.name || "عميل مطبعجي بنها",
      manager: customer.manager || "",
      phone: customer.phone || phone,
      extraPhone: customer.extraPhone || "",
      type: customer.type || ""
    },
    message: "تم تفعيل تطبيق مطبعجي بنجاح."
  };
}

function mbCheckSession_(e) {
  const phone = mbParamPhone_(e);
  const deviceId = normalize_(e.parameter.deviceId || e.parameter.device || "");

  if (!phone) return { success: false, message: "رقم الهاتف مطلوب." };

  const customer = mbFindCustomerByPhone_(phone);
  if (!customer) {
    return { success: false, found: false, active: false, message: "الجلسة غير صالحة. الرقم غير مفعل." };
  }

  mbUpsertSession_(customer, deviceId);

  return {
    success: true,
    found: true,
    active: true,
    customer: {
      name: customer.name || "عميل مطبعجي بنها",
      manager: customer.manager || "",
      phone: customer.phone || phone,
      type: customer.type || ""
    },
    message: "الجلسة صالحة."
  };
}

function mbCreateOrder_(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const phone = mbParamPhone_(e);
    if (!phone) return { success: false, message: "رقم العميل مطلوب لإنشاء الأوردر." };

    const customer = mbFindCustomerByPhone_(phone);
    if (!customer) return { success: false, message: "لا يمكن إنشاء أوردر. الرقم غير مفعل في العملاء." };

    const ss = ss_();
    const lines = ss.getSheetByName(SHEET_NAME_LINES);
    const orders = ss.getSheetByName(SHEET_NAME_ORDERS);
    if (!lines) return { success: false, message: "شيت بنود الأوردرات غير موجود." };
    if (!orders) return { success: false, message: "شيت الأوردرات غير موجود." };

    ensureWhatsAppHeaders_(lines);
  ensurePressColumn_(lines);
    ensureWhatsAppHeaders_(orders);
    ensureHeaderIfAnyMissing_(lines, ["المصدر", "القالب", "عدد الصور", "عدد الشيتات"]);
    ensureHeaderIfAnyMissing_(orders, ["المصدر", "القالب", "عدد الصور", "عدد الشيتات"]);

    const now = new Date();
    const template = normalize_(e.parameter.template || e.parameter.layout || "شيت صور");
    const photoCount = Number(e.parameter.photoCount || e.parameter.photos || 0) || 0;
    const sheetCount = Number(e.parameter.sheetCount || e.parameter.sheets || e.parameter.qty || 1) || 1;
    const customerName = normalize_(e.parameter.customerName) || customer.name || "عميل مطبعجي بنها";
    const customerType = safeCustomerTypeForValidation_(e.parameter.customerType || customer.type || "");
    const priority = normalize_(e.parameter.priority) || MB_DEFAULT_PRIORITY;
    const status = "طلب جديد";
    const expectedDeliveryAt = expectedDeliveryDate_(now);
    const expectedDeliveryText = formatDateAr_(expectedDeliveryAt);
    const orderId = makeOrderId_(lines, now);
    const lineId = orderId + "-01";
    const itemName = normalize_(e.parameter.itemName) || ("شيت صور - " + template);
    const notes = normalize_(e.parameter.notes) || ("تم إنشاؤه من تطبيق مطبعجي | عدد الصور: " + photoCount + " | عدد الشيتات: " + sheetCount);

    upsertOrderSummary_({
      orderId: orderId,
      now: now,
      customerName: customerName,
      customerPhone: phone,
      customerType: customerType,
      department: MB_DEFAULT_DEPARTMENT,
      itemName: itemName,
      qty: sheetCount,
      priority: priority,
      status: status,
      lineCount: 1,
      readyCount: 0,
      notReadyCount: 1,
      partial: "لا",
      notes: notes,
      receivedAt: now,
      expectedDeliveryAt: expectedDeliveryAt,
      expectedDeliveryText: expectedDeliveryText
    });

    appendLine_(ss, {
      orderId: orderId,
      lineId: lineId,
      now: now,
      customerName: customerName,
      customerPhone: phone,
      customerType: customerType,
      department: MB_DEFAULT_DEPARTMENT,
      itemName: itemName,
      qty: sheetCount,
      priority: priority,
      status: status,
      assignedTo: defaultAssigned_(MB_DEFAULT_DEPARTMENT),
      notes: notes,
      receivedAt: now,
      expectedDeliveryAt: expectedDeliveryAt,
      expectedDeliveryText: expectedDeliveryText
    });

    updateByHeaders_(lines, lines.getLastRow(), {
      "المصدر": MB_SOURCE_NAME,
      "القالب": template,
      "عدد الصور": photoCount,
      "عدد الشيتات": sheetCount
    }, false);

    const orderRow = mbFindOrderRow_(orders, orderId);
    if (orderRow) {
      updateByHeaders_(orders, orderRow, {
        "المصدر": MB_SOURCE_NAME,
        "القالب": template,
        "عدد الصور": photoCount,
        "عدد الشيتات": sheetCount
      }, true);
    }

    SpreadsheetApp.flush();

    return {
      success: true,
      orderId: orderId,
      lineId: lineId,
      linesCreated: 1,
      department: MB_DEFAULT_DEPARTMENT,
      status: status,
      expectedDeliveryText: expectedDeliveryText,
      message: "تم تسجيل أوردر Matbagy داخل TrendOS."
    };
  } catch (err) {
    return { success: false, message: "خطأ أثناء إنشاء أوردر Matbagy: " + (err && err.message ? err.message : err) };
  } finally {
    try { lock.releaseLock(); } catch (releaseErr) {}
  }
}

function mbGetOrderStatus_(e) {
  const orderId = normalize_(e.parameter.orderId || e.parameter.orderCode || e.parameter.code);
  const phone = mbParamPhone_(e);
  const orders = ss_().getSheetByName(SHEET_NAME_ORDERS);
  if (!orders) return { success: false, message: "شيت الأوردرات غير موجود." };

  const data = orders.getDataRange().getValues();
  const h = headersMap_(orders);
  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colOrderCode = firstCol_(h, ["كود الأوردر"], 2);
  const colCustomer = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 3);
  const colPhone = firstCol_(h, ["رقم العميل الخارجي", "رقم العميل", "رقم الهاتف", "Phone"], 0);
  const colStatus = firstCol_(h, ["الحالة العامة", "الحالة", "General Status", "Status"], 0);
  const colExpectedText = firstCol_(h, ["الوقت المتوقع"], 0);
  const colExpectedAt = firstCol_(h, ["تاريخ التسليم المتوقع", "Expected Delivery"], 0);

  let found = null;
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const oid = normalize_(valueAt_(row, colOrderId)) || normalize_(valueAt_(row, colOrderCode));
    const rowPhone = cleanPhone_(valueAt_(row, colPhone));
    if (orderId && oid === orderId) { found = row; break; }
    if (!orderId && phone && rowPhone === phone) { found = row; break; }
  }

  if (!found) return { success: false, message: "لم يتم العثور على الأوردر." };

  const outOrderId = normalize_(valueAt_(found, colOrderId)) || normalize_(valueAt_(found, colOrderCode));
  return {
    success: true,
    order: {
      orderId: outOrderId,
      customerName: normalize_(valueAt_(found, colCustomer)),
      customerPhone: cleanPhone_(valueAt_(found, colPhone)),
      status: normalize_(valueAt_(found, colStatus)),
      expectedDeliveryText: dateText_(valueAt_(found, colExpectedText)) || normalize_(valueAt_(found, colExpectedText)),
      expectedDeliveryAt: dateText_(valueAt_(found, colExpectedAt)) || valueAt_(found, colExpectedAt)
    }
  };
}

function mbFindCustomerByPhone_(phone) {
  const target = cleanPhone_(phone);
  if (!target) return null;

  const sheet = ss_().getSheetByName(SHEET_NAME_CUSTOMERS);
  if (!sheet || sheet.getLastRow() < 2) return null;

  setPhoneColumnsAsText_(sheet);
  const data = sheet.getDataRange().getValues();
  const h = headersMap_(sheet);
  const colName = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name", "Name", "Cust Chat"], 1);
  const colManager = firstCol_(h, ["اسم المسؤول", "المسؤول", "Manager"], 2);
  const colPhone = firstCol_(h, ["رقم العميل الأساسي", "رقم العميل", "رقم الهاتف", "Phone"], 3);
  const colExtra = firstCol_(h, ["رقم إضافي", "رقم إضافى", "Extra Phone"], 4);
  const colType = firstCol_(h, ["نوع العميل", "Customer Type", "Type"], 5);
  const colActive = firstCol_(h, ["مفعل؟", "مفعل", "Active", "Status"], 0);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const activeValue = colActive ? normalize_(valueAt_(row, colActive)) : "نعم";
    if (!mbIsActiveCustomer_(activeValue)) continue;

    const p1 = colPhone ? cleanPhone_(valueAt_(row, colPhone)) : "";
    const p2 = colExtra ? cleanPhone_(valueAt_(row, colExtra)) : "";
    if (target === p1 || target === p2) {
      return {
        rowNumber: i + 1,
        name: normalize_(valueAt_(row, colName)),
        manager: colManager ? normalize_(valueAt_(row, colManager)) : "",
        phone: p1 || target,
        extraPhone: p2,
        type: colType ? normalize_(valueAt_(row, colType)) : "",
        active: activeValue || "نعم"
      };
    }
  }
  return null;
}

function mbIsActiveCustomer_(value) {
  const s = searchKey_(value);
  if (!s) return true;
  const activeValues = ["نعم", "مفعل", "فعال", "active", "yes", "true", "1"];
  const inactiveValues = ["لا", "غير مفعل", "موقوف", "inactive", "no", "false", "0"];
  if (inactiveValues.indexOf(s) !== -1) return false;
  if (activeValues.indexOf(s) !== -1) return true;
  return false;
}

function mbUpsertSession_(customer, deviceId) {
  const sheet = mbEnsureSheet_(MB_SHEET_SESSIONS, [
    "رقم العميل",
    "Device ID",
    "اسم العميل",
    "الحالة",
    "تاريخ التفعيل",
    "آخر ظهور"
  ]);

  const h = headersMap_(sheet);
  const colPhone = firstCol_(h, ["رقم العميل", "Phone"], 1);
  const colDevice = firstCol_(h, ["Device ID"], 2);
  const phone = cleanPhone_(customer.phone);
  const lastRow = sheet.getLastRow();
  let rowNumber = 0;

  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, Math.max(colPhone, colDevice, 1)).getValues();
    for (let i = 0; i < data.length; i++) {
      const rowPhone = cleanPhone_(data[i][colPhone - 1]);
      const rowDevice = colDevice ? normalize_(data[i][colDevice - 1]) : "";
      if (rowPhone === phone && (!deviceId || !rowDevice || rowDevice === deviceId)) {
        rowNumber = i + 2;
        break;
      }
    }
  }

  const now = new Date();
  const values = {
    "رقم العميل": phone,
    "Device ID": deviceId,
    "اسم العميل": customer.name || "",
    "الحالة": "نشط",
    "تاريخ التفعيل": now,
    "آخر ظهور": now
  };

  if (rowNumber) updateByHeaders_(sheet, rowNumber, values, true);
  else appendByHeaders_(sheet, values);
}

function mbFindOrderRow_(sheet, orderId) {
  const h = headersMap_(sheet);
  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colOrderCode = firstCol_(h, ["كود الأوردر"], 2);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const width = Math.max(colOrderId, colOrderCode, 1);
  const data = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const oid = normalize_(colOrderId ? row[colOrderId - 1] : "") || normalize_(colOrderCode ? row[colOrderCode - 1] : "");
    if (oid === orderId) return i + 2;
  }
  return 0;
}

/*********************** نهاية Matbagy Client Bridge V1831 ***********************/


/************************************************************
 * V1832 DEBT STRICT FIX
 * تنظيف أعمدة المديونية ومنع قراءة أي رقم تليفون/كود كمديونية
 ************************************************************/
function fixDebtColumnsNow() {
  const ss = ss_();
  const customers = ss.getSheetByName(SHEET_NAME_CUSTOMERS);
  let customersFixed = 0;
  let linesFixed = 0;
  let ordersFixed = 0;

  if (customers) {
    ensureHeaderIfAnyMissing_(customers, ["مديونية", "ملاحظات المديونية", "آخر تحديث مديونية"]);
    const h = headersMap_(customers);
    const debtCol = h["مديونية"];
    if (debtCol && customers.getLastRow() > 1) {
      const range = customers.getRange(2, debtCol, customers.getLastRow() - 1, 1);
      const values = range.getDisplayValues();
      const out = values.map(function(r) {
        const n = parseDebtAmount_(r[0]);
        customersFixed++;
        return [n > 0 ? n : ""];
      });
      range.setValues(out);
    }
  }

  function clearOrderDebtSheet_(sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return 0;
    ensureHeaderIfAnyMissing_(sheet, ["مديونية العميل", "إيقاف بسبب مديونية؟", "ملاحظات المديونية"]);
    const h = headersMap_(sheet);
    const dc = h["مديونية العميل"];
    const hc = h["إيقاف بسبب مديونية؟"];
    const nc = h["ملاحظات المديونية"];
    const last = sheet.getLastRow();
    if (last <= 1) return 0;
    let count = last - 1;
    if (dc) sheet.getRange(2, dc, count, 1).clearContent();
    if (hc) sheet.getRange(2, hc, count, 1).clearContent();
    if (nc) sheet.getRange(2, nc, count, 1).clearContent();
    return count;
  }

  linesFixed = clearOrderDebtSheet_(SHEET_NAME_LINES);
  ordersFixed = clearOrderDebtSheet_(SHEET_NAME_ORDERS);
  SpreadsheetApp.flush();
  return {
    success: true,
    message: "تم تنظيف المديونيات القديمة. مصدر المديونية الآن هو عمود مديونية في شيت العملاء فقط.",
    customersFixed: customersFixed,
    linesFixed: linesFixed,
    ordersFixed: ordersFixed
  };
}

function debugCustomerDebt_(e) {
  const qPhone = cleanPhone_(e.parameter.phone || e.parameter.customerPhone || "");
  const qName = searchKey_(e.parameter.name || e.parameter.customerName || "");
  const sheet = ss_().getSheetByName(SHEET_NAME_CUSTOMERS);
  if (!sheet) return { success: false, message: "شيت العملاء غير موجود." };
  const h = headersMap_(sheet);
  const c = customerCols_(sheet);
  const data = sheet.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = normalize_(valueAt_(row, c.name));
    const phone = c.phone ? cleanPhone_(valueAt_(row, c.phone)) : "";
    const extra = c.extra ? cleanPhone_(valueAt_(row, c.extra)) : "";
    if ((qPhone && (qPhone === phone || qPhone === extra)) || (qName && searchKey_(name) === qName)) {
      const rawDebt = c.debt ? valueAt_(row, c.debt) : "";
      return {
        success: true,
        rowNumber: i + 1,
        name: name,
        phone: phone,
        extraPhone: extra,
        debtColumn: c.debt,
        debtHeader: c.debt ? sheet.getRange(1, c.debt).getDisplayValue() : "",
        rawDebt: rawDebt,
        parsedDebt: parseDebtAmount_(rawDebt),
        message: parseDebtAmount_(rawDebt) > 0 ? "العميل عليه مديونية." : "لا توجد مديونية مسجلة لهذا العميل."
      };
    }
  }
  return { success: false, message: "لم يتم العثور على العميل في شيت العملاء." };
}


/************************************************************
 * V1835 PATCH - طباعة على الطاير للطباعة فقط + فلتر مكبس مستقل
 * Patch إضافي فقط بدون حذف أي دوال موجودة.
 ************************************************************/

function ensurePressColumn_(sheet) {
  if (!sheet) return 0;
  const h = headersMap_(sheet);
  const existing = firstCol_(h, ["مكبس", "مكبس حراري", "مكبس؟", "Press", "Heat Press"], 0);
  if (existing) return existing;
  sheet.getRange(1, sheet.getLastColumn() + 1).setValue("مكبس");
  SpreadsheetApp.flush();
  return sheet.getLastColumn();
}

function ensureFlyPrintColumn_(sheet) {
  if (!sheet) return 0;
  const h = headersMap_(sheet);
  const existing = firstCol_(h, ["طباعة على الطاير", "طباعة ع الطاير", "طباعة فورية", "Ready Print", "Fly Print", "Quick Print"], 0);
  if (existing) return existing;
  sheet.getRange(1, sheet.getLastColumn() + 1).setValue("طباعة على الطاير");
  SpreadsheetApp.flush();
  return sheet.getLastColumn();
}

function isFlyPrintFlag_(value) {
  const v = normalize_(value).toLowerCase();
  return v === "نعم" || v === "true" || v === "1" || v === "on" || v === "طباعة على الطاير" || v === "طباعة ع الطاير" || v === "على الطاير" || v === "ع الطاير";
}

function isUrgentNotificationStatusVisible_(status) {
  const s = normalize_(status);
  return ["تم التسليم", "جاهز للاستلام", "ملغى", "مكرر"].indexOf(s) === -1;
}

function getUrgentNotifications_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const screen = normalize_(e.parameter.screen || "");
  const res = getRows_({ parameter: Object.assign({}, e.parameter, { screen: screen }) });
  if (!res.success) return res;

  const rows = (res.rows || []).filter(function(row) {
    const status = normalize_(row.status);
    const fly = isFlyPrintFlag_(row.flyPrint || row.quickPrint || row.fastPrint || row["طباعة على الطاير"] || row["طباعة ع الطاير"]);
    if (!fly) return false;
    if (normalize_(row.department) !== "طباعة") return false;
    if (!isUrgentNotificationStatusVisible_(status)) return false;
    return true;
  }).map(function(row) {
    return {
      orderId: row.orderId || "",
      lineId: row.lineId || "",
      customer: row.customer || "",
      department: row.department || "",
      status: row.status || "طلب جديد",
      expectedDelivery: row.expectedDeliveryText || row.expectedDeliveryAt || row.expectedDelivery || "",
      priority: row.priority || "عادي",
      heatPress: row.heatPress || "",
      flyPrint: row.flyPrint || "نعم"
    };
  });

  return {
    success: true,
    count: rows.length,
    rows: rows
  };
}

/************************************************************
 * V1843 PATCH - منصة مطبعجي بنها: بوابة العميل بالكود والباسورد
 * V1844 PATCH - شات طلب العميل + مسودات + رفع ملفات على Drive
 * Patch إضافي فقط بدون حذف دوال موجودة.
 ************************************************************/

const CUSTOMER_FILES_ROOT_FOLDER_ID = "";
const SHEET_NAME_CUSTOMER_DRAFTS = "مسودات طلبات العملاء";
const SHEET_NAME_CUSTOMER_FILES = "ملفات وبنود بوابة العملاء";
const CUSTOMER_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

function customerDefaultPassword_() {
  const props = PropertiesService.getScriptProperties();
  let value = normalize_(props.getProperty("CUSTOMER_DEFAULT_PASSWORD"));
  if (!value) {
    value = String(Math.floor(100000 + Math.random() * 900000));
    props.setProperty("CUSTOMER_DEFAULT_PASSWORD", value);
  }
  return value;
}

function customerFilesRootFolderId_() {
  try { return normalize_(PropertiesService.getScriptProperties().getProperty("CUSTOMER_FILES_ROOT_FOLDER_ID")) || CUSTOMER_FILES_ROOT_FOLDER_ID; } catch (err) { return CUSTOMER_FILES_ROOT_FOLDER_ID; }
}

function customerPortalHeaderNames_() {
  return [
    "كود الشات",
    "كود العميل",
    "كلمة مرور العميل",
    "يجب تغيير كلمة المرور",
    "توكن العميل",
    "آخر دخول عميل",
    "آخر تغيير كلمة مرور عميل",
    "كود فرع مطبعجي",
    "اسم فرع مطبعجي",
    "آخر تحديث فرع العميل"
  ];
}

function ensureCustomerPortalHeaders_() {
  const sheet = ss_().getSheetByName(SHEET_NAME_CUSTOMERS);
  if (!sheet) throw new Error("شيت العملاء غير موجود.");
  ensureHeaderIfAnyMissing_(sheet, customerPortalHeaderNames_());
  return sheet;
}

function customerCols_(sheet) {
  const h = headersMap_(sheet);
  return {
    name: firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 1),
    manager: firstCol_(h, ["اسم المسؤول", "المسؤول", "Manager"], 0),
    phone: firstCol_(h, ["رقم العميل الأساسي", "رقم العميل", "رقم الهاتف", "Phone"], 0),
    extra: firstCol_(h, ["رقم إضافي", "رقم إضافى", "Extra Phone"], 0),
    type: firstCol_(h, ["نوع العميل", "Customer Type", "Type"], 0),
    active: firstCol_(h, ["مفعل؟", "مفعل", "Active"], 0),
    debt: firstCol_(h, ["مديونية"], 0),
    debtNotes: firstCol_(h, ["ملاحظات المديونية", "ملاحظات الدين", "Debt Notes"], 0),
    code: firstCol_(h, ["كود الشات", "كود العميل", "Customer Code", "Chat Code"], 0),
    pass: firstCol_(h, ["كلمة مرور العميل", "باسورد العميل", "Customer Password", "Password"], 0),
    mustChange: firstCol_(h, ["يجب تغيير كلمة المرور", "Must Change Password"], 0),
    token: firstCol_(h, ["توكن العميل", "Customer Token"], 0),
    lastLogin: firstCol_(h, ["آخر دخول عميل", "Customer Last Login"], 0),
    passChanged: firstCol_(h, ["آخر تغيير كلمة مرور عميل"], 0),
    branchCode: firstCol_(h, ["كود فرع مطبعجي", "كود الفرع", "Franchise Branch Code"], 0),
    branchName: firstCol_(h, ["اسم فرع مطبعجي", "فرع مطبعجي", "Franchise Branch Name"], 0),
    branchUpdated: firstCol_(h, ["آخر تحديث فرع العميل"], 0)
  };
}

function hashCustomerPassword_(password) {
  const raw = normalize_(password);
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  const b64 = Utilities.base64Encode(bytes);
  return "sha256:" + b64;
}

function customerPasswordMatches_(stored, input) {
  const s = normalize_(stored);
  const v = normalize_(input);
  if (!s) return v === customerDefaultPassword_();
  if (s.indexOf("sha256:") === 0) return s === hashCustomerPassword_(v);
  return s === v;
}

function makeNextCustomerCode_(sheet, cols) {
  const lastRow = sheet.getLastRow();
  let maxCode = 1000;
  if (lastRow > 1 && cols.code) {
    const values = sheet.getRange(2, cols.code, lastRow - 1, 1).getValues();
    values.forEach(function (r) {
      const n = Number(cleanPhone_(r[0]));
      if (n && n > maxCode) maxCode = n;
    });
  }
  return String(maxCode + 1);
}

function findCustomerByPortalCode_(customerCode) {
  const sheet = ensureCustomerPortalHeaders_();
  const cols = customerCols_(sheet);
  const code = normalize_(customerCode);
  if (!code) return null;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowCode = normalize_(valueAt_(row, cols.code));
    if (rowCode && rowCode === code) {
      return { sheet: sheet, rowNumber: i + 1, row: row, cols: cols };
    }
  }
  return null;
}

function customerPublicObject_(found, token) {
  const row = found.row;
  const cols = found.cols;
  return {
    customerCode: normalize_(valueAt_(row, cols.code)),
    name: normalize_(valueAt_(row, cols.name)),
    phone: cleanPhone_(valueAt_(row, cols.phone)),
    type: normalize_(valueAt_(row, cols.type)),
    branchCode: cols.branchCode ? normalize_(valueAt_(row, cols.branchCode)) : "",
    branchName: cols.branchName ? normalize_(valueAt_(row, cols.branchName)) : "",
    franchiseBranchCode: cols.branchCode ? normalize_(valueAt_(row, cols.branchCode)) : "",
    franchiseBranchName: cols.branchName ? normalize_(valueAt_(row, cols.branchName)) : "",
    token: token || normalize_(valueAt_(row, cols.token)),
    mustChange: normalize_(valueAt_(row, cols.mustChange)) === "نعم"
  };
}

function customerAuthorize_(customerCode, token) {
  const found = findCustomerByPortalCode_(customerCode);
  if (!found) return { ok: false, message: "كود الشات غير صحيح." };
  const storedToken = normalize_(valueAt_(found.row, found.cols.token));
  if (!storedToken || storedToken !== normalize_(token)) return { ok: false, message: "انتهت جلسة العميل. سجل الدخول مرة أخرى." };
  const active = normalize_(valueAt_(found.row, found.cols.active));
  if (active && active === "لا") return { ok: false, message: "حساب العميل غير مفعل." };
  return { ok: true, found: found, customer: customerPublicObject_(found, storedToken) };
}

function customerLogin_(e) {
  const code = normalize_(e.parameter.customerCode || e.parameter.code || e.parameter.chatCode);
  const password = normalize_(e.parameter.password || e.parameter.customerPassword);
  if (!code || !password) return { success: false, message: "كود الشات وكلمة المرور مطلوبين." };

  const found = findCustomerByPortalCode_(code);
  if (!found) return { success: false, message: "كود الشات غير موجود." };

  const active = normalize_(valueAt_(found.row, found.cols.active));
  if (active && active === "لا") return { success: false, message: "حساب العميل غير مفعل." };

  let stored = normalize_(valueAt_(found.row, found.cols.pass));
  if (!stored) {
    stored = hashCustomerPassword_(customerDefaultPassword_());
    safeSet_(found.sheet, found.rowNumber, found.cols.pass, stored);
    safeSet_(found.sheet, found.rowNumber, found.cols.mustChange, "نعم");
  }

  if (!customerPasswordMatches_(stored, password)) return { success: false, message: "كلمة المرور غير صحيحة." };

  const token = Utilities.getUuid();
  safeSet_(found.sheet, found.rowNumber, found.cols.token, token);
  safeSet_(found.sheet, found.rowNumber, found.cols.lastLogin, new Date());
  SpreadsheetApp.flush();

  const refreshed = findCustomerByPortalCode_(code) || found;
  return { success: true, customer: customerPublicObject_(refreshed, token), message: "تم دخول العميل بنجاح." };
}

function changeCustomerPassword_(e) {
  const auth = customerAuthorize_(e.parameter.customerCode || e.parameter.code, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  const oldPassword = normalize_(e.parameter.oldPassword);
  const newPassword = normalize_(e.parameter.newPassword);
  if (!oldPassword || !newPassword) return { success: false, message: "كلمة المرور الحالية والجديدة مطلوبين." };
  if (newPassword.length < 4) return { success: false, message: "كلمة المرور الجديدة يجب ألا تقل عن 4 أرقام/حروف." };

  const found = auth.found;
  const stored = normalize_(valueAt_(found.row, found.cols.pass));
  if (!customerPasswordMatches_(stored, oldPassword)) return { success: false, message: "كلمة المرور الحالية غير صحيحة." };

  safeSet_(found.sheet, found.rowNumber, found.cols.pass, hashCustomerPassword_(newPassword));
  safeSet_(found.sheet, found.rowNumber, found.cols.mustChange, "لا");
  safeSet_(found.sheet, found.rowNumber, found.cols.passChanged, new Date());
  SpreadsheetApp.flush();
  return { success: true, message: "تم تغيير كلمة مرور العميل." };
}

function getCustomerOrders_(e) {
  const auth = customerAuthorize_(e.parameter.customerCode || e.parameter.code, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const customer = auth.customer;
  const lines = ss_().getSheetByName(SHEET_NAME_LINES);
  if (!lines) return { success: false, message: "شيت بنود الأوردرات غير موجود." };
  ensureWhatsAppHeaders_(lines);

  const data = lines.getDataRange().getValues();
  const h = headersMap_(lines);
  const colOrderId = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colLineId = firstCol_(h, ["رقم البند", "Line ID"], 0);
  const colCode = firstCol_(h, ["كود الشات", "كود العميل", "Customer Code"], 0);
  const colCustomer = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 0);
  const colDept = firstCol_(h, ["القسم", "Department"], 0);
  const colItem = firstCol_(h, ["اسم البند / نوع الشغل", "اسم البند", "Item Name"], 0);
  const colQty = firstCol_(h, ["الكمية", "Qty"], 0);
  const colStatus = firstCol_(h, ["الحالة", "Status"], 0);
  const colPriority = firstCol_(h, ["الأولوية", "Priority"], 0);
  const colNotes = firstCol_(h, ["ملاحظات العميل", "ملاحظات", "Notes"], 0);
  const colExpectedAt = firstCol_(h, ["تاريخ التسليم المتوقع", "Expected Delivery"], 0);
  const colExpectedText = firstCol_(h, ["الوقت المتوقع"], 0);
  const colUpdated = firstCol_(h, ["آخر تحديث", "Updated At"], 0);

  const orders = {};
  const nameKey = searchKey_(customer.name);
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const orderId = normalize_(valueAt_(row, colOrderId));
    if (!orderId) continue;
    const rowCode = normalize_(valueAt_(row, colCode));
    const rowNameKey = searchKey_(valueAt_(row, colCustomer));
    if (rowCode !== customer.customerCode && (!nameKey || rowNameKey !== nameKey)) continue;
    if (!orders[orderId]) {
      orders[orderId] = {
        orderId: orderId,
        lineId: normalize_(valueAt_(row, colLineId)),
        department: normalize_(valueAt_(row, colDept)),
        itemName: normalize_(valueAt_(row, colItem)),
        qty: valueAt_(row, colQty) || "",
        status: normalize_(valueAt_(row, colStatus)) || "طلب جديد",
        priority: normalize_(valueAt_(row, colPriority)) || "عادي",
        notes: normalize_(valueAt_(row, colNotes)),
        expectedDeliveryAt: valueAt_(row, colExpectedAt) || "",
        expectedDeliveryText: valueAt_(row, colExpectedText) || "",
        updatedAt: valueAt_(row, colUpdated) || ""
      };
    }
  }

  const out = Object.keys(orders).map(function (k) { return orders[k]; }).sort(function (a, b) {
    return String(b.orderId).localeCompare(String(a.orderId));
  });

  return { success: true, orders: out, count: out.length };
}

function makeCustomerOrderSeparator_(customer, orderId, department, itemName) {
  return [
    "✅ فاصل أوردر منصة مطبعجي بنها",
    "كود الشات: " + (customer.customerCode || "-"),
    "اسم الشات: " + (customer.name || "-"),
    "رقم الأوردر: " + (orderId || "-"),
    "القسم: " + (department || "-"),
    itemName ? "المطلوب: " + itemName : "",
    "",
    "كل الملفات والصور والرسائل الموجودة فوق هذا الفاصل، وبعد آخر فاصل أوردر سابق، تخص رقم الأوردر المكتوب هنا فقط.",
    "أي شغل جديد بعد هذا الفاصل يحتاج رقم أوردر جديد."
  ].filter(Boolean).join("\n");
}

function createCustomerPortalOrder_(e) {
  const auth = customerAuthorize_(e.parameter.customerCode || e.parameter.code, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };

  const customer = auth.customer;
  let department = normalize_(e.parameter.department) || "طباعة";
  let heatPress = isHeatPressFlag_(e.parameter.heatPress || e.parameter.press);
  if (department === "مكبس") { department = "طباعة"; heatPress = true; }
  const flyPrint = department === "طباعة" && isFlyPrintFlag_(e.parameter.flyPrint || e.parameter.quickPrint || e.parameter.fastPrint);
  const branchCode = normalize_(e.parameter.franchiseBranchCode || customer.branchCode || customer.franchiseBranchCode);
  const branchName = normalize_(e.parameter.franchiseBranchName || customer.branchName || customer.franchiseBranchName);
  let itemName = normalize_(e.parameter.itemName);
  const qty = Number(e.parameter.qty || 1) || 1;
  const customerNotes = normalize_(e.parameter.notes || e.parameter.customerNotes);
  const status = "طلب جديد";
  const priority = flyPrint ? "عاجل" : "عادي";

  if (!itemName) itemName = customerNotes || "أوردر جديد - " + department;
  if (!department) return { success: false, message: "القسم مطلوب." };

  const ss = ss_();
  const lines = ss.getSheetByName(SHEET_NAME_LINES);
  if (!lines) return { success: false, message: "شيت بنود الأوردرات غير موجود." };
  ensureWhatsAppHeaders_(lines);
  ensurePressColumn_(lines);
  ensureFlyPrintColumn_(lines);

  const now = new Date();
  const expectedDeliveryAt = flyPrint ? new Date(now) : expectedDeliveryDate_(now);
  const expectedDeliveryText = flyPrint ? (formatDateAr_(expectedDeliveryAt) + " - نفس اليوم") : formatDateAr_(expectedDeliveryAt);
  const orderId = makeOrderId_(lines, now);

  let departments = [];
  if (department === "متعدد الأقسام") {
    departments = [
      { department: "طباعة", assignedTo: "وائل", suffix: "طباعة" },
      { department: "ليزر", assignedTo: "جابر", suffix: "ليزر" }
    ];
  } else {
    departments = [{ department: department, assignedTo: defaultAssigned_(department), suffix: department }];
  }

  const separator = makeCustomerOrderSeparator_(customer, orderId, department, itemName);
  const common = {
    orderId: orderId,
    now: now,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerType: customer.type,
    department: department,
    itemName: itemName,
    qty: qty,
    priority: priority,
    status: status,
    lineCount: departments.length,
    readyCount: 0,
    notReadyCount: departments.length,
    partial: "لا",
    notes: customerNotes,
    receivedAt: now,
    expectedDeliveryAt: expectedDeliveryAt,
    expectedDeliveryText: expectedDeliveryText,
    heatPress: heatPress,
    flyPrint: flyPrint,
    debtAmount: 0,
    debtNotes: "",
    customerCode: customer.customerCode,
    source: "بوابة العميل",
    createdBy: "العميل",
    customerNotes: customerNotes,
    whatsappSeparator: separator,
    whatsappSeparatorStatus: "غير مؤكد"
  };

  upsertOrderSummary_(common);
  departments.forEach(function(d, idx) {
    const lineNo = String(idx + 1).padStart(2, "0");
    appendLine_(ss, Object.assign({}, common, {
      lineId: orderId + "-" + lineNo,
      department: d.department,
      itemName: departments.length > 1 ? (itemName + " - " + d.suffix) : itemName,
      assignedTo: d.assignedTo
    }));
  });

  appendActivityLog_({ time: now, orderId: orderId, lineId: orderId + "-01", customer: customer.name, department: department, action: "إنشاء أوردر من بوابة العميل", newStatus: status, by: "العميل " + customer.customerCode, details: "تم تسجيل الأوردر من منصة مطبعجي بنها" });

  SpreadsheetApp.flush();
  return {
    success: true,
    orderId: orderId,
    lineId: orderId + "-01",
    linesCreated: departments.length,
    expectedDeliveryAt: expectedDeliveryAt,
    expectedDeliveryText: expectedDeliveryText,
    separator: separator,
    message: "تم تسجيل الأوردر من بوابة العميل."
  };
}



/************************************************************
 * V1844 PATCH - شات طلب العميل + مسودات + رفع ملفات على Drive
 ************************************************************/

function customerDraftHeaders_() {
  return ["رقم المسودة", "كود الشات", "اسم العميل", "حالة المسودة", "تاريخ البداية", "تاريخ الإرسال للتنفيذ", "رقم الأوردر الناتج", "رابط فولدر المسودة", "معرف فولدر المسودة", "عدد البنود", "ملاحظات"];
}

function customerFileHeaders_() {
  return ["نوع السجل", "رقم المسودة", "رقم الأوردر", "رقم البند", "رقم بند المسودة", "كود الشات", "اسم العميل", "كود فرع مطبعجي", "اسم فرع مطبعجي", "نوع الشغل", "القسم", "الكمية", "ملاحظات العميل", "مكبس", "طباعة على الطاير", "اسم الملف", "نوع الملف", "حجم الملف", "رابط الملف", "معرف الملف", "رابط فولدر البند", "معرف فولدر البند", "تاريخ الرفع", "مرفوع بواسطة", "حالة المسودة"];
}

function ensureCustomerDraftSheets_() {
  const ss = ss_();
  let drafts = ss.getSheetByName(SHEET_NAME_CUSTOMER_DRAFTS);
  if (!drafts) drafts = ss.insertSheet(SHEET_NAME_CUSTOMER_DRAFTS);
  ensureHeaderIfAnyMissing_(drafts, customerDraftHeaders_());

  let files = ss.getSheetByName(SHEET_NAME_CUSTOMER_FILES);
  if (!files) files = ss.insertSheet(SHEET_NAME_CUSTOMER_FILES);
  ensureHeaderIfAnyMissing_(files, customerFileHeaders_());
  return { drafts: drafts, files: files };
}

function initCustomerDraftsNow() {
  ensureCustomerDraftSheets_();
  const root = getCustomerFilesRootFolder_();
  return { success: true, message: "تم تجهيز شيتات مسودات العملاء وملفات Drive.", folderId: root.getId(), folderUrl: root.getUrl() };
}

function getCustomerFilesRootFolder_() {
  const folderId = customerFilesRootFolderId_();
  if (!folderId) throw new Error("لم يتم ضبط CUSTOMER_FILES_ROOT_FOLDER_ID في Script Properties.");
  return DriveApp.getFolderById(folderId);
}

function safeDriveName_(value) {
  return normalize_(value).replace(/[\\/:*?"<>|#%{}~&]/g, "-").replace(/\s+/g, " ").trim().slice(0, 120) || "بدون اسم";
}

function getOrCreateChildFolder_(parent, name) {
  name = safeDriveName_(name);
  const it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function makeCustomerDraftId_(customerCode) {
  return "DRAFT-" + normalize_(customerCode || "C") + "-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 900 + 100);
}

function findDraftRow_(draftId, customerCode) {
  const sh = ensureCustomerDraftSheets_().drafts;
  const h = headersMap_(sh);
  const colDraft = firstCol_(h, ["رقم المسودة"], 1);
  const colCode = firstCol_(h, ["كود الشات", "كود العميل"], 0);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (normalize_(valueAt_(row, colDraft)) === normalize_(draftId) && (!customerCode || normalize_(valueAt_(row, colCode)) === normalize_(customerCode))) {
      return { sheet: sh, rowNumber: i + 1, row: row, h: h };
    }
  }
  return null;
}

function createCustomerDraft_(e) {
  const auth = customerAuthorize_(e.parameter.customerCode || e.parameter.code, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  const customer = auth.customer;
  const sheets = ensureCustomerDraftSheets_();
  const root = getCustomerFilesRootFolder_();
  const draftsRoot = getOrCreateChildFolder_(root, "مسودات العملاء");
  const customerFolder = getOrCreateChildFolder_(draftsRoot, "كود " + customer.customerCode + " - " + safeDriveName_(customer.name));
  const draftId = makeCustomerDraftId_(customer.customerCode);
  const draftFolder = getOrCreateChildFolder_(customerFolder, draftId);
  const now = new Date();

  appendByHeaders_(sheets.drafts, {
    "رقم المسودة": draftId,
    "كود الشات": customer.customerCode,
    "اسم العميل": customer.name,
    "حالة المسودة": "مسودة",
    "تاريخ البداية": now,
    "رابط فولدر المسودة": draftFolder.getUrl(),
    "معرف فولدر المسودة": draftFolder.getId(),
    "عدد البنود": 0
  });
  SpreadsheetApp.flush();
  return { success: true, draftId: draftId, folderUrl: draftFolder.getUrl(), message: "تم فتح مسودة طلب." };
}

function addCustomerDraftItem_(e) {
  const auth = customerAuthorize_(e.parameter.customerCode || e.parameter.code, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  const customer = auth.customer;
  const draftId = normalize_(e.parameter.draftId);
  if (!draftId) return { success: false, message: "رقم المسودة مطلوب." };
  const foundDraft = findDraftRow_(draftId, customer.customerCode);
  if (!foundDraft) return { success: false, message: "المسودة غير موجودة." };
  const draftStatus = normalize_(valueAt_(foundDraft.row, firstCol_(foundDraft.h, ["حالة المسودة"], 0)));
  if (draftStatus && draftStatus !== "مسودة") return { success: false, message: "لا يمكن إضافة بنود بعد بدء التنفيذ." };

  let department = normalize_(e.parameter.department) || "طباعة";
  if (department !== "طباعة" && department !== "ليزر") department = "طباعة";
  const itemName = normalize_(e.parameter.itemName) || "بند جديد";
  const qty = Number(e.parameter.qty || 1) || 1;
  const notes = normalize_(e.parameter.notes || e.parameter.customerNotes);
  const heatPress = department === "طباعة" && isHeatPressFlag_(e.parameter.heatPress || e.parameter.press);
  const flyPrint = department === "طباعة" && isFlyPrintFlag_(e.parameter.flyPrint || e.parameter.quickPrint || e.parameter.fastPrint);
  const branchCode = normalize_(e.parameter.franchiseBranchCode || customer.branchCode || customer.franchiseBranchCode);
  const branchName = normalize_(e.parameter.franchiseBranchName || customer.branchName || customer.franchiseBranchName);

  const sheets = ensureCustomerDraftSheets_();
  const files = sheets.files;
  const h = headersMap_(files);
  const colDraft = firstCol_(h, ["رقم المسودة"], 0);
  const colRecord = firstCol_(h, ["نوع السجل"], 0);
  const data = files.getDataRange().getValues();
  let itemCount = 0;
  for (let i = 1; i < data.length; i++) {
    if (normalize_(valueAt_(data[i], colDraft)) === draftId && normalize_(valueAt_(data[i], colRecord)) === "بند") itemCount++;
  }
  const itemId = draftId + "-I" + String(itemCount + 1).padStart(2, "0");
  const draftFolderId = normalize_(valueAt_(foundDraft.row, firstCol_(foundDraft.h, ["معرف فولدر المسودة"], 0)));
  const draftFolder = DriveApp.getFolderById(draftFolderId);
  const itemFolder = getOrCreateChildFolder_(draftFolder, "بند " + String(itemCount + 1).padStart(2, "0") + " - " + department + " - " + safeDriveName_(itemName));
  const now = new Date();

  appendByHeaders_(files, {
    "نوع السجل": "بند",
    "رقم المسودة": draftId,
    "رقم بند المسودة": itemId,
    "كود الشات": customer.customerCode,
    "اسم العميل": customer.name,
    "كود فرع مطبعجي": branchCode,
    "اسم فرع مطبعجي": branchName,
    "نوع الشغل": itemName,
    "القسم": department,
    "الكمية": qty,
    "ملاحظات العميل": notes,
    "مكبس": heatPress ? "نعم" : "لا",
    "طباعة على الطاير": flyPrint ? "نعم" : "لا",
    "رابط فولدر البند": itemFolder.getUrl(),
    "معرف فولدر البند": itemFolder.getId(),
    "تاريخ الرفع": now,
    "مرفوع بواسطة": "العميل",
    "حالة المسودة": "مسودة"
  });

  safeSet_(foundDraft.sheet, foundDraft.rowNumber, firstCol_(foundDraft.h, ["عدد البنود"], 0), itemCount + 1);
  SpreadsheetApp.flush();
  return { success: true, itemId: itemId, folderUrl: itemFolder.getUrl(), message: "تم إضافة البند للمسودة." };
}

function uploadCustomerDraftFile_(payload) {
  payload = payload || {};
  const auth = customerAuthorize_(payload.customerCode || payload.code, payload.token);
  if (!auth.ok) return { success: false, message: auth.message };
  const customer = auth.customer;
  const draftId = normalize_(payload.draftId);
  const itemId = normalize_(payload.itemId);
  const fileName = safeDriveName_(payload.fileName || "upload.bin");
  const mimeType = normalize_(payload.mimeType) || "application/octet-stream";
  const base64 = normalize_(payload.base64);
  const size = Number(payload.size || 0) || 0;
  if (!draftId || !itemId || !base64) return { success: false, message: "بيانات رفع الملف ناقصة." };
  if (size > CUSTOMER_UPLOAD_MAX_BYTES) return { success: false, message: "حجم الملف أكبر من الحد المسموح 25MB." };

  const foundDraft = findDraftRow_(draftId, customer.customerCode);
  if (!foundDraft) return { success: false, message: "المسودة غير موجودة." };

  const sheets = ensureCustomerDraftSheets_();
  const files = sheets.files;
  const h = headersMap_(files);
  const colDraft = firstCol_(h, ["رقم المسودة"], 0);
  const colItem = firstCol_(h, ["رقم بند المسودة"], 0);
  const colRecord = firstCol_(h, ["نوع السجل"], 0);
  const colFolder = firstCol_(h, ["معرف فولدر البند"], 0);
  const data = files.getDataRange().getValues();
  let itemFolderId = "";
  let itemName = "";
  let department = "";
  let qty = "";
  let notes = "";
  let heatPress = "";
  let flyPrint = "";
  let branchCode = "";
  let branchName = "";
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (normalize_(valueAt_(row, colDraft)) === draftId && normalize_(valueAt_(row, colItem)) === itemId && normalize_(valueAt_(row, colRecord)) === "بند") {
      itemFolderId = normalize_(valueAt_(row, colFolder));
      itemName = normalize_(valueAt_(row, firstCol_(h, ["نوع الشغل"], 0)));
      department = normalize_(valueAt_(row, firstCol_(h, ["القسم"], 0)));
      qty = valueAt_(row, firstCol_(h, ["الكمية"], 0));
      notes = normalize_(valueAt_(row, firstCol_(h, ["ملاحظات العميل"], 0)));
      heatPress = normalize_(valueAt_(row, firstCol_(h, ["مكبس"], 0)));
      flyPrint = normalize_(valueAt_(row, firstCol_(h, ["طباعة على الطاير"], 0)));
      branchCode = normalize_(valueAt_(row, firstCol_(h, ["كود فرع مطبعجي"], 0)));
      branchName = normalize_(valueAt_(row, firstCol_(h, ["اسم فرع مطبعجي"], 0)));
      break;
    }
  }
  if (!itemFolderId) return { success: false, message: "لم يتم العثور على فولدر البند." };

  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const folder = DriveApp.getFolderById(itemFolderId);
  const file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  const now = new Date();

  appendByHeaders_(files, {
    "نوع السجل": "ملف",
    "رقم المسودة": draftId,
    "رقم بند المسودة": itemId,
    "كود الشات": customer.customerCode,
    "اسم العميل": customer.name,
    "كود فرع مطبعجي": branchCode,
    "اسم فرع مطبعجي": branchName,
    "نوع الشغل": itemName,
    "القسم": department,
    "الكمية": qty,
    "ملاحظات العميل": notes,
    "مكبس": heatPress,
    "طباعة على الطاير": flyPrint,
    "اسم الملف": fileName,
    "نوع الملف": mimeType,
    "حجم الملف": size,
    "رابط الملف": file.getUrl(),
    "معرف الملف": file.getId(),
    "رابط فولدر البند": folder.getUrl(),
    "معرف فولدر البند": itemFolderId,
    "تاريخ الرفع": now,
    "مرفوع بواسطة": "العميل",
    "حالة المسودة": "مسودة"
  });
  SpreadsheetApp.flush();
  return { success: true, fileId: file.getId(), fileUrl: file.getUrl(), fileName: fileName, mimeType: mimeType, thumbnailUrl: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w900", message: "تم رفع الملف." };
}

function collectDraftItems_(draftId, customerCode) {
  const sh = ensureCustomerDraftSheets_().files;
  const h = headersMap_(sh);
  const data = sh.getDataRange().getValues();
  const colRecord = firstCol_(h, ["نوع السجل"], 0);
  const colDraft = firstCol_(h, ["رقم المسودة"], 0);
  const colCode = firstCol_(h, ["كود الشات"], 0);
  const colItem = firstCol_(h, ["رقم بند المسودة"], 0);
  const items = {};
  const order = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (normalize_(valueAt_(row, colDraft)) !== draftId) continue;
    if (customerCode && normalize_(valueAt_(row, colCode)) !== normalize_(customerCode)) continue;
    const record = normalize_(valueAt_(row, colRecord));
    const itemId = normalize_(valueAt_(row, colItem));
    if (!itemId) continue;
    if (record === "بند") {
      if (!items[itemId]) order.push(itemId);
      items[itemId] = {
        itemId: itemId,
        rowNumber: i + 1,
        itemName: normalize_(valueAt_(row, firstCol_(h, ["نوع الشغل"], 0))),
        department: normalize_(valueAt_(row, firstCol_(h, ["القسم"], 0))),
        qty: valueAt_(row, firstCol_(h, ["الكمية"], 0)) || 1,
        notes: normalize_(valueAt_(row, firstCol_(h, ["ملاحظات العميل"], 0))),
        branchCode: normalize_(valueAt_(row, firstCol_(h, ["كود فرع مطبعجي"], 0))),
        branchName: normalize_(valueAt_(row, firstCol_(h, ["اسم فرع مطبعجي"], 0))),
        heatPress: normalize_(valueAt_(row, firstCol_(h, ["مكبس"], 0))) === "نعم",
        flyPrint: normalize_(valueAt_(row, firstCol_(h, ["طباعة على الطاير"], 0))) === "نعم",
        itemFolderUrl: normalize_(valueAt_(row, firstCol_(h, ["رابط فولدر البند"], 0))),
        itemFolderId: normalize_(valueAt_(row, firstCol_(h, ["معرف فولدر البند"], 0))),
        files: []
      };
    } else if (record === "ملف") {
      if (!items[itemId]) items[itemId] = { itemId: itemId, files: [] };
      items[itemId].files.push({
        name: normalize_(valueAt_(row, firstCol_(h, ["اسم الملف"], 0))),
        url: normalize_(valueAt_(row, firstCol_(h, ["رابط الملف"], 0))),
        fileId: normalize_(valueAt_(row, firstCol_(h, ["معرف الملف"], 0))),
        mimeType: normalize_(valueAt_(row, firstCol_(h, ["نوع الملف"], 0))),
        thumbnailUrl: normalize_(valueAt_(row, firstCol_(h, ["معرف الملف"], 0))) ? ("https://drive.google.com/thumbnail?id=" + normalize_(valueAt_(row, firstCol_(h, ["معرف الملف"], 0))) + "&sz=w900") : "",
        rowNumber: i + 1
      });
    }
  }
  return order.map(function (id) { return items[id]; }).filter(function (x) { return x && x.itemName; });
}

function submitCustomerDraft_(e) {
  const auth = customerAuthorize_(e.parameter.customerCode || e.parameter.code, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  const customer = auth.customer;
  const draftId = normalize_(e.parameter.draftId);
  if (!draftId) return { success: false, message: "رقم المسودة مطلوب." };
  const foundDraft = findDraftRow_(draftId, customer.customerCode);
  if (!foundDraft) return { success: false, message: "المسودة غير موجودة." };
  const statusCol = firstCol_(foundDraft.h, ["حالة المسودة"], 0);
  const currentStatus = normalize_(valueAt_(foundDraft.row, statusCol));
  if (currentStatus && currentStatus !== "مسودة") {
    const existingOrder = normalize_(valueAt_(foundDraft.row, firstCol_(foundDraft.h, ["رقم الأوردر الناتج"], 0)));
    return { success: true, orderId: existingOrder, message: "تم بدء التنفيذ لهذه المسودة من قبل." };
  }

  const items = collectDraftItems_(draftId, customer.customerCode);
  if (!items.length) return { success: false, message: "لا توجد بنود داخل المسودة." };

  const ss = ss_();
  const lines = ss.getSheetByName(SHEET_NAME_LINES);
  if (!lines) return { success: false, message: "شيت بنود الأوردرات غير موجود." };
  ensureWhatsAppHeaders_(lines);
  ensurePressColumn_(lines);
  ensureFlyPrintColumn_(lines);
  ensureHeaderIfAnyMissing_(lines, ["كود الشات", "كود العميل", "مصدر الطلب", "أنشئ بواسطة", "ملاحظات العميل", "رابط فولدر البند", "رابط ملفات البند", "رقم المسودة", "القسم الرئيسي", "كود فرع مطبعجي", "اسم فرع مطبعجي"]);
  const ordersSheet = ss.getSheetByName(SHEET_NAME_ORDERS);
  if (ordersSheet) ensureHeaderIfAnyMissing_(ordersSheet, ["كود الشات", "كود العميل", "مصدر الطلب", "أنشئ بواسطة", "ملاحظات العميل", "رابط فولدر الطلب", "رقم المسودة", "كود فرع مطبعجي", "اسم فرع مطبعجي"]);

  const now = new Date();
  const orderId = makeOrderId_(lines, now);
  const anyFly = items.some(function (x) { return x.flyPrint; });
  const allDepartments = items.map(function (x) { return x.department; }).filter(Boolean);
  const summaryDepartment = allDepartments.every(function (d) { return d === allDepartments[0]; }) ? (allDepartments[0] || "طباعة") : "طباعة + ليزر";
  const summaryName = items.map(function (x) { return x.itemName; }).join(" + ").slice(0, 180) || "طلب من بوابة العميل";
  const expectedDeliveryAt = anyFly ? new Date(now) : expectedDeliveryDate_(now);
  const expectedDeliveryText = anyFly ? (formatDateAr_(expectedDeliveryAt) + " - نفس اليوم") : formatDateAr_(expectedDeliveryAt);
  const draftFolderUrl = normalize_(valueAt_(foundDraft.row, firstCol_(foundDraft.h, ["رابط فولدر المسودة"], 0)));
  const orderBranchCode = items.map(function (x) { return x.branchCode; }).filter(Boolean)[0] || customer.branchCode || "";
  const orderBranchName = items.map(function (x) { return x.branchName; }).filter(Boolean)[0] || customer.branchName || "";

  const common = {
    orderId: orderId,
    now: now,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerType: customer.type,
    department: summaryDepartment,
    itemName: summaryName,
    qty: 1,
    priority: anyFly ? "عاجل" : "عادي",
    status: "طلب جديد",
    lineCount: items.length,
    readyCount: 0,
    notReadyCount: items.length,
    partial: "لا",
    notes: "طلب من بوابة العميل - " + items.length + " بند",
    receivedAt: now,
    expectedDeliveryAt: expectedDeliveryAt,
    expectedDeliveryText: expectedDeliveryText,
    heatPress: items.some(function (x) { return x.heatPress; }),
    flyPrint: anyFly,
    debtAmount: 0,
    debtNotes: "",
    customerCode: customer.customerCode,
    source: "بوابة العميل - شات الطلب",
    createdBy: "العميل",
    customerNotes: "مسودة: " + draftId,
    draftId: draftId,
    draftFolderUrl: draftFolderUrl,
    franchiseBranchCode: orderBranchCode,
    franchiseBranchName: orderBranchName
  };

  upsertOrderSummary_(common);
  const lineResults = [];
  const itemLineMap = {}; // V1846: ربط رقم بند المسودة برقم بند الأوردر النهائي حتى تظهر ملفات الليزر والطباعة في محادثة الموظف.
  items.forEach(function (item, idx) {
    const lineNo = String(idx + 1).padStart(2, "0");
    const lineId = orderId + "-" + lineNo;
    const filesText = (item.files || []).map(function (f) { return f.name + ": " + f.url; }).join("\n");
    const notes = [item.notes || "", filesText ? "ملفات البند:\n" + filesText : "", item.itemFolderUrl ? "فولدر البند: " + item.itemFolderUrl : ""].filter(Boolean).join("\n");
    itemLineMap[item.itemId] = lineId;
    appendLine_(ss, Object.assign({}, common, {
      lineId: lineId,
      department: item.department || "طباعة",
      itemName: item.itemName || "بند جديد",
      qty: item.qty || 1,
      assignedTo: defaultAssigned_(item.department || "طباعة"),
      priority: item.flyPrint ? "عاجل" : "عادي",
      heatPress: item.heatPress,
      flyPrint: item.flyPrint,
      notes: notes,
      customerNotes: item.notes || "",
      itemFolderUrl: item.itemFolderUrl || "",
      filesText: filesText,
      franchiseBranchCode: item.branchCode || orderBranchCode,
      franchiseBranchName: item.branchName || orderBranchName
    }));
    lineResults.push({ lineId: lineId, department: item.department, itemName: item.itemName });
  });

  // تحديث شيت المسودات وشيت الملفات برقم الأوردر النهائي
  safeSet_(foundDraft.sheet, foundDraft.rowNumber, statusCol, "تم بدء التنفيذ");
  safeSet_(foundDraft.sheet, foundDraft.rowNumber, firstCol_(foundDraft.h, ["تاريخ الإرسال للتنفيذ"], 0), now);
  safeSet_(foundDraft.sheet, foundDraft.rowNumber, firstCol_(foundDraft.h, ["رقم الأوردر الناتج"], 0), orderId);

  const filesSheet = ensureCustomerDraftSheets_().files;
  const fh = headersMap_(filesSheet);
  const fData = filesSheet.getDataRange().getValues();
  const colDraft = firstCol_(fh, ["رقم المسودة"], 0);
  const colOrder = firstCol_(fh, ["رقم الأوردر"], 0);
  const colLineFinal = firstCol_(fh, ["رقم البند"], 0);
  const colItemDraft = firstCol_(fh, ["رقم بند المسودة"], 0);
  const colStatus = firstCol_(fh, ["حالة المسودة"], 0);
  for (let i = 1; i < fData.length; i++) {
    if (normalize_(valueAt_(fData[i], colDraft)) === draftId) {
      const draftItemId = normalize_(valueAt_(fData[i], colItemDraft));
      safeSet_(filesSheet, i + 1, colOrder, orderId);
      if (colLineFinal && draftItemId && itemLineMap[draftItemId]) safeSet_(filesSheet, i + 1, colLineFinal, itemLineMap[draftItemId]);
      safeSet_(filesSheet, i + 1, colStatus, "تم بدء التنفيذ");
    }
  }

  appendActivityLog_({ time: now, orderId: orderId, lineId: orderId + "-01", customer: customer.name, department: summaryDepartment, action: "بدء تنفيذ طلب من بوابة العميل", newStatus: "طلب جديد", by: "العميل " + customer.customerCode, details: "تم تحويل المسودة " + draftId + " إلى أوردر رسمي بعدد بنود " + items.length });

  SpreadsheetApp.flush();
  return { success: true, orderId: orderId, lines: lineResults, count: lineResults.length, message: "تم بدء التنفيذ واستلام رقم الأوردر." };
}

function initCustomerPortalNow() {
  const sheet = ensureCustomerPortalHeaders_();
  const cols = customerCols_(sheet);
  const data = sheet.getDataRange().getValues();
  let changed = 0;
  for (let i = 1; i < data.length; i++) {
    const rowNumber = i + 1;
    const row = data[i];
    const name = normalize_(valueAt_(row, cols.name));
    if (!name) continue;
    let code = normalize_(valueAt_(row, cols.code));
    if (!code) {
      code = makeNextCustomerCode_(sheet, cols);
      safeSet_(sheet, rowNumber, cols.code, code);
      safeSet_(sheet, rowNumber, firstCol_(headersMap_(sheet), ["كود العميل"], 0), code);
      changed++;
    }
    if (!normalize_(valueAt_(row, cols.pass))) {
      safeSet_(sheet, rowNumber, cols.pass, hashCustomerPassword_(customerDefaultPassword_()));
      safeSet_(sheet, rowNumber, cols.mustChange, "نعم");
      changed++;
    }
  }
  ensureCustomerDraftSheets_();
  SpreadsheetApp.flush();
  return { success: true, message: "تم تجهيز بوابة العملاء.", changed: changed, defaultPassword: customerDefaultPassword_() };
}

/************************************************************
 * Drive Authorization Test - V1844
 * شغّل هذه الدالة مرة واحدة من محرر Apps Script لمنح صلاحية الكتابة على Google Drive.
 ************************************************************/
function testDriveWriteAuth() {
  const root = getCustomerFilesRootFolder_();
  const testFolderName = "TEST_AUTH_" + new Date().getTime();
  const folder = root.createFolder(testFolderName);
  folder.createFile("test.txt", "Drive write permission OK");
  Logger.log(folder.getUrl());
  return {
    success: true,
    message: "تم اختبار صلاحية الكتابة على Google Drive بنجاح.",
    folderUrl: folder.getUrl()
  };
}


/*********************** V1846 - محادثة الأوردر للموظف والملفات ***********************/
const SHEET_NAME_ORDER_CONVERSATIONS = "محادثات الأوردرات";

function orderConversationHeaders_() {
  return ["رقم الرسالة", "رقم الأوردر", "رقم البند", "كود الشات", "اسم العميل", "القسم", "نوع المرسل", "اسم المرسل", "نص الرسالة", "اسم الملف", "نوع الملف", "حجم الملف", "رابط الملف", "معرف الملف", "تاريخ الرسالة", "مرئي للعميل"];
}

function ensureOrderConversationSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET_NAME_ORDER_CONVERSATIONS);
  if (!sh) sh = ss.insertSheet(SHEET_NAME_ORDER_CONVERSATIONS);
  ensureHeaderIfAnyMissing_(sh, orderConversationHeaders_());
  return sh;
}

function initOrderConversationsNow() {
  const sh = ensureOrderConversationSheet_();
  return { success: true, message: "تم تجهيز شيت محادثات الأوردرات.", sheet: sh.getName() };
}

function makeConversationMessageId_() {
  return "MSG-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 9000 + 1000);
}

function collectOrderLinesForConversation_(orderId, lineId) {
  const lines = ss_().getSheetByName(SHEET_NAME_LINES);
  if (!lines) return [];
  const h = headersMap_(lines);
  const data = lines.getDataRange().getValues();
  const colOrder = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colLine = firstCol_(h, ["رقم البند", "Line ID"], 0);
  const colCustomer = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 0);
  const colCode = firstCol_(h, ["كود الشات", "كود العميل"], 0);
  const colDept = firstCol_(h, ["القسم", "Department"], 0);
  const colItem = firstCol_(h, ["اسم البند / نوع الشغل", "اسم البند", "Item Name"], 0);
  const colQty = firstCol_(h, ["الكمية", "Qty"], 0);
  const colStatus = firstCol_(h, ["الحالة", "Status"], 0);
  const colNotes = firstCol_(h, ["ملاحظات", "Notes"], 0);
  const colFolder = firstCol_(h, ["رابط فولدر البند"], 0);
  const colFiles = firstCol_(h, ["رابط ملفات البند"], 0);
  const out = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const oid = normalize_(valueAt_(row, colOrder));
    const lid = normalize_(valueAt_(row, colLine));
    if (oid !== normalize_(orderId)) continue;
    if (lineId && lid !== normalize_(lineId)) continue;
    out.push({
      rowNumber: i + 1,
      orderId: oid,
      lineId: lid,
      customer: normalize_(valueAt_(row, colCustomer)),
      customerCode: normalize_(valueAt_(row, colCode)),
      department: normalize_(valueAt_(row, colDept)),
      itemName: normalize_(valueAt_(row, colItem)),
      qty: valueAt_(row, colQty) || 1,
      status: normalize_(valueAt_(row, colStatus)),
      notes: normalize_(valueAt_(row, colNotes)),
      itemFolderUrl: normalize_(valueAt_(row, colFolder)),
      filesText: normalize_(valueAt_(row, colFiles))
    });
  }
  return out;
}

function collectOrderPortalFiles_(orderId, lineId) {
  const sh = ss_().getSheetByName(SHEET_NAME_CUSTOMER_FILES);
  if (!sh) return [];
  const h = headersMap_(sh);
  const data = sh.getDataRange().getValues();
  const colRecord = firstCol_(h, ["نوع السجل"], 0);
  const colOrder = firstCol_(h, ["رقم الأوردر"], 0);
  const colLine = firstCol_(h, ["رقم البند"], 0);
  const colItemDraft = firstCol_(h, ["رقم بند المسودة"], 0);
  const colName = firstCol_(h, ["اسم الملف"], 0);
  const colType = firstCol_(h, ["نوع الملف"], 0);
  const colUrl = firstCol_(h, ["رابط الملف"], 0);
  const colFileId = firstCol_(h, ["معرف الملف"], 0);
  const colItemName = firstCol_(h, ["نوع الشغل"], 0);
  const colDept = firstCol_(h, ["القسم"], 0);
  const colNotes = firstCol_(h, ["ملاحظات العميل"], 0);
  const colFolder = firstCol_(h, ["رابط فولدر البند"], 0);
  const out = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (normalize_(valueAt_(row, colOrder)) !== normalize_(orderId)) continue;
    const lid = normalize_(valueAt_(row, colLine));
    if (lineId && lid && lid !== normalize_(lineId)) continue;
    if (lineId && !lid) continue; // الملفات القديمة قبل V1846 تظهر على مستوى الأوردر كله فقط.
    const record = normalize_(valueAt_(row, colRecord));
    if (record !== "ملف" && record !== "بند") continue;
    out.push({
      recordType: record,
      orderId: orderId,
      lineId: lid,
      draftItemId: normalize_(valueAt_(row, colItemDraft)),
      itemName: normalize_(valueAt_(row, colItemName)),
      department: normalize_(valueAt_(row, colDept)),
      notes: normalize_(valueAt_(row, colNotes)),
      name: normalize_(valueAt_(row, colName)) || (record === "بند" ? "فولدر البند" : "ملف"),
      mimeType: normalize_(valueAt_(row, colType)),
      url: normalize_(valueAt_(row, colUrl)) || normalize_(valueAt_(row, colFolder)),
      fileId: normalize_(valueAt_(row, colFileId)),
      rowNumber: i + 1
    });
  }
  return out;
}

function collectOrderConversationMessages_(orderId, lineId) {
  const sh = ensureOrderConversationSheet_();
  const h = headersMap_(sh);
  const data = sh.getDataRange().getValues();
  const colOrder = firstCol_(h, ["رقم الأوردر"], 0);
  const colLine = firstCol_(h, ["رقم البند"], 0);
  const out = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (normalize_(valueAt_(row, colOrder)) !== normalize_(orderId)) continue;
    const lid = normalize_(valueAt_(row, colLine));
    if (lineId && lid && lid !== normalize_(lineId)) continue;
    out.push({
      messageId: normalize_(valueAt_(row, firstCol_(h, ["رقم الرسالة"], 0))),
      orderId: normalize_(valueAt_(row, colOrder)),
      lineId: lid,
      customerCode: normalize_(valueAt_(row, firstCol_(h, ["كود الشات"], 0))),
      customer: normalize_(valueAt_(row, firstCol_(h, ["اسم العميل"], 0))),
      department: normalize_(valueAt_(row, firstCol_(h, ["القسم"], 0))),
      senderType: normalize_(valueAt_(row, firstCol_(h, ["نوع المرسل"], 0))),
      senderName: normalize_(valueAt_(row, firstCol_(h, ["اسم المرسل"], 0))),
      text: normalize_(valueAt_(row, firstCol_(h, ["نص الرسالة"], 0))),
      fileName: normalize_(valueAt_(row, firstCol_(h, ["اسم الملف"], 0))),
      fileUrl: normalize_(valueAt_(row, firstCol_(h, ["رابط الملف"], 0))),
      fileId: normalize_(valueAt_(row, firstCol_(h, ["معرف الملف"], 0))),
      mimeType: normalize_(valueAt_(row, firstCol_(h, ["نوع الملف"], 0))),
      thumbnailUrl: normalize_(valueAt_(row, firstCol_(h, ["معرف الملف"], 0))) ? ("https://drive.google.com/thumbnail?id=" + normalize_(valueAt_(row, firstCol_(h, ["معرف الملف"], 0))) + "&sz=w900") : "",
      createdAt: dateText_(valueAt_(row, firstCol_(h, ["تاريخ الرسالة"], 0))) || valueAt_(row, firstCol_(h, ["تاريخ الرسالة"], 0)),
      visibleToCustomer: normalize_(valueAt_(row, firstCol_(h, ["مرئي للعميل"], 0))) || "نعم"
    });
  }
  return out;
}

function getOrderConversation_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  const orderId = normalize_(e.parameter.orderId);
  const lineId = normalize_(e.parameter.lineId);
  if (!orderId) return { success: false, message: "رقم الأوردر مطلوب." };
  const lines = collectOrderLinesForConversation_(orderId, lineId);
  if (!lines.length) return { success: false, message: "لم يتم العثور على بنود هذا الأوردر." };
  return {
    success: true,
    orderId: orderId,
    lineId: lineId,
    lines: lines,
    files: collectOrderPortalFiles_(orderId, lineId),
    messages: collectOrderConversationMessages_(orderId, lineId)
  };
}

function appendOrderConversationMessage_(o) {
  const sh = ensureOrderConversationSheet_();
  appendByHeaders_(sh, {
    "رقم الرسالة": o.messageId || makeConversationMessageId_(),
    "رقم الأوردر": o.orderId,
    "رقم البند": o.lineId || "",
    "كود الشات": o.customerCode || "",
    "اسم العميل": o.customerName || "",
    "القسم": o.department || "",
    "نوع المرسل": o.senderType || "موظف",
    "اسم المرسل": o.senderName || "",
    "نص الرسالة": o.text || "",
    "اسم الملف": o.fileName || "",
    "نوع الملف": o.mimeType || "",
    "حجم الملف": o.size || "",
    "رابط الملف": o.fileUrl || "",
    "معرف الملف": o.fileId || "",
    "تاريخ الرسالة": o.createdAt || new Date(),
    "مرئي للعميل": o.visibleToCustomer || "نعم"
  });
}

function sendOrderConversationMessage_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  const orderId = normalize_(e.parameter.orderId);
  const lineId = normalize_(e.parameter.lineId);
  const text = normalize_(e.parameter.message || e.parameter.text);
  if (!orderId || !text) return { success: false, message: "رقم الأوردر ونص الرسالة مطلوبين." };
  const lines = collectOrderLinesForConversation_(orderId, lineId);
  if (!lines.length) return { success: false, message: "الأوردر غير موجود." };
  const line = lines[0];
  appendOrderConversationMessage_({
    orderId: orderId,
    lineId: lineId || line.lineId,
    customerCode: line.customerCode,
    customerName: line.customer,
    department: line.department,
    senderType: "موظف",
    senderName: auth.user.name || auth.user.username,
    text: text,
    visibleToCustomer: normalize_(e.parameter.visibleToCustomer) || "نعم"
  });
  SpreadsheetApp.flush();
  return { success: true, message: "تم حفظ رسالة المتابعة في محادثة الأوردر." };
}

function uploadOrderConversationFile_(payload) {
  payload = payload || {};
  const auth = authorize_(payload.username, payload.token);
  if (!auth.ok) return { success: false, message: auth.message };
  const orderId = normalize_(payload.orderId);
  const lineId = normalize_(payload.lineId);
  const text = normalize_(payload.message || payload.text);
  const fileName = safeDriveName_(payload.fileName || "proof.bin");
  const mimeType = normalize_(payload.mimeType) || "application/octet-stream";
  const base64 = normalize_(payload.base64);
  const size = Number(payload.size || 0) || 0;
  if (!orderId || !base64) return { success: false, message: "بيانات رفع البروفة ناقصة." };
  if (size > CUSTOMER_UPLOAD_MAX_BYTES) return { success: false, message: "حجم الملف أكبر من الحد المسموح 25MB." };
  const lines = collectOrderLinesForConversation_(orderId, lineId);
  if (!lines.length) return { success: false, message: "الأوردر غير موجود." };
  const line = lines[0];
  const root = getCustomerFilesRootFolder_();
  const convRoot = getOrCreateChildFolder_(root, "محادثات الأوردرات");
  const orderFolder = getOrCreateChildFolder_(convRoot, safeDriveName_(orderId + " - " + line.customer));
  const targetFolder = getOrCreateChildFolder_(orderFolder, safeDriveName_((lineId || line.lineId || "عام") + " - " + (line.itemName || "بند")));
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = targetFolder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  appendOrderConversationMessage_({
    orderId: orderId,
    lineId: lineId || line.lineId,
    customerCode: line.customerCode,
    customerName: line.customer,
    department: line.department,
    senderType: "موظف",
    senderName: auth.user.name || auth.user.username,
    text: text || "تم رفع ملف/بروفة من الموظف.",
    fileName: fileName,
    mimeType: mimeType,
    size: size,
    fileUrl: file.getUrl(),
    fileId: file.getId(),
    visibleToCustomer: normalize_(payload.visibleToCustomer) || "نعم"
  });
  SpreadsheetApp.flush();
  return { success: true, message: "تم رفع الملف وحفظه في محادثة الأوردر.", fileUrl: file.getUrl(), fileId: file.getId(), fileName: fileName, mimeType: mimeType, thumbnailUrl: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w900" };
}


/************************************************************
 * V1851 PATCH - لوحة إعلانات ضياء للعميل
 ************************************************************/

const SHEET_NAME_PLATFORM_ADS = "إعلانات المنصة";

function platformAdHeaders_() {
  return [
    "رقم الإعلان",
    "العنوان",
    "اسم الملف",
    "نوع الملف",
    "حجم الملف",
    "رابط الملف",
    "معرف الملف",
    "رابط الصورة",
    "تكبير الإعلان",
    "إزاحة X",
    "إزاحة Y",
    "نمط العرض",
    "مكان الإعلان",
    "مفعل",
    "تاريخ الإنشاء",
    "أنشأ بواسطة"
  ];
}

function ensurePlatformAdsSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET_NAME_PLATFORM_ADS);
  if (!sh) sh = ss.insertSheet(SHEET_NAME_PLATFORM_ADS);
  ensureHeaderIfAnyMissing_(sh, platformAdHeaders_());
  return sh;
}

function initPlatformAdsNow() {
  const sh = ensurePlatformAdsSheet_();
  const folder = getPlatformAdsFolder_();
  return { success: true, message: "تم تجهيز لوحة الإعلانات.", sheet: sh.getName(), folderId: folder.getId(), folderUrl: folder.getUrl() };
}

function getPlatformAdsFolder_() {
  const root = getCustomerFilesRootFolder_();
  return getOrCreateChildFolder_(root, "إعلانات المنصة");
}

function canManagePlatformAds_(auth) {
  if (!auth || !auth.ok) return false;
  const username = normalize_(auth.user.username || "");
  const role = roleFromArabic_(auth.user.role, auth.user.department);
  return role === "admin" || username === "ضياء";
}

function makePlatformAdId_() {
  return "AD-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 900 + 100);
}

function getPlatformAds_(e) {
  e = e || { parameter: {} };
  const includeInactive = normalize_(e.parameter.includeInactive) === "نعم" || normalize_(e.parameter.includeInactive) === "true";
  if (includeInactive) {
    const auth = authorize_(e.parameter.username, e.parameter.token);
    if (!auth.ok) return { success: false, message: auth.message };
    if (!canManagePlatformAds_(auth)) return { success: false, message: "غير مصرح بإدارة الإعلانات." };
  }

  const sh = ensurePlatformAdsSheet_();
  const h = headersMap_(sh);
  const data = sh.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const active = normalize_(valueAt_(row, firstCol_(h, ["مفعل"], 0))) || "نعم";
    if (!includeInactive && active === "لا") continue;
    const fileId = normalize_(valueAt_(row, firstCol_(h, ["معرف الملف"], 0)));
    rows.push({
      adId: normalize_(valueAt_(row, firstCol_(h, ["رقم الإعلان"], 0))),
      title: normalize_(valueAt_(row, firstCol_(h, ["العنوان"], 0))),
      fileName: normalize_(valueAt_(row, firstCol_(h, ["اسم الملف"], 0))),
      mimeType: normalize_(valueAt_(row, firstCol_(h, ["نوع الملف"], 0))),
      size: valueAt_(row, firstCol_(h, ["حجم الملف"], 0)),
      fileUrl: normalize_(valueAt_(row, firstCol_(h, ["رابط الملف"], 0))),
      fileId: fileId,
      thumbnailUrl: fileId ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=w1000" : normalize_(valueAt_(row, firstCol_(h, ["رابط الصورة"], 0))),
      scale: normalize_(valueAt_(row, firstCol_(h, ["تكبير الإعلان"], 0))) || "1",
      offsetX: normalize_(valueAt_(row, firstCol_(h, ["إزاحة X"], 0))) || "0",
      offsetY: normalize_(valueAt_(row, firstCol_(h, ["إزاحة Y"], 0))) || "0",
      fitMode: normalize_(valueAt_(row, firstCol_(h, ["نمط العرض"], 0))) || "cover",
      placement: normalize_(valueAt_(row, firstCol_(h, ["مكان الإعلان"], 0))) || "top",
      active: active,
      createdAt: valueAt_(row, firstCol_(h, ["تاريخ الإنشاء"], 0)),
      createdBy: normalize_(valueAt_(row, firstCol_(h, ["أنشأ بواسطة"], 0)))
    });
  }
  rows.reverse();
  return { success: true, ads: rows, count: rows.length };
}

function deletePlatformAd_(e) {
  e = e || { parameter: {} };
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canManagePlatformAds_(auth)) return { success: false, message: "غير مصرح بحذف الإعلانات." };

  const adId = normalize_(e.parameter.adId || e.parameter.id);
  if (!adId) return { success: false, message: "رقم الإعلان مطلوب للحذف." };

  const sh = ensurePlatformAdsSheet_();
  const h = headersMap_(sh);
  const adIdCol = firstCol_(h, ["رقم الإعلان"], 0);
  const fileIdCol = firstCol_(h, ["معرف الملف"], 0);
  const data = sh.getDataRange().getValues();
  let targetRow = 0;
  let fileId = "";

  for (let i = 1; i < data.length; i++) {
    if (normalize_(valueAt_(data[i], adIdCol)) === adId) {
      targetRow = i + 1;
      fileId = normalize_(valueAt_(data[i], fileIdCol));
      break;
    }
  }

  if (!targetRow) return { success: false, message: "الإعلان غير موجود أو تم حذفه من قبل." };

  sh.deleteRow(targetRow);
  let driveMessage = "";
  if (fileId) {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
      driveMessage = " وتم نقل الصورة لسلة مهملات Drive.";
    } catch (err) {
      driveMessage = " لكن لم أستطع حذف ملف Drive تلقائيًا.";
    }
  }
  SpreadsheetApp.flush();
  return { success: true, message: "تم حذف الإعلان من لوحة العملاء" + driveMessage, adId: adId };
}

function uploadPlatformAd_(payload) {
  payload = payload || {};
  const auth = authorize_(payload.username, payload.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canManagePlatformAds_(auth)) return { success: false, message: "غير مصرح برفع الإعلانات." };

  const base64 = normalize_(payload.base64);
  const fileName = safeDriveName_(payload.fileName || "ad.png");
  const mimeType = normalize_(payload.mimeType) || "image/png";
  const title = normalize_(payload.title);
  const active = normalize_(payload.active) || "نعم";
  const adScale = normalize_(payload.adScale) || "1";
  const adOffsetX = normalize_(payload.adOffsetX) || "0";
  const adOffsetY = normalize_(payload.adOffsetY) || "0";
  const adFit = normalize_(payload.adFit) || "cover";
  let adPlacement = normalize_(payload.adPlacement || payload.placement) || "top";
  if (["top", "marketplace", "branches"].indexOf(adPlacement) === -1) adPlacement = "top";
  const size = Number(payload.size || 0) || 0;
  if (!base64) return { success: false, message: "ملف الإعلان غير موجود." };
  if (mimeType.indexOf("image/") !== 0) return { success: false, message: "لوحة الإعلانات تقبل صور فقط." };
  if (size > CUSTOMER_UPLOAD_MAX_BYTES) return { success: false, message: "حجم الإعلان أكبر من 25MB." };

  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const folder = getPlatformAdsFolder_();
  const file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  const sh = ensurePlatformAdsSheet_();
  const now = new Date();
  const adId = makePlatformAdId_();

  appendByHeaders_(sh, {
    "رقم الإعلان": adId,
    "العنوان": title,
    "اسم الملف": fileName,
    "نوع الملف": mimeType,
    "حجم الملف": size,
    "رابط الملف": file.getUrl(),
    "معرف الملف": file.getId(),
    "رابط الصورة": "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000",
    "تكبير الإعلان": adScale,
    "إزاحة X": adOffsetX,
    "إزاحة Y": adOffsetY,
    "نمط العرض": adFit,
    "مكان الإعلان": adPlacement,
    "مفعل": active === "لا" ? "لا" : "نعم",
    "تاريخ الإنشاء": now,
    "أنشأ بواسطة": auth.user.username
  });
  SpreadsheetApp.flush();
  return { success: true, adId: adId, fileUrl: file.getUrl(), fileId: file.getId(), thumbnailUrl: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000", message: "تم رفع الإعلان." };
}


/************************************************************
 * V1851 PATCH - أقسام المنصة الديناميكية من لوحة ضياء
 ************************************************************/

const SHEET_NAME_PLATFORM_SECTIONS = "أقسام المنصة";

function platformSectionHeaders_() {
  return [
    "كود القسم",
    "اسم القسم",
    "الوصف",
    "نوع القسم",
    "نوع التنفيذ",
    "ترتيب الظهور",
    "مفعل",
    "اسم المورد",
    "رقم واتساب المورد",
    "سعر خدمة التصميم",
    "ملاحظات داخلية",
    "اسم الملف",
    "نوع الملف",
    "حجم الملف",
    "رابط الملف",
    "معرف الملف",
    "رابط الصورة",
    "تاريخ الإنشاء",
    "آخر تحديث",
    "أنشأ بواسطة"
  ];
}

function ensurePlatformSectionsSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET_NAME_PLATFORM_SECTIONS);
  if (!sh) sh = ss.insertSheet(SHEET_NAME_PLATFORM_SECTIONS);
  ensureHeaderIfAnyMissing_(sh, platformSectionHeaders_());
  return sh;
}

function initPlatformSectionsNow() {
  const sh = ensurePlatformSectionsSheet_();
  const folder = getPlatformSectionsFolder_();
  seedDefaultPlatformSections_(sh);
  return { success: true, message: "تم تجهيز أقسام المنصة.", sheet: sh.getName(), folderId: folder.getId(), folderUrl: folder.getUrl() };
}

function getPlatformSectionsFolder_() {
  const root = getCustomerFilesRootFolder_();
  return getOrCreateChildFolder_(root, "أقسام المنصة");
}

function canManagePlatformSections_(auth) {
  if (!auth || !auth.ok) return false;
  const username = normalize_(auth.user.username || "");
  const role = roleFromArabic_(auth.user.role, auth.user.department);
  return role === "admin" || username === "ضياء";
}

function makePlatformSectionCode_(name) {
  const raw = normalize_(name || "SECTION");
  const latin = raw.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toUpperCase();
  if (latin) return latin.slice(0, 20);
  return "SEC-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 900 + 100);
}

function seedDefaultPlatformSections_(sh) {
  const h = headersMap_(sh);
  const data = sh.getDataRange().getValues();
  if (data.length > 1) return;
  const now = new Date();
  [
    { code: "DTF", name: "DTF", desc: "طباعة DTF للملابس والتيشيرتات" },
    { code: "BANNER", name: "Banner", desc: "طباعة بنر ولافتات ومطبوعات خارجية" },
    { code: "DTFUV", name: "DTF UV", desc: "طباعة DTF UV للاستيكرات والهدايا" },
    { code: "UV", name: "UV", desc: "طباعة UV على الخامات والهدايا" }
  ].forEach(function (x, i) {
    appendByHeaders_(sh, {
      "كود القسم": x.code,
      "اسم القسم": x.name,
      "الوصف": x.desc,
      "نوع القسم": "مورد خارجي",
      "نوع التنفيذ": "وسيط",
      "ترتيب الظهور": i + 1,
      "مفعل": "نعم",
      "سعر خدمة التصميم": 10,
      "تاريخ الإنشاء": now,
      "آخر تحديث": now,
      "أنشأ بواسطة": "system"
    });
  });
}

function getPlatformSections_(e) {
  e = e || { parameter: {} };
  const includeInactive = normalize_(e.parameter.includeInactive) === "نعم" || normalize_(e.parameter.includeInactive) === "true";
  if (includeInactive) {
    const auth = authorize_(e.parameter.username, e.parameter.token);
    if (!auth.ok) return { success: false, message: auth.message };
    if (!canManagePlatformSections_(auth)) return { success: false, message: "غير مصرح بإدارة أقسام المنصة." };
  }
  const sh = ensurePlatformSectionsSheet_();
  seedDefaultPlatformSections_(sh);
  const h = headersMap_(sh);
  const data = sh.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const active = normalize_(valueAt_(row, firstCol_(h, ["مفعل"], 0))) || "نعم";
    if (!includeInactive && active === "لا") continue;
    const fileId = normalize_(valueAt_(row, firstCol_(h, ["معرف الملف"], 0)));
    rows.push({
      sectionCode: normalize_(valueAt_(row, firstCol_(h, ["كود القسم"], 0))),
      name: normalize_(valueAt_(row, firstCol_(h, ["اسم القسم"], 0))),
      description: normalize_(valueAt_(row, firstCol_(h, ["الوصف"], 0))),
      sectionType: normalize_(valueAt_(row, firstCol_(h, ["نوع القسم"], 0))),
      executionType: normalize_(valueAt_(row, firstCol_(h, ["نوع التنفيذ"], 0))),
      sortOrder: valueAt_(row, firstCol_(h, ["ترتيب الظهور"], 0)),
      active: active,
      supplierName: normalize_(valueAt_(row, firstCol_(h, ["اسم المورد"], 0))),
      supplierWhatsapp: normalize_(valueAt_(row, firstCol_(h, ["رقم واتساب المورد"], 0))),
      designPrice: valueAt_(row, firstCol_(h, ["سعر خدمة التصميم"], 0)) || 10,
      notes: normalize_(valueAt_(row, firstCol_(h, ["ملاحظات داخلية"], 0))),
      fileName: normalize_(valueAt_(row, firstCol_(h, ["اسم الملف"], 0))),
      mimeType: normalize_(valueAt_(row, firstCol_(h, ["نوع الملف"], 0))),
      fileUrl: normalize_(valueAt_(row, firstCol_(h, ["رابط الملف"], 0))),
      fileId: fileId,
      thumbnailUrl: fileId ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=w1000" : normalize_(valueAt_(row, firstCol_(h, ["رابط الصورة"], 0))),
      createdAt: valueAt_(row, firstCol_(h, ["تاريخ الإنشاء"], 0)),
      updatedAt: valueAt_(row, firstCol_(h, ["آخر تحديث"], 0)),
      rowNumber: i + 1
    });
  }
  rows.sort(function (a, b) { return (Number(a.sortOrder || 9999) - Number(b.sortOrder || 9999)) || String(a.name || "").localeCompare(String(b.name || "")); });
  return { success: true, sections: rows, count: rows.length };
}

function savePlatformSection_(payload) {
  payload = payload || {};
  const auth = authorize_(payload.username, payload.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canManagePlatformSections_(auth)) return { success: false, message: "غير مصرح بحفظ أقسام المنصة." };

  const name = normalize_(payload.name);
  if (!name) return { success: false, message: "اسم القسم مطلوب." };
  let sectionCode = normalize_(payload.sectionCode) || makePlatformSectionCode_(name);
  const sh = ensurePlatformSectionsSheet_();
  const h = headersMap_(sh);
  const data = sh.getDataRange().getValues();
  const colCode = firstCol_(h, ["كود القسم"], 0);
  let rowNumber = 0;
  for (let i = 1; i < data.length; i++) {
    if (normalize_(valueAt_(data[i], colCode)) === sectionCode) { rowNumber = i + 1; break; }
  }

  let file = null;
  let fileUrl = normalize_(payload.fileUrl);
  let fileId = normalize_(payload.fileId);
  let thumbnailUrl = normalize_(payload.thumbnailUrl);
  const base64 = normalize_(payload.base64);
  const fileName = safeDriveName_(payload.fileName || "section.png");
  const mimeType = normalize_(payload.mimeType) || "";
  const size = Number(payload.size || 0) || 0;

  if (base64) {
    if (mimeType.indexOf("image/") !== 0) return { success: false, message: "صورة القسم يجب أن تكون صورة فقط." };
    if (size > CUSTOMER_UPLOAD_MAX_BYTES) return { success: false, message: "حجم صورة القسم أكبر من 25MB." };
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType || "image/png", fileName);
    file = getPlatformSectionsFolder_().createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    fileUrl = file.getUrl();
    fileId = file.getId();
    thumbnailUrl = "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000";
  }

  const now = new Date();
  const obj = {
    "كود القسم": sectionCode,
    "اسم القسم": name,
    "الوصف": normalize_(payload.description),
    "نوع القسم": normalize_(payload.sectionType) || "طباعة",
    "نوع التنفيذ": normalize_(payload.executionType) || "وسيط",
    "ترتيب الظهور": normalize_(payload.sortOrder),
    "مفعل": normalize_(payload.active) === "لا" ? "لا" : "نعم",
    "اسم المورد": normalize_(payload.supplierName),
    "رقم واتساب المورد": normalize_(payload.supplierWhatsapp),
    "سعر خدمة التصميم": normalize_(payload.designPrice) || 10,
    "ملاحظات داخلية": normalize_(payload.notes),
    "آخر تحديث": now,
    "أنشأ بواسطة": auth.user.username
  };
  if (!rowNumber) obj["تاريخ الإنشاء"] = now;
  if (file || fileUrl) {
    obj["اسم الملف"] = fileName;
    obj["نوع الملف"] = mimeType;
    obj["حجم الملف"] = size;
    obj["رابط الملف"] = fileUrl;
    obj["معرف الملف"] = fileId;
    obj["رابط الصورة"] = thumbnailUrl;
  }

  if (rowNumber) updateByHeaders_(sh, rowNumber, obj);
  else appendByHeaders_(sh, obj);
  SpreadsheetApp.flush();
  return { success: true, sectionCode: sectionCode, fileUrl: fileUrl, fileId: fileId, thumbnailUrl: thumbnailUrl, message: "تم حفظ القسم." };
}



/************************************************************
 * V1852 PATCH - مطبعجي مصر: الفروع والفرنشايز
 ************************************************************/

const SHEET_NAME_FRANCHISE_BRANCHES = "فروع وفرنشايز مطبعجي";

function franchiseBranchHeaders_() {
  return [
    "كود الفرع",
    "اسم واجهة مطبعجي",
    "اسم الشريك الداخلي",
    "المحافظة",
    "المدينة",
    "المنطقة الظاهرة",
    "Latitude",
    "Longitude",
    "دور الفرع",
    "ظهور العميل",
    "مفعل",
    "نسبة مطبعجي",
    "اشتراك شهري",
    "يستلم أوردرات",
    "ينفذ",
    "يسلم باسم مطبعجي",
    "وصف ظاهر للعميل",
    "ملاحظات داخلية",
    "تاريخ الإنشاء",
    "آخر تحديث",
    "أنشأ بواسطة"
  ];
}

function ensureFranchiseBranchesSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET_NAME_FRANCHISE_BRANCHES);
  if (!sh) sh = ss.insertSheet(SHEET_NAME_FRANCHISE_BRANCHES);
  ensureHeaderIfAnyMissing_(sh, franchiseBranchHeaders_());
  return sh;
}

function initFranchiseBranchesNow() {
  const sh = ensureFranchiseBranchesSheet_();
  seedDefaultFranchiseBranches_(sh);
  return { success: true, message: "تم تجهيز شيت فروع وفرنشايز مطبعجي.", sheet: sh.getName() };
}

function canManageFranchiseBranches_(auth) {
  if (!auth || !auth.ok) return false;
  const username = normalize_(auth.user.username || "");
  const role = roleFromArabic_(auth.user.role, auth.user.department);
  return role === "admin" || username === "ضياء";
}

function makeFranchiseBranchCode_(name) {
  const raw = normalize_(name || "BRANCH");
  const latin = raw.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toUpperCase();
  if (latin) return ("MB-" + latin).slice(0, 28);
  return "MB-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 900 + 100);
}

function seedDefaultFranchiseBranches_(sh) {
  const data = sh.getDataRange().getValues();
  if (data.length > 1) return;
  const now = new Date();
  appendByHeaders_(sh, {
    "كود الفرع": "MB-BANHA-HQ",
    "اسم واجهة مطبعجي": "مطبعجي بنها الرئيسي",
    "اسم الشريك الداخلي": "مطبعجي بنها",
    "المحافظة": "القليوبية",
    "المدينة": "بنها",
    "المنطقة الظاهرة": "بنها",
    "دور الفرع": "فرنشايز كامل",
    "ظهور العميل": "ظاهر كفرع مطبعجي",
    "مفعل": "نعم",
    "نسبة مطبعجي": 100,
    "اشتراك شهري": "",
    "يستلم أوردرات": "نعم",
    "ينفذ": "نعم",
    "يسلم باسم مطبعجي": "نعم",
    "وصف ظاهر للعميل": "الفرع الرئيسي لمطبعجي بنها للاستلام والتسليم والمتابعة.",
    "ملاحظات داخلية": "بداية شبكة مطبعجي مصر.",
    "تاريخ الإنشاء": now,
    "آخر تحديث": now,
    "أنشأ بواسطة": "system"
  });
}

function getFranchiseBranches_(e) {
  e = e || { parameter: {} };
  const includeInactive = normalize_(e.parameter.includeInactive) === "نعم" || normalize_(e.parameter.includeInactive) === "true";
  const publicOnly = normalize_(e.parameter.publicOnly) === "نعم" || normalize_(e.parameter.publicOnly) === "true";
  if (includeInactive) {
    const auth = authorize_(e.parameter.username, e.parameter.token);
    if (!auth.ok) return { success: false, message: auth.message };
    if (!canManageFranchiseBranches_(auth)) return { success: false, message: "غير مصرح بإدارة الفروع والفرنشايز." };
  }
  const sh = ensureFranchiseBranchesSheet_();
  seedDefaultFranchiseBranches_(sh);
  const h = headersMap_(sh);
  const data = sh.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const active = normalize_(valueAt_(row, firstCol_(h, ["مفعل"], 0))) || "نعم";
    const visibility = normalize_(valueAt_(row, firstCol_(h, ["ظهور العميل"], 0))) || "ظاهر كفرع مطبعجي";
    const branchRole = normalize_(valueAt_(row, firstCol_(h, ["دور الفرع"], 0)));
    if (!includeInactive && active === "لا") continue;
    if (publicOnly && (visibility === "مخفي" || branchRole === "شريك تنفيذ مخفي")) continue;
    rows.push({
      branchCode: normalize_(valueAt_(row, firstCol_(h, ["كود الفرع"], 0))),
      brandName: normalize_(valueAt_(row, firstCol_(h, ["اسم واجهة مطبعجي"], 0))),
      partnerName: includeInactive ? normalize_(valueAt_(row, firstCol_(h, ["اسم الشريك الداخلي"], 0))) : "",
      governorate: normalize_(valueAt_(row, firstCol_(h, ["المحافظة"], 0))),
      city: normalize_(valueAt_(row, firstCol_(h, ["المدينة"], 0))),
      publicArea: normalize_(valueAt_(row, firstCol_(h, ["المنطقة الظاهرة"], 0))),
      latitude: valueAt_(row, firstCol_(h, ["Latitude"], 0)),
      longitude: valueAt_(row, firstCol_(h, ["Longitude"], 0)),
      branchRole: branchRole,
      customerVisibility: visibility,
      active: active,
      commissionRate: includeInactive ? valueAt_(row, firstCol_(h, ["نسبة مطبعجي"], 0)) : "",
      monthlySubscription: includeInactive ? valueAt_(row, firstCol_(h, ["اشتراك شهري"], 0)) : "",
      canReceiveOrders: normalize_(valueAt_(row, firstCol_(h, ["يستلم أوردرات"], 0))),
      canExecute: normalize_(valueAt_(row, firstCol_(h, ["ينفذ"], 0))),
      canDeliver: normalize_(valueAt_(row, firstCol_(h, ["يسلم باسم مطبعجي"], 0))),
      publicDescription: normalize_(valueAt_(row, firstCol_(h, ["وصف ظاهر للعميل"], 0))),
      internalNotes: includeInactive ? normalize_(valueAt_(row, firstCol_(h, ["ملاحظات داخلية"], 0))) : "",
      rowNumber: i + 1
    });
  }
  return { success: true, branches: rows, count: rows.length };
}

function saveFranchiseBranch_(payload) {
  payload = payload || {};
  const auth = authorize_(payload.username, payload.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canManageFranchiseBranches_(auth)) return { success: false, message: "غير مصرح بحفظ فروع مطبعجي." };

  const brandName = normalize_(payload.brandName);
  if (!brandName) return { success: false, message: "اسم واجهة الفرع مطلوب." };
  let branchCode = normalize_(payload.branchCode) || makeFranchiseBranchCode_(brandName);
  const sh = ensureFranchiseBranchesSheet_();
  const h = headersMap_(sh);
  const data = sh.getDataRange().getValues();
  const colCode = firstCol_(h, ["كود الفرع"], 0);
  let rowNumber = 0;
  for (let i = 1; i < data.length; i++) {
    if (normalize_(valueAt_(data[i], colCode)) === branchCode) { rowNumber = i + 1; break; }
  }
  const now = new Date();
  const obj = {
    "كود الفرع": branchCode,
    "اسم واجهة مطبعجي": brandName,
    "اسم الشريك الداخلي": normalize_(payload.partnerName),
    "المحافظة": normalize_(payload.governorate),
    "المدينة": normalize_(payload.city),
    "المنطقة الظاهرة": normalize_(payload.publicArea),
    "Latitude": normalize_(payload.latitude),
    "Longitude": normalize_(payload.longitude),
    "دور الفرع": normalize_(payload.branchRole) || "فرنشايز كامل",
    "ظهور العميل": normalize_(payload.customerVisibility) || "ظاهر كفرع مطبعجي",
    "مفعل": normalize_(payload.active) === "لا" ? "لا" : "نعم",
    "نسبة مطبعجي": normalize_(payload.commissionRate) || 15,
    "اشتراك شهري": normalize_(payload.monthlySubscription),
    "يستلم أوردرات": normalize_(payload.canReceiveOrders) === "لا" ? "لا" : "نعم",
    "ينفذ": normalize_(payload.canExecute) === "لا" ? "لا" : "نعم",
    "يسلم باسم مطبعجي": normalize_(payload.canDeliver) === "لا" ? "لا" : "نعم",
    "وصف ظاهر للعميل": normalize_(payload.publicDescription),
    "ملاحظات داخلية": normalize_(payload.internalNotes),
    "آخر تحديث": now,
    "أنشأ بواسطة": auth.user.username
  };
  if (!rowNumber) obj["تاريخ الإنشاء"] = now;
  if (rowNumber) updateByHeaders_(sh, rowNumber, obj);
  else appendByHeaders_(sh, obj);
  SpreadsheetApp.flush();
  return { success: true, branchCode: branchCode, message: "تم حفظ فرع/فرنشايز مطبعجي." };
}


/************************************************************
 * V1853 - ربط العملاء بفروع مطبعجي
 ************************************************************/
function assignCustomerBranch_(e) {
  e = e || { parameter: {} };
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canManageFranchiseBranches_(auth)) return { success: false, message: "غير مصرح بربط العملاء بالفروع." };

  const query = normalize_(e.parameter.customerQuery || e.parameter.customerCode || e.parameter.customerName);
  const branchCode = normalize_(e.parameter.branchCode || e.parameter.franchiseBranchCode);
  const branchName = normalize_(e.parameter.branchName || e.parameter.franchiseBranchName);
  if (!query || !branchCode) return { success: false, message: "كود/اسم العميل وكود الفرع مطلوبين." };

  const sheet = ensureCustomerPortalHeaders_();
  ensureHeaderIfAnyMissing_(sheet, ["كود فرع مطبعجي", "اسم فرع مطبعجي", "آخر تحديث فرع العميل"]);
  const cols = customerCols_(sheet);
  const data = sheet.getDataRange().getValues();
  const qKey = searchKey_(query);
  let rowNumber = 0;
  let customerName = "";
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const code = normalize_(valueAt_(row, cols.code));
    const name = normalize_(valueAt_(row, cols.name));
    if (code === query || searchKey_(name) === qKey || (qKey && searchKey_(name).indexOf(qKey) !== -1)) {
      rowNumber = i + 1;
      customerName = name;
      break;
    }
  }
  if (!rowNumber) return { success: false, message: "لم يتم العثور على العميل. استخدم كود الشات أو الاسم كما هو." };

  safeSet_(sheet, rowNumber, cols.branchCode || ensureHeader_(sheet, "كود فرع مطبعجي"), branchCode);
  safeSet_(sheet, rowNumber, cols.branchName || ensureHeader_(sheet, "اسم فرع مطبعجي"), branchName);
  safeSet_(sheet, rowNumber, cols.branchUpdated || ensureHeader_(sheet, "آخر تحديث فرع العميل"), new Date());
  SpreadsheetApp.flush();
  return { success: true, message: "تم ربط العميل " + customerName + " بالفرع: " + (branchName || branchCode), customerName: customerName, branchCode: branchCode, branchName: branchName };
}



/************************************************************
 * V1855 - ربط الخدمات بالمطابع والأرقام ونظام المحاسبة
 ************************************************************/
const SHEET_NAME_SERVICE_PROVIDER_ROUTES = "ربط الخدمات بالمطابع";

function serviceProviderRouteHeaders_() {
  return [
    "كود الربط",
    "كود الخدمة",
    "اسم الخدمة",
    "نوع الخدمة",
    "طريقة الإرسال",
    "اسم المطبعة/المسؤول",
    "رقم واتساب",
    "كود الفرع",
    "اسم الفرع",
    "وحدة القياس",
    "طريقة المحاسبة",
    "قيمة مطبعجي",
    "اشتراك شهري",
    "بداية الاشتراك",
    "نهاية الاشتراك",
    "مفعل",
    "ملاحظات",
    "تاريخ الإنشاء",
    "آخر تحديث",
    "أنشأ بواسطة"
  ];
}

function ensureServiceProviderRoutesSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET_NAME_SERVICE_PROVIDER_ROUTES);
  if (!sh) sh = ss.insertSheet(SHEET_NAME_SERVICE_PROVIDER_ROUTES);
  ensureHeaderIfAnyMissing_(sh, serviceProviderRouteHeaders_());
  return sh;
}

function canManageServiceProviderRoutes_(auth) {
  if (!auth || !auth.ok) return false;
  const role = roleFromArabic_(auth.user.role, auth.user.department);
  const username = searchKey_(auth.user.username || auth.user.name || "");
  return role === "admin" || username === searchKey_("ضياء") || username === searchKey_("رحمة") || username === searchKey_("رحمه");
}

function makeServiceRouteCode_(serviceName, providerName) {
  const base = (normalize_(serviceName) + "-" + normalize_(providerName || "ROUTE")).replace(/[^A-Za-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "");
  return "SR-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 900 + 100);
}

function initServiceProviderRoutesNow() {
  const sh = ensureServiceProviderRoutesSheet_();
  if (sh.getLastRow() < 2) {
    appendByHeaders_(sh, {
      "كود الربط": "SR-BANNER-RAHMA",
      "اسم الخدمة": "Banner",
      "نوع الخدمة": "طباعة",
      "طريقة الإرسال": "من خلال رحمة",
      "اسم المطبعة/المسؤول": "رحمة",
      "وحدة القياس": "متر",
      "طريقة المحاسبة": "نسبة على الوحدة",
      "قيمة مطبعجي": "15",
      "مفعل": "نعم",
      "ملاحظات": "ربط افتراضي كبداية. عدّله من لوحة الإدارة.",
      "تاريخ الإنشاء": new Date(),
      "آخر تحديث": new Date(),
      "أنشأ بواسطة": "system"
    });
  }
  return { success: true, message: "تم تجهيز شيت ربط الخدمات بالمطابع.", sheet: sh.getName() };
}

function getServiceProviderRoutes_(e) {
  e = e || { parameter: {} };
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canManageServiceProviderRoutes_(auth)) return { success: false, message: "غير مصرح بإدارة ربط الخدمات." };
  const includeInactive = normalize_(e.parameter.includeInactive) === "نعم" || normalize_(e.parameter.includeInactive) === "true";
  const sh = ensureServiceProviderRoutesSheet_();
  const h = headersMap_(sh);
  const data = sh.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const active = normalize_(valueAt_(row, firstCol_(h, ["مفعل"], 0))) || "نعم";
    if (!includeInactive && active === "لا") continue;
    rows.push({
      routeCode: normalize_(valueAt_(row, firstCol_(h, ["كود الربط"], 0))),
      serviceCode: normalize_(valueAt_(row, firstCol_(h, ["كود الخدمة"], 0))),
      serviceName: normalize_(valueAt_(row, firstCol_(h, ["اسم الخدمة"], 0))),
      serviceType: normalize_(valueAt_(row, firstCol_(h, ["نوع الخدمة"], 0))),
      channelType: normalize_(valueAt_(row, firstCol_(h, ["طريقة الإرسال"], 0))),
      providerName: normalize_(valueAt_(row, firstCol_(h, ["اسم المطبعة/المسؤول"], 0))),
      whatsappNumber: normalize_(valueAt_(row, firstCol_(h, ["رقم واتساب"], 0))),
      branchCode: normalize_(valueAt_(row, firstCol_(h, ["كود الفرع"], 0))),
      branchName: normalize_(valueAt_(row, firstCol_(h, ["اسم الفرع"], 0))),
      unit: normalize_(valueAt_(row, firstCol_(h, ["وحدة القياس"], 0))),
      billingMode: normalize_(valueAt_(row, firstCol_(h, ["طريقة المحاسبة"], 0))),
      commissionValue: normalize_(valueAt_(row, firstCol_(h, ["قيمة مطبعجي"], 0))),
      monthlySubscription: normalize_(valueAt_(row, firstCol_(h, ["اشتراك شهري"], 0))),
      subscriptionFrom: valueAt_(row, firstCol_(h, ["بداية الاشتراك"], 0)),
      subscriptionTo: valueAt_(row, firstCol_(h, ["نهاية الاشتراك"], 0)),
      active: active,
      notes: normalize_(valueAt_(row, firstCol_(h, ["ملاحظات"], 0))),
      rowNumber: i + 1
    });
  }
  rows.reverse();
  return { success: true, routes: rows, count: rows.length };
}

function saveServiceProviderRoute_(payload) {
  payload = payload || {};
  const auth = authorize_(payload.username, payload.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canManageServiceProviderRoutes_(auth)) return { success: false, message: "غير مصرح بحفظ ربط الخدمات." };
  const serviceName = normalize_(payload.serviceName);
  if (!serviceName) return { success: false, message: "اسم الخدمة مطلوب." };
  const providerName = normalize_(payload.providerName || payload.branchName || payload.whatsappNumber || "مسار خدمة");
  let routeCode = normalize_(payload.routeCode) || makeServiceRouteCode_(serviceName, providerName);
  const sh = ensureServiceProviderRoutesSheet_();
  const h = headersMap_(sh);
  const data = sh.getDataRange().getValues();
  const colCode = firstCol_(h, ["كود الربط"], 0);
  let rowNumber = 0;
  for (let i = 1; i < data.length; i++) {
    if (normalize_(valueAt_(data[i], colCode)) === routeCode) { rowNumber = i + 1; break; }
  }
  const now = new Date();
  const obj = {
    "كود الربط": routeCode,
    "كود الخدمة": normalize_(payload.serviceCode),
    "اسم الخدمة": serviceName,
    "نوع الخدمة": normalize_(payload.serviceType) || "طباعة",
    "طريقة الإرسال": normalize_(payload.channelType) || "رقم مطبعة",
    "اسم المطبعة/المسؤول": normalize_(payload.providerName),
    "رقم واتساب": normalize_(payload.whatsappNumber),
    "كود الفرع": normalize_(payload.branchCode),
    "اسم الفرع": normalize_(payload.branchName),
    "وحدة القياس": normalize_(payload.unit) || "قطعة",
    "طريقة المحاسبة": normalize_(payload.billingMode) || "نسبة على الوحدة",
    "قيمة مطبعجي": normalize_(payload.commissionValue),
    "اشتراك شهري": normalize_(payload.monthlySubscription),
    "بداية الاشتراك": normalize_(payload.subscriptionFrom),
    "نهاية الاشتراك": normalize_(payload.subscriptionTo),
    "مفعل": normalize_(payload.active) === "لا" ? "لا" : "نعم",
    "ملاحظات": normalize_(payload.notes),
    "آخر تحديث": now,
    "أنشأ بواسطة": auth.user.username || auth.user.name
  };
  if (!rowNumber) obj["تاريخ الإنشاء"] = now;
  if (rowNumber) updateByHeaders_(sh, rowNumber, obj);
  else appendByHeaders_(sh, obj);
  SpreadsheetApp.flush();
  return { success: true, routeCode: routeCode, message: "تم حفظ ربط الخدمة بالمطبعة/الفرع." };
}

/************************************************************
 * V1854 - White Label للمطابع + أرقام العملاء الآمنة
 ************************************************************/
const SHEET_NAME_WHITE_LABEL_SETTINGS = "إعدادات نسخ المطابع";

function ensureWhiteLabelSettingsSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET_NAME_WHITE_LABEL_SETTINGS);
  if (!sh) sh = ss.insertSheet(SHEET_NAME_WHITE_LABEL_SETTINGS);
  ensureHeaderIfAnyMissing_(sh, [
    "المفتاح", "القيمة", "آخر تحديث", "حدث بواسطة"
  ]);
  return sh;
}

function getWhiteLabelDefaults_() {
  return {
    platformName: "منصة مطبعجي بنها",
    ownerName: "مطبعجي",
    whatsappNumber: "",
    domain: "",
    primaryColor: "#075e54",
    logoUrl: "",
    notes: "",
    featureCustomerPortal: "نعم",
    featureOrderChat: "نعم",
    featureDesigner: "نعم",
    featureAds: "نعم",
    featureMatbagySheets: "لا",
    featureFranchise: "لا",
    featureMarketplace: "لا",
    featurePhoneLeads: "لا"
  };
}

function readWhiteLabelSettings_() {
  const sh = ensureWhiteLabelSettingsSheet_();
  const h = headersMap_(sh);
  const data = sh.getDataRange().getValues();
  const settings = getWhiteLabelDefaults_();
  const colKey = firstCol_(h, ["المفتاح"], 1);
  const colVal = firstCol_(h, ["القيمة"], 2);
  for (let i = 1; i < data.length; i++) {
    const key = normalize_(valueAt_(data[i], colKey));
    if (!key) continue;
    settings[key] = normalize_(valueAt_(data[i], colVal));
  }
  return settings;
}

function upsertWhiteLabelSetting_(sheet, key, value, userName) {
  const h = headersMap_(sheet);
  const colKey = firstCol_(h, ["المفتاح"], 1);
  const data = sheet.getDataRange().getValues();
  let rowNumber = 0;
  for (let i = 1; i < data.length; i++) {
    if (normalize_(valueAt_(data[i], colKey)) === key) { rowNumber = i + 1; break; }
  }
  const obj = {
    "المفتاح": key,
    "القيمة": normalize_(value),
    "آخر تحديث": new Date(),
    "حدث بواسطة": userName || "system"
  };
  if (rowNumber) updateByHeaders_(sheet, rowNumber, obj);
  else appendByHeaders_(sheet, obj);
}

function canManageWhiteLabel_(auth) {
  if (!auth || !auth.user) return false;
  const role = normalize_(auth.user.role);
  const username = searchKey_(auth.user.username || auth.user.name || "");
  return role === "admin" || username === searchKey_("ضياء");
}

function getWhiteLabelSettings_(e) {
  e = e || { parameter: {} };
  const hasAuth = normalize_(e.parameter.username) && normalize_(e.parameter.token);
  if (hasAuth) {
    const auth = authorize_(e.parameter.username, e.parameter.token);
    if (!auth.ok) return { success: false, message: auth.message };
    if (!canManageWhiteLabel_(auth)) return { success: false, message: "غير مصرح بإدارة نسخ المطابع." };
  }
  const settings = readWhiteLabelSettings_();
  return { success: true, settings: settings };
}

function saveWhiteLabelSettings_(payload) {
  payload = payload || {};
  const auth = authorize_(payload.username, payload.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canManageWhiteLabel_(auth)) return { success: false, message: "غير مصرح بحفظ نسخة مطبعة." };
  const platformName = normalize_(payload.platformName);
  if (!platformName) return { success: false, message: "اسم المنصة مطلوب." };
  const sh = ensureWhiteLabelSettingsSheet_();
  const allowed = Object.keys(getWhiteLabelDefaults_());
  allowed.forEach(function (key) {
    const value = payload[key];
    if (value !== undefined && value !== null) upsertWhiteLabelSetting_(sh, key, value, auth.user.username || auth.user.name);
  });
  SpreadsheetApp.flush();
  return { success: true, settings: readWhiteLabelSettings_(), message: "تم حفظ إعدادات نسخة المطبعة." };
}

function collectPhonesFromSheet_(sheetName, sourceLabel, optInOnly, outMap) {
  const ss = ss_();
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return;
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return;
  const h = headersMap_(sh);
  const phoneCols = phoneColumns_(sh);
  if (!phoneCols.length) return;
  const nameCol = firstCol_(h, ["اسم العميل", "الاسم", "اسم", "customerName", "name"], 0);
  const optCol = firstCol_(h, ["موافق على التواصل", "مسموح بالتواصل", "Opt In", "optIn", "marketingOptIn"], 0);
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (optInOnly && optCol) {
      const ok = normalize_(valueAt_(row, optCol));
      if (!(ok === "نعم" || ok === "yes" || ok === "true" || ok === "1")) continue;
    } else if (optInOnly && !optCol) {
      continue;
    }
    const name = nameCol ? normalize_(valueAt_(row, nameCol)) : "";
    phoneCols.forEach(function (col) {
      const ph = cleanPhone_(valueAt_(row, col));
      if (!ph || ph.length < 10) return;
      if (!outMap[ph]) outMap[ph] = { phone: ph, name: name, source: sourceLabel };
    });
  }
}

function getLeadPhoneNumbers_(e) {
  e = e || { parameter: {} };
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canManageWhiteLabel_(auth)) return { success: false, message: "غير مصرح بتجميع أرقام العملاء." };
  const source = normalize_(e.parameter.source || "customers");
  const optInOnly = normalize_(e.parameter.optInOnly) === "نعم" || normalize_(e.parameter.optInOnly) === "true";
  const map = {};
  if (source === "customers" || source === "all") collectPhonesFromSheet_(SHEET_NAME_CUSTOMERS, "العملاء", optInOnly, map);
  if (source === "orders" || source === "all") collectPhonesFromSheet_(SHEET_NAME_ORDERS, "الأوردرات", optInOnly, map);
  const numbers = Object.keys(map).sort().map(function (k) { return map[k]; });
  return { success: true, numbers: numbers, count: numbers.length, message: "تم تجميع الأرقام من قاعدة بياناتك فقط." };
}


/*********************** V1856 - ماركت بليس مطبعجي ***********************/

function marketplaceVendorHeaders_() {
  return [
    "كود البائع", "اسم البائع", "التصنيف", "رقم واتساب", "نسبة مطبعجي", "مفعل", "ترتيب الظهور",
    "اسم الملف", "نوع الملف", "حجم الملف", "رابط الملف", "معرف الملف", "رابط الصورة",
    "ملاحظات داخلية", "تاريخ الإنشاء", "آخر تحديث", "أنشأ بواسطة"
  ];
}

function marketplaceProductHeaders_() {
  return [
    "كود المنتج", "كود البائع", "اسم المنتج", "الوصف", "السعر", "الوحدة", "مفعل", "ترتيب الظهور",
    "اسم الملف", "نوع الملف", "حجم الملف", "رابط الملف", "معرف الملف", "رابط الصورة",
    "تاريخ الإنشاء", "آخر تحديث", "أنشأ بواسطة"
  ];
}

function ensureMarketplaceSheets_() {
  const ss = ss_();
  let vendors = ss.getSheetByName(SHEET_NAME_MARKET_VENDORS);
  if (!vendors) vendors = ss.insertSheet(SHEET_NAME_MARKET_VENDORS);
  ensureHeaderIfAnyMissing_(vendors, marketplaceVendorHeaders_());
  let products = ss.getSheetByName(SHEET_NAME_MARKET_PRODUCTS);
  if (!products) products = ss.insertSheet(SHEET_NAME_MARKET_PRODUCTS);
  ensureHeaderIfAnyMissing_(products, marketplaceProductHeaders_());
  return { vendors: vendors, products: products };
}

function getMarketplaceFolder_() {
  const root = getCustomerFilesRootFolder_();
  return getOrCreateChildFolder_(root, "ماركت بليس مطبعجي");
}

function getMarketplaceVendorFolder_(vendorCode) {
  return getOrCreateChildFolder_(getMarketplaceFolder_(), safeDriveName_(vendorCode || "VENDOR"));
}

function canManageMarketplace_(auth) {
  if (!auth || !auth.ok) return false;
  const username = normalize_(auth.user.username || "");
  const role = roleFromArabic_(auth.user.role, auth.user.department);
  return role === "admin" || username === "ضياء" || username === "رحمه" || username === "رحمة";
}

function makeMarketCode_(prefix, value) {
  const raw = normalize_(value || "");
  const latin = raw.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toUpperCase();
  if (latin) return (prefix + "-" + latin).slice(0, 28);
  return prefix + "-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 900 + 100);
}

function initMarketplaceNow() {
  const sh = ensureMarketplaceSheets_();
  getMarketplaceFolder_();
  return { success: true, message: "تم تجهيز ماركت بليس مطبعجي.", vendorsSheet: sh.vendors.getName(), productsSheet: sh.products.getName() };
}

function saveMarketImage_(baseFolder, payload, defaultName) {
  const base64 = normalize_(payload.base64);
  if (!base64) return { fileUrl: normalize_(payload.fileUrl), fileId: normalize_(payload.fileId), thumbnailUrl: normalize_(payload.thumbnailUrl), fileName: normalize_(payload.fileName), mimeType: normalize_(payload.mimeType), size: Number(payload.size || 0) || 0 };
  const mimeType = normalize_(payload.mimeType) || "image/png";
  const size = Number(payload.size || 0) || 0;
  if (mimeType.indexOf("image/") !== 0) throw new Error("الصورة يجب أن تكون ملف صورة.");
  if (size > CUSTOMER_UPLOAD_MAX_BYTES) throw new Error("حجم الصورة أكبر من 25MB.");
  const fileName = safeDriveName_(payload.fileName || defaultName || "market.png");
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = baseFolder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return { fileUrl: file.getUrl(), fileId: file.getId(), thumbnailUrl: "https://drive.google.com/thumbnail?id=" + encodeURIComponent(file.getId()) + "&sz=w1000", fileName: fileName, mimeType: mimeType, size: size };
}

function getMarketplace_(e) {
  e = e || { parameter: {} };
  const includeInactive = normalize_(e.parameter.includeInactive) === "نعم" || normalize_(e.parameter.includeInactive) === "true";
  if (includeInactive) {
    const auth = authorize_(e.parameter.username, e.parameter.token);
    if (!auth.ok) return { success: false, message: auth.message };
    if (!canManageMarketplace_(auth)) return { success: false, message: "غير مصرح بإدارة الماركت بليس." };
  }
  const sh = ensureMarketplaceSheets_();
  const vh = headersMap_(sh.vendors);
  const ph = headersMap_(sh.products);
  const vendorsData = sh.vendors.getDataRange().getValues();
  const productsData = sh.products.getDataRange().getValues();
  const vendors = [];
  for (let i = 1; i < vendorsData.length; i++) {
    const row = vendorsData[i];
    const active = normalize_(valueAt_(row, firstCol_(vh, ["مفعل"], 0))) || "نعم";
    if (!includeInactive && active === "لا") continue;
    const fileId = normalize_(valueAt_(row, firstCol_(vh, ["معرف الملف"], 0)));
    vendors.push({
      vendorCode: normalize_(valueAt_(row, firstCol_(vh, ["كود البائع"], 0))),
      vendorName: normalize_(valueAt_(row, firstCol_(vh, ["اسم البائع"], 0))),
      category: normalize_(valueAt_(row, firstCol_(vh, ["التصنيف"], 0))),
      whatsapp: normalize_(valueAt_(row, firstCol_(vh, ["رقم واتساب"], 0))),
      commission: valueAt_(row, firstCol_(vh, ["نسبة مطبعجي"], 0)),
      active: active,
      sortOrder: valueAt_(row, firstCol_(vh, ["ترتيب الظهور"], 0)),
      fileName: normalize_(valueAt_(row, firstCol_(vh, ["اسم الملف"], 0))),
      mimeType: normalize_(valueAt_(row, firstCol_(vh, ["نوع الملف"], 0))),
      fileUrl: normalize_(valueAt_(row, firstCol_(vh, ["رابط الملف"], 0))),
      fileId: fileId,
      thumbnailUrl: fileId ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=w1000" : normalize_(valueAt_(row, firstCol_(vh, ["رابط الصورة"], 0))),
      notes: normalize_(valueAt_(row, firstCol_(vh, ["ملاحظات داخلية"], 0))),
      rowNumber: i + 1
    });
  }
  const products = [];
  for (let j = 1; j < productsData.length; j++) {
    const rowp = productsData[j];
    const activep = normalize_(valueAt_(rowp, firstCol_(ph, ["مفعل"], 0))) || "نعم";
    if (!includeInactive && activep === "لا") continue;
    const fid = normalize_(valueAt_(rowp, firstCol_(ph, ["معرف الملف"], 0)));
    products.push({
      productCode: normalize_(valueAt_(rowp, firstCol_(ph, ["كود المنتج"], 0))),
      vendorCode: normalize_(valueAt_(rowp, firstCol_(ph, ["كود البائع"], 0))),
      productName: normalize_(valueAt_(rowp, firstCol_(ph, ["اسم المنتج"], 0))),
      description: normalize_(valueAt_(rowp, firstCol_(ph, ["الوصف"], 0))),
      price: valueAt_(rowp, firstCol_(ph, ["السعر"], 0)),
      unit: normalize_(valueAt_(rowp, firstCol_(ph, ["الوحدة"], 0))) || "قطعة",
      active: activep,
      sortOrder: valueAt_(rowp, firstCol_(ph, ["ترتيب الظهور"], 0)),
      fileName: normalize_(valueAt_(rowp, firstCol_(ph, ["اسم الملف"], 0))),
      mimeType: normalize_(valueAt_(rowp, firstCol_(ph, ["نوع الملف"], 0))),
      fileUrl: normalize_(valueAt_(rowp, firstCol_(ph, ["رابط الملف"], 0))),
      fileId: fid,
      thumbnailUrl: fid ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fid) + "&sz=w1000" : normalize_(valueAt_(rowp, firstCol_(ph, ["رابط الصورة"], 0))),
      rowNumber: j + 1
    });
  }
  vendors.sort(function(a,b){ return (Number(a.sortOrder || 9999) - Number(b.sortOrder || 9999)) || String(a.vendorName || "").localeCompare(String(b.vendorName || "")); });
  products.sort(function(a,b){ return (Number(a.sortOrder || 9999) - Number(b.sortOrder || 9999)) || String(a.productName || "").localeCompare(String(b.productName || "")); });
  return { success: true, vendors: vendors, products: products, count: vendors.length };
}

function saveMarketplaceVendor_(payload) {
  payload = payload || {};
  const auth = authorize_(payload.username, payload.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canManageMarketplace_(auth)) return { success: false, message: "غير مصرح بحفظ الماركت بليس." };
  const vendorName = normalize_(payload.vendorName);
  if (!vendorName) return { success: false, message: "اسم البائع/المساحة مطلوب." };
  let vendorCode = normalize_(payload.vendorCode) || makeMarketCode_("MV", vendorName);
  const sh = ensureMarketplaceSheets_().vendors;
  const h = headersMap_(sh);
  const data = sh.getDataRange().getValues();
  const colCode = firstCol_(h, ["كود البائع"], 0);
  let rowNumber = 0;
  for (let i = 1; i < data.length; i++) if (normalize_(valueAt_(data[i], colCode)) === vendorCode) { rowNumber = i + 1; break; }
  const img = saveMarketImage_(getMarketplaceVendorFolder_(vendorCode), payload, vendorCode + ".png");
  const now = new Date();
  const obj = {
    "كود البائع": vendorCode,
    "اسم البائع": vendorName,
    "التصنيف": normalize_(payload.category),
    "رقم واتساب": cleanPhone_(payload.whatsapp || ""),
    "نسبة مطبعجي": normalize_(payload.commission) || 0,
    "مفعل": normalize_(payload.active) || "نعم",
    "ترتيب الظهور": normalize_(payload.sortOrder),
    "ملاحظات داخلية": normalize_(payload.notes),
    "آخر تحديث": now,
    "أنشأ بواسطة": auth.user.name || auth.user.username || ""
  };
  if (img.fileUrl) {
    obj["اسم الملف"] = img.fileName; obj["نوع الملف"] = img.mimeType; obj["حجم الملف"] = img.size; obj["رابط الملف"] = img.fileUrl; obj["معرف الملف"] = img.fileId; obj["رابط الصورة"] = img.thumbnailUrl;
  }
  if (rowNumber) updateByHeaders_(sh, rowNumber, obj, true);
  else { obj["تاريخ الإنشاء"] = now; appendByHeaders_(sh, obj); }
  SpreadsheetApp.flush();
  return { success: true, message: "تم حفظ مساحة الماركت بليس.", vendorCode: vendorCode };
}

function saveMarketplaceProduct_(payload) {
  payload = payload || {};
  const auth = authorize_(payload.username, payload.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canManageMarketplace_(auth)) return { success: false, message: "غير مصرح بحفظ منتجات الماركت بليس." };
  const vendorCode = normalize_(payload.vendorCode);
  const productName = normalize_(payload.productName);
  if (!vendorCode) return { success: false, message: "كود البائع مطلوب." };
  if (!productName) return { success: false, message: "اسم المنتج مطلوب." };
  let productCode = normalize_(payload.productCode) || makeMarketCode_("MP", productName);
  const sh = ensureMarketplaceSheets_().products;
  const h = headersMap_(sh);
  const data = sh.getDataRange().getValues();
  const colCode = firstCol_(h, ["كود المنتج"], 0);
  let rowNumber = 0;
  for (let i = 1; i < data.length; i++) if (normalize_(valueAt_(data[i], colCode)) === productCode) { rowNumber = i + 1; break; }
  const img = saveMarketImage_(getMarketplaceVendorFolder_(vendorCode), payload, productCode + ".png");
  const now = new Date();
  const obj = {
    "كود المنتج": productCode,
    "كود البائع": vendorCode,
    "اسم المنتج": productName,
    "الوصف": normalize_(payload.description),
    "السعر": normalize_(payload.price),
    "الوحدة": normalize_(payload.unit) || "قطعة",
    "مفعل": normalize_(payload.active) || "نعم",
    "ترتيب الظهور": normalize_(payload.sortOrder),
    "آخر تحديث": now,
    "أنشأ بواسطة": auth.user.name || auth.user.username || ""
  };
  if (img.fileUrl) {
    obj["اسم الملف"] = img.fileName; obj["نوع الملف"] = img.mimeType; obj["حجم الملف"] = img.size; obj["رابط الملف"] = img.fileUrl; obj["معرف الملف"] = img.fileId; obj["رابط الصورة"] = img.thumbnailUrl;
  }
  if (rowNumber) updateByHeaders_(sh, rowNumber, obj, true);
  else { obj["تاريخ الإنشاء"] = now; appendByHeaders_(sh, obj); }
  SpreadsheetApp.flush();
  return { success: true, message: "تم حفظ منتج الماركت بليس.", productCode: productCode };
}


/*********************** PATCH 08 - صلاحيات ضياء/رحمه + تعديل العملاء ***********************/
function canCreateOrder_(user) {
  const role = roleFromArabic_(user.role, user.department);
  const username = searchKey_(user.username || user.name || "");
  return role === "admin" || role === "service" || username === "ضياء" || username === "رحمه" || username === "rahma" || username === "diaa";
}

function canCreateCustomer_(user) {
  const role = roleFromArabic_(user.role, user.department);
  const username = searchKey_(user.username || user.name || "");
  return role === "admin" || role === "service" || username === "ضياء" || username === "رحمه" || username === "rahma" || username === "diaa";
}

function createCustomer_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canCreateCustomer_(auth.user)) return { success: false, message: "ليس لديك صلاحية حفظ بيانات العميل." };

  const customerName = normalize_(e.parameter.customerName || e.parameter.name);
  const manager = normalize_(e.parameter.manager) || auth.user.username;
  const phone = cleanPhone_(e.parameter.phone || e.parameter.customerPhone);
  const extraPhone = cleanPhone_(e.parameter.extraPhone || e.parameter.customerExtraPhone);
  const customerType = safeCustomerTypeForValidation_(e.parameter.customerType || e.parameter.type);
  const debtAmount = parseDebtAmount_(e.parameter.debtAmount || e.parameter.debt || 0);
  const branchCode = normalize_(e.parameter.franchiseBranchCode || e.parameter.branchCode);
  const branchName = normalize_(e.parameter.franchiseBranchName || e.parameter.branchName);
  const active = normalize_(e.parameter.active) || "نعم";
  const notes = normalize_(e.parameter.notes);

  if (!customerName) return { success: false, message: "اسم الشات / العميل مطلوب." };

  const sheet = ensureCustomerDebtHeaders_();
  if (!sheet) return { success: false, message: "شيت العملاء غير موجود." };

  ensureHeaderIfAnyMissing_(sheet, ["اسم الشات / المكتب", "اسم المسؤول", "رقم العميل الأساسي", "رقم إضافي", "نوع العميل", "مفعل؟", "ملاحظات", "تاريخ الإضافة", "آخر تحديث", "مديونية", "ملاحظات المديونية", "آخر تحديث مديونية", "كود فرع مطبعجي", "اسم فرع مطبعجي", "آخر تحديث فرع العميل"]);

  const h = headersMap_(sheet);
  const colName = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 1);
  const colPhone = firstCol_(h, ["رقم العميل الأساسي", "رقم العميل", "رقم الهاتف", "Phone"], 3);
  const colExtra = firstCol_(h, ["رقم إضافي", "رقم إضافى", "Extra Phone"], 4);
  const data = sheet.getDataRange().getValues();
  const nameKey = searchKey_(customerName);
  const phoneKey = searchKey_(phone);
  const extraKey = searchKey_(extraPhone);
  let existingRowNumber = 0;
  let existingMatch = "";

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const existingName = searchKey_(valueAt_(row, colName));
    const existingPhone = searchKey_(valueAt_(row, colPhone));
    const existingExtra = searchKey_(valueAt_(row, colExtra));
    if (existingName && existingName === nameKey) { existingRowNumber = i + 1; existingMatch = "الاسم"; break; }
    if (phoneKey && (phoneKey === existingPhone || phoneKey === existingExtra)) { existingRowNumber = i + 1; existingMatch = "رقم العميل"; break; }
    if (extraKey && (extraKey === existingPhone || extraKey === existingExtra)) { existingRowNumber = i + 1; existingMatch = "الرقم الإضافي"; break; }
  }

  const now = new Date();
  const values = {
    "اسم الشات / المكتب": customerName,
    "اسم العميل": customerName,
    "اسم المسؤول": manager,
    "رقم العميل الأساسي": phone,
    "رقم العميل": phone,
    "رقم الهاتف": phone,
    "رقم إضافي": extraPhone,
    "رقم إضافى": extraPhone,
    "نوع العميل": customerType,
    "مفعل؟": active,
    "مفعل": active,
    "ملاحظات": notes,
    "مديونية": debtAmount,
    "ملاحظات المديونية": debtAmount > 0 ? "مديونية حالية" : "",
    "آخر تحديث مديونية": debtAmount > 0 ? now : "",
    "كود فرع مطبعجي": branchCode,
    "اسم فرع مطبعجي": branchName,
    "آخر تحديث فرع العميل": branchCode ? now : "",
    "تاريخ الإضافة": now,
    "آخر تحديث": now
  };

  if (existingRowNumber) {
    updateByHeaders_(sheet, existingRowNumber, values, true);
    SpreadsheetApp.flush();
    return {
      success: true,
      message: "تم تعديل بيانات العميل الموجود بناءً على " + existingMatch + ".",
      updated: true,
      customer: { name: customerName, manager: manager, phone: phone, extraPhone: extraPhone, type: customerType, active: active, debtAmount: debtAmount, branchCode: branchCode, branchName: branchName }
    };
  }

  appendByHeaders_(sheet, values);
  SpreadsheetApp.flush();

  let portalCode = "";
  try {
    initCustomerPortalNow();
    const portalSheet = ensureCustomerPortalHeaders_();
    const portalCols = customerCols_(portalSheet);
    const portalData = portalSheet.getDataRange().getValues();
    const key = searchKey_(customerName);
    for (let pi = 1; pi < portalData.length; pi++) {
      if (searchKey_(valueAt_(portalData[pi], portalCols.name)) === key) {
        portalCode = normalize_(valueAt_(portalData[pi], portalCols.code));
        break;
      }
    }
  } catch (portalErr) {}

  const customerDefaultPassword = customerDefaultPassword_();
  return {
    success: true,
    message: "تم إضافة العميل في شيت العملاء." + (portalCode ? " كود الشات: " + portalCode + " | كلمة المرور المؤقتة: " + customerDefaultPassword : ""),
    updated: false,
    customer: { name: customerName, manager: manager, phone: phone, extraPhone: extraPhone, type: customerType, active: active, debtAmount: debtAmount, branchCode: branchCode, branchName: branchName, customerCode: portalCode, defaultPassword: customerDefaultPassword }
  };
}


/************************************************************
 * Patch 19 - Final Workflow: waste sheet fixed, note categories ready
 ************************************************************/


/************************************************************
 * Batch 24 - EasyStore: أرشفة خامة + فواتير شراء/بيع مبسطة
 ************************************************************/
function accPurchasesHeaders_() {
  return ["ID", "وقت التسجيل", "رقم الفاتورة", "المورد", "الخامة", "الكمية", "سعر الوحدة", "الإجمالي", "مسجل بواسطة", "ملاحظات"];
}
function accSalesHeaders_() {
  return ["ID", "وقت التسجيل", "رقم الفاتورة", "العميل", "البند", "الكمية", "سعر الوحدة", "الإجمالي", "مسجل بواسطة", "ملاحظات"];
}
function archiveAccountingMaterial_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (auth.mode !== "full") return { success: false, message: "حذف/إيقاف الخامات عند ضياء فقط." };
  const id = normalize_(e.parameter.materialId || e.parameter.id || "");
  const name = normalize_(e.parameter.materialName || "");
  const department = normalize_(e.parameter.department || "");
  const sheet = ensureAccountingSheets_().materials;
  let row = id ? accountingFindMaterialRowById_(sheet, id) : 0;
  if (!row && name) row = accountingFindMaterialRow_(sheet, name, department);
  if (!row) return { success: false, message: "الخامة غير موجودة." };
  updateByHeaders_(sheet, row, { "مفعل": "لا", "ملاحظات": "تم الإيقاف من EasyStore - " + new Date(), "آخر تحديث": new Date() }, true);
  return { success: true, message: "تم إيقاف الخامة/الصنف. لن تظهر للموظفين في الاختيارات الجديدة، وتظل محفوظة للتقارير القديمة." };
}
function saveEasyStorePurchase_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (auth.mode !== "full") return { success: false, message: "فواتير الشراء عند ضياء فقط." };
  const sheet = mbEnsureSheet_("حسابات - فواتير الشراء", accPurchasesHeaders_());
  const qty = parseMoney_(e.parameter.qty), unit = parseMoney_(e.parameter.unitPrice);
  appendByHeaders_(sheet, {"ID":"PUR-"+Utilities.getUuid().slice(0,8), "وقت التسجيل":new Date(), "رقم الفاتورة":normalize_(e.parameter.invoiceNo), "المورد":normalize_(e.parameter.supplier), "الخامة":normalize_(e.parameter.materialName), "الكمية":qty, "سعر الوحدة":unit, "الإجمالي":qty*unit, "مسجل بواسطة":auth.user.username, "ملاحظات":normalize_(e.parameter.notes)});
  return { success:true, message:"تم حفظ فاتورة الشراء." };
}
function saveEasyStoreSale_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  const sheet = mbEnsureSheet_("حسابات - فواتير المبيعات", accSalesHeaders_());
  const qty = parseMoney_(e.parameter.qty), unit = parseMoney_(e.parameter.unitPrice);
  appendByHeaders_(sheet, {"ID":"SAL-"+Utilities.getUuid().slice(0,8), "وقت التسجيل":new Date(), "رقم الفاتورة":normalize_(e.parameter.invoiceNo), "العميل":normalize_(e.parameter.customer), "البند":normalize_(e.parameter.itemName), "الكمية":qty, "سعر الوحدة":unit, "الإجمالي":qty*unit, "مسجل بواسطة":auth.user.username, "ملاحظات":normalize_(e.parameter.notes)});
  return { success:true, message:"تم حفظ فاتورة المبيعات." };
}


/*********************** Batch 25 - EasyStore Full Accounting Core Server Helpers ***********************/
function accSuppliersHeaders_() {
  return ["ID", "وقت التسجيل", "اسم المورد", "الهاتف", "العنوان", "رصيد افتتاحي", "مديونية", "مفعل", "مسجل بواسطة", "ملاحظات"];
}
function getEasyStoreSuppliers_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message: auth.message };
  const sh = mbEnsureSheet_("حسابات - الموردين", accSuppliersHeaders_());
  return { success:true, suppliers: accSheetRows_(sh) };
}
function saveEasyStoreSupplier_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message: auth.message };
  if (auth.mode !== "full") return { success:false, message:"إضافة الموردين عند ضياء فقط." };
  const sh = mbEnsureSheet_("حسابات - الموردين", accSuppliersHeaders_());
  const name = normalize_(e.parameter.name || e.parameter.supplier || e.parameter["اسم المورد"] || "");
  if (!name) return { success:false, message:"اسم المورد مطلوب." };
  const h = headersMap_(sh); const data = sh.getDataRange().getValues(); let row = 0;
  for (let i=1;i<data.length;i++) if (normalize_(valueAt_(data[i], h[normalizeKey_("اسم المورد")])) === name) { row=i+1; break; }
  const obj = {"ID":"SUP-"+Utilities.getUuid().slice(0,8), "وقت التسجيل":new Date(), "اسم المورد":name, "الهاتف":normalize_(e.parameter.phone), "العنوان":normalize_(e.parameter.address), "رصيد افتتاحي":parseMoney_(e.parameter.opening), "مديونية":parseMoney_(e.parameter.debt), "مفعل":"نعم", "مسجل بواسطة":auth.user.username, "ملاحظات":normalize_(e.parameter.notes)};
  if (row) updateByHeaders_(sh, row, obj, true); else appendByHeaders_(sh, obj);
  return { success:true, message:"تم حفظ المورد." };
}
function saveEasyStorePurchaseV2_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message: auth.message };
  if (auth.mode !== "full") return { success:false, message:"فواتير الشراء عند ضياء فقط." };
  const sh = mbEnsureSheet_("حسابات - فواتير الشراء", ["ID","وقت التسجيل","رقم الفاتورة","المورد","نوع الدفع","تاريخ الاستحقاق","الخامة","الكمية","سعر الوحدة","الإجمالي","المدفوع","المتبقي","مسجل بواسطة","ملاحظات"]);
  const qty=parseMoney_(e.parameter.qty), unit=parseMoney_(e.parameter.unit), total=parseMoney_(e.parameter.total)||qty*unit, paid=parseMoney_(e.parameter.paid), remain=parseMoney_(e.parameter.remain)||Math.max(0,total-paid);
  appendByHeaders_(sh,{"ID":"PUR-"+Utilities.getUuid().slice(0,8),"وقت التسجيل":new Date(),"رقم الفاتورة":normalize_(e.parameter.no||e.parameter.invoiceNo),"المورد":normalize_(e.parameter.supplier),"نوع الدفع":normalize_(e.parameter.paymentType),"تاريخ الاستحقاق":normalize_(e.parameter.dueDate),"الخامة":normalize_(e.parameter.material),"الكمية":qty,"سعر الوحدة":unit,"الإجمالي":total,"المدفوع":paid,"المتبقي":remain,"بنود الأقسام":normalize_(e.parameter.lineIds),"مسجل بواسطة":auth.user.username,"ملاحظات":normalize_(e.parameter.notes)});
  try { saveStockMoveBatch25_(normalize_(e.parameter.material), qty, 0, "شراء", normalize_(e.parameter.no||e.parameter.invoiceNo), auth.user.username); } catch(err) {}
  return { success:true, message:"تم حفظ فاتورة الشراء وتسجيل حركة المخزون." };
}
function saveEasyStoreSaleV2_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message: auth.message };
  const sh = mbEnsureSheet_("حسابات - فواتير المبيعات", ["ID","وقت التسجيل","رقم الفاتورة","رقم الأوردر","العميل","نوع الدفع","البند","الكمية","سعر الوحدة","خصم","الإجمالي","المدفوع","المتبقي","بنود الأقسام","مسجل بواسطة","ملاحظات"]);
  const qty=parseMoney_(e.parameter.qty), unit=parseMoney_(e.parameter.unit), discount=parseMoney_(e.parameter.discount), total=parseMoney_(e.parameter.total)||Math.max(0,qty*unit-discount), paid=parseMoney_(e.parameter.paid), remain=parseMoney_(e.parameter.remain)||Math.max(0,total-paid);
  appendByHeaders_(sh,{"ID":"SAL-"+Utilities.getUuid().slice(0,8),"وقت التسجيل":new Date(),"رقم الفاتورة":normalize_(e.parameter.no||e.parameter.invoiceNo),"رقم الأوردر":normalize_(e.parameter.orderId),"العميل":normalize_(e.parameter.customer),"نوع الدفع":normalize_(e.parameter.paymentType),"البند":normalize_(e.parameter.item),"الكمية":qty,"سعر الوحدة":unit,"خصم":discount,"الإجمالي":total,"المدفوع":paid,"المتبقي":remain,"بنود الأقسام":normalize_(e.parameter.lineIds),"مسجل بواسطة":auth.user.username,"ملاحظات":normalize_(e.parameter.notes)});
  try { saveStockMoveBatch25_(normalize_(e.parameter.item), 0, qty, "بيع", normalize_(e.parameter.no||e.parameter.invoiceNo), auth.user.username); } catch(err) {}
  return { success:true, message:"تم حفظ فاتورة البيع وتسجيل حركة المخزون." };
}
function saveStockMoveBatch25_(materialName, inQty, outQty, source, ref, user) {
  if (!materialName) return;
  const sh = mbEnsureSheet_("حسابات - حركة المخزون", ["ID","وقت التسجيل","الخامة","داخل","خارج","الرصيد","المصدر","رقم المرجع","الموظف","ملاحظات"]);
  appendByHeaders_(sh,{"ID":"STK-"+Utilities.getUuid().slice(0,8),"وقت التسجيل":new Date(),"الخامة":materialName,"داخل":inQty,"خارج":outQty,"الرصيد":"","المصدر":source,"رقم المرجع":ref,"الموظف":user,"ملاحظات":"Batch25"});
}
function archiveAccountingTemplate_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message: auth.message };
  if (auth.mode !== "full") return { success:false, message:"إيقاف الأصناف عند ضياء فقط." };
  const name = normalize_(e.parameter.itemName || ""); const dept=normalize_(e.parameter.department || "");
  const sh = ensureAccountingSheets_().templates;
  const h=headersMap_(sh), data=sh.getDataRange().getValues(); let row=0;
  for(let i=1;i<data.length;i++){
    if(normalize_(valueAt_(data[i], h[normalizeKey_("اسم البند")]))===name && (!dept || normalize_(valueAt_(data[i], h[normalizeKey_("القسم")]))===dept)){ row=i+1; break; }
  }
  if(!row) return { success:false, message:"الصنف غير موجود." };
  updateByHeaders_(sh,row,{"مفعل":"لا","آخر تحديث":new Date()},true);
  return { success:true, message:"تم إيقاف الصنف." };
}
function easyStoreSystemHealth_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message: auth.message };
  const sh = ensureAccountingSheets_();
  return { success:true, message:"النظام سليم", sheets:Object.keys(sh), version:"Batch25 Full Accounting Core" };
}


/*********************** Patch 28 - EasyStore customer preload ***********************/
function getEasyStoreCustomers_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  const sheet = ss_().getSheetByName(SHEET_NAME_CUSTOMERS);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, customers: [] };
  const limit = Math.min(Number(e.parameter.limit || 200) || 200, 500);
  const data = sheet.getDataRange().getValues();
  const h = headersMap_(sheet);
  const colName = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 1);
  const colManager = firstCol_(h, ["اسم المسؤول", "المسؤول", "Manager"], 2);
  const colPhone = firstCol_(h, ["رقم العميل الأساسي", "رقم العميل", "رقم الهاتف", "Phone"], 3);
  const colExtra = firstCol_(h, ["رقم إضافي", "رقم إضافى", "Extra Phone"], 4);
  const colType = firstCol_(h, ["نوع العميل", "Customer Type"], 5);
  const colActive = firstCol_(h, ["مفعل؟", "مفعل", "Active"], 0);
  const out = [];
  const seen = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (colActive && normalize_(row[colActive - 1]) && normalize_(row[colActive - 1]) !== "نعم") continue;
    const name = normalize_(row[colName - 1]);
    const phone = colPhone ? cleanPhone_(row[colPhone - 1]) : "";
    const extra = colExtra ? cleanPhone_(row[colExtra - 1]) : "";
    if (!name && !phone && !extra) continue;
    const key = name + "|" + (phone || extra);
    if (seen[key]) continue;
    seen[key] = true;
    out.push({ name: name, customerName: name, manager: colManager ? normalize_(row[colManager - 1]) : "", phone: phone || extra, mobile: phone || extra, extraPhone: extra, type: colType ? normalize_(row[colType - 1]) : "" });
    if (out.length >= limit) break;
  }
  return { success: true, customers: out };
}


/************************************************************
 * V1857 / ES14 Accounting Merge Overrides
 * - المشتريات عند ضياء / رحمه / ريفان فقط.
 * - وائل / جابر: فاتورة قسم + حالة + هالك + حاسبة فقط، بدون مشتريات وبدون تكلفة ظاهرة.
 * - Alias لتحديث الخامات من الواجهة: recalcAccountingMaterialsCascade.
 ************************************************************/
function accountingCanSavePurchaseV1857_(auth) {
  return auth && (auth.mode === "full" || auth.mode === "final");
}
function accountingSanitizeNumberHiddenV1857_(obj) {
  if (!obj) return obj;
  const hidden = [
    "unitCost", "computedUnitCost", "materialCost", "totalCost", "systemCost", "profit", "cost",
    "تكلفة الخامة", "إجمالي التكلفة", "تكلفة النظام", "الربح", "تكلفة محسوبة", "سعر الوحدة",
    "تكلفة حبر", "تكلفة ثابتة", "تكلفة تشغيل", "تكلفة أخرى", "قيمة التشغيل", "operatingUnitCost",
    "priceDiff", "فرق السعر", "damageCost", "تكلفة التالف", "damageCovered", "تعويض التالف", "damageRemaining", "باقي على الموظف"
  ];
  hidden.forEach(function(k){ if (Object.prototype.hasOwnProperty.call(obj, k)) obj[k] = ""; });
  ["componentsJson", "مكونات الصنف", "مكونات الخامة", "تفاصيل المكونات"].forEach(function(k){
    if (!Object.prototype.hasOwnProperty.call(obj, k) || !obj[k]) return;
    try {
      const rows = JSON.parse(obj[k]);
      if (!Array.isArray(rows)) return;
      obj[k] = JSON.stringify(rows.map(function(row){
        const safe = Object.assign({}, row || {});
        ["cost", "unitCost", "totalCost", "materialCost", "تكلفة", "تكلفة الوحدة", "إجمالي التكلفة"].forEach(function(costKey){ delete safe[costKey]; });
        return safe;
      }));
    } catch (err) { obj[k] = ""; }
  });
  return obj;
}

function accountingTemplateComponentsV1913_(sheet, templateId, itemName, department) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const h = headersMap_(sheet);
  const colId = firstCol_(h, ["ID", "كود الصنف"], 0);
  const colName = firstCol_(h, ["اسم البند", "اسم الصنف"], 0);
  const colDept = firstCol_(h, ["القسم"], 0);
  const colComponents = firstCol_(h, ["مكونات الصنف"], 0);
  if (!colComponents) return [];
  const wantedId = normalize_(templateId);
  const wantedName = accountingMaterialKey_(itemName);
  const wantedDept = normalize_(department);
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const idMatches = wantedId && colId && normalize_(valueAt_(row, colId)) === wantedId;
    const nameMatches = wantedName && colName && accountingMaterialKey_(valueAt_(row, colName)) === wantedName;
    const deptMatches = !wantedDept || !colDept || normalize_(valueAt_(row, colDept)) === wantedDept || normalize_(valueAt_(row, colDept)) === "مشترك";
    if ((idMatches || nameMatches) && deptMatches) return accountingParseComponents_(valueAt_(row, colComponents));
  }
  return [];
}

function accountingLaserQuoteCoreV1913_(materialsSheet, p) {
  p = p || {};
  const materialName = normalize_(p.materialName || p.material);
  const pieceWidth = parseMoney_(p.pieceWidth || p.width);
  const pieceHeight = parseMoney_(p.pieceHeight || p.height);
  const qty = Math.max(1, parseMoney_(p.qty) || 1);
  const wastePercent = Math.max(0, parseMoney_(p.wastePercent || p.waste));
  if (!materialName || pieceWidth <= 0 || pieceHeight <= 0) return { success: false, message: "الخامة وطول وعرض القطعة مطلوبة." };
  const cache = accountingMaterialCache_(materialsSheet);
  const info = cache.byName[accountingMaterialKey_(materialName)];
  if (!info) return { success: false, message: "الخامة غير مسجلة: " + materialName };
  const h = cache.h;
  const rawWidth = parseMoney_(valueAt_(info.row, firstCol_(h, ["عرض الخام"], 0)));
  const rawHeight = parseMoney_(valueAt_(info.row, firstCol_(h, ["طول الخام"], 0)));
  const sheetCost = parseMoney_(valueAt_(info.row, firstCol_(h, ["تكلفة محسوبة", "سعر الوحدة"], 0)));
  const officialUnitSale = parseMoney_(valueAt_(info.row, firstCol_(h, ["سعر بيع رسمي", "سعر بيع مقترح"], 0)));
  if (rawWidth <= 0 || rawHeight <= 0 || sheetCost < 0) return { success: false, message: "أبعاد وتكلفة الشيت غير مكتملة للخامة " + materialName };
  const sheetArea = rawWidth * rawHeight;
  const pieceArea = pieceWidth * pieceHeight;
  const consumedAreaPerPiece = pieceArea * (1 + wastePercent / 100);
  if (consumedAreaPerPiece > sheetArea) return { success: false, message: "مقاس القطعة أكبر من مساحة الشيت بعد الهالك." };
  const piecesByLayout = Math.max(Math.floor(rawWidth / pieceWidth) * Math.floor(rawHeight / pieceHeight), Math.floor(rawWidth / pieceHeight) * Math.floor(rawHeight / pieceWidth));
  const materialCostPerPiece = sheetCost * consumedAreaPerPiece / sheetArea;
  const customerUnitSale = parseMoney_(p.customerUnitSale || p.salePrice || p.unitSalePrice);
  return {
    success: true,
    version: MATBAGY_ACCOUNTING_VERSION,
    materialName: materialName,
    sheetWidth: rawWidth,
    sheetHeight: rawHeight,
    pieceWidth: pieceWidth,
    pieceHeight: pieceHeight,
    qty: qty,
    wastePercent: wastePercent,
    consumedAreaPerPiece: consumedAreaPerPiece,
    consumedAreaTotal: consumedAreaPerPiece * qty,
    estimatedPiecesPerSheet: piecesByLayout,
    materialCostPerPiece: materialCostPerPiece,
    materialCostTotal: materialCostPerPiece * qty,
    officialUnitSale: officialUnitSale,
    customerUnitSale: customerUnitSale
  };
}

function calculateAccountingLaserQuoteV1913_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!(auth.mode === "full" || auth.mode === "laser")) return { success: false, message: "حاسبة الليزر متاحة لجابر وضياء فقط." };
  const p = e.parameter || {};
  const result = accountingLaserQuoteCoreV1913_(ensureAccountingSheets_().materials, p);
  if (!result.success) return result;
  const factor = Math.max(0, parseMoney_(p.saleFactor || p.factor) || 2.2);
  const suggestedUnitSale = result.customerUnitSale || result.officialUnitSale || (auth.mode === "full" ? result.materialCostPerPiece * factor : 0);
  result.suggestedUnitSale = suggestedUnitSale;
  result.suggestedTotalSale = suggestedUnitSale * result.qty;
  if (auth.mode === "full") {
    return result;
  }
  delete result.materialCostPerPiece;
  delete result.materialCostTotal;
  delete result.officialUnitSale;
  delete result.customerUnitSale;
  return result;
}
function accountingSanitizeRowsV1857_(rows, mode) {
  rows = rows || [];
  if (mode === "full") return rows;
  return rows.map(function(r){ return accountingSanitizeNumberHiddenV1857_(Object.assign({}, r)); });
}
function easyStoreSalesHeadersV1909_() {
  return ["ID","وقت التسجيل","رقم الفاتورة","رقم الأوردر","العميل","نوع الدفع","البند","الكمية","سعر الوحدة","خصم","الإجمالي","المدفوع","المتبقي","بنود الأقسام","مسجل بواسطة","ملاحظات"];
}
function easyStorePurchasesHeadersV1909_() {
  return ["ID","وقت التسجيل","رقم الفاتورة","القسم","المورد","نوع الدفع","تاريخ الاستحقاق","الخامة","الكمية","سعر الوحدة","الإجمالي","المدفوع","المتبقي","بنود الأقسام","مسجل بواسطة","ملاحظات"];
}
function getAccounting_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  const sheets = ensureAccountingSheets_();
  const materialsRaw = accountingFilterRows_(accSheetRows_(sheets.materials), auth, "materials");
  const templatesRaw = accountingFilterRows_(accSheetRows_(sheets.templates), auth, "templates");
  const deptLinesAll = accSheetRows_(sheets.deptLines);
  const deptLinesRaw = accountingFilterRows_(deptLinesAll, auth, "deptLines");
  const finalInvoicesRaw = accountingFilterRows_(accSheetRows_(sheets.finalInvoices), auth, "finalInvoices");
  const wasteRaw = accountingFilterRows_(accSheetRows_(sheets.waste), auth, "deptLines");
  const stockRaw = accountingFilterRows_(accSheetRows_(sheets.stockMoves), auth, "deptLines");
  const mode = auth.mode;
  const salesRaw = (mode === "full" || mode === "final") ? accSheetRows_(mbEnsureSheet_("حسابات - فواتير المبيعات", easyStoreSalesHeadersV1909_())) : [];
  const purchasesRaw = (mode === "full" || mode === "final") ? accSheetRows_(mbEnsureSheet_("حسابات - فواتير الشراء", easyStorePurchasesHeadersV1909_())) : [];
  return {
    success: true,
    permissions: {
      mode: mode,
      department: auth.department,
      canManageMaterials: mode === "full",
      canCloseFinalInvoice: mode === "full" || mode === "final",
      canEnterDeptLine: mode === "full" || mode === "print" || mode === "laser",
      canEnterPurchaseInvoice: mode === "full" || mode === "final",
      canSeeCosts: mode === "full",
      canSeeProfitReports: mode === "full"
    },
    materials: accountingSanitizeRowsV1857_(materialsRaw, mode),
    templates: accountingSanitizeRowsV1857_(templatesRaw, mode),
    deptLines: accountingSanitizeRowsV1857_(deptLinesRaw, mode),
    finalInvoices: accountingSanitizeRowsV1857_(finalInvoicesRaw, mode),
    sales: accountingSanitizeRowsV1857_(salesRaw, mode),
    purchases: accountingSanitizeRowsV1857_(purchasesRaw, mode),
    wasteLines: accountingSanitizeRowsV1857_(wasteRaw, mode),
    stockMoves: accountingSanitizeRowsV1857_(stockRaw, mode),
    summary: mode === "full" ? accountingSummary_(deptLinesAll) : accountingSummary_(deptLinesRaw).byDepartment.map ? { byDepartment: accountingSummary_(deptLinesRaw).byDepartment.map(function(x){ return { department:x.department, sales:x.sales, cost:"", profit:"", count:x.count }; }) } : { byDepartment: [] },
    version: MATBAGY_ACCOUNTING_VERSION
  };
}
function saveEasyStorePurchase_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!accountingCanSavePurchaseV1857_(auth)) return { success: false, message: "فواتير المشتريات عند ضياء / رحمه / ريفان فقط. وائل وجابر يسجلوا فاتورة القسم فقط." };
  const sheet = mbEnsureSheet_("حسابات - فواتير الشراء", ["ID","وقت التسجيل","رقم الفاتورة","القسم","المورد","نوع الدفع","تاريخ الاستحقاق","الخامة","الكمية","سعر الوحدة","الإجمالي","المدفوع","المتبقي","بنود الأقسام","مسجل بواسطة","ملاحظات"]);
  const qty = parseMoney_(e.parameter.qty), unit = parseMoney_(e.parameter.unitPrice || e.parameter.unit);
  const total = parseMoney_(e.parameter.total) || qty * unit;
  const paid = parseMoney_(e.parameter.paid);
  const remain = parseMoney_(e.parameter.remain) || Math.max(0, total - paid);
  appendByHeaders_(sheet, {"ID":"PUR-"+Utilities.getUuid().slice(0,8), "وقت التسجيل":new Date(), "رقم الفاتورة":normalize_(e.parameter.invoiceNo || e.parameter.no), "القسم":normalize_(e.parameter.department || auth.department || "إدارة"), "المورد":normalize_(e.parameter.supplier), "نوع الدفع":normalize_(e.parameter.paymentType), "تاريخ الاستحقاق":normalize_(e.parameter.dueDate), "الخامة":normalize_(e.parameter.materialName || e.parameter.material), "الكمية":qty, "سعر الوحدة":unit, "الإجمالي":total, "المدفوع":paid, "المتبقي":remain, "بنود الأقسام":normalize_(e.parameter.lineIds), "مسجل بواسطة":auth.user.username, "ملاحظات":normalize_(e.parameter.notes)});
  try { saveStockMoveBatch25_(normalize_(e.parameter.materialName || e.parameter.material), qty, 0, "شراء", normalize_(e.parameter.invoiceNo || e.parameter.no), auth.user.username); } catch(err) {}
  return { success:true, message:"تم حفظ فاتورة الشراء وتسجيل حركة المخزون." };
}
function saveEasyStorePurchaseV2_(e) {
  return saveEasyStorePurchase_(e);
}
function easyStoreSystemHealth_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message: auth.message };
  const sh = ensureAccountingSheets_();
  return { success:true, message:"النظام سليم", sheets:Object.keys(sh), version:"V1857 ES14 Accounting Merge", permissions:{ mode:auth.mode, canEnterPurchaseInvoice: accountingCanSavePurchaseV1857_(auth), canSeeCosts: auth.mode === "full" } };
}


/************************************************************
 * V1857 Fix 5 - activate/deactivate + paper pack fields
 ************************************************************/
function activateAccountingTemplate_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message: auth.message };
  if (auth.mode !== "full") return { success:false, message:"تفعيل الأصناف عند ضياء فقط." };
  const sheet = ensureAccountingSheets_().templates;
  const name = normalize_(e.parameter.itemName || e.parameter.name || "");
  const department = normalize_(e.parameter.department || "");
  let row = accountingFindTemplateRow_(sheet, name, department);
  if (!row) return { success:false, message:"الصنف غير موجود." };
  updateByHeaders_(sheet, row, {"مفعل":"نعم", "آخر تحديث":new Date()}, true);
  return { success:true, message:"تم تفعيل الصنف وسيظهر في الاختيارات." };
}
function activateAccountingMaterial_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message: auth.message };
  if (auth.mode !== "full") return { success:false, message:"تفعيل الخامات عند ضياء فقط." };
  const sheet = ensureAccountingSheets_().materials;
  const name = normalize_(e.parameter.materialName || e.parameter.name || "");
  const department = normalize_(e.parameter.department || "");
  let row = accountingFindMaterialRow_(sheet, name, department);
  if (!row) return { success:false, message:"الخامة غير موجودة." };
  updateByHeaders_(sheet, row, {"مفعل":"نعم", "آخر تحديث":new Date()}, true);
  return { success:true, message:"تم تفعيل الخامة وسيتم استخدامها في الحسابات." };
}



/************************************************************
 * V1858 / ES15 - Customer & Supplier Ledger Fix
 * - حسابات العملاء والموردين.
 * - إضافة مديونية / تحصيل عميل / دفع مورد في أي وقت.
 * - تحديث الرصيد في شيت العملاء/الموردين.
 ************************************************************/
function accountsCanEditV1858_(auth) {
  return auth && (auth.mode === "full" || auth.mode === "final");
}
function accountsLedgerHeadersV1858_() {
  return ["ID", "وقت التسجيل", "نوع الطرف", "اسم الطرف", "كود الطرف", "العملية", "وصف العملية", "المبلغ", "تأثير الرصيد", "طريقة الدفع", "رقم المرجع", "الرصيد قبل", "الرصيد بعد", "مسجل بواسطة", "ملاحظات"];
}
function accountsEnsureLedgerSheetV1858_() {
  return mbEnsureSheet_("حسابات - كشف العملاء والموردين", accountsLedgerHeadersV1858_());
}
function accountsEnsureSheetColumnV1858_(sheet, header) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const values = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(x){ return normalizeKey_(x); });
  const key = normalizeKey_(header);
  let idx = values.indexOf(key);
  if (idx !== -1) return idx + 1;
  sheet.getRange(1, lastCol + 1).setValue(header);
  return lastCol + 1;
}
function accountsPartyKeyV1858_(type, name, code) {
  return normalizeKey_(type) + "|" + searchKey_(name) + "|" + normalizeKey_(code || "");
}
function accountsOperationLabelV1858_(op, partyType) {
  const map = {
    opening_debt: partyType === "supplier" ? "إضافة مستحق للمورد" : "إضافة مديونية للعميل",
    invoice: "باقي فاتورة عميل",
    purchase_invoice: "باقي فاتورة شراء",
    payment_received: "سداد من العميل",
    payment_paid: "دفعة للمورد",
    adjustment_increase: "تسوية بالزيادة",
    adjustment_decrease: "تسوية بالنقص",
    manual: "حركة يدوية"
  };
  return map[op] || op || "حركة";
}
function accountsEffectV1858_(op) {
  if (op === "payment_received" || op === "payment_paid" || op === "adjustment_decrease") return -1;
  return 1;
}
function accountsRowsForPartyV1858_(partyType, partyName, partyCode) {
  const sh = accountsEnsureLedgerSheetV1858_();
  if (sh.getLastRow() < 2) return [];
  const rows = accSheetRows_(sh);
  const key = accountsPartyKeyV1858_(partyType, partyName, partyCode);
  return rows.filter(function(r){ return accountsPartyKeyV1858_(r.partyType || r["نوع الطرف"], r.partyName || r["اسم الطرف"], r.partyCode || r["كود الطرف"]) === key; });
}
function accountsBalanceFromMasterV1858_(partyType, partyName) {
  partyName = normalize_(partyName);
  if (!partyName) return 0;
  if (partyType === "supplier") {
    const sh = mbEnsureSheet_("حسابات - الموردين", accSuppliersHeaders_());
    if (sh.getLastRow() < 2) return 0;
    const h = headersMap_(sh); const data = sh.getDataRange().getValues();
    const colName = firstCol_(h, ["اسم المورد", "المورد", "Supplier"], 3);
    const colDebt = firstCol_(h, ["الرصيد الحالي", "رصيد المورد", "مديونية", "مديونية المورد"], 0);
    for (let i=1;i<data.length;i++) if (normalize_(data[i][colName-1]) === partyName) return colDebt ? parseMoney_(data[i][colDebt-1]) : 0;
    return 0;
  }
  const sh = ss_().getSheetByName(SHEET_NAME_CUSTOMERS);
  if (!sh || sh.getLastRow() < 2) return 0;
  const h = headersMap_(sh); const data = sh.getDataRange().getValues();
  const colName = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 1);
  const colDebt = firstCol_(h, ["مديونية حالية", "رصيد العميل", "مديونية", "customerDebt", "remainingBalance"], 0);
  for (let i=1;i<data.length;i++) if (normalize_(data[i][colName-1]) === partyName) return colDebt ? parseMoney_(data[i][colDebt-1]) : 0;
  return 0;
}
function accountsCurrentBalanceV1858_(partyType, partyName, partyCode) {
  const rows = accountsRowsForPartyV1858_(partyType, partyName, partyCode);
  if (rows.length) {
    const last = rows[rows.length - 1];
    return parseMoney_(last.balanceAfter || last["الرصيد بعد"]);
  }
  return accountsBalanceFromMasterV1858_(partyType, partyName);
}
function accountsUpdateMasterBalanceV1858_(partyType, partyName, balance, auth) {
  partyName = normalize_(partyName);
  if (!partyName) return;
  if (partyType === "supplier") {
    const sh = mbEnsureSheet_("حسابات - الموردين", accSuppliersHeaders_());
    const colName = accountsEnsureSheetColumnV1858_(sh, "اسم المورد");
    const colBal = accountsEnsureSheetColumnV1858_(sh, "الرصيد الحالي");
    const colDebt = accountsEnsureSheetColumnV1858_(sh, "مديونية");
    const colUpdate = accountsEnsureSheetColumnV1858_(sh, "آخر تحديث رصيد");
    const data = sh.getDataRange().getValues(); let row = 0;
    for (let i=1;i<data.length;i++) if (normalize_(data[i][colName-1]) === partyName) { row = i+1; break; }
    if (!row) {
      row = sh.getLastRow() + 1;
      sh.getRange(row, colName).setValue(partyName);
      accountsEnsureSheetColumnV1858_(sh, "ID");
      updateByHeaders_(sh, row, {"ID":"SUP-"+Utilities.getUuid().slice(0,8), "وقت التسجيل":new Date(), "اسم المورد":partyName, "مفعل":"نعم", "مسجل بواسطة":auth.user.username}, true);
    }
    sh.getRange(row, colBal).setValue(balance);
    sh.getRange(row, colDebt).setValue(balance);
    sh.getRange(row, colUpdate).setValue(new Date());
    return;
  }
  const sh = ss_().getSheetByName(SHEET_NAME_CUSTOMERS) || mbEnsureSheet_(SHEET_NAME_CUSTOMERS, ["اسم الشات / المكتب", "اسم العميل", "رقم العميل الأساسي"]);
  const colName = accountsEnsureSheetColumnV1858_(sh, "اسم الشات / المكتب");
  accountsEnsureSheetColumnV1858_(sh, "اسم العميل");
  const colBal = accountsEnsureSheetColumnV1858_(sh, "مديونية حالية");
  const colDebt = accountsEnsureSheetColumnV1858_(sh, "رصيد العميل");
  const colUpdate = accountsEnsureSheetColumnV1858_(sh, "آخر تحديث مديونية");
  const data = sh.getDataRange().getValues(); let row = 0;
  for (let i=1;i<data.length;i++) if (normalize_(data[i][colName-1]) === partyName || normalize_(data[i][accountsEnsureSheetColumnV1858_(sh,"اسم العميل")-1]) === partyName) { row = i+1; break; }
  if (!row) {
    row = sh.getLastRow() + 1;
    updateByHeaders_(sh, row, {"اسم الشات / المكتب":partyName, "اسم العميل":partyName, "مفعل":"نعم"}, true);
  }
  sh.getRange(row, colBal).setValue(balance);
  sh.getRange(row, colDebt).setValue(balance);
  sh.getRange(row, colUpdate).setValue(new Date());
}
function savePartyLedgerTransactionV1858_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message:auth.message };
  if (!accountsCanEditV1858_(auth)) return { success:false, message:"حسابات العملاء والموردين عند ضياء / رحمه / ريفان فقط." };
  let partyType = normalizeKey_(e.parameter.partyType || e.parameter.type || "customer");
  if (partyType.indexOf("supplier") !== -1 || partyType.indexOf("مورد") !== -1) partyType = "supplier"; else partyType = "customer";
  const partyName = normalize_(e.parameter.partyName || e.parameter.customerName || e.parameter.supplierName || e.parameter.name || "");
  const partyCode = normalize_(e.parameter.partyCode || e.parameter.customerCode || e.parameter.supplierCode || "");
  const op = normalizeKey_(e.parameter.operation || e.parameter.txnType || e.parameter.kind || "manual");
  const amount = parseMoney_(e.parameter.amount || e.parameter.value || 0);
  if (!partyName) return { success:false, message:"اسم العميل/المورد مطلوب." };
  if (!amount) return { success:false, message:"اكتب المبلغ." };
  const before = accountsCurrentBalanceV1858_(partyType, partyName, partyCode);
  const effect = accountsEffectV1858_(op);
  const after = Math.max(0, before + effect * amount);
  const sh = accountsEnsureLedgerSheetV1858_();
  const label = accountsOperationLabelV1858_(op, partyType);
  appendByHeaders_(sh, {
    "ID":"LED-"+Utilities.getUuid().slice(0,8),
    "وقت التسجيل":new Date(),
    "نوع الطرف":partyType,
    "اسم الطرف":partyName,
    "كود الطرف":partyCode,
    "العملية":op,
    "وصف العملية":label,
    "المبلغ":amount,
    "تأثير الرصيد":effect > 0 ? "زيادة" : "نقص",
    "طريقة الدفع":normalize_(e.parameter.paymentMethod || e.parameter.method || ""),
    "رقم المرجع":normalize_(e.parameter.refNo || e.parameter.invoiceNo || e.parameter.reference || ""),
    "الرصيد قبل":before,
    "الرصيد بعد":after,
    "مسجل بواسطة":auth.user.username,
    "ملاحظات":normalize_(e.parameter.notes || "")
  });
  accountsUpdateMasterBalanceV1858_(partyType, partyName, after, auth);
  return { success:true, message:"تم حفظ الحركة وتحديث الرصيد.", balance:after, balanceBefore:before };
}
function getPartyAccountV1858_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message:auth.message };
  let partyType = normalizeKey_(e.parameter.partyType || e.parameter.type || "customer");
  if (partyType.indexOf("supplier") !== -1 || partyType.indexOf("مورد") !== -1) partyType = "supplier"; else partyType = "customer";
  const partyName = normalize_(e.parameter.partyName || e.parameter.customerName || e.parameter.supplierName || e.parameter.name || "");
  const partyCode = normalize_(e.parameter.partyCode || "");
  const rows = accountsRowsForPartyV1858_(partyType, partyName, partyCode);
  const balance = accountsCurrentBalanceV1858_(partyType, partyName, partyCode);
  const transactions = rows.map(function(r){ return {
    id:r.id || r.ID || r["ID"], createdAt:r.createdAt || r["وقت التسجيل"], partyType:r.partyType || r["نوع الطرف"], partyName:r.partyName || r["اسم الطرف"], operation:r.operation || r["العملية"], operationLabel:r.operationLabel || r["وصف العملية"], amount:r.amount || r["المبلغ"], paymentMethod:r.paymentMethod || r["طريقة الدفع"], refNo:r.refNo || r["رقم المرجع"], balanceBefore:r.balanceBefore || r["الرصيد قبل"], balanceAfter:r.balanceAfter || r["الرصيد بعد"], createdBy:r.createdBy || r["مسجل بواسطة"], notes:r.notes || r["ملاحظات"]
  }; });
  return { success:true, partyType:partyType, partyName:partyName, balance:balance, transactions:transactions };
}
function getAccountsLedgerV1858_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message:auth.message };
  const sh = accountsEnsureLedgerSheetV1858_();
  const rows = accSheetRows_(sh);
  return { success:true, rows: rows, version:"V1858_ES15_LEDGER_FIX" };
}

/******** Overrides to expose balances in EasyStore lists ********/
function getEasyStoreCustomers_(e) {
  const auth = authorize_(e.parameter.username, e.parameter.token);
  if (!auth.ok) return { success: false, message: auth.message };
  const sheet = ss_().getSheetByName(SHEET_NAME_CUSTOMERS);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, customers: [] };
  accountsEnsureSheetColumnV1858_(sheet, "مديونية حالية");
  accountsEnsureSheetColumnV1858_(sheet, "رصيد العميل");
  const limit = Math.min(Number(e.parameter.limit || 500) || 500, 1000);
  const data = sheet.getDataRange().getValues();
  const h = headersMap_(sheet);
  const colName = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 1);
  const colManager = firstCol_(h, ["اسم المسؤول", "المسؤول", "Manager"], 2);
  const colPhone = firstCol_(h, ["رقم العميل الأساسي", "رقم العميل", "رقم الهاتف", "Phone"], 3);
  const colExtra = firstCol_(h, ["رقم إضافي", "رقم إضافى", "Extra Phone"], 4);
  const colType = firstCol_(h, ["نوع العميل", "Customer Type"], 5);
  const colActive = firstCol_(h, ["مفعل؟", "مفعل", "Active"], 0);
  const colDebt = firstCol_(h, ["مديونية حالية", "رصيد العميل", "مديونية", "customerDebt", "remainingBalance"], 0);
  const out = []; const seen = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (colActive && normalize_(row[colActive - 1]) && normalize_(row[colActive - 1]) !== "نعم") continue;
    const name = normalize_(row[colName - 1]);
    const phone = colPhone ? cleanPhone_(row[colPhone - 1]) : "";
    const extra = colExtra ? cleanPhone_(row[colExtra - 1]) : "";
    if (!name && !phone && !extra) continue;
    const key = name + "|" + (phone || extra);
    if (seen[key]) continue; seen[key] = true;
    const debt = colDebt ? parseMoney_(row[colDebt - 1]) : accountsCurrentBalanceV1858_("customer", name, "");
    out.push({ name:name, customerName:name, manager: colManager ? normalize_(row[colManager - 1]) : "", phone: phone || extra, mobile: phone || extra, extraPhone: extra, type: colType ? normalize_(row[colType - 1]) : "", debt: debt, currentBalance: debt, remainingBalance: debt });
    if (out.length >= limit) break;
  }
  return { success:true, customers:out, version:"V1858_ES15_LEDGER_FIX" };
}
function getEasyStoreSuppliers_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message: auth.message };
  const sh = mbEnsureSheet_("حسابات - الموردين", accSuppliersHeaders_());
  accountsEnsureSheetColumnV1858_(sh, "الرصيد الحالي");
  const rows = accSheetRows_(sh).map(function(r){
    const name = r.name || r.supplierName || r["اسم المورد"] || r["المورد"] || "";
    const bal = parseMoney_(r.currentBalance || r["الرصيد الحالي"] || r.debt || r["مديونية"] || accountsCurrentBalanceV1858_("supplier", name, ""));
    r.name = name; r.supplierName = name; r.currentBalance = bal; r.balance = bal; return r;
  });
  return { success:true, suppliers:rows, version:"V1858_ES15_LEDGER_FIX" };
}

/******** Overrides to auto-add unpaid invoice balances ********/
function accountingIdempotencyKeyV1913_(scope, rawKey) {
  const safe = normalize_(rawKey).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
  return safe ? "MATBAGY_" + scope + "_V1913_" + safe : "";
}
function accountingReadIdempotentV1913_(scope, rawKey) {
  const key = accountingIdempotencyKeyV1913_(scope, rawKey);
  if (!key) return null;
  try { const value = PropertiesService.getScriptProperties().getProperty(key); return value ? JSON.parse(value) : null; } catch (err) { return null; }
}
function accountingSaveIdempotentV1913_(scope, rawKey, response) {
  const key = accountingIdempotencyKeyV1913_(scope, rawKey);
  if (!key || !response || !response.success) return;
  try { PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(response).slice(0, 8000)); } catch (err) {}
}
function accountingIncreaseMaterialStockV1913_(materialName, qty, ctx) {
  const sheets = ensureAccountingSheets_();
  const rowNumber = accountingFindMaterialRow_(sheets.materials, materialName, "") || 0;
  if (!rowNumber) return { ok: false, message: "الخامة غير مسجلة في المخزون: " + materialName };
  const h = headersMap_(sheets.materials);
  const colStock = firstCol_(h, ["رصيد المخزن"], 0);
  const colUpdate = firstCol_(h, ["آخر تحديث"], 0);
  if (!colStock) return { ok: false, message: "عمود رصيد المخزن غير موجود." };
  const before = parseMoney_(sheets.materials.getRange(rowNumber, colStock).getValue());
  const after = before + qty;
  const moveRowsBefore = sheets.stockMoves.getLastRow();
  try {
    sheets.materials.getRange(rowNumber, colStock).setValue(after);
    if (colUpdate) sheets.materials.getRange(rowNumber, colUpdate).setValue(new Date());
    appendByHeaders_(sheets.stockMoves, { "ID":"STK-"+Utilities.getUuid().slice(0,8), "وقت الحركة":new Date(), "نوع الحركة":"إضافة من فاتورة شراء", "القسم":ctx.department||"", "اسم البند":"فاتورة شراء", "الخامة":materialName, "كمية واردة":qty, "كمية منصرفة":0, "رصيد قبل الحركة":before, "رصيد بعد الحركة":after, "مسجل بواسطة":ctx.username||"", "ملاحظات":"فاتورة "+(ctx.invoiceNo||"") });
    return { ok: true, before: before, after: after };
  } catch (err) {
    try { sheets.materials.getRange(rowNumber, colStock).setValue(before); } catch (rollbackErr) {}
    try { if (sheets.stockMoves.getLastRow() > moveRowsBefore) sheets.stockMoves.deleteRows(moveRowsBefore + 1, sheets.stockMoves.getLastRow() - moveRowsBefore); } catch (rollbackMoveErr) {}
    return { ok: false, message: "تعذر تحديث المخزون، ولم يتم اعتماد حركة الشراء: " + (err.message || err) };
  }
}
function saveEasyStoreSaleV2_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message: auth.message };
  if (!(auth.mode === "full" || auth.mode === "final")) return { success:false, message:"حفظ فاتورة المبيعات الرسمية عند ضياء أو رحمه أو ريفان فقط." };
  const requestKey = normalize_(e.parameter.requestId || e.parameter.idempotencyKey || e.parameter.clientRequestId);
  const oldResponse = accountingReadIdempotentV1913_("SALE", requestKey);
  if (oldResponse) return Object.assign({}, oldResponse, { duplicatePrevented:true, message:"تم منع تكرار فاتورة المبيعات؛ الفاتورة محفوظة بالفعل." });
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
  const sh = mbEnsureSheet_("حسابات - فواتير المبيعات", ["ID","وقت التسجيل","رقم الفاتورة","رقم الأوردر","العميل","نوع الدفع","البند","الكمية","سعر الوحدة","خصم","الإجمالي","المدفوع","المتبقي","بنود الأقسام","مسجل بواسطة","ملاحظات"]);
  const qty=parseMoney_(e.parameter.qty), unit=parseMoney_(e.parameter.unit), discount=parseMoney_(e.parameter.discount), total=parseMoney_(e.parameter.total)||Math.max(0,qty*unit-discount), paid=parseMoney_(e.parameter.paid), remain=parseMoney_(e.parameter.remain)||Math.max(0,total-paid);
  const customer = normalize_(e.parameter.customer || e.parameter.customerName);
  const invoiceNo = normalize_(e.parameter.no||e.parameter.invoiceNo);
  if (!customer || !invoiceNo || qty <= 0 || total < 0) return { success:false, message:"رقم الفاتورة والعميل والكمية الصحيحة مطلوبة." };
  const saleHeaders = headersMap_(sh);
  const saleNoCol = firstCol_(saleHeaders, ["رقم الفاتورة"], 0);
  if (saleNoCol && sh.getLastRow() > 1) {
    const invoiceNumbers = sh.getRange(2, saleNoCol, sh.getLastRow() - 1, 1).getValues();
    for (let si = 0; si < invoiceNumbers.length; si++) if (normalize_(invoiceNumbers[si][0]) === invoiceNo) return { success:false, duplicatePrevented:true, message:"رقم فاتورة المبيعات مستخدم بالفعل: "+invoiceNo };
  }
  appendByHeaders_(sh,{"ID":"SAL-"+Utilities.getUuid().slice(0,8),"وقت التسجيل":new Date(),"رقم الفاتورة":invoiceNo,"رقم الأوردر":normalize_(e.parameter.orderId),"العميل":customer,"نوع الدفع":normalize_(e.parameter.paymentType),"البند":normalize_(e.parameter.item),"الكمية":qty,"سعر الوحدة":unit,"خصم":discount,"الإجمالي":total,"المدفوع":paid,"المتبقي":remain,"بنود الأقسام":normalize_(e.parameter.lineIds),"مسجل بواسطة":auth.user.username,"ملاحظات":normalize_(e.parameter.notes)});
  try { saveStockMoveBatch25_(normalize_(e.parameter.item), 0, qty, "بيع", invoiceNo, auth.user.username); } catch(err) {}
  if (customer && total > 0) savePartyLedgerTransactionV1858_({ parameter:{ username:e.parameter.username, token:e.parameter.token, partyType:"customer", partyName:customer, operation:"invoice", amount:total, paymentMethod:normalize_(e.parameter.paymentType), refNo:invoiceNo, notes:"فاتورة مبيعات" } });
  if (customer && paid > 0) savePartyLedgerTransactionV1858_({ parameter:{ username:e.parameter.username, token:e.parameter.token, partyType:"customer", partyName:customer, operation:"payment_received", amount:paid, paymentMethod:normalize_(e.parameter.paymentType), refNo:invoiceNo, notes:"مدفوع من فاتورة المبيعات" } });
  const response = { success:true, invoiceNo:invoiceNo, message:"تم حفظ فاتورة البيع وتحديث حساب العميل.", version:MATBAGY_ACCOUNTING_VERSION };
  accountingSaveIdempotentV1913_("SALE", requestKey, response);
  return response;
  } finally { try { lock.releaseLock(); } catch (err) {} }
}
function saveEasyStorePurchase_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!accountingCanSavePurchaseV1857_(auth)) return { success: false, message: "فواتير المشتريات عند ضياء / رحمه / ريفان فقط. وائل وجابر يسجلوا فاتورة القسم فقط." };
  const requestKey = normalize_(e.parameter.requestId || e.parameter.idempotencyKey || e.parameter.clientRequestId);
  const oldResponse = accountingReadIdempotentV1913_("PURCHASE", requestKey);
  if (oldResponse) return Object.assign({}, oldResponse, { duplicatePrevented:true, message:"تم منع تكرار فاتورة الشراء؛ الفاتورة محفوظة بالفعل." });
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
  const sheet = mbEnsureSheet_("حسابات - فواتير الشراء", ["ID","وقت التسجيل","رقم الفاتورة","القسم","المورد","نوع الدفع","تاريخ الاستحقاق","الخامة","الكمية","سعر الوحدة","الإجمالي","المدفوع","المتبقي","بنود الأقسام","مسجل بواسطة","ملاحظات"]);
  const qty = parseMoney_(e.parameter.qty), unit = parseMoney_(e.parameter.unitPrice || e.parameter.unit);
  const total = parseMoney_(e.parameter.total) || qty * unit;
  const paid = parseMoney_(e.parameter.paid);
  const remain = parseMoney_(e.parameter.remain) || Math.max(0, total - paid);
  const supplier = normalize_(e.parameter.supplier);
  const invoiceNo = normalize_(e.parameter.invoiceNo || e.parameter.no);
  const materialName = normalize_(e.parameter.materialName || e.parameter.material);
  if (!invoiceNo || !supplier || !materialName || qty <= 0 || unit < 0) return { success:false, message:"رقم الفاتورة والمورد والخامة وكمية صحيحة مطلوبة." };
  const purchaseHeaders = headersMap_(sheet);
  const purchaseNoCol = firstCol_(purchaseHeaders, ["رقم الفاتورة"], 0);
  const supplierCol = firstCol_(purchaseHeaders, ["المورد"], 0);
  if (purchaseNoCol && sheet.getLastRow() > 1) {
    const purchaseRows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    for (let pi = 0; pi < purchaseRows.length; pi++) {
      if (normalize_(valueAt_(purchaseRows[pi], purchaseNoCol)) === invoiceNo && (!supplierCol || normalize_(valueAt_(purchaseRows[pi], supplierCol)) === supplier)) return { success:false, duplicatePrevented:true, message:"فاتورة المورد مسجلة بالفعل: "+invoiceNo };
    }
  }
  if (!accountingFindMaterialRow_(ensureAccountingSheets_().materials, materialName, "")) return { success:false, message:"الخامة غير مسجلة في المخزون: "+materialName };
  const purchaseRow = sheet.getLastRow() + 1;
  appendByHeaders_(sheet, {"ID":"PUR-"+Utilities.getUuid().slice(0,8), "وقت التسجيل":new Date(), "رقم الفاتورة":invoiceNo, "القسم":normalize_(e.parameter.department || auth.department || "إدارة"), "المورد":supplier, "نوع الدفع":normalize_(e.parameter.paymentType), "تاريخ الاستحقاق":normalize_(e.parameter.dueDate), "الخامة":materialName, "الكمية":qty, "سعر الوحدة":unit, "الإجمالي":total, "المدفوع":paid, "المتبقي":remain, "بنود الأقسام":normalize_(e.parameter.lineIds), "مسجل بواسطة":auth.user.username, "ملاحظات":normalize_(e.parameter.notes)});
  const stockResult = accountingIncreaseMaterialStockV1913_(materialName, qty, { department:normalize_(e.parameter.department || auth.department || "إدارة"), username:auth.user.username, invoiceNo:invoiceNo });
  if (!stockResult.ok) {
    try { if (sheet.getLastRow() >= purchaseRow) sheet.deleteRow(purchaseRow); } catch (rollbackPurchaseErr) {}
    return { success:false, message:stockResult.message };
  }
  if (supplier && total > 0) savePartyLedgerTransactionV1858_({ parameter:{ username:e.parameter.username, token:e.parameter.token, partyType:"supplier", partyName:supplier, operation:"purchase_invoice", amount:total, paymentMethod:normalize_(e.parameter.paymentType), refNo:invoiceNo, notes:"فاتورة مشتريات" } });
  if (supplier && paid > 0) savePartyLedgerTransactionV1858_({ parameter:{ username:e.parameter.username, token:e.parameter.token, partyType:"supplier", partyName:supplier, operation:"payment_paid", amount:paid, paymentMethod:normalize_(e.parameter.paymentType), refNo:invoiceNo, notes:"مدفوع من فاتورة المشتريات" } });
  const response = { success:true, invoiceNo:invoiceNo, stockBefore:stockResult.before, stockAfter:stockResult.after, message:"تم حفظ فاتورة الشراء وتحديث حساب المورد والمخزون.", version:MATBAGY_ACCOUNTING_VERSION };
  accountingSaveIdempotentV1913_("PURCHASE", requestKey, response);
  return response;
  } finally { try { lock.releaseLock(); } catch (err) {} }
}
function saveEasyStorePurchaseV2_(e) { return saveEasyStorePurchase_(e); }
function easyStoreSystemHealth_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message: auth.message };
  const sh = ensureAccountingSheets_();
  accountsEnsureLedgerSheetV1858_();
  return { success:true, message:"النظام سليم", sheets:Object.keys(sh).concat(["حسابات - كشف العملاء والموردين"]), version:"V1861 ES18 Error Fix + Zero Reset", permissions:{ mode:auth.mode, canEnterPurchaseInvoice: accountingCanSavePurchaseV1857_(auth), canSeeCosts: auth.mode === "full", canEditLedger:accountsCanEditV1858_(auth) } };
}


/************************************************************
 * V1859 / ES16 - Accounting Manager Core
 * Customer portal accounts, invoice review link, cashbox,
 * day close, audit log, and admin clear materials.
 ************************************************************/
function es16CanEditAccounts_(auth) { return auth && auth.ok && (auth.mode === "full" || auth.mode === "final"); }
function es16AdminOnly_(auth) { return auth && auth.ok && auth.mode === "full"; }
function es16AuditHeaders_(){ return ["ID","وقت التسجيل","المستخدم","نوع العملية","الكيان","رقم المرجع","قبل","بعد","ملاحظات"]; }
function es16CashboxHeaders_(){ return ["ID","وقت التسجيل","نوع الحركة","الطرف","المبلغ","طريقة الدفع","رقم المرجع","الخزنة","مسجل بواسطة","ملاحظات"]; }
function es16DayCloseHeaders_(){ return ["ID","وقت القفلة","تاريخ اليوم","إجمالي قبض","إجمالي دفع","مصروفات","رصيد متوقع","رصيد فعلي","فرق","مسجل بواسطة","ملاحظات"]; }
function es16Audit_(user, operation, entity, ref, beforeValue, afterValue, notes){
  try{
    const sh = mbEnsureSheet_("حسابات - سجل المراجعة", es16AuditHeaders_());
    appendByHeaders_(sh,{"ID":"AUD-"+Utilities.getUuid().slice(0,8),"وقت التسجيل":new Date(),"المستخدم":user||"system","نوع العملية":operation||"","الكيان":entity||"","رقم المرجع":ref||"","قبل":beforeValue||"","بعد":afterValue||"","ملاحظات":notes||""});
  }catch(err){}
}
function saveAuditLogV1859_(e){
  const auth = accountingAuthorize_(e); if(!auth.ok) return {success:false,message:auth.message};
  es16Audit_(auth.user.username, normalize_(e.parameter.operation), normalize_(e.parameter.entity), normalize_(e.parameter.refNo), normalize_(e.parameter.before), normalize_(e.parameter.after), normalize_(e.parameter.notes));
  return {success:true,message:"تم تسجيل المراجعة."};
}
function getAuditLogV1859_(e){
  const auth = accountingAuthorize_(e); if(!auth.ok) return {success:false,message:auth.message};
  if(!es16AdminOnly_(auth)) return {success:false,message:"سجل المراجعة عند ضياء فقط."};
  const sh = mbEnsureSheet_("حسابات - سجل المراجعة", es16AuditHeaders_());
  return {success:true,rows:accSheetRows_(sh),version:"V1859_ES16"};
}
function saveCashboxTransactionV1859_(e){
  const auth = accountingAuthorize_(e); if(!auth.ok) return {success:false,message:auth.message};
  if(!es16CanEditAccounts_(auth)) return {success:false,message:"الخزنة والتحصيلات عند ضياء / رحمه / ريفان فقط."};
  const type = normalizeKey_(e.parameter.type || e.parameter.operation || "receipt");
  const amount = parseMoney_(e.parameter.amount); if(!amount) return {success:false,message:"اكتب مبلغ الحركة."};
  const party = normalize_(e.parameter.partyName || e.parameter.customerName || e.parameter.supplierName || e.parameter.party || "");
  const method = normalize_(e.parameter.paymentMethod || e.parameter.method || "نقدي");
  const ref = normalize_(e.parameter.refNo || e.parameter.invoiceNo || "");
  const cashbox = normalize_(e.parameter.cashbox || "الخزنة الرئيسية");
  const notes = normalize_(e.parameter.notes || "");
  const sh = mbEnsureSheet_("حسابات - الخزنة", es16CashboxHeaders_());
  appendByHeaders_(sh,{"ID":"CBX-"+Utilities.getUuid().slice(0,8),"وقت التسجيل":new Date(),"نوع الحركة":type,"الطرف":party,"المبلغ":amount,"طريقة الدفع":method,"رقم المرجع":ref,"الخزنة":cashbox,"مسجل بواسطة":auth.user.username,"ملاحظات":notes});
  if(party){
    if(type.indexOf("receipt")!==-1 || type.indexOf("قبض")!==-1 || type.indexOf("customer_payment")!==-1) savePartyLedgerTransactionV1858_({parameter:{username:e.parameter.username,token:e.parameter.token,partyType:"customer",partyName:party,operation:"payment_received",amount:amount,paymentMethod:method,refNo:ref,notes:notes||"تحصيل خزنة"}});
    if(type.indexOf("supplier")!==-1 || type.indexOf("payment_paid")!==-1 || type.indexOf("دفع")!==-1) savePartyLedgerTransactionV1858_({parameter:{username:e.parameter.username,token:e.parameter.token,partyType:"supplier",partyName:party,operation:"payment_paid",amount:amount,paymentMethod:method,refNo:ref,notes:notes||"دفع مورد"}});
  }
  es16Audit_(auth.user.username,"حركة خزنة","الخزنة",ref,"",amount,notes);
  return {success:true,message:"تم حفظ حركة الخزنة وتحديث الحساب."};
}
function getCashboxTransactionsV1859_(e){
  const auth = accountingAuthorize_(e); if(!auth.ok) return {success:false,message:auth.message};
  if(!es16CanEditAccounts_(auth)) return {success:false,message:"الخزنة عند ضياء / رحمه / ريفان فقط."};
  const sh = mbEnsureSheet_("حسابات - الخزنة", es16CashboxHeaders_());
  return {success:true,rows:accSheetRows_(sh),version:"V1859_ES16"};
}
function closeDayV1859_(e){
  const auth = accountingAuthorize_(e); if(!auth.ok) return {success:false,message:auth.message};
  if(!es16AdminOnly_(auth)) return {success:false,message:"قفلة اليوم عند ضياء فقط حالياً."};
  const dateText = normalize_(e.parameter.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"));
  const cashRows = accSheetRows_(mbEnsureSheet_("حسابات - الخزنة", es16CashboxHeaders_()));
  let receipts=0, payments=0, expenses=0;
  cashRows.forEach(function(r){
    const d = String(r.createdAt || r["وقت التسجيل"] || "");
    if(dateText && d.indexOf(dateText) === -1 && d.indexOf(dateText.replace(/-/g,"/")) === -1) return;
    const type = normalizeKey_(r.type || r["نوع الحركة"] || ""); const amount = parseMoney_(r.amount || r["المبلغ"]);
    if(type.indexOf("expense")!==-1 || type.indexOf("مصروف")!==-1) expenses += amount;
    else if(type.indexOf("supplier")!==-1 || type.indexOf("payment_paid")!==-1 || type.indexOf("دفع")!==-1) payments += amount;
    else receipts += amount;
  });
  const expected = receipts - payments - expenses;
  const actual = parseMoney_(e.parameter.actualBalance || e.parameter.actual || expected);
  const diff = actual - expected;
  const sh = mbEnsureSheet_("حسابات - قفلة اليوم", es16DayCloseHeaders_());
  appendByHeaders_(sh,{"ID":"DAY-"+Utilities.getUuid().slice(0,8),"وقت القفلة":new Date(),"تاريخ اليوم":dateText,"إجمالي قبض":receipts,"إجمالي دفع":payments,"مصروفات":expenses,"رصيد متوقع":expected,"رصيد فعلي":actual,"فرق":diff,"مسجل بواسطة":auth.user.username,"ملاحظات":normalize_(e.parameter.notes)});
  es16Audit_(auth.user.username,"قفلة اليوم","الخزنة",dateText,"",actual,"فرق: "+diff);
  return {success:true,message:"تم حفظ قفلة اليوم.",summary:{receipts:receipts,payments:payments,expenses:expenses,expected:expected,actual:actual,diff:diff}};
}
function backupAndClearAccountingMaterialsV1859_(e){
  const auth = accountingAuthorize_(e); if(!auth.ok) return {success:false,message:auth.message};
  if(!es16AdminOnly_(auth)) return {success:false,message:"مسح الخامات عند ضياء فقط."};
  const confirm = normalize_(e.parameter.confirm || e.parameter.confirmText || "");
  if(confirm !== "مسح الخامات" && confirm !== "امسح الخامات" && confirm.toUpperCase() !== "CLEAR MATERIALS") return {success:false,message:"اكتب تأكيد: مسح الخامات"};
  const sh = ensureAccountingSheets_().materials;
  const values = sh.getDataRange().getValues();
  const backupName = "نسخة خامات قبل المسح " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  const backup = ss_().insertSheet(backupName);
  backup.getRange(1,1,values.length,values[0].length).setValues(values);
  if(sh.getLastRow()>1) sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent();
  es16Audit_(auth.user.username,"مسح الخامات","حسابات - الخامات",backupName,values.length-1,0,"تم إنشاء نسخة احتياطية قبل المسح");
  return {success:true,message:"تم مسح الخامات وإنشاء نسخة احتياطية: "+backupName,backupSheet:backupName,deleted:Math.max(0,values.length-1)};
}
function activateAccountingItemV1859_(e){
  const auth = accountingAuthorize_(e); if(!auth.ok) return {success:false,message:auth.message};
  if(!es16AdminOnly_(auth)) return {success:false,message:"تفعيل/إيقاف الأصناف عند ضياء فقط."};
  const kind = normalizeKey_(e.parameter.kind || e.parameter.type || "template");
  const active = normalize_(e.parameter.active || "نعم");
  const name = normalize_(e.parameter.name || e.parameter.itemName || e.parameter.materialName || "");
  const department = normalize_(e.parameter.department || "");
  const sh = kind.indexOf("material")!==-1 || kind.indexOf("خامة")!==-1 ? ensureAccountingSheets_().materials : ensureAccountingSheets_().templates;
  let row = 0;
  if(sh === ensureAccountingSheets_().materials) row = accountingFindMaterialRow_(sh, name, department); else row = accountingFindTemplateRow_(sh, name, department);
  if(!row) return {success:false,message:"لم أجد الصنف/الخامة للتعديل."};
  updateByHeaders_(sh,row,{"مفعل":active,"آخر تحديث":new Date()},true);
  es16Audit_(auth.user.username,active==="نعم"?"تفعيل":"إيقاف",kind,name,"",active,department);
  return {success:true,message:active==="نعم"?"تم التفعيل.":"تم الإيقاف."};
}
function updateAccountingItemV1859_(e){
  const auth = accountingAuthorize_(e); if(!auth.ok) return {success:false,message:auth.message};
  if(!es16AdminOnly_(auth)) return {success:false,message:"تعديل الأصناف والخامات عند ضياء فقط."};
  const kind = normalizeKey_(e.parameter.kind || e.parameter.type || "template");
  const name = normalize_(e.parameter.name || e.parameter.itemName || e.parameter.materialName || "");
  const oldName = normalize_(e.parameter.oldName || name);
  const department = normalize_(e.parameter.department || "");
  if(!name) return {success:false,message:"اسم الصنف/الخامة مطلوب."};
  let sh, row, updates = {"آخر تحديث":new Date(),"مفعل":normalize_(e.parameter.active || "نعم")};
  if(kind.indexOf("material")!==-1 || kind.indexOf("خامة")!==-1){
    sh = ensureAccountingSheets_().materials; row = accountingFindMaterialRow_(sh, oldName, department) || accountingFindMaterialRow_(sh, name, department);
    updates["اسم الخامة"] = name; updates["القسم"] = department; updates["سعر الوحدة"] = parseMoney_(e.parameter.unitCost || e.parameter.cost); updates["عرض الخام"] = parseMoney_(e.parameter.width); updates["طول الخام"] = parseMoney_(e.parameter.height); updates["نسبة الهالك"] = parseMoney_(e.parameter.wastePercent || e.parameter.waste); updates["سعر بيع مقترح"] = parseMoney_(e.parameter.salePrice);
  } else {
    sh = ensureAccountingSheets_().templates; row = accountingFindTemplateRow_(sh, oldName, department) || accountingFindTemplateRow_(sh, name, department);
    updates["اسم البند"] = name; updates["القسم"] = department; updates["سعر بيع مقترح"] = parseMoney_(e.parameter.salePrice); updates["التكلفة"] = parseMoney_(e.parameter.cost || e.parameter.unitCost); updates["المقاس"] = normalize_(e.parameter.size || ""); updates["ملاحظات"] = normalize_(e.parameter.notes || "");
  }
  if(!row) return {success:false,message:"لم أجد الصف للتحديث."};
  updateByHeaders_(sh,row,updates,true);
  es16Audit_(auth.user.username,"تعديل صنف/خامة",kind,oldName,"",JSON.stringify(updates),"");
  return {success:true,message:"تم تحديث البيانات."};
}
function getCustomerPortalAccountsV1859_(e){
  const auth = customerAuthorize_(e.parameter.customerCode || e.parameter.code, e.parameter.token);
  if(!auth.ok) return {success:false,message:auth.message};
  const customer = auth.customer;
  const customerName = normalize_(customer.name || customer.customerName || "");
  const customerCode = normalize_(customer.customerCode || customer.code || e.parameter.customerCode || "");
  const invoices = [];
  function collectFromSheet(name){
    const sh = ss_().getSheetByName(name); if(!sh || sh.getLastRow()<2) return;
    const rows = accSheetRows_(sh);
    rows.forEach(function(r){
      const c = normalize_(r.customerName || r.customer || r["العميل"] || r["اسم العميل"] || "");
      if(c && searchKey_(c) !== searchKey_(customerName)) return;
      if(!c && customerCode && searchKey_(r.customerCode || r["كود العميل"] || "") !== searchKey_(customerCode)) return;
      const total = parseMoney_(r.finalTotal || r.total || r["الإجمالي النهائي"] || r["الإجمالي"] || r["إجمالي"]);
      const paid = parseMoney_(r.paid || r["المدفوع"]);
      const remaining = parseMoney_(r.remaining || r.remain || r["الباقي"] || r["المتبقي"] || Math.max(0,total-paid));
      invoices.push({id:r.id||r.ID||r["ID"],invoiceNo:r.invoiceNo||r["رقم الفاتورة"],orderId:r.orderId||r["رقم الأوردر"],date:r.createdAt||r["وقت التسجيل"],customer:c||customerName,total:total,paid:paid,remaining:remaining,status:r.status||r["الحالة"]|| (remaining>0?"مدفوعة جزئياً":"مدفوعة"),lines:[]});
    });
  }
  collectFromSheet("حسابات - فواتير المبيعات");
  collectFromSheet("حسابات - الفواتير النهائية");
  const acct = getPartyAccountV1858_({parameter:{username:"ضياء",token:"",partyType:"customer",partyName:customerName,partyCode:customerCode}});
  // If employee-token authorization blocks in some copies, fall back to direct ledger read.
  let transactions = [];
  try { transactions = accountsRowsForPartyV1858_("customer", customerName, customerCode).map(function(r){return {createdAt:r.createdAt||r["وقت التسجيل"],operation:r.operation||r["العملية"],operationLabel:r.operationLabel||r["وصف العملية"],amount:r.amount||r["المبلغ"],balanceAfter:r.balanceAfter||r["الرصيد بعد"],notes:r.notes||r["ملاحظات"]};}); } catch(err) {}
  const balance = accountsCurrentBalanceV1858_("customer", customerName, customerCode);
  const totalInvoices = invoices.reduce(function(s,x){return s+parseMoney_(x.total);},0);
  const totalPaid = invoices.reduce(function(s,x){return s+parseMoney_(x.paid);},0);
  const totalRemaining = invoices.reduce(function(s,x){return s+parseMoney_(x.remaining);},0);
  return {success:true,customer:customer,totalInvoices:totalInvoices,totalPaid:totalPaid,totalRemaining:totalRemaining,balance:balance,invoices:invoices,transactions:transactions,version:"V1859_ES16"};
}
function createInvoiceReviewMessageV1859_(e){
  const auth = accountingAuthorize_(e); if(!auth.ok) return {success:false,message:auth.message};
  if(!es16CanEditAccounts_(auth)) return {success:false,message:"إرسال رابط الفاتورة عند ضياء / رحمه / ريفان فقط."};
  const customerName = normalize_(e.parameter.customerName || e.parameter.customer || "");
  const invoiceNo = normalize_(e.parameter.invoiceNo || e.parameter.no || "");
  const total = parseMoney_(e.parameter.total || e.parameter.finalTotal);
  const paid = parseMoney_(e.parameter.paid);
  const remaining = parseMoney_(e.parameter.remaining || e.parameter.remain || Math.max(0,total-paid));
  let phone = cleanPhone_(e.parameter.phone || e.parameter.customerPhone || "");
  let code = normalize_(e.parameter.customerCode || "");
  try{
    const sh = ss_().getSheetByName(SHEET_NAME_CUSTOMERS);
    if(sh){ const rows=sh.getDataRange().getValues(), h=headersMap_(sh); const colName=firstCol_(h,["اسم الشات / المكتب","اسم العميل"],1), colPhone=firstCol_(h,["رقم العميل الأساسي","رقم العميل","رقم الهاتف"],0), colCode=firstCol_(h,["كود الشات","كود العميل"],0); for(let i=1;i<rows.length;i++){ if(searchKey_(rows[i][colName-1])===searchKey_(customerName)){ if(!phone && colPhone) phone=cleanPhone_(rows[i][colPhone-1]); if(!code && colCode) code=normalize_(rows[i][colCode-1]); break; } } }
  }catch(err){}
  const portal = normalize_(e.parameter.portalUrl || "") || ("https://fawakhry.github.io/TrendOs/?portal=customer&tab=accounts&invoiceReview=1&v=1859" + (code?"&customerCode="+encodeURIComponent(code):""));
  const message = "أهلاً " + (customerName || "عميل مطبعجي") + " 🌟\nتم تقفيل فاتورتك" + (invoiceNo?" رقم " + invoiceNo:"") + ".\nلمراجعة الفاتورة الخاصة بك وحسابك، ادخل على الرابط التالي:\n" + portal + "\n\nهتلاقي الفاتورة بالتفصيل، المدفوع: " + paid + " ج، الباقي: " + remaining + " ج.\nمطبعجي بنها";
  const wa = phone ? ("https://wa.me/" + phone + "?text=" + encodeURIComponent(message)) : "";
  es16Audit_(auth.user.username,"إرسال رابط فاتورة","عميل",invoiceNo,"",customerName,"رابط مراجعة الفاتورة");
  return {success:true,message:"تم تجهيز رسالة مراجعة الفاتورة.",text:message,whatsappUrl:wa,portalUrl:portal,phone:phone};
}
function easyStoreSystemHealth_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success:false, message: auth.message };
  const sh = ensureAccountingSheets_();
  accountsEnsureLedgerSheetV1858_();
  mbEnsureSheet_("حسابات - الخزنة", es16CashboxHeaders_());
  mbEnsureSheet_("حسابات - سجل المراجعة", es16AuditHeaders_());
  mbEnsureSheet_("حسابات - قفلة اليوم", es16DayCloseHeaders_());
  return { success:true, message:"النظام سليم", sheets:Object.keys(sh).concat(["حسابات - كشف العملاء والموردين","حسابات - الخزنة","حسابات - سجل المراجعة","حسابات - قفلة اليوم"]), version:MATBAGY_ACCOUNTING_VERSION, permissions:{ mode:auth.mode, canEnterPurchaseInvoice: accountingCanSavePurchaseV1857_(auth), canSeeCosts: auth.mode === "full", canSeeProfitReports:auth.mode === "full", canEditLedger:accountsCanEditV1858_(auth), canClearMaterials:auth.mode==="full" } };
}


/************************************************************
 * V1861 / ES18 - Error Fix + Zero Reset
 * - Safe edit/activate even if fields are missing.
 * - One Diaa-only reset button: تهيئة لوضع الصفر.
 * - Keeps customers and users, clears accounting/operation restart data.
 ************************************************************/
function v1861SheetRowsCount_(sh){ return sh ? Math.max(0, sh.getLastRow() - 1) : 0; }
function v1861ClearBody_(sh){
  if (!sh) return 0;
  const rows = Math.max(0, sh.getLastRow() - 1);
  const cols = Math.max(1, sh.getLastColumn());
  if (rows > 0) sh.getRange(2, 1, rows, cols).clearContent().clearDataValidations().clearNote();
  return rows;
}
function v1861BackupSheets_(sheetNames, label){
  const ss = ss_();
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  const backup = SpreadsheetApp.create((label || "نسخة قبل تهيئة مطبعجي") + " " + stamp);
  const defaultSheet = backup.getSheets()[0];
  let copied = 0;
  sheetNames.forEach(function(name){
    const src = ss.getSheetByName(name);
    if (!src) return;
    const values = src.getDataRange().getValues();
    const safeName = String(name).replace(/[\\\/\?\*\[\]:]/g, "-").slice(0, 90) || ("Sheet" + copied);
    let dst = copied === 0 ? defaultSheet : backup.insertSheet();
    dst.setName(safeName);
    if (values.length && values[0].length) dst.getRange(1,1,values.length,values[0].length).setValues(values);
    copied++;
  });
  return {url: backup.getUrl(), id: backup.getId(), copied: copied};
}
function v1861ClearCustomerAccountingColumns_(){
  const sh = ss_().getSheetByName(SHEET_NAME_CUSTOMERS);
  if (!sh || sh.getLastRow() < 2) return 0;
  const h = headersMap_(sh);
  const candidates = ["مديونية حالية","المديونية","مديونية","رصيد العميل","الرصيد","المتبقي","الباقي","آخر سداد","تاريخ آخر سداد","ملاحظات مديونية"];
  let changed = 0;
  candidates.forEach(function(name){
    const col = h[normalizeKey_(name)];
    if (col) { sh.getRange(2, col, sh.getLastRow() - 1, 1).clearContent(); changed++; }
  });
  return changed;
}
function resetAccountingToZeroV1861_(e){
  const auth = accountingAuthorize_(e); if(!auth.ok) return {success:false,message:auth.message};
  if(auth.mode !== "full") return {success:false,message:"تهيئة وضع الصفر عند ضياء فقط."};
  const confirm = normalize_(e.parameter.confirm || e.parameter.confirmText || "");
  if(confirm !== "تهيئة لوضع الصفر") return {success:false,message:"اكتب التأكيد كما هو: تهيئة لوضع الصفر"};
  const accountingSheets = [
    SHEET_NAME_ACC_MATERIALS,
    SHEET_NAME_ACC_TEMPLATES,
    SHEET_NAME_ACC_DEPT_LINES,
    SHEET_NAME_ACC_FINAL_INVOICES,
    SHEET_NAME_ACC_WASTE,
    SHEET_NAME_ACC_STOCK_MOVES,
    "حسابات - فواتير الشراء",
    "حسابات - فواتير المبيعات",
    "حسابات - الموردين",
    "حسابات - كشف العملاء والموردين",
    "حسابات - الخزنة",
    "حسابات - قفلة اليوم",
    "حسابات - سجل المراجعة"
  ];
  const backup = v1861BackupSheets_(accountingSheets.concat([SHEET_NAME_CUSTOMERS]), "نسخة قبل تهيئة وضع الصفر");
  const shs = ensureAccountingSheets_();
  const cleared = {};
  accountingSheets.forEach(function(name){
    let sh = ss_().getSheetByName(name);
    if (!sh) {
      if (name === SHEET_NAME_ACC_MATERIALS) sh = shs.materials;
      else if (name === SHEET_NAME_ACC_TEMPLATES) sh = shs.templates;
      else if (name === SHEET_NAME_ACC_DEPT_LINES) sh = shs.deptLines;
      else if (name === SHEET_NAME_ACC_FINAL_INVOICES) sh = shs.finalInvoices;
      else if (name === SHEET_NAME_ACC_WASTE) sh = shs.waste;
      else if (name === SHEET_NAME_ACC_STOCK_MOVES) sh = shs.stockMoves;
      else return;
    }
    cleared[name] = v1861ClearBody_(sh);
  });
  const customerColsCleared = v1861ClearCustomerAccountingColumns_();
  try { PropertiesService.getDocumentProperties().setProperty("MATBAGY_ACCOUNTING_ZERO_RESET", "1"); } catch(err) {}
  es16Audit_(auth.user.username,"تهيئة لوضع الصفر","النظام المحاسبي","ZERO-RESET","",JSON.stringify(cleared),"تم الاحتفاظ بالعملاء والمستخدمين فقط. نسخة احتياطية: " + backup.url);
  SpreadsheetApp.flush();
  return {success:true,message:"تمت تهيئة البرنامج لوضع الصفر مع الاحتفاظ بالعملاء. تم إنشاء نسخة احتياطية.",backupUrl:backup.url,cleared:cleared,customerColumnsCleared:customerColsCleared,version:"V1861_ES18"};
}
function activateAccountingItemV1859_(e){
  const auth = accountingAuthorize_(e); if(!auth.ok) return {success:false,message:auth.message};
  if(auth.mode !== "full") return {success:false,message:"تفعيل/إيقاف الأصناف عند ضياء فقط."};
  const kind = normalizeKey_(e.parameter.kind || e.parameter.type || "template");
  const active = normalize_(e.parameter.active || "نعم") || "نعم";
  const name = normalize_(e.parameter.name || e.parameter.itemName || e.parameter.materialName || "");
  const department = normalize_(e.parameter.department || "");
  const sheets = ensureAccountingSheets_();
  const isMaterial = kind.indexOf("material") !== -1 || kind.indexOf("خامة") !== -1;
  const sh = isMaterial ? sheets.materials : sheets.templates;
  let row = isMaterial ? accountingFindMaterialRow_(sh, name, department) : accountingFindTemplateRow_(sh, name, department);
  if(!row && name) row = isMaterial ? accountingFindMaterialRow_(sh, name, "") : accountingFindTemplateRow_(sh, name, "");
  if(!row) return {success:false,message:"لم أجد الصنف/الخامة: " + name + ". تأكد من الاسم أو افتح التعديل."};
  updateByHeaders_(sh,row,{"مفعل":active,"آخر تحديث":new Date()},true);
  es16Audit_(auth.user.username, active === "نعم" ? "تفعيل" : "إيقاف", isMaterial ? "خامة" : "صنف", name, "", active, department);
  return {success:true,message:active === "نعم" ? "تم التفعيل." : "تم الإيقاف."};
}
function updateAccountingItemV1859_(e){
  const auth = accountingAuthorize_(e); if(!auth.ok) return {success:false,message:auth.message};
  if(auth.mode !== "full") return {success:false,message:"تعديل الأصناف والخامات عند ضياء فقط."};
  const kind = normalizeKey_(e.parameter.kind || e.parameter.type || "template");
  const name = normalize_(e.parameter.name || e.parameter.itemName || e.parameter.materialName || "");
  const oldName = normalize_(e.parameter.oldName || name);
  const department = normalize_(e.parameter.department || "");
  if(!name) return {success:false,message:"اسم الصنف/الخامة مطلوب."};
  const sheets = ensureAccountingSheets_();
  const isMaterial = kind.indexOf("material") !== -1 || kind.indexOf("خامة") !== -1;
  const sh = isMaterial ? sheets.materials : sheets.templates;
  let row = isMaterial ? accountingFindMaterialRow_(sh, oldName, department) : accountingFindTemplateRow_(sh, oldName, department);
  if(!row) row = isMaterial ? accountingFindMaterialRow_(sh, oldName, "") : accountingFindTemplateRow_(sh, oldName, "");
  if(!row) row = isMaterial ? accountingFindMaterialRow_(sh, name, department) : accountingFindTemplateRow_(sh, name, department);
  if(!row) return {success:false,message:"لم أجد الصف للتحديث. بعد التهيئة ابدأ بإضافة صنف/خامة جديدة."};
  let updates = {"آخر تحديث":new Date(),"مفعل":normalize_(e.parameter.active || "نعم") || "نعم"};
  if(isMaterial){
    updates["اسم الخامة"] = name;
    if(department) updates["القسم"] = department;
    if(e.parameter.unitCost !== undefined || e.parameter.cost !== undefined) updates["سعر الوحدة"] = parseMoney_(e.parameter.unitCost || e.parameter.cost);
    if(e.parameter.salePrice !== undefined) updates["سعر بيع رسمي"] = parseMoney_(e.parameter.salePrice);
    if(e.parameter.width !== undefined) updates["عرض الخام"] = parseMoney_(e.parameter.width);
    if(e.parameter.height !== undefined) updates["طول الخام"] = parseMoney_(e.parameter.height);
    if(e.parameter.waste !== undefined || e.parameter.wastePercent !== undefined) updates["نسبة الهالك"] = parseMoney_(e.parameter.wastePercent || e.parameter.waste);
    if(e.parameter.notes !== undefined) updates["ملاحظات"] = normalize_(e.parameter.notes || "");
  } else {
    updates["اسم البند"] = name;
    if(department) updates["القسم"] = department;
    if(e.parameter.salePrice !== undefined) updates["سعر بيع مقترح"] = parseMoney_(e.parameter.salePrice);
    if(e.parameter.cost !== undefined || e.parameter.unitCost !== undefined) updates["تكلفة ثابتة"] = parseMoney_(e.parameter.cost || e.parameter.unitCost);
    if(e.parameter.size !== undefined) updates["المقاس"] = normalize_(e.parameter.size || "");
    if(e.parameter.notes !== undefined) updates["ملاحظات"] = normalize_(e.parameter.notes || "");
  }
  updateByHeaders_(sh,row,updates,true);
  es16Audit_(auth.user.username,"تعديل صنف/خامة",isMaterial?"خامة":"صنف",oldName,"",JSON.stringify(updates),"");
  return {success:true,message:"تم تحديث البيانات."};
}


/************************************************************
 * V1887 - Dept Invoice Approval Flow
 * - بنود القسم تتسجل كمسودة/قيد مراجعة.
 * - وائل/جابر يعتمدوا فاتورة القسم بعد مراجعة كل البنود.
 * - ضياء/رحمه/ريفان يسحبوا البنود المعتمدة فقط للفاتورة النهائية.
 ************************************************************/
function ensureV1887DeptApprovalColumns_(sheet) {
  if (!sheet) return;
  ensureHeaderIfAnyMissing_(sheet, ["حالة اعتماد القسم", "اعتمد القسم بواسطة", "وقت اعتماد القسم", "دفعة اعتماد القسم", "ملاحظات اعتماد القسم", "مسحوب للفاتورة النهائية؟"]);
}
function deptLineClosedForFinalV1887_(row, h) {
  const closeStatus = searchKey_(valueAt_(row, firstCol_(h, ["حالة التقفيل", "closeStatus"], 0)));
  const invoiceNo = normalize_(valueAt_(row, firstCol_(h, ["رقم الفاتورة النهائية", "invoiceNo"], 0)));
  if (invoiceNo) return true;
  return closeStatus.indexOf("تم") !== -1 || closeStatus.indexOf("مقفل") !== -1 || closeStatus.indexOf("مغلق") !== -1 || closeStatus.indexOf("closed") !== -1 || closeStatus.indexOf("billed") !== -1;
}
function rowToObjectV1887_(sheet, rowValues, rowNumber) {
  const h = headersMap_(sheet);
  const obj = { rowNumber: rowNumber };
  Object.keys(h).forEach(function(k){ obj[k] = cleanText_(valueAt_(rowValues, h[k])); });
  obj.id = obj["ID"] || "";
  obj.orderId = obj["رقم الأوردر"] || "";
  obj.lineId = obj["رقم البند"] || "";
  obj.customerName = obj["اسم العميل"] || "";
  obj.department = obj["القسم"] || "";
  obj.itemName = obj["اسم البند"] || "";
  obj.qty = obj["الكمية"] || 1;
  obj.lineTotal = parseMoney_(obj["سعر البيع"] || 0);
  obj.unitSalePrice = parseMoney_(obj["سعر الوحدة"] || 0) || (obj.lineTotal / (parseMoney_(obj.qty) || 1));
  obj.sale = obj.unitSalePrice;
  obj.billingStatus = obj["حالة الفوترة"] || "";
  obj.approvalStatus = obj["حالة اعتماد القسم"] || obj.billingStatus || "قيد مراجعة القسم";
  obj.closeStatus = obj["حالة التقفيل"] || "";
  obj.createdBy = obj["مسجل بواسطة"] || "";
  obj.approvedBy = obj["اعتمد القسم بواسطة"] || "";
  obj.approvedAt = obj["وقت اعتماد القسم"] || "";
  return obj;
}
function getDeptInvoiceDraftV1887_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  const sheets = ensureAccountingSheets_();
  ensureV1887DeptApprovalColumns_(sheets.deptLines);
  const orderId = normalize_(e.parameter.orderId);
  let department = normalize_(e.parameter.department) || auth.department;
  if (auth.mode === "print") department = "طباعة";
  if (auth.mode === "laser") department = "ليزر";
  if (!orderId) return { success: false, message: "رقم الأوردر مطلوب." };
  const sh = sheets.deptLines;
  const h = headersMap_(sh);
  const colOrder = firstCol_(h, ["رقم الأوردر", "orderId"], 0);
  const colDept = firstCol_(h, ["القسم", "department"], 0);
  if (!colOrder || sh.getLastRow() < 2) return { success: true, lines: [], total: 0 };
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  const lines = [];
  let total = 0;
  data.forEach(function(row, i){
    if (normalize_(valueAt_(row, colOrder)) !== orderId) return;
    if (department && normalize_(valueAt_(row, colDept)) !== department) return;
    if (deptLineClosedForFinalV1887_(row, h)) return;
    const obj = rowToObjectV1887_(sh, row, i + 2);
    lines.push(obj);
    total += parseMoney_(obj.lineTotal);
  });
  return { success: true, lines: lines, total: total, orderId: orderId, department: department, version: "V1887_DEPT_APPROVAL_FLOW" };
}
function approveAccountingDeptInvoiceV1887_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!(auth.mode === "full" || auth.mode === "print" || auth.mode === "laser")) return { success: false, message: "اعتماد فاتورة القسم متاح لضياء أو مسؤول القسم فقط." };
  const sheets = ensureAccountingSheets_();
  ensureV1887DeptApprovalColumns_(sheets.deptLines);
  const sh = sheets.deptLines;
  const orderId = normalize_(e.parameter.orderId);
  let department = normalize_(e.parameter.department) || auth.department;
  if (auth.mode === "print") department = "طباعة";
  if (auth.mode === "laser") department = "ليزر";
  if (!orderId || !department) return { success: false, message: "رقم الأوردر والقسم مطلوبين للاعتماد." };
  if (sh.getLastRow() < 2) return { success: false, message: "لا توجد بنود مسجلة." };
  const now = new Date();
  const batchId = "DAPP-" + Utilities.getUuid().slice(0, 8);
  const h = headersMap_(sh);
  const colOrder = firstCol_(h, ["رقم الأوردر", "orderId"], 0);
  const colDept = firstCol_(h, ["القسم", "department"], 0);
  const colStatus = firstCol_(h, ["حالة الفوترة"], 0);
  const colApproval = firstCol_(h, ["حالة اعتماد القسم"], 0);
  const colApprovedBy = firstCol_(h, ["اعتمد القسم بواسطة"], 0);
  const colApprovedAt = firstCol_(h, ["وقت اعتماد القسم"], 0);
  const colBatch = firstCol_(h, ["دفعة اعتماد القسم"], 0);
  const colApprovalNotes = firstCol_(h, ["ملاحظات اعتماد القسم"], 0);
  const colClose = firstCol_(h, ["حالة التقفيل"], 0);
  const colUpdate = firstCol_(h, ["آخر تحديث"], 0);
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  let count = 0;
  let total = 0;
  data.forEach(function(row, i){
    if (normalize_(valueAt_(row, colOrder)) !== orderId) return;
    if (normalize_(valueAt_(row, colDept)) !== department) return;
    if (deptLineClosedForFinalV1887_(row, h)) return;
    const rowNumber = i + 2;
    if (colStatus) sh.getRange(rowNumber, colStatus).setValue("معتمد من القسم");
    if (colApproval) sh.getRange(rowNumber, colApproval).setValue("معتمد من القسم");
    if (colApprovedBy) sh.getRange(rowNumber, colApprovedBy).setValue(auth.user.username);
    if (colApprovedAt) sh.getRange(rowNumber, colApprovedAt).setValue(now);
    if (colBatch) sh.getRange(rowNumber, colBatch).setValue(batchId);
    if (colApprovalNotes) sh.getRange(rowNumber, colApprovalNotes).setValue(normalize_(e.parameter.notes));
    if (colClose) sh.getRange(rowNumber, colClose).setValue("معتمد من القسم");
    if (colUpdate) sh.getRange(rowNumber, colUpdate).setValue(now);
    count++;
    total += parseMoney_(valueAt_(row, firstCol_(h, ["سعر البيع"], 0)));
  });
  if (!count) return { success: false, message: "لا توجد بنود مفتوحة لهذا الأوردر في هذا القسم للاعتماد." };
  appendActivityLog_({ orderId: orderId, department: department, action: "اعتماد فاتورة القسم", newStatus: "معتمد من القسم", by: auth.user.username, details: "عدد البنود: " + count + " | إجمالي القسم: " + total + " | دفعة: " + batchId });
  SpreadsheetApp.flush();
  return { success: true, message: "تم اعتماد فاتورة قسم " + department + " للأوردر " + orderId + " بعدد " + count + " بند. أصبحت جاهزة للسحب في الفاتورة النهائية.", count: count, total: total, batchId: batchId };
}
/************************************************************
 * V1889 STABLE MERGE
 * - الفاتورة النهائية لا تثق في إجماليات المتصفح.
 * - يتم سحب البنود المعتمدة من القسم فقط.
 * - منع سحب نفس بند القسم أكثر من مرة.
 * - إصلاح ضرب الكمية مرتين في مسودة/اعتماد القسم.
 * - تشديد أوامر الصيانة الحساسة.
 ************************************************************/
function v1889IsAdminUser_(user) {
  const role = roleFromArabic_(user.role, user.department);
  const userKey = searchKey_(user.username || user.name || "");
  return role === "admin" || userKey.indexOf("ضياء") !== -1 || userKey.indexOf("diaa") !== -1;
}

function runAdminMaintenance_(e, action, handler) {
  const params = e && e.parameter ? e.parameter : {};
  const auth = authorize_(params.username, params.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!v1889IsAdminUser_(auth.user)) return { success: false, message: "أوامر الصيانة متاحة لضياء فقط." };
  const dangerous = { cleanStart: "CLEAN_START_KEEP_CUSTOMERS" };
  if (dangerous[action] && normalize_(params.confirm) !== dangerous[action]) {
    return { success: false, message: "تأكيد الصيانة غير صحيح. لم يتم حذف أو تغيير أي بيانات." };
  }
  if (typeof handler !== "function") return { success: false, message: "أمر الصيانة غير متاح." };
  return handler(e);
}

function v1889DeptLineId_(row, h) {
  return normalize_(valueAt_(row, firstCol_(h, ["ID", "id"], 1)));
}
function v1889DeptLineQty_(row, h) {
  return parseMoney_(valueAt_(row, firstCol_(h, ["الكمية", "qty"], 0))) || 1;
}
function v1889DeptLineUnitSale_(row, h) {
  const qty = v1889DeptLineQty_(row, h);
  const unit = parseMoney_(valueAt_(row, firstCol_(h, ["سعر الوحدة", "unitSalePrice"], 0)));
  const total = parseMoney_(valueAt_(row, firstCol_(h, ["سعر البيع", "sale", "salePrice"], 0)));
  if (unit) return unit;
  if (total && qty) return total / qty;
  return 0;
}
function v1889DeptLineTotal_(row, h) {
  const qty = v1889DeptLineQty_(row, h);
  const total = parseMoney_(valueAt_(row, firstCol_(h, ["سعر البيع", "sale", "salePrice"], 0)));
  const unit = parseMoney_(valueAt_(row, firstCol_(h, ["سعر الوحدة", "unitSalePrice"], 0)));
  if (unit) return unit * qty;
  return total;
}
function v1889IsDeptApproved_(row, h) {
  const approval = searchKey_(valueAt_(row, firstCol_(h, ["حالة اعتماد القسم", "approvalStatus"], 0)));
  const billing = searchKey_(valueAt_(row, firstCol_(h, ["حالة الفوترة", "billingStatus"], 0)));
  const close = searchKey_(valueAt_(row, firstCol_(h, ["حالة التقفيل", "closeStatus"], 0)));
  const blob = [approval, billing, close].join(" ");
  return blob.indexOf("معتمد") !== -1 || blob.indexOf("approved") !== -1;
}
function deptLineClosedForFinalV1887_(row, h) {
  const closeStatus = searchKey_(valueAt_(row, firstCol_(h, ["حالة التقفيل", "closeStatus"], 0)));
  const invoiceNo = normalize_(valueAt_(row, firstCol_(h, ["رقم الفاتورة النهائية", "invoiceNo"], 0)));
  const pulled = searchKey_(valueAt_(row, firstCol_(h, ["مسحوب للفاتورة النهائية؟"], 0)));
  if (invoiceNo || pulled === "نعم" || pulled === "yes" || pulled === "true") return true;
  return closeStatus.indexOf("تم التقفيل") !== -1 || closeStatus.indexOf("مقفل") !== -1 || closeStatus.indexOf("مغلق") !== -1 || closeStatus.indexOf("closed") !== -1 || closeStatus.indexOf("billed") !== -1;
}
function rowToObjectV1887_(sheet, rowValues, rowNumber) {
  const h = headersMap_(sheet);
  const obj = { rowNumber: rowNumber };
  Object.keys(h).forEach(function(k){ obj[k] = cleanText_(valueAt_(rowValues, h[k])); });
  obj.id = obj["ID"] || "";
  obj.orderId = obj["رقم الأوردر"] || "";
  obj.lineId = obj["رقم البند"] || "";
  obj.customerName = obj["اسم العميل"] || "";
  obj.department = obj["القسم"] || "";
  obj.itemName = obj["اسم البند"] || "";
  obj.qty = v1889DeptLineQty_(rowValues, h);
  obj.lineTotal = v1889DeptLineTotal_(rowValues, h);
  obj.unitSalePrice = v1889DeptLineUnitSale_(rowValues, h);
  obj.sale = obj.unitSalePrice;
  obj.billingStatus = obj["حالة الفوترة"] || "";
  obj.approvalStatus = obj["حالة اعتماد القسم"] || obj.billingStatus || "قيد مراجعة القسم";
  obj.closeStatus = obj["حالة التقفيل"] || "";
  obj.createdBy = obj["مسجل بواسطة"] || "";
  obj.approvedBy = obj["اعتمد القسم بواسطة"] || "";
  obj.approvedAt = obj["وقت اعتماد القسم"] || "";
  return obj;
}

function getDeptInvoiceDraftV1887_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  const sheets = ensureAccountingSheets_();
  ensureV1887DeptApprovalColumns_(sheets.deptLines);
  const orderId = normalize_(e.parameter.orderId);
  let department = normalize_(e.parameter.department) || auth.department;
  if (auth.mode === "print") department = "طباعة";
  if (auth.mode === "laser") department = "ليزر";
  if (!orderId) return { success: false, message: "رقم الأوردر مطلوب." };
  const sh = sheets.deptLines;
  const h = headersMap_(sh);
  const colOrder = firstCol_(h, ["رقم الأوردر", "orderId"], 0);
  const colDept = firstCol_(h, ["القسم", "department"], 0);
  if (!colOrder || sh.getLastRow() < 2) return { success: true, lines: [], total: 0 };
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  const lines = [];
  let total = 0;
  data.forEach(function(row, i){
    if (normalize_(valueAt_(row, colOrder)) !== orderId) return;
    if (department && normalize_(valueAt_(row, colDept)) !== department) return;
    if (deptLineClosedForFinalV1887_(row, h)) return;
    const obj = rowToObjectV1887_(sh, row, i + 2);
    lines.push(obj);
    total += obj.lineTotal;
  });
  return { success: true, lines: lines, total: total, orderId: orderId, department: department, version: "V1889_STABLE_MERGE" };
}

function approveAccountingDeptInvoiceV1887_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!(auth.mode === "full" || auth.mode === "print" || auth.mode === "laser")) return { success: false, message: "اعتماد فاتورة القسم متاح لضياء أو مسؤول القسم فقط." };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheets = ensureAccountingSheets_();
    ensureV1887DeptApprovalColumns_(sheets.deptLines);
    const sh = sheets.deptLines;
    const orderId = normalize_(e.parameter.orderId);
    let department = normalize_(e.parameter.department) || auth.department;
    if (auth.mode === "print") department = "طباعة";
    if (auth.mode === "laser") department = "ليزر";
    if (!orderId || !department) return { success: false, message: "رقم الأوردر والقسم مطلوبين للاعتماد." };
    if (sh.getLastRow() < 2) return { success: false, message: "لا توجد بنود مسجلة." };
    const now = new Date();
    const batchId = "DAPP-" + Utilities.getUuid().slice(0, 8);
    const h = headersMap_(sh);
    const colOrder = firstCol_(h, ["رقم الأوردر", "orderId"], 0);
    const colDept = firstCol_(h, ["القسم", "department"], 0);
    const colStatus = firstCol_(h, ["حالة الفوترة"], 0);
    const colApproval = firstCol_(h, ["حالة اعتماد القسم"], 0);
    const colApprovedBy = firstCol_(h, ["اعتمد القسم بواسطة"], 0);
    const colApprovedAt = firstCol_(h, ["وقت اعتماد القسم"], 0);
    const colBatch = firstCol_(h, ["دفعة اعتماد القسم"], 0);
    const colApprovalNotes = firstCol_(h, ["ملاحظات اعتماد القسم"], 0);
    const colClose = firstCol_(h, ["حالة التقفيل"], 0);
    const colUpdate = firstCol_(h, ["آخر تحديث"], 0);
    const colStockDeducted = firstCol_(h, ["مخزون مخصوم؟"], 0);
    const colStockDeductedAt = firstCol_(h, ["وقت خصم المخزون"], 0);
    const data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
    const candidateIndexes = [];
    data.forEach(function(row, i){
      if (normalize_(valueAt_(row, colOrder)) !== orderId) return;
      if (normalize_(valueAt_(row, colDept)) !== department) return;
      if (deptLineClosedForFinalV1887_(row, h) || v1889IsDeptApproved_(row, h)) return;
      candidateIndexes.push(i);
    });
    if (!candidateIndexes.length) return { success: false, message: "لا توجد بنود جديدة غير معتمدة لهذا الأوردر في هذا القسم." };
    const materialCache = accountingMaterialCache_(sheets.materials);
    const requirements = {};
    for (let ci = 0; ci < candidateIndexes.length; ci++) {
      const collected = accountingCollectDeptStockV1913_(materialCache, data[candidateIndexes[ci]], h, requirements);
      if (!collected.ok) return { success: false, message: collected.message };
    }
    const stockResult = accountingApplyStockRequirementsV1913_(sheets, materialCache, requirements, { now: now, orderId: orderId, department: department, batchId: batchId, username: auth.user.username });
    if (!stockResult.ok) return { success: false, message: stockResult.message };
    let count = 0;
    let total = 0;
    candidateIndexes.forEach(function(i){
      const row = data[i];
      const rowNumber = i + 2;
      if (colStatus) sh.getRange(rowNumber, colStatus).setValue("معتمد من القسم");
      if (colApproval) sh.getRange(rowNumber, colApproval).setValue("معتمد من القسم");
      if (colApprovedBy) sh.getRange(rowNumber, colApprovedBy).setValue(auth.user.username);
      if (colApprovedAt) sh.getRange(rowNumber, colApprovedAt).setValue(now);
      if (colBatch) sh.getRange(rowNumber, colBatch).setValue(batchId);
      if (colApprovalNotes) sh.getRange(rowNumber, colApprovalNotes).setValue(normalize_(e.parameter.notes));
      if (colClose) sh.getRange(rowNumber, colClose).setValue("معتمد من القسم");
      if (colUpdate) sh.getRange(rowNumber, colUpdate).setValue(now);
      if (colStockDeducted) sh.getRange(rowNumber, colStockDeducted).setValue("نعم");
      if (colStockDeductedAt) sh.getRange(rowNumber, colStockDeductedAt).setValue(now);
      count++;
      total += v1889DeptLineTotal_(row, h);
    });
    if (!count) return { success: false, message: "لا توجد بنود مفتوحة لهذا الأوردر في هذا القسم للاعتماد." };
    appendActivityLog_({ orderId: orderId, department: department, action: "اعتماد فاتورة القسم", newStatus: "معتمد من القسم", by: auth.user.username, details: "عدد البنود: " + count + " | إجمالي القسم: " + total + " | دفعة: " + batchId });
    SpreadsheetApp.flush();
    return { success: true, message: "تم اعتماد فاتورة قسم " + department + " للأوردر " + orderId + " وخصم المخزون مرة واحدة بعدد " + count + " بند. أصبحت جاهزة للسحب في الفاتورة النهائية.", count: count, total: total, batchId: batchId, stockDeducted: true, version: MATBAGY_ACCOUNTING_VERSION };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function saveAccountingFinalInvoice_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!(auth.mode === "full" || auth.mode === "final")) return { success: false, message: "تقفيل الفاتورة عند رحمه أو ريفان أو ضياء فقط." };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const orderId = normalize_(e.parameter.orderId);
    let customerName = normalize_(e.parameter.customerName || e.parameter.customer);
    if (!orderId) return { success: false, message: "رقم الأوردر مطلوب لتقفيل الفاتورة." };
    const sheets = ensureAccountingSheets_();
    const requestKey = normalize_(e.parameter.requestId || e.parameter.idempotencyKey || e.parameter.clientRequestId);
    if (requestKey && sheets.finalInvoices.getLastRow() > 1) {
      const invoiceHeaders = headersMap_(sheets.finalInvoices);
      const requestCol = firstCol_(invoiceHeaders, ["مفتاح العملية"], 0);
      const invoiceCol = firstCol_(invoiceHeaders, ["رقم الفاتورة"], 0);
      const totalCol = firstCol_(invoiceHeaders, ["الإجمالي النهائي"], 0);
      const remainingCol = firstCol_(invoiceHeaders, ["الباقي"], 0);
      if (requestCol) {
        const oldRows = sheets.finalInvoices.getRange(2, 1, sheets.finalInvoices.getLastRow() - 1, sheets.finalInvoices.getLastColumn()).getValues();
        for (let ri = 0; ri < oldRows.length; ri++) {
          if (normalize_(valueAt_(oldRows[ri], requestCol)) === requestKey) {
            return { success: true, duplicatePrevented: true, trustedByServer: true, invoiceNo: normalize_(valueAt_(oldRows[ri], invoiceCol)), finalTotal: parseMoney_(valueAt_(oldRows[ri], totalCol)), remaining: parseMoney_(valueAt_(oldRows[ri], remainingCol)), message: "تم منع تكرار التقفيل؛ الفاتورة محفوظة بالفعل.", version: MATBAGY_ACCOUNTING_VERSION };
          }
        }
      }
    }
    ensureV1887DeptApprovalColumns_(sheets.deptLines);
    const sh = sheets.deptLines;
    const h = headersMap_(sh);
    const colId = firstCol_(h, ["ID", "id"], 1);
    const colOrder = firstCol_(h, ["رقم الأوردر", "orderId"], 0);
    const colCustomer = firstCol_(h, ["اسم العميل", "customerName"], 0);
    const colStatus = firstCol_(h, ["حالة الفوترة"], 0);
    const colClose = firstCol_(h, ["حالة التقفيل"], 0);
    const colInvoice = firstCol_(h, ["رقم الفاتورة النهائية", "invoiceNo"], 0);
    const colUpdate = firstCol_(h, ["آخر تحديث"], 0);
    const colPulled = ensureHeader_(sh, "مسحوب للفاتورة النهائية؟");
    let wanted = {};
    let wantedProvided = false;
    try {
      const ids = JSON.parse(normalize_(e.parameter.lineIds) || "[]");
      if (Array.isArray(ids) && ids.length) {
        wantedProvided = true;
        ids.forEach(function(id){ if (normalize_(id)) wanted[normalize_(id)] = true; });
      }
    } catch (err) {}

    const rowsToClose = [];
    let subtotalLines = 0;
    if (sh.getLastRow() > 1 && colOrder) {
      const data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
      data.forEach(function(row, i){
        if (normalize_(valueAt_(row, colOrder)) !== orderId) return;
        const id = v1889DeptLineId_(row, h);
        if (wantedProvided && !wanted[id]) return;
        if (deptLineClosedForFinalV1887_(row, h)) return;
        if (!v1889IsDeptApproved_(row, h)) return;
        const lineTotal = v1889DeptLineTotal_(row, h);
        if (!lineTotal) return;
        rowsToClose.push({ rowNumber: i + 2, id: id, total: lineTotal, row: row });
        subtotalLines += lineTotal;
        if (!customerName && colCustomer) customerName = normalize_(valueAt_(row, colCustomer));
      });
    }
    const manualDescription = normalize_(e.parameter.manualDescription);
    const manualAmount = parseMoney_(e.parameter.manualAmount);
    if (!rowsToClose.length && !manualAmount) return { success: false, message: "لا توجد بنود معتمدة وغير مسحوبة لهذا الأوردر. اعتمد فاتورة القسم أولًا أو اضف بند يدوي." };
    if (!customerName) customerName = "عميل مطبعجي";
    const now = new Date();
    const invoiceNo = makeAccountingInvoiceNo_(sheets.finalInvoices, now);
    const subtotal = subtotalLines + manualAmount;
    const discount = parseMoney_(e.parameter.discount);
    const finalTotal = Math.max(0, subtotal - discount);
    const paid = parseMoney_(e.parameter.paid);
    const remaining = Math.max(0, finalTotal - paid);
    const lineIds = rowsToClose.map(function(x){ return x.id; }).filter(Boolean);
    appendByHeaders_(sheets.finalInvoices, {
      "رقم الفاتورة": invoiceNo,
      "وقت التقفيل": now,
      "رقم الأوردر": orderId,
      "اسم العميل": customerName,
      "بنود الأقسام": lineIds.join(", "),
      "بند يدوي": manualDescription,
      "قيمة بند يدوي": manualAmount,
      "الإجمالي قبل الخصم": subtotal,
      "الخصم": discount,
      "الإجمالي النهائي": finalTotal,
      "المدفوع": paid,
      "الباقي": remaining,
      "الحالة": remaining > 0 ? "عليها باقي" : "مدفوعة",
      "مفتاح العملية": requestKey,
      "قفل بواسطة": auth.user.username,
      "ملاحظات": normalize_(e.parameter.notes),
      "آخر تحديث": now
    });
    try {
      appendByHeaders_(mbEnsureSheet_("حسابات - فواتير المبيعات", easyStoreSalesHeadersV1909_()), {
        "ID": "SAL-FINAL-" + Utilities.getUuid().slice(0, 8),
        "وقت التسجيل": now,
        "رقم الفاتورة": invoiceNo,
        "رقم الأوردر": orderId,
        "العميل": customerName,
        "نوع الدفع": normalize_(e.parameter.paymentType || ""),
        "البند": manualDescription || "فاتورة موحدة من بنود الأقسام",
        "الكمية": rowsToClose.length || 1,
        "سعر الوحدة": finalTotal,
        "خصم": discount,
        "الإجمالي": finalTotal,
        "المدفوع": paid,
        "المتبقي": remaining,
        "بنود الأقسام": lineIds.join(", "),
        "مسجل بواسطة": auth.user.username,
        "ملاحظات": normalize_(e.parameter.notes)
      });
    } catch (salesMirrorErr) {}
    rowsToClose.forEach(function(x){
      if (colStatus) sh.getRange(x.rowNumber, colStatus).setValue("تم السحب للفاتورة النهائية");
      if (colClose) sh.getRange(x.rowNumber, colClose).setValue("تم التقفيل");
      if (colInvoice) sh.getRange(x.rowNumber, colInvoice).setValue(invoiceNo);
      if (colUpdate) sh.getRange(x.rowNumber, colUpdate).setValue(now);
      if (colPulled) sh.getRange(x.rowNumber, colPulled).setValue("نعم");
    });
    let ledgerWarning = "";
    try {
      if (customerName && finalTotal > 0) {
        savePartyLedgerTransactionV1858_({ parameter: { username: e.parameter.username, token: e.parameter.token, partyType: "customer", partyName: customerName, operation: "invoice", amount: finalTotal, paymentMethod: normalize_(e.parameter.paymentType || ""), refNo: invoiceNo, notes: "فاتورة نهائية رقم " + invoiceNo + " للأوردر " + orderId } });
      }
      if (customerName && paid > 0) {
        savePartyLedgerTransactionV1858_({ parameter: { username: e.parameter.username, token: e.parameter.token, partyType: "customer", partyName: customerName, operation: "payment_received", amount: paid, paymentMethod: normalize_(e.parameter.paymentType || "مدفوع من الفاتورة"), refNo: invoiceNo, notes: "مدفوع من الفاتورة النهائية رقم " + invoiceNo } });
      }
    } catch (ledgerErr) {
      ledgerWarning = "تم تقفيل الفاتورة، لكن لم يتم تحديث كشف حساب العميل تلقائيًا: " + (ledgerErr && ledgerErr.message ? ledgerErr.message : ledgerErr);
    }
    appendActivityLog_({ orderId: orderId, customer: customerName, action: "تقفيل فاتورة نهائية", newStatus: "تم التقفيل", by: auth.user.username, details: "فاتورة: " + invoiceNo + " | بنود معتمدة: " + rowsToClose.length + " | إجمالي: " + finalTotal });
    SpreadsheetApp.flush();
    return { success: true, message: "تم تقفيل الفاتورة النهائية رقم " + invoiceNo + " من البنود المعتمدة فقط." + (ledgerWarning ? " " + ledgerWarning : ""), invoiceNo: invoiceNo, lineCount: rowsToClose.length, subtotal: subtotal, finalTotal: finalTotal, paid: paid, remaining: remaining, ledgerWarning: ledgerWarning, trustedByServer: true, version: MATBAGY_ACCOUNTING_VERSION };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function reopenAccountingFinalInvoice_(e) {
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (auth.mode !== "full") return { success: false, message: "إرجاع الفاتورة للمراجعة متاح لضياء فقط." };
  const invoiceNo = normalize_(e.parameter.invoiceNo || e.parameter.no);
  if (!invoiceNo) return { success: false, message: "رقم الفاتورة مطلوب لإرجاعها للمراجعة." };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheets = ensureAccountingSheets_();
    const invSh = sheets.finalInvoices;
    const invH = headersMap_(invSh);
    const invColNo = firstCol_(invH, ["رقم الفاتورة", "invoiceNo", "no"], 0);
    if (!invColNo || invSh.getLastRow() < 2) return { success: false, message: "لا توجد فواتير نهائية محفوظة." };
    const data = invSh.getRange(2, 1, invSh.getLastRow() - 1, invSh.getLastColumn()).getValues();
    let found = null;
    data.forEach(function(row, i){
      if (!found && normalize_(valueAt_(row, invColNo)) === invoiceNo) found = { rowNumber: i + 2, row: row };
    });
    if (!found) return { success: false, message: "لم يتم العثور على الفاتورة " + invoiceNo };

    const colOrder = firstCol_(invH, ["رقم الأوردر", "orderId"], 0);
    const colCustomer = firstCol_(invH, ["اسم العميل", "customerName", "العميل"], 0);
    const colTotal = firstCol_(invH, ["الإجمالي النهائي", "finalTotal", "الإجمالي"], 0);
    const colPaid = firstCol_(invH, ["المدفوع", "paid"], 0);
    const colStatus = firstCol_(invH, ["الحالة", "status"], 0);
    const colNotes = firstCol_(invH, ["ملاحظات", "notes"], 0);
    const colUpdate = firstCol_(invH, ["آخر تحديث"], 0);
    const orderId = normalize_(e.parameter.orderId || valueAt_(found.row, colOrder));
    const customerName = normalize_(valueAt_(found.row, colCustomer));
    const finalTotal = parseMoney_(valueAt_(found.row, colTotal));
    const paid = parseMoney_(valueAt_(found.row, colPaid));
    const now = new Date();

    if (colStatus) invSh.getRange(found.rowNumber, colStatus).setValue("تحت مراجعة ضياء");
    if (colUpdate) invSh.getRange(found.rowNumber, colUpdate).setValue(now);
    if (colNotes) {
      const oldNotes = normalize_(valueAt_(found.row, colNotes));
      invSh.getRange(found.rowNumber, colNotes).setValue((oldNotes ? oldNotes + " | " : "") + "تم إرجاع الفاتورة للمراجعة بواسطة " + auth.user.username + " - " + normalize_(e.parameter.reason || "مراجعة"));
    }

    const lineSh = sheets.deptLines;
    ensureV1887DeptApprovalColumns_(lineSh);
    const h = headersMap_(lineSh);
    const lineColOrder = firstCol_(h, ["رقم الأوردر", "orderId"], 0);
    const lineColStatus = firstCol_(h, ["حالة الفوترة"], 0);
    const lineColClose = firstCol_(h, ["حالة التقفيل"], 0);
    const lineColInvoice = firstCol_(h, ["رقم الفاتورة النهائية", "invoiceNo"], 0);
    const lineColUpdate = firstCol_(h, ["آخر تحديث"], 0);
    const lineColPulled = ensureHeader_(lineSh, "مسحوب للفاتورة النهائية؟");
    let reopened = 0;
    if (lineSh.getLastRow() > 1 && lineColInvoice) {
      const lines = lineSh.getRange(2, 1, lineSh.getLastRow() - 1, lineSh.getLastColumn()).getValues();
      lines.forEach(function(row, i){
        const sameInvoice = normalize_(valueAt_(row, lineColInvoice)) === invoiceNo;
        const sameOrder = orderId && lineColOrder && normalize_(valueAt_(row, lineColOrder)) === orderId && sameInvoice;
        if (!sameInvoice && !sameOrder) return;
        const rn = i + 2;
        if (lineColStatus) lineSh.getRange(rn, lineColStatus).setValue("معتمد من القسم");
        if (lineColClose) lineSh.getRange(rn, lineColClose).setValue("معتمد من القسم");
        if (lineColInvoice) lineSh.getRange(rn, lineColInvoice).setValue("");
        if (lineColUpdate) lineSh.getRange(rn, lineColUpdate).setValue(now);
        if (lineColPulled) lineSh.getRange(rn, lineColPulled).setValue("لا");
        reopened++;
      });
    }

    let ledgerWarning = "";
    try {
      if (customerName && finalTotal > 0) {
        savePartyLedgerTransactionV1858_({ parameter: { username: e.parameter.username, token: e.parameter.token, partyType: "customer", partyName: customerName, operation: "adjustment_decrease", amount: finalTotal, paymentMethod: "عكس فاتورة للمراجعة", refNo: invoiceNo, notes: "عكس قيمة الفاتورة القديمة قبل إعادة المراجعة" } });
      }
      if (customerName && paid > 0) {
        savePartyLedgerTransactionV1858_({ parameter: { username: e.parameter.username, token: e.parameter.token, partyType: "customer", partyName: customerName, operation: "adjustment_increase", amount: paid, paymentMethod: "عكس مدفوع للمراجعة", refNo: invoiceNo, notes: "عكس قيد المدفوع القديم قبل إعادة التقفيل" } });
      }
    } catch (ledgerErr) {
      ledgerWarning = " تنبيه: لم يتم عمل العكس المالي تلقائيًا: " + (ledgerErr && ledgerErr.message ? ledgerErr.message : ledgerErr);
    }
    appendActivityLog_({ orderId: orderId, customer: customerName, action: "إرجاع فاتورة للمراجعة", oldStatus: "تم التقفيل", newStatus: "تحت مراجعة ضياء", by: auth.user.username, details: "فاتورة: " + invoiceNo + " | بنود مفتوحة: " + reopened });
    SpreadsheetApp.flush();
    return { success: true, message: "تم إرجاع الفاتورة " + invoiceNo + " للمراجعة وفتح " + reopened + " بند للتقفيل من جديد." + ledgerWarning, invoiceNo: invoiceNo, reopened: reopened, version: MATBAGY_ACCOUNTING_VERSION };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

/**
 * V1914 - Backfill final invoices created before the customer ledger was unified.
 * Only invoices with no ledger rows for the same customer/reference are added.
 * This makes the operation safe to run repeatedly without duplicating debt.
 */
function reconcileLegacyCustomerDebtsV1914_(e) {
  if (normalize_(e.parameter.confirm) !== "RECONCILE_LEGACY_DEBTS") {
    return { success: false, message: "تأكيد ترحيل المديونيات غير صحيح. لم يتم تغيير أي بيانات." };
  }
  const auth = accountingAuthorize_(e);
  if (!auth.ok) return { success: false, message: auth.message };
  if (auth.mode !== "full") return { success: false, message: "ترحيل المديونيات القديمة متاح لضياء فقط." };

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const finalSheet = ensureAccountingSheets_().finalInvoices;
    if (!finalSheet || finalSheet.getLastRow() < 2) {
      return { success: true, message: "لا توجد فواتير نهائية قديمة للترحيل.", addedInvoices: 0, skipped: 0, version: MATBAGY_ACCOUNTING_VERSION };
    }

    const finalHeaders = headersMap_(finalSheet);
    const colInvoice = firstCol_(finalHeaders, ["رقم الفاتورة", "invoiceNo", "no"], 0);
    const colOrder = firstCol_(finalHeaders, ["رقم الأوردر", "orderId"], 0);
    const colCustomer = firstCol_(finalHeaders, ["اسم العميل", "العميل", "customerName", "customer"], 0);
    const colTotal = firstCol_(finalHeaders, ["الإجمالي النهائي", "الإجمالي", "finalTotal", "total"], 0);
    const colPaid = firstCol_(finalHeaders, ["المدفوع", "paid"], 0);
    const colRemaining = firstCol_(finalHeaders, ["الباقي", "المتبقي", "remaining", "remain"], 0);
    const colStatus = firstCol_(finalHeaders, ["الحالة", "status"], 0);
    if (!colInvoice || !colCustomer) return { success: false, message: "أعمدة رقم الفاتورة واسم العميل غير موجودة في شيت الفواتير النهائية." };

    const ledgerSheet = accountsEnsureLedgerSheetV1858_();
    const ledgerRows = accSheetRows_(ledgerSheet);
    const existingRefs = {};
    ledgerRows.forEach(function(row) {
      const partyType = normalizeKey_(row.partyType || row["نوع الطرف"] || "customer");
      const partyName = normalize_(row.partyName || row["اسم الطرف"] || "");
      const refNo = normalize_(row.refNo || row["رقم المرجع"] || "");
      if (!partyName || !refNo || (partyType !== "customer" && partyType.indexOf("عميل") === -1)) return;
      existingRefs[searchKey_(partyName) + "|" + normalizeKey_(refNo)] = true;
    });

    const finalRows = finalSheet.getRange(2, 1, finalSheet.getLastRow() - 1, finalSheet.getLastColumn()).getValues();
    const maxRows = Math.min(Math.max(parseInt(e.parameter.limit || "500", 10) || 500, 1), 1000);
    const touchedCustomers = {};
    let addedInvoices = 0;
    let skipped = 0;
    let invalid = 0;
    let processed = 0;

    for (let i = 0; i < finalRows.length && processed < maxRows; i++) {
      const row = finalRows[i];
      const invoiceNo = normalize_(valueAt_(row, colInvoice));
      const orderId = colOrder ? normalize_(valueAt_(row, colOrder)) : "";
      const customerName = normalize_(valueAt_(row, colCustomer));
      const status = colStatus ? searchKey_(valueAt_(row, colStatus)) : "";
      const paid = colPaid ? parseMoney_(valueAt_(row, colPaid)) : 0;
      const remainingCell = colRemaining ? valueAt_(row, colRemaining) : "";
      let remaining = parseMoney_(remainingCell);
      let total = colTotal ? parseMoney_(valueAt_(row, colTotal)) : 0;
      if (!total && (paid || remaining)) total = paid + remaining;
      if ((remainingCell === "" || remainingCell === null || remainingCell === undefined) && total) remaining = Math.max(0, total - paid);
      if (!invoiceNo || !customerName || total <= 0) { invalid++; continue; }
      if (/مراجعه|مراجعة|ملغي|الغاء|إلغاء|cancel|reopen/.test(status)) { skipped++; continue; }
      processed++;
      if (remaining <= 0) { skipped++; continue; }

      const refKey = searchKey_(customerName) + "|" + normalizeKey_(invoiceNo);
      if (existingRefs[refKey]) {
        skipped++;
        touchedCustomers[searchKey_(customerName)] = customerName;
        continue;
      }

      const invoiceResult = savePartyLedgerTransactionV1858_({ parameter: {
        username: e.parameter.username,
        token: e.parameter.token,
        partyType: "customer",
        partyName: customerName,
        operation: "opening_debt",
        amount: remaining,
        refNo: invoiceNo,
        notes: "ترحيل باقي فاتورة نهائية قديمة رقم " + invoiceNo + (orderId ? " للأوردر " + orderId : "")
      } });
      if (!invoiceResult || invoiceResult.success === false) throw new Error((invoiceResult && invoiceResult.message) || "تعذر ترحيل الفاتورة " + invoiceNo);
      existingRefs[refKey] = true;
      addedInvoices++;
      touchedCustomers[searchKey_(customerName)] = customerName;
    }

    Object.keys(touchedCustomers).forEach(function(customerKey) {
      const name = touchedCustomers[customerKey];
      accountsUpdateMasterBalanceV1858_("customer", name, accountsCurrentBalanceV1858_("customer", name, ""), auth);
    });
    appendActivityLog_({ action: "ترحيل مديونيات الفواتير القديمة", by: auth.user.username, details: "فواتير: " + addedInvoices + " | متخطى: " + skipped + " | غير صالح: " + invalid });
    SpreadsheetApp.flush();
    return {
      success: true,
      message: "تم ترحيل باقي " + addedInvoices + " فاتورة قديمة إلى حسابات العملاء، مع منع أي تكرار.",
      addedInvoices: addedInvoices,
      skipped: skipped,
      invalid: invalid,
      processed: processed,
      version: MATBAGY_ACCOUNTING_VERSION
    };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}


/************************************************************
 * V1890 - AI_Orders_View
 * مصدر قراءة مبسط وآمن لمساعد واتس AI.
 * الهدف: إلغاء أخطاء Row Index في تاب الأوردرات الكبير.
 * التاب الناتج: AI_Orders_View
 ************************************************************/

function aiOrdersViewHeaders_() {
  return [
    "order_id",
    "customer_name",
    "customer_phone",
    "status",
    "department",
    "item_name",
    "expected_delivery",
    "last_update",
    "is_open",
    "sheet_row",
    "ai_reply",
    "notes"
  ];
}

function ensureAIOrdersViewSheet_() {
  const ss = ss_();
  let sheet = ss.getSheetByName(SHEET_NAME_AI_ORDERS_VIEW);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME_AI_ORDERS_VIEW);

  const headers = aiOrdersViewHeaders_();
  sheet.clearContents();
  sheet.clearFormats();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  try {
    sheet.setFrozenRows(1);
    sheet.setRightToLeft(false);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#e8f0fe")
      .setHorizontalAlignment("center");
  } catch (err) {}

  return sheet;
}

function aiOrderIsOpen_(status) {
  const s = normalize_(status);
  return !(s === "تم التسليم" ||
           s === "مكرر" ||
           s === "ملغى" ||
           s === "ملغي" ||
           s === "ملغي/مغلق" ||
           s === "مدمج" ||
           s === "مغلق");
}

function aiOrderReply_(orderId, customerName, status, department, itemName, expectedDelivery) {
  return "أهلاً بحضرتك 🌟\n" +
    "بناءً على البيانات المسجلة عندي، الأوردر رقم " + (orderId || "") +
    " باسم " + (customerName || "العميل") +
    " حالته حالياً: " + (status || "غير محددة") + ".\n" +
    "القسم: " + (department || "غير محدد") + "\n" +
    "نوع الشغل: " + (itemName || "غير محدد") + "\n" +
    "التسليم المتوقع: " + (expectedDelivery || "غير محدد") + "\n\n" +
    "Trend Mall 💙";
}

function rebuildAIOrdersView() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const ss = ss_();
    const orders = ss.getSheetByName(SHEET_NAME_ORDERS);
    if (!orders) throw new Error("تاب الأوردرات غير موجود.");

    const view = ensureAIOrdersViewSheet_();
    const headers = aiOrdersViewHeaders_();

    if (orders.getLastRow() < 2) {
      SpreadsheetApp.flush();
      return {
        success: true,
        message: "تم إنشاء AI_Orders_View بدون بيانات؛ تاب الأوردرات فارغ.",
        sheetName: SHEET_NAME_AI_ORDERS_VIEW,
        rows: 0,
        version: "V1891"
      };
    }

    const display = orders.getDataRange().getDisplayValues();
    const sourceHeaders = display[0];
    const h = {};
    sourceHeaders.forEach(function(header, idx) {
      const key = normalizeKey_(header);
      if (key && !h[key]) h[key] = idx + 1;
    });

    function col(names, fallback) {
      return firstCol_(h, names, fallback || 0);
    }

    const cOrder = col(["رقم الأوردر", "order_id", "Order ID"], 1);
    const cName = col(["اسم الشات / المكتب", "اسم العميل", "customerName", "Customer Name"], 4);
    const cPhone = col(["رقم العميل", "رقم العميل الأساسي", "رقم الهاتف", "customerPhone", "Phone"], 6);
    const cStatus = col(["الحالة العامة", "الحالة", "status", "Status"], 12);
    const cDept = col(["القسم الرئيسي", "القسم", "department", "Department"], 9);
    const cItem = col(["وصف مختصر", "وصف الأوردر", "اسم البند / نوع الشغل", "itemName", "Item Name"], 10);
    const cDelivery = col(["تاريخ التسليم المتوقع", "expected_delivery", "Expected Delivery"], 31);
    const cExpectedText = col(["الوقت المتوقع"], 32);
    const cUpdate = col(["آخر تحديث", "updatedAt", "Updated At"], 13);
    const cNotes = col(["ملاحظات", "ملاحظات العميل", "notes", "Notes"], 19);
    const cHeat = col(["مكبس حراري", "مكبس", "Heat Press"], 37);

    const out = [];
    const seen = {};

    for (let i = 1; i < display.length; i++) {
      const row = display[i];
      const orderId = normalize_(valueAt_(row, cOrder));
      if (!orderId) continue;

      // احتياطي: لو حصل تكرار لنفس رقم الأوردر في الشيت، نحتفظ بآخر صف فقط.
      const customerName = normalize_(valueAt_(row, cName));
      const customerPhone = cleanPhone_(valueAt_(row, cPhone));
      const status = normalize_(valueAt_(row, cStatus)) || "طلب جديد";
      const department = normalize_(valueAt_(row, cDept));
      const itemName = normalize_(valueAt_(row, cItem));
      const expectedDelivery = normalize_(valueAt_(row, cDelivery)) || normalize_(valueAt_(row, cExpectedText));
      const lastUpdate = normalize_(valueAt_(row, cUpdate));
      const sheetRow = i + 1;
      const isOpen = aiOrderIsOpen_(status) ? "نعم" : "لا";
      const heat = normalize_(valueAt_(row, cHeat));
      const baseNotes = normalize_(valueAt_(row, cNotes));
      const notes = [baseNotes, heat === "نعم" ? "مكبس حراري" : ""].filter(String).join(" | ");
      const aiReply = aiOrderReply_(orderId, customerName, status, department, itemName, expectedDelivery);

      const record = [
        orderId,
        customerName,
        customerPhone,
        status,
        department,
        itemName,
        expectedDelivery,
        lastUpdate,
        isOpen,
        sheetRow,
        aiReply,
        notes
      ];

      seen[orderId] = record;
    }

    Object.keys(seen).sort(function(a, b) {
      return Number(a) - Number(b);
    }).forEach(function(orderId) {
      out.push(seen[orderId]);
    });

    if (out.length) {
      view.getRange(2, 1, out.length, headers.length).setValues(out);
      view.getRange(2, 3, out.length, 1).setNumberFormat("@");
      view.getRange(2, 1, out.length, 1).setNumberFormat("@");
    }

    try {
      view.autoResizeColumns(1, headers.length);
      view.getRange(1, 1, Math.max(1, out.length + 1), headers.length).createFilter();
    } catch (err2) {}

    SpreadsheetApp.flush();

    return {
      success: true,
      message: "تم إنشاء / تحديث AI_Orders_View بنجاح. قل للمساعد: Refresh.",
      sheetName: SHEET_NAME_AI_ORDERS_VIEW,
      rows: out.length,
      version: "V1891",
      test1607: getAIOrderStatus_({ parameter: { orderId: "1607" } })
    };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function rebuildAIOrdersView_(e) {
  e = e || { parameter: {} };
  const p = e.parameter || {};

  // لو الطلب جاي من الواجهة ومعاه جلسة، نتحقق من المدير.
  // ولو الدالة اتشغلت يدويًا من Apps Script بدون باراميترات، تشتغل مباشرة.
  if (normalize_(p.username) || normalize_(p.token)) {
    const auth = authorize_(p.username, p.token);
    if (!auth.ok) return { success: false, message: auth.message };
    const role = roleFromArabic_(auth.user.role, auth.user.department);
    const userKey = searchKey_(auth.user.username || "");
    if (!(role === "admin" || userKey.indexOf("ضياء") !== -1 || userKey.indexOf("diaa") !== -1)) {
      return { success: false, message: "تحديث AI_Orders_View متاح لضياء فقط." };
    }
  }

  return rebuildAIOrdersView();
}

function aiOrdersViewRows_() {
  const ss = ss_();
  const sheet = ss.getSheetByName(SHEET_NAME_AI_ORDERS_VIEW);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values[0].map(function(h) { return normalize_(h); });
  return values.slice(1).map(function(row, idx) {
    const obj = { rowNumber: idx + 2 };
    headers.forEach(function(h, i) {
      if (h) obj[h] = row[i];
    });
    return obj;
  }).filter(function(r) {
    return normalize_(r.order_id);
  });
}

function getAIOrdersView_(e) {
  e = e || { parameter: {} };
  const p = e.parameter || {};
  const limit = Math.min(Number(p.limit || 100) || 100, 500);
  let rows = aiOrdersViewRows_();
  if (!rows.length) {
    const rebuilt = rebuildAIOrdersView();
    rows = aiOrdersViewRows_();
    return { success: true, rebuilt: true, rebuildResult: rebuilt, count: rows.length, rows: rows.slice(0, limit) };
  }
  return { success: true, rebuilt: false, count: rows.length, rows: rows.slice(0, limit) };
}

function getAIOrderStatus_(e) {
  e = e || { parameter: {} };
  const p = e.parameter || {};
  const orderId = normalize_(p.orderId || p.order_id || p.id || p.order);
  const phone = cleanPhone_(p.phone || p.customerPhone || p.customer_phone);
  const customerNameKey = searchKey_(p.customerName || p.customer_name || p.name || "");

  let rows = aiOrdersViewRows_();
  if (!rows.length) {
    rebuildAIOrdersView();
    rows = aiOrdersViewRows_();
  }

  let matches = [];
  if (orderId) {
    matches = rows.filter(function(r) {
      return normalize_(r.order_id) === orderId;
    });
  } else if (phone) {
    matches = rows.filter(function(r) {
      return cleanPhone_(r.customer_phone) === phone;
    });
  } else if (customerNameKey) {
    matches = rows.filter(function(r) {
      return searchKey_(r.customer_name).indexOf(customerNameKey) !== -1 ||
             customerNameKey.indexOf(searchKey_(r.customer_name)) !== -1;
    });
  } else {
    return { success: false, message: "اكتب رقم الأوردر أو رقم الموبايل." };
  }

  if (!matches.length) {
    return {
      success: false,
      message: "الأوردر غير موجود في AI_Orders_View. اطلب من العميل رقم الأوردر أو رقم الموبايل للتأكيد.",
      orderId: orderId,
      phone: phone
    };
  }

  // لو البحث بالموبايل، اختر آخر أوردر مفتوح. لو مفيش مفتوح، اختر آخر صف.
  matches.sort(function(a, b) {
    const ao = normalize_(a.is_open) === "نعم" ? 1 : 0;
    const bo = normalize_(b.is_open) === "نعم" ? 1 : 0;
    if (ao !== bo) return bo - ao;
    return Number(b.sheet_row || 0) - Number(a.sheet_row || 0);
  });

  const selected = matches[0];
  return {
    success: true,
    order: selected,
    count: matches.length,
    ai_reply: selected.ai_reply || "",
    sourceSheet: SHEET_NAME_AI_ORDERS_VIEW
  };
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("TrendOS AI")
      .addItem("تحديث AI_Orders_View", "rebuildAIOrdersView")
      .addToUi();
  } catch (err) {}
}

/************************************************************
 * END V1890 - AI_Orders_View
 ************************************************************/


/************************************************************
 * V1891 - AI order reply compatibility patch
 * طبقة توافق فقط: لا تغيّر شيت العرض أو منطق البحث القديم.
 ************************************************************/

function aiOrderLatinDigitsV1891_(value) {
  return String(value || "")
    .replace(/[\u0660-\u0669]/g, function(ch) { return String(ch.charCodeAt(0) - 0x0660); })
    .replace(/[\u06F0-\u06F9]/g, function(ch) { return String(ch.charCodeAt(0) - 0x06F0); });
}

function extractAIOrderIdV1891_(p) {
  p = p || {};
  const explicit = normalize_(p.orderId || p.order_id || p.id || p.order);
  if (explicit) return aiOrderLatinDigitsV1891_(explicit);

  const source = aiOrderLatinDigitsV1891_(p.message || p.text || p.body || "");
  if (!source) return "";

  const labeled = source.match(/(?:الأوردر|الاوردر|اوردر|order(?:\s*(?:id|no|number))?|طلب)\D{0,20}(\d{2,})/i);
  if (labeled && labeled[1]) return normalize_(labeled[1]);

  const numbers = source.match(/\d{3,}/g);
  return numbers && numbers.length ? normalize_(numbers[0]) : "";
}

function getAIOrderStatusV1891_(e) {
  e = e || { parameter: {} };
  const p = e.parameter || {};
  const extractedOrderId = extractAIOrderIdV1891_(p);
  const forwarded = { parameter: Object.assign({}, p) };
  if (extractedOrderId) forwarded.parameter.orderId = extractedOrderId;

  const result = getAIOrderStatus_(forwarded) || { success: false, message: "تعذر قراءة حالة الأوردر." };
  const matchedOrderId = result.success && result.order ? normalize_(result.order.order_id) : "";
  const reply = result.success ? normalize_(result.ai_reply || (result.order && result.order.ai_reply) || "") : "";

  return Object.assign({}, result, {
    version: "V1891",
    requested_order_id: extractedOrderId,
    matched_order_id: matchedOrderId,
    verify_code: matchedOrderId,
    reply_lock: !!(result.success && matchedOrderId && reply),
    reply: reply
  });
}

/************************************************************
 * END V1891
 ************************************************************/


/************************************************************
 * TrendOS / Matbagy Patch V1898
 * Sprint تشغيل أساسي + أرشفة وتنضيف الأوردرات المقفولة
 *
 * مهم: هذا الملف لا يحتوي doGet/doPost حتى لا يكسر الكود القديم.
 * ضيف السطر التالي في أول doGet وبعد قراءة body في doPost:
 * const v1898Response = trendosV1898TryRoute_(e, typeof payload !== 'undefined' ? payload : null);
 * if (v1898Response) return v1898Response;
 ************************************************************/

const TRENDOS_V1898 = {
  VERSION: 'V1898_BASIC_OPERATIONS_CLEANUP',
  SPREADSHEET_ID: (typeof SPREADSHEET_ID !== 'undefined' ? SPREADSHEET_ID : ''),
  ORDERS_SHEET: (typeof SHEET_NAME_ORDERS !== 'undefined' ? SHEET_NAME_ORDERS : 'الأوردرات'),
  LINES_SHEET: (typeof SHEET_NAME_LINES !== 'undefined' ? SHEET_NAME_LINES : 'بنود الأوردرات'),
  ORDERS_ARCHIVE_SHEET: 'أرشيف الأوردرات',
  LINES_ARCHIVE_SHEET: 'أرشيف بنود الأوردرات',
  CLEANUP_LOG_SHEET: 'سجل تنضيف الأوردرات',
  CLOSED_STATUSES: ['تم التسليم', 'مكرر', 'ملغي', 'ملغى'],
  OPEN_EXCLUDED: ['تم التسليم', 'مكرر', 'ملغي', 'ملغى']
};

function trendosV1898TryRoute_(e, body) {
  const params = (e && e.parameter) || {};
  const action = String((body && body.action) || params.action || '').trim();
  if (['previewClosedOrdersCleanup', 'archiveClosedOrdersCleanup', 'trendosV1898Ping'].indexOf(action) === -1) return null;

  if (action === 'trendosV1898Ping') {
    return trendosV1898Json_({ success: true, version: TRENDOS_V1898.VERSION, message: 'TrendOS V1898 Patch is active' }, params.callback);
  }

  try {
    const authResult = trendosV1898Auth_(params, body);
    if (!authResult.ok) return trendosV1898Json_({ success: false, message: authResult.message }, params.callback);

    const payload = Object.assign({}, params, body || {});
    if (action === 'previewClosedOrdersCleanup') {
      return trendosV1898Json_(trendosV1898PreviewCleanup_(payload, authResult.user), params.callback);
    }
    if (action === 'archiveClosedOrdersCleanup') {
      return trendosV1898Json_(trendosV1898ArchiveCleanup_(payload, authResult.user), params.callback);
    }
  } catch (err) {
    return trendosV1898Json_({ success: false, version: TRENDOS_V1898.VERSION, message: String(err && err.message ? err.message : err) }, params.callback);
  }
}

function trendosV1898Auth_(params, body) {
  const username = String((body && body.username) || params.username || '').trim();
  const token = String((body && body.token) || params.token || '').trim();

  try {
    if (typeof authorize_ === 'function') {
      const auth = authorize_(username, token);
      if (!auth || !auth.ok) return { ok: false, message: (auth && auth.message) || 'انتهت الجلسة. سجل الدخول مرة أخرى.' };
      const blob = JSON.stringify(auth.user || {}) + ' ' + username;
      if (!/ضياء|diaa|admin/i.test(blob)) return { ok: false, message: 'التنضيف والأرشفة متاحة لضياء فقط.' };
      return { ok: true, user: auth.user || { username: username } };
    }
  } catch (e) {
    return { ok: false, message: 'تعذر التحقق من صلاحية المستخدم.' };
  }

  return { ok: false, message: 'تعذر التحقق من الجلسة؛ تم إيقاف العملية للحماية.' };
}

function trendosV1898Json_(obj, callback) {
  const json = JSON.stringify(obj || {});
  const cb = String(callback || '').trim();
  const safeCallback = /^[A-Za-z_$][0-9A-Za-z_$]{0,100}$/.test(cb) ? cb : '';
  const out = safeCallback ? (safeCallback + '(' + json + ');') : json;
  return ContentService
    .createTextOutput(out)
    .setMimeType(safeCallback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function trendosV1898Spreadsheet_() {
  try {
    const configuredId = normalize_(PropertiesService.getScriptProperties().getProperty('TRENDOS_SPREADSHEET_ID')) || TRENDOS_V1898.SPREADSHEET_ID;
    if (configuredId) return SpreadsheetApp.openById(configuredId);
  } catch (e) {}
  return SpreadsheetApp.getActiveSpreadsheet();
}

function trendosV1898Headers_(sheet) {
  if (!sheet || sheet.getLastRow() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function(h){ return String(h || '').trim(); });
}

function trendosV1898FindCol_(headers, aliases) {
  aliases = aliases || [];
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || '').trim();
    if (aliases.indexOf(h) !== -1) return i;
  }
  const low = headers.map(function(h){ return String(h || '').toLowerCase(); });
  for (let a = 0; a < aliases.length; a++) {
    const needle = String(aliases[a] || '').toLowerCase();
    const idx = low.indexOf(needle);
    if (idx !== -1) return idx;
  }
  return -1;
}

function trendosV1898ParseStatuses_(raw) {
  let arr = [];
  try { arr = JSON.parse(String(raw || '[]')); } catch (e) { arr = String(raw || '').split(','); }
  arr = arr.map(function(s){ return String(s || '').trim(); }).filter(Boolean);
  if (!arr.length) arr = ['تم التسليم'];
  if (arr.indexOf('ملغي') !== -1 && arr.indexOf('ملغى') === -1) arr.push('ملغى');
  if (arr.indexOf('ملغى') !== -1 && arr.indexOf('ملغي') === -1) arr.push('ملغي');
  return arr.filter(function(s){ return TRENDOS_V1898.CLOSED_STATUSES.indexOf(s) !== -1; });
}

function trendosV1898ParseDate_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    const d0 = new Date(value.getTime()); d0.setHours(0,0,0,0); return d0;
  }
  const raw = String(value || '').trim();
  if (!raw) return null;
  let m = raw.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (m) { const d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3])); d.setHours(0,0,0,0); return d; }
  m = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (m) { const d = new Date(Number(m[3]), Number(m[1])-1, Number(m[2])); d.setHours(0,0,0,0); return d; }
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  d.setHours(0,0,0,0);
  return d;
}

function trendosV1898InRange_(value, fromRaw, toRaw) {
  const from = trendosV1898ParseDate_(fromRaw);
  const to = trendosV1898ParseDate_(toRaw);
  if (!from && !to) return true;
  const d = trendosV1898ParseDate_(value);
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function trendosV1898EnsureArchiveSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  return sh;
}

function trendosV1898EnsureLogSheet_(ss) {
  let sh = ss.getSheetByName(TRENDOS_V1898.CLEANUP_LOG_SHEET);
  if (!sh) sh = ss.insertSheet(TRENDOS_V1898.CLEANUP_LOG_SHEET);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['التاريخ', 'الإجراء', 'من تاريخ', 'إلى تاريخ', 'الحالات', 'عدد الأوردرات', 'عدد البنود', 'بواسطة', 'الإصدار']);
  }
  return sh;
}

function trendosV1898CollectCleanup_(payload) {
  const ss = trendosV1898Spreadsheet_();
  const ordersSheet = ss.getSheetByName(TRENDOS_V1898.ORDERS_SHEET);
  const linesSheet = ss.getSheetByName(TRENDOS_V1898.LINES_SHEET);
  if (!ordersSheet) throw new Error('شيت الأوردرات غير موجود: ' + TRENDOS_V1898.ORDERS_SHEET);

  const statuses = trendosV1898ParseStatuses_(payload.statuses);
  if (!statuses.length) throw new Error('لا توجد حالات صالحة للتنضيف. المسموح: تم التسليم، مكرر، ملغي.');

  const ordersHeaders = trendosV1898Headers_(ordersSheet);
  const orderIdCol = trendosV1898FindCol_(ordersHeaders, ['رقم الأوردر', 'كود الأوردر', 'Order ID', 'orderId', 'order_id']);
  const statusCol = trendosV1898FindCol_(ordersHeaders, ['الحالة', 'status', 'Status']);
  const dateCol = trendosV1898FindCol_(ordersHeaders, ['تاريخ الأوردر', 'تاريخ التسجيل', 'تاريخ الإنشاء', 'تاريخ الاستلام', 'آخر تحديث', 'createdAt', 'Created At', 'receivedAt']);
  if (orderIdCol === -1 || statusCol === -1) throw new Error('أعمدة رقم الأوردر أو الحالة غير موجودة في شيت الأوردرات.');

  const orderValues = ordersSheet.getLastRow() > 1 ? ordersSheet.getRange(2, 1, ordersSheet.getLastRow() - 1, ordersSheet.getLastColumn()).getDisplayValues() : [];
  const selectedOrders = [];
  const ids = {};
  const counts = { delivered: 0, duplicate: 0, cancelled: 0 };

  orderValues.forEach(function(row, idx){
    const status = String(row[statusCol] || '').trim();
    if (statuses.indexOf(status) === -1) return;
    if (dateCol !== -1 && !trendosV1898InRange_(row[dateCol], payload.fromDate, payload.toDate)) return;
    const orderId = String(row[orderIdCol] || '').trim();
    selectedOrders.push({ rowNumber: idx + 2, row: row, orderId: orderId, status: status });
    if (orderId) ids[orderId] = true;
    if (status === 'تم التسليم') counts.delivered++;
    else if (status === 'مكرر') counts.duplicate++;
    else if (status === 'ملغي' || status === 'ملغى') counts.cancelled++;
  });

  let selectedLines = [];
  let lineHeaders = [];
  if (linesSheet && linesSheet.getLastRow() > 1) {
    lineHeaders = trendosV1898Headers_(linesSheet);
    const lineOrderIdCol = trendosV1898FindCol_(lineHeaders, ['رقم الأوردر', 'كود الأوردر', 'Order ID', 'orderId', 'order_id']);
    if (lineOrderIdCol !== -1) {
      const lineValues = linesSheet.getRange(2, 1, linesSheet.getLastRow() - 1, linesSheet.getLastColumn()).getDisplayValues();
      selectedLines = lineValues.map(function(row, idx){ return { rowNumber: idx + 2, row: row, orderId: String(row[lineOrderIdCol] || '').trim() }; })
        .filter(function(x){ return x.orderId && ids[x.orderId]; });
    }
  }

  return { ss: ss, ordersSheet: ordersSheet, linesSheet: linesSheet, ordersHeaders: ordersHeaders, lineHeaders: lineHeaders, orders: selectedOrders, lines: selectedLines, counts: counts, statuses: statuses };
}

function trendosV1898PreviewCleanup_(payload, user) {
  const data = trendosV1898CollectCleanup_(payload);
  return {
    success: true,
    version: TRENDOS_V1898.VERSION,
    preview: true,
    ordersCount: data.orders.length,
    linesCount: data.lines.length,
    counts: data.counts,
    message: 'معاينة فقط. لم يتم حذف أي بيانات.'
  };
}

function trendosV1898ArchiveCleanup_(payload, user) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const data = trendosV1898CollectCleanup_(payload);
    if (!data.orders.length) {
      return { success: true, version: TRENDOS_V1898.VERSION, ordersCount: 0, linesCount: 0, counts: data.counts, message: 'لا توجد أوردرات مطابقة للتنضيف.' };
    }

    const ordersArchive = trendosV1898EnsureArchiveSheet_(data.ss, TRENDOS_V1898.ORDERS_ARCHIVE_SHEET, data.ordersHeaders);
    const linesArchive = trendosV1898EnsureArchiveSheet_(data.ss, TRENDOS_V1898.LINES_ARCHIVE_SHEET, data.lineHeaders.length ? data.lineHeaders : ['رقم الأوردر']);

    data.orders.forEach(function(x){ ordersArchive.appendRow(x.row); });
    data.lines.forEach(function(x){ linesArchive.appendRow(x.row); });

    // حذف من أسفل لأعلى حتى لا تتغير أرقام الصفوف.
    data.lines.map(function(x){ return x.rowNumber; }).sort(function(a,b){ return b-a; }).forEach(function(r){ if (data.linesSheet) data.linesSheet.deleteRow(r); });
    data.orders.map(function(x){ return x.rowNumber; }).sort(function(a,b){ return b-a; }).forEach(function(r){ data.ordersSheet.deleteRow(r); });

    const log = trendosV1898EnsureLogSheet_(data.ss);
    log.appendRow([
      new Date(),
      'أرشفة وتنضيف',
      payload.fromDate || '',
      payload.toDate || '',
      data.statuses.join(', '),
      data.orders.length,
      data.lines.length,
      (user && (user.name || user.username)) || payload.username || '',
      TRENDOS_V1898.VERSION
    ]);

    return {
      success: true,
      version: TRENDOS_V1898.VERSION,
      ordersCount: data.orders.length,
      linesCount: data.lines.length,
      counts: data.counts,
      message: 'تم نقل البيانات للأرشيف وحذفها من شيت التشغيل.'
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}



/************************************************************
 * TrendOS / Matbagy Patch V1900
 * زر ضياء: تحويل كل الجاهز للاستلام إلى تم التسليم بضغطة واحدة
 *
 * لو تستخدم Code.gs مدمج V1900 الجاهز، لا ترفع هذا الملف منفصل.
 * لو سترفعه كملف منفصل، أضف action names داخل router أو استدعِ:
 * const v1900Response = trendosV1900TryRoute_(e, typeof payload !== 'undefined' ? payload : null);
 * if (v1900Response) return v1900Response;
 ************************************************************/

const TRENDOS_V1900 = {
  VERSION: 'V1900_BULK_DELIVER_READY_PICKUP',
  READY_STATUSES: ['في قسم التسليمات', 'جاهز للاستلام', 'جاهز', 'تم التنفيذ'],
  CLOSED_STATUSES: ['تم التسليم', 'مكرر', 'ملغي', 'ملغى'],
  DELIVERED_STATUS: 'تم التسليم',
  BULK_DELIVERY_LOG_SHEET: 'سجل التسليم الجماعي'
};

function trendosV1900TryRoute_(e, body) {
  const params = (e && e.parameter) || {};
  const action = String((body && body.action) || params.action || '').trim();
  if (['previewReadyPickupDelivery', 'deliverReadyPickupBulk', 'trendosV1900Ping'].indexOf(action) === -1) return null;

  if (action === 'trendosV1900Ping') {
    return trendosV1898Json_({ success: true, version: TRENDOS_V1900.VERSION, message: 'TrendOS V1900 Patch is active' }, params.callback);
  }

  try {
    const authResult = trendosV1898Auth_(params, body);
    if (!authResult.ok) return trendosV1898Json_({ success: false, message: authResult.message }, params.callback);
    const payload = Object.assign({}, params, body || {});

    if (action === 'previewReadyPickupDelivery') {
      return trendosV1898Json_(trendosV1900PreviewReadyDelivery_(payload, authResult.user), params.callback);
    }
    if (action === 'deliverReadyPickupBulk') {
      if (String(payload.confirm || '').trim() !== 'DELIVER_READY_PICKUP') {
        return trendosV1898Json_({ success: false, version: TRENDOS_V1900.VERSION, message: 'تأكيد التنفيذ غير صحيح. لم يتم تغيير أي بيانات.' }, params.callback);
      }
      return trendosV1898Json_(trendosV1900DeliverReady_(payload, authResult.user), params.callback);
    }
  } catch (err) {
    return trendosV1898Json_({ success: false, version: TRENDOS_V1900.VERSION, message: String(err && err.message ? err.message : err) }, params.callback);
  }
}

function trendosV1900Headers_(sheet) {
  return trendosV1898Headers_(sheet);
}

function trendosV1900FindCols_(headers, aliases) {
  const cols = [];
  aliases.forEach(function(alias){
    const idx = trendosV1898FindCol_(headers, [alias]);
    if (idx !== -1 && cols.indexOf(idx) === -1) cols.push(idx);
  });
  return cols;
}

function trendosV1900EnsureHeader_(sheet, headerName) {
  let headers = trendosV1900Headers_(sheet);
  let idx = trendosV1898FindCol_(headers, [headerName]);
  if (idx !== -1) return idx;
  sheet.getRange(1, sheet.getLastColumn() + 1).setValue(headerName);
  SpreadsheetApp.flush();
  headers = trendosV1900Headers_(sheet);
  return trendosV1898FindCol_(headers, [headerName]);
}

function trendosV1900StatusIn_(value, list) {
  const s = String(value == null ? '' : value).trim();
  return list.indexOf(s) !== -1;
}

function trendosV1900UserName_(user, payload) {
  return String((user && (user.username || user.name)) || (payload && payload.username) || 'ضياء').trim();
}

function trendosV1900CollectReadyDelivery_() {
  const ss = trendosV1898Spreadsheet_();
  const ordersSheet = ss.getSheetByName(TRENDOS_V1898.ORDERS_SHEET);
  const linesSheet = ss.getSheetByName(TRENDOS_V1898.LINES_SHEET);
  if (!ordersSheet) throw new Error('شيت الأوردرات غير موجود: ' + TRENDOS_V1898.ORDERS_SHEET);
  if (!linesSheet) throw new Error('شيت بنود الأوردرات غير موجود: ' + TRENDOS_V1898.LINES_SHEET);

  const ready = TRENDOS_V1900.READY_STATUSES;
  const closed = TRENDOS_V1900.CLOSED_STATUSES;
  const orderIds = {};
  const readyOrders = [];
  const readyLines = [];

  const oh = trendosV1900Headers_(ordersSheet);
  const orderIdColO = trendosV1898FindCol_(oh, ['رقم الأوردر', 'كود الأوردر', 'Order ID', 'orderId', 'order_id']);
  const orderStatusCols = trendosV1900FindCols_(oh, ['الحالة العامة', 'الحالة', 'Status', 'status']);
  if (orderIdColO === -1 || !orderStatusCols.length) throw new Error('أعمدة رقم الأوردر أو الحالة غير موجودة في شيت الأوردرات.');
  const orderValues = ordersSheet.getLastRow() > 1 ? ordersSheet.getRange(2, 1, ordersSheet.getLastRow() - 1, ordersSheet.getLastColumn()).getValues() : [];

  orderValues.forEach(function(row, idx){
    const orderId = String(row[orderIdColO] || '').trim();
    if (!orderId) return;
    const isReady = orderStatusCols.some(function(c){ return trendosV1900StatusIn_(row[c], ready); });
    if (!isReady) return;
    orderIds[orderId] = true;
    readyOrders.push({ rowNumber: idx + 2, orderId: orderId, row: row });
  });

  const lh = trendosV1900Headers_(linesSheet);
  const orderIdColL = trendosV1898FindCol_(lh, ['رقم الأوردر', 'كود الأوردر', 'Order ID', 'orderId', 'order_id']);
  const lineIdCol = trendosV1898FindCol_(lh, ['رقم البند', 'Line ID', 'lineId', 'line_id']);
  const lineStatusCol = trendosV1898FindCol_(lh, ['الحالة', 'Status', 'status']);
  if (orderIdColL === -1 || lineStatusCol === -1) throw new Error('أعمدة رقم الأوردر أو الحالة غير موجودة في شيت بنود الأوردرات.');
  const lineValues = linesSheet.getLastRow() > 1 ? linesSheet.getRange(2, 1, linesSheet.getLastRow() - 1, linesSheet.getLastColumn()).getValues() : [];

  lineValues.forEach(function(row, idx){
    const orderId = String(row[orderIdColL] || '').trim();
    if (!orderId) return;
    const status = String(row[lineStatusCol] || '').trim();
    const readyLine = trendosV1900StatusIn_(status, ready);
    const belongsToReadyOrder = !!orderIds[orderId] && !trendosV1900StatusIn_(status, closed);
    if (!readyLine && !belongsToReadyOrder) return;
    orderIds[orderId] = true;
    readyLines.push({ rowNumber: idx + 2, orderId: orderId, lineId: lineIdCol !== -1 ? String(row[lineIdCol] || '').trim() : '', status: status, row: row });
  });

  return {
    ss: ss,
    ordersSheet: ordersSheet,
    linesSheet: linesSheet,
    ordersHeaders: oh,
    lineHeaders: lh,
    orderIdColO: orderIdColO,
    orderStatusCols: orderStatusCols,
    orderValues: orderValues,
    lineStatusCol: lineStatusCol,
    readyOrders: readyOrders,
    readyLines: readyLines,
    orderIds: orderIds
  };
}

function trendosV1900PreviewReadyDelivery_(payload, user) {
  const data = trendosV1900CollectReadyDelivery_();
  const ids = Object.keys(data.orderIds);
  return {
    success: true,
    version: TRENDOS_V1900.VERSION,
    preview: true,
    ordersCount: ids.length,
    linesCount: data.readyLines.length,
    sampleOrders: ids.slice(0, 10),
    message: 'معاينة فقط. لم يتم تغيير أي بيانات.'
  };
}

function trendosV1900EnsureBulkLogSheet_(ss) {
  let sh = ss.getSheetByName(TRENDOS_V1900.BULK_DELIVERY_LOG_SHEET);
  if (!sh) sh = ss.insertSheet(TRENDOS_V1900.BULK_DELIVERY_LOG_SHEET);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['التاريخ', 'الإجراء', 'عدد الأوردرات', 'عدد البنود', 'الأوردرات', 'بواسطة', 'الإصدار']);
  }
  return sh;
}

function trendosV1900DeliverReady_(payload, user) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const data = trendosV1900CollectReadyDelivery_();
    const ids = Object.keys(data.orderIds);
    if (!ids.length && !data.readyLines.length) {
      return { success: true, version: TRENDOS_V1900.VERSION, ordersCount: 0, linesCount: 0, message: 'لا توجد أوردرات جاهزة للاستلام حالياً.' };
    }

    const now = new Date();
    const by = trendosV1900UserName_(user, payload);

    const lineDeliveredByCol = trendosV1900EnsureHeader_(data.linesSheet, 'تم التسليم بواسطة');
    const lineDeliveredAtCol = trendosV1900EnsureHeader_(data.linesSheet, 'تاريخ التسليم الفعلي');
    const lineUpdatedCol = trendosV1898FindCol_(trendosV1900Headers_(data.linesSheet), ['آخر تحديث', 'Updated At', 'updatedAt']);
    const lineReadyCol = trendosV1898FindCol_(trendosV1900Headers_(data.linesSheet), ['جاهز؟', 'جاهز', 'Ready']);

    data.readyLines.forEach(function(x){
      data.linesSheet.getRange(x.rowNumber, data.lineStatusCol + 1).setValue(TRENDOS_V1900.DELIVERED_STATUS);
      if (lineReadyCol !== -1) data.linesSheet.getRange(x.rowNumber, lineReadyCol + 1).setValue('نعم');
      if (lineUpdatedCol !== -1) data.linesSheet.getRange(x.rowNumber, lineUpdatedCol + 1).setValue(now);
      data.linesSheet.getRange(x.rowNumber, lineDeliveredAtCol + 1).setValue(now);
      data.linesSheet.getRange(x.rowNumber, lineDeliveredByCol + 1).setValue(by);
    });

    const orderDeliveredByCol = trendosV1900EnsureHeader_(data.ordersSheet, 'تم التسليم بواسطة');
    const orderDeliveredAtCol = trendosV1900EnsureHeader_(data.ordersSheet, 'تاريخ التسليم الفعلي');
    const refreshedOrderHeaders = trendosV1900Headers_(data.ordersSheet);
    const orderUpdatedCol = trendosV1898FindCol_(refreshedOrderHeaders, ['آخر تحديث', 'Updated At', 'updatedAt']);
    const orderReadyCol = trendosV1898FindCol_(refreshedOrderHeaders, ['بنود جاهزة']);
    const orderNotReadyCol = trendosV1898FindCol_(refreshedOrderHeaders, ['بنود غير جاهزة']);
    const orderLineCountCol = trendosV1898FindCol_(refreshedOrderHeaders, ['عدد البنود']);

    data.orderValues.forEach(function(row, idx){
      const orderId = String(row[data.orderIdColO] || '').trim();
      if (!orderId || !data.orderIds[orderId]) return;
      const rowNumber = idx + 2;
      data.orderStatusCols.forEach(function(c){ data.ordersSheet.getRange(rowNumber, c + 1).setValue(TRENDOS_V1900.DELIVERED_STATUS); });
      if (orderUpdatedCol !== -1) data.ordersSheet.getRange(rowNumber, orderUpdatedCol + 1).setValue(now);
      data.ordersSheet.getRange(rowNumber, orderDeliveredAtCol + 1).setValue(now);
      data.ordersSheet.getRange(rowNumber, orderDeliveredByCol + 1).setValue(by);
      if (orderLineCountCol !== -1 && orderReadyCol !== -1) data.ordersSheet.getRange(rowNumber, orderReadyCol + 1).setValue(row[orderLineCountCol] || '');
      if (orderNotReadyCol !== -1) data.ordersSheet.getRange(rowNumber, orderNotReadyCol + 1).setValue(0);
    });

    const log = trendosV1900EnsureBulkLogSheet_(data.ss);
    log.appendRow([now, 'تحويل الجاهز للاستلام إلى تم التسليم', ids.length, data.readyLines.length, ids.join(', '), by, TRENDOS_V1900.VERSION]);

    SpreadsheetApp.flush();
    return {
      success: true,
      version: TRENDOS_V1900.VERSION,
      ordersCount: ids.length,
      linesCount: data.readyLines.length,
      sampleOrders: ids.slice(0, 10),
      message: 'تم تحويل كل الجاهز للاستلام / في قسم التسليمات إلى تم التسليم.'
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}


/************************************************************
 * V1900 FORCE MAIN ROUTER HELPER
 * حماية إضافية: نفس أوامر تسليم الجاهز موجودة داخل الراوتر الرئيسي
 * حتى لو أي tryRoute قديم رجع Action غير معروف.
 ************************************************************/
function trendosV1900MainRouteObject_(e, body) {
  const params = (e && e.parameter) || {};
  const action = String((body && body.action) || params.action || '').trim();

  if (action === 'trendosV1900Ping') {
    return {
      success: true,
      version: TRENDOS_V1900.VERSION,
      message: 'TrendOS V1900 Patch is active'
    };
  }

  const authResult = trendosV1898Auth_(params, body);
  if (!authResult.ok) {
    return {
      success: false,
      version: TRENDOS_V1900.VERSION,
      message: authResult.message
    };
  }

  const payload = Object.assign({}, params, body || {});

  if (action === 'previewReadyPickupDelivery') {
    return trendosV1900PreviewReadyDelivery_(payload, authResult.user);
  }

  if (action === 'deliverReadyPickupBulk') {
    if (String(payload.confirm || '').trim() !== 'DELIVER_READY_PICKUP') {
      return {
        success: false,
        version: TRENDOS_V1900.VERSION,
        message: 'تأكيد التنفيذ غير صحيح. لم يتم تغيير أي بيانات.'
      };
    }
    return trendosV1900DeliverReady_(payload, authResult.user);
  }

  return {
    success: false,
    version: TRENDOS_V1900.VERSION,
    message: 'Action غير معروف في V1900.'
  };
}



/************************************************************
 * V1903_EXTERNAL_CUSTOMER_SAFE_ORDER
 * عميل خارجي / عابر بدون حفظ في شيت العملاء + رقم مختصر آمن
 * - العميل الخارجي لا يبحث في شيت العملاء ولا يسجل فيها.
 * - الرقم/العلامة تقبل 3 أرقام فأكثر أو رقم كامل.
 * - الرقم الكامل يمنع التكرار لو له أوردر مفتوح.
 * - الرقم المختصر يعطي تحذير فقط ويمكن المتابعة بـ forceCreate=YES.
 ************************************************************/

const TRENDOS_V1903 = {
  VERSION: 'V1903_EXTERNAL_CUSTOMER_SAFE_ORDER',
  EXTERNAL_LABEL: 'عميل خارجي',
  EXTERNAL_SOURCE: 'خارجي / عابر',
  MIN_LIGHT_ID_LENGTH: 3,
  FULL_PHONE_MIN_LENGTH: 10,
  CLOSED_STATUSES: ['تم التسليم', 'مكرر', 'ملغي', 'ملغى']
};

function trendosV1903Ping_() {
  return {
    success: true,
    version: TRENDOS_V1903.VERSION,
    message: 'TrendOS V1903 External Customer Patch is active'
  };
}

function trendosV1903Digits_(value) {
  return arabicDigitsToEnglish_(value).replace(/[^0-9]/g, '');
}

function trendosV1903IsExternal_(p) {
  p = p || {};
  const mode = searchKey_(p.customerMode || p.customerInputMode || p.customerSource || p.source || p.isExternalCustomer || p.walkinCustomer || '');
  return mode.indexOf('خارجي') !== -1 || mode.indexOf('عابر') !== -1 || mode.indexOf('external') !== -1 || mode.indexOf('walkin') !== -1 || mode === '1' || mode === 'true' || mode === 'yes';
}

function trendosV1903IsClosedStatus_(status) {
  const s = normalize_(status);
  return TRENDOS_V1903.CLOSED_STATUSES.indexOf(s) !== -1;
}

function trendosV1903FindOpenExternalOrders_(externalId, isFullPhone) {
  externalId = trendosV1903Digits_(externalId);
  if (!externalId) return [];

  const ss = ss_();
  const sheets = [ss.getSheetByName(SHEET_NAME_ORDERS), ss.getSheetByName(SHEET_NAME_LINES)].filter(Boolean);
  const found = [];
  const seen = {};

  sheets.forEach(function(sheet) {
    if (!sheet || sheet.getLastRow() < 2) return;
    const h = headersMap_(sheet);
    const colOrderId = firstCol_(h, ['رقم الأوردر', 'Order ID'], 1);
    const colOrderCode = firstCol_(h, ['كود الأوردر'], 2);
    const colCustomer = firstCol_(h, ['اسم الشات / المكتب', 'اسم العميل', 'Customer Name'], 3);
    const colPhone = firstCol_(h, ['رقم العميل الخارجي', 'رقم العميل', 'رقم الهاتف', 'Phone'], 0);
    const colStatus = firstCol_(h, ['الحالة العامة', 'الحالة', 'Status'], 0);
    const colSource = firstCol_(h, ['مصدر الطلب', 'Source'], 0);
    const colExternal = firstCol_(h, ['علامة العميل الخارجي', 'رقم/علامة العميل', 'معرف العميل الخارجي', 'External Customer ID'], 0);
    const colUpdated = firstCol_(h, ['آخر تحديث', 'Updated At'], 0);
    const colItem = firstCol_(h, ['وصف مختصر', 'وصف الأوردر', 'اسم البند / نوع الشغل', 'اسم البند', 'Item Name'], 0);

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    data.forEach(function(row, idx) {
      const status = normalize_(valueAt_(row, colStatus));
      if (trendosV1903IsClosedStatus_(status)) return;

      const source = searchKey_(valueAt_(row, colSource));
      const customer = normalize_(valueAt_(row, colCustomer));
      const looksExternal = source.indexOf('خارجي') !== -1 || source.indexOf('عابر') !== -1 || searchKey_(customer).indexOf('عميل خارجي') !== -1 || searchKey_(customer).indexOf('عميل عابر') !== -1;
      if (!looksExternal) return;

      const phoneDigits = trendosV1903Digits_(valueAt_(row, colPhone));
      const externalDigits = trendosV1903Digits_(valueAt_(row, colExternal));
      const matched = isFullPhone ? (phoneDigits === externalId || externalDigits === externalId) : (externalDigits === externalId || phoneDigits === externalId);
      if (!matched) return;

      const oid = normalize_(valueAt_(row, colOrderId)) || normalize_(valueAt_(row, colOrderCode));
      if (!oid || seen[oid]) return;
      seen[oid] = true;
      found.push({
        orderId: oid,
        customer: customer,
        status: status || 'طلب جديد',
        source: normalize_(valueAt_(row, colSource)) || TRENDOS_V1903.EXTERNAL_SOURCE,
        itemName: normalize_(valueAt_(row, colItem)),
        updatedAt: valueAt_(row, colUpdated),
        sheetName: sheet.getName(),
        rowNumber: idx + 2
      });
    });
  });

  return found;
}

function trendosV1903EnsureExternalHeaders_(ordersSheet, linesSheet) {
  const headers = ['نوع إدخال العميل', 'علامة العميل الخارجي'];
  if (ordersSheet) ensureHeaderIfAnyMissing_(ordersSheet, headers);
  if (linesSheet) ensureHeaderIfAnyMissing_(linesSheet, headers);
}

/************************************************************
 * V1908 - Strong duplicate order guard
 * يمنع تكرار نفس الأوردر بسبب دبل كليك / timeout / إعادة إرسال.
 ************************************************************/
function trendosV1908RequestKey_(p) {
  return normalize_(p.clientRequestId || p.requestId || p.idempotencyKey || p.idempotency_key || "");
}

function trendosV1908PropKey_(requestKey) {
  return "TRENDOS_CREATE_ORDER_V1908_" + String(requestKey || "").replace(/[^A-Za-z0-9_\-]/g, "").slice(0, 80);
}

function trendosV1908ReadSavedResponse_(requestKey) {
  if (!requestKey) return null;
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(trendosV1908PropKey_(requestKey));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function trendosV1908SaveResponse_(requestKey, response) {
  if (!requestKey || !response || !response.success) return;
  try {
    const copy = Object.assign({}, response, { idempotentReplay: true, savedAt: new Date().toISOString() });
    PropertiesService.getScriptProperties().setProperty(trendosV1908PropKey_(requestKey), JSON.stringify(copy).slice(0, 8000));
  } catch (err) {}
}

function trendosV1908FpPart_(value) {
  return searchKey_(value || "").replace(/\s+/g, " ").trim();
}

function trendosV1908Fingerprint_(customerName, customerPhone, externalDigits, department, itemName, qty) {
  return [
    trendosV1908FpPart_(customerName),
    trendosV1908FpPart_(customerPhone || externalDigits),
    trendosV1908FpPart_(department),
    trendosV1908FpPart_(itemName),
    String(Number(qty || 1) || 1)
  ].join("|");
}

function trendosV1908RecentDuplicate_(lines, fingerprint, now) {
  if (!lines || !fingerprint || lines.getLastRow() < 2) return null;
  const h = headersMap_(lines);
  const colOrder = firstCol_(h, ["رقم الأوردر", "Order ID"], 1);
  const colLine = firstCol_(h, ["رقم البند", "Line ID"], 2);
  const colCustomer = firstCol_(h, ["اسم الشات / المكتب", "اسم العميل", "Customer Name"], 3);
  const colPhone = firstCol_(h, ["رقم العميل", "رقم العميل الأساسي", "رقم الهاتف", "Phone"], 0);
  const colExternal = firstCol_(h, ["علامة العميل الخارجي", "معرف العميل الخارجي", "External Customer ID"], 0);
  const colDept = firstCol_(h, ["القسم", "Department"], 4);
  const colItem = firstCol_(h, ["اسم البند / نوع الشغل", "اسم البند", "Item Name"], 5);
  const colQty = firstCol_(h, ["الكمية", "Qty"], 6);
  const colStatus = firstCol_(h, ["الحالة", "Status"], 0);
  const colDate = firstCol_(h, ["تاريخ الاستلام", "تاريخ الإنشاء", "Received At", "آخر تحديث"], 0);
  const startRow = Math.max(2, lines.getLastRow() - 120);
  const data = lines.getRange(startRow, 1, lines.getLastRow() - startRow + 1, lines.getLastColumn()).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    const status = normalize_(valueAt_(row, colStatus));
    if (["تم التسليم", "مكرر", "ملغي", "ملغى"].indexOf(status) !== -1) continue;
    const rowFp = trendosV1908Fingerprint_(
      valueAt_(row, colCustomer),
      valueAt_(row, colPhone),
      valueAt_(row, colExternal),
      valueAt_(row, colDept),
      valueAt_(row, colItem),
      valueAt_(row, colQty)
    );
    if (rowFp !== fingerprint) continue;
    let isRecent = true;
    const rawDate = valueAt_(row, colDate);
    const parsed = parseDateValue_(rawDate);
    if (parsed) isRecent = Math.abs(now.getTime() - parsed.getTime()) <= 10 * 60 * 1000;
    if (!isRecent) continue;
    return {
      orderId: normalize_(valueAt_(row, colOrder)),
      lineId: normalize_(valueAt_(row, colLine)),
      rowNumber: startRow + i,
      status: status,
      customer: normalize_(valueAt_(row, colCustomer)),
      itemName: normalize_(valueAt_(row, colItem))
    };
  }
  return null;
}

function createManualOrder_(e) {
  e = e || { parameter: {} };
  const p = e.parameter || {};
  const auth = authorize_(p.username, p.token);
  if (!auth.ok) return { success: false, message: auth.message };
  if (!canCreateOrder_(auth.user)) return { success: false, message: 'ليس لديك صلاحية إضافة أوردر.' };
  const trendosV1908CreateLock = LockService.getScriptLock();
  trendosV1908CreateLock.waitLock(30000);
  try {
    const trendosV1908RequestKey = trendosV1908RequestKey_(p);
    const trendosV1908Saved = trendosV1908ReadSavedResponse_(trendosV1908RequestKey);
    if (trendosV1908Saved) return Object.assign({}, trendosV1908Saved, { duplicatePrevented: true, message: "تم منع تكرار الإرسال. الأوردر مسجل بالفعل رقم " + (trendosV1908Saved.orderId || "-") + "." });

  const isExternal = trendosV1903IsExternal_(p);
  const rawExternalId = normalize_(p.customerExternalId || p.externalCustomerId || p.lightCustomerId || p.customerPhone || p.phone || '');
  const externalDigits = trendosV1903Digits_(rawExternalId);
  const isFullExternalPhone = externalDigits.length >= TRENDOS_V1903.FULL_PHONE_MIN_LENGTH;

  let customerName = normalize_(p.customerName);
  let customerPhone = '';
  let customerType = '';
  let customerInfo = { phone: '', extraPhone: '', type: '', debtAmount: 0, debtNotes: '' };
  let debtAmount = 0;
  let debtNotes = '';

  if (isExternal) {
    if (externalDigits.length < TRENDOS_V1903.MIN_LIGHT_ID_LENGTH) {
      return { success: false, version: TRENDOS_V1903.VERSION, message: 'للعميل الخارجي اكتب 3 أرقام على الأقل في خانة رقم/علامة العميل.' };
    }

    const openMatches = trendosV1903FindOpenExternalOrders_(externalDigits, isFullExternalPhone);
    if (openMatches.length && isFullExternalPhone) {
      return {
        success: false,
        version: TRENDOS_V1903.VERSION,
        duplicateBlocked: true,
        openOrder: openMatches[0],
        message: 'يوجد أوردر مفتوح لنفس الرقم الكامل. رقم الأوردر: ' + openMatches[0].orderId + ' | الحالة: ' + openMatches[0].status
      };
    }
    if (openMatches.length && normalize_(p.forceCreate) !== 'YES') {
      return {
        success: false,
        version: TRENDOS_V1903.VERSION,
        warningOnly: true,
        needsConfirmation: true,
        openOrder: openMatches[0],
        message: 'يوجد أوردر مفتوح بنفس الرقم المختصر/العلامة: ' + externalDigits + '. رقم الأوردر: ' + openMatches[0].orderId + '. يمكنك فتح أوردر جديد لو العميل مختلف.'
      };
    }

    customerPhone = externalDigits;
    customerType = TRENDOS_V1903.EXTERNAL_SOURCE;
    if (!customerName || searchKey_(customerName) === searchKey_(TRENDOS_V1903.EXTERNAL_LABEL) || searchKey_(customerName) === searchKey_('عميل عابر')) {
      customerName = TRENDOS_V1903.EXTERNAL_LABEL + ' - ' + externalDigits;
    }
  } else {
    customerName = normalize_(p.customerName);
    customerInfo = findCustomerInfoByName_(customerName);
    debtAmount = parseDebtAmount_(customerInfo.debtAmount || 0);
    debtNotes = customerInfo.debtNotes || '';
    customerPhone = cleanPhone_(p.customerPhone) || customerInfo.phone || customerInfo.extraPhone || '';
    customerType = safeCustomerTypeForValidation_(p.customerType || customerInfo.type || '');
  }

  const department = normalize_(p.department);
  const heatPress = isHeatPressFlag_(p.heatPress || p.press || p.isPress);
  const flyPrint = department === 'طباعة' && isFlyPrintFlag_(p.flyPrint || p.quickPrint || p.fastPrint || p['طباعة على الطاير']);
  let itemName = normalize_(p.itemName);
  const qty = Number(p.qty || 1) || 1;
  const priority = flyPrint ? 'عاجل' : (normalize_(p.priority) || 'عادي');
  const status = normalize_(p.status) || 'طلب جديد';
  const assignedToParam = normalize_(p.assignedTo);
  let notes = normalize_(p.notes);

  if (!customerName || !department) return { success: false, message: isExternal ? 'رقم/علامة العميل والقسم مطلوبين.' : 'اسم الشات والقسم مطلوبين.' };
  if (!itemName) itemName = 'أوردر جديد - ' + department;
  if (debtAmount > 0) notes = (notes ? notes + ' | ' : '') + 'تنبيه مديونية: ' + debtAmount + ' ج. لا يتم التسليم قبل السداد.';

  const ss = ss_();
  const lines = ss.getSheetByName(SHEET_NAME_LINES);
  const orders = ss.getSheetByName(SHEET_NAME_ORDERS);
  if (!lines) return { success: false, message: 'شيت بنود الأوردرات غير موجود.' };
  ensureWhatsAppHeaders_(lines);
  ensurePressColumn_(lines);
  ensureFlyPrintColumn_(lines);
  if (orders) ensureWhatsAppHeaders_(orders);
  trendosV1903EnsureExternalHeaders_(orders, lines);

  const now = new Date();
  const expectedDeliveryAt = flyPrint ? new Date(now) : expectedDeliveryDate_(now);
  const expectedDeliveryText = flyPrint ? (formatDateAr_(expectedDeliveryAt) + ' - نفس اليوم') : formatDateAr_(expectedDeliveryAt);
  const trendosV1908Fingerprint = trendosV1908Fingerprint_(customerName, customerPhone, externalDigits, department, itemName, qty);
  let trendosV1908Duplicate = normalize_(p.forceDuplicateOrder) === 'YES' ? null : trendosV1908RecentDuplicate_(lines, trendosV1908Fingerprint, now);
  if (!trendosV1908Duplicate && department === 'متعدد الأقسام' && normalize_(p.forceDuplicateOrder) !== 'YES') {
    trendosV1908Duplicate = trendosV1908RecentDuplicate_(lines, trendosV1908Fingerprint_(customerName, customerPhone, externalDigits, 'طباعة', itemName + ' - طباعة', qty), now) ||
      trendosV1908RecentDuplicate_(lines, trendosV1908Fingerprint_(customerName, customerPhone, externalDigits, 'ليزر', itemName + ' - ليزر', qty), now);
  }
  if (trendosV1908Duplicate) {
    return {
      success: false,
      version: "V1908_DUPLICATE_GUARD",
      duplicateBlocked: true,
      duplicatePrevented: true,
      openOrder: trendosV1908Duplicate,
      orderId: trendosV1908Duplicate.orderId,
      lineId: trendosV1908Duplicate.lineId,
      message: 'تم منع تكرار الأوردر. نفس العميل/القسم/البند/الكمية مسجل قريبًا بالفعل. رقم الأوردر: ' + (trendosV1908Duplicate.orderId || '-') + '.'
    };
  }
  const orderId = makeOrderId_(lines, now, true);

  let departments = [];
  if (department === 'متعدد الأقسام') {
    departments = [
      { department: 'طباعة', assignedTo: 'وائل', suffix: 'طباعة' },
      { department: 'ليزر', assignedTo: 'جابر', suffix: 'ليزر' }
    ];
  } else {
    departments = [{ department: department, assignedTo: assignedToParam || defaultAssigned_(department), suffix: department }];
  }

  const source = isExternal ? TRENDOS_V1903.EXTERNAL_SOURCE : (normalize_(p.source) || 'داخلي');
  const customerMode = isExternal ? 'خارجي / عابر' : 'عميل مسجل';
  const readyCount = isReadyStatus_(status) ? departments.length : 0;
  const common = {
    orderId: orderId,
    now: now,
    customerName: customerName,
    customerPhone: customerPhone,
    customerType: customerType,
    department: department,
    itemName: itemName,
    qty: qty,
    priority: priority,
    status: status,
    lineCount: departments.length,
    readyCount: readyCount,
    notReadyCount: departments.length - readyCount,
    partial: readyCount > 0 && readyCount < departments.length ? 'نعم' : 'لا',
    notes: notes,
    receivedAt: now,
    expectedDeliveryAt: expectedDeliveryAt,
    expectedDeliveryText: expectedDeliveryText,
    heatPress: heatPress,
    flyPrint: flyPrint,
    debtAmount: debtAmount,
    debtNotes: debtNotes,
    source: source,
    createdBy: auth.user.username,
    customerNotes: isExternal ? ('علامة عميل خارجي: ' + externalDigits + (notes ? ' | ' + notes : '')) : '',
    externalCustomerId: isExternal ? externalDigits : '',
    customerMode: customerMode
  };

  upsertOrderSummary_(common);
  if (orders) {
    const hOrders = headersMap_(orders);
    const colOrderId = firstCol_(hOrders, ['رقم الأوردر', 'Order ID'], 1);
    let targetOrderRow = 0;
    if (orders.getLastRow() > 1) {
      const values = orders.getRange(2, colOrderId, orders.getLastRow() - 1, 1).getValues();
      for (let oi = values.length - 1; oi >= 0; oi--) {
        if (normalize_(values[oi][0]) === orderId) { targetOrderRow = oi + 2; break; }
      }
    }
    if (targetOrderRow) {
      updateByHeaders_(orders, targetOrderRow, {
        'نوع إدخال العميل': customerMode,
        'علامة العميل الخارجي': isExternal ? externalDigits : '',
        'مصدر الطلب': source,
        'أنشئ بواسطة': auth.user.username
      }, true);
    }
  }

  departments.forEach(function(d, idx) {
    const lineNo = String(idx + 1).padStart(2, '0');
    const lineId = orderId + '-' + lineNo;
    appendLine_(ss, Object.assign({}, common, {
      lineId: lineId,
      department: d.department,
      itemName: departments.length > 1 ? (itemName + ' - ' + d.suffix) : itemName,
      assignedTo: d.assignedTo,
      heatPress: heatPress,
      flyPrint: flyPrint
    }));
    const hLines = headersMap_(lines);
    const newLineRow = lines.getLastRow();
    updateByHeaders_(lines, newLineRow, {
      'نوع إدخال العميل': customerMode,
      'علامة العميل الخارجي': isExternal ? externalDigits : '',
      'مصدر الطلب': source,
      'أنشئ بواسطة': auth.user.username
    }, true);
  });

  appendActivityLog_({
    time: now,
    orderId: orderId,
    lineId: orderId + '-01',
    customer: customerName,
    department: department,
    action: isExternal ? 'إنشاء أوردر عميل خارجي' : 'إنشاء أوردر',
    newStatus: status,
    by: auth.user.username,
    details: isExternal ? ('علامة العميل الخارجي: ' + externalDigits) : (debtAmount > 0 ? 'تم تسجيل الأوردر مع تنبيه مديونية' : 'تم تسجيل أوردر جديد')
  });

  SpreadsheetApp.flush();
  const trendosV1908Response = {
    success: true,
    version: "V1908_DUPLICATE_GUARD",
    orderId: orderId,
    lineId: orderId + '-01',
    linesCreated: departments.length,
    expectedDeliveryAt: expectedDeliveryAt,
    expectedDeliveryText: expectedDeliveryText,
    debtAmount: debtAmount,
    debtHold: debtAmount > 0 ? 'نعم' : 'لا',
    debtInfo: { hasDebt: debtAmount > 0, amount: debtAmount, notes: debtNotes },
    customerMode: customerMode,
    externalCustomerId: isExternal ? externalDigits : '',
    message: isExternal ? 'تم إضافة أوردر عميل خارجي بدون تسجيله في شيت العملاء.' : (debtAmount > 0 ? 'تم إضافة الأوردر مع تنبيه مديونية العميل.' : 'تم إضافة الأوردر في الشيتين.')
  };
  trendosV1908SaveResponse_(trendosV1908RequestKey, trendosV1908Response);
  return trendosV1908Response;
  } finally {
    try { trendosV1908CreateLock.releaseLock(); } catch (err) {}
  }
}
