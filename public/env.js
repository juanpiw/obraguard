// Runtime API base override for obra_guard front-end.
// Default: production backend origin. In local dev, prefer localhost backend.
(function () {
  try {
    var host = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : '';
    var isLocal = host === 'localhost' || host === '127.0.0.1';
    window.AF_API_URL = isLocal ? ('http://' + host + ':4000') : 'https://www.api.thefutureagencyai.com';
  } catch (_e) {
    window.AF_API_URL = 'https://www.api.thefutureagencyai.com';
  }
})();
