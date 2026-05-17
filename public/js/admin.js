// admin
function adminGoTo(section) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(`admin-${section}`)?.classList.add('active');
    document.querySelector(`.admin-nav-item[data-section="${section}"]`)?.classList.add('active');
    adminLoadSection(section);
}

async function adminLoadSection(section) {
    const loaders = {
        dashboard:     adminLoadDashboard,
        estaciones:    adminLoadEstaciones,
        cargadores:    adminLoadCargadores,
        usuarios:      adminLoadUsuarios,
        mantenimiento: adminLoadOrdenes,
        reportes:      adminLoadReportes,
        tarifas:       adminLoadTarifas,
    };
    await loaders[section]?.();
}

async function initAdmin() {
    const u = State.usuario;
    const iniciales = (u.nombre[0] + u.apellido[0]).toUpperCase();
    document.getElementById('admin-avatar').textContent = iniciales;
    adminGoTo('dashboard');
}

async function adminLoadDashboard() {
    try {
        const d = await apiFetch('/admin/dashboard');
        document.getElementById('admin-kpis').innerHTML = [
            { val: d.estaciones,       lbl: 'Estaciones' },
            { val: d.cargadores,       lbl: 'Cargadores' },
            { val: d.usuarios,         lbl: 'Usuarios' },
            { val: d.sesiones_activas, lbl: 'Cargas activas' },
            { val: fmxn(d.ingresos_hoy), lbl: 'Ingresos hoy' },
        ].map(k => `
            <div class="admin-kpi">
                <div class="admin-kpi-val">${k.val}</div>
                <div class="admin-kpi-lbl">${k.lbl}</div>
            </div>`).join('');

        const ests = await apiFetch('/admin/estaciones');
        const byEstado = ests.reduce((acc, e) => { acc[e.estado] = (acc[e.estado]||0)+1; return acc; }, {});
        document.getElementById('admin-est-status').innerHTML = Object.entries(byEstado).map(([e,n]) => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem">
                <span style="text-transform:capitalize;color:var(--text-2)">${e}</span>
                <span style="font-weight:700;color:var(--primary)">${n}</span>
            </div>`).join('');

        // sesiones recientes de todos los usuarios (usamos el admin actual como referencia)
        const todasSesiones = await apiFetch('/admin/estaciones').catch(() => []);
        // mostrar estaciones activas en el panel de sesiones recientes
        document.getElementById('admin-sesiones-recientes').innerHTML =
            todasSesiones.length === 0
            ? '<div style="color:var(--text-3);font-size:0.82rem">Sin datos disponibles</div>'
            : todasSesiones.slice(0,5).map(e => `
                <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:0.82rem">
                    <span style="color:var(--text-2)">${e.nombre_estacion.replace('Electrolineras ','')}</span>
                    <span style="color:${parseInt(e.puertos_libres)>0?'var(--primary)':'var(--danger)'};font-weight:600">
                        ${e.puertos_libres}/${e.total_puertos} libres
                    </span>
                </div>`).join('');
    } catch(err) { showToast(err.message); }
}

async function adminLoadEstaciones() {
    try {
        const data = await apiFetch('/admin/estaciones');
        const estados = ['activa','inactiva','mantenimiento'];
        document.getElementById('tbody-estaciones').innerHTML = data.map(e => `
            <tr>
                <td style="color:var(--text-3)">#${e.id_estacion}</td>
                <td style="font-weight:600;color:var(--text)">${e.nombre_estacion.replace('Electrolineras ','')}</td>
                <td>${e.ciudad}</td>
                <td style="text-align:center">${e.total_cargadores}</td>
                <td style="text-align:center;color:${parseInt(e.puertos_libres)>0?'var(--primary)':'var(--danger)'}">
                    ${e.puertos_libres}/${e.total_puertos}
                </td>
                <td><span class="status-pill pill-${e.estado}" style="font-size:0.7rem">${e.estado}</span></td>
                <td>
                    <select class="status-select" onchange="adminUpdateEstacion(${e.id_estacion},this.value)">
                        ${estados.map(s => `<option value="${s}" ${s===e.estado?'selected':''}>${s}</option>`).join('')}
                    </select>
                </td>
            </tr>`).join('');
    } catch(err) { showToast(err.message); }
}

async function adminUpdateEstacion(id, estado) {
    try {
        await apiFetch(`/admin/estaciones/${id}`, { method:'PUT', body: JSON.stringify({ estado }) });
        showToast('Estado actualizado');
    } catch(err) { showToast(err.message); }
}

async function adminLoadCargadores() {
    try {
        const data = await apiFetch('/admin/cargadores');
        const estados = ['activo','en uso','mantenimiento','fuera de servicio'];
        document.getElementById('tbody-cargadores').innerHTML = data.map(c => `
            <tr>
                <td style="color:var(--text-3)">#${c.id_cargador}</td>
                <td>${c.nombre_estacion.replace('Electrolineras ','')}</td>
                <td style="color:var(--text-2)">${c.nombre_fabricante}</td>
                <td>${c.modelo}</td>
                <td>${c.potencia_kw} kW</td>
                <td style="text-align:center">${c.puertos_libres}/${c.total_puertos}</td>
                <td>
                    <select class="status-select" onchange="adminUpdateCargador(${c.id_cargador},this.value)">
                        ${estados.map(s => `<option value="${s}" ${s===c.estado?'selected':''}>${s}</option>`).join('')}
                    </select>
                </td>
            </tr>`).join('');
    } catch(err) { showToast(err.message); }
}

async function adminUpdateCargador(id, estado) {
    try {
        await apiFetch(`/admin/cargadores/${id}`, { method:'PUT', body: JSON.stringify({ estado }) });
        showToast('Estado actualizado');
    } catch(err) { showToast(err.message); }
}

async function adminLoadUsuarios() {
    try {
        const data = await apiFetch('/admin/usuarios');
        const chips = { administrador:'chip-administrador', cliente:'chip-cliente', tecnico:'chip-tecnico' };
        document.getElementById('tbody-usuarios').innerHTML = data.map(u => `
            <tr>
                <td style="color:var(--text-3)">#${u.id_usuario}</td>
                <td style="font-weight:600;color:var(--text)">${u.nombre} ${u.apellido}</td>
                <td style="color:var(--primary)">${u.email}</td>
                <td><span class="type-chip ${chips[u.nombre_tipo]||''}">${u.nombre_tipo||'—'}</span></td>
                <td style="text-align:center">${u.vehiculos}</td>
                <td style="text-align:center">${u.sesiones}</td>
                <td style="color:var(--text-3);font-size:0.78rem">${fDate(u.fecha_registro)}</td>
            </tr>`).join('');
    } catch(err) { showToast(err.message); }
}

async function adminLoadOrdenes() {
    try {
        const [data, tecnicos] = await Promise.all([
            apiFetch('/admin/ordenes'),
            apiFetch('/admin/tecnicos'),
        ]);
        const estados = ['pendiente','en_proceso','completada'];

        document.getElementById('tbody-ordenes').innerHTML = data.map(o => {
            const sinAsignar = !o.id_tecnico;
            return `
            <tr style="${sinAsignar ? 'background:var(--warn-lt)' : ''}">
                <td style="color:var(--text-3)">#${o.id_orden_mantenimiento}</td>
                <td>${o.nombre_estacion.replace('Estacion ','Est. ')}</td>
                <td style="color:var(--text-2)">${o.cargador_modelo}</td>
                <td>
                    <select class="status-select"
                        style="${sinAsignar ? 'border-color:var(--warn);color:var(--warn);font-weight:700' : ''}"
                        onchange="adminAsignarTecnico(${o.id_orden_mantenimiento}, this.value)">
                        <option value="">${sinAsignar ? 'Sin asignar' : o.nombre_tecnico}</option>
                        ${tecnicos.map(t => `
                            <option value="${t.id_tecnico}" ${t.id_tecnico === o.id_tecnico ? 'selected' : ''}>
                                ${t.nombre_tecnico}
                            </option>`).join('')}
                    </select>
                </td>
                <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                    title="${o.descripcion_problema||''}">${o.descripcion_problema||'—'}</td>
                <td style="color:var(--text-3);font-size:0.78rem">${fDate(o.fecha_reporte)}</td>
                <td>
                    <select class="status-select" onchange="adminUpdateOrden(${o.id_orden_mantenimiento},this.value)">
                        ${estados.map(s => `<option value="${s}" ${s===o.estado?'selected':''}>${s}</option>`).join('')}
                    </select>
                </td>
            </tr>`;
        }).join('');

        // Badge de órdenes sin asignar
        const sinAsignar = data.filter(o => !o.id_tecnico).length;
        const title = document.querySelector('#admin-mantenimiento .admin-title');
        if (title) title.innerHTML = `Órdenes de mantenimiento ${sinAsignar > 0
            ? `<span style="font-size:0.7rem;background:var(--warn);color:#fff;
                            padding:2px 10px;border-radius:20px;margin-left:8px;font-family:var(--font-b)">
                ${sinAsignar} sin asignar</span>`
            : ''}`;
    } catch(err) { showToast(err.message); }
}

async function adminAsignarTecnico(idOrden, idTecnico) {
    if (!idTecnico) return;
    try {
        await apiFetch(`/admin/ordenes/${idOrden}/asignar`, {
            method: 'PUT',
            body: JSON.stringify({ id_tecnico: parseInt(idTecnico), estado: 'en_proceso' }),
        });
        showToast('Técnico asignado correctamente');
        await adminLoadOrdenes();
    } catch(err) { showToast(err.message); }
}

async function adminUpdateOrden(id, estado) {
    try {
        await apiFetch(`/admin/ordenes/${id}`, { method:'PUT', body: JSON.stringify({ estado }) });
        showToast('Orden actualizada');
    } catch(err) { showToast(err.message); }
}

async function adminLoadReportes() {
    try {
        const [op, fin] = await Promise.all([
            apiFetch('/admin/reportes/operativos'),
            apiFetch('/admin/reportes/financieros'),
        ]);
        document.getElementById('tbody-rep-op').innerHTML = op.length === 0
            ? '<tr><td colspan="4" style="text-align:center;color:var(--text-3)">Sin reportes aún</td></tr>'
            : op.map(r => `<tr>
                <td>${fDate(r.fecha_reporte)}</td>
                <td style="text-align:center">${r.total_sesiones}</td>
                <td style="color:var(--primary);font-weight:600">${parseFloat(r.energia_total_consumida).toFixed(1)}</td>
                <td style="color:var(--primary);font-weight:600">${fmxn(r.ingresos_totales)}</td>
            </tr>`).join('');

        document.getElementById('tbody-rep-fin').innerHTML = fin.length === 0
            ? '<tr><td colspan="4" style="text-align:center;color:var(--text-3)">Sin reportes aún</td></tr>'
            : fin.map(r => `<tr>
                <td>${fDate(r.fecha_reporte)}</td>
                <td style="color:var(--primary);font-weight:600">${fmxn(r.total_ingresos)}</td>
                <td style="color:var(--danger)">${fmxn(r.total_reembolsos)}</td>
                <td style="font-weight:700;color:var(--text)">${fmxn(r.utilidad)}</td>
            </tr>`).join('');
    } catch(err) { showToast(err.message); }
}

function adminRepTab(btn, id) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    ['rep-op','rep-fin'].forEach(i => {
        document.getElementById(i).style.display = i === id ? 'block' : 'none';
    });
}

async function adminLoadTarifas() {
    try {
        const data = await apiFetch('/admin/tarifas');
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('tbody-tarifas').innerHTML = data.map(t => {
            const vigente = t.fecha_inicio <= hoy && (!t.fecha_fin || t.fecha_fin >= hoy);
            return `<tr>
                <td style="color:var(--text-3)">#${t.id_tarifa}</td>
                <td style="font-weight:700;color:var(--primary)">$${t.precio_kwh}</td>
                <td>${fDate(t.fecha_inicio)}</td>
                <td>${t.fecha_fin ? fDate(t.fecha_fin) : '—'}</td>
                <td><span style="font-size:0.7rem;padding:3px 10px;border-radius:20px;font-weight:700;
                    background:${vigente?'var(--green-100)':'var(--gray-50)'};
                    color:${vigente?'var(--primary)':'var(--text-3)'}">
                    ${vigente ? 'Vigente' : 'Expirada'}
                </span></td>
            </tr>`;
        }).join('');
    } catch(err) { showToast(err.message); }
}

function abrirModalTarifa() {
    document.getElementById('t-precio').value = '';
    document.getElementById('t-inicio').value = '';
    document.getElementById('t-fin').value = '';
    openModal('modal-tarifa');
}

async function guardarTarifa() {
    const precio = document.getElementById('t-precio').value;
    const inicio = document.getElementById('t-inicio').value;
    const fin    = document.getElementById('t-fin').value;
    if (!precio || !inicio) { showToast('Precio y fecha de inicio son obligatorios'); return; }
    try {
        await apiFetch('/admin/tarifas', {
            method: 'POST',
            body: JSON.stringify({ precio_kwh: parseFloat(precio), fecha_inicio: inicio, fecha_fin: fin || null }),
        });
        showToast('Tarifa creada correctamente');
        closeModal('modal-tarifa');
        adminLoadTarifas();
    } catch(err) { showToast(err.message); }
}