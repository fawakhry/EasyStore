// A2.13 emergency CLOSE for the staged frontend. NOT a deployment or D1 mutation.
// Requires an explicit --write; reads/writes only the supplied config.js copy.
// Backend READONLY cleanup is managed independently by the TrendOS execution workflow.
import fs from 'node:fs';
import path from 'node:path';

export function renderA213OffConfig(source) {
  if (typeof source !== 'string') throw new TypeError('Expected config text');
  const readonly = /window\.EASYSTORE_ACCOUNTING_D1_READONLY\s*=\s*true\s*;/;
  const noGeneral = /window\.EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false\s*;/;
  const mode = /window\.EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'([^']+)'\s*;/g;
  const actions = /window\.EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*(\[[^;\n]*\])\s*;/g;
  const modeMatches = [...source.matchAll(mode)];
  const actionMatches = [...source.matchAll(actions)];
  if (!readonly.test(source) || !noGeneral.test(source)) {
    throw new Error('A213_CLOSE_BLOCKED: source is not D1 READONLY and general-writes false');
  }
  if (modeMatches.length !== 1 || actionMatches.length !== 1) {
    throw new Error('A213_CLOSE_BLOCKED: missing/duplicate config settings');
  }
  const oldMode = modeMatches[0][1];
  const oldActions = actionMatches[0][1].trim();
  const safeOff = oldMode === 'OFF' && oldActions === '[]';
  const exactPilot = oldMode === 'CANARY' && oldActions === "['closePurchaseCustodyV1920']";
  if (!safeOff && !exactPilot) {
    throw new Error('A213_CLOSE_BLOCKED: unexpected mode/allowlist, manual reconciliation required');
  }
  if (safeOff) return source;
  return source
    .replace(mode, "window.EASYSTORE_ACCOUNTING_D1_WRITE_MODE = 'OFF';")
    .replace(actions, 'window.EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS = [];');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const [flag,file] = process.argv.slice(2);
  if (flag !== '--write' || !file) {
    console.error('A213_CLOSE_NOT_EXECUTED: explicit --write <config.js> required');
    process.exitCode=2;
  } else {
    const existing=fs.readFileSync(file,'utf8');
    const closed=renderA213OffConfig(existing);
    if (closed !== existing) fs.writeFileSync(file,closed,'utf8');
    const confirmed=fs.readFileSync(file,'utf8');
    if (confirmed !== renderA213OffConfig(confirmed)) throw Error('A213_CLOSE_VERIFY_FAILED');
    console.log('A213_FRONTEND_OFF_CONFIRMED=PASS');
    console.log('A213_GENERAL_WRITES_DISABLED=PASS');
    console.log('A213_D1_PRODUCTION_CHANGED=NO');
  }
}
