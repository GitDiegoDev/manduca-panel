# Informe de Auditoría Técnica y Contable - Sistema POS Manducá

## 1. Resumen Ejecutivo
Se ha realizado una auditoría exhaustiva de la lógica de frontend del sistema POS Manducá, enfocándose en la gestión de caja, cálculos de totales y reportes del dashboard. Si bien el sistema es funcional para operaciones básicas, presenta debilidades críticas en términos de precisión contable y robustez técnica que deben ser abordadas para garantizar la confiabilidad absoluta de los datos financieros.

## 2. Hallazgos Detallados

### A. Inconsistencia en el Redondeo Decimal
- **Gravedad**: **ALTA**
- **Impacto Técnico**: El Dashboard (`js/dashboard.js`) y los Tickets de Venta (`js/ticket.js`) utilizaban `maximumFractionDigits: 0`, mientras que el Ticket de Cierre (`js/cash-ticket.js`) utilizaba 2 decimales.
- **Impacto Contable**: Los centavos acumulados en múltiples ventas desaparecían de los reportes visuales y de los tickets de clientes, pero se acumulaban en el saldo esperado del cierre. Esto generaba "faltantes" o "sobrantes" fantasmas que complicaban la rendición de cuentas.
- **Acción Realizada**: Se estandarizó el uso de 2 decimales en toda la aplicación para asegurar consistencia total.

### B. Fallback Riesgoso de Saldo Esperado en LocalStorage
- **Gravedad**: **CRÍTICA**
- **Impacto Técnico**: En `js/pos.js`, la variable `totalSales` se persiste en `localStorage`. Si el API de resumen de caja falla, el sistema usa este valor como "Saldo Esperado".
- **Impacto Contable**: El `localStorage` es específico de cada navegador/dispositivo. Si se usan dos computadoras para el mismo punto de venta, los saldos serán totalmente divergentes. Además, `totalSales` acumula el monto total del pedido sin discriminar si fue pagado en efectivo, tarjeta o transferencia, lo cual es un error contable grave para el control de efectivo.
- **Acción Realizada**: Se añadió una advertencia explícita en el código y se recomienda migrar esta lógica íntegramente al Backend.

### C. Filtrado Insuficiente por Estado de Venta y Tipo
- **Gravedad**: **MEDIA**
- **Impacto Técnico**: El dashboard filtraba ventas basándose únicamente en la presencia de un `payment_method`.
- **Impacto Contable**: No se verificaba explícitamente el estado `paid`. Esto permitía que pedidos del menú digital que fueron cargados pero quizás cancelados o modificados posteriormente pudieran aparecer en los totales si el `payment_method` quedó registrado.
- **Acción Realizada**: Se reforzó el filtro en `js/dashboard.js` para incluir una validación de estado `paid`.

### D. Riesgo de Mezcla de Turnos (Filtrado por Fecha vs closure_id)
- **Gravedad**: **ALTA**
- **Impacto Técnico**: Los reportes y el saldo esperado dependen de filtrados por fecha (`from`/`to`).
- **Impacto Contable**: Si un negocio abre la caja a las 20:00 del lunes y la cierra a las 02:00 del martes, el sistema de fechas tendrá dificultades para atribuir correctamente las ventas al turno correspondiente.
- **Recomendación**: Es imperativo vincular cada venta a un `closure_id` (ID de apertura de caja) en la base de datos. El saldo esperado debe ser la suma de ventas asociadas a la caja actual, no un rango de fechas.

### E. Vulnerabilidad a Condiciones de Carrera y Concurrencia
- **Gravedad**: **MEDIA**
- **Impacto Técnico**: Aunque se deshabilita el botón de venta durante el envío, no hay protección en el frontend contra aperturas dobles o cierres simultáneos desde distintas pestañas o dispositivos.
- **Recomendación**: Implementar una validación en el Backend que impida abrir una caja si ya existe una abierta para el mismo local/usuario, y usar transacciones de base de datos para el cierre.

### F. Dependencia de Timezone del Cliente
- **Gravedad**: **MEDIA**
- **Impacto Técnico**: Se utiliza `new Date().toISOString()` en el frontend para algunas consultas.
- **Impacto Contable**: Si el reloj del cliente está mal configurado o en otra zona horaria, las ventas podrían registrarse en el día anterior o posterior, descuadrando los cierres mensuales.
- **Recomendación**: El servidor debe ignorar las fechas enviadas por el cliente para el registro de `created_at` y usar su propio reloj sincronizado vía NTP.

## 3. Evaluación de Confiabilidad Contable
En su estado actual, el sistema **no es 100% confiable contablemente** para una auditoría formal.

**Razones principales:**
1. Mezcla de ventas de diferentes medios de pago en el cálculo de "efectivo esperado" si el backend no está correctamente segregado.
2. Posibilidad de inconsistencias entre dispositivos por el uso de `localStorage`.
3. Riesgo de solapamiento de ventas entre turnos por depender de rangos de fechas en lugar de IDs de sesión de caja (`closure_id`).

## 4. Recomendaciones Prioritarias
1. **Vincular Ventas por `closure_id`**: Cada registro de venta en la base de datos debe guardar el ID de la caja que estaba abierta en ese momento.
2. **Cálculo Centralizado**: El frontend nunca debe calcular totales; debe limitarse a mostrar lo que el backend informa tras procesar los medios de pago.
3. **Segregación de Medios de Pago**: El saldo esperado de caja debe ser exclusivamente: `Saldo Inicial + Ventas Efectivo + Ingresos Manuales - Retiros`. Las ventas con Tarjeta/Transferencia deben listarse aparte y no afectar el efectivo físico.
4. **Auditoría de Estados**: Asegurar que solo las ventas con estado final 'paid' afecten los totales.

---
*Reporte generado por Jules (Auditor Técnico Senior).*
