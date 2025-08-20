## URL Shortener (React + TypeScript)

A small URL shortener that runs on http://localhost:3000. It creates unique short links, supports optional custom shortcodes, and an optional validity period. Data is stored in the browser (localStorage). No built‑in language loggers are used.

## Setup
```bash
npm install
npm start
```
Open http://localhost:3000.

## How to Use
1) Paste a long URL
2) (Optional) Add a custom shortcode (a–z, A–Z, 0–9, length 3–20)
3) (Optional) Set validity in minutes (defaults to 30)
4) Click "Shorten" and copy the short link

## Pages
- Shortener: create and manage links
- Statistics: totals, clicks, and application logs (view / clear / export)


## Logging (no built‑in loggers)
- No console logging
- All logs go to localStorage via a custom logger
- View, clear, or export logs from the Statistics page
