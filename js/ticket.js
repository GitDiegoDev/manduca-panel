// ==========================================
// MAPAS DE TEXTO
// ==========================================
const PAYMENT_METHODS = {
  cash: 'Efectivo',
  debit: 'Debito',
  credit: 'Credito',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other:'Otro',
  qr: 'QR'
};

const SALE_TYPES = {
  retail: 'Mostrador',
  wholesale: 'Mayorista'
};

const SOURCE_TYPES = {
  pos: 'Mostrador',
  menu: 'Menú digital'
};

// ==========================================
// HELPERS
// ==========================================
function formatMoney(value) {
  return Number(value).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function formatDateTime(date) {
  return new Date(date).toLocaleString();
}

// ==========================================
// ENTRY POINT
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');

    let sale;

    if (orderId) {
      //  MODO HISTORICO (dashboard)
      sale = await apiFetch(`/orders/${orderId}`);
    } else {
      //  MODO INMEDIATO (fallback)
      sale = JSON.parse(localStorage.getItem('lastSale'));
    }

    if (!sale) {
      alert('No hay informacion de la venta para mostrar');
      window.close();
      return;
    }

    renderSaleTicket(sale);
    window.print();

  } catch (error) {
    console.error('Error cargando ticket de venta:', error);
    alert('No se pudo cargar el ticket');
  }
});

// ==========================================
// RENDER
// ==========================================
function renderSaleTicket(sale) {

  // Cabecera
  document.getElementById('ticketSiteName').textContent = 'Manducá';
  document.getElementById('ticketDate').textContent =
    sale.created_at ? formatDateTime(sale.created_at) : '—';
  document.getElementById('ticketOrderId').textContent =
    sale.id ?? '—';

  // Totales
  const total = Number(sale.total_amount) || 0;
  document.getElementById('ticketTotal').textContent =
    `$${formatMoney(total)}`;

  // Metodo de pago y tipo
  document.getElementById('ticketPayment').textContent =
    sale.payment_method
      ? `Pago: ${PAYMENT_METHODS[sale.payment_method] ?? sale.payment_method}`
      : '';

  const sourceType = sale.source ? SOURCE_TYPES[sale.source] ?? sale.source : null;
  const saleType = sale.sale_type ? SALE_TYPES[sale.sale_type] ?? sale.sale_type : null;
  document.getElementById('ticketSaleType').textContent =
    `Tipo: ${sourceType || saleType || 'Mostrador'}`;

  // Items
  const itemsContainer = document.getElementById('ticketItems');
  itemsContainer.innerHTML = '';

  if (!sale.items || sale.items.length === 0) {
    itemsContainer.innerHTML =
      '<p class="center">Sin detalle de productos</p>';
    return;
  }

  sale.items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'row';

    const qty = Number(item.quantity) || 0;
    const unit = Number(item.unit_price) || 0;
    const subtotal = Number(item.subtotal) || (unit * qty);

    div.innerHTML = `
      <span>${item.name} x${qty}</span>
      <span>$${formatMoney(subtotal)}</span>
    `;

    itemsContainer.appendChild(div);
  });
}

