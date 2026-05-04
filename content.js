const ROOT_SELECTORS = ['article', 'main', '[role="main"]', 'body'];

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
    return primaryRoots;
  }

  return [document.body];
}

function pickBestReadableText() {
  const candidates = getCandidateRoots();

  for (const root of candidates) {
    const text = getReadableText(root);
    if (text.length >= 200) {
      return text;
    }
  }

  const fallbackText = getReadableText(document.body);
  return fallbackText.length > 0 ? fallbackText : '';
}

function extractPageContent() {
  return {
    title: document.title || 'Untitled Page',
    text: pickBestReadableText(),
    url: window.location.href
  };
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request?.action === 'getPageContent') {
    sendResponse({ ok: true, ...extractPageContent() });
    return true;
  }

  return false;
});
