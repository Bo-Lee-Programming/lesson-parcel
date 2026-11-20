// Screenshots for the Devpost gallery and the before/after comparison.
// Usage: node tools/shots.js http://127.0.0.1:18431
// Raw shots -> docs/screenshots/raw/, gallery (1500x1000) -> docs/screenshots/gallery-*.png,
// comparisons -> docs/screenshots/compare-*.png (uses docs/screenshots/before/ from the 11-09 version).
const puppeteer = require('puppeteer-core'), fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = process.argv[2] || 'http://127.0.0.1:18431';
const root = path.join(__dirname, '..'), out = path.join(root, 'docs', 'screenshots'), raw = path.join(out, 'raw'), before = path.join(out, 'before');
fs.mkdirSync(raw, { recursive: true });
const lesson = n => pathToFileURL(path.join(root, 'docs', 'lessons', n + '-lesson.html')).href;
const kb = n => (fs.statSync(path.join(root, 'docs', 'lessons', n + '-lesson.html')).size / 1024).toFixed(0);
const clickText = (page, txt, nth = 0) => page.evaluate((t, n) => [...document.querySelectorAll('button,summary,a')].filter(b => b.textContent.trim() === t)[n].click(), txt, nth);
const scrollToId = (page, id) => page.evaluate(i => { document.getElementById(i).scrollIntoView(); window.scrollBy(0, -60); }, id);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setOfflineMode(true);

  // ---- Learner (phone, offline) ----
  await page.goto(lesson('frac'), { waitUntil: 'load' });
  await page.screenshot({ path: path.join(raw, 'phone-start.png') });
  await clickText(page, 'Add learner'); await page.type('#newwho', 'Amina'); await page.keyboard.press('Enter');
  await page.click('input[name=r2][value="0"]'); await clickText(page, 'Check answer', 0);
  await scrollToId(page, 'h2');
  await page.screenshot({ path: path.join(raw, 'phone-feedback.png') });
  await page.click('input[name=r2][value="1"]'); await clickText(page, 'Check answer', 0);
  await page.click('input[name=r3][value="0"]'); await clickText(page, 'Check answer', 1);
  await page.click('input[name=r4][value="0"]'); await clickText(page, 'Check answer', 2);
  await page.click('input[name=r5][value="2"]'); await clickText(page, 'Check answer', 3);
  await scrollToId(page, 'doneh');
  await page.screenshot({ path: path.join(raw, 'phone-done.png') });
  const aminaCode = await page.$eval('#code', e => e.textContent);
  await page.click('#practiceBtn');
  await page.evaluate(() => { const L = JSON.parse(document.getElementById('lesson').textContent); const qt = document.getElementById('prq').textContent.replace(/^[^:]*: /, ''); const st = L.steps.find(x => x.b === qt); const wrong = st.o.findIndex((_, j) => j !== st.a); document.querySelector('#practice input[value="' + wrong + '"]').click(); [...document.querySelectorAll('#practice button')].find(b => !b.hidden && /Check/.test(b.textContent)).click(); });
  await scrollToId(page, 'prh');
  await page.screenshot({ path: path.join(raw, 'phone-practice.png') });
  await scrollToId(page, 'sendh');
  await page.screenshot({ path: path.join(raw, 'phone-code.png') });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('#hcb'); for (let i = 0; i < 3; i++) await page.click('button[aria-label^="A+"]');
  await scrollToId(page, 'h0');
  await page.screenshot({ path: path.join(raw, 'phone-contrast.png') });
  await page.goto(lesson('foto'), { waitUntil: 'load' });
  await page.click('input[name=r2][value="2"]'); await clickText(page, 'Comprobar', 0);
  await scrollToId(page, 'h2');
  await page.screenshot({ path: path.join(raw, 'phone-spanish.png') });

  // ---- Teacher editor (desktop) ----
  await page.setOfflineMode(false);
  await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  await page.goto(base + '/index.html', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'load' });
  await page.screenshot({ path: path.join(raw, 'editor-top.png') });
  await page.evaluate(() => { document.getElementById('step2').scrollIntoView(); window.scrollBy(0, -10); });
  await page.screenshot({ path: path.join(raw, 'editor-question.png') });
  const more = await page.evaluate(() => {
    const L = LP_SAMPLES[0], q = L.steps.map((s, i) => s.t === 'q' ? i : -1).filter(i => i >= 0);
    return [lpEncode('FRAC', 'BEN', { [q[0]]: 1, [q[1]]: 0, [q[2]]: 0, [q[3]]: 0 }, q), lpEncode('FRAC', 'CHI', { [q[0]]: 1, [q[1]]: 1, [q[2]]: 0, [q[3]]: 1 }, q), lpEncode('FRAC', 'DAV', { [q[0]]: 0, [q[1]]: 0, [q[2]]: 0, [q[3]]: 0 }, q)];
  });
  await page.type('#sms', `Fractions ${aminaCode}\nFractions ${more[0]}\nfractions ${more[1].toLowerCase()}\nFractions ${more[2]}\nFractions FRAC-ZZZ-1111-0`);
  await page.click('#decode');
  await page.evaluate(() => { document.getElementById('resultsH').scrollIntoView(); window.scrollBy(0, -10); });
  await page.screenshot({ path: path.join(raw, 'editor-results.png') });
  await page.evaluate(() => { document.getElementById('fuH').scrollIntoView(); window.scrollBy(0, -10); });
  await page.screenshot({ path: path.join(raw, 'editor-followup.png') });

  // ---- Composed images ----
  const img = (dir, f) => pathToFileURL(path.join(dir, f)).href;
  const css = `body{margin:0;width:1500px;height:1000px;font:28px/1.35 system-ui,"Segoe UI",sans-serif;background:#f4f6fb;color:#111;display:flex;flex-direction:column}
  h1{font-size:44px;margin:36px 56px 8px}p.sub{margin:0 56px 22px;color:#333}
  .row{display:flex;gap:40px;justify-content:center;align-items:flex-start;padding:0 40px}
  figure{margin:0;text-align:center}figure img{border:3px solid #222;border-radius:28px;background:#fff}
  figcaption{margin-top:10px;font-size:24px}.phone img{height:640px}.wide img{border-radius:10px}
  .ba{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:0 56px}.card{background:#fff;border-radius:18px;padding:26px 34px;border:3px solid #ccc}
  .card h2{margin:0 0 10px;font-size:34px}.card.after{border-color:#0b57d0}.card li{margin:8px 0}.big{font-size:60px;font-weight:800;color:#0b57d0}
  .tag{display:inline-block;font-size:22px;font-weight:700;padding:2px 12px;border-radius:999px;margin-bottom:8px}.tb{background:#e7e7e7}.ta{background:#0b57d0;color:#fff}
  .cmp{display:grid;grid-template-columns:1fr 1fr;gap:36px;padding:0 48px;align-items:start}.cmp figure img{max-width:100%}`;
  const size = kb('frac');
  const compose = async (name, body) => {
    const f = path.join(raw, '_' + name + '.html');
    fs.writeFileSync(f, `<!doctype html><html lang="en"><meta charset="utf-8"><style>${css}</style><body>${body}</body></html>`);
    await page.goto(pathToFileURL(f).href, { waitUntil: 'load' });
    await page.screenshot({ path: path.join(out, name + '.png') });
    fs.unlinkSync(f);
  };
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 });

  await compose('gallery-1-before-after', `<h1>Homework that reaches learners with no data</h1><p class="sub">Learner: shares an old phone, buys data in small bundles, often no signal at home.</p>
    <div class="ba"><div class="card"><h2>Before</h2><ul><li>Video lesson: tens of MB</li><li>Needs signal the whole time</li><li>Needs an account</li><li>Teacher cannot see who got stuck where</li></ul></div>
    <div class="card after"><h2>After: Lesson Parcel</h2><div class="big">${size} KB</div><ul><li>Forward it like a chat message</li><li>Works with the network off</li><li>Hints for each wrong answer, then practice</li><li>Code back by SMS → follow-up per mistake</li></ul></div></div>
    <div class="card" style="margin:30px 56px 0"><h2>Why the loop back matters</h2>In a randomized trial in Botswana (Nature Human Behaviour, 2022), SMS problems alone did not improve learning; SMS plus a teacher's follow-up did (+0.12 SD). Lesson Parcel tells the teacher whom to follow up, and about what.</div>`);
  await compose('gallery-2-learner', `<h1>Learner: offline, a hint for each mistake, then practice</h1><p class="sub">Opened from a file with the network switched off.</p>
    <div class="row"><figure class="phone"><img src="${img(raw, 'phone-start.png')}"><figcaption>Opens offline, reads aloud</figcaption></figure>
    <figure class="phone"><img src="${img(raw, 'phone-feedback.png')}"><figcaption>Hint for the answer they chose</figcaption></figure>
    <figure class="phone"><img src="${img(raw, 'phone-done.png')}"><figcaption>Finish: practice the missed ones</figcaption></figure></div>`);
  await compose('gallery-3-code-language', `<h1>Shared phone, own progress, code back by SMS</h1><p class="sub">Each learner on the phone keeps separate progress. High contrast, larger text, Spanish.</p>
    <div class="row"><figure class="phone"><img src="${img(raw, 'phone-code.png')}"><figcaption>Code to text to the teacher</figcaption></figure>
    <figure class="phone"><img src="${img(raw, 'phone-contrast.png')}"><figcaption>High contrast, larger text</figcaption></figure>
    <figure class="phone"><img src="${img(raw, 'phone-spanish.png')}"><figcaption>Spanish lesson and hints</figcaption></figure></div>`);
  await compose('gallery-4-editor', `<h1>The teacher writes the lesson, with a hint per wrong answer</h1><p class="sub">Export = one file. A one-file offline copy of the editor is also available.</p>
    <div class="row"><figure class="wide"><img src="${img(raw, 'editor-question.png')}" style="height:770px"></figure></div>`);
  await compose('gallery-5-results', `<h1>Paste the text messages: who needs what, ready to send</h1><p class="sub">Learners are grouped by the wrong answer they chose first; each group gets a message about its own mistake.</p>
    <div class="row"><figure class="wide"><img src="${img(raw, 'editor-followup.png')}" style="height:770px"></figure></div>`);

  const cmp = (title, sub, bf, bcap, af, acap, cls) => `<h1>${title}</h1><p class="sub">${sub}</p><div class="cmp">
    <figure class="${cls}"><span class="tag tb">Before (Nov 9)</span><br><img src="${img(before, bf)}"><figcaption>${bcap}</figcaption></figure>
    <figure class="${cls}"><span class="tag ta">After (Nov 13)</span><br><img src="${img(raw, af)}"><figcaption>${acap}</figcaption></figure></div>`;
  await compose('compare-1-wrong-answer', cmp('A wrong answer: hint first, not the answer', 'Before, every wrong choice showed the same explanation, which gave the answer away.', 'phone-feedback.png', 'Same text for every wrong choice', 'phone-feedback.png', 'Hint written for “2/3”; the explanation comes after a second try', 'phone'));
  await compose('compare-2-lesson-end', cmp('The end of the lesson: a score and practice', 'Before, the lesson just stopped at the code.', 'phone-code.png', 'Only the code', 'phone-done.png', 'First-try score + “Practice the ones I missed”', 'phone'));
  await compose('compare-3-teacher-results', cmp('Teacher results: from a table to a plan', 'Before, the teacher saw a table. Now each group of mistakes gets a ready-to-send message.', 'editor-results.png', 'Table + most-missed question', 'editor-followup.png', 'Follow-up plan grouped by wrong answer', 'wide'));
  await compose('compare-4-editor-first-look', cmp('First look: what it is, in three steps', 'Before, the editor opened on a bare form.', 'editor-top.png', 'Form first', 'editor-top.png', 'Three steps + “Try a lesson as a learner”', 'wide'));
  await browser.close();
  console.log('done', fs.readdirSync(out).filter(f => /^(gallery|compare)/.test(f)));
})().catch(e => { console.error(e); process.exit(1); });
