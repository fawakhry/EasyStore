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

function createApp(role, screenName) {
  const screen = { innerHTML: '' };
  const app = {};
  Object.defineProperty(app, 'innerHTML', {
    get: () => app.html || '',
    set: value => { app.html = value; }
  });
  const users = {
    laser: { username: 'جابر', name: 'جابر', mode: 'laser', department: 'ليزر', token: 'token' },
    print: { username: 'وائل', name: 'وائل', mode: 'print', department: 'طباعة', token: 'token' },
    admin: { username: 'ضياء', name: 'ضياء', mode: 'full', token: 'token' },
    final: { username: 'رحمة', name: 'رحمة', mode: 'final', token: 'token' }
  };
  const data = {
    materials: [
      { materialName: 'خشب MDF', department: 'ليزر', recordType: 'material', active: 'نعم' },
      { materialName: 'رول طباعة', department: 'طباعة', recordType: 'material', active: 'نعم' }
    ],
    suppliers: [{ name: 'مورد اختبار' }],
    dailyPurchases: [
      { id: 'DPP-1', workDate: '2026-08-10', employee: 'جابر', department: 'ليزر', supplier: 'مورد ليزر', material: 'خشب MDF', qty: 2, unit: 50, total: 100, paymentType: 'نقدي', status: 'قيد مراجعة ضياء' },
      { id: 'DPP-2', workDate: '2026-08-10', employee: 'وائل', department: 'طباعة', supplier: 'مورد طباعة', material: 'رول طباعة', qty: 1, unit: 80, total: 80, paymentType: 'آجل', status: 'قيد مراجعة ضياء' }
    ]
  };
  const storage = makeStorage({
    MATBAGY_EMPLOYEE_SSO: JSON.stringify({ user: users[role] }),
    EASYSTORE_CLEAN_V1880_DATA: JSON.stringify(data)
  });
  const document = {
    body: { appendChild() {}, removeChild() {} },
    getElementById: id => id === 'app' ? app : id === 'screen' ? screen : null,
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => ({ parentNode: null })
  };
  const context = {
    console,
    document,
    localStorage: storage,
    location: { search: `?screen=${screenName}`, pathname: '/EasyStore/' },
    history: { back() {} },
    URL,
    URLSearchParams,
    Intl,
    confirm: () => true,
    setTimeout: () => 1,
    clearTimeout() {},
    addEventListener() {},
    TREND_API_URL: 'https://example.test/exec'
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'), context);
  return { context, screen, app };
}

const gaber = createApp('laser', 'deptPurchases');
assert.match(gaber.app.html, /مشتريات اليوم/);
assert.match(gaber.screen.innerHTML, /مشتريات جابر اليوم/);
assert.match(gaber.screen.innerHTML, /تسجيل وإرسال لضياء/);
assert.match(gaber.screen.innerHTML, /لن يزيد المخزون/);
assert.match(gaber.screen.innerHTML, /خشب MDF/);
assert.doesNotMatch(gaber.screen.innerHTML, /رول طباعة/);
assert.doesNotMatch(gaber.screen.innerHTML, /اعتماد مشتريات اليوم/);
gaber.context.ES27.go('dept');
assert.match(gaber.screen.innerHTML, /🧾 مشتريات اليوم/);

const wael = createApp('print', 'deptPurchases');
assert.match(wael.screen.innerHTML, /مشتريات وائل اليوم/);
assert.match(wael.screen.innerHTML, /رول طباعة/);

const admin = createApp('admin', 'purchase');
assert.match(admin.screen.innerHTML, /مشتريات جابر ووائل اليومية/);
assert.match(admin.screen.innerHTML, /اعتماد مشتريات اليوم/);
assert.match(admin.screen.innerHTML, /جابر/);
assert.match(admin.screen.innerHTML, /وائل/);
assert.match(admin.screen.innerHTML, /رفض/);
assert.match(admin.screen.innerHTML, /لن تدخل المشتريات الرسمية أو المخزون إلا بعد اعتمادك/);

const finalUser = createApp('final', 'deptPurchases');
assert.doesNotMatch(finalUser.screen.innerHTML, /تسجيل وإرسال لضياء/);

console.log('daily department purchases V1917 UI tests passed');
