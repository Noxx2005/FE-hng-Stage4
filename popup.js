const summarizeButton = document.getElementById('summarize-button');
const highlightButton = document.getElementById('highlight-button');
const clearButton = document.getElementById('clear-button');
const loadingSpinner = document.getElementById('loading-spinner');
const summaryOutput = document.getElementById('summary-output');
const pageTitle = document.getElementById('page-title');
const CACHE_PREFIX = 'summary-cache::';
const LOG_PREFIX = '[Popup]';
let currentSummaryText = '';

function setLoading(isLoading) {
  loadingSpinner.style.display = isLoading ? 'flex' : 'none';
  summarizeButton.disabled = isLoading;
  clearButton.disabled = isLoading;
  highlightButton.disabled = isLoading;
}

function showError(message) {
  console.error(LOG_PREFIX, message);
  summaryOutput.innerHTML = '';
  const error = document.createElement('div');
  error.className = 'error-message';
  error.textContent = message;
  summaryOutput.appendChild(error);
}

function renderSummary(summary) {
  console.info(LOG_PREFIX, 'Rendering summary');
  currentSummaryText = summary;
  summaryOutput.innerHTML = '';

  const container = document.createElement('div');
  const lines = summary.split('\n').map((line) => line.trim()).filter(Boolean);
  let currentList = null;

  lines.forEach((line) => {
    const bulletMatch = line.match(/^[-•*]\s+(.*)$/);

    if (bulletMatch) {
      if (!currentList) {
        currentList = document.createElement('ul');
        container.appendChild(currentList);
      }
      const li = document.createElement('li');
      li.textContent = bulletMatch[1];
      currentList.appendChild(li);
      return;
    }

    currentList = null;

    const paragraph = document.createElement('p');
    paragraph.textContent = line;
    paragraph.style.margin = '0 0 10px 0';
    container.appendChild(paragraph);
  });

  if (!container.childNodes.length) {
    const fallback = document.createElement('p');
    fallback.textContent = summary;
    container.appendChild(fallback);
  }

  summaryOutput.appendChild(container);
  clearButton.style.display = 'block';
  highlightButton.style.display = 'block';
}

function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    console.info(LOG_PREFIX, 'Sending message to background', payload.action);
    chrome.runtime.sendMessage(payload, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        console.error(LOG_PREFIX, 'Message failed', lastError.message);
        reject(new Error(lastError.message));
        return;
      }

      console.info(LOG_PREFIX, 'Background responded', response?.error ? 'error' : 'success');
      resolve(response);
    });
  });
}

async function sendTabMessage(payload) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab?.id) {
    throw new Error('No active tab found');
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, payload, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

async function getCachedSummary(url) {
  if (!url) {
    return null;
  }

  const stored = await chrome.storage.local.get([`${CACHE_PREFIX}${url}`]);
  const cachedSummary = stored[`${CACHE_PREFIX}${url}`] || null;

  console.info(LOG_PREFIX, cachedSummary ? 'Cache hit' : 'Cache miss', url);
  return cachedSummary;
}

async function getPageData() {
  console.info(LOG_PREFIX, 'Requesting page content from content script');
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab?.id) {
    throw new Error('No active tab found');
  }

  const response = await new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' }, (result) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        console.error(LOG_PREFIX, 'Failed to read page content', lastError.message);
        reject(new Error(lastError.message));
        return;
      }

      console.info(LOG_PREFIX, 'Received page content response');
      resolve(result);
    });
  });

  if (!response?.ok) {
    throw new Error('Unable to read page content');
  }

  return response;
}

async function clearPageHighlights() {
  try {
    await sendTabMessage({ action: 'clearHighlights' });
  } catch (error) {
    console.warn(LOG_PREFIX, 'Unable to clear page highlights', error);
  }
}

async function highlightKeySections() {
  try {
    if (!currentSummaryText) {
      throw new Error('No summary available to use for highlighting');
    }

    console.info(LOG_PREFIX, 'Requesting in-page highlights');
    highlightButton.disabled = true;

    const response = await sendTabMessage({
      action: 'highlightPage',
      summary: currentSummaryText
    });

    if (response?.error) {
      throw new Error(response.error);
    }

    highlightButton.textContent = 'Highlighted on Page';
  } catch (error) {
    console.error(LOG_PREFIX, 'Highlighting failed', error);
    showError(error.message || 'Unable to highlight key sections on the page.');
  } finally {
    highlightButton.disabled = false;
  }
}

async function summarizePage() {
  try {
    console.info(LOG_PREFIX, 'Summarize button clicked');
    setLoading(true);
    summaryOutput.innerHTML = '';

    const pageData = await getPageData();
    pageTitle.textContent = pageData.title || 'Current Page';
    console.info(LOG_PREFIX, 'Page data ready', {
      title: pageData.title,
      url: pageData.url,
      textLength: pageData.text?.length || 0
    });

    if (!pageData.text) {
      throw new Error('No readable content found on this page');
    }

    const cachedSummary = await getCachedSummary(pageData.url);
    if (cachedSummary) {
      console.info(LOG_PREFIX, 'Using cached summary');
      renderSummary(cachedSummary);
      return;
    }

    console.info(LOG_PREFIX, 'No cache found, requesting fresh summary');
    const response = await sendMessage({
      action: 'summarize',
      text: pageData.text,
      url: pageData.url,
      title: pageData.title
    });

    if (response?.error) {
      throw new Error(response.error);
    }

    renderSummary(response.summary || 'No summary returned.');
  } catch (error) {
    console.error(LOG_PREFIX, 'Summarize failed', error);
    showError(error.message || 'Something went wrong while summarizing the page.');
  } finally {
    setLoading(false);
  }
}

function clearSummary() {
  summaryOutput.innerHTML = '';
  clearButton.style.display = 'none';
  highlightButton.style.display = 'none';
  highlightButton.textContent = 'Highlight Key Sections';
  currentSummaryText = '';
  clearPageHighlights();
}

async function init() {
  try {
    console.info(LOG_PREFIX, 'Popup initialized');
    const pageData = await getPageData();
    pageTitle.textContent = pageData.title || 'Current Page';
  } catch {
    console.warn(LOG_PREFIX, 'Could not load initial page title');
    pageTitle.textContent = 'Current Page';
  }
}

summarizeButton.addEventListener('click', summarizePage);
highlightButton.addEventListener('click', highlightKeySections);
clearButton.addEventListener('click', clearSummary);
document.addEventListener('DOMContentLoaded', init);
