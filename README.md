# Vet Tech Study Buddy: free VTNE diagnostic

A free 25-question VTNE diagnostic with a study-buddy guide ("Scout"), exam-date capture, a personal study plan, and automatic emails before and after the exam, including a pass/fail check-in.

## What's in it

| Page | What it does |
|---|---|
| `/` | Landing page |
| `/quiz` | Confidence check-in, then 25 questions one at a time; Scout reacts and explains every answer. Progress survives a refresh. |
| End of quiz | Shows the score and band. Then asks for first name, email, and the exam date (or a target month if the student hasn't booked yet). |
| `/results/[token]` | Score, weakest areas, per-domain bars, week-by-week plan to the exam date, and every missed question with its explanation |
| `/outcome/[token]` | The pass / didn't pass / haven't taken it yet page that emails link to. Students can add a retake or new date here. |
| `/unsubscribe/[token]` | Unsubscribe page; email clients also get one-click unsubscribe |
| `/admin?key=ADMIN_KEY` | Starts, completions, email capture rate, average score and confidence, reported pass rate, exam months, most-missed questions, emails sent, latest sign-ups |

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
   - `CRON_SECRET` and `ADMIN_KEY`: long random strings
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
- An AI tutor (text, then voice) that answers only from the reviewed question bank and explanations
- A retake plan built from the student's AAVSB score report
