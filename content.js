const ROOT_SELECTORS = ['article', 'main', '[role="main"]', 'body'];
const LOG_PREFIX = '[Content]';
const HIGHLIGHT_CLASS = 'ai-page-summarizer-highlight';
const HIGHLIGHT_ATTR = 'data-ai-page-summarizer-highlight';
const HIGHLIGHT_STYLE_ID = 'ai-page-summarizer-highlight-style';

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'among', 'because', 'before', 'being', 'between',
  'could', 'during', 'each', 'from', 'have', 'here', 'into', 'more', 'most', 'other',
  'our', 'over', 'same', 'some', 'than', 'that', 'their', 'there', 'these', 'they',
  'this', 'those', 'through', 'under', 'until', 'very', 'with', 'your', 'will', 'just',
  'what', 'when', 'where', 'which', 'while', 'would', 'should', 'could', 'should', 'still',
  'into', 'than', 'then', 'them', 'were', 'been', 'like', 'also', 'from', 'page', 'summary'
]);

const NOISE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'svg',
  'canvas',
  'iframe',
  'object',
  'embed',
  'form',
  'button',
  'input',
  'textarea',
  'select',
  'option',
  'nav',
  'aside',
  'footer',
  'header',
  'dialog',
  'menu',
  'details',
  'summary',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="complementary"]',
  '[aria-label*="advert" i]',
  '.ad',
  '.ads',
  '.ad-banner',
  '.advert',
  '.advertisement',
  '.promo',
  '.promoted',
  '.sponsored',
  '.cookie',
  '.cookie-banner',
  '.consent',
  '.newsletter',
  '.subscribe',
  '.subscription',
  '.paywall',
  '.popup',
  '.modal',
  '.overlay',
  '.tooltip',
  '.sidebar',
  '.side-bar',
  '.comments',
  '.comment-section',
  '.social',
  '.share',
  '.share-buttons',
  '.breadcrumb',
  '.breadcrumbs',
  '[class*="advert" i]',
  '[class*="promo" i]',
  '[class*="cookie" i]',
  '[class*="popup" i]',
  '[class*="modal" i]',
  '[class*="sidebar" i]',
  '[class*="comment" i]',
  '[class*="share" i]',
  '[id*="advert" i]',
  '[id*="promo" i]',
  '[id*="cookie" i]',
  '[id*="popup" i]',
  '[id*="modal" i]',
  '[id*="sidebar" i]',
  '[id*="comment" i]',
  '[id*="share" i]'
];

function cleanClone(root) {
  const clone = root.cloneNode(true);

  NOISE_SELECTORS.forEach((selector) => {
    clone.querySelectorAll(selector).forEach((node) => node.remove());
  });

  return clone;
}

function getReadableText(root) {
  if (!root) return '';

  const clone = cleanClone(root);
  const text = clone.innerText || clone.textContent || '';

  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function getCandidateRoots() {
  const primaryRoots = ROOT_SELECTORS.slice(0, 3)
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  if (primaryRoots.length > 0) {
    console.info(LOG_PREFIX, 'Using primary content roots', primaryRoots.map((node) => node.tagName.toLowerCase()));
    return primaryRoots;
  }

  console.warn(LOG_PREFIX, 'No article/main/role=main found, falling back to body');
  return [document.body];
}

function pickBestReadableText() {
  const candidates = getCandidateRoots();

  for (const root of candidates) {
    const text = getReadableText(root);
    console.info(LOG_PREFIX, 'Candidate text length', root.tagName.toLowerCase(), text.length);
    if (text.length >= 200) {
      return text;
    }
  }

  const fallbackText = getReadableText(document.body);
  console.info(LOG_PREFIX, 'Fallback body text length', fallbackText.length);
  return fallbackText.length > 0 ? fallbackText : '';
}

function extractPageContent() {
  const content = {
    title: document.title || 'Untitled Page',
    text: pickBestReadableText(),
    url: window.location.href
  };

  console.info(LOG_PREFIX, 'Extracted page content', {
    title: content.title,
    url: content.url,
    textLength: content.text.length
  });

  return content;
}

function ensureHighlightStyles() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      background: rgba(255, 214, 102, 0.32) !important;
      outline: 2px solid rgba(245, 158, 11, 0.9) !important;
      border-radius: 6px !important;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12) !important;
      transition: background-color 0.2s ease, outline-color 0.2s ease;
    }
  `;
  document.documentElement.appendChild(style);
}

function getSummaryKeywords(summary) {
  const words = (summary || '')
    .toLowerCase()
    .match(/[a-z]{4,}/g) || [];

  const keywords = [];
  const seen = new Set();

  words.forEach((word) => {
    if (!STOP_WORDS.has(word) && !seen.has(word)) {
      seen.add(word);
      keywords.push(word);
    }
  });

  return keywords.slice(0, 14);
}

function getParagraphCandidates() {
  const selector = 'article p, main p, [role="main"] p, body p';
  return Array.from(document.querySelectorAll(selector)).filter((node) => {
    const text = node.innerText || node.textContent || '';
    return text.trim().length >= 60;
  });
}

function scoreParagraph(text, keywords) {
  const normalized = text.toLowerCase();
  return keywords.reduce((score, keyword) => {
    const matches = normalized.split(keyword).length - 1;
    return score + matches;
  }, 0);
}

function clearHighlights() {
  const highlighted = document.querySelectorAll(`[${HIGHLIGHT_ATTR}="true"]`);
  highlighted.forEach((node) => {
    node.classList.remove(HIGHLIGHT_CLASS);
    node.removeAttribute(HIGHLIGHT_ATTR);
  });

  return highlighted.length;
}

function highlightKeySections(summary) {
  ensureHighlightStyles();
  clearHighlights();

  const keywords = getSummaryKeywords(summary);
  const candidates = getParagraphCandidates();

  if (!candidates.length) {
    throw new Error('No readable paragraphs found to highlight');
  }

  const scored = candidates
    .map((node) => ({
      node,
      text: (node.innerText || node.textContent || '').trim(),
      score: scoreParagraph(node.innerText || node.textContent || '', keywords)
    }))
    .filter((entry) => entry.text.length >= 60)
    .sort((a, b) => b.score - a.score || b.text.length - a.text.length);

  const selection = scored.filter((entry) => entry.score > 0).slice(0, 3);
  const chosen = selection.length > 0 ? selection : scored.slice(0, 3);

  if (!chosen.length) {
    throw new Error('Unable to find key sections to highlight');
  }

  chosen.forEach((entry, index) => {
    entry.node.classList.add(HIGHLIGHT_CLASS);
    entry.node.setAttribute(HIGHLIGHT_ATTR, 'true');

    if (index === 0) {
      entry.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  return chosen.length;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request?.action === 'getPageContent') {
    console.info(LOG_PREFIX, 'Received getPageContent request');
    sendResponse({ ok: true, ...extractPageContent() });
    return true;
  }

  if (request?.action === 'highlightPage') {
    try {
      console.info(LOG_PREFIX, 'Received highlightPage request');
      const highlightedCount = highlightKeySections(request.summary || '');
      console.info(LOG_PREFIX, 'Highlighted page sections', highlightedCount);
      sendResponse({ ok: true, highlightedCount });
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to highlight page sections', error);
      sendResponse({ error: error.message || 'Unable to highlight page sections' });
    }

    return true;
  }

  if (request?.action === 'clearHighlights') {
    try {
      const clearedCount = clearHighlights();
      console.info(LOG_PREFIX, 'Cleared page highlights', clearedCount);
      sendResponse({ ok: true, clearedCount });
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to clear highlights', error);
      sendResponse({ error: error.message || 'Unable to clear page highlights' });
    }

    return true;
  }

  console.warn(LOG_PREFIX, 'Unknown message received', request?.action);
  return false;
});
