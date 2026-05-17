let _tecnicoActual = null;
let _mostrandoTodas = true;

async function initTecnico() {
    const u = State.usuario;
    const iniciales = (u.nombre[0] + u.apellido[0]).toUpperCase();
    ['tecnico-avatar','tecnico-av-big'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = iniciales;
    });
    try {
        const perfil = await apiFetch(`/tecnico/perfil/${u.id_usuario}`);
        _tecnicoActual = perfil.tecnico;

        const nombre = _tecnicoActual?.nombre_tecnico || `${u.nombre} ${u.apellido}`;
        document.getElementById('tecnico-nombre').textContent = nombre;
        document.getElementById('tecnico-especialidad').textContent = _tecnicoActual?.especialidad_tecnico || 'Técnico';
        document.getElementById('tecnico-telefono').textContent = _tecnicoActual?.telefono || u.telefono || '—';

        await tecnicoLoadOrdenes();
    } catch(err) { showToast(err.message); }
}

async function tecnicoLoadOrdenes() {
    const container = document.getElementById('tecnico-ordenes');
    if (!container) return;

    const idTecnico = _tecnicoActual?.id_tecnico;
    const url = idTecnico && !_mostrandoTodas
        ? `/tecnico/${idTecnico}/ordenes?solo=true`
        : `/tecnico/${idTecnico || 1}/ordenes`;

    try {
        const ordenes = await apiFetch(url);

        document.getElementById('tec-total').textContent       = ordenes.length;
        document.getElementById('tec-pendientes').textContent  = ordenes.filter(o => o.estado === 'pendiente').length;
        document.getElementById('tec-completadas').textContent = ordenes.filter(o => o.estado === 'completada').length;

        // actualizar toggle si existe
        const toggle = document.getElementById('tec-toggle');
        if (toggle) toggle.textContent = _mostrandoTodas ? 'Ver solo las mías' : 'Ver todas';

        if (ordenes.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-3)">Sin órdenes</div>';
            return;
        }

        container.innerHTML = ordenes.map(o => `
            <div class="orden-card">
                <div class="orden-card-header">
                    <div>
                        <div style="font-weight:700;color:var(--text)">${o.nombre_estacion}</div>
                        <div style="font-size:0.78rem;color:var(--text-2);margin-top:2px">
                            ${o.calle ? o.calle + ', ' : ''}${o.ciudad}
                        </div>
                        <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px">
                            Cargador: ${o.cargador_modelo} · Técnico: ${o.nombre_tecnico}
                        </div>
                    </div>
                    <span class="orden-estado estado-${o.estado}">${o.estado.replace('_',' ')}</span>
                </div>
                <div style="background:var(--gray-50);border-radius:8px;padding:10px;
                            font-size:0.82rem;color:var(--text-2);margin-bottom:12px">
                    ${o.descripcion_problema || 'Sin descripción'}
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                    <span style="font-size:0.75rem;color:var(--text-3)">${fDate(o.fecha_reporte)}</span>
                    <div style="margin-left:auto;display:flex;gap:8px">
                        ${o.estado === 'pendiente' ? `
                        <button onclick="tecnicoUpdateOrden(${o.id_orden_mantenimiento},'en_proceso','')"
                            style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:600;
                                   background:var(--green-100);color:var(--primary);border:none;cursor:pointer">
                            Iniciar
                        </button>` : ''}
                        ${o.estado !== 'completada' ? `
                        <button onclick="tecnicoFinalizarOrden(${o.id_orden_mantenimiento})"
                            style="padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:600;
                                   background:var(--primary);color:#fff;border:none;cursor:pointer">
                            Completar
                        </button>` : `<span style="font-size:0.78rem;color:var(--primary);font-weight:600">Completada</span>`}
                    </div>
                </div>
            </div>`).join('');
    } catch(err) {
        container.innerHTML = `<div style="color:var(--danger);text-align:center">${err.message}</div>`;
    }
}

function tecnicoToggleFiltro() {
    _mostrandoTodas = !_mostrandoTodas;
    tecnicoLoadOrdenes();
}

async function tecnicoUpdateOrden(id, estado, acciones) {
    try {
        await apiFetch(`/tecnico/ordenes/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ estado, acciones }),
        });
        showToast('Orden actualizada');
        await tecnicoLoadOrdenes();
    } catch(err) { showToast(err.message); }
}

function tecnicoFinalizarOrden(id) {
    const acciones = prompt('Describe las acciones realizadas:');
    if (acciones !== null) tecnicoUpdateOrden(id, 'completada', acciones);
}

async function abrirModalReporte() {
    openModal('modal-reporte');
    document.getElementById('r-descripcion').value = '';
    const sel = document.getElementById('r-cargador');
    sel.innerHTML = '<option value="">Cargando...</option>';
    try {
        const cargadores = await apiFetch('/tecnico/cargadores');
        sel.innerHTML = '<option value="">Selecciona un cargador...</option>' +
            cargadores.map(c =>
                `<option value="${c.id_cargador}">${c.nombre_estacion} — ${c.modelo} [${c.estado}]</option>`
            ).join('');
    } catch(err) {
        sel.innerHTML = '<option value="">Error al cargar</option>';
    }
}

async function guardarReporte() {
    const id_cargador = document.getElementById('r-cargador')?.value;
    const descripcion = document.getElementById('r-descripcion')?.value.trim();

    if (!id_cargador) { showToast('Selecciona un cargador');  return; }
    if (!descripcion) { showToast('Describe el problema');    return; }
    try {
        await apiFetch('/tecnico/ordenes', {
            method: 'POST',
            body: JSON.stringify({
                id_cargador:          parseInt(id_cargador),
                descripcion_problema: descripcion,
            }),
        });
        showToast('Problema reportado correctamente');
        closeModal('modal-reporte');
        await tecnicoLoadOrdenes();
    } catch(err) { showToast(err.message); }
}