const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = { console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8'), context);

const state = {
  mode: 'final',
  balance: 30,
  ledger: [],
  cashbox: [],
  audits: []
};

context.accountingAuthorize_ = () => ({ ok: true, mode: state.mode, user: { username: state.mode === 'full' ? 'ضياء' : 'رحمة' } });
context.accountsCanEditV1858_ = auth => auth.mode === 'full' || auth.mode === 'final';
context.customerAccountFindV1915_ = name => name === 'عميل اختبار' ? { name, phone: '01000000000' } : null;
context.accountsEnsureLedgerSheetV1858_ = () => ({ getLastRow: () => state.ledger.length + 1 });
context.accountsEnsureSheetColumnV1858_ = () => 1;
context.customerAccountFindRequestV1915_ = (_sheet, requestId) => state.ledger.find(row => row['معرف الطلب'] === requestId) || null;
context.accountsCurrentBalanceV1858_ = () => state.balance;
context.appendByHeaders_ = (_sheet, values) => state.ledger.push(values);
context.accountsUpdateMasterBalanceV1858_ = (_type, _name, balance) => { state.balance = balance; };
context.customerAccountEnsureCashboxV1915_ = values => {
  if (state.cashbox.some(row => row.requestId === values.requestId)) return false;
  state.cashbox.push(values);
  return true;
};
context.es16Audit_ = (...args) => state.audits.push(args);
context.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
context.SpreadsheetApp = { flush() {} };
context.Utilities = { getUuid: () => '12345678-test-test-test-test' };

function movement(overrides) {
  return context.saveCustomerAccountMovementV1915_({
    parameter: Object.assign({
      customerName: 'عميل اختبار',
      operation: 'payment_received',
      amount: '15',
      paymentMethod: 'نقدي',
      requestId: 'CUST-test-0001',
      source: 'unit test'
    }, overrides || {})
  });
}

let result = movement();
assert.strictEqual(result.success, true);
assert.strictEqual(result.balanceBefore, 30);
assert.strictEqual(result.balance, 15);
assert.strictEqual(state.ledger.length, 1);
assert.strictEqual(state.cashbox.length, 1);
assert.strictEqual(state.audits.length, 1);

result = movement();
assert.strictEqual(result.success, true);
assert.strictEqual(result.duplicatePrevented, true);
assert.strictEqual(state.ledger.length, 1, 'retry must not duplicate the customer ledger');
assert.strictEqual(state.cashbox.length, 1, 'retry must not duplicate the cashbox');
assert.strictEqual(state.balance, 15);

result = movement({ requestId: 'CUST-test-0002', amount: '16' });
assert.strictEqual(result.success, false);
assert.match(result.message, /أكبر من مديونية/);
assert.strictEqual(state.balance, 15);

result = movement({ requestId: 'CUST-test-0003', operation: 'opening_debt', amount: '5' });
assert.strictEqual(result.success, false);
assert.match(result.message, /ضياء فقط/);

result = context.savePartyLedgerTransactionV1858_({ parameter: { partyName: 'عميل اختبار', operation: 'manual', amount: '5' } });
assert.strictEqual(result.success, false, 'the legacy ledger route must not bypass the Diaa-only adjustment rule');
assert.match(result.message, /ضياء فقط/);

state.mode = 'full';
result = movement({ requestId: 'CUST-test-0004', operation: 'opening_debt', amount: '5' });
assert.strictEqual(result.success, true);
assert.strictEqual(result.balanceBefore, 15);
assert.strictEqual(result.balance, 20);
assert.strictEqual(state.cashbox.length, 1, 'adding debt must not create a cashbox receipt');

console.log('customer account V1915 tests passed');
