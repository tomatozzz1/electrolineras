// sidebar
async function cargarVehiculosSidebar() {
    const el = document.getElementById('sm-vehiculos-list');
    if (!el || !State.usuario || el.dataset.loaded) return;
    try {
        const vehs = await apiFetch(`/usuarios/${State.usuario.id_usuario}/vehiculos`);
        if (vehs.length === 0) {
            el.textContent = 'Sin vehículos registrados';
        } else {
            el.innerHTML = vehs.map(v => `
                <div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:0.83rem">
                    <div style="font-weight:600;color:var(--text)">${v.nombre_marca} ${v.nombre_modelo}</div>
                    <div style="color:var(--text-3);font-size:0.75rem">${v.placa} · ${v.anio} · ${v.capacidad_bateria_kwh || '?'} kWh</div>
                </div>`).join('');
        }
        el.dataset.loaded = '1';
    } catch(err) {
        el.textContent = 'Error al cargar';
    }
}

// Carga plan activo del usuario en el sidebar
async function cargarPlanSidebar() {
    const el = document.getElementById('sm-plan-info');
    if (!el || !State.usuario || el.dataset.loaded) return;
    try {
        const sub = await apiFetch(`/usuarios/${State.usuario.id_usuario}/suscripcion`);
        if (!sub) {
            el.innerHTML = `<div style="color:var(--text-3);font-size:0.8rem">Sin plan activo</div>
                <div class="link-g" onclick="abrirModalPlanes();closeMenu()"
                     style="cursor:pointer;font-size:0.8rem;font-weight:600;margin-top:4px">
                    Elegir un plan →
                </div>`;
        } else {
            el.innerHTML = `
                <div style="font-weight:600;color:var(--text);font-size:0.85rem">${sub.nombre_plan}</div>
                <div style="color:var(--text-3);font-size:0.75rem">${sub.energia_incluida_kwh} kWh · ${fmxn(sub.precio_mensual)}/mes</div>
                <div style="color:var(--text-3);font-size:0.72rem;margin-top:2px">Estado: ${sub.estado}</div>`;
        }
        el.dataset.loaded = '1';
    } catch(err) {
        el.textContent = 'Error al cargar';
    }
}

// Carga últimos pagos en el sidebar
async function cargarPagosSidebar() {
    const el = document.getElementById('sm-pagos-list');
    if (!el || !State.usuario || el.dataset.loaded) return;
    try {
        const [pagos, metodos] = await Promise.all([
            apiFetch(`/usuarios/${State.usuario.id_usuario}/pagos`),
            apiFetch('/metodos-pago'),
        ]);

        // Metodo actual seleccionado
        const metodoActual = State.metodoPago?.nombre_metodo
            || pagos[0]?.nombre_metodo
            || metodos[0]?.nombre_metodo
            || '—';

        if (pagos.length === 0) {
            el.innerHTML = `
                <div style="color:var(--text-3);font-size:0.8rem;padding:4px 0">Sin pagos aún</div>
                <div style="color:var(--primary);font-size:0.8rem;font-weight:600;margin-top:4px">
                    Método: ${metodoActual}
                </div>`;
        } else {
            el.innerHTML = `
                <div style="color:var(--primary);font-size:0.8rem;font-weight:600;margin-bottom:6px">
                    Método: ${metodoActual}
                </div>
                ${pagos.slice(0,2).map(p => `
                <div style="display:flex;justify-content:space-between;padding:4px 0;
                            font-size:0.78rem;border-bottom:1px solid var(--border)">
                    <span style="color:var(--text-2)">${p.nombre_metodo}</span>
                    <span style="color:var(--primary);font-weight:600">${fmxn(p.monto)}</span>
                </div>`).join('')}`;
        }
        el.dataset.loaded = '1';
    } catch(err) {
        el.textContent = 'Error al cargar';
    }
}

// Resetear cache del sidebar al cerrar sesión o actualizar datos
function resetSidebarCache() {
    ['sm-vehiculos-list','sm-plan-info','sm-pagos-list'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            delete el.dataset.loaded;
            el.textContent = 'Cargando...';
        }
    });
}
