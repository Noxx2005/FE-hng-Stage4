const DEFAULT_PROXY_URL = "https://fe-hng-stage4.onrender.com/summarize";
const CACHE_PREFIX = "summary-cache::";
const LOG_PREFIX = "[Background]";

async function getProxyUrl() {
  const stored = await chrome.storage.local.get(["proxyUrl"]);
  const proxyUrl = stored.proxyUrl || DEFAULT_PROXY_URL;
  console.info(LOG_PREFIX, "Using proxy URL", proxyUrl);
  return proxyUrl;
}

async function getCachedSummary(url) {
  if (!url) return null;

  const stored = await chrome.storage.local.get([`${CACHE_PREFIX}${url}`]);
  const cached = stored[`${CACHE_PREFIX}${url}`] || null;
  console.info(LOG_PREFIX, cached ? "Cache hit" : "Cache miss", url);
  return cached;
}

async function setCachedSummary(url, summary) {
  if (!url) return;

  console.info(LOG_PREFIX, "Caching summary", url);
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
  console.info(LOG_PREFIX, "Requesting summary from proxy", {
    url,
    textLength: text?.length || 0
  });

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(LOG_PREFIX, "Proxy request failed", response.status, data);
    throw new Error(data.error || "Failed to summarize content");
  }

  if (url && data.summary) {
    await setCachedSummary(url, data.summary);
  }

  console.info(LOG_PREFIX, "Proxy request succeeded");
  return data.summary;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request?.action === "summarize") {
    console.info(LOG_PREFIX, "Received summarize request", {
      url: request.url,
      textLength: request.text?.length || 0
    });

    summarizeViaProxy(request.text, request.url)
      .then((summary) => sendResponse({ summary }))
      .catch((error) => sendResponse({ error: error.message }));

    return true;
  }

  if (request?.action === "setProxyUrl" && typeof request.url === "string") {
    console.info(LOG_PREFIX, "Updating proxy URL", request.url);
    chrome.storage.local.set({ proxyUrl: request.url }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});
