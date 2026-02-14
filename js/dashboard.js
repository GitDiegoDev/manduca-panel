document.addEventListener('DOMContentLoaded', async () => {
  const user = getUser();
  document.getElementById('userName').textContent = user.name;

  const fromInput = document.getElementById('fromDate');
  const toInput = document.getElementById('toDate');
  const applyBtn = document.getElementById('applyFilters');

  // Inicializar fechas en HOY
  fromInput.value = getToday();
  toInput.value = getToday();

  // Carga inicial
  await loadDashboard(fromInput.value, toInput.value);

  // Botón aplicar filtros
  applyBtn.addEventListener('click', async () => {
    const from = fromInput.value;
    const to = toInput.value;

    if (!from || !to || from > to) {
      alert('Rango de fechas inválido');
      return;
    }

    await loadDashboard(from, to);
  });
});

/* =========================
   FUNCIONES PRINCIPALES
========================= */

async function loadDashboard(from, to) {
  try {
    const query = `?from=${from}&to=${to}`;

    const data = await apiFetch(`/dashboard/summary${query}`);

    renderSummary(data);
    renderTodayVsYesterday(data.today_vs_yesterday);
    renderPayments(data.sales_by_payment_method);

    await loadTopProducts(from, to);
    await loadSalesTickets(from, to);
    await loadCashClosures(from, to);

  } catch (error) {
    console.error('Error cargando dashboard:', error);
  }
}

/* =========================
   RENDER RESUMEN
========================= */

function renderSummary(data) {
  document.getElementById('todayTotal').textContent =
    `$${formatMoney(data.today.total)}`;
  document.getElementById('todayOrders').textContent =
    `${data.today.orders} órdenes`;

  document.getElementById('periodTotal').textContent =
    `$${formatMoney(data.period.total)}`;
  document.getElementById('periodOrders').textContent =
    `${data.period.orders} órdenes`;

  document.getElementById('cashStatus').textContent =
    data.cash.is_open ? 'Caja abierta' : 'Caja cerrada';

  document.getElementById('lowStock').textContent =
    `${data.low_stock.count} productos`;
}

function renderTodayVsYesterday(vs) {
  document.getElementById('vsTodayTotal').textContent =
    `$${formatMoney(vs.today.total)}`;

  document.getElementById('vsYesterdayTotal').textContent =
    `$${formatMoney(vs.yesterday.total)}`;

  const variationEl = document.getElementById('vsVariation');

  if (vs.variation.total_percent === null) {
    variationEl.textContent = 'Sin comparación disponible';
  } else {
    const sign = vs.variation.total_percent > 0 ? '+' : '';
    variationEl.textContent =
      `${sign}${vs.variation.total_percent.toFixed(1)}% respecto a ayer`;
  }
}

function renderPayments(payments) {
  const paymentsList = document.getElementById('paymentsList');
  paymentsList.innerHTML = '';

  if (!payments || payments.length === 0) {
    paymentsList.innerHTML = '<li>Sin ventas</li>';
    return;
  }

  payments.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.payment_method}: $${formatMoney(item.total)}`;
    paymentsList.appendChild(li);
  });
}

/* =========================
   TOP PRODUCTS
========================= */

async function loadTopProducts(from, to) {
  const list = document.getElementById('topProductsList');
  list.innerHTML = '<li>Cargando...</li>';

  try {
    const products = await apiFetch(
      `/dashboard/top-products?from=${from}&to=${to}&limit=5`
    );

    list.innerHTML = '';

    if (products.length === 0) {
      list.innerHTML = '<li>Sin ventas en el período</li>';
      return;
    }

    products.forEach((product, index) => {
      const li = document.createElement('li');
      li.textContent = `${index + 1}. ${product.name} — ${product.quantity} u.`;
      list.appendChild(li);
    });

  } catch (error) {
    list.innerHTML = '<li>Error al cargar productos</li>';
    console.error(error);
  }
}

/* =========================
   🧾 TICKETS DE VENTA
========================= */

async function loadSalesTickets(from, to) {
  const tbody = document.getElementById('salesTicketsTable');
  tbody.innerHTML = '<tr><td colspan="6">Cargando ventas…</td></tr>';

  try {
    const tickets = await apiFetch(
      `/dashboard/orders?from=${from}&to=${to}`
    );

    tbody.innerHTML = '';

    if (!tickets || tickets.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6">Sin ventas en el período</td></tr>';
      return;
    }

    tickets.forEach(order => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>#${order.id}</td>
        <td>${formatDateTime(order.created_at)}</td>
        <td>$${formatMoney(order.total_amount)}</td>
        <td>${order.payment_method}</td>
        <td>${order.sale_type}</td>
        <td>
          <button onclick="viewSaleTicket(${order.id})">
            Ver
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error(error);
    tbody.innerHTML =
      '<tr><td colspan="6">Error cargando ventas</td></tr>';
  }
}

function viewSaleTicket(orderId) {
  window.open(`ticket.html?id=${orderId}`, '_blank');
}

/* =========================
   🧾 CIERRES DE CAJA
========================= */

async function loadCashClosures(from, to) {
  const tbody = document.getElementById('cashClosuresTable');
  tbody.innerHTML = '<tr><td colspan="7">Cargando cierres…</td></tr>';

  try {
    const closures = await apiFetch(
      `/dashboard/cash-closures?from=${from}&to=${to}`
    );

    tbody.innerHTML = '';

    if (!closures || closures.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7">Sin cierres en el período</td></tr>';
      return;
    }

    closures.forEach(c => {
      const tr = document.createElement('tr');

const diff = Number(c.declared_amount) - Number(c.expected_amount);

let status = 'Balanceada';
let statusClass = 'status-ok';

if (diff < 0) {
  status = 'Faltante';
  statusClass = 'status-faltante';
} else if (diff > 0) {
  status = 'Sobrante';
  statusClass = 'status-sobrante';
}

tr.innerHTML = `
  <td>${formatDate(c.closure_date)}</td>

  <td>
    ${c.user?.name ?? `Usuario ${c.user_id}`}
  </td>

  <td>$${formatMoney(c.expected_amount)}</td>

  <td>$${formatMoney(c.declared_amount)}</td>

  <td class="${diff < 0 ? 'diff-negative' : diff > 0 ? 'diff-positive' : ''}">
    $${formatMoney(diff)}
  </td>

  <td class="${statusClass}">
    ${status}
  </td>

  <td>
    <button onclick="viewCashClosure(${c.id})">
      Ver
    </button>
  </td>
`;


      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error(error);
    tbody.innerHTML =
      '<tr><td colspan="7">Error cargando cierres</td></tr>';
  }
}

function viewCashClosure(id) {
  window.open(`cash-ticket.html?id=${id}`, '_blank');
}

/* =========================
   HELPERS
========================= */

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function formatMoney(value) {
  return Number(value).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

function formatDateTime(date) {
  return new Date(date).toLocaleString();
}
