// ============================================
// MENÚ - PEDIDOS PENDIENTES
// ============================================

async function loadMenuOrders() {
  try {
    const res = await apiFetch('/pos/menu-orders');
    const fetchedOrders = Array.isArray(res)
      ? res
      : Array.isArray(res?.orders)
      ? res.orders
      : Array.isArray(res?.data)
      ? res.data
      : [];
    menuOrders = fetchedOrders.filter(order => !hiddenMenuOrderIds.has(order.id) && order.id !== activeMenuOrderId);

    const container = document.getElementById('menuOrders');
    if (!container) return;

    container.innerHTML = '';

    if (menuOrders.length === 0) {
      container.innerHTML = '<p class="muted">No hay pedidos del menú</p>';
      return;
    }

    menuOrders.forEach(order => {
      const div = document.createElement('div');
      div.className = 'menu-order';
      div.dataset.orderId = String(order.id);

      div.innerHTML = `
        <div class="menu-order-header">
          <strong>#${order.id}</strong>
          <span>${order.customer_name}</span>
        </div>

        <div class="menu-order-info">
          ${order.delivery_type === 'delivery' ? 'Envío' : 'Retiro'}
        </div>

        <div class="menu-order-total">
          Total: ${formatMoney2(order.total_amount)}
        </div>

        <button class="btn btn-primary"
                onclick="openMenuOrder(${order.id})">
          Cobrar
        </button>
      `;

      container.appendChild(div);
    });

  } catch (error) {
    console.error('Error cargando pedidos del menú', error);
  }
}


function normalizeMenuOrderItem(item) {
  const type = (item.type === 'daily_dish' || item.type === 'daily') ? 'daily_dish' : 'product';
  const id = item.product_id || item.daily_dish_id || item.id;

  return {
    type,
    id,
    name: item.name || (type === 'daily_dish' ? 'Plato del día' : 'Producto'),
    price: Number(item.price ?? item.unit_price ?? 0),
    quantity: Number(item.quantity || 1),
    stock: Number.MAX_SAFE_INTEGER
  };
}

function openMenuOrder(orderId) {
  if (blockIfCashClosed()) return;

  const order = menuOrders.find(o => o.id === orderId);
  if (!order) {
    showNotification('No se encontró el pedido seleccionado.', 'error');
    return;
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    showNotification('El pedido no tiene ítems para cobrar.', 'warning');
    return;
  }

  cart = order.items.map(normalizeMenuOrderItem);
  activeMenuOrderId = order.id;
  renderCart();

  showNotification(
    `Pedido #${order.id} cargado en venta actual (${order.customer_name || 'Cliente Web'}).`,
    'success'
  );
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = getUser();
  document.getElementById('userName').textContent = user.name;

  document.getElementById('posDate').textContent =
    new Date().toLocaleDateString();

  saleTypeSelect = document.getElementById('saleType');
  saleTypeSelect.addEventListener('change', loadProducts);

  document
    .getElementById('confirmSale')
    .addEventListener('click', confirmSale);

  document
    .getElementById('cashActionBtn')
    .addEventListener('click', handleCashAction);

  document
    .getElementById('confirmCashClose')
    .addEventListener('click', confirmCashClosure);

  document
    .getElementById('productSearch')
    .addEventListener('input', e => {
      const value = e.target.value.toLowerCase();
      filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(value)
      );
      renderProducts();
    });

  await loadCashStatus();
  await loadProducts();
  await loadDailyDishes();
  await loadMenuOrders();

  // Refresca pedidos del menú periódicamente para evitar recargar la página.
  setInterval(loadMenuOrders, 10000);
});

function hideMenuOrder(orderId) {
  if (!orderId) return;
  hiddenMenuOrderIds.add(orderId);
  localStorage.setItem('hiddenMenuOrderIds', JSON.stringify([...hiddenMenuOrderIds]));

  menuOrders = menuOrders.filter(order => order.id !== orderId);

  const container = document.getElementById('menuOrders');
  if (container) {
    const orderEl = container.querySelector(`[data-order-id="${orderId}"]`);
    if (orderEl) orderEl.remove();

    if (!container.children.length) {
      container.innerHTML = '<p class="muted">No hay pedidos del menú</p>';
    }
  }
}



function blockIfCashClosed() {
  if (!cashIsOpen) {
    showNotification('La caja está cerrada. Ábrela para cargar ventas.', 'warning');
    return true;
  }
  return false;
}




/* =========================
   STATE
========================= */

let products = [];
let filteredProducts = [];
let dailyDishes = [];
let cart = [];
let menuOrders = [];
let hiddenMenuOrderIds = new Set(JSON.parse(localStorage.getItem('hiddenMenuOrderIds') || '[]'));
let activeMenuOrderId = null;
let saleTypeSelect = null;
let cashIsOpen = false;
let cashClosedToday = false;
let expectedCashAmount = 0;
let currentClosureId = null;

function getApiErrorMessage(payload) {
  if (!payload || typeof payload !== 'object') return '';
  if (payload.success === true) return '';
  return payload.error || payload.message || payload.detail || '';
}

function toFiniteNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractClosureIdFromSummary(payload) {
  if (!payload || typeof payload !== 'object') return null;
  // Buscamos el ID en diferentes posibles ubicaciones del payload
  return payload.id ||
         payload.closure_id ||
         payload.cash_id ||
         payload.current_id ||
         payload.closure?.id ||
         payload.cash?.id ||
         payload.current_closure?.id;
}

function extractExpectedAmount(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const keys = [
    'expected_amount',
    'expected_total',
    'total_expected',
    'current_total',
    'total_sales',
    'cash_total',
    'total_amount',
    'total'
  ];

  // Buscamos en nivel superior
  for (const key of keys) {
    const val = toFiniteNumber(payload[key]);
    if (val !== null) return val;
  }

  // Buscamos en objetos anidados conocidos
  const containers = ['cash', 'closure', 'current_closure'];
  for (const container of containers) {
    const obj = payload[container];
    if (obj && typeof obj === 'object') {
      for (const key of keys) {
        const val = toFiniteNumber(obj[key]);
        if (val !== null) return val;
      }
    }
  }

  return null;
}

function extractClosurePayload(payload) {
  if (!payload || typeof payload !== 'object') return null;

  if (payload.closure && typeof payload.closure === 'object') {
    return payload.closure;
  }

  const closureKeys = [
    'id',
    'expected_amount',
    'declared_amount',
    'closure_date',
    'closure_time',
    'user_id',
    'notes'
  ];

  const looksLikeClosure = closureKeys.some(key =>
    Object.prototype.hasOwnProperty.call(payload, key)
  );

  return looksLikeClosure ? payload : null;
}

function getCashOpenFlag(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (typeof payload.is_open === 'boolean') return payload.is_open;
  if (payload.cash && typeof payload.cash.is_open === 'boolean') return payload.cash.is_open;
  return false;
}

function getClosedTodayFlag(payload) {
  if (!payload || typeof payload !== 'object') return false;
  return Boolean(
    payload.closed_today ||
    payload.has_closed_today ||
    payload.closed_at ||
    payload.last_closure_today ||
    payload.cash?.closed_today
  );
}

function formatMoney2(value) {
  return `$${formatMoney(value)}`;
}


/* =========================
   PRODUCTS
========================= */

async function loadProducts() {
  const saleType = saleTypeSelect.value;
  const container = document.getElementById('productsList');

  container.innerHTML = '<p>Cargando productos...</p>';

  try {
    const response = await apiFetch(
      `/pos/products?sale_type=${saleType}`
    );

    products = response.products;
    filteredProducts = products;
    renderProducts();

  } catch (error) {
    container.innerHTML = '<p>Error cargando productos</p>';
    console.error(error);
  }
}

function renderProducts() {
  const container = document.getElementById('productsList');
  container.innerHTML = '';

  if (!filteredProducts || filteredProducts.length === 0) {
    container.innerHTML = '<p>No hay productos disponibles</p>';
    return;
  }

  filteredProducts.forEach(product => {
    const div = document.createElement('div');
    div.className = 'pos-product';

    div.innerHTML = `
      <strong>${product.name}</strong>
      <span>${formatMoney2(product.price)}</span>
      <small>Stock: ${product.stock}</small>
    `;

    div.addEventListener('click', () => addToCart(product));
    container.appendChild(div);
  });
}

/*FUNCIONES PLATO DEL DÍA*/
async function loadDailyDishes() {
  const container = document.getElementById('dailyDishesList');
  container.innerHTML = '<p>Cargando platos del día...</p>';

  try {
    // Nota: Eliminamos el envío de la fecha del cliente para que el servidor decida
    // cuál es el "día de hoy" según su propia configuración de zona horaria.
    const response = await apiFetch(
      '/daily-dishes?active=1'
    );

    dailyDishes = response.dishes;
    renderDailyDishes();

  } catch (error) {
    container.innerHTML = '<p>Error cargando platos</p>';
    console.error(error);
  }
}
/*RENDER PLATO DEL DÍA*/
function renderDailyDishes() {
  const container = document.getElementById('dailyDishesList');
  container.innerHTML = '';

  if (!dailyDishes || dailyDishes.length === 0) {
    container.innerHTML = '<p>No hay platos del día</p>';
    return;
  }

  dailyDishes.forEach(dish => {
    const div = document.createElement('div');
    div.className = 'pos-product daily-dish';

    div.innerHTML = `
      <strong>${dish.name}</strong>
      <span>${formatMoney2(dish.price)}</span>
    `;

    div.addEventListener('click', () => addDailyDishToCart(dish));
    container.appendChild(div);
  });
}


/* =========================
   CART
========================= */

function addToCart(product) {
  if (blockIfCashClosed()) return;

  const existing = cart.find(item => item.id === product.id);
  

  if (existing) {
    if (existing.quantity + 1 > product.stock) {
      showNotification('Stock insuficiente para este producto.', 'error');
      return;
    }
    existing.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      stock: product.stock
    });
  }

  renderCart();
}


function renderCart() {
  const tbody = document.getElementById('cartBody');
  const totalEl = document.getElementById('cartTotal');

  tbody.innerHTML = '';
  let total = 0;

  cart.forEach(item => {
    const subtotal = item.price * item.quantity;
    total += subtotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>
        <div class="quantity-controls">
          <button class="quantity-btn minus">-</button>
          <span>${item.quantity}</span>
          <button class="quantity-btn plus">+</button>
        </div>
      </td>
      <td>${formatMoney2(subtotal)}</td>
      <td><button class="remove-btn">X</button></td>
    `;

    tr.querySelector('.remove-btn')
      .addEventListener('click', () => removeFromCart(item.id));

    const [minusBtn, plusBtn] = tr.querySelectorAll('.quantity-btn');

    minusBtn.addEventListener('click', () => changeQuantity(item.id, -1));
    plusBtn.addEventListener('click', () => changeQuantity(item.id, +1));

    tbody.appendChild(tr);
  });

  totalEl.textContent = formatMoney2(total);
}

function changeQuantity(productId, delta) {
  const item = cart.find(p => p.id === productId);
  if (!item) return;

  const newQty = item.quantity + delta;

  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }

  if (newQty > item.stock) {
    showNotification('Stock insuficiente para este producto.', 'error');
    return;
  }

  item.quantity = newQty;
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(p => p.id !== productId);
  renderCart();
}

/* ADD PLATO DEL DÍA TO CART */
function addDailyDishToCart(dish) {
  if (blockIfCashClosed()) return;

  const existing = cart.find(
    item => item.type === 'daily_dish' && item.id === dish.id
  );

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      type: 'daily_dish',
      id: dish.id,
      name: dish.name,
      price: dish.price,
      quantity: 1
    });
  }

  renderCart();
}



/* =========================
   SALE CONFIRMATION
========================= */

async function confirmSale() {
  const confirmSaleBtn = document.getElementById('confirmSale');
  if (confirmSaleBtn && confirmSaleBtn.disabled) return;

  if (!cashIsOpen) {
    showNotification('No se puede vender porque la caja ya fue cerrada hoy.', 'error');
    return;
  }

  if (cart.length === 0) {
    showNotification('No hay productos en la venta.', 'info');
    return;
  }

  if (confirmSaleBtn) confirmSaleBtn.disabled = true;

  const payload = {
  sale_type: saleTypeSelect.value,
  payment_method: document.getElementById('paymentMethod').value,
  // Vinculamos la venta al ID de la caja abierta actual (Recomendación Auditoría 4.1)
  ...(currentClosureId ? { closure_id: currentClosureId } : {}),
  // Restauramos menu_order_id para mantener el vínculo en el backend,
  // aunque esto pueda causar duplicidad si el backend no está optimizado.
  ...(activeMenuOrderId ? { menu_order_id: activeMenuOrderId } : {}),
  items: cart.map(item => {
    if (item.type === 'daily_dish') {
      return {
        type: 'daily_dish',
        daily_dish_id: item.id,
        name: item.name,
        price: item.price,          // CLAVE
        quantity: item.quantity
      };
    }

    return {
      type: 'product',
      product_id: item.id,
      name: item.name,
      price: item.price,            // CLAVE
      quantity: item.quantity
    };
  })




  };

  const endpoint = activeMenuOrderId ? `/pos/orders/${activeMenuOrderId}` : '/pos/orders';
  const method = activeMenuOrderId ? 'PUT' : 'POST';

  try {
    const response = await apiFetch(endpoint, {
      method: method,
      body: JSON.stringify(payload)
    });

    const saleError = response?.error
      || response?.detail
      || (response?.success === false ? response?.message : '');
    if (saleError || !response?.order) {
      showNotification(saleError || 'No se pudo registrar la venta.', 'error');
      if (confirmSaleBtn) confirmSaleBtn.disabled = false;
      return;
    }

// Guardamos la venta real con origen para el ticket
const saleForTicket = {
  ...(response.order || {}),
  source: activeMenuOrderId ? 'menu' : (response?.order?.source || 'pos')
};
localStorage.setItem('lastSale', JSON.stringify(saleForTicket));

    if (activeMenuOrderId) {
      hideMenuOrder(activeMenuOrderId);
    }

    cart = [];
    activeMenuOrderId = null;

    showNotification(
      'Venta registrada correctamente. ¿Desea ver el ticket?',
      'success',
      'Ver ticket',
      () => {
        closeNotification();
        window.open('ticket.html', '_blank');
      },
      true,
      'Cerrar',
      closeNotification
    );
    renderCart();
    await loadProducts();
    await loadMenuOrders();
    await loadCashStatus();

  } catch (error) {
    console.error(error);
    showNotification('Error registrando la venta. Inténtalo de nuevo.', 'error');
  } finally {
    if (confirmSaleBtn) confirmSaleBtn.disabled = false;
  }
}

function renderCashStatus() {
  const cashEl = document.getElementById('cashStatus');
  const confirmSaleBtn = document.getElementById('confirmSale');
  const cashActionBtn = document.getElementById('cashActionBtn');

  if (!cashEl || !confirmSaleBtn || !cashActionBtn) return;

  if (cashIsOpen) {
    cashEl.textContent = 'Caja abierta';
    cashEl.className = 'cash-status cash-open';

    confirmSaleBtn.disabled = false;
    confirmSaleBtn.title = '';

    cashActionBtn.textContent = 'Cerrar caja';
    cashActionBtn.className = 'danger';

  } else {
    cashEl.textContent = 'Caja cerrada';
    cashEl.className = 'cash-status cash-closed';

    confirmSaleBtn.disabled = true;
    confirmSaleBtn.title = 'Debés abrir la caja para vender';

    cashActionBtn.textContent = cashClosedToday ? 'Reabrir caja' : 'Abrir caja';
    cashActionBtn.className = 'primary';
  }
}

async function loadCashStatus() {
  try {
    const data = await apiFetch('/dashboard/cash-summary');

    // Caso 200 OK pero con mensaje de error (algunos backends devuelven 200 con error: "...")
    const summaryError = getApiErrorMessage(data);
    const isNoCashMsg = summaryError && (
      summaryError.toLowerCase().includes('no hay caja') ||
      summaryError.toLowerCase().includes('no hay una caja abierta')
    );

    if (isNoCashMsg) {
      cashIsOpen = false;
      cashClosedToday = getClosedTodayFlag(data);
      currentClosureId = null;
      renderCashStatus();
      return;
    }

    // Éxito: Hay una caja abierta
    cashIsOpen = getCashOpenFlag(data);
    cashClosedToday = getClosedTodayFlag(data);
    currentClosureId = extractClosureIdFromSummary(data);

    const expectedFromSummary = extractExpectedAmount(data);
    if (expectedFromSummary !== null) {
      expectedCashAmount = expectedFromSummary;
    }

    renderCashStatus();

  } catch (error) {
    // Detectar si el error es simplemente que no hay caja (404 o mensaje específico)
    const errorMsg = (error.error || error.message || '').toLowerCase();
    const isClosedState = (error.$status === 404) ||
                          errorMsg.includes('no hay caja') ||
                          errorMsg.includes('no hay una caja abierta');

    if (isClosedState) {
      cashIsOpen = false;
      cashClosedToday = getClosedTodayFlag(error) || cashClosedToday;
      currentClosureId = null;
      renderCashStatus();
    } else {
      // Error real (500, Network error, etc.)
      console.error('Error verificando estado de caja', error);
      cashIsOpen = false;
      renderCashStatus();
    }
  }
}


async function handleCashAction() {
  if (cashIsOpen) {
    openCashModal();
  } else {
    if (cashClosedToday) {
      showNotification(
        'La caja ya fue cerrada hoy. ¿Querés reabrirla igual?',
        'warning',
        'Reabrir',
        async () => {
          closeNotification();
          await openCash(true);
        },
        true,
        'Cancelar',
        closeNotification
      );
      return;
    }
    await openCash(false);
  }
}

async function openCash(forceReopen = false) {
  const cashActionBtn = document.getElementById('cashActionBtn');
  if (cashActionBtn) cashActionBtn.disabled = true;

  try {
    const response = await apiFetch('/dashboard/cash-open', {
      method: 'POST',
      body: JSON.stringify({ force_reopen: forceReopen })
    });

    const openError = getApiErrorMessage(response);
    if (openError) {
      showNotification(openError, 'error');
      return;
    }

    await loadCashStatus();

    if (cashIsOpen) {
      showNotification(
        forceReopen ? 'Caja reabierta correctamente.' : 'Caja abierta correctamente.',
        'success'
      );
      return;
    }

    showNotification('No se pudo abrir la caja. Verificá el estado e intentá de nuevo.', 'error');
  } catch (error) {
    const message = error?.message || 'No se pudo abrir la caja. Verificá el backend.';
    showNotification(message, 'error');
  } finally {
    if (cashActionBtn) cashActionBtn.disabled = false;
  }
}


async function openCashModal() {
  await loadCashStatus();
  const expected = expectedCashAmount;
  document.getElementById('cashExpected').textContent = formatMoney2(expected);

  document.getElementById('cashDeclared').value = '';
  document.getElementById('cashNotes').value = '';

  document.getElementById('cashModal').classList.remove('hidden');
}

function closeCashModal() {
  document.getElementById('cashModal').classList.add('hidden');
}
async function confirmCashClosure() {
  const confirmClosureBtn = document.getElementById('confirmCashClose');

  const declaredInput = document.getElementById('cashDeclared').value;
  if (declaredInput === '' || declaredInput === null) {
    showNotification('Ingresa el monto declarado para cerrar caja.', 'warning');
    return;
  }

  const declared = Number(declaredInput);

  if (isNaN(declared)) {
    showNotification('Ingresa un monto declarado válido.', 'warning');
    return;
  }

  if (confirmClosureBtn) confirmClosureBtn.disabled = true;

  const notes = document.getElementById('cashNotes').value;

  try {
    const response = await apiFetch('/dashboard/cash-closure', {
      method: 'POST',
      body: JSON.stringify({
        declared_amount: declared,
        notes
      })
    });

    const closureError = getApiErrorMessage(response);
    const closurePayload = extractClosurePayload(response);
    if (closureError || !closurePayload) {
      showNotification(closureError || 'No se pudo cerrar la caja.', 'error');
      if (confirmClosureBtn) confirmClosureBtn.disabled = false;
      return;
    }

    // 1. Éxito: Actualizar estado local inmediatamente para evitar race conditions
    cashIsOpen = false;
    cashClosedToday = true;
    currentClosureId = null;
    cart = [];
    renderCart();

    // 2. Cerrar modal y refrescar UI
    closeCashModal();
    renderCashStatus();

    // 3. Abrir ticket inmediatamente
    const ticketUrl = closurePayload.id
      ? `cash-ticket.html?id=${closurePayload.id}`
      : 'cash-ticket.html';

    localStorage.setItem(
      'lastCashClosure',
      JSON.stringify({
        ...closurePayload,
        user: getUser()
      })
    );

    window.open(ticketUrl, '_blank');
    showNotification('Caja cerrada correctamente. Se ha abierto el ticket en una nueva pestaña.', 'success');

    // 4. Sincronizar con el backend en segundo plano
    loadCashStatus();

  } catch (error) {
    showNotification('Error al cerrar caja. Inténtalo de nuevo.', 'error');
    console.error(error);
  } finally {
    if (confirmClosureBtn) confirmClosureBtn.disabled = false;
  }
}

// ==========================================================================
// FUNCIONES DE NOTIFICACIÓN
// ==========================================================================

function showNotification(message, type = 'info', buttonText = 'Aceptar', onClick = closeNotification, showCancel = false, cancelText = 'Cancelar', onCancel = closeNotification) {
  const modal = document.getElementById('notificationModal');
  const messageEl = document.getElementById('notificationMessage');
  const buttonEl = document.getElementById('notificationAccept');
  const cancelEl = document.getElementById('notificationCancel');
  
  messageEl.textContent = message;
  buttonEl.textContent = buttonText;
  buttonEl.onclick = onClick;
  
  if (showCancel) {
    cancelEl.style.display = 'inline';
    cancelEl.textContent = cancelText;
    cancelEl.onclick = onCancel;
  } else {
    cancelEl.style.display = 'none';
  }
  
  modal.classList.remove('hidden');
}

function closeNotification() {
  const modal = document.getElementById('notificationModal');
  modal.classList.add('hidden');
}









