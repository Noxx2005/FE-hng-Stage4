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

## Architecture explanation

- The Chrome Extension **does not call Gemini directly**.
- `background.js` sends extracted text to your **Render web service**.
- The Render server reads `GEMINI_API_KEY` from **Render Environment Variables**.
- Gemini returns the summary to Render, and Render returns it to the extension.

## Setup instructions

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

## Popup features

- **Summarize Page** fetches readable content from the current page and generates a structured summary.
- **Highlight Key Sections** uses the generated summary to highlight likely relevant paragraphs on the page.
- **Clear Summary** removes the popup summary and clears any page highlights.

## AI integration explanation

- The popup asks the content script for readable page content.
- The content script extracts the main article text and removes common clutter.
- The popup sends the extracted text to the background service worker.
- The background worker forwards the request to the Render proxy.
- The Render server calls Gemini and returns the structured summary.

## Local extension setup

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. Open any article page and click the extension icon.

## Security decisions

- **Do not commit any `.env` file**.
- **Do not place your API key in the extension files**.
- Keep the key only in **Render Environment Variables**.
- If you change your Render service URL, update `background.js`.

## Trade-offs

- This approach is more secure than hardcoding the API key in the extension.
- It introduces a small network dependency because summaries are fetched through Render.
- If the Render endpoint is down, summarization will fail gracefully.

## Submission checklist

- Confirm the Render service is deployed and responding.
- Load the extension unpacked in Chrome.
- Test summarize, cache reuse, and optional highlighting on a few article pages.
- Record the short demo video requested in the brief.
- Submit the GitHub repo and README with the final Render URL.
