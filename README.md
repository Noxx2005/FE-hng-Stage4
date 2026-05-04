# AI Page Summarizer Chrome Extension

A Manifest V3 Chrome Extension that extracts readable webpage content, sends it to a secure Render backend, and returns an AI-generated summary.

## Project Structure

```text
ai-page-summarizer/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── popup.css
├── package.json
├── server.js
├── render.yaml
└── README.md
```

## How the Render setup works

- The Chrome Extension **does not call Gemini directly**.
- `background.js` sends extracted text to your **Render web service**.
- The Render server reads `GEMINI_API_KEY` from **Render Environment Variables**.
- Gemini returns the summary to Render, and Render returns it to the extension.

## What you need to do on Render

1. Push this repo to GitHub.
2. Go to **Render** and sign in.
3. Click **New +** → **Web Service**.
4. Connect your GitHub repo.
5. Use these settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add the environment variable:
   - `GEMINI_API_KEY` = your Gemini API key
7. Optional: add the environment variable:
   - `GEMINI_MODEL` = `gemini-3.1-flash-lite-preview`
8. Optional: add the environment variable:
   - `GEMINI_API_VERSION` = `v1beta`
9. Deploy the service.
10. Render will give you a URL like:
   - `https://your-service-name.onrender.com`
11. Your summarize endpoint will be:
   - `https://your-service-name.onrender.com/summarize`
12. Update `background.js` with your Render URL if needed, or store it with the `setProxyUrl` message.

## Local extension setup

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. Open any article page and click the extension icon.

## Deployment notes

- **Do not commit any `.env` file**.
- **Do not place your API key in the extension files**.
- Keep the key only in **Render Environment Variables**.
- If you change your Render service URL, update `background.js`.

## Security decisions

- API key stays on Render, not in the browser.
- The extension sends only the page text to your proxy.
- The proxy validates input and returns only the summary.

## Trade-offs

- This approach is more secure than hardcoding the API key in the extension.
- It introduces a small network dependency because summaries are fetched through Render.
- If the Render endpoint is down, summarization will fail gracefully.

## Next step after deployment

Once Render gives you the final URL, I can help you connect the popup flow end-to-end and test the summarizer request.
