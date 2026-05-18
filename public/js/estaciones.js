// estaciones
let chipFilter = '';

function setChip(btn, filter) {
    chipFilter = filter;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    renderEstaciones();
}

async function renderEstaciones() {
    const list     = document.getElementById('stations-list');
    const busqueda = (document.getElementById('search-est')?.value || '').toLowerCase();
    if (!list) return;

    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-3)">Cargando estaciones…</div>';

    try {
        const ests = await apiFetch('/estaciones' + (chipFilter ? `?estado=${chipFilter}` : ''));

        const filtradas = ests.filter(e => {
            return !busqueda || e.nombre_estacion.toLowerCase().includes(busqueda) || e.ciudad.toLowerCase().includes(busqueda) || (e.calle || '').toLowerCase().includes(busqueda);
        });

        if (filtradas.length === 0) {
            list.innerHTML = emptyState('', 'No hay estaciones', 'Ajusta los filtros de búsqueda');
            return;
        }

        list.innerHTML = filtradas.map(e => stationCard(e)).join('');
    } catch(err) {
        list.innerHTML = emptyState('!', 'Error al cargar', err.message);
    }
}

function stationCard(e) {
    const libres = parseInt(e.puertos_libres) || 0;
    const total  = parseInt(e.total_puertos)  || 0;
    const pct    = total > 0 ? (libres / total) * 100 : 0;
    const fillClass = pct > 50 ? '' : pct > 25 ? 'med' : 'low';
    const disp   = e.estado === 'activa' && libres > 0;
    const conn   = (e.conectores || []).filter(Boolean);

    const labelEstado = { activa:'Disponible', ocupada:'Ocupada', mantenimiento:'En mantenimiento', inactiva:'Inactiva' };

    return `
    <div class="station-card" onclick="${disp ? `abrirModalCarga(${e.id_estacion})` : `showToast('Estación no disponible ahora')`}">
        <div class="sc-head">
            <div>
                <div class="sc-name-big">${e.nombre_estacion.replace('Electrolineras ','')}</div>
                <div class="sc-city-big">${e.calle ? e.calle + (e.numero ? ' ' + e.numero : '') + ', ' : ''}${e.ciudad}, ${e.estado_geo}</div>
            </div>
            <span class="status-pill pill-${e.estado}">${labelEstado[e.estado] || e.estado}</span>
        </div>
        <div class="sc-body">
            <div class="sc-stats-row">
                <div class="sc-st">
                    <div class="sc-st-v">${e.total_cargadores || 0}</div>
                    <div class="sc-st-l">Cargadores</div>
                </div>
                <div class="sc-st">
                    <div class="sc-st-v" style="color:${libres > 0 ? 'var(--primary)' : 'var(--danger)'}">${libres}/${total}</div>
                    <div class="sc-st-l">Puertos libres</div>
                </div>
                <div class="sc-st">
                    <div class="sc-st-v">${e.potencia_maxima || '—'} kW</div>
                    <div class="sc-st-l">Potencia</div>
                </div>
            </div>
            ${disp ? `<button class="btn-charge-card" onclick="event.stopPropagation();abrirModalCarga(${e.id_estacion})">Cargar ⚡</button>` : ''}
        </div>
        <div class="avail-bar">
            <div class="ab-track"><div class="ab-fill ${fillClass}" style="width:${pct}%"></div></div>
            <div class="ab-label"><span>Disponibilidad</span><span>${libres} libre${libres !== 1 ? 's' : ''}</span></div>
        </div>
        ${conn.length ? `<div class="connectors">${conn.map(c=>`<span class="conn-tag">${c}</span>`).join('')}</div>` : ''}
    </div>`;
}

// iniciar carga

// reportar falla desde la vista de usuario
async function abrirReporteFalla() {
    openModal('modal-reportar-falla');
    document.getElementById('rf-descripcion').value = '';
    const sel = document.getElementById('rf-cargador');
    sel.innerHTML = '<option value="">Cargando...</option>';
    try {
        const ests = await apiFetch('/estaciones');
        const opciones = ests.flatMap(e =>
            Array.from({length: parseInt(e.total_cargadores)}, (_, i) => ({
                id: null, label: `${e.nombre_estacion} — Cargador ${i+1}`,
                id_est: e.id_estacion
            }))
        );
        // mejor: cargar con puertos reales
        const cargadores = await Promise.all(
            ests.map(e => apiFetch(`/estaciones/${e.id_estacion}`)
                .then(d => d.cargadores?.map(c => ({
                    id_cargador: c.id_cargador,
                    label: `${e.nombre_estacion} — ${c.modelo} (${c.potencia_kw} kW)`
                })) || [])
            )
        );
        const todos = cargadores.flat();
        sel.innerHTML = '<option value="">Selecciona el cargador con falla...</option>' +
            todos.map(c => `<option value="${c.id_cargador}">${c.label}</option>`).join('');
    } catch(err) {
        sel.innerHTML = '<option value="">Error al cargar</option>';
    }
}

async function enviarReporteFalla() {
    const id_cargador = document.getElementById('rf-cargador')?.value;
    const descripcion = document.getElementById('rf-descripcion')?.value.trim();
    if (!id_cargador) { showToast('Selecciona el cargador con falla'); return; }
    if (!descripcion) { showToast('Describe el problema'); return; }
    try {
        await apiFetch(`/usuarios/${State.usuario.id_usuario}/reportar-falla`, {
            method: 'POST',
            body: JSON.stringify({ id_cargador: parseInt(id_cargador), descripcion_problema: descripcion }),
        });
        showToast('Reporte enviado — lo revisaremos pronto');
        closeModal('modal-reportar-falla');
    } catch(err) { showToast(err.message); }
}