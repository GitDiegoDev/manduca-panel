let categories = [];
let products = [];
let reorderMode = false;
let sortableInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = getUser();
  document.getElementById('userName').textContent = user.name;

  loadCategories();
  await loadProducts();

  document
    .getElementById('applyFilters')
    .addEventListener('click', loadProducts);

  document
    .getElementById('btnNewProduct')
    .addEventListener('click', openNewProductModal);

  document
    .getElementById('btnReorder')
    .addEventListener('click', toggleReorderMode);

  document
    .getElementById('btnCancelReorder')
    .addEventListener('click', toggleReorderMode);

  document
    .getElementById('btnSaveOrder')
    .addEventListener('click', saveNewOrder);

  document
    .getElementById('productForm')
    .addEventListener('submit', submitProductForm);

  document
    .getElementById('cancelStockAdjust')
    .addEventListener('click', closeStockModal);

  document
    .getElementById('confirmStockAdjust')
    .addEventListener('click', saveStockMovement);
});

let currentStockProduct = null;

/* =========================
   CATEGORIES (FIXED)
========================= */

async function loadCategories() {
  try {
    const response = await apiFetch('/categories');
    console.log('Categorías recibidas:', response);

    const filterSelect = document.getElementById('filterCategory');
    const modalSelect = document.getElementById('productCategory');

    if (!filterSelect || !modalSelect) {
      console.warn('No se encontraron los elementos select para categorías');
      return;
    }

    filterSelect.innerHTML = '<option value="">Todas</option>';
    modalSelect.innerHTML = '<option value="">Seleccionar</option>';

    // Manejar diferentes formatos de respuesta
    const categoryList = Array.isArray(response)
      ? response
      : response.categories || response.data || [];

    if (categoryList.length === 0) {
      console.info('No se encontraron categorías o el formato es desconocido');
    }

    categoryList.forEach(category => {
      const opt1 = document.createElement('option');
      opt1.value = category.id;
      opt1.textContent = category.name;
      filterSelect.appendChild(opt1);

      const opt2 = opt1.cloneNode(true);
      modalSelect.appendChild(opt2);
    });

    // Actualizar variable global por si se usa en otro lugar
    categories = categoryList;

  } catch (error) {
    console.error('Error cargando categorías:', error);
    // Mostrar más info del error si es posible
    const errorMsg = error.message || (typeof error === 'string' ? error : 'Error desconocido');
    console.error('Detalle del error:', errorMsg);
    alert('No se pudieron cargar las categorías. Verifique la consola para más detalles.');
  }
}


/* =========================
   PRODUCTS LIST
========================= */

async function loadProducts() {
  const categoryId = document.getElementById('filterCategory').value;
  const active = document.getElementById('filterActive').value;

  const params = [];
  if (categoryId) params.push(`category_id=${categoryId}`);
  if (active !== '') params.push(`active=${active}`);

  const query = params.length ? `?${params.join('&')}` : '';

  try {
    const response = await apiFetch(`/products${query}`);

    // Manejar diferentes formatos de respuesta
    products = Array.isArray(response)
      ? response
      : response.products || response.data || [];

    // Ordenar por sort_order
    products.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    renderProductsTable(products);
  } catch (error) {
    console.error('Error cargando productos', error);
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('productsTableBody');
  tbody.innerHTML = '';

  if (!products || products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8">No hay productos</td></tr>`;
    return;
  }

  products.forEach(product => {
    const tr = document.createElement('tr');
    tr.dataset.id = product.id;

    if (reorderMode) {
      tr.innerHTML = `
        <td class="drag-handle">☰ ${product.name}</td>
        <td>${product.category?.name ?? '-'}</td>
        <td>$${formatMoney(product.price_retail)}</td>
        <td>${product.price_wholesale ? `$${formatMoney(product.price_wholesale)}` : '-'}</td>
        <td>${product.stock}</td>
        <td>${product.show_in_menu ? 'Sí' : 'No'}</td>
        <td>${product.active ? 'Sí' : 'No'}</td>
        <td>-</td>
      `;
    } else {
      tr.innerHTML = `
        <td>${product.name}</td>
        <td>${product.category?.name ?? '-'}</td>
        <td>$${formatMoney(product.price_retail)}</td>
        <td>${product.price_wholesale ? `$${formatMoney(product.price_wholesale)}` : '-'}</td>
        <td>${product.stock}</td>
        <td>${product.show_in_menu ? 'Sí' : 'No'}</td>
        <td>${product.active ? 'Sí' : 'No'}</td>
        <td>
          <button class="btn-edit">✏️</button>
          <button class="btn-stock">📦</button>
        </td>
      `;

      tr.querySelector('.btn-edit')
        .addEventListener('click', () => openEditProductModal(product));

      tr.querySelector('.btn-stock')
        .addEventListener('click', () => openStockModal(product));
    }

    tbody.appendChild(tr);
  });
}

/* =========================
   PRODUCT MODAL
========================= */

function openNewProductModal() {
  document.getElementById('modalTitle').textContent = 'Nuevo producto';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  openProductModal();
}

function openEditProductModal(product) {
  document.getElementById('modalTitle').textContent = 'Editar producto';

  document.getElementById('productId').value = product.id;
  document.getElementById('productCategory').value = product.category_id;
  document.getElementById('productName').value = product.name;
  document.getElementById('productDescription').value = product.description ?? '';
  document.getElementById('priceRetail').value = product.price_retail;
  document.getElementById('priceWholesale').value = product.price_wholesale ?? '';
  document.getElementById('lowStock').value = product.low_stock_threshold ?? '';
  document.getElementById('showInMenu').checked = product.show_in_menu;
  document.getElementById('active').checked = product.active;

  openProductModal();
}

function openProductModal() {
  document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
}

/* =========================
   STOCK MODAL
========================= */

function openStockModal(product) {
  currentStockProduct = product;

  document.getElementById('stockProductName').textContent =
    `Producto: ${product.name} (Stock actual: ${product.stock})`;

  document.getElementById('stockQuantity').value = '';
  document.getElementById('stockReason').value = '';
  document.getElementById('stockType').value = ''; // Forzar selección

  document.getElementById('stockModal').classList.remove('hidden');
  document.getElementById('stockQuantity').focus();
}

function closeStockModal() {
  document.getElementById('stockModal').classList.add('hidden');
  currentStockProduct = null;
}

/* =========================
   REORDER LOGIC
========================= */

function toggleReorderMode() {
  reorderMode = !reorderMode;

  const btnReorder = document.getElementById('btnReorder');
  const btnSaveOrder = document.getElementById('btnSaveOrder');
  const btnCancelReorder = document.getElementById('btnCancelReorder');
  const btnNewProduct = document.getElementById('btnNewProduct');
  const tbody = document.getElementById('productsTableBody');

  if (reorderMode) {
    btnReorder.classList.add('hidden');
    btnNewProduct.classList.add('hidden');
    btnSaveOrder.classList.remove('hidden');
    btnCancelReorder.classList.remove('hidden');

    sortableInstance = new Sortable(tbody, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost'
    });
  } else {
    btnReorder.classList.remove('hidden');
    btnNewProduct.classList.remove('hidden');
    btnSaveOrder.classList.add('hidden');
    btnCancelReorder.classList.add('hidden');

    if (sortableInstance) {
      sortableInstance.destroy();
      sortableInstance = null;
    }
  }

  renderProductsTable(products);
}

async function saveNewOrder() {
  const tbody = document.getElementById('productsTableBody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const orderedIds = rows.map(row => row.dataset.id).filter(id => id);

  try {
    const response = await apiFetch('/products/reorder', {
      method: 'POST',
      body: JSON.stringify({ ordered_ids: orderedIds })
    });

    if (response.success || response.message) {
      alert('Orden guardado correctamente');
      toggleReorderMode();
      await loadProducts();
    } else {
      throw new Error('No se pudo guardar el orden');
    }
  } catch (error) {
    console.error('Error guardando el orden:', error);
    alert('Error guardando el nuevo orden de productos');
  }
}

/* =========================
   SAVE PRODUCT
========================= */

async function submitProductForm(e) {
  e.preventDefault();

  const id = document.getElementById('productId').value;

  const payload = {
    category_id: document.getElementById('productCategory').value,
    name: document.getElementById('productName').value,
    description: document.getElementById('productDescription').value,
    price_retail: document.getElementById('priceRetail').value,
    price_wholesale: document.getElementById('priceWholesale').value || null,
    low_stock_threshold: document.getElementById('lowStock').value || null,
    show_in_menu: document.getElementById('showInMenu').checked,
    active: document.getElementById('active').checked,
  };

  try {
    if (id) {
      await apiFetch(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    closeProductModal();
    await loadProducts();

  } catch (error) {
    alert('Error guardando producto');
    console.error(error);
  }
}

/* =========================
   SAVE STOCK
========================= */

async function saveStockMovement() {
  if (!currentStockProduct) return;

  const type = document.getElementById('stockType').value;
  if (!type) {
    alert('Debe seleccionar el tipo de movimiento');
    return;
  }

  const quantity = Number(document.getElementById('stockQuantity').value);

  if (!quantity || quantity === 0) {
    alert('La cantidad debe ser distinta de 0');
    return;
  }

  const reason = document.getElementById('stockReason').value;

  const endpoint =
    type === 'purchase'
      ? `/products/${currentStockProduct.id}/stock/purchase`
      : `/products/${currentStockProduct.id}/stock/adjust`;

  const payload =
    type === 'purchase'
      ? { quantity, notes: reason }
      : { quantity, reason };

  try {
    await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    closeStockModal();
    await loadProducts();

  } catch (error) {
    alert('Error ajustando stock');
    console.error(error);
  }
}
