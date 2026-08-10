const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeStorage(initial) {
  const values = Object.assign({}, initial);
  return {
    getItem: key => Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null,
    setItem: (key, value) => { values[key] = String(value); },
    removeItem: key => { delete values[key]; }
  };
}

function createApp(role) {
  const screen = { innerHTML: '' };
  const app = {};
  Object.defineProperty(app, 'innerHTML', {
    get: () => app.html || '',
    set: value => { app.html = value; }
  });

  const user = role === 'admin'
    ? { username: 'ضياء', name: 'ضياء', mode: 'full', token: 'token' }
    : { username: 'رحمة', name: 'رحمة', mode: 'final', token: 'token' };
  const customer = { name: 'عميل اختبار', phone: '01000000000', type: 'جملة', debt: 30, currentBalance: 30 };
  const storage = makeStorage({
    MATBAGY_EMPLOYEE_SSO: JSON.stringify({ user }),
    EASYSTORE_CLEAN_V1880_DATA: JSON.stringify({ customers: [customer] })
  });
  const body = {
    appendChild(element) {
      element.parentNode = body;
      const url = new URL(element.src);
      const callback = url.searchParams.get('callback');
      const action = url.searchParams.get('action');
      assert.strictEqual(action, 'getCustomerAccountV1915');
      context[callback]({
        success: true,
        customer,
        balance: 30,
        permissions: { canCollect: true, canAdjust: role === 'admin' },
        transactions: [{ createdAt: '2026-08-10T10:00:00.000Z', operation: 'invoice', amount: 30, balanceBefore: 0, balanceAfter: 30, createdBy: 'ضياء' }]
      });
    },
    removeChild(element) { element.parentNode = null; }
  };
  const document = {
    body,
    getElementById: id => id === 'app' ? app : id === 'screen' ? screen : null,
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => ({ parentNode: null })
  };
  const context = {
    console,
    document,
    localStorage: storage,
    location: { search: '?screen=customers', pathname: '/EasyStore/' },
    history: { back() {} },
    URL,
    URLSearchParams,
    confirm: () => true,
    setTimeout: () => 1,
    clearTimeout() {},
    addEventListener() {},
    TREND_API_URL: 'https://example.test/exec'
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'), context);
  return { context, screen };
}

(async () => {
  const finalApp = createApp('final');
  assert.match(finalApp.screen.innerHTML, /حسابات العملاء/);
  assert.match(finalApp.screen.innerHTML, /فتح الحساب/);
  await finalApp.context.ES27.openCustomerAccount(encodeURIComponent('عميل اختبار'));
  assert.match(finalApp.screen.innerHTML, /كشف حساب العميل/);
  assert.match(finalApp.screen.innerHTML, /تحصيل من العميل/);
  assert.doesNotMatch(finalApp.screen.innerHTML, /value="opening_debt"/);

  const adminApp = createApp('admin');
  await adminApp.context.ES27.openCustomerAccount(encodeURIComponent('عميل اختبار'));
  assert.match(adminApp.screen.innerHTML, /value="opening_debt"/);
  assert.match(adminApp.screen.innerHTML, /تسوية بالزيادة/);
  console.log('customer account V1915 UI tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
