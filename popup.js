const summarizeButton = document.getElementById('summarize-button');
const clearButton = document.getElementById('clear-button');
const loadingSpinner = document.getElementById('loading-spinner');
const summaryOutput = document.getElementById('summary-output');
const pageTitle = document.getElementById('page-title');
const CACHE_PREFIX = 'summary-cache::';

function setLoading(isLoading) {
  loadingSpinner.style.display = isLoading ? 'flex' : 'none';
  summarizeButton.disabled = isLoading;
  clearButton.disabled = isLoading;
}

function showError(message) {
  summaryOutput.innerHTML = '';
  const error = document.createElement('div');
  error.className = 'error-message';
  error.textContent = message;
  summaryOutput.appendChild(error);
}

function renderSummary(summary) {
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
}

function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
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
  return stored[`${CACHE_PREFIX}${url}`] || null;
}

async function getPageData() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab?.id) {
    throw new Error('No active tab found');
  }

  const response = await new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' }, (result) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve(result);
    });
  });

  if (!response?.ok) {
    throw new Error('Unable to read page content');
  }

  return response;
}

async function summarizePage() {
  try {
    setLoading(true);
    summaryOutput.innerHTML = '';

    const pageData = await getPageData();
    pageTitle.textContent = pageData.title || 'Current Page';

    if (!pageData.text) {
      throw new Error('No readable content found on this page');
    }

    const cachedSummary = await getCachedSummary(pageData.url);
    if (cachedSummary) {
      renderSummary(cachedSummary);
      return;
    }

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
    showError(error.message || 'Something went wrong while summarizing the page.');
  } finally {
    setLoading(false);
  }
}

function clearSummary() {
  summaryOutput.innerHTML = '';
  clearButton.style.display = 'none';
}

async function init() {
  try {
    const pageData = await getPageData();
    pageTitle.textContent = pageData.title || 'Current Page';
  } catch {
    pageTitle.textContent = 'Current Page';
  }
}

summarizeButton.addEventListener('click', summarizePage);
clearButton.addEventListener('click', clearSummary);
document.addEventListener('DOMContentLoaded', init);
