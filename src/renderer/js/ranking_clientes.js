const tablaRanking = document.getElementById('tablaRanking');
const rankingForm = document.getElementById('rankingForm');

async function cargarRanking(filtros = {}) {
    const data = await window.api.obtenerRanking(filtros);
    tablaRanking.innerHTML = '';

    if (data.length === 0) {
        tablaRanking.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-secondary">No hay datos en este rango de fechas</td></tr>';
        return;
    }

    data.forEach((r, index) => {
        const tr = document.createElement('tr');
        const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
        
        tr.innerHTML = `
            <td class="ps-4 ${rankClass}">${index + 1}</td>
            <td class="fw-bold">${r.cliente || 'Sin Nombre'}</td>
            <td>${r.dni || '-'}</td>
            <td><span class="badge bg-dark">${r.compras}</span></td>
            <td class="text-info fw-bold">S/ ${r.total.toFixed(2)}</td>
            <td class="text-secondary">${r.ultima_compra}</td>
        `;
        tablaRanking.appendChild(tr);
    });
}

rankingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    cargarRanking({
        desde: document.getElementById('desde').value,
        hasta: document.getElementById('hasta').value,
        top: document.getElementById('topLimit').value
    });
});

document.addEventListener('DOMContentLoaded', () => cargarRanking());