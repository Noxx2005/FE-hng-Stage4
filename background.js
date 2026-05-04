const DEFAULT_PROXY_URL = "https://fe-hng-stage4.onrender.com/summarize";
const CACHE_PREFIX = "summary-cache::";

async function getProxyUrl() {
  const stored = await chrome.storage.local.get(["proxyUrl"]);
  return stored.proxyUrl || DEFAULT_PROXY_URL;
}

async function getCachedSummary(url) {
  if (!url) return null;

  const stored = await chrome.storage.local.get([`${CACHE_PREFIX}${url}`]);
  return stored[`${CACHE_PREFIX}${url}`] || null;
}

async function setCachedSummary(url, summary) {
  if (!url) return;

  await chrome.storage.local.set({ [`${CACHE_PREFIX}${url}`]: summary });
}

async function summarizeViaProxy(text, url) {
  if (url) {
    const cached = await getCachedSummary(url);
    if (cached) {
      return cached;
    }
  }

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

  if (url && data.summary) {
    await setCachedSummary(url, data.summary);
  }

  return data.summary;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request?.action === "summarize") {
    summarizeViaProxy(request.text, request.url)
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
