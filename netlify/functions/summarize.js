const GEMINI_MODEL = "gemini-1.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

function extractSummaryText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || "")
    .join("")
    .trim();
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method Not Allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, { error: "Missing GEMINI_API_KEY environment variable" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return jsonResponse(400, { error: "Invalid JSON payload" });
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text) {
    return jsonResponse(400, { error: "Request body must include non-empty text" });
  }

  const prompt = [
    "Summarize this webpage content in a clear, structured format.",
    "Return:",
    "- 3 to 5 bullet point summary",
    "- key insights",
    "- estimated reading time",
    "Keep it concise, useful, and easy to scan.",
    "",
    text
  ].join("\n");

  try {
    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
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
      return jsonResponse(response.status, {
        error: "Gemini request failed",
        details: errorText.slice(0, 500)
      });
    }

    const data = await response.json();
    const summary = extractSummaryText(data);

    if (!summary) {
      return jsonResponse(502, { error: "No summary returned from Gemini" });
    }

    return jsonResponse(200, { summary });
  } catch (error) {
    return jsonResponse(500, {
      error: "Unexpected server error",
      details: error.message
    });
  }
};
