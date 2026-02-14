# Manual de Usuario - Panel de Administración Manducá

Bienvenido al manual de usuario del sistema de gestión de Manducá. Este documento detalla el funcionamiento de cada módulo del panel para facilitar su uso diario.

---

## 1. Acceso al Sistema (Login)

Para ingresar al sistema, debe dirigirse a la página de inicio e introducir sus credenciales:
- **Email**: Su correo electrónico registrado.
- **Contraseña**: Su clave de acceso personal.

Haga clic en **"Ingresar"** para acceder al Dashboard.

---

## 2. Dashboard (Panel Principal)

El Dashboard ofrece una visión general del estado del negocio.

### Filtros de Fecha
En la parte superior, encontrará filtros para seleccionar el período que desea visualizar:
- **Desde / Hasta**: Permite ver estadísticas de un rango de fechas específico.
- **Botón Aplicar**: Actualiza todas las métricas del panel según las fechas elegidas.

### Métricas de Ventas
- **Ventas de hoy**: Muestra el monto total y la cantidad de órdenes realizadas en el día actual.
- **Ventas del período**: Muestra el total acumulado en el rango de fechas seleccionado.
- **Hoy vs Ayer**: Una comparación directa del rendimiento de ventas respecto al día anterior, incluyendo el porcentaje de variación.

### Otras Estadísticas
- **Ventas por método de pago**: Desglose de ingresos según el medio utilizado (Efectivo, Débito, Crédito, etc.).
- **Productos más vendidos**: Listado de los 5 productos con mayor rotación.
- **Caja**: Estado actual de la caja (Abierta/Cerrada).
- **Stock bajo**: Alerta sobre la cantidad de productos que han alcanzado su nivel mínimo de stock.

### Historial de Actividad
- **Tickets de venta**: Listado de las últimas ventas. Puede hacer clic en **"Ver"** para visualizar el ticket detallado.
- **Cierres de caja**: Registro de los cierres realizados, mostrando el monto esperado, el declarado y la diferencia (sobrante o faltante).

---

## 3. POS (Ventas)

El módulo de Ventas es la interfaz principal para registrar pedidos de forma presencial.

### Gestión de Caja
Antes de realizar ventas, la caja debe estar abierta:
- **Abrir caja**: Si la caja está cerrada, haga clic en el botón principal para habilitar las ventas.
- **Cerrar caja**: Al finalizar la jornada, haga clic en "Cerrar caja". Deberá ingresar el **monto declarado** (dinero físico en caja) y opcionalmente notas descriptivas. El sistema calculará automáticamente si hay diferencias con el **monto esperado**.
- **Reabrir caja**: Si la caja fue cerrada por error, el sistema permite reabrirla para continuar operando.

### Realizar una Venta
1. **Seleccionar tipo de venta**: Puede alternar entre **Venta minorista** o **Venta mayorista** (los precios se ajustarán automáticamente).
2. **Buscar productos**: Use la barra de búsqueda o navegue por la cuadrícula de productos.
3. **Platos del día**: En la sección lateral puede añadir rápidamente los platos especiales configurados para la fecha actual.
4. **Pedidos del menú (Web)**: Si hay pedidos realizados por clientes desde el menú web, aparecerán en la sección "Pedidos del menú". Haga clic en **"Cobrar"** para cargar los ítems automáticamente al carrito.

### El Carrito
- **Ajustar cantidades**: Use los botones `+` y `-` para modificar la cantidad de cada ítem.
- **Eliminar**: Use la `X` para quitar un producto de la venta actual.
- **Confirmar**: Seleccione el **Método de pago** y haga clic en **"Confirmar venta"**.
- **Ticket**: Al finalizar, el sistema le ofrecerá la opción de ver e imprimir el ticket de la venta.

---

## 4. Productos

Gestione su catálogo de productos desde este módulo.

### Catálogo y Filtros
- Puede filtrar por **Categoría** o por estado (**Activo/Inactivo**).
- El listado muestra el nombre, precios, stock actual y si el producto es visible en el menú web.

### Alta y Edición
- **Nuevo producto**: Haga clic en "➕ Nuevo producto" para crear uno desde cero.
- **Editar**: Haga clic en el ícono del lápiz (`✏️`) en la fila correspondiente.
- **Campos importantes**:
    - Nombre y descripción.
    - Precios minorista y mayorista.
    - **Stock mínimo**: Define a partir de qué cantidad el sistema marcará el producto como "Stock bajo".
    - **Mostrar en menú**: Determina si el producto aparece en el catálogo público web.

### Ajuste de Stock
Haga clic en el ícono de la caja (`📦`) para realizar movimientos de inventario:
- **Ingreso de mercadería**: Para registrar compras que suman al stock existente.
- **Ajuste manual**: Para corregir el stock por roturas, vencimientos u otros motivos.

---

## 5. Platos del día

Este módulo permite configurar ofertas especiales o menús que varían según la fecha.

- **Selección de fecha**: Elija el día para el cual desea gestionar los platos.
- **Creación**: Defina el nombre, descripción, precio y stock inicial disponible para ese plato en ese día específico.
- **Activo**: Puede activar o desactivar platos individualmente sin necesidad de eliminarlos.

---

## 6. Configuración

Ajustes generales del sitio:
- **Nombre del sitio**: Permite cambiar el nombre comercial que aparece en el panel y en los tickets.
- **Local abierto**: Un interruptor para indicar si el local está recibiendo pedidos o se encuentra cerrado temporalmente.

---
*Fin del Manual de Usuario - Manducá*
