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

  return response.json();
}
