const DEFAULT_PROXY_URL = "https://YOUR-SITE-NAME.netlify.app/.netlify/functions/summarize";

async function getProxyUrl() {
  const stored = await chrome.storage.local.get(["proxyUrl"]);
  return stored.proxyUrl || DEFAULT_PROXY_URL;
}

async function summarizeViaProxy(text) {
  const proxyUrl = await getProxyUrl();
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Failed to summarize content");
  }

  return data.summary;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.action === "summarize") {
    summarizeViaProxy(request.text)
      .then((summary) => sendResponse({ summary }))
      .catch((error) => sendResponse({ error: error.message }));

    return true;
  }

  if (request?.action === "setProxyUrl" && typeof request.url === "string") {
    chrome.storage.local.set({ proxyUrl: request.url }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});
