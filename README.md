# AI Page Summarizer Chrome Extension

A Manifest V3 Chrome Extension that extracts readable webpage content, sends it to a secure Netlify Function, and returns an AI-generated summary.

## Project Structure

```text
ai-page-summarizer/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── popup.css
├── netlify.toml
├── netlify/
│   └── functions/
│       └── summarize.js
└── README.md
```

## How the Netlify setup works

- The Chrome Extension **does not call Gemini directly**.
- `background.js` sends extracted text to a **Netlify Function**.
- The Netlify Function reads `GEMINI_API_KEY` from **Netlify Environment Variables**.
- Gemini returns the summary to Netlify, and Netlify returns it to the extension.

## What you need to do on Netlify

1. Push this repo to GitHub.
2. Go to **Netlify** and sign in.
3. Click **Add new site** → **Import an existing project**.
4. Connect your GitHub repo.
5. Deploy the site.
6. After deployment, go to **Site settings** → **Environment variables**.
7. Add:
   - `GEMINI_API_KEY` = your Gemini API key
8. Save the variable.
9. Netlify will give you a site URL like:
   - `https://your-site-name.netlify.app`
10. Copy that URL and update `background.js`:
   - `https://YOUR-SITE-NAME.netlify.app/.netlify/functions/summarize`

## Local extension setup

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. Open any article page and click the extension icon.

## Deployment notes

- **Do not commit any `.env` file**.
- **Do not place your API key in the extension files**.
- Keep the key only in **Netlify Environment Variables**.
- If you change your Netlify site URL, update `background.js`.

## Security decisions

- API key stays on Netlify, not in the browser.
- The extension sends only the page text to your proxy.
- The proxy validates input and returns only the summary.

## Trade-offs

- This approach is more secure than hardcoding the API key in the extension.
- It introduces a small network dependency because summaries are fetched through Netlify.
- If the Netlify endpoint is down, summarization will fail gracefully.

## Next step after deployment

Once Netlify gives you the final URL, I can help you connect the popup flow end-to-end and test the summarizer request.
