# Vet Tech Study Buddy: free VTNE diagnostic

A free 25-question VTNE diagnostic with a study-buddy guide ("Sara"), exam-date capture, a personal study plan, and automatic emails before and after the exam, including a pass/fail check-in.

## What's in it

| Page | What it does |
|---|---|
| `/` | Landing page |
| `/quiz` | Confidence check-in, then 25 questions one at a time; Sara reacts and explains every answer. Progress survives a refresh. |
| End of quiz | Shows the score and band. Then asks for first name, email, and the exam date (or a target month if the student hasn't booked yet). |
| `/results/[token]` | Score, weakest areas, per-domain bars, week-by-week plan to the exam date, and every missed question with its explanation |
| `/outcome/[token]` | The pass / didn't pass / haven't taken it yet page that emails link to. Students can add a retake or new date here. |
| `/unsubscribe/[token]` | Unsubscribe page; email clients also get one-click unsubscribe |
| `/admin` (owner accounts) | Starts, completions, email capture rate, average score and confidence, reported pass rate, exam months, most-missed questions, emails sent, latest sign-ups |

## Voice study buddy (Sara)

Students who sign up can talk out loud with Sara from their results page. She can review the questions they missed, quiz them on their weak areas, explain topics, and help with exam nerves. Live captions appear on screen.

- Runs on the ElevenLabs agent **"Sara - Vet Tech Study Buddy"** (`agent_9401m7ngg5ezfm8bm413a579rmz0`) in your ElevenLabs account.
- Sara uses a warm American female voice and the Claude Haiku 4.5 model. She teaches from the reviewed question content, which is attached to the agent as a knowledge-base document. Her rules: no invented doses or numbers, no advice for real animals, no claims about real exam questions.
- She gets each student's first name, exam date, confidence, score, weak areas and missed questions when a session starts.
- Limits: 10 minutes per session (set on the agent), `VOICE_SESSIONS_PER_DAY` per student (default 3), and 300 sessions a day across the whole agent (an ElevenLabs setting).
- The agent requires a signed URL to connect. `/api/voice/session` gets one from the server, so the API key never reaches the browser.
- Sessions are logged in `voice_sessions` with the ElevenLabs conversation ID, so you can read transcripts in ElevenLabs.
- To set it up, add `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` to the web service.
- When you add questions, update the knowledge-base document on the agent so Sara can teach them.

## Installable app (PWA)

The site installs to the home screen on iPhone, Android and desktop, opening full screen with its own icon.
- `app/manifest.ts` is the app manifest; the icons are in `public/icons`.
- `public/sw.js` is the service worker. Pages already opened, such as a student's results and plan, work offline; other pages fall back to `/offline`. API calls are never cached.
- The results page shows an install card: a one-tap Install button on Android and desktop Chrome, and "Add to Home Screen" instructions on iPhone.
- When you change `sw.js`, bump `VERSION` so old caches are cleared.

## Automatic emails

Sent by a daily job (`POST /api/cron`). Each email goes out once per lead, even if the job runs twice.

| Email | When |
|---|---|
| Welcome + results | Right after sign-up |
| One week to go | 7 days before the exam date |
| Tomorrow's the day | Day before the exam |
| How did it go? | 4 days after the exam (AAVSB posts scores in the MyAAVSB portal within about 3 days). With only a target month, this goes 4 days after that month ends. |
| Reminder | 7 days later, if they haven't answered |
| Booked your date yet? | 14 days after sign-up, if they gave only a target month |

When a student reports "didn't pass" with a retake date, or "not yet" with a new date, the check-ins start over for the new date. A pass stops all emails.

Without `SENDGRID_API_KEY`, emails are printed to the server log instead of sent (dry-run). That's handy for testing.

Timing settings live in `src/config.ts`, along with the brand name, the buddy's name and the founder line. Questions live in `src/data/questions.ts`.

## Deploy on Railway

1. Push this folder to a new GitHub repo.
2. In Railway: create a new project from the repo, then add a **Postgres** database. Railway sets `DATABASE_URL` for you.
3. On the web service, set these variables (see `.env.example`):
   - `APP_URL`: `https://vettechstudybuddy.com`
   - `SENDGRID_API_KEY`, `EMAIL_FROM` (a verified SendGrid sender), `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`
   - `POSTAL_ADDRESS`: required by CAN-SPAM in every email footer
   - `CRON_SECRET`: a long random string
   - `OWNER_EMAILS`: the emails of owner accounts that can open `/admin`
   - `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID=agent_9401m7ngg5ezfm8bm413a579rmz0`: turns on voice
4. Build command: `npm run build`. Start command: `npm start`. Start runs the database setup automatically.
5. Add a second service from the same repo for the daily emails:
   - Start command: `npm run cron`
   - Cron schedule: `12 13 * * *` (daily at 13:12 UTC, about 7 a.m. Central)
   - Variables: `APP_URL` and `CRON_SECRET`, matching the web service
6. Point your domain at the web service.

## Run locally

```bash
npm install
cp .env.example .env.local   # set DATABASE_URL to a local Postgres
npm run migrate
npm run build && npm start
```

To test the email schedule on local or staging only, set `ALLOW_TEST_DATES=1` and run:

```bash
curl -X POST "http://localhost:3000/api/cron?today=2027-03-08" -H "authorization: Bearer $CRON_SECRET"
```

## Next up

- A full practice-question bank and timed practice exams
- Text chat with Sara using the same rules as voice
- A retake plan built from the student's AAVSB score report

## Student platform

- **Accounts:** email sign-in links (no passwords). Signing up from the diagnostic signs a new student in. An email that already has an account gets a link instead, so nobody can get into someone else's account by typing their email.
- **Study home** (`/home`): VTNE countdown, pass status with "Start my 90 days", readiness score, voice minutes.
- **Passes:** Stripe Checkout (`/api/checkout`), webhook at `/api/stripe/webhook` (event `checkout.session.completed`, plus `charge.refunded`). Passes wait until the student presses Start (must start within 12 months). Founding price for the first `FOUNDING_LIMIT` Exam Passes.
- **Voice minutes:** every account gets 10 free minutes. Passes add 300/100/200; extra voice adds 60. Sessions are charged on the server by elapsed time; sessions the browser never closes are charged 10 minutes after 15 minutes.
- **Practice** (`/practice`): smart mix weighted by VTNE topic weight and weakness, by topic, or missed questions. Free accounts get `FREE_DAILY_PRACTICE` a day.
- **Practice exams** (`/exam`, pass holders): up to 150 questions weighted like the VTNE, 72 seconds each, flags, autosave, scored automatically when time runs out.
- **Text chat with Sara** (`/sara?mode=text`, pass holders): same ElevenLabs agent in text-only mode.
- **Owner admin** (`/admin`, for accounts listed in `OWNER_EMAILS` or with role `owner`; sign in with email and password): overview, sales, students (grant free passes, e.g. the pass guarantee), question bank editor (draft → reviewed → retired), question reports.
- **Daily job** also sends a reminder 7 days before a pass ends.

To turn on payments: set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, and add a webhook endpoint `https://vettechstudybuddy.com/api/stripe/webhook` for `checkout.session.completed` and `charge.refunded`.
