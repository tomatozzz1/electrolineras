async function renderPerfil() {
    if (!State.usuario) return;

    // Suscripción
    try {
        const sub = await apiFetch(`/usuarios/${State.usuario.id_usuario}/suscripcion`);
        const pnm    = document.querySelector('.plan-name');
        const pdt    = document.querySelector('.plan-det');
        const planBtn = document.getElementById('plan-action-btn');
        const usageWrap = document.getElementById('plan-usage-wrap');
        const usageText = document.getElementById('plan-usage-text');
        const usageBar  = document.getElementById('plan-usage-bar');

        if (!sub) {
            // Usuario sin plan
            if (pnm) pnm.textContent = 'Sin plan activo';
            if (pdt) pdt.textContent = 'Elige un plan para empezar a cargar';
            if (planBtn) planBtn.textContent = 'Elegir plan';
            if (usageWrap) usageWrap.style.display = 'none';
        } else {
            if (pnm) pnm.textContent = sub.nombre_plan;
            if (pdt) pdt.textContent = `${sub.energia_incluida_kwh} kWh incluidos · ${fmxn(sub.precio_mensual)}/mes`;
            if (planBtn) planBtn.textContent = 'Cambiar plan';

            // Calcular uso real del mes desde sesiones
            try {
                const sesiones = await apiFetch(`/usuarios/${State.usuario.id_usuario}/sesiones`);
                const mesActual = new Date().getMonth();
                const anioActual = new Date().getFullYear();
                const usadoMes = sesiones
                    .filter(s => {
                        const d = new Date(s.hora_inicio);
                        return d.getMonth() === mesActual && d.getFullYear() === anioActual && s.hora_fin;
                    })
                    .reduce((sum, s) => sum + parseFloat(s.energia_consumida_kwh || 0), 0);

                const incluido = parseFloat(sub.energia_incluida_kwh) || 0;
                const pct = incluido > 0 ? Math.min((usadoMes / incluido) * 100, 100) : 0;

                if (usageText) usageText.textContent = `${usadoMes.toFixed(1)} / ${incluido} kWh`;
                if (usageBar) usageBar.style.width = `${pct}%`;
                if (usageWrap) usageWrap.style.display = 'block';
            } catch(_) {}
        }
    } catch(_) {}

    // Metodos de pago reales
    await renderMetodosPago();
    // Vehiculos en cuenta
    await renderVehiculosCuenta();
}

async function renderMetodosPago() {
    const accBody = document.getElementById('a-pagos');
    if (!accBody || !State.usuario) return;
    try {
        const [metodos, pagos] = await Promise.all([
            apiFetch('/metodos-pago'),
            apiFetch(`/usuarios/${State.usuario.id_usuario}/pagos`),
        ]);

        // Si no hay metodo seleccionado, usar el del ultimo pago o el primero disponible
        if (!State.metodoPago && metodos.length > 0) {
            const metodoUltimoPago = pagos[0]?.id_metodo_pago;
            State.metodoPago = metodos.find(m => m.id_metodo_pago === metodoUltimoPago) || metodos[0];
        }

        // Sección de pagos recientes
        const pagosHtml = pagos.length === 0
            ? `<div class="acc-row" style="color:var(--text-3);font-style:italic">
                Sin pagos registrados aún
               </div>`
            : pagos.slice(0,3).map(p => `
                <div class="acc-row" style="display:flex;justify-content:space-between;font-size:0.82rem">
                    <span style="color:var(--text-2)">${p.nombre_metodo} · ${p.nombre_estacion?.replace('Electrolineras ','') || 'Suscripción'}</span>
                    <span style="color:var(--primary);font-weight:600">${fmxn(p.monto)}</span>
                </div>`).join('');

        // Métodos de pago seleccionables
        const metodosHtml = metodos.map(m => {
            const seleccionado = State.metodoPago?.id_metodo_pago === m.id_metodo_pago;
            return `
            <div onclick="seleccionarMetodoPago(${m.id_metodo_pago}, '${m.nombre_metodo}')"
                 style="display:flex;align-items:center;gap:10px;padding:10px 12px;
                        border-radius:10px;cursor:pointer;margin-bottom:6px;
                        border:${seleccionado ? '2px solid var(--primary)' : '1px solid var(--border)'};
                        background:${seleccionado ? 'var(--green-50)' : 'var(--surface)'}">
                <div style="width:18px;height:18px;border-radius:50%;flex-shrink:0;
                            border:${seleccionado ? '5px solid var(--primary)' : '2px solid var(--gray-200)'};
                            background:${seleccionado ? 'white' : 'transparent'}"></div>
                <div>
                    <div style="font-size:0.85rem;font-weight:${seleccionado ? '700' : '500'};
                                color:${seleccionado ? 'var(--primary)' : 'var(--text)'}">
                        ${m.nombre_metodo}
                    </div>
                    <div style="font-size:0.72rem;color:var(--text-3)">${m.descripcion || ''}</div>
                </div>
                ${seleccionado ? '<span style="margin-left:auto;font-size:0.75rem;color:var(--primary);font-weight:700">Predeterminado</span>' : ''}
            </div>`;
        }).join('');

        accBody.innerHTML = `
            <div style="padding:10px 12px 6px;font-size:0.72rem;font-weight:700;
                        color:var(--text-3);text-transform:uppercase;letter-spacing:1px">
                Método de pago
            </div>
            ${metodosHtml}
            ${pagos.length > 0 ? `
            <div style="padding:10px 12px 6px;font-size:0.72rem;font-weight:700;
                        color:var(--text-3);text-transform:uppercase;letter-spacing:1px;
                        border-top:1px solid var(--border);margin-top:6px">
                Últimos pagos
            </div>
            ${pagosHtml}` : ''}
        `;
    } catch(_) {}
}

// Seleccionar método de pago predeterminado
function seleccionarMetodoPago(idMetodo, nombreMetodo) {
    State.metodoPago = { id_metodo_pago: idMetodo, nombre_metodo: nombreMetodo };
    showToast(`Método de pago: ${nombreMetodo}`);
    renderMetodosPago(); // Refrescar UI

    // Actualizar también en sidebar si está abierto
    cargarPagosSidebar();
}

async function renderVehiculosCuenta() {
    const container = document.getElementById('vehiculos-cuenta-list');
    if (!container || !State.usuario) return;

    try {
        const vehs = await apiFetch(`/usuarios/${State.usuario.id_usuario}/vehiculos`);

        if (vehs.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:16px 0">
                    <div style="color:var(--text-3);font-size:0.85rem;margin-bottom:12px">
                        Aún no tienes vehículos registrados
                    </div>
                    <button class="btn-primary sm" onclick="abrirModalVehiculo()">
                        + Agregar mi vehículo
                    </button>
                </div>`;
            return;
        }

        container.innerHTML = vehs.map((v, i) => `
            <div class="vi-row" style="${i > 0 ? 'margin-top:10px;padding-top:10px;border-top:1px solid var(--border)' : ''}">
                <span class="vi-ico" style="display:flex;color:var(--text-3)">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h13l4 4v6a2 2 0 0 1-2 2h-2"/>
                        <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
                    </svg>
                </span>
                <div>
                    <div class="vi-n">${v.nombre_marca} ${v.nombre_modelo}</div>
                    <div class="vi-d">${v.anio} · ${v.placa} · ${v.capacidad_bateria_kwh || '?'} kWh</div>
                </div>
                ${i === 0 ? '<span class="tag-green">Principal</span>' : ''}
            </div>`).join('');
    } catch(_) {}
}
function filtrarModelos() {
    const marcaId = document.getElementById('v-marca')?.value;
    const sel     = document.getElementById('v-modelo');
    if (!sel || !window._todosModelos) return;

    const filtrados = marcaId
        ? window._todosModelos.filter(m => String(m.id_marca) === String(marcaId))
        : window._todosModelos;

    sel.innerHTML = filtrados.length
        ? filtrados.map(m => `<option value="${m.id_modelo}">${m.nombre_modelo} (${m.tipo_conector})</option>`).join('')
        : '<option value="">Sin modelos para esta marca</option>';
}

async function guardarVehiculo() {
    const id_modelo = document.getElementById('v-modelo')?.value;
    const placa     = document.getElementById('v-placa')?.value.trim().toUpperCase();
    const anio      = parseInt(document.getElementById('v-anio')?.value);
    const kwh       = parseFloat(document.getElementById('v-kwh')?.value) || null;
    const btn       = document.getElementById('v-save-btn');

    if (!id_modelo || !placa || !anio) { showToast('Completa todos los campos'); return; }

    btn.textContent = 'Guardando…';
    btn.style.opacity = '0.7';
    try {
        await apiFetch('/vehiculos', {
            method: 'POST',
            body: JSON.stringify({
                id_usuario: State.usuario.id_usuario,
                id_modelo: parseInt(id_modelo),
                placa, anio,
                capacidad_bateria_kwh: kwh,
            }),
        });
        showToast('✓ Vehículo registrado');
        document.getElementById('v-save-btn')?.closest('.card')?.remove();
        await renderVehiculoCard();
        await renderVehiculosCuenta();
    } catch(err) {
        showToast(err.message);
        btn.textContent = 'Guardar vehículo';
        btn.style.opacity = '1';
    }
}

/* 
   PLANES
    */
async function mostrarPlanes() {
    try {
        const planes = await apiFetch('/planes');
        showToast(`Planes disponibles: ${planes.map(p=>p.nombre_plan).join(', ')}`);
    } catch(err) { showToast(err.message); }
}