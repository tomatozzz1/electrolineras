async function iniciarCarga() {
    if (!State.usuario) { showToast('Inicia sesión primero'); return; }
    if (State.sesionActiva) { goTab('cargando'); return; }

    const list = document.getElementById('modal-est-list');
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-3)">Cargando estaciones…</div>';
    openModal('modal-station');

    try {
        const ests = await apiFetch('/estaciones');
        const disp = ests.filter(e => e.estado === 'activa' && parseInt(e.puertos_libres) > 0);

        if (disp.length === 0) {
            list.innerHTML = emptyState('⚡', 'Sin estaciones disponibles', 'Intenta más tarde');
            return;
        }

        list.innerHTML = disp.map(e => `
            <div class="modal-est-item" onclick="seleccionarEstacion(${e.id_estacion})">
                <div>
                    <div class="mei-n">${e.nombre_estacion.replace('Electrolineras ','')}</div>
                    <div class="mei-d">${e.calle ? e.calle + ', ' : ''}${e.ciudad} · ${e.potencia_maxima || '?'} kW max</div>
                </div>
                <div class="mei-ports">${e.puertos_libres} libre${e.puertos_libres != 1 ? 's' : ''}</div>
            </div>`).join('');
    } catch(err) {
        list.innerHTML = emptyState('!', 'Error', err.message);
    }
}

async function abrirModalCarga(idEst) {
    if (!State.usuario) { showToast('Inicia sesión primero'); return; }
    if (State.sesionActiva) { goTab('cargando'); return; }
    openModal('modal-station');
    await seleccionarEstacion(idEst);
}

async function seleccionarEstacion(idEst) {
    if (!State.vehiculo) {
        closeModal('modal-station');
        showToast('Primero registra un vehículo en tu cuenta');
        goTab('cuenta');
        return;
    }

    // Buscar puertos libres
    const list = document.getElementById('modal-est-list');
    list.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-3)">Buscando puertos disponibles…</div>';

    try {
        const puertos = await apiFetch(`/estaciones/${idEst}/puertos-libres`);
        const est     = (await apiFetch(`/estaciones/${idEst}`));

        if (puertos.length === 0) {
            list.innerHTML = emptyState('', 'Sin puertos libres', 'Esta estación acaba de llenarse');
            return;
        }

        list.innerHTML = `
            <div style="margin-bottom:14px">
                <div style="font-weight:700;color:var(--text);font-size:0.95rem">${est.nombre_estacion}</div>
                <div style="font-size:0.78rem;color:var(--text-2);margin-top:2px">
                    ${est.calle ? est.calle + (est.numero ? ' ' + est.numero : '') + ', ' : ''}${est.ciudad}
                </div>
            </div>
            ${puertos.map(p => `
                <div class="modal-est-item" onclick="confirmarCarga(${idEst}, ${p.id_puerto})">
                    <div>
                        <div class="mei-n">Puerto ${p.id_puerto} · ${p.tipo_conector}</div>
                        <div class="mei-d">${p.modelo_cargador} · ${p.potencia_max_kw || p.potencia_kw} kW</div>
                    </div>
                    <span style="color:var(--primary);font-size:0.8rem;font-weight:700">Libre ✓</span>
                </div>`).join('')}`;
    } catch(err) {
        list.innerHTML = emptyState('!', 'Error', err.message);
    }
}

async function confirmarCarga(idEst, idPuerto) {
    closeModal('modal-station');

    try {
        const data = await apiFetch('/sesiones', {
            method: 'POST',
            body: JSON.stringify({
                id_usuario:  State.usuario.id_usuario,
                id_vehiculo: State.vehiculo.id_vehiculo,
                id_puerto:   idPuerto,
            }),
        });

        State.sesionActiva = data.sesion;
        iniciarCounterCarga(data.sesion, idEst);
    } catch(err) {
        showToast(err.message, 3500);
    }
}

/* ════════════════════════════════════════════════════════════
   SESIÓN ACTIVA — animación y contador
   ════════════════════════════════════════════════════════════ */
async function iniciarCounterCarga(sesion, idEst) {
    State.chargeStart = Date.now();
    State.chargeKwh   = 0;

    // Actualizar cabecera de la pantalla de carga
    try {
        const est = await apiFetch(`/estaciones/${idEst}`);
        const dir = est.calle ? est.calle + (est.numero ? ' ' + est.numero : '') + ', ' + est.ciudad : est.ciudad;
        document.querySelector('.cv-loc-name').textContent    = `${est.nombre_estacion}`;
        document.querySelector('.cv-loc-name').title = dir;
        const puerto = est.cargadores?.flatMap(c => c.puertos || []).find(p => p.id_puerto === sesion.id_puerto);
        const conector = puerto?.tipo_conector || 'CCS2';
        const potencia = puerto?.potencia_max_kw || '?';
        document.querySelector('.cv-loc-detail').textContent = `Puerto ${sesion.id_puerto} · ${conector} · ${potencia} kW`;
    } catch(_) {}

    // tarifa
    document.querySelector('.tar-row:first-child strong').textContent = `$${State.tarifaKwh.toFixed(2)} / kWh`;

    // método de pago
    if (!State.metodoPago) {
        try {
            const metodos = await apiFetch('/metodos-pago');
            const pagos   = await apiFetch(`/usuarios/${State.usuario.id_usuario}/pagos`);
            const idUltimo = pagos[0]?.id_metodo_pago;
            State.metodoPago = metodos.find(m => m.id_metodo_pago === idUltimo) || metodos[0];
        } catch(_) {}
    }
    const tarRow = document.querySelector('.tar-row:last-child strong');
    if (tarRow) tarRow.textContent = State.metodoPago?.nombre_metodo || 'Sin método seleccionado';

    // Modo cargando en botón principal
    const cbtn = document.getElementById('charge-btn');
    cbtn.classList.add('charging');
    cbtn.querySelector('.cb-text').textContent = 'Cargando…';

    // valores de carga
    const cap       = parseFloat(State.vehiculo?.capacidad_bateria_kwh || 60);
    const startPct  = 30;
    const targetPct = 85;
    const totalKwh  = cap * (targetPct - startPct) / 100;

    // offset del ring según % de batería (30%→378, 85%→81, 100%→0)
    const pctToOffset = (pct) => 540 * (1 - pct / 100);
    const arc = document.getElementById('pr-arc');
    const pctEl = document.getElementById('pr-pct');

    // desactivar transición CSS para el estado inicial
    arc.style.transition = 'none';
    arc.style.strokeDashoffset = pctToOffset(startPct);
    pctEl.textContent = `${startPct}%`;
    document.getElementById('cs-kwh').textContent  = '0.0';
    document.getElementById('cs-time').textContent = '0s';
    document.getElementById('cs-cost').textContent = '$0';

    State.chargeKwh = 0;
    goTab('cargando');

    // reactivar transición después de que el DOM procese el estado inicial
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            arc.style.transition = 'stroke-dashoffset 0.3s linear';
        });
    });

    let elapsedMs = 0;
    const kwPerTick = totalKwh / 90;

    State.chargeInterval = setInterval(() => {
        elapsedMs += 500;
        State.chargeKwh = Math.min(State.chargeKwh + kwPerTick, totalKwh);

        const progress = State.chargeKwh / totalKwh;
        const battPct  = startPct + progress * (targetPct - startPct);
        const cost     = State.chargeKwh * State.tarifaKwh;
        const elapsedSec = Math.floor(elapsedMs / 1000);

        arc.style.strokeDashoffset = pctToOffset(battPct);
        pctEl.textContent = `${Math.round(battPct)}%`;
        document.getElementById('cs-kwh').textContent  = State.chargeKwh.toFixed(2);
        document.getElementById('cs-time').textContent = elapsedSec < 60
            ? `${elapsedSec}s`
            : `${Math.floor(elapsedSec/60)}m ${elapsedSec % 60}s`;
        document.getElementById('cs-cost').textContent = fmxn(cost);

        if (progress >= 1) {
            clearInterval(State.chargeInterval);
            State.chargeInterval = null;
            arc.style.strokeDashoffset = pctToOffset(targetPct);
            pctEl.textContent = `${targetPct}%`;
            setTimeout(() => mostrarResumen(), 800);
        }

    }, 500);
}

async function detenerCarga() {
    if (!State.sesionActiva) { goTab('inicio'); return; }
    clearInterval(State.chargeInterval);

    try {
        const data = await apiFetch(`/sesiones/${State.sesionActiva.id_sesion}/finalizar`, {
            method: 'PUT',
            body: JSON.stringify({
                energia_consumida_kwh: State.chargeKwh,
                id_metodo_pago: State.metodoPago?.id_metodo_pago || 1,
            }),
        });

        const s = data.sesion;
        const elapsed = Math.round((Date.now() - State.chargeStart) / 1000);

        document.getElementById('d-kwh').textContent  = `${parseFloat(s.energia_consumida_kwh).toFixed(2)} kWh`;
        document.getElementById('d-time').textContent = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed/60)}m ${elapsed%60}s`;
        document.getElementById('d-cost').textContent = fmxn(s.costo_total);

        State.sesionActiva = null;
        State.chargeKwh    = 0;

        // Restaurar botón principal
        const cbtn = document.getElementById('charge-btn');
        cbtn.classList.remove('charging');
        cbtn.querySelector('.cb-text').textContent = 'Iniciar\nCarga';

        openModal('modal-done');
    } catch(err) {
        showToast(err.message, 3500);
    }
}

async function finalizarSesion() {
    closeModal('modal-done');
    await renderHistorial();
    await renderHomeStrip();
    goTab('historial');
}
