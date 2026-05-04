function isVisible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function getMainContainer() {
  return document.querySelector('article') || document.querySelector('main') || document.body;
}

function getReadableText(root) {
  const clone = root.cloneNode(true);
  const unwantedSelectors = [
    'script',
    'style',
    'nav',
    'aside',
    'footer',
    'header',
    'form',
    'button',
    'input',
    'textarea',
    'noscript',
    'svg',
    'canvas'
  ];

  unwantedSelectors.forEach((selector) => {
    clone.querySelectorAll(selector).forEach((node) => node.remove());
  });

  const text = clone.innerText || clone.textContent || '';
  return text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

function extractPageContent() {
  const title = document.title || 'Untitled Page';
  const root = getMainContainer();
  let text = getReadableText(root);

  if (!text || text.length < 200) {
    text = getReadableText(document.body);
  }

  return {
    title,
    text,
    url: window.location.href
  };
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request?.action === 'getPageContent') {
    const data = extractPageContent();
    sendResponse({ ok: true, ...data });
    return true;
  }

  return false;
});
