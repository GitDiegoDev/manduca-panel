document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error');
  const submitBtn = this.querySelector('button[type="submit"]');

  errorEl.textContent = '';
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      errorEl.textContent = data.message || 'Error al iniciar sesión';
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      return;
    }

    setSession(data.token, data.user);
    window.location.href = 'dashboard.html';

  } catch (error) {
    errorEl.textContent = 'No se pudo conectar con el servidor';
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});
