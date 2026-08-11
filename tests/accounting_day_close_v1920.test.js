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

assert.strictEqual(context.MATBAGY_ACCOUNTING_VERSION, undefined, 'top-level const is intentionally not exported by vm');
assert.match(code, /V1921_SEMI_AUTOMATIC_ACCOUNTING/);

[
  'savePurchaseCustodyV1920', 'closePurchaseCustodyV1920', 'getDailyDepartmentReportV1920',
  'closeDepartmentDayV1920', 'getUnclassifiedAccountingRowsV1920',
  'classifyLegacyAccountingRowV1920', 'reverseApprovedPurchaseV1920'
].forEach(action => {
  assert.match(code, new RegExp(`action === "${action}"`), `${action} route must exist`);
  assert.strictEqual(typeof context[`${action}_`], 'function', `${action} implementation must exist`);
});

assert.strictEqual(context.purchaseCustodyMovementSignV1920_('تسليم عهدة'), 1);
assert.strictEqual(context.purchaseCustodyMovementSignV1920_('تسوية مشتريات معتمدة'), -1);
assert.strictEqual(context.purchaseCustodyMovementSignV1920_('رد باقي العهدة'), -1);
assert.strictEqual(context.purchaseCustodyMovementSignV1920_('سداد فرق للموظف'), 1);
assert.strictEqual(context.purchaseCustodyMovementSignV1920_('عكس مشتريات معتمدة'), 1);

const events = [
  { 'تاريخ العمل':'2026-08-10', 'الموظف':'جابر', 'القسم':'ليزر', 'نوع الحركة':'تسليم عهدة', 'المبلغ':100 },
  { 'تاريخ العمل':'2026-08-10', 'الموظف':'جابر', 'القسم':'ليزر', 'نوع الحركة':'تسوية مشتريات معتمدة', 'المبلغ':60 },
  { 'تاريخ العمل':'2026-08-10', 'الموظف':'جابر', 'القسم':'ليزر', 'نوع الحركة':'عكس مشتريات معتمدة', 'المبلغ':20 }
];
context.purchaseCustodyRowsV1920_ = () => events;
context.ensurePurchaseCustodyCloseSheetV1920_ = () => ({ rows:[] });
context.accSheetRows_ = sheet => sheet.rows || [];
const custody = context.purchaseCustodySummaryOneV1920_('جابر', 'ليزر', '2026-08-10', events);
assert.strictEqual(custody.handed, 100);
assert.strictEqual(custody.approvedPurchases, 60);
assert.strictEqual(custody.reversedPurchases, 20);
assert.strictEqual(custody.balance, 60);
assert.strictEqual(custody.employeeReturns, 60);
assert.strictEqual(custody.companyOwes, 0);

assert.match(code, /report\.profit=report\.sales-report\.actualJobCost-report\.netWaste/,
  'actual profit must use actual job cost and net waste');
assert.doesNotMatch(code, /report\.profit=report\.sales-report\.purchases/,
  'purchases must not be deducted a second time from profit');
assert.match(code, /اقفل الليزر والطباعة أولًا/,
  'overall close must be blocked until laser and print are closed');
assert.match(code, /السجل مصنف بالفعل ولا يمكن تغيير تصنيفه/,
  'legacy classification must be one-time');
assert.match(code, /adjustment_decrease/);
assert.match(code, /adjustment_increase/);
assert.match(code, /حالة العكس":"معكوس/);

assert.match(app, /screenDailyClose/);
assert.match(app, /screenLegacy/);
assert.match(app, /تكلفة الشغل الفعلية/);
assert.match(app, /lineCostTotal\(r\)[\s\S]*totalCost/);
assert.match(app, /عكس الحركة/);
assert.match(app, /التقارير والأرباح/);
assert.match(app, /paymentType:val\('fiPayment'\)/);
assert.match(config, /ES46 V1921/);
assert.match(index, /es46-v1921-semi-automatic-accounting/);

console.log('accounting custody and department day close V1920 tests passed');
