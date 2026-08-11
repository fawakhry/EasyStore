const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const config = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const context = { console };
vm.createContext(context);
vm.runInContext(code, context);

assert.match(code, /V1921_SEMI_AUTOMATIC_ACCOUNTING/);
[
  'previewAccountingAutomationV1921',
  'runAccountingDayAutomationV1921',
  'applySuggestedLegacyClassificationsV1921'
].forEach(action => {
  assert.match(code, new RegExp(`action === "${action}"`));
  assert.strictEqual(typeof context[`${action}_`], 'function');
});

const deptRows = [
  { ID: 'L-1', 'القسم': 'ليزر' },
  { ID: 'P-1', 'القسم': 'طباعة' }
];
assert.strictEqual(context.accountingDepartmentFromLineIdsV1921_('["L-1"]', deptRows), 'ليزر');
assert.strictEqual(context.accountingDepartmentFromLineIdsV1921_('["P-1"]', deptRows), 'طباعة');
assert.strictEqual(context.accountingDepartmentFromLineIdsV1921_('["L-1","P-1"]', deptRows), 'كل الأقسام');

const oldAccRows = context.accSheetRows_;
context.accSheetRows_ = sheet => sheet.rows;
const held = context.accountingHeldPaymentForOrderV1921_({ rows: [
  { rowNumber: 2, 'رقم الأوردر': '3001', 'الحالة': 'تحت مراجعة ضياء', 'مدفوع محفوظ للمراجعة': 125, 'استخدم في فاتورة بديلة': '' },
  { rowNumber: 3, 'رقم الأوردر': '3001', 'الحالة': 'مدفوعة', 'مدفوع محفوظ للمراجعة': 500, 'استخدم في فاتورة بديلة': '' }
] }, '3001');
assert.strictEqual(held.amount, 125);
assert.strictEqual(held.rows.length, 1);
context.accSheetRows_ = oldAccRows;

const originalLedgerFns = {
  accountsEnsureLedgerSheetV1858_: context.accountsEnsureLedgerSheetV1858_,
  accountsEnsureSheetColumnV1858_: context.accountsEnsureSheetColumnV1858_,
  customerAccountFindRequestV1915_: context.customerAccountFindRequestV1915_,
  accountsCurrentBalanceV1858_: context.accountsCurrentBalanceV1858_,
  accountsUpdateMasterBalanceV1858_: context.accountsUpdateMasterBalanceV1858_
};
let repairedMasterBalance = null;
context.accountsEnsureLedgerSheetV1858_ = () => ({});
context.accountsEnsureSheetColumnV1858_ = () => 1;
context.customerAccountFindRequestV1915_ = () => ({ 'الرصيد بعد': 40 });
context.accountsCurrentBalanceV1858_ = () => 85;
context.accountsUpdateMasterBalanceV1858_ = (type, name, balance) => { repairedMasterBalance = balance; };
const duplicateLedger = context.accountingAppendPartyLedgerOnceV1921_({ user:{username:'ضياء'} }, {partyType:'customer',partyName:'عميل',amount:10,requestId:'REQ-1'});
assert.strictEqual(duplicateLedger.duplicatePrevented, true);
assert.strictEqual(duplicateLedger.balance, 85);
assert.strictEqual(repairedMasterBalance, 85, 'retry must preserve the latest party balance, not an old duplicate row balance');
Object.assign(context, originalLedgerFns);

assert.match(code, /auth\.mode === "full" \|\| auth\.mode === "final"/,
  'department invoice approval must be restricted to finance reviewers');
assert.match(String(context.approveAccountingDeptInvoiceV1887_), /auth\.mode === "full" \|\| auth\.mode === "final"/,
  'the final active approval function must keep the restricted permissions');
assert.doesNotMatch(String(context.approveAccountingDeptInvoiceV1887_), /auth\.mode === "print"|auth\.mode === "laser"/);
assert.match(String(context.easyStoreSystemHealth_), /accountingDuplicateRequestIdsV1921_/,
  'the final active health function must run the V1921 duplicate checks');
assert.match(String(context.saveEasyStoreSaleV2_), /easyStoreSalesHeadersV1909_\(\)/,
  'the final active sales function must preserve the department column');
assert.match(String(context.saveEasyStoreSaleV2_), /if \(!accountingLineIdsV1921_\(e\.parameter\.lineIds\)\.length\)/,
  'a sale linked to already-approved department lines must not deduct stock twice');
assert.match(String(context.saveEasyStorePurchase_), /easyStorePurchasesHeadersV1909_\(\)/,
  'the final active purchase function must preserve source and reversal columns');
assert.match(code, /جابر ووائل يسجلان البنود للمراجعة دون اعتماد مالي/);
context.accountingAuthorize_ = () => ({ ok:true, mode:'laser', department:'ليزر', user:{username:'جابر'} });
const deniedApproval = context.approveAccountingDeptInvoiceV1887_({ parameter:{orderId:'1001',department:'ليزر'} });
assert.strictEqual(deniedApproval.success, false);
assert.match(deniedApproval.message, /جابر ووائل/);
const deniedAutomation = context.runAccountingDayAutomationV1921_({ parameter:{confirm:'RUN_SAFE_DAY_CLOSE'} });
assert.strictEqual(deniedAutomation.success, false);
assert.match(deniedAutomation.message, /ضياء فقط/);
assert.match(code, /accountingAppendCashboxOnceV1920_\(\{type:partyType==="supplier"\?"supplier_payment":"customer_receipt"/);
assert.match(code, /مدفوع محفوظ للمراجعة/);
assert.match(code, /accountingDepartmentCloseBlockersV1921_/);
assert.match(code, /custodySettlementRequired/);
assert.match(code, /يجب تأكيد استلامه أو دفعه قبل التقفيل/);
assert.match(code, /RUN_SAFE_DAY_CLOSE/);
assert.match(code, /APPLY_HIGH_CONFIDENCE/);

assert.match(app, /مركز متابعة اليوم والتقفيل الذكي/);
assert.match(app, /تقفيل اليوم كله بموافقة واحدة/);
assert.match(app, /لن يعتمد النظام مشتريات معلقة أو فاتورة عميل أو تسوية عهدة بها مبلغ من نفسه/);
assert.match(app, /approveDeptInvoiceLegacy\(\)\{ return this\.approveDeptInvoice\(\); \}/);
assert.match(app, /if\(!canFinalize\(\)\) return flash\('اعتماد فاتورة القسم من شاشة التقفيل متاح لضياء أو رحمة أو ريفان فقط\.'/);
assert.match(app, /safeAutoRefresh/);
assert.match(app, /state\.formDirty/);
assert.match(app, /function sessionCacheKey\(\)/);
assert.match(app, /if\(user\.token\) localStorage\.setItem\(sessionCacheKey\(\)/);
assert.match(app, /localStorage\.removeItem\(STORE_KEY\)/);
assert.doesNotMatch(app, /sales-purchases/);
assert.match(app, /department:val\('saDept'\)/);
assert.doesNotMatch(app, /onclick="ES27\.approveDeptInvoice\(\)">✓ اعتماد فاتورة القسم/);
assert.match(config, /safe-3-minutes-when-clean/);
assert.match(index, /es46-v1921-semi-automatic-accounting-20260811a/);

console.log('accounting semi-automatic V1921 tests passed');
