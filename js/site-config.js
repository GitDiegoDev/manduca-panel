document.addEventListener('DOMContentLoaded', async () => {
  const user = getUser();
  document.getElementById('userName').textContent = user.name;

  await loadSiteConfig();

  document
    .getElementById('saveConfigBtn')
    .addEventListener('click', saveSiteConfig);
});

/* =========================
   LOAD CONFIG
========================= */

async function loadSiteConfig() {
  try {
    const config = await apiFetch('/site-config');

    document.getElementById('siteNameInput').value = config.site_name;
    document.getElementById('isOpenInput').checked = !!config.is_open;

    // Actualizar título sidebar
    document.getElementById('siteName').textContent = config.site_name;

  } catch (error) {
    console.error('Error cargando configuración', error);
    showMessage('Error al cargar configuración', true);
  }
}

/* =========================
   SAVE CONFIG
========================= */

async function saveSiteConfig() {
  const siteName = document.getElementById('siteNameInput').value.trim();
  const isOpen = document.getElementById('isOpenInput').checked;

  if (!siteName) {
    showMessage('El nombre del sitio es obligatorio', true);
    return;
  }

  try {
    await apiFetch('/site-config', {
      method: 'PUT',
      body: JSON.stringify({
        site_name: siteName,
        is_open: isOpen
      })
    });

    showMessage('Configuración guardada correctamente');
    document.getElementById('siteName').textContent = siteName;

  } catch (error) {
    console.error(error);
    showMessage('Error al guardar configuración', true);
  }
}

/* =========================
   UI HELPERS
========================= */

function showMessage(text, isError = false) {
  const el = document.getElementById('configMessage');
  el.textContent = text;
  el.style.color = isError ? 'red' : 'green';
}
