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

    const filterSelect = document.getElementById('filterCategory');
    const modalSelect = document.getElementById('productCategory');

    filterSelect.innerHTML = '<option value="">Todas</option>';
    modalSelect.innerHTML = '<option value="">Seleccionar</option>';

    response.categories.forEach(category => {
      const opt1 = document.createElement('option');
      opt1.value = category.id;
      opt1.textContent = category.name;
      filterSelect.appendChild(opt1);

      const opt2 = opt1.cloneNode(true);
      modalSelect.appendChild(opt2);
    });

  } catch (error) {
    console.error('Error cargando categorías', error);
    alert('No se pudieron cargar las categorías');
  }
}


  const filterSelect = document.getElementById('filterCategory');
  const modalSelect = document.getElementById('productCategory');

  filterSelect.innerHTML = '<option value="">Todas</option>';
  modalSelect.innerHTML = '<option value="">Seleccionar</option>';

  categories.forEach(category => {
    const opt1 = document.createElement('option');
    opt1.value = category.id;
    opt1.textContent = category.name;
    filterSelect.appendChild(opt1);

    const opt2 = opt1.cloneNode(true);
    modalSelect.appendChild(opt2);
  });


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
    renderProductsTable(response.products);
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

    tr.innerHTML = `
      <td>${product.name}</td>
      <td>${product.category?.name ?? '-'}</td>
      <td>$${Number(product.price_retail).toFixed(2)}</td>
      <td>${product.price_wholesale ? `$${Number(product.price_wholesale).toFixed(2)}` : '-'}</td>
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
  document.getElementById('stockType').value = 'adjust';

  document.getElementById('stockModal').classList.remove('hidden');
}

function closeStockModal() {
  document.getElementById('stockModal').classList.add('hidden');
  currentStockProduct = null;
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

  const quantity = Number(document.getElementById('stockQuantity').value);

  if (!quantity || quantity === 0) {
    alert('La cantidad debe ser distinta de 0');
    return;
  }

  const type = document.getElementById('stockType').value;
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
