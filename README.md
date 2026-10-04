# Velora Parts — React front end

React 18 + Vite + React Router + Axios + Framer Motion. Talks only to the LavaLust API
(never to the database).

Pages: Home (hero), About, Cars (public catalog with search + category filter), Contact,
Login, Dashboard (protected CRUD: list, add, edit, delete, logout).

## Run locally

```bash
cp .env.example .env     # VITE_API_URL=http://127.0.0.1:3000
npm install
npm run dev
```

## Deploy on Render (Static Site)

- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_API_URL=https://your-api.onrender.com` (set before building)
- Rewrite rule: `/*` → `/index.html` (already in `render.yaml` and `public/_redirects`)

Then set `ALLOW_ORIGIN` on the API service to this site's URL.

## Notes

- Tokens are stored in `localStorage`; an expired access token is refreshed automatically.
- Part pictures are the SVGs in `public/parts/`; the dashboard also accepts any `http(s)://` image link.
- Change the shop e-mail in `src/config.js` (the contact form opens the visitor's mail app).
