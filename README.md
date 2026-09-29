# Farm Mech Design website

A working website: static front end (`public/index.html`) plus a Node/Express API (`server.js`).

## API
| Method | Route | Purpose |
|---|---|---|
| GET | /api/health | Uptime check |
| GET | /api/company | Name, tagline, phone, email |
| GET | /api/services | Service list shown on the page |
| POST | /api/inquiries | Saves an enquiry and optionally emails it |
| GET | /api/inquiries | Lists enquiries (needs header `x-admin-key: <ADMIN_KEY>`) |

## Run locally
```
npm install
node --env-file=.env server.js    # after copying .env.example to .env
```
Open http://localhost:3000

## Host it (Render, free tier)
1. Push this folder to a GitHub repository.
2. On render.com: New > Web Service > pick the repo.
3. Build command: `npm install`  Start command: `npm start`
4. Add the environment variables from `.env.example`.
5. Deploy. Then point your own domain at it in Render's Custom Domains.

Railway, Fly.io or any VPS with Node 18+ work the same way.

## Important
Free hosts wipe local files on redeploy or restart, so `data/inquiries.json` can disappear.
Set the SMTP variables so every enquiry also reaches farmmechdesign@gmail.com by email.
To edit services or contact details, change the `company` and `services` objects at the top of `server.js`.
