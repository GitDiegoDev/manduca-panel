(function () {
  const token = localStorage.getItem('manduca_token');

  if (!token) {
    window.location.href = 'index.html';
  }
})();
