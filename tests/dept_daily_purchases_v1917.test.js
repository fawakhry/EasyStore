const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = { console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8'), context);
const realSaveEasyStorePurchase = context.saveEasyStorePurchase_;

const state = {
  mode: 'laser', username: 'جابر', department: 'ليزر', daily: [], official: [], audits: [], uuid: 0,
  stock: { 'ليزر|خشب MDF': 0, 'طباعة|رول طباعة': 0 }
};

const dailySheet = {
  getLastRow: () => state.daily.length + 1,
  deleteRow: rowNumber => state.daily.splice(rowNumber - 2, 1)
};
const materialsSheet = {};

function publicRow(values) {
  return {
    id: values.ID, requestId: values['مفتاح الطلب'], createdAt: values['وقت التسجيل'], workDate: values['تاريخ العمل'],
    employee: values['الموظف'], department: values['القسم'], supplier: values['المورد'], receiptNo: values['رقم فاتورة المورد'],
    material: values['الخامة'], qty: values['الكمية'], unit: values['سعر الوحدة'], total: values['الإجمالي'],
    paymentType: values['نوع الدفع'], paid: values['المدفوع'], remain: values['المتبقي'], notes: values['ملاحظات'],
    status: values['الحالة'], approvedAt: '', approvedBy: '', officialInvoiceNo: '', approvalKey: '',
    stockStatus: values['حالة المخزون'] || '', stockAppliedAt: '', stockAppliedQty: 0, stockAfter: 0,
    stockReversedAt: '', stockReversalReason: ''
  };
}

context.accountingAuthorize_ = () => ({ ok: true, mode: state.mode, department: state.department, user: { username: state.username, name: state.username } });
context.ensureAccountingSheets_ = () => ({ dailyPurchases: dailySheet, materials: materialsSheet });
context.deptDailyPurchaseMaterialAllowedV1917_ = (_sheet, name, department) => state.stock[`${department}|${name}`] !== undefined ? 2 : 0;
context.deptDailyPurchaseRowsV1917_ = () => state.daily.map((row, index) => Object.assign({ rowNumber: index + 2 }, row));
context.appendByHeaders_ = (_sheet, values) => state.daily.push(publicRow(values));
context.updateByHeaders_ = (_sheet, rowNumber, values) => {
  const row = state.daily[rowNumber - 2];
  if (!row) throw new Error('missing daily row');
  const map = {
    'الحالة':'status', 'وقت الاعتماد':'approvedAt', 'اعتمد بواسطة':'approvedBy',
    'رقم فاتورة الشراء الرسمية':'officialInvoiceNo', 'مفتاح الاعتماد':'approvalKey', 'ملاحظات':'notes',
    'حالة المخزون':'stockStatus', 'وقت إضافة المخزون':'stockAppliedAt', 'كمية أضيفت للمخزون':'stockAppliedQty',
    'رصيد المخزون بعد الإضافة':'stockAfter', 'وقت عكس المخزون':'stockReversedAt', 'سبب عكس المخزون':'stockReversalReason'
  };
  Object.keys(values).forEach(key => { if (map[key]) row[map[key]] = values[key]; });
};
context.deptDailyPurchaseAdjustStockV1919_ = (material, delta, info) => {
  const key = `${info.department}|${material}`;
  if (state.stock[key] === undefined) return { ok: false, message: 'الخامة غير مسجلة' };
  const before = state.stock[key];
  const after = before + Number(delta);
  if (after < 0) return { ok: false, insufficientStock: true, before, message: 'الخامة تم استهلاكها بعد تسجيل الشراء، لذلك لا يمكن رفض البند' };
  state.stock[key] = after;
  return { ok: true, before, after };
};
context.saveEasyStorePurchase_ = event => {
  assert.strictEqual(event.parameter.stockAlreadyAppliedV1919, '1');
  const requestId = event.parameter.requestId;
  const old = state.official.find(row => row.requestId === requestId);
  if (old) return { success: true, duplicatePrevented: true, invoiceNo: old.invoiceNo };
  state.official.push({ requestId, invoiceNo: event.parameter.invoiceNo, department: event.parameter.department, material: event.parameter.material, qty: event.parameter.qty });
  return { success: true, invoiceNo: event.parameter.invoiceNo, stockUpdateSkipped: true };
};
context.es16Audit_ = (...args) => state.audits.push(args);
context.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
context.SpreadsheetApp = { flush() {} };
context.Session = { getScriptTimeZone: () => 'Africa/Cairo' };
context.Utilities = { getUuid: () => `0000000${++state.uuid}-test-test-test-test`, formatDate: () => '2026-08-10' };

function submit(overrides) {
  return context.saveDeptDailyPurchaseV1917_({ parameter: Object.assign({
    requestId: 'DPP-client-1', supplier: 'مورد اختبار', receiptNo: 'REC-10', material: 'خشب MDF',
    qty: '2', unit: '50', paymentType: 'نقدي', notes: 'شراء اختبار'
  }, overrides || {}) });
}

let result = submit();
assert.strictEqual(result.success, true);
assert.strictEqual(state.daily.length, 1);
assert.strictEqual(state.daily[0].status, 'قيد مراجعة ضياء');
assert.strictEqual(state.daily[0].stockStatus, 'مضاف فورًا');
assert.strictEqual(state.stock['ليزر|خشب MDF'], 2, 'Gaber purchase must increase laser stock immediately');
assert.strictEqual(state.official.length, 0, 'submission must not post supplier finances');

result = submit();
assert.strictEqual(result.duplicatePrevented, true);
assert.strictEqual(state.stock['ليزر|خشب MDF'], 2, 'retry must not increase stock twice');

result = submit({ requestId: 'DPP-invalid', material: 'خامة غير مسجلة' });
assert.strictEqual(result.success, false);
assert.strictEqual(state.daily.length, 1);

state.mode = 'full'; state.username = 'ضياء'; state.department = '';
result = context.approveDeptDailyPurchasesV1917_({ parameter: { employee: 'جابر', workDate: '2026-08-10' } });
assert.strictEqual(result.success, true);
assert.strictEqual(result.approvedCount, 1);
assert.strictEqual(state.official.length, 1);
assert.strictEqual(state.daily[0].status, 'معتمد ماليًا');
assert.strictEqual(state.stock['ليزر|خشب MDF'], 2, 'approval must not increase already-applied stock');

result = context.approveDeptDailyPurchasesV1917_({ parameter: { employee: 'جابر', workDate: '2026-08-10' } });
assert.strictEqual(result.duplicatePrevented, true);
assert.strictEqual(state.official.length, 1);
assert.strictEqual(state.stock['ليزر|خشب MDF'], 2);

state.mode = 'print'; state.username = 'وائل'; state.department = 'طباعة';
result = submit({ requestId: 'DPP-wael-1', material: 'رول طباعة', qty: '1', unit: '80', paymentType: 'آجل' });
assert.strictEqual(result.success, true);
assert.strictEqual(state.stock['طباعة|رول طباعة'], 1, 'Wael purchase must only increase print stock');
assert.strictEqual(state.daily[1].paid, 0);

result = context.rejectDeptDailyPurchaseV1917_({ parameter: { id: state.daily[1].id } });
assert.strictEqual(result.success, false);
assert.match(result.message, /ضياء فقط/);

state.mode = 'full'; state.username = 'ضياء'; state.department = '';
result = context.rejectDeptDailyPurchaseV1917_({ parameter: { id: state.daily[1].id, reason: 'فاتورة غير واضحة' } });
assert.strictEqual(result.success, true);
assert.strictEqual(state.daily[1].status, 'مرفوض');
assert.strictEqual(state.daily[1].stockStatus, 'تم عكس المخزون');
assert.strictEqual(state.stock['طباعة|رول طباعة'], 0, 'rejection must reverse provisional stock once');
result = context.rejectDeptDailyPurchaseV1917_({ parameter: { id: state.daily[1].id } });
assert.strictEqual(result.duplicatePrevented, true);
assert.strictEqual(state.stock['طباعة|رول طباعة'], 0);

state.mode = 'laser'; state.username = 'جابر'; state.department = 'ليزر';
result = submit({ requestId: 'DPP-consumed', qty: '2' });
assert.strictEqual(result.success, true);
state.stock['ليزر|خشب MDF'] -= 3; // consume one old unit and both newly purchased units
state.mode = 'full'; state.username = 'ضياء'; state.department = '';
result = context.rejectDeptDailyPurchaseV1917_({ parameter: { id: state.daily[2].id } });
assert.strictEqual(result.success, false);
assert.match(result.message, /استهلاك/);
assert.strictEqual(state.daily[2].status, 'قيد مراجعة ضياء');

state.daily.push({ id:'DPP-LEGACY', requestId:'legacy', createdAt:new Date(), workDate:'2026-08-09', employee:'جابر', department:'ليزر', supplier:'مورد قديم', material:'خشب MDF', qty:1, unit:20, total:20, paid:20, remain:0, paymentType:'نقدي', notes:'', status:'قيد مراجعة ضياء', stockStatus:'', stockAppliedQty:0, stockAfter:0 });
const beforeLegacy = state.stock['ليزر|خشب MDF'];
result = context.approveDeptDailyPurchasesV1917_({ parameter: { employee:'جابر', workDate:'2026-08-09' } });
assert.strictEqual(result.success, true);
assert.strictEqual(state.stock['ليزر|خشب MDF'], beforeLegacy + 1, 'legacy pending row must add stock once during approval');
assert.strictEqual(state.official.length, 2);

let visible = context.deptDailyPurchasesForAuthV1917_({ mode:'laser', department:'ليزر', user:{ username:'جابر' } }, context.deptDailyPurchaseRowsV1917_());
assert.ok(visible.every(row => row.employee === 'جابر' && row.department === 'ليزر'));
visible = context.deptDailyPurchasesForAuthV1917_({ mode:'final', department:'', user:{ username:'رحمة' } }, context.deptDailyPurchaseRowsV1917_());
assert.strictEqual(visible.length, 0);

// The official purchase path must honor the internal daily-purchase marker only,
// while normal direct purchases continue to increase stock.
let officialRows = 0;
let directStockCalls = 0;
const officialSheet = { getLastRow:() => officialRows + 1, getLastColumn:() => 16, getRange:() => ({ getValues:() => [] }), deleteRow:() => { officialRows--; } };
context.accountingCanSavePurchaseV1857_ = () => true;
context.accountingReadIdempotentV1913_ = () => null;
context.accountingSaveIdempotentV1913_ = () => {};
context.mbEnsureSheet_ = () => officialSheet;
context.headersMap_ = () => ({});
context.firstCol_ = () => 0;
context.accountingFindMaterialRow_ = () => 2;
context.appendByHeaders_ = sheet => { if (sheet === officialSheet) officialRows++; };
context.savePartyLedgerTransactionV1858_ = () => ({ success:true });
context.accountingIncreaseMaterialStockV1913_ = () => { directStockCalls++; return { ok:true, before:5, after:7 }; };
context.accountingPurchaseStockAlreadyAppliedV1919_ = () => true;
result = realSaveEasyStorePurchase({ parameter:{ requestId:'DPP-APPROVE-DPP-X', invoiceNo:'DPP-X', supplier:'مورد', material:'خشب MDF', qty:'2', unit:'10', total:'20', paid:'20', department:'ليزر', stockAlreadyAppliedV1919:'1', sourceDailyPurchaseId:'DPP-X' } });
assert.strictEqual(result.success, true);
assert.strictEqual(result.stockUpdateSkipped, true);
assert.strictEqual(directStockCalls, 0, 'official approval must not add stock twice');
context.accountingPurchaseStockAlreadyAppliedV1919_ = () => false;
result = realSaveEasyStorePurchase({ parameter:{ requestId:'PUR-DIRECT', invoiceNo:'PUR-DIRECT', supplier:'مورد', material:'خشب MDF', qty:'2', unit:'10', total:'20', paid:'20', department:'ليزر' } });
assert.strictEqual(result.success, true);
assert.strictEqual(result.stockUpdateSkipped, false);
assert.strictEqual(directStockCalls, 1, 'normal direct purchase must still increase stock');

console.log('daily department purchases V1919 immediate-stock tests passed');
