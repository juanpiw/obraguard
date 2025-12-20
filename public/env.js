// Runtime API base override for obra_guard front-end.
// Default: production backend origin. In local dev, prefer localhost backend.
(function () {
  try {
    // Forzamos API base a prod para evitar host derivado que pueda colgar.
    window.AF_API_URL = 'https://www.api.thefutureagencyai.com';
  } catch (_e) {
    window.AF_API_URL = 'https://www.api.thefutureagencyai.com';
  }
})();



