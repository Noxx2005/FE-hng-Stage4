const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;
const MAX_INPUT_LENGTH = 20000;
const LOG_PREFIX = '[Server]';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function extractSummaryText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('')
    .trim();
}

app.get('/health', (_req, res) => {
  console.info(LOG_PREFIX, 'Health check requested');
  res.status(200).json({ ok: true, service: 'ai-page-summarizer-proxy' });
});

app.post('/summarize', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  console.info(LOG_PREFIX, 'Summarize request received', {
    model: GEMINI_MODEL,
    hasApiKey: Boolean(apiKey),
    textLength: typeof req.body?.text === 'string' ? req.body.text.length : 0
  });

  if (!apiKey) {
    console.error(LOG_PREFIX, 'Missing GEMINI_API_KEY environment variable');
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable' });
  }

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) {
    console.warn(LOG_PREFIX, 'Rejected request with empty text');
    return res.status(400).json({ error: 'Request body must include non-empty text' });
  }

  const truncatedText = text.slice(0, MAX_INPUT_LENGTH);
  const prompt = [
    'Summarize this webpage content in a clear, structured format.',
    'Return:',
    '- 3 to 5 bullet point summary',
    '- key insights',
    '- estimated reading time',
    'Keep it concise, useful, and easy to scan.',
    '',
    truncatedText
  ].join('\n');

  try {
    console.info(LOG_PREFIX, 'Calling Gemini API', {
      endpoint: GEMINI_API_URL,
      truncatedTextLength: truncatedText.length
    });

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(LOG_PREFIX, 'Gemini request failed', response.status, errorText);
      return res.status(response.status).json({
        error: 'Gemini request failed',
        details: errorText.slice(0, 500)
      });
    }

    const data = await response.json();
    const summary = extractSummaryText(data);

    console.info(LOG_PREFIX, 'Gemini response received', {
      hasSummary: Boolean(summary),
      candidateCount: Array.isArray(data?.candidates) ? data.candidates.length : 0
    });

    if (!summary) {
      console.error(LOG_PREFIX, 'No summary returned from Gemini');
      return res.status(502).json({ error: 'No summary returned from Gemini' });
    }

    console.info(LOG_PREFIX, 'Summarize request completed successfully');
    return res.status(200).json({ summary });
  } catch (error) {
    console.error(LOG_PREFIX, 'Unexpected server error', error);
    return res.status(500).json({
      error: 'Unexpected server error',
      details: error.message
    });
  }
});

app.use((_, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.listen(PORT, () => {
  console.log(`AI Page Summarizer proxy listening on port ${PORT}`);
});
