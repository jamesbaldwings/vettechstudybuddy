// Run once a day (Railway cron service). Calls the app's follow-up endpoint.
const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const res = await fetch(`${base}/api/cron`, {
  method: "POST",
  headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
});
const body = await res.text();
console.log(res.status, body);
if (!res.ok) process.exit(1);
