// Builds the sample lesson files into docs/lessons/ and the single-file editor and runs logic tests.
// Usage: node tools/build-and-test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const app = path.join(__dirname, '..', 'docs');
const P = require(path.join(app, 'parcel.js'));
const { LP_SAMPLES } = require(path.join(app, 'samples.js'));

const out = path.join(app, 'lessons');
fs.mkdirSync(out, { recursive: true });
const sizes = [];
for (const l of LP_SAMPLES) {
  const html = P.buildParcel(l);
  const file = path.join(out, l.code.toLowerCase() + '-lesson.html');
  fs.writeFileSync(file, html);
  sizes.push([path.basename(file), Buffer.byteLength(html)]);
  // The embedded runtime must parse as JavaScript.
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.strictEqual(scripts.length, 1);
  new Function(scripts[0]);
  // Lesson JSON must round-trip and must not contain a raw "</".
  const json = html.match(/<script id="lesson" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert(!json.includes('</'));
  assert.deepStrictEqual(JSON.parse(json), l);
  // No external requests.
  assert(!/(src|href)=["']https?:/i.test(html), 'external resource found');
}

// Single-file offline editor: inline the three scripts, drop the online-only download links.
{
  const inlineJS = src => fs.readFileSync(path.join(app, src), 'utf8').replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  let ed = fs.readFileSync(path.join(app, 'index.html'), 'utf8');
  ed = ed.replace(/<!--online-only-->[\s\S]*?<!--\/online-only-->\s*/, () => '');
  ed = ed.replace(/<script src="([a-z]+\.js)"><\/script>/g, (_, src) => '<script>\n' + inlineJS(src) + '\n</script>');
  assert(!/<script src=/.test(ed), 'external script left in single-file editor');
  assert(!/(src|href)=["']https?:/i.test(ed), 'external resource in single-file editor');
  const file = path.join(app, 'lesson-parcel-editor.html');
  fs.writeFileSync(file, ed);
  sizes.push([path.basename(file), Buffer.byteLength(ed)]);
}

let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log('ok -', name); };
const L = LP_SAMPLES[0], qIdx = L.steps.map((s, i) => s.t === 'q' ? i : -1).filter(i => i >= 0);

t('nickname', () => {
  assert.strictEqual(P.lpNick('Amina', 0), 'AMI');
  assert.strictEqual(P.lpNick('José', 1), 'JOS');
  assert.strictEqual(P.lpNick('李华', 2), 'L3');
  assert.strictEqual(P.lpNick('', 0), 'L1');
});
t('encode/decode round trip', () => {
  const first = { [qIdx[0]]: 1, [qIdx[1]]: 2, [qIdx[3]]: 1 };
  const c = P.lpEncode('FRAC', 'AMI', first, qIdx);
  assert.match(c, /^FRAC-AMI-2302-[0-9A-Z]$/);
  const r = P.lpDecode('hi teacher, Fractions ' + c.toLowerCase() + ' thanks', L);
  assert.strictEqual(r.rows.length, 1);
  assert.deepStrictEqual(r.rows[0].answers.map(a => a && a.ok), [true, false, null, true]);
  assert.strictEqual(r.rows[0].score, 2);
});
t('typo is rejected by the check letter', () => {
  const c = P.lpEncode('FRAC', 'AMI', { [qIdx[0]]: 1 }, qIdx);
  const typo = c.replace('FRAC-AMI-2', 'FRAC-AMI-3');
  const r = P.lpDecode(typo, L);
  assert.strictEqual(r.rows.length, 0);
  assert.strictEqual(r.errors[0].why, 'checksum');
});
t('other lesson and wrong length are reported', () => {
  const other = P.lpEncode('WATER', 'BEN', {}, [1, 2, 3, 4]);
  const short = P.lpEncode('FRAC', 'BEN', {}, [2, 3]);
  const r = P.lpDecode(other + '\n' + short, L);
  assert.deepStrictEqual(r.errors.map(e => e.why), ['other-lesson', 'length']);
});
t('resent code from same learner replaces the earlier one', () => {
  const a1 = P.lpEncode('FRAC', 'AMI', { [qIdx[0]]: 0 }, qIdx);
  const a2 = P.lpEncode('FRAC', 'AMI', { [qIdx[0]]: 0, [qIdx[1]]: 0 }, qIdx);
  const b = P.lpEncode('FRAC', 'BEN', { [qIdx[0]]: 1 }, qIdx);
  const r = P.lpDecode([a1, b, a2].join(' '), L);
  assert.deepStrictEqual(r.rows.map(x => x.nick), ['AMI', 'BEN']);
  assert.strictEqual(r.rows[0].code, a2);
  assert.strictEqual(r.rows[0].dup, false);
});
t('two different learners with the same code name are both kept and flagged', () => {
  const x = P.lpEncode('FRAC', 'LEA', { [qIdx[0]]: 0 }, qIdx);
  const y = P.lpEncode('FRAC', 'LEA', { [qIdx[0]]: 1, [qIdx[1]]: 0 }, qIdx);
  const r = P.lpDecode(x + ' ' + y, L);
  assert.strictEqual(r.rows.length, 2);
  assert(r.rows.every(row => row.dup));
});
t('every code fits in one SMS (160 chars) with prefix', () => {
  const big = { code: 'ABCDEF', steps: Array.from({ length: 40 }, () => ({ t: 'q', o: ['a', 'b'], a: 0 })) };
  const c = P.lpEncode('ABCDEF', 'XYZ', {}, big.steps.map((_, i) => i));
  assert((('Fractions ' + c).length) <= 160);
});
t('script-breaking text is escaped', () => {
  const evil = { v: 1, code: 'XSS', lang: 'en', title: '</title><script>alert(1)</script>', steps: [{ t: 'q', b: '</script><b>x', o: ['a', 'b'], a: 0, why: '' }] };
  const html = P.buildParcel(evil);
  assert.strictEqual((html.match(/<script>alert/g) || []).length, 0);
  assert.strictEqual((html.match(/<\/script>/g) || []).length, 2);
});
for (const [f, b] of sizes) console.log(`size - ${f}: ${(b / 1024).toFixed(1)} KB`);
console.log(`${pass} tests passed`);
