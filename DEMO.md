# مرصد (Marsad) — Graduation Defense Walkthrough

The scenario doc 06 asks for, end to end: **report → adjudicate → claim → settle → verify QR**.

Every step below was executed against a freshly seeded database before being written down. Where
the platform's real rules get in the way of a live demo — a 72-hour objection window, a queued PDF
— this document says so and gives the exact command that moves past it, rather than pretending the
chain runs unaided.

**Budget:** ~15 minutes at a normal talking pace.

---

## 0. Before the room fills (do this ~10 minutes early)

Four things must be running. The third is the one that gets forgotten and silently breaks the demo.

```bash
# 1. MySQL (XAMPP control panel, or:)
C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini --standalone

# 2. Reset to a known-good database — one case in every lifecycle state,
#    one claim in every status, and the 13 demo sign-ins.
cd apps/api
php artisan migrate:fresh --seed

# 3. THE QUEUE WORKER. The signed PDF report is a queued job.
#    Without this the report is never generated and step 5 has no QR to scan.
php artisan queue:work

# 4. API and web, in two more terminals
php artisan serve                 # http://127.0.0.1:8000
cd ../web && npm run dev          # http://localhost:5173
```

> `docker compose up --build` starts all of this in one command — including the worker and
> the scheduler, so neither can be forgotten — and has been verified end to end. See
> [README.md](README.md). The OTP then comes from `docker compose logs -f api` instead of
> `pail`, and MySQL is on port **3307**. Either path works for the defense; the first
> `--build` needs a few minutes, so do it well before the room fills.

Also open a fifth terminal tailing the log — **this is where every OTP and SMS appears**, because
the `SmsGateway` adapter runs in log mode (CLAUDE.md rule 4, no real carrier):

```bash
cd apps/api && php artisan pail
```

### Sign-in works like this, every time

There are no passwords. Enter the phone at `/login`, then read the 6-digit code out of the log.
Have the log terminal visible on screen — examiners find it more convincing than a hidden step.

| Phone | Role | Used in |
|---|---|---|
| `0900000001` | citizen | steps 1, 2, 6 |
| `0900000003` | adjudicator | step 3 |
| `0900000005` | insurer_agent | step 4 |
| `0900000009` | regulator | optional |
| `0900000010` | authority | optional |

The full list of 13 is in [README.md](README.md).

---

## 1. The citizen files a report (~4 min)

Sign in as **`0900000001`**. The home screen leads with **«تعرّضت لحادث؟»**.

Add a vehicle first if you want to show the registry (**مركباتي → إضافة مركبة**); the seeded citizen
already owns several, so you can skip straight to reporting.

**بلّغ عن حادث** → the six-step wizard:

1. **المركبة والوقت** — pick a vehicle, set the time, answer the injuries question.
2. **الموقع** — press **تحديد موقعي تلقائياً**. On a laptop the browser will ask for permission and
   usually fail; that is the point. Fall back to **المحافظة + وصف مكان الحادث**, which is the path a
   driver with no GPS actually uses. Type a real landmark.
3. **الصور** — four guided slots with ghost frames. On a laptop these open a file picker; on a phone
   they open the camera. Photos are compressed to ~300KB in the browser before upload.
4. **الطرف الآخر** — enter any Syrian-format number, e.g. `0955555555`.
5. **الإفادة** — a sentence or two.
6. **المراجعة** → **إرسال التبليغ**.

**What to point at**

- The success screen shows the **case number** and the **triage track**. It will say **«إيفاد خبير»**
  (dispatch required), not fast track — because a counterparty identified by phone alone has no
  verifiable policy, and `config/triage.php` routes an uninsured party to a surveyor. That is the
  triage engine working, not a defect. Say so before anyone asks.
- The counterparty's SMS invitation appears in the log terminal, with a `/join/{token}` link.
- **The resilience point, if you have 30 seconds:** start a second report, fill two steps, reload the
  browser mid-wizard. It resumes exactly where you left off — text from localStorage, photos from
  IndexedDB.

## 2. The other driver joins (~2 min, optional but strong)

Copy the `/join/...` link from the log and open it. The page shows the case number, time and
governorate — **and deliberately not the reporter's statement**, so the second driver writes what
they saw rather than a rebuttal. That one-case-two-accounts design is the anti-fraud centrepiece;
it is worth thirty seconds of explanation.

Signing in here requires the phone the reporter entered, so this only completes if you used a phone
you can receive a code for. **If short on time, show the page and its withheld-statement notice, then
move on** — step 3 uses a seeded case and does not depend on this.

## 3. The adjudicator decides liability (~4 min)

Sign out, sign in as **`0900000003`**.

**قائمة تحديد المسؤولية** lists cases whose evidence is complete. The seeded one is there. Open it.

- Both statements sit **side by side**. The screen states plainly that the platform does not analyse
  them — the judgement is the reviewer's. If an examiner asks why there is no automatic contradiction
  detection, that is a deliberate decision recorded in [DECISIONS.md](DECISIONS.md): a wrong
  highlight on a screen that assigns legal liability is worse than none.
- Pick **القاعدة المنطبقة** → `REAR_END`. The proposal card shows the rule in plain Arabic and its
  100/0 split. Press **تطبيق الاقتراح**.
- Try to submit after changing a number: the form demands a **justification**, because the split now
  departs from the rule. Restore the proposal, then **إصدار القرار**.

The case moves to **مهلة الاعتراض**, and the queue worker generates the signed PDF within a second —
watch it appear in the worker's terminal.

## 4. Closing the objection window (~1 min) — the honest bit

Liability decisions carry a **72-hour objection window** (FR-F3). Claims open only when a case
reaches `final`, which the scheduled job does when that window lapses. A demo cannot wait three days,
so back-date the decision and run the **real** scheduled command — no shortcut through the state
machine:

```bash
cd apps/api
php artisan tinker --execute="App\Models\AccidentCase::where('case_no','PASTE-CASE-NO')->firstOrFail()->faultDecision->forceFill(['decided_at'=>now()->subHours(73)])->save();"
php artisan marsad:close-objection-windows
```

> Paste the case number from step 3. Selecting by `case_no` matters — the seeded database holds
> several cases in `objection_window`, and grabbing "the latest" hits the wrong one.

The case is now **نهائي**, and a claim has opened automatically against the at-fault party's insurer.

## 5. The insurer settles (~3 min)

Sign in as **`0900000005`**.

**المطالبات الواردة** is ordered by deadline, not by arrival — with **SLA chips** that turn amber
under a day and red once breached. Filter by **المتجاوزة للمهلة فقط** to show the regulator's view
of a late insurer.

Open the claim from step 4:

- **قرار** — the reason-code select has **no default value**. It cannot be submitted without one
  (FR-CL2), and the reason is written to the claim timeline where the claimant reads it. Choose
  **موافقة كاملة / مشمول بالتغطية كاملاً** → **تسجيل القرار**.
- **تسجيل التسوية** — choose **تعويض نقدي**, enter an amount, submit. Choosing **أمر إصلاح** instead
  reveals a workshop picker listing only *active accredited* workshops.

The claim becomes **مغلقة**, and the timeline gains a settlement entry carrying a **payment
reference** (`REC-…`). That reference comes from the `PaymentRecorder` adapter running in
record-only mode: the platform registers the payout, it does not move money — Syria's settlement
rails are cash-dominant (doc 01 §A.4), and a real rail drops in behind the same interface.

## 6. Public verification — no login (~1 min)

The closing beat. Sign out entirely, or use a private window.

Go to **`/verify`** and paste the report's QR token, or open `/verify/{qr_token}` directly. From the
citizen's case screen the report card links straight to it.

The page confirms the report is **authentic and active** and shows the report number and issue date —
**and nothing else**. No names, no plates, no amounts. Anyone can check a report is real without
learning anything about the people in it (UC-07). Say that sentence out loud; it lands.

---

## If something breaks mid-demo

| Symptom | Cause | Fix |
|---|---|---|
| No OTP in the log | `pail` not running, or the wrong terminal | `php artisan pail`, or open `apps/api/storage/logs/laravel.log` |
| Decision issued but no report / QR | **Queue worker not running** | `php artisan queue:work` — it processes the backlog immediately |
| Adjudication queue empty | Database drifted from earlier runs | `php artisan migrate:fresh --seed` (re-seeding is safe and fast) |
| `close-objection-windows` says "Closed 1" but nothing changed | You back-dated a different case | Select by `case_no`, not `latest()` |
| Camera opens a file picker | You are on a laptop | Expected — `capture="environment"` is a hint desktop browsers ignore |
| Login says the phone is wrong on the join page | The join phone must match what the reporter typed | Use a phone you can read the OTP for, or skip step 2 |

## Worth mentioning if asked

- **Not built:** surveyor field app, damage-estimate submission, and the admin console. Their APIs
  exist and are tested; the screens are guarded routes rendering a placeholder. Sections a role
  cannot reach are never listed for them.
- **Voice statements** are accepted by the API but not recordable in the browser — the backend takes
  mp3/wav/m4a/ogg and browsers produce webm.
- **No map.** The location step uses a governorate picker plus a written address; the authority
  screen is an explicitly-labelled density chart, not a map. Both are recorded decisions, not
  oversights.
- **Test suites:** `cd apps/api && composer check` (184 tests) and `cd apps/web && npm run check`
  (178 tests) both pass, and are quick enough to run live if challenged.
