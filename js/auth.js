function setSession(token, user) {
  localStorage.setItem('manduca_token', token);
  localStorage.setItem('manduca_user', JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem('manduca_token');
}

function getUser() {
  const user = localStorage.getItem('manduca_user');
  return user ? JSON.parse(user) : null;
}

function isAuthenticated() {
  return !!getToken();
}

function logout() {
  // Mostrar pantalla de carga
  const loader = document.createElement('div');
  loader.className = 'fullscreen-loader';
  loader.innerHTML = `
    <div class="spinner"></div>
    <p>Cerrando sesión...</p>
  `;
  document.body.appendChild(loader);

  localStorage.removeItem('manduca_token');
  localStorage.removeItem('manduca_user');

  // Pequeño retraso para que la animación sea visible
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 600);
}
