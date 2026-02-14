document.addEventListener('DOMContentLoaded', async () => {
  const user = getUser();
  document.getElementById('userName').textContent = user.name;

  const dateInput = document.getElementById('dishDate');
  dateInput.value = getToday();

  await loadDailyDishes();

  dateInput.addEventListener('change', loadDailyDishes);
  document
    .getElementById('btnNewDish')
    .addEventListener('click', openNewDishModal);

  document
    .getElementById('dishForm')
    .addEventListener('submit', saveDish);
});

/* =========================
   LOAD
========================= */

async function loadDailyDishes() {
  const date = document.getElementById('dishDate').value;

  try {
    const response = await apiFetch(`/daily-dishes?date=${date}`);
    renderDailyDishes(response.dishes);
  } catch (error) {
    console.error('Error cargando platos del día', error);
  }
}

function renderDailyDishes(dishes) {
  const tbody = document.getElementById('dailyDishesTable');
  tbody.innerHTML = '';

  if (!dishes || dishes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No hay platos para este día</td></tr>`;
    return;
  }

  dishes.forEach(dish => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${dish.name}</td>
      <td>${dish.description ?? '-'}</td>
      <td>$${Number(dish.price).toFixed(2)}</td>
      <td>${dish.active ? 'Sí' : 'No'}</td>
      <td>
        <button class="btn-edit">✏️</button>
        <button class="btn-delete">🗑️</button>
      </td>
    `;

    tr.querySelector('.btn-edit')
      .addEventListener('click', () => openEditDishModal(dish));

    tr.querySelector('.btn-delete')
      .addEventListener('click', () => deleteDish(dish.id));

    tbody.appendChild(tr);
  });
}

/* =========================
   MODAL
========================= */

function openNewDishModal() {
  document.getElementById('dishModalTitle').textContent = 'Nuevo plato';
  document.getElementById('dishForm').reset();
  document.getElementById('dishId').value = '';
  openDishModal();
}

function openEditDishModal(dish) {
  document.getElementById('dishModalTitle').textContent = 'Editar plato';

  document.getElementById('dishId').value = dish.id;
  document.getElementById('dishName').value = dish.name;
  document.getElementById('dishDescription').value = dish.description ?? '';
  document.getElementById('dishPrice').value = dish.price;
  document.getElementById('dishActive').checked = dish.active;

  openDishModal();
}

function openDishModal() {
  document.getElementById('dishModal').classList.remove('hidden');
}

function closeDishModal() {
  document.getElementById('dishModal').classList.add('hidden');
}

/* =========================
   SAVE / DELETE
========================= */

async function saveDish(e) {
  e.preventDefault();

  const id = document.getElementById('dishId').value;
  const date = document.getElementById('dishDate').value;

  const payload = {
  dish_date: date,
  name: document.getElementById('dishName').value,
  description: document.getElementById('dishDescription').value,
  price: Number(document.getElementById('dishPrice').value),
  stock: Number(document.getElementById('dailyStock').value),
  active: document.getElementById('dishActive').checked,
  show_in_menu: true
};


  try {
    if (id) {
      await apiFetch(`/daily-dishes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch('/daily-dishes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    closeDishModal();
    await loadDailyDishes();

  } catch (error) {
    alert('Error guardando plato');
    console.error(error);
  }
}

async function deleteDish(id) {
  if (!confirm('¿Eliminar plato del día?')) return;

  try {
    await apiFetch(`/daily-dishes/${id}`, { method: 'DELETE' });
    await loadDailyDishes();
  } catch (error) {
    alert('Error eliminando plato');
    console.error(error);
  }
}

/* =========================
   HELPERS
========================= */

function getToday() {
  return new Date().toISOString().split('T')[0];
}
