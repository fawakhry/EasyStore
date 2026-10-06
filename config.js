// EasyStore / Matbagy Accounting - ES47 V1922 unified safe build

window.TREND_API_URL = "https://script.google.com/macros/s/AKfycbwGHOduL0BHvH-o4up9nbk1wYFi54D2KOnW1AFDigpBzyuAOTWzPfpSFPGSyFVj_fmTmg/exec";

// اضبطه على رابط secure-proxy بعد نشره.
// عند تركه فارغًا يُستخدم Apps Script POST مباشرة.
window.MATBAGY_SECURE_API_PROXY_URL = "";


// ============================================================
// EasyStore Accounting / D1
// A2.9 — Bounded Recalc Canary
// ============================================================

// القراءة من D1 مفعلة
window.EASYSTORE_ACCOUNTING_D1_READONLY = true;

// Legacy/general D1 writes تظل مقفولة
window.EASYSTORE_ACCOUNTING_D1_WRITES = false;

// السماح بوضع CANARY فقط
window.EASYSTORE_ACCOUNTING_D1_WRITE_MODE = 'CANARY';

// عائلة الكتابة الوحيدة المسموحة في هذا الـCanary
window.EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS = [
  'recalcAccountingMaterialsCascade'
];

// D1 Accounting API
window.EASYSTORE_ACCOUNTING_D1_URL =
  "https://trendos-d1-api.trendmall-contact.workers.dev/v1/employee/accounting";

// TrendOS SSO handoff
window.EASYSTORE_TRENDOS_SSO_HANDOFF_V1 = true;


// ============================================================
// Build / Cache
// ============================================================

window.EASYSTORE_VERSION = 'ES47 V1922 Unified Safe Build';

window.EASYSTORE_SESSION_CATALOG_FIX =
  window.EASYSTORE_VERSION;

// A2.9 cache tag
window.EASYSTORE_CACHE_TAG =
  'a29-recalc-canary-20261007';

window.EASYSTORE_AUTO_REFRESH =
  'safe-3-minutes-when-clean';

window.EASYSTORE_INITIAL_LOAD_ONCE = true;
window.EASYSTORE_DISABLE_PHONE_ACTIVATION = true;
window.EASYSTORE_FULL_ACCOUNTING = true;
window.EASYSTORE_CLEAN_SINGLE_LOADER = true;
window.EASYSTORE_CACHE_KILLER = true;


// ============================================================
// Existing EasyStore feature flags
// ============================================================

window.EASYSTORE_V1913_SECURITY_INTEGRITY = true;
window.EASYSTORE_V1914_LEGACY_DEBT_RECONCILE = true;
window.EASYSTORE_V1915_CUSTOMER_ACCOUNTS = true;
window.EASYSTORE_V1916_CUSTOMER_ACCOUNT_DRAWER = true;
window.EASYSTORE_V1917_DAILY_DEPARTMENT_PURCHASES = true;
window.EASYSTORE_V1918_DEPARTMENT_ACCOUNTING_SCOPE = true;
window.EASYSTORE_V1919_IMMEDIATE_DEPARTMENT_PURCHASE_STOCK = true;
window.EASYSTORE_V1920_CUSTODY_DEPARTMENT_DAY_CLOSE = true;
window.EASYSTORE_V1921_SEMI_AUTOMATIC_ACCOUNTING = true;
window.EASYSTORE_V1922_UNIFIED_SAFE_BUILD = true;
