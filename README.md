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

Insert document 2 (letter content).

### Single page (recommended)

Use a flat `paragraphs` array. The app shows everything on **one page**: title, date (top right), all paragraphs, then closing. The page dropdown stays hidden.

```json
{
  "key": "love_letter_content",
  "title": "My Dearest Love,",
  "date": "May 20, 2026",
  "paragraphs": [
    "Sometimes I pause and feel grateful that life brought us together.",
    "You bring calm, laughter, and strength into my everyday moments.",
    "I promise to support you, respect you, and grow with you always."
  ],
  "closing": "Yours always,\nYour Name"
}
```

### Multiple pages (optional)

Use a `pages` array when you want readers to flip between pages. Each page has its own **title**, **date** (top right), **paragraphs**, and **closing** (in that order). The page dropdown appears only when there are 2 or more pages.

```json
{
  "key": "love_letter_content",
  "pages": [
    {
      "page": 1,
      "title": "My Dearest Love,",
      "date": "May 20, 2026",
      "paragraphs": [
        "First page paragraph 1...",
        "First page paragraph 2..."
      ],
      "closing": "Yours always,\nYour Name"
    },
    {
      "page": 2,
      "title": "To My Sweetheart,",
      "date": "June 14, 2026",
      "paragraphs": [
        "Second page paragraph 1...",
        "Second page paragraph 2..."
      ],
      "closing": "Forever yours,\nYour Name"
    }
  ]
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
- After unlock, the letter displays in order: **title → paragraphs → closing**.
- If you used a single `paragraphs` array, you should see one page with no page selector.

## Troubleshooting

- `500 Missing env: SESSION_SECRET` -> add `SESSION_SECRET` in Vercel env vars and redeploy.
- `500 Missing env: MONGODB_URI` -> add `MONGODB_URI` and redeploy.
- `401 Unauthorized` on `/api/letter` right after unlock -> check cookies not blocked and same domain request.
- `Not Found` on root -> ensure `vercel.json` exists and project root is `.`.
- Letter split into many pages unexpectedly -> use a flat `paragraphs` array for one page, or define explicit `pages` in MongoDB (paragraphs are never auto-split).
- Title or closing missing -> ensure `title` and `closing` are top-level fields on the `love_letter_content` document, not inside `paragraphs`.
