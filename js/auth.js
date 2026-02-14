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
  localStorage.removeItem('manduca_token');
  localStorage.removeItem('manduca_user');
  window.location.href = 'index.html';
}
