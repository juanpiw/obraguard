// Runtime API base override for obra_guard front-end.
// Default: production backend origin. In local dev, prefer localhost backend.
(function () {
  const PROD_API = 'https://www.api.thefutureagencyai.com';
  try {
    // Si estamos en localhost, usa backend local por defecto; de lo contrario, prod.
    const host = window.location?.hostname || '';
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const localApi = `http://${host || 'localhost'}:4000`;
    window.AF_API_URL = window.AF_API_URL || (isLocal ? localApi : PROD_API);
  } catch (_e) {
    window.AF_API_URL = PROD_API;
  }
})();




