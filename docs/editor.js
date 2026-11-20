/* Lesson Parcel editor. Depends on parcel.js (LP_CSS, buildParcel, lpDecode) and samples.js (LP_SAMPLES). */
(function () {
  var $ = function (id) { return document.getElementById(id); };

  var LS = null;
  try { LS = localStorage; LS.setItem('lpe:t', '1'); LS.removeItem('lpe:t'); } catch (e) { LS = null; }
  var lesson, codeTouched = false;

  function blank() { return { v: 1, code: '', lang: 'en', title: '', intro: '', smsPrefix: 'Lesson', phone: '', steps: [{ t: 'read', h: '', b: '' }, { t: 'q', b: '', o: ['', ''], a: 0, why: '' }] }; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function persist() { if (LS) try { LS.setItem('lpe:draft', JSON.stringify(lesson)); } catch (e) {} }
  function say(msg) { $('status').textContent = msg; }
  function autoCode(title) { return title.toUpperCase().normalize('NFD').replace(/[^A-Z0-9]/g, '').slice(0, 5) || ''; }
  function hash(s) { var x = 0; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36); }

  var meta = ['title', 'code', 'lang', 'intro', 'smsPrefix', 'phone'];
  function fillMeta() { meta.forEach(function (k) { $(k).value = lesson[k] || ''; }); }
  meta.forEach(function (k) {
    $(k).addEventListener('input', function () {
      var v = $(k).value;
      if (k === 'code') { codeTouched = true; v = v.toUpperCase().replace(/[^A-Z0-9]/g, ''); $(k).value = v; }
      lesson[k] = v;
      if (k === 'title' && !codeTouched) { lesson.code = autoCode(v); $('code').value = lesson.code; }
      changed();
    });
  });

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (a) { if (a === 'text') e.textContent = attrs[a]; else e.setAttribute(a, attrs[a]); });
    (kids || []).forEach(function (k) { if (k != null) e.append(k); });
    return e;
  }
  function field(label, input, hint) {
    var id = input.id, kids = [el('label', { 'for': id, text: label }), input];
    if (hint) { input.setAttribute('aria-describedby', id + 'h'); kids.push(el('span', { id: id + 'h', 'class': 'hint', text: hint })); }
    return el('div', { 'class': 'field' }, kids);
  }

  function renderSteps(focusId) {
    var box = $('steps'); box.textContent = '';
    var qn = 0, rn = 0;
    lesson.steps.forEach(function (s, i) {
      var name = s.t === 'q' ? 'Question ' + (++qn) : 'Reading part ' + (++rn);
      var card = el('fieldset', { 'class': 'card step', id: 'step' + i }, [el('legend', {}, [el('h3', { text: name })])]);
      function bind(input, key, map) {
        input.addEventListener('input', function () { s[key] = map ? map(input.value) : input.value; changed(); });
        return input;
      }
      if (s.t === 'read') {
        var hIn = el('input', { type: 'text', id: 's' + i + 'h', maxlength: '80' }); hIn.value = s.h;
        var bIn = el('textarea', { id: 's' + i + 'b', rows: '4' }); bIn.value = s.b;
        card.append(field('Heading', bind(hIn, 'h')), field('Text (short sentences read aloud best)', bind(bIn, 'b')));
      } else {
        var qIn = el('textarea', { id: 's' + i + 'q', rows: '2' }); qIn.value = s.b;
        var oIn = el('textarea', { id: 's' + i + 'o', rows: '4' }); oIn.value = s.o.join('\n');
        var aSel = el('select', { id: 's' + i + 'a' });
        // One hint per wrong option: what the learner probably misunderstood if they picked it.
        var mBox = el('fieldset', { 'class': 'hints', id: 's' + i + 'm' });
        var fillHints = function () {
          s.m = s.o.map(function (_, j) { return (s.m && s.m[j]) || ''; });
          mBox.textContent = '';
          mBox.append(el('legend', { text: 'Hint for each wrong answer (optional, recommended)' }),
            el('p', { 'class': 'hint', text: 'Learners see this when they pick that answer; your follow-up messages use it too. Name the likely mistake, do not give the answer.' }));
          s.o.forEach(function (o, j) {
            if (j === s.a) return;
            var inp = el('input', { type: 'text', id: 's' + i + 'm' + j, maxlength: '160' }); inp.value = s.m[j];
            inp.addEventListener('input', function () { s.m[j] = inp.value; changed(); });
            mBox.append(field('If a learner picks “' + (o || '(empty)') + '”, tell them:', inp));
          });
        };
        var fill = function () {
          aSel.textContent = '';
          s.o.forEach(function (o, j) { aSel.append(el('option', { value: String(j), text: (j + 1) + '. ' + (o || '(empty)') })); });
          if (s.a >= s.o.length) s.a = 0;
          aSel.value = String(s.a);
          fillHints();
        };
        oIn.addEventListener('input', function () { s.o = oIn.value.split('\n').map(function (x) { return x.trim(); }).filter(function (x, k, arr) { return x || k < arr.length - 1; }).slice(0, 6); fill(); changed(); });
        aSel.addEventListener('change', function () { s.a = +aSel.value; fillHints(); changed(); });
        fill();
        var wIn = el('textarea', { id: 's' + i + 'w', rows: '2' }); wIn.value = s.why || '';
        card.append(field('Question', bind(qIn, 'b')), field('Answer options, one per line (2–6)', oIn), field('Correct option', aSel), mBox,
          field('Explanation', bind(wIn, 'why'), 'Why the right answer is right. Learners see it when they get it right, or after a second wrong try.'));
      }
      var bar = el('div', { 'class': 'bar' });
      [['Move up', -1], ['Move down', 1]].forEach(function (m) {
        var b = el('button', { type: 'button', 'class': 'ghost', text: m[0] });
        b.setAttribute('aria-label', m[0] + ': ' + name);
        b.disabled = (m[1] < 0 && i === 0) || (m[1] > 0 && i === lesson.steps.length - 1);
        b.addEventListener('click', function () {
          var j = i + m[1], tmp = lesson.steps[i]; lesson.steps[i] = lesson.steps[j]; lesson.steps[j] = tmp;
          changed(); renderSteps('step' + j); say(name + ' moved.');
        });
        bar.append(b);
      });
      var del = el('button', { type: 'button', 'class': 'ghost', text: 'Remove' });
      del.setAttribute('aria-label', 'Remove ' + name);
      del.addEventListener('click', function () { lesson.steps.splice(i, 1); changed(); renderSteps(); say(name + ' removed.'); $('addRead').focus(); });
      bar.append(del);
      card.append(bar);
      box.append(card);
    });
    if (focusId && $(focusId)) { var f = $(focusId).querySelector('input,textarea,select'); if (f) f.focus(); }
  }

  function problems() {
    var p = [], qs = 0;
    if (!lesson.title.trim()) p.push(['title', 'Add a title.']);
    if (!/^[A-Z0-9]{2,6}$/.test(lesson.code)) p.push(['code', 'The lesson code needs 2–6 capital letters or digits.']);
    lesson.steps.forEach(function (s, i) {
      if (s.t === 'read' && !s.b.trim()) p.push(['s' + i + 'b', 'A reading part has no text.']);
      if (s.t === 'q') {
        qs++;
        if (!s.b.trim()) p.push(['s' + i + 'q', 'Question ' + qs + ' has no question text.']);
        if (s.o.filter(function (o) { return o.trim(); }).length < 2 || s.o.some(function (o) { return !o.trim(); })) p.push(['s' + i + 'o', 'Question ' + qs + ' needs 2–6 filled-in options.']);
      }
    });
    if (!qs) p.push(['addQ', 'Add at least one question.']);
    if (qs > 40) p.push(['addQ', 'Use at most 40 questions so the progress code stays short.']);
    return p;
  }
  function finalLesson() {
    var l = clone(lesson);
    l.steps = l.steps.map(function (s) {
      if (s.t !== 'q') return { t: 'read', h: s.h.trim(), b: s.b.trim() };
      var q = { t: 'q', b: s.b.trim(), o: s.o.map(function (o) { return o.trim(); }), a: s.a, why: (s.why || '').trim() };
      var m = s.o.map(function (_, j) { return j === s.a ? '' : ((s.m && s.m[j]) || '').trim(); });
      if (m.some(function (x) { return x; })) q.m = m;
      return q;
    });
    l.v = hash(JSON.stringify(l.steps));
    if (!l.phone) delete l.phone;
    return l;
  }
  function changed() {
    persist();
    var p = problems(), box = $('problems'); box.textContent = '';
    if (p.length) {
      var ul = el('ul', { 'class': 'err' });
      p.forEach(function (x) { var a = el('a', { href: '#' + x[0], text: x[1] }); a.addEventListener('click', function (e) { e.preventDefault(); $(x[0]).focus(); }); ul.append(el('li', {}, [a])); });
      box.append(el('p', { text: 'Fix these before exporting:' }), ul);
    }
    var bytes = new Blob([buildParcel(finalLesson())]).size;
    $('size').textContent = 'Lesson file size: ' + (bytes / 1024).toFixed(1) + ' KB (a short video lesson is usually tens of MB).';
    $('download').disabled = $('preview').disabled = p.length > 0;
  }
  function load(l, msg) {
    lesson = clone(l); codeTouched = !!lesson.code;
    lesson.steps.forEach(function (s) { if (s.t === 'q' && !s.why) s.why = ''; if (s.t === 'read' && !s.h) s.h = ''; });
    if (lesson.phone == null) lesson.phone = '';
    fillMeta(); renderSteps(); changed(); if (msg) say(msg);
  }

  LP_SAMPLES.forEach(function (s, i) { $('sampleSel').append(el('option', { value: String(i), text: s.title + ' (' + s.lang + ')' })); });
  $('loadSample').addEventListener('click', function () { var s = LP_SAMPLES[+$('sampleSel').value]; load(s, 'Loaded sample: ' + s.title + '.'); });
  $('newLesson').addEventListener('click', function () { codeTouched = false; load(blank(), 'Started a new lesson.'); $('title').focus(); });
  $('addRead').addEventListener('click', function () { lesson.steps.push({ t: 'read', h: '', b: '' }); changed(); renderSteps('step' + (lesson.steps.length - 1)); });
  $('addQ').addEventListener('click', function () { lesson.steps.push({ t: 'q', b: '', o: ['', ''], a: 0, why: '' }); changed(); renderSteps('step' + (lesson.steps.length - 1)); });

  $('openFile').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return;
    f.text().then(function (txt) {
      var node = new DOMParser().parseFromString(txt, 'text/html').getElementById('lesson');
      var l = node && JSON.parse(node.textContent);
      if (!l || !Array.isArray(l.steps)) throw new Error('no lesson');
      load(l, 'Opened ' + f.name + '. You can edit it or read progress codes for it.');
    }).catch(function () { say('That file is not a Lesson Parcel lesson.'); });
  });

  $('download').addEventListener('click', function () {
    var l = finalLesson(), url = URL.createObjectURL(new Blob([buildParcel(l)], { type: 'text/html' }));
    var a = el('a', { href: url, download: l.code.toLowerCase() + '-lesson.html' });
    document.body.append(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    say('Downloaded ' + l.code.toLowerCase() + '-lesson.html. Send this file to learners by WhatsApp, Bluetooth or USB.');
  });
  $('preview').addEventListener('click', function () { var l = finalLesson(); l.preview = true; $('frame').srcdoc = buildParcel(l); $('dlg').showModal(); });
  $('tryLearner').addEventListener('click', function () { if ($('preview').disabled) { say('Load a sample first: this lesson is not ready yet.'); return; } $('preview').click(); });
  $('closeDlg').addEventListener('click', function () { $('dlg').close(); $('preview').focus(); });

  // Follow-up plan: group learners by the wrong answer they chose first, and draft one short
  // message per group that names their likely mistake (the teacher's hint for that option).
  var FU = {
    en: { q: 'Q', chose: 'you chose', missing: 'you have not answered question', finish: 'Finish the lesson and send your new code.', practice: 'Then press "Practice the ones I missed".', look: 'Read that part of the lesson again.' },
    es: { q: 'P', chose: 'elegiste', missing: 'todavía no respondiste la pregunta', finish: 'Termina la lección y envía tu código nuevo.', practice: 'Luego pulsa "Practicar las que fallé".', look: 'Vuelve a leer esa parte de la lección.' }
  };
  function copyText(text, statusEl) {
    function fallback() {
      var ta = el('textarea', { 'aria-hidden': 'true', style: 'position:fixed;left:-9999px' }); ta.value = text; document.body.append(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); statusEl.textContent = ok ? 'Copied.' : 'Copy did not work: select the message and copy it.';
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { statusEl.textContent = 'Copied.'; }, fallback);
    else fallback();
  }
  function followUp(l, r, box) {
    var f = FU[l.lang] || FU.en, prefix = l.smsPrefix || l.title;
    var qs = l.steps.filter(function (s) { return s.t === 'q'; });
    var sec = el('section', { 'class': 'card', 'aria-labelledby': 'fuH' }, [el('h3', { id: 'fuH', text: 'Follow-up plan: who needs what' }),
      el('p', { 'class': 'hint', text: 'Learners are grouped by the answer they chose on their first try, so each group gets a message about its own mistake. Copy a message into SMS or your class chat.' })]);
    var items = qs.map(function (s, k) { return { s: s, k: k, n: r.rows.filter(function (row) { return row.answers[k] && row.answers[k].ok; }).length }; })
      .filter(function (x) { return x.n < r.rows.length; }).sort(function (a, b) { return a.n - b.n || a.k - b.k; });
    if (!items.length) sec.append(el('p', { text: 'Everyone answered every question right on the first try.' }));
    items.forEach(function (it) {
      var groups = [];
      it.s.o.forEach(function (o, j) {
        if (j === it.s.a) return;
        var who = r.rows.filter(function (row) { return row.answers[it.k] && row.answers[it.k].opt === j; }).map(function (row) { return row.nick; });
        if (!who.length) return;
        var msg = prefix + ' ' + f.q + (it.k + 1) + ' (' + who.join(', ') + '): ' + f.chose + ' "' + o + '". ' + ((it.s.m && it.s.m[j]) || f.look);
        if ((msg + ' ' + f.practice).length <= 160) msg += ' ' + f.practice; // keep it to one SMS when possible
        groups.push({ label: 'Chose “' + o + '”', who: who, msg: msg });
      });
      var none = r.rows.filter(function (row) { return !row.answers[it.k]; }).map(function (row) { return row.nick; });
      if (none.length) groups.push({ label: 'Did not answer', who: none, msg: prefix + ' (' + none.join(', ') + '): ' + f.missing + ' ' + (it.k + 1) + '. ' + f.finish });
      var q = el('div', { 'class': 'fu' }, [el('h4', { text: 'Question ' + (it.k + 1) + ' — ' + it.n + ' of ' + r.rows.length + ' right first time: ' + it.s.b })]);
      groups.forEach(function (g, gi) {
        var id = 'fu' + it.k + '_' + gi, st = el('span', { role: 'status', 'class': 'hint' });
        var btn = el('button', { type: 'button', 'class': 'ghost', text: 'Copy message', 'aria-describedby': id });
        btn.addEventListener('click', function () { copyText(g.msg, st); });
        var parts = g.msg.length <= 160 ? 1 : Math.ceil(g.msg.length / 153);
        q.append(el('p', {}, [el('strong', { text: g.label + ': ' }), g.who.join(', ')]),
          el('p', { id: id, 'class': 'msg', text: g.msg }),
          el('div', { 'class': 'bar' }, [btn, el('span', { 'class': 'hint', text: g.msg.length + ' characters' + (parts > 1 ? ' (' + parts + ' SMS)' : ' (1 SMS)') }), st]));
      });
      sec.append(q);
    });
    box.append(sec);
  }

  $('decode').addEventListener('click', function () {
    var l = finalLesson(), r = lpDecode($('sms').value, l), box = $('results'); box.textContent = '';
    var letters = 'ABCDEF';
    if (!r.rows.length) box.append(el('p', { text: 'No valid codes for lesson ' + l.code + ' were found.' }));
    else {
      var table = el('table'), head = el('tr', {}, [el('th', { scope: 'col', text: 'Learner' })]);
      table.append(el('caption', { text: l.title + ': first-try answers (' + r.rows.length + ' learners)' }));
      for (var k = 0; k < r.questions; k++) head.append(el('th', { scope: 'col', text: 'Q' + (k + 1) }));
      head.append(el('th', { scope: 'col', text: 'Score' }));
      table.append(el('thead', {}, [head]));
      var tb = el('tbody');
      r.rows.forEach(function (row) {
        var tr = el('tr', {}, [el('th', { scope: 'row', text: row.nick + (row.dup ? ' (code name shared by more than one learner)' : '') })]);
        row.answers.forEach(function (a) {
          tr.append(el('td', { text: a == null ? '–' : a.ok ? '✓' : '✗ ' + letters[a.opt], 'aria-label': a == null ? 'not answered' : a.ok ? 'correct' : 'wrong, chose option ' + (a.opt + 1) }));
        });
        tr.append(el('td', { text: row.score + '/' + r.questions }));
        tb.append(tr);
      });
      var pct = el('tr', {}, [el('th', { scope: 'row', text: 'Class correct' })]), worst = -1, worstPct = 101;
      for (k = 0; k < r.questions; k++) {
        var n = r.rows.filter(function (row) { return row.answers[k] && row.answers[k].ok; }).length, pc = Math.round(100 * n / r.rows.length);
        if (pc < worstPct) { worstPct = pc; worst = k; }
        pct.append(el('td', { text: pc + '%' }));
      }
      pct.append(el('td'));
      tb.append(pct); table.append(tb); box.append(table);
      box.append(el('p', { text: 'Most missed: question ' + (worst + 1) + ' (' + worstPct + '% correct on the first try).' }));
      followUp(l, r, box);
    }
    if (r.errors.length) {
      var why = { 'other-lesson': 'belongs to another lesson', length: 'has the wrong number of answers for this lesson', checksum: 'has a typo (check letter does not match)' };
      var ul = el('ul');
      r.errors.forEach(function (e) { ul.append(el('li', { text: e.code + ' — ' + why[e.why] })); });
      box.append(el('p', { text: 'Codes not counted:' }), ul);
    }
  });

  var draft = null;
  try { draft = LS && JSON.parse(LS.getItem('lpe:draft')); } catch (e) {}
  load(draft && draft.steps ? draft : LP_SAMPLES[0], draft ? 'Restored your last draft.' : '');
  if (!LS) say('This browser cannot save drafts. Download your lesson file to keep it.');
})();
