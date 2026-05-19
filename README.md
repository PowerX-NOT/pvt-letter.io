# MongoDB + Vercel Setup

This project runs as:
- Static frontend: `index.html`, `styles.css`, `script.js`
- Vercel API routes: `api/unlock.js`, `api/letter.js`
- MongoDB Atlas for password + letter content

## 1) Configure MongoDB Atlas

1. Create Atlas cluster.
2. Create DB user (example: `love`) with read/write permission.
3. Add Network Access rule (for quick setup: `0.0.0.0/0`).
4. Copy connection string from Atlas.

## 2) Create collection data

Use:
- Database: `love_letter`
- Collection: `secrets`

Insert document 1 (password hash):

Generate hash from your chosen password:

```bash
printf 'demo123' | sha256sum
```

Example output:

```text
d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791  -
```

Use only the hash value (first column) in MongoDB:

```json
{
  "key": "love_letter_password",
  "passwordHash": "d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791"
}
```

Insert document 2 (letter content):

```json
{
  "key": "love_letter_content",
  "title": "My Dearest Love,",
  "pages": [
    {
      "paragraphs": [
        "First page paragraph 1...",
        "First page paragraph 2..."
      ]
    },
    {
      "paragraphs": [
        "Second page paragraph 1...",
        "Second page paragraph 2..."
      ]
    }
  ],
  "closing": "Yours always,\nYour Name"
}
```

Password for hash above: `demo123`

## 3) Configure Vercel environment variables

In Vercel Project -> Settings -> Environment Variables, set:

```env
MONGODB_URI=your-mongodb-atlas-uri
MONGODB_DB=love_letter
MONGODB_COLLECTION=secrets
SESSION_TTL_MS=1800000
SESSION_SECRET=your-long-random-secret
```

Generate secret:

```bash
openssl rand -hex 32
```

## 4) Deploy

1. Push code to GitHub.
2. Import repo into Vercel.
3. Framework preset: `Other`.
4. Root Directory: `.` (repo root).
5. Deploy.

## 5) Important Vercel setting

If `/api/unlock` is blocked with auth page or 401 from Vercel:
- Disable Vercel Deployment Protection / Vercel Authentication for this deployment.

## 6) Verify

- Open your Vercel URL.
- Enter password.
- Expect:
  - `POST /api/unlock` -> 200
  - `GET /api/letter` -> 200

## Troubleshooting

- `500 Missing env: SESSION_SECRET` -> add `SESSION_SECRET` in Vercel env vars and redeploy.
- `500 Missing env: MONGODB_URI` -> add `MONGODB_URI` and redeploy.
- `401 Unauthorized` on `/api/letter` right after unlock -> check cookies not blocked and same domain request.
- `Not Found` on root -> ensure `vercel.json` exists and project root is `.`.
