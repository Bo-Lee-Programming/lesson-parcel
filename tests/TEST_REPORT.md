# Lesson Parcel — test report

Dates: 2026-11-08, re-run 2026-11-09 and 2026-11-13 (PST), after the product-review changes. Tester: the author (no outside users yet). Machine: Windows 11, Chrome 156.0.8078.80 (headless) via puppeteer-core, Lighthouse 13.6.0, Node 25.

Reproduce:
```
node tools/serve.js 18431                       # local static server for the editor
node tools/build-and-test.js                    # builds docs/lessons/*.html + offline editor + logic tests
NODE_PATH=tools/node_modules node tools/e2e.js http://127.0.0.1:18431
```
Raw results: `tests/e2e-results.json`, `tests/lighthouse-*-run{1,2,3}.json`, `tests/ab/*.json`, `tests/ax-tree-frac.json`.

## 1. File size (2026-11-13)
| Lesson | Steps | Size |
|---|---|---|
| `frac-lesson.html` (math, English) | 2 reading parts, 4 questions with wrong-answer hints | 17.9 KB |
| `water-lesson.html` (science, English) | 3 reading parts, 4 questions with wrong-answer hints | 18.4 KB |
| `foto-lesson.html` (science, Spanish) | 2 reading parts, 3 questions with wrong-answer hints | 17.7 KB |
| `lesson-parcel-editor.html` (offline editor) | — | 52.4 KB |

On 11-09 the lessons were 15.0–15.6 KB. The 11-13 features added about 5 KB. Copying only the lesson's own interface language into each file (instead of both English and Spanish) and stripping indentation took 2.7 KB back. There are no external requests: this is checked statically in the build test and at runtime by the offline test.

## 2. Logic tests (`tools/build-and-test.js`, 8/8 pass)
- Code-name rules (`Amina`→`AMI`, `José`→`JOS`, non-Latin name → `L3`).
- Encode → decode round trip, including a code buried in a longer SMS and typed in lower case.
- A mistyped code is rejected by the check character. A code for another lesson, or with the wrong number of answers, is reported and not counted.
- A learner who sends a newer code replaces their older one. Two different learners who share a code name are both kept and flagged.
- The longest allowed code (40 questions) plus prefix fits in one 160-character SMS.
- Lesson text containing `</script>` cannot break out of the file.

## 3. End-to-end checks in Chrome (`tools/e2e.js`, 33/33 pass on 2026-11-13)
**Learner side.** Phone viewport 360×740, network switched off, CPU slowed 6×, lesson opened from a `file://` path, as after receiving it in a chat app.
- Opens with no network requests. Time to a usable page: 0.55 s (11-08), 0.87 s (11-09), 1.2 s (11-13, machine under heavy load from other jobs; see the A/B test in section 5).
- **Keyboard only:**
  - Every control is reachable with Tab; each radio group is one stop.
  - The focus outline is 3 px.
  - A wrong answer and then a correction work with only Tab, Space, Arrow keys and Enter.
- **New 11-13:** a wrong answer shows the hint written for *that* option ("2/3 adds 1 to the top…") and does **not** show the solution. A second wrong try adds the full explanation.
- **New 11-13:** the progress bar shows "2 / 4 answered" after two questions.
- **New 11-13:** the finish card appears only when every question is answered, with the first-try score ("2 of 4 right on the first try") and "Practice the ones I missed (2)". Practice asks exactly the 2 missed questions, with shuffled options, and the progress code is unchanged afterwards.
- The progress code keeps the **first** try (`1100` after wrong-then-right on Q1 and right on Q2).
- Progress is still there after closing and reopening the file offline.
- **Shared phone:** a second learner starts empty with their own code name, and switching back restores the first learner.
- High contrast and larger text are remembered.
- A learner still using the default name is asked to add their name before sending.
- When storage is blocked, the learner is warned and the questions still work.
- The Spanish lesson shows Spanish controls and sets `lang="es"`.

**Offline editor** (`docs/lesson-parcel-editor.html`, one file):
- Opened from disk with the network off, its export of a sample lesson is byte-identical to the published `water-lesson.html`.
- **Download lesson file** saves the lesson with 0 network requests.

**Teacher side:**
- The editor shows the export size.
- An empty lesson cannot be exported, and the problems are listed.
- Pasting four SMS messages (three valid, one mistyped) gives a 3-learner table and lists the mistyped code separately.
- **New 11-13:** the follow-up plan lists the hardest question first. It groups learners by the wrong answer they chose, using that answer's hint in the message (for example `Fractions Q1 (LEA): you chose "2/3". 2/3 adds 1 to …`), and gives learners who skipped a question a reminder. **Every sample message is 160 characters or fewer (one SMS).**
- **New 11-13:** the editor shows one hint field for each wrong option, labelled with that option.
- **New 11-13:** "Try a lesson as a learner" opens the preview with no storage warning.

## 4. Screen-reader view (accessibility tree)
- Every button, radio, link, select and text field in both the learner file and the editor has an accessible name (0 unnamed).
- Each question is announced as a group named "Question n of N: question text". Answer options are native radio buttons. Feedback is in a polite live region.
- The progress bar is a native `<progress>` element labelled by its text ("2 / 4 answered").
- "A+" and "A−" are named "A+ Larger text" and "A− Smaller text" (WCAG 2.5.3).

## 5. Lighthouse (mobile)
**Accessibility 100 and best practices 100 on every page, in every run** (11-08, 11-09, 11-13). CLS was 0 in every run.

Performance swings with machine load, so it is reported with every run.

| Page | 11-09 median (runs) | 11-13 median (runs) |
|---|---|---|
| frac-lesson | 98 (94/100/98) | 95 (73/95/95) |
| water-lesson | 95 (95/99/86) | 93 (92/96/93) |
| foto-lesson | 100 (91/100/100) | 91 (93/91/72) |
| editor (index.html) | 100 (100/100/100) | 100 (100/100/71) |
| offline editor (one file) | 100 (100/100/100) | 99 (89/100/99) |

**A/B test (11-13).** To check whether the new features slowed the lesson down, the 11-09 `frac-lesson.html` (15.5 KB) and the 11-13 version (18.3 KB) were measured alternately, 4 times each, in the same half hour:

| Version | Performance | First contentful paint (s) | Total blocking time (ms) |
|---|---|---|---|
| 11-09 (old) | 91 / 99 / 100 / 100 | 1.03 / 0.83 / 0.80 / 1.02 | 387 / 124 / 72 / 76 |
| 11-13 (new) | 99 / 100 / 99 / 100 | 1.24 / 0.81 / 0.99 / 1.10 | 128 / 74 / 98 / 58 |

The two versions perform the same within run-to-run noise. The lower 11-13 medians in the table above come from machine load, not from the new code.

Fixed because of Lighthouse (11-08):
- The "A+" label mismatch.
- A missing favicon that caused a console error.
- A layout shift in the editor.

## 6. Not yet verified (honest gaps)
- **Real phone in airplane mode:** offline was emulated in desktop Chrome. Still to do on a real Android phone, with a screen recording.
- **Real screen reader by ear:** only the accessibility tree was checked; nobody has listened with NVDA, Narrator or TalkBack yet.
- **Read-aloud voice quality** depends on the voices installed on each device; not tested on a low-end phone.
- **Opening from inside WhatsApp or Telegram:** not tested; storage may be blocked there, and the file shows a warning when it is.
- **`sms:` link** opening the SMS app with the code filled in: not tested on a phone.
- **Copy message** in the follow-up plan was tested for its text, not for the clipboard on a real phone.
- No classroom or real-learner testing, and the wrong-answer hints in the samples were written by us, not by a teacher.
