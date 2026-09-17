/**
 * SISTEMA DE TARJETA DE ALMACÉN
 * Métodos de Valuación: PEPS, UEPS y Promedio
 */
let movimientos = [];

// Elementos del DOM
const formMovimiento = document.getElementById('formMovimiento');
const selectMetodo = document.getElementById('metodoValuacion');
const selectTipo = document.getElementById('tipoMovimiento');
const inputCostoUnitario = document.getElementById('costoUnitario');
const tbodyAlmacen = document.getElementById('tbodyAlmacen');
const badgeMetodo = document.getElementById('badgeMetodo');
const btnCargarEjemplo = document.getElementById('btnCargarEjemplo');




selectTipo.addEventListener('change', () => {
    if (selectTipo.value === 'SALIDA') {
        inputCostoUnitario.value = '';
        inputCostoUnitario.disabled = true;
        inputCostoUnitario.required = false;
    } else {
        inputCostoUnitario.disabled = false;
        inputCostoUnitario.required = true;
    }
});

// Cambiar método de valuación
selectMetodo.addEventListener('change', () => {
    badgeMetodo.textContent = `Método: ${selectMetodo.value}`;
    recalcularTarjeta();
});

// Enviar formulario
formMovimiento.addEventListener('submit', (e) => {
    e.preventDefault();

    const nuevoMovimiento = {
        id: Date.now(),
        fecha: document.getElementById('fecha').value,
        tipo: selectTipo.value,
        concepto: document.getElementById('concepto').value,
        cantidad: parseInt(document.getElementById('cantidad').value),
        costoUnitario: selectTipo.value === 'ENTRADA' ? parseFloat(inputCostoUnitario.value) : 0
    };

    movimientos.push(nuevoMovimiento);
    formMovimiento.reset();
    
    // Resetear estado del input costo unitario
    inputCostoUnitario.disabled = false;
    inputCostoUnitario.required = true;

    recalcularTarjeta();
});

// Cargar datos de prueba
btnCargarEjemplo.addEventListener('click', () => {
    cargarDatosEjemplo();
});

// --- LÓGICA PRINCIPAL DE CONTABILIDAD Y VALUACIÓN ---

/**
 * Función central que recorre todos los movimientos almacenados y aplica
 * la lógica del método seleccionado (PEPS, UEPS o Promedio).
 */
function recalcularTarjeta() {
    tbodyAlmacen.innerHTML = '';

    if (movimientos.length === 0) {
        tbodyAlmacen.innerHTML = `<tr><td colspan="12" class="empty-msg">No hay movimientos registrados.</td></tr>`;
        return;
    }

    const metodo = selectMetodo.value;

    // Estado contable acumulado
    let existenciasCantidad = 0;
    let existenciasSaldo = 0;

    // Estructura de lotes/capas para PEPS y UEPS
    // Cada elemento representa: { cantidad: N, costoUnitario: X }
    let lotes = [];

    movimientos.forEach((mov, index) => {
        let entradaCant = '', entradaCosto = '', entradaImporte = '';
        let salidaCant = '', salidaCosto = '', salidaImporte = '';
        let costoPromedioActual = 0;

        if (mov.tipo === 'ENTRADA') {
            const importe = mov.cantidad * mov.costoUnitario;
            
            entradaCant = mov.cantidad;
            entradaCosto = mov.costoUnitario;
            entradaImporte = importe;

            existenciasCantidad += mov.cantidad;
            existenciasSaldo += importe;

            // Para PEPS y UEPS, agregamos la nueva capa de inventario
            lotes.push({
                cantidad: mov.cantidad,
                costoUnitario: mov.costoUnitario
            });

        } else if (mov.tipo === 'SALIDA') {
            // Validar que exista suficiente inventario para la salida
            if (mov.cantidad > existenciasCantidad) {
                alert(`Error en el movimiento #${index + 1} (${mov.concepto}): La cantidad a retirar (${mov.cantidad}) excede las existencias disponibles (${existenciasCantidad}).`);
                return;
            }

            let costoTotalSalida = 0;
            let unidadesPorDescontar = mov.cantidad;

            if (metodo === 'PROMEDIO') {
                // Promedio Ponderado: Costo = Saldo actual / Cantidad actual
                const costoPromedio = existenciasSaldo / existenciasCantidad;
                costoTotalSalida = unidadesPorDescontar * costoPromedio;

                salidaCant = mov.cantidad;
                salidaCosto = costoPromedio;
                salidaImporte = costoTotalSalida;

                existenciasCantidad -= mov.cantidad;
                existenciasSaldo -= costoTotalSalida;

            } else if (metodo === 'PEPS') {
                // PEPS: Consumir lotes de la cabeza (inicio del arreglo)
                while (unidadesPorDescontar > 0 && lotes.length > 0) {
                    let loteMasAntiguo = lotes[0];

                    if (loteMasAntiguo.cantidad <= unidadesPorDescontar) {
                        // Consumir lote completo
                        costoTotalSalida += loteMasAntiguo.cantidad * loteMasAntiguo.costoUnitario;
                        unidadesPorDescontar -= loteMasAntiguo.cantidad;
                        lotes.shift(); // Eliminar lote agotado
                    } else {
                        // Consumir lote parcialmente
                        costoTotalSalida += unidadesPorDescontar * loteMasAntiguo.costoUnitario;
                        loteMasAntiguo.cantidad -= unidadesPorDescontar;
                        unidadesPorDescontar = 0;
                    }
                }

                salidaCant = mov.cantidad;
                salidaCosto = costoTotalSalida / mov.cantidad; // Costo unitario ponderado de la salida
                salidaImporte = costoTotalSalida;

                existenciasCantidad -= mov.cantidad;
                existenciasSaldo -= costoTotalSalida;

            } else if (metodo === 'UEPS') {
                // UEPS: Consumir lotes del final (cola del arreglo)
                while (unidadesPorDescontar > 0 && lotes.length > 0) {
                    let loteMasReciente = lotes[lotes.length - 1];

                    if (loteMasReciente.cantidad <= unidadesPorDescontar) {
                        // Consumir lote completo
                        costoTotalSalida += loteMasReciente.cantidad * loteMasReciente.costoUnitario;
                        unidadesPorDescontar -= loteMasReciente.cantidad;
                        lotes.pop(); // Eliminar lote agotado
                    } else {
                        // Consumir lote parcialmente
                        costoTotalSalida += unidadesPorDescontar * loteMasReciente.costoUnitario;
                        loteMasReciente.cantidad -= unidadesPorDescontar;
                        unidadesPorDescontar = 0;
                    }
                }

                salidaCant = mov.cantidad;
                salidaCosto = costoTotalSalida / mov.cantidad; // Costo unitario ponderado de la salida
                salidaImporte = costoTotalSalida;

                existenciasCantidad -= mov.cantidad;
                existenciasSaldo -= costoTotalSalida;
            }
        }

        // Prevenir errores de redondeo en JavaScript flotante (ej. 0.000000000001)
        if (existenciasCantidad === 0) existenciasSaldo = 0;

        // Calcular costo promedio unitario actual de la existencia para mostrar en la fila
        costoPromedioActual = existenciasCantidad > 0 ? (existenciasSaldo / existenciasCantidad) : 0;

        // Renderizar la fila en la tabla
        renderizarFila({
            id: mov.id,
            fecha: mov.fecha,
            concepto: mov.concepto,
            entradaCant,
            entradaCosto,
            entradaImporte,
            salidaCant,
            salidaCosto,
            salidaImporte,
            existenciasCantidad,
            costoPromedioActual,
            existenciasSaldo
        });
    });
}

/**
 * Función auxiliar para renderizar una fila en la tabla HTML
 */
function renderizarFila(data) {
    const tr = document.createElement('tr');

    tr.innerHTML = `
        <td>${data.fecha}</td>
        <td>${data.concepto}</td>
        
        <!-- Entradas -->
        <td>${formatearNumero(data.entradaCant)}</td>
        <td>${formatearMoneda(data.entradaCosto)}</td>
        <td>${formatearMoneda(data.entradaImporte)}</td>
        
        <!-- Salidas -->
        <td>${formatearNumero(data.salidaCant)}</td>
        <td>${formatearMoneda(data.salidaCosto)}</td>
        <td>${formatearMoneda(data.salidaImporte)}</td>
        
        <!-- Existencias -->
        <td><strong>${formatearNumero(data.existenciasCantidad)}</strong></td>
        <td>${formatearMoneda(data.costoPromedioActual)}</td>
        <td><strong>${formatearMoneda(data.existenciasSaldo)}</strong></td>
        
        <!-- Botón Eliminar -->
        <td>
            <button class="btn-delete" onclick="eliminarMovimiento(${data.id})">Eliminar</button>
        </td>
    `;

    tbodyAlmacen.appendChild(tr);
}

/**
 * Elimina un movimiento por su ID único y recalcula toda la tarjeta
 */
function eliminarMovimiento(id) {
    movimientos = movimientos.filter(m => m.id !== id);
    recalcularTarjeta();
}

/**
 * Carga un juego de datos contables estándar para pruebas rápido
 */
function cargarDatosEjemplo() {
    movimientos = [
        { id: 1, fecha: '2026-01-01', tipo: 'ENTRADA', concepto: 'Inventario Inicial', cantidad: 100, costoUnitario: 10.00 },
        { id: 2, fecha: '2026-01-05', tipo: 'ENTRADA', concepto: 'Compra #1', cantidad: 200, costoUnitario: 12.00 },
        { id: 3, fecha: '2026-01-10', tipo: 'SALIDA',  concepto: 'Venta #1', cantidad: 150, costoUnitario: 0 },
        { id: 4, fecha: '2026-01-15', tipo: 'ENTRADA', concepto: 'Compra #2', cantidad: 100, costoUnitario: 15.00 },
        { id: 5, fecha: '2026-01-20', tipo: 'SALIDA',  concepto: 'Venta #2', cantidad: 180, costoUnitario: 0 }
    ];
    recalcularTarjeta();
}

// --- FUNCIONES FORMATO ---
function formatearMoneda(valor) {
    if (valor === '' || valor === undefined || valor === null) return '';
    return '$' + Number(valor).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearNumero(valor) {
    if (valor === '' || valor === undefined || valor === null) return '';
    return Number(valor).toLocaleString('es-MX');
}