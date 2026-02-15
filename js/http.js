async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('manduca_token');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    logout();
    throw new Error('No autenticado');
  }

  const data = await response.json();

  if (data && typeof data === 'object') {
    Object.defineProperty(data, '$status', {
      value: response.status,
      enumerable: false,
      configurable: true
    });
  }

  return data;
}

/**
 * Formatea un valor numérico como moneda (2 decimales, separador es-AR).
 * @param {number|string} value
 * @returns {string}
 */
function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
