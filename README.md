# Scraper API (Simplified)

A minimal Express API that serves home content from a local JSON file.

## Endpoints

- `GET /home` — Returns the contents of `data/home.json`.

## Folder Structure

```
scraper-api/
│
├── data/
│   └── home.json
│
├── src/
│   ├── routes/
│   │   └── homeRoutes.js
│   ├── app.js
│
├── server.js
├── package.json
├── .gitignore
└── README.md
```

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the server:
   ```sh
   npm start
   ```

## Notes
- No Puppeteer, no scraping, no browser automation.
- Just a simple JSON API for home content.

## Render Deployment
1. Connect this repo to Render.
2. Select **Web Service**.
3. Render configuration will automatically apply using `render.yaml`.
4. Ensure you use the free tier if applicable, but note that Puppeteer can be memory intensive.
