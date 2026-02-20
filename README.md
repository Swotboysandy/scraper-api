# OliverFlix Scraper API

A self-hosted, production-ready REST API using Express and Puppeteer to bypass Cloudflare and scrape media data for the OliverFlix React Native app.

## Features
- Headless browsing with `puppeteer-extra-plugin-stealth`
- Bypasses basic Cloudflare challenges
- In-memory Node caching
- Rate optimization (global browser instance)
- Render.com deployment ready

## Local Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Setup environment variables**:
   Create a `.env` file based on `.env.example`.
   ```bash
   cp .env.example .env
   ```
3. **Run for development**:
   ```bash
   npm run dev
   ```

## Example API Endpoints

- **GET `/home`**: Fetches homepage sections.
- **GET `/details/:id`**: Fetches specific details for an ID.
- **GET `/stream/:id`**: Fetches streaming source configurations.

Example fetch from RN:
```javascript
const res = await fetch('http://localhost:3000/home');
const json = await res.json();
console.log(json.data);
```

## Render Deployment
1. Connect this repo to Render.
2. Select **Web Service**.
3. Render configuration will automatically apply using `render.yaml`.
4. Ensure you use the free tier if applicable, but note that Puppeteer can be memory intensive.
