#!/usr/bin/env node
/*
  build-study.js — builds the verification-audit inventory, worksheets, keys and order
  from the FROZEN library at tag v0.18.0-audit. Protocol v2.1, section 5.1 and 8.
  No dependencies. Node 18+.

  Usage (from repo root):  node study/scripts/build-study.js
  Reads:  study/input/regimens.v0.18.0-audit.js   (extracted from the tag; hash-checked)
  Writes: study/inventory.csv, study/order.csv, study/pathway-log.csv,
          study/worksheets/{all,batch-1..6}.csv, study/keys/batch-1..6.csv,
          study/loop-partition.csv, study/HASHES.txt, study/counts.json
*/
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const INPUT = path.join(ROOT, 'input', 'regimens.v0.18.0-audit.js');
const EXPECTED_SHA256 = '87374d6a3e2e6fe54b07d70ac44ea43bbe253d232989ba7718512d4d3a2f5dde';
const TAG = 'v0.18.0-audit';
const COMMIT = 'af9f4deb25e34d208d8486cd4450d2beb38693c9';
const SEED = 20260919;
const BATCH_SIZE = 10;
const CHAT_LOOP_END = '2026-09-01T08:32:00Z';   // last build in the chat loop (method of record 10.3)
const CLAUDE_CODE_START = '2026-09-01T12:49:00Z'; // "I am already using claude code"
const LOOP_CUTOFF = '2026-09-01T12:00:00Z';

// Expected counts from the tagged file (protocol v2.1, 5.1). The script STOPS if they differ.
const EXPECTED = { agents:201, cycle_length:94, n_cycles:94, visit_days:27, duration:49, interval_duration:82,
                   frequency_text:41, procedure_identity:51, decision_condition:15, branch_set:15, sequence:60,
                   schedule:547, total:729, pathways:60 };

// ---------- load the frozen library ----------
const src = fs.readFileSync(INPUT, 'utf8');
const sha = crypto.createHash('sha256').update(src).digest('hex');
if (sha !== EXPECTED_SHA256) {
  console.error(`STOP: ${INPUT} sha256 ${sha} does not match the tagged file ${EXPECTED_SHA256}. Re-extract with: git show ${TAG}:regimens.js > study/input/regimens.v0.18.0-audit.js`);
  process.exit(1);
}
const mod = { exports: {} };
new Function('module', 'exports', src + '\nmodule.exports={LIBRARY,APP_VERSION};')(mod, mod.exports);
const { LIBRARY, APP_VERSION } = mod.exports;
if (APP_VERSION !== '0.18.0' || LIBRARY.length !== 60) { console.error('STOP: not the v0.18.0 library'); process.exit(1); }

const MOD_LABEL = { chemo:'Chemotherapy', io:'Immunotherapy', targeted:'Targeted therapy', endocrine:'Hormone (endocrine) therapy', radiation:'Radiation', surgery:'Surgery', watch:'Surveillance' };
const blank = v => v === '' || v === undefined || v === null;
const labels = mods => (mods || []).map(m => MOD_LABEL[m] || m).join('; ');

// ---------- inventory ----------
const rows = [];   // {pathway_id, node_ref, element_type, element_name, mods, mode, flags, assertion_class, schedule_bearing, library_value}
function flagsOf(n) {
  const f = [];
  if (n.optional) f.push('optional');
  if (n.on === false) f.push('off by default');
  if (n.concurrent) f.push('concurrent');
  if (n.openEnded) f.push('open-ended');
  return f.join('; ');
}
let phaseCounter = 0, decisionCounter = 0;
function add(p, ref, n, etype, cls, sched, value, slot) {
  rows.push({ pathway_id: p.id, node_ref: ref, element_type: etype, element_name: n.name || '', slot, mods: labels(n.mods), mode: n.mode || '',
              flags: flagsOf(n), assertion_class: cls, schedule_bearing: sched ? 'Y' : 'N', library_value: value });
}
function walk(p, nodes, prefix, branchCond) {
  nodes.forEach((n, i) => {
    const ref = `${prefix}n${i}`;
    const inBranch = branchCond ? ` [branch: ${branchCond}]` : '';
    if (n.t === 'phase') {
      phaseCounter++;
      const slot = `Phase ${phaseCounter} (${labels(n.mods)}; ${n.mode})${branchCond ? ' [branch: ' + branchCond + ']' : ''}`;
      const agentsVal = `${n.name}${n.short ? ' [' + n.short + ']' : ''} {${labels(n.mods)}}${inBranch}`;
      add(p, ref, n, 'phase', 'agents', true, agentsVal, slot);
      if (n.mode === 'cycles') {
        add(p, ref, n, 'phase', 'cycle_length', true, `${n.cycleDays} days`, slot);
        add(p, ref, n, 'phase', 'n_cycles', true, `${n.cycles}`, slot);
        if (Array.isArray(n.visits) && n.visits.length) add(p, ref, n, 'phase', 'visit_days', true, n.visits.map(v => `day ${v.d}: ${v.label}`).join(' | '), slot);
      } else if (n.mode === 'daily' || n.mode === 'weekdays') {
        if (!blank(n.weeks)) add(p, ref, n, 'phase', 'duration', true, `${n.weeks} weeks (${n.mode})`, slot);
        // radiation with weeks:'' is left blank by design: no assertion (protocol 5.1)
      }
      // ongoing (open-ended) phases carry a display length, not a duration claim: no duration assertion
      if (n.freqText) add(p, ref, n, 'phase', 'frequency_text', false, n.freqText, slot);
    } else if (n.t === 'rest') {
      if (!blank(n.weeks)) add(p, ref, n, 'interval', 'interval_duration', true, `${n.weeks} weeks (${n.name})${inBranch}`, `Interval: ${n.name}${inBranch}`);
    } else if (n.t === 'event') {
      add(p, ref, n, 'procedure', 'procedure_identity', false, `${n.name} {${labels(n.mods)}}${inBranch}`, `Procedure (${labels(n.mods)})${inBranch}`);
    } else if (n.t === 'decision') {
      decisionCounter++;
      add(p, ref, n, 'decision', 'decision_condition', false, `${n.question || n.name}${inBranch}`, `Decision ${decisionCounter}${inBranch}`);
      add(p, ref, n, 'decision', 'branch_set', false, n.branches.map(b => b.cond).join(' | '), `Decision ${decisionCounter}${inBranch}`);
      n.branches.forEach((b, bi) => walk(p, b.nodes || [], `${ref}.b${bi}.`, b.cond));
    }
  });
}
function sequenceOf(nodes) {
  return nodes.map(n => n.t === 'decision'
    ? `Decision(${n.name}){${n.branches.map(b => `${b.cond}: [${sequenceOf(b.nodes || [])}]`).join('; ')}}`
    : `${n.name}`).join(' -> ');
}
for (const p of LIBRARY) {
  phaseCounter = 0; decisionCounter = 0;
  walk(p, p.nodes, '', null);
  rows.push({ pathway_id: p.id, node_ref: 'pathway', element_type: 'pathway', element_name: p.name, slot: 'Sequence of steps', mods: '', mode: '', flags: '',
              assertion_class: 'sequence', schedule_bearing: 'N', library_value: sequenceOf(p.nodes) });
}

// ---------- counts, and stop if they differ ----------
const counts = {};
for (const r of rows) counts[r.assertion_class] = (counts[r.assertion_class] || 0) + 1;
counts.schedule = rows.filter(r => r.schedule_bearing === 'Y').length;
counts.total = rows.length;
counts.pathways = LIBRARY.length;
const diffs = Object.keys(EXPECTED).filter(k => counts[k] !== EXPECTED[k]);
if (diffs.length) {
  console.error('STOP: inventory counts differ from protocol v2.1 expectations. Do not adjust the rule to fit; report this.');
  console.error(JSON.stringify({ expected: EXPECTED, got: counts }, null, 2));
  process.exit(1);
}

// ---------- order: clinical-use blocks, seeded random within block ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(SEED);
const BLOCKS = ['breast', 'gi', 'lung', 'gu', 'hn', 'skin', 'gyn']; // protocol 8, step 3
const ordered = [];
for (const d of BLOCKS) {
  const ids = LIBRARY.filter(p => p.disease === d).map(p => p.id).sort();
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  ids.forEach(id => ordered.push(id));
}
if (ordered.length !== 60) { console.error('STOP: a pathway has a disease value outside the block list'); process.exit(1); }
const orderOf = {}; ordered.forEach((id, i) => { orderOf[id] = { order: i + 1, batch: Math.floor(i / BATCH_SIZE) + 1 }; });

// ---------- loop partition from git history ----------
const partition = [];
for (const p of LIBRARY) {
  let firstCommit = '', firstDate = '', loop = 'unknown';
  try {
    const out = execSync(`git log --reverse --format='%H %cI' -S"id:'${p.id}'" -- regimens.js`, { cwd: path.resolve(ROOT, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n')[0] || '';
    [firstCommit, firstDate] = out.split(' ');
    if (firstDate) {
      loop = firstDate < LOOP_CUTOFF ? 'chat' : 'claude-code';
      if (firstDate >= CHAT_LOOP_END && firstDate <= CLAUDE_CODE_START) loop += ' (ambiguous window: confirm)';
    }
  } catch (e) { /* leave unknown */ }
  partition.push({ pathway_id: p.id, added: p.added, first_commit: firstCommit, first_commit_date: firstDate, generation_loop: loop });
}

// ---------- write files ----------
const csv = (header, objs) => [header.join(','), ...objs.map(o => header.map(h => {
  const v = o[h] === undefined || o[h] === null ? '' : String(o[h]);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}).join(','))].join('\n') + '\n';
const mk = d => fs.mkdirSync(path.join(ROOT, d), { recursive: true });
['worksheets', 'keys'].forEach(mk);

const meta = Object.fromEntries(LIBRARY.map(p => [p.id, p]));
const full = rows.map(r => {
  const p = meta[r.pathway_id]; const o = orderOf[r.pathway_id];
  return { order: o.order, batch: o.batch, pathway_id: r.pathway_id, pathway_name: p.name, trial: p.trial || '', disease: p.disease, group: p.group,
           node_ref: r.node_ref, element_type: r.element_type, element_name: r.element_name, slot: r.slot, mods: r.mods, mode: r.mode, flags: r.flags,
           assertion_id: `${r.pathway_id}:${r.node_ref}:${r.assertion_class}`, assertion_class: r.assertion_class, schedule_bearing: r.schedule_bearing,
           source_value: '', source_used: '', source_depth: '', locator: '', date_consulted: '', library_value: r.library_value, classification: '', note: '' };
}).sort((a, b) => a.order - b.order || a.node_ref.localeCompare(b.node_ref, undefined, { numeric: true }));

const INV_H = ['assertion_id', 'pathway_id', 'node_ref', 'element_type', 'element_name', 'slot', 'mods', 'mode', 'flags', 'assertion_class', 'schedule_bearing', 'library_value'];
fs.writeFileSync(path.join(ROOT, 'inventory.csv'), csv(INV_H, full));

const WS_H = ['order', 'batch', 'pathway_id', 'pathway_name', 'trial', 'disease', 'group', 'node_ref', 'element_type', 'slot', 'mods', 'mode', 'flags',
              'assertion_id', 'assertion_class', 'schedule_bearing', 'source_value', 'source_used', 'source_depth', 'locator', 'date_consulted', 'library_value', 'classification', 'note'];
const hidden = full.map(r => ({ ...r, library_value: '' }));
fs.writeFileSync(path.join(ROOT, 'worksheets', 'all.csv'), csv(WS_H, hidden));
const KEY_H = ['order', 'batch', 'pathway_id', 'assertion_id', 'assertion_class', 'element_name', 'library_value'];
const nBatches = Math.ceil(60 / BATCH_SIZE);
for (let b = 1; b <= nBatches; b++) {
  fs.writeFileSync(path.join(ROOT, 'worksheets', `batch-${b}.csv`), csv(WS_H, hidden.filter(r => r.batch === b)));
  fs.writeFileSync(path.join(ROOT, 'keys', `batch-${b}.csv`), csv(KEY_H, full.filter(r => r.batch === b)));
}

fs.writeFileSync(path.join(ROOT, 'order.csv'), csv(['order', 'batch', 'pathway_id', 'disease', 'group', 'pathway_name', 'n_schedule_assertions', 'n_all_assertions'],
  ordered.map(id => ({ order: orderOf[id].order, batch: orderOf[id].batch, pathway_id: id, disease: meta[id].disease, group: meta[id].group, pathway_name: meta[id].name,
                       n_schedule_assertions: full.filter(r => r.pathway_id === id && r.schedule_bearing === 'Y').length, n_all_assertions: full.filter(r => r.pathway_id === id).length }))));

fs.writeFileSync(path.join(ROOT, 'pathway-log.csv'), csv(['order', 'batch', 'pathway_id', 'pathway_name', 'trial', 'library_refs', 'sources_done_at', 'key_opened_at', 'minutes_spent', 'access_problems', 'reviewer'],
  ordered.map(id => ({ order: orderOf[id].order, batch: orderOf[id].batch, pathway_id: id, pathway_name: meta[id].name, trial: meta[id].trial || '',
                       library_refs: (meta[id].refs || []).map(r => r.t).join(' || '), sources_done_at: '', key_opened_at: '', minutes_spent: '', access_problems: '', reviewer: '' }))));

fs.writeFileSync(path.join(ROOT, 'loop-partition.csv'), csv(['pathway_id', 'added', 'first_commit', 'first_commit_date', 'generation_loop'], partition));
fs.writeFileSync(path.join(ROOT, 'counts.json'), JSON.stringify({ tag: TAG, commit: COMMIT, input_sha256: sha, seed: SEED, batch_size: BATCH_SIZE, counts }, null, 2) + '\n');

// ---------- hashes ----------
const h = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
const files = ['inventory.csv', 'order.csv', 'pathway-log.csv', 'loop-partition.csv', 'counts.json', 'worksheets/all.csv',
  ...Array.from({ length: nBatches }, (_, i) => `worksheets/batch-${i + 1}.csv`), ...Array.from({ length: nBatches }, (_, i) => `keys/batch-${i + 1}.csv`)];
fs.writeFileSync(path.join(ROOT, 'HASHES.txt'), `# sha256, built from ${TAG} (${COMMIT}); input regimens.js ${sha}; seed ${SEED}\n` + files.map(f => `${h(f)}  ${f}`).join('\n') + '\n');

console.log(JSON.stringify(counts));
console.log('order:', ordered.join(' '));
console.log('loop partition:', JSON.stringify(partition.reduce((a, p) => { a[p.generation_loop] = (a[p.generation_loop] || 0) + 1; return a; }, {})));
console.log('written under study/. Keys in study/keys/ must be zipped with passwords and the plain CSVs deleted before commit (brief item 5).');
