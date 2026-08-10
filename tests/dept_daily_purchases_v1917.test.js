const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = { console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8'), context);

const state = {
  mode: 'laser',
  username: 'جابر',
  department: 'ليزر',
  daily: [],
  official: [],
  audits: [],
  uuid: 0
};

const dailySheet = {};
const materialsSheet = {};

function publicRow(values) {
  return {
    id: values['ID'],
    requestId: values['مفتاح الطلب'],
    createdAt: values['وقت التسجيل'],
    workDate: values['تاريخ العمل'],
    employee: values['الموظف'],
    department: values['القسم'],
    supplier: values['المورد'],
    receiptNo: values['رقم فاتورة المورد'],
    material: values['الخامة'],
    qty: values['الكمية'],
    unit: values['سعر الوحدة'],
    total: values['الإجمالي'],
    paymentType: values['نوع الدفع'],
    paid: values['المدفوع'],
    remain: values['المتبقي'],
    notes: values['ملاحظات'],
    status: values['الحالة'],
    approvedAt: values['وقت الاعتماد'] || '',
    approvedBy: values['اعتمد بواسطة'] || '',
    officialInvoiceNo: values['رقم فاتورة الشراء الرسمية'] || '',
    approvalKey: values['مفتاح الاعتماد'] || ''
  };
}

context.accountingAuthorize_ = () => ({
  ok: true,
  mode: state.mode,
  department: state.department,
  user: { username: state.username, name: state.username }
});
context.ensureAccountingSheets_ = () => ({ dailyPurchases: dailySheet, materials: materialsSheet });
context.accountingFindMaterialRow_ = (_sheet, name) => name === 'خامة غير مسجلة' ? 0 : 2;
context.deptDailyPurchaseMaterialAllowedV1917_ = (_sheet, name) => name === 'خامة غير مسجلة' ? 0 : 2;
context.deptDailyPurchaseRowsV1917_ = () => state.daily.map((row, index) => Object.assign({ rowNumber: index + 2 }, row));
context.appendByHeaders_ = (_sheet, values) => state.daily.push(publicRow(values));
context.updateByHeaders_ = (_sheet, rowNumber, values) => {
  const row = state.daily[rowNumber - 2];
  if (!row) throw new Error('missing daily row');
  if (Object.prototype.hasOwnProperty.call(values, 'الحالة')) row.status = values['الحالة'];
  if (Object.prototype.hasOwnProperty.call(values, 'وقت الاعتماد')) row.approvedAt = values['وقت الاعتماد'];
  if (Object.prototype.hasOwnProperty.call(values, 'اعتمد بواسطة')) row.approvedBy = values['اعتمد بواسطة'];
  if (Object.prototype.hasOwnProperty.call(values, 'رقم فاتورة الشراء الرسمية')) row.officialInvoiceNo = values['رقم فاتورة الشراء الرسمية'];
  if (Object.prototype.hasOwnProperty.call(values, 'مفتاح الاعتماد')) row.approvalKey = values['مفتاح الاعتماد'];
  if (Object.prototype.hasOwnProperty.call(values, 'ملاحظات')) row.notes = values['ملاحظات'];
};
context.saveEasyStorePurchase_ = event => {
  const requestId = event.parameter.requestId;
  const old = state.official.find(row => row.requestId === requestId);
  if (old) return { success: true, duplicatePrevented: true, invoiceNo: old.invoiceNo };
  state.official.push({
    requestId,
    invoiceNo: event.parameter.invoiceNo,
    supplier: event.parameter.supplier,
    material: event.parameter.material,
    qty: event.parameter.qty,
    total: event.parameter.total
  });
  return { success: true, invoiceNo: event.parameter.invoiceNo };
};
context.es16Audit_ = (...args) => state.audits.push(args);
context.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
context.SpreadsheetApp = { flush() {} };
context.Session = { getScriptTimeZone: () => 'Africa/Cairo' };
context.Utilities = {
  getUuid: () => `0000000${++state.uuid}-test-test-test-test`,
  formatDate: () => '2026-08-10'
};

function submit(overrides) {
  return context.saveDeptDailyPurchaseV1917_({
    parameter: Object.assign({
      requestId: 'DPP-client-1',
      supplier: 'مورد اختبار',
      receiptNo: 'REC-10',
      material: 'خشب MDF',
      qty: '2',
      unit: '50',
      paymentType: 'نقدي',
      notes: 'شراء اختبار'
    }, overrides || {})
  });
}

let result = submit();
assert.strictEqual(result.success, true);
assert.strictEqual(state.daily.length, 1);
assert.strictEqual(state.daily[0].status, 'قيد مراجعة ضياء');
assert.strictEqual(state.daily[0].total, 100);
assert.strictEqual(state.daily[0].paid, 100);
assert.strictEqual(state.official.length, 0, 'department submission must not update official purchases or stock');

result = submit();
assert.strictEqual(result.success, true);
assert.strictEqual(result.duplicatePrevented, true);
assert.strictEqual(state.daily.length, 1, 'retry must not duplicate the pending purchase');

result = submit({ requestId: 'DPP-client-invalid', material: 'خامة غير مسجلة' });
assert.strictEqual(result.success, false);
assert.match(result.message, /غير مسجلة/);
assert.strictEqual(state.daily.length, 1);

state.mode = 'final';
state.username = 'رحمة';
state.department = '';
result = submit({ requestId: 'DPP-final-denied' });
assert.strictEqual(result.success, false);
assert.match(result.message, /جابر ووائل فقط/);

state.mode = 'full';
state.username = 'ضياء';
result = context.approveDeptDailyPurchasesV1917_({ parameter: { employee: 'جابر', workDate: '2026-08-10', username: 'ضياء', token: 'token' } });
assert.strictEqual(result.success, true);
assert.strictEqual(result.approvedCount, 1);
assert.strictEqual(result.approvedTotal, 100);
assert.strictEqual(state.official.length, 1);
assert.strictEqual(state.daily[0].status, 'معتمد ومضاف للمخزون');
assert.strictEqual(state.daily[0].approvedBy, 'ضياء');

result = context.approveDeptDailyPurchasesV1917_({ parameter: { employee: 'جابر', workDate: '2026-08-10', username: 'ضياء', token: 'token' } });
assert.strictEqual(result.success, true);
assert.strictEqual(result.duplicatePrevented, true);
assert.strictEqual(state.official.length, 1, 'approval retry must not duplicate the official purchase');

state.mode = 'print';
state.username = 'وائل';
state.department = 'طباعة';
result = submit({ requestId: 'DPP-wael-1', material: 'رول طباعة', qty: '1', unit: '80', paymentType: 'آجل' });
assert.strictEqual(result.success, true);
assert.strictEqual(state.daily[1].paid, 0);
assert.strictEqual(state.daily[1].remain, 80);

result = context.approveDeptDailyPurchasesV1917_({ parameter: { employee: 'وائل', workDate: '2026-08-10' } });
assert.strictEqual(result.success, false);
assert.match(result.message, /ضياء فقط/);

state.mode = 'full';
state.username = 'ضياء';
state.department = '';
result = context.rejectDeptDailyPurchaseV1917_({ parameter: { id: state.daily[1].id, reason: 'فاتورة غير واضحة' } });
assert.strictEqual(result.success, true);
assert.strictEqual(state.daily[1].status, 'مرفوض');
assert.strictEqual(state.official.length, 1, 'rejection must not create an official purchase');

let visible = context.deptDailyPurchasesForAuthV1917_({ mode: 'laser', department: 'ليزر', user: { username: 'جابر' } }, context.deptDailyPurchaseRowsV1917_());
assert.strictEqual(visible.length, 1, 'Gaber must only see his own department purchases');
assert.strictEqual(visible[0].employee, 'جابر');
visible = context.deptDailyPurchasesForAuthV1917_({ mode: 'final', department: '', user: { username: 'رحمة' } }, context.deptDailyPurchaseRowsV1917_());
assert.strictEqual(visible.length, 0, 'final users must not see department purchase drafts');

console.log('daily department purchases V1917 tests passed');
