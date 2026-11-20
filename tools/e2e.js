// End-to-end checks in headless Chrome. Usage: node tools/e2e.js http://127.0.0.1:18431
// Writes results to tests/e2e-results.json and screenshots to docs/screenshots/.
const puppeteer = require('puppeteer-core'), fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = process.argv[2] || 'http://127.0.0.1:18431';
const root = path.join(__dirname, '..');
const shots = path.join(root, 'tests', 'e2e-screenshots'); fs.mkdirSync(shots, { recursive: true });
const results = []; let failed = 0;
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); if (!ok) failed++; console.log((ok ? 'ok   - ' : 'FAIL - ') + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); };

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  // ---- 1. Learner file opened from disk with the network switched off ----
  const lessonFile = pathToFileURL(path.join(root, 'docs', 'lessons', 'frac-lesson.html')).href;
  const netRequests = [];
  page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) netRequests.push(r.url()); });
  await page.setOfflineMode(true);
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); // roughly a low-end phone
  const t0 = Date.now();
  await page.goto(lessonFile, { waitUntil: 'load' });
  await page.waitForSelector('#code');
  check('offline: lesson opens from file with network off (6x CPU throttle)', true, { ms: Date.now() - t0 });
  check('offline: no network requests made', netRequests.length === 0, netRequests);
  const fileBytes = fs.statSync(path.join(root, 'docs', 'lessons', 'frac-lesson.html')).size;
  check('size: lesson file under 20 KB', fileBytes < 20480, { bytes: fileBytes });
  await page.screenshot({ path: path.join(shots, 'learner-start.png') });

  // ---- 2. Keyboard only: answer question 1 wrong, question 2 right ----
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
  const stops = [];
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    stops.push(await page.evaluate(() => { const a = document.activeElement; return a.tagName + (a.type ? ':' + a.type : '') + ':' + (a.getAttribute('aria-label') || a.textContent || a.name || a.id || '').trim().slice(0, 30); }));
  }
  // Count distinct elements reached. A radio group is one Tab stop (arrow keys move inside it), as in native HTML.
  const reach = await page.evaluate(async () => {
    const els = [...document.querySelectorAll('button,a[href],input,select,summary')].filter(e => (e.getClientRects().length && !e.closest('details:not([open]) > :not(summary)')) || e.classList.contains('skip'));
    const keyOf = e => e.type === 'radio' ? 'radio:' + e.name : els.indexOf(e);
    return { expected: [...new Set(els.map(keyOf))].length, keys: els.map(keyOf) };
  });
  const reached = new Set();
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); });
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    reached.add(await page.evaluate(() => { const els = [...document.querySelectorAll('button,a[href],input,select,summary')].filter(e => (e.getClientRects().length && !e.closest('details:not([open]) > :not(summary)')) || e.classList.contains('skip')); const a = document.activeElement; return a.type === 'radio' ? 'radio:' + a.name : els.indexOf(a); }));
  }
  const missing = [...new Set(reach.keys)].filter(k => !reached.has(k));
  check('keyboard: every control reachable with Tab (radio group = one stop)', missing.length === 0, { expected: reach.expected, missing });
  // Focus is visible: outline width on a focused button
  const outline = await page.evaluate(() => { const b = document.querySelector('main button'); b.focus(); const s = getComputedStyle(b); return s.outlineStyle + ' ' + s.outlineWidth; });
  check('keyboard: focused control has a visible outline', /solid 3px/.test(outline), outline);

  async function tabTo(pred, max = 120) {
    for (let i = 0; i < max; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(pred)) return true; }
    return false;
  }
  await page.evaluate(() => document.querySelector('h1').focus());
  // Question 1 radios are name="r2". Tab lands on the group; arrow keys choose.
  await tabTo(() => document.activeElement.name === 'r2');
  await page.keyboard.press('Space');            // option 1 (wrong: 2/3)
  await tabTo(() => document.activeElement.textContent === 'Check answer');
  await page.keyboard.press('Enter');
  const fb1 = await page.$eval('#fb2', e => e.textContent);
  check('keyboard: wrong answer gives the hint for THAT option, not the answer', /Not yet/.test(fb1) && /adds 1 to the top/.test(fb1) && !/3\/6 is equal/.test(fb1), fb1);
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  await page.keyboard.press('ArrowDown');        // option 2 (right: 3/6)
  await tabTo(() => document.activeElement.textContent === 'Check answer');
  await page.keyboard.press('Enter');
  const fb1b = await page.$eval('#fb2', e => e.textContent);
  check('keyboard: corrected answer is accepted', /^Correct/.test(fb1b), fb1b);
  await tabTo(() => document.activeElement.name === 'r3');
  await page.keyboard.press('Space');            // option 1 (right: 4/10)
  await tabTo(() => document.activeElement.textContent === 'Check answer');
  await page.keyboard.press('Enter');
  const code1 = await page.$eval('#code', e => e.textContent);
  const bar = await page.evaluate(() => ({ v: document.getElementById('pbar').value, max: document.getElementById('pbar').max, txt: document.getElementById('ptext').textContent }));
  check('progress bar shows 2 of 4 answered', bar.v === 2 && bar.max === 4 && /2 \/ 4/.test(bar.txt), bar);
  check('default learner is asked to add a name before sending', await page.$eval('#namefirst', e => !e.hidden && /Add learner/.test(e.textContent)));
  check('progress code records FIRST tries (Q1 wrong=1, Q2 right=1)', /^FRAC-[A-Z0-9]+-1100-[0-9A-Z]$/.test(code1), code1);
  await page.screenshot({ path: path.join(shots, 'learner-feedback.png'), fullPage: true });

  // ---- 3. Progress survives closing and reopening (still offline) ----
  await page.goto('about:blank');
  await page.goto(lessonFile, { waitUntil: 'load' });
  await page.waitForSelector('#code');
  const code2 = await page.$eval('#code', e => e.textContent);
  check('storage: progress kept after reopening the file offline', code2 === code1, { before: code1, after: code2 });

  // ---- 4. Shared phone: second learner has separate progress ----
  await page.click('details summary');
  await page.type('#newwho', 'Amina');
  await page.keyboard.press('Enter');
  const codeAmina = await page.$eval('#code', e => e.textContent);
  const hint = await page.$eval('#namefirst', e => e.hidden);
  check('shared phone: new learner starts empty with own code name, name hint hidden', /^FRAC-AMI-0000-/.test(codeAmina) && hint, { codeAmina, hintHidden: hint });
  await page.select('#who', '0');
  const codeBack = await page.$eval('#code', e => e.textContent);
  check('shared phone: switching back restores first learner', codeBack === code1, codeBack);

  // ---- 5. Text size and high contrast persist ----
  await page.click('#hcb');
  await page.click('button[aria-label^="A+"]'); await page.click('button[aria-label^="A+"]');
  await page.goto(lessonFile, { waitUntil: 'load' });
  const prefs = await page.evaluate(() => ({ hc: document.body.classList.contains('hc'), fs: getComputedStyle(document.body).fontSize, pressed: document.getElementById('hcb').getAttribute('aria-pressed') }));
  check('display: high contrast and larger text are remembered', prefs.hc && prefs.fs === '22px' && prefs.pressed === 'true', prefs);
  await page.screenshot({ path: path.join(shots, 'learner-high-contrast.png') });

  // ---- 6. Screen-reader view: accessibility tree names ----
  const ax = await page.accessibility.snapshot({ interestingOnly: true });
  const flat = []; (function walk(n) { if (!n) return; flat.push({ role: n.role, name: n.name }); (n.children || []).forEach(walk); })(ax);
  const unnamed = flat.filter(n => ['button', 'radio', 'combobox', 'link', 'textbox', 'checkbox'].includes(n.role) && !n.name);
  check('screen reader: every control has an accessible name', unnamed.length === 0, unnamed);
  const groupNames = [];
  for (const fsEl of await page.$$('fieldset')) {
    const n = await page.accessibility.snapshot({ root: fsEl, interestingOnly: false });
    groupNames.push(n && n.role + ': ' + n.name);
  }
  check('screen reader: each question is a named group ("Question n of N: …")', groupNames.length === 4 && groupNames.every(g => /^group: Question \d of 4: /.test(g)), groupNames);
  fs.mkdirSync(path.join(root, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tests', 'ax-tree-frac.json'), JSON.stringify(flat, null, 1));

  // ---- 6b. Second wrong try reveals the explanation; finish card; practice the missed ones ----
  const p4 = await browser.newPage();
  await p4.setViewport({ width: 360, height: 740, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await p4.goto(pathToFileURL(path.join(root, 'docs', 'lessons', 'water-lesson.html')).href, { waitUntil: 'load' });
  const ans = async (name, val) => { await p4.click('input[name=' + name + '][value="' + val + '"]'); await p4.evaluate(n => document.querySelector('input[name=' + n + ']').closest('fieldset').querySelector('button:not(.ghost)').click(), name); };
  await ans('r3', 0); const w1 = await p4.$eval('#fb3', e => e.textContent);
  await ans('r3', 2); const w2 = await p4.$eval('#fb3', e => e.textContent);
  check('second wrong try adds the full explanation', !/liquid water turning into a gas/.test(w1) && /precipitation/.test(w2) && /liquid water turning into a gas/.test(w2), { w1, w2 });
  const doneHidden = await p4.$eval('#done', e => e.hidden);
  await ans('r4', 0); await ans('r5', 2); await ans('r6', 1);
  const done = await p4.evaluate(() => ({ hidden: document.getElementById('done').hidden, score: document.getElementById('score').textContent, btn: document.getElementById('practiceBtn').textContent }));
  check('finish card appears only when all questions are answered, with first-try score', doneHidden && !done.hidden && /^2 of 4 right on the first try/.test(done.score) && /\(2\)/.test(done.btn), done);
  const codeBefore = await p4.$eval('#code', e => e.textContent);
  await p4.click('#practiceBtn');
  const prq = [];
  for (let k = 0; k < 2; k++) {
    prq.push(await p4.$eval('#prq', e => e.textContent));
    // pick the right option by the lesson data, so the shuffled order does not matter
    await p4.evaluate(() => { const L = JSON.parse(document.getElementById('lesson').textContent); const qt = document.getElementById('prq').textContent.replace(/^[^:]*: /, ''); const st = L.steps.find(x => x.b === qt); document.querySelector('#practice input[value="' + st.a + '"]').click(); [...document.querySelectorAll('#practice button')].find(b => !b.hidden && /Check/.test(b.textContent)).click(); });
    await p4.evaluate(() => [...document.querySelectorAll('#practice button')].find(b => !b.hidden && /Next/.test(b.textContent)).click());
  }
  const prDone = await p4.$eval('#practice', e => e.textContent);
  const codeAfter = await p4.$eval('#code', e => e.textContent);
  check('practice asks exactly the missed questions and does not change the code', /Question 1 of 2/.test(prq[0]) && /Question 2 of 2/.test(prq[1]) && /Right this time: 2 of 2/.test(prDone) && codeBefore === codeAfter, { prq, prDone, codeBefore, codeAfter });
  await p4.close();

  // ---- 7. Storage blocked (some in-app chat browsers) → warning, lesson still works ----
  const p2 = await browser.newPage();
  await p2.evaluateOnNewDocument(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await p2.goto(lessonFile, { waitUntil: 'load' });
  const warn = await p2.$eval('#status', e => e.textContent);
  await p2.click('input[name=r2][value="1"]');
  await p2.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Check answer').click());
  const fbBlocked = await p2.$eval('#fb2', e => e.textContent);
  check('storage blocked: learner is warned and questions still work', /cannot save/.test(warn) && /^Correct/.test(fbBlocked), { warn, fbBlocked });
  await p2.close();

  // ---- 8. Spanish lesson uses Spanish interface ----
  await page.goto(pathToFileURL(path.join(root, 'docs', 'lessons', 'foto-lesson.html')).href, { waitUntil: 'load' });
  const es = await page.evaluate(() => ({ lang: document.documentElement.lang, btn: document.querySelector('main button').textContent, send: document.getElementById('sendh').textContent }));
  check('language: Spanish lesson shows Spanish controls and lang="es"', es.lang === 'es' && es.btn === 'Leer en voz alta', es);

  // ---- 9. Teacher loop: editor decodes codes from several learners ----
  await page.setOfflineMode(false);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.setViewport({ width: 1100, height: 900 });
  await page.goto(base + '/index.html', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  const sizeText = await page.$eval('#size', e => e.textContent);
  check('editor: shows exported file size', /Lesson file size: \d+\.\d KB/.test(sizeText), sizeText);
  // Make two more learner codes with the runtime's own encoder.
  const codes = await page.evaluate(() => {
    const L = LP_SAMPLES[0], q = L.steps.map((s, i) => s.t === 'q' ? i : -1).filter(i => i >= 0);
    return [lpEncode('FRAC', 'BEN', { [q[0]]: 1, [q[1]]: 0, [q[2]]: 0, [q[3]]: 0 }, q), lpEncode('FRAC', 'CHI', { [q[0]]: 1, [q[1]]: 1, [q[2]]: 0, [q[3]]: 1 }, q)];
  });
  const sms = `From +0000: Fractions ${code1}\nFrom +0001: Fractions ${codes[0]}\nFrom +0002: fractions ${codes[1].toLowerCase()}\nFrom +0003: Fractions FRAC-ZZZ-1111-0`;
  await page.type('#sms', sms);
  await page.click('#decode');
  const table = await page.$$eval('#results tr', trs => trs.map(tr => [...tr.children].map(c => c.textContent)));
  const errs = await page.$$eval('#results li', li => li.map(x => x.textContent));
  check('editor: decodes 3 learners into a table with class % row', table.length === 5 && table[4][0] === 'Class correct', table);
  check('editor: mistyped code is listed, not counted', errs.length === 1 && /typo/.test(errs[0]), errs);
  const fu = await page.$$eval('#results .fu', ds => ds.map(d => ({ h: d.querySelector('h4').textContent, msgs: [...d.querySelectorAll('.msg')].map(m => m.textContent) })));
  const q1 = fu.find(x => /^Question 1 /.test(x.h));
  check("follow-up plan: groups learners by wrong answer with that answer's hint", q1 && q1.msgs.some(m => /\(LEA\)/.test(m) && /chose "2\/3"/.test(m) && /adds 1 to the top/.test(m)), fu);
  const lens = fu.flatMap(x => x.msgs.map(m => m.length));
  check('follow-up plan: every sample message fits in one SMS (160 characters)', lens.length > 0 && lens.every(n => n <= 160), lens);
  const q4 = fu.find(x => /^Question 4 /.test(x.h));
  check('follow-up plan: hardest question listed first, unanswered learners get a finish reminder', /^Question 4 /.test(fu[0].h) && q4.msgs.some(m => /\(LEA\): you have not answered question 4/.test(m)), fu.map(x => x.h));
  await page.screenshot({ path: path.join(shots, 'teacher-results.png'), fullPage: false, clip: await page.$eval('#resultsH', e => { const r = e.getBoundingClientRect(); return { x: 0, y: r.top + window.scrollY - 10, width: 1100, height: 520 }; }) });

  // Hint fields for wrong options and the "Try as a learner" button
  await page.evaluate(() => window.scrollTo(0, 0));
  const hintFields = await page.$$eval('#s2m input', ins => ins.map(i => ({ id: i.id, label: document.querySelector('label[for="' + i.id + '"]').textContent })));
  check('editor: one hint field per wrong option, labelled with that option', hintFields.length === 2 && /2\/3/.test(hintFields[0].label) && /1\/4/.test(hintFields[1].label), hintFields);
  await page.click('#tryLearner');
  const fr = await (await page.$('#frame')).contentFrame();
  await fr.waitForSelector('#code');
  const pv = await fr.evaluate(() => ({ status: document.getElementById('status').textContent, h1: document.querySelector('h1').textContent }));
  check('editor: "Try a lesson as a learner" opens the preview without a storage warning', pv.h1 === 'Equivalent fractions' && pv.status === '', pv);
  await page.click('#closeDlg');

  // Editor validation blocks broken lessons
  await page.click('#newLesson');
  const disabled = await page.$eval('#download', b => b.disabled);
  const probs = await page.$$eval('#problems li', l => l.length);
  check('editor: empty lesson cannot be exported and problems are listed', disabled && probs >= 3, { disabled, probs });
  await page.click('#loadSample');
  await page.screenshot({ path: path.join(shots, 'teacher-editor.png') });

  // Editor keyboard + names
  const eax = await page.accessibility.snapshot({ interestingOnly: true });
  const ef = []; (function walk(n) { if (!n) return; ef.push({ role: n.role, name: n.name }); (n.children || []).forEach(walk); })(eax);
  const eUnnamed = ef.filter(n => ['button', 'combobox', 'link', 'textbox'].includes(n.role) && !n.name);
  check('editor screen reader: every control has an accessible name', eUnnamed.length === 0, eUnnamed);

  // ---- 10. Single-file offline editor: works from disk with network off, exports a lesson ----
  const p3 = await browser.newPage();
  const net3 = []; p3.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) net3.push(r.url()); });
  await p3.setOfflineMode(true);
  const dl = path.join(root, 'tests', 'download-check'); fs.rmSync(dl, { recursive: true, force: true }); fs.mkdirSync(dl, { recursive: true });
  const c3 = await p3.createCDPSession();
  await c3.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
  await p3.goto(pathToFileURL(path.join(root, 'docs', 'lesson-parcel-editor.html')).href, { waitUntil: 'load' });
  const same = await p3.evaluate(() => buildParcel(LP_SAMPLES[1]));
  check('offline editor: builds byte-identical lessons to the published ones', same === fs.readFileSync(path.join(root, 'docs', 'lessons', 'water-lesson.html'), 'utf8'));
  await p3.select('#sampleSel', '1'); await p3.click('#loadSample'); await p3.click('#download');
  let got = null; for (let i = 0; i < 40 && !got; i++) { await new Promise(r => setTimeout(r, 100)); got = fs.readdirSync(dl).find(f => f.endsWith('.html')); }
  const gotText = got ? fs.readFileSync(path.join(dl, got), 'utf8') : '';
  check('offline editor: downloads water-lesson.html with network off, no requests', got === 'water-lesson.html' && /The water cycle/.test(gotText) && net3.length === 0, { got, bytes: gotText.length, net3 });
  fs.rmSync(dl, { recursive: true, force: true });
  await p3.close();

  await browser.close();
  fs.writeFileSync(path.join(root, 'tests', 'e2e-results.json'), JSON.stringify({ date: new Date().toISOString(), chrome: CHROME, results }, null, 1));
  console.log(failed ? `${failed} FAILED` : `all ${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
