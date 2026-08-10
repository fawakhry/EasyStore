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
  const users = {
    admin: { username: 'ضياء', name: 'ضياء', mode: 'full', token: 'token' },
    final: { username: 'رحمة', name: 'رحمة', mode: 'final', token: 'token' }
  };
  const data = {
    materials: [
      { materialName: 'خشب ليزر خاص', department: 'ليزر', recordType: 'material', active: 'نعم', stockQty: 1, minStock: 5 },
      { materialName: 'رول طباعة خاص', department: 'طباعة', recordType: 'material', active: 'نعم', stockQty: 2, minStock: 5 },
      { materialName: 'لاصق مشترك', department: 'مشترك', recordType: 'material', active: 'نعم', stockQty: 8, minStock: 2 },
      { materialName: 'كهرباء الليزر', department: 'ليزر', recordType: 'material', active: 'نعم', materialClass: 'مصروف تشغيل', operatingUnitCost: 10 },
      { materialName: 'كهرباء الطباعة', department: 'طباعة', recordType: 'material', active: 'نعم', materialClass: 'مصروف تشغيل', operatingUnitCost: 20 }
    ],
    templates: [
      { itemName: 'صنف ليزر خاص', department: 'ليزر', recordType: 'template', active: 'نعم', salePrice: 100, fixedCost: 40 },
      { itemName: 'صنف طباعة خاص', department: 'طباعة', recordType: 'template', active: 'نعم', salePrice: 90, fixedCost: 30 }
    ],
    suppliers: [{ name: 'مورد موحد' }],
    purchases: [
      { invoiceNo: 'L-PUR-1', department: 'ليزر', supplier: 'مورد الليزر', material: 'خشب ليزر خاص', qty: 1, total: 100, paid: 100, remain: 0 },
      { invoiceNo: 'P-PUR-1', department: 'طباعة', supplier: 'مورد الطباعة', material: 'رول طباعة خاص', qty: 1, total: 200, paid: 200, remain: 0 }
    ],
    dailyPurchases: [
      { id: 'DPP-L', workDate: '2026-08-10', employee: 'جابر', department: 'ليزر', supplier: 'مورد الليزر اليومي', material: 'خشب ليزر خاص', qty: 1, unit: 50, total: 50, status: 'قيد مراجعة ضياء' },
      { id: 'DPP-P', workDate: '2026-08-10', employee: 'وائل', department: 'طباعة', supplier: 'مورد الطباعة اليومي', material: 'رول طباعة خاص', qty: 1, unit: 70, total: 70, status: 'قيد مراجعة ضياء' }
    ],
    sales: [{ invoiceNo: 'UNIFIED-1', customer: 'عميل موحد', total: 1200 }],
    deptLines: [
      { id: 'DL-L', department: 'ليزر', itemName: 'صنف ليزر خاص', qty: 1, sale: 500, lineTotal: 500, invoiceNo: 'FINAL-L' },
      { id: 'DL-P', department: 'طباعة', itemName: 'صنف طباعة خاص', qty: 1, sale: 700, lineTotal: 700, invoiceNo: 'FINAL-P' }
    ],
    wasteLines: [
      { department: 'ليزر', orderId: '1', reason: 'هالك ليزر', amount: 30 },
      { department: 'طباعة', orderId: '2', reason: 'هالك طباعة', amount: 40 }
    ],
    stockMoves: [
      { department: 'ليزر', materialName: 'خشب ليزر خاص', inQty: 1, source: 'حركة ليزر' },
      { department: 'طباعة', materialName: 'رول طباعة خاص', inQty: 1, source: 'حركة طباعة' }
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
    location: { search: '?screen=dashboard', pathname: '/EasyStore/' },
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
  return { context, screen, app, storage };
}

const admin = createApp('admin');
assert.match(admin.app.html, /طريقة عرض الحسابات/);
assert.match(admin.app.html, /كل الأقسام/);
assert.match(admin.app.html, /قسم الليزر/);
assert.match(admin.app.html, /قسم الطباعة/);

admin.context.ES27.setAccountingScope('laser');
assert.strictEqual(admin.storage.getItem('EASYSTORE_ACCOUNTING_SCOPE_V1918'), 'laser');
assert.match(admin.screen.innerHTML, /لوحة الحسابات · قسم الليزر/);
assert.match(admin.screen.innerHTML, /خشب ليزر خاص/);
assert.doesNotMatch(admin.screen.innerHTML, /رول طباعة خاص/);

admin.context.ES27.go('purchase');
assert.match(admin.screen.innerHTML, /مشتريات جابر ووائل اليومية · قسم الليزر/);
assert.match(admin.screen.innerHTML, /جابر/);
assert.match(admin.screen.innerHTML, /مورد الليزر اليومي/);
assert.match(admin.screen.innerHTML, /L-PUR-1/);
assert.doesNotMatch(admin.screen.innerHTML, /مورد الطباعة اليومي/);
assert.doesNotMatch(admin.screen.innerHTML, /P-PUR-1/);
assert.doesNotMatch(admin.screen.innerHTML, /رول طباعة خاص/);

admin.context.ES27.go('kitchen');
assert.match(admin.screen.innerHTML, /خشب ليزر خاص/);
assert.match(admin.screen.innerHTML, /لاصق مشترك/);
assert.doesNotMatch(admin.screen.innerHTML, /رول طباعة خاص/);

admin.context.ES27.go('reports');
assert.match(admin.screen.innerHTML, /التقارير والأرباح · قسم الليزر/);
assert.match(admin.screen.innerHTML, /FINAL-L/);
assert.doesNotMatch(admin.screen.innerHTML, /FINAL-P/);
assert.match(admin.screen.innerHTML, /كهرباء الليزر/);
assert.doesNotMatch(admin.screen.innerHTML, /كهرباء الطباعة/);

admin.context.ES27.setAccountingScope('print');
admin.context.ES27.go('stock');
assert.match(admin.screen.innerHTML, /المخزون · قسم الطباعة/);
assert.match(admin.screen.innerHTML, /رول طباعة خاص/);
assert.match(admin.screen.innerHTML, /لاصق مشترك/);
assert.doesNotMatch(admin.screen.innerHTML, /خشب ليزر خاص/);

admin.context.ES27.go('purchase');
assert.match(admin.screen.innerHTML, /وائل/);
assert.match(admin.screen.innerHTML, /P-PUR-1/);
assert.doesNotMatch(admin.screen.innerHTML, /مورد الليزر اليومي/);

admin.context.ES27.setAccountingScope('all');
admin.context.ES27.go('purchase');
assert.match(admin.screen.innerHTML, /L-PUR-1/);
assert.match(admin.screen.innerHTML, /P-PUR-1/);

const finalUser = createApp('final');
assert.doesNotMatch(finalUser.app.html, /طريقة عرض الحسابات/);

const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
assert.match(appSource, /department:val\('puDept'\)\|\|accountingScopeDepartment\(\)/);
assert.match(appSource, /اختار قسم الليزر أو الطباعة أولًا/);

console.log('department accounting scope V1918 tests passed');
