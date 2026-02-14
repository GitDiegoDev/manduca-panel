// ==========================================
// MAPAS DE TEXTO
// ==========================================
const PAYMENT_METHODS = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other:'Otro',
  qr: 'QR'
};

// ==========================================
// FORMATO MONEDA (ARG)
// ==========================================
function formatMoney(value) {
  return Number(value).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// ==========================================
// HELPERS FECHA
// ==========================================
function formatDate(date) {
  return new Date(date).toLocaleDateString();
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
    const closureId = params.get('id');

    let closure;

    if (closureId) {
      // 👉 MODO HISTÓRICO (dashboard)
      closure = await apiFetch(`/cash-closures/${closureId}`);
    } else {
      // 👉 MODO INMEDIATO (fallback)
      closure = JSON.parse(localStorage.getItem('lastCashClosure'));
    }

    if (!closure) {
      alert('No hay información de cierre para mostrar');
      window.close();
      return;
    }

    renderCashTicket(closure);

    // Imprimir automáticamente
    window.print();

  } catch (error) {
    console.error('Error cargando ticket de cierre:', error);
    alert('No se pudo cargar el ticket de cierre');
  }
});

// ==========================================
// RENDER PRINCIPAL
// ==========================================
function renderCashTicket(closure) {

  // --------------------------
  // CABECERA
  // --------------------------
  document.getElementById('siteName').textContent = 'Manducá';

  document.getElementById('closureDate').textContent =
    closure.closure_date ? formatDate(closure.closure_date) : '—';

  document.getElementById('closureTime').textContent =
    closure.closure_time || '—';

  // Usuario (backend → name / fallback → ID)
  const userText =
    closure.user?.name
      ? closure.user.name
      : closure.user_id
        ? `Usuario ID ${closure.user_id}`
        : '—';

  document.getElementById('closureUser').textContent = userText;

  // --------------------------
  // RESUMEN ACTIVIDAD
  // --------------------------
  document.getElementById('ordersCount').textContent =
    closure.breakdown?.total_orders ?? 0;

  // --------------------------
  // RESUMEN MONETARIO
  // --------------------------
  const expected  = Number(closure.expected_amount) || 0;
  const declared  = Number(closure.declared_amount) || 0;
  const difference = declared - expected;

  document.getElementById('expectedAmount').textContent =
    `$${formatMoney(expected)}`;

  document.getElementById('declaredAmount').textContent =
    `$${formatMoney(declared)}`;

  const diffEl = document.getElementById('difference');
  diffEl.textContent = `$${formatMoney(difference)}`;

  // Interpretación
  let diffLabel = 'CAJA BALANCEADA';
  let diffColor = '#000';

  if (difference < 0) {
    diffLabel = 'FALTANTE DE CAJA';
    diffColor = 'red';
  } else if (difference > 0) {
    diffLabel = 'SOBRANTE DE CAJA';
    diffColor = 'green';
  }

  diffEl.style.color = diffColor;

  // Texto explicativo debajo
  const note = document.createElement('div');
  note.textContent = diffLabel;
  note.style.fontWeight = 'bold';
  note.style.fontSize = '12px';
  note.style.marginTop = '2px';
  note.style.color = diffColor;

  diffEl.appendChild(note);

  // --------------------------
  // DETALLE POR MÉTODO DE PAGO
  // --------------------------
  const list = document.getElementById('paymentBreakdown');
  list.innerHTML = '';

  const breakdown = closure.breakdown?.by_payment_method || {};
  let hasMovements = false;

  Object.entries(breakdown).forEach(([method, amount]) => {
    const value = Number(amount) || 0;

    if (value <= 0) return;
    if (method === 'other') return;

    hasMovements = true;

    const li = document.createElement('li');
    const label = PAYMENT_METHODS[method] ?? method;
    li.textContent = `${label}: $${formatMoney(value)}`;
    list.appendChild(li);
  });

  if (!hasMovements) {
    const li = document.createElement('li');
    li.textContent = 'Sin movimientos registrados';
    list.appendChild(li);
  }

  // --------------------------
  // OBSERVACIONES
  // --------------------------
  document.getElementById('closureNotes').textContent =
    closure.notes || 'Sin observaciones';

  // --------------------------
  // PIE
  // --------------------------
  document.getElementById('generatedAt').textContent =
    formatDateTime(new Date());
}
