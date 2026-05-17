async function initApp() {
    const u = State.usuario;

    // Llenar UI con datos del usuario
    document.querySelectorAll('.sm-name, .prof-name').forEach(el => el.textContent = `${u.nombre} ${u.apellido}`);
    document.querySelectorAll('.sm-mail, .prof-mail').forEach(el => el.textContent = u.email);
    // Actualizar avatares con iniciales reales
    const iniciales = (u.nombre[0] + u.apellido[0]).toUpperCase();
    ['sm-avatar-chip','top-avatar-chip','prof-avatar-chip'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = iniciales;
    });
    const since = document.querySelector('.prof-since');
    if (since) since.textContent = `Miembro desde ${fDate(u.fecha_registro)}`;

    // tarifa vigente
    try {
        const t = await apiFetch('/tarifas/vigente');
        State.tarifaKwh = parseFloat(t.precio_kwh);
    } catch(_) {}

    // Cargar datos de cada sección
    await Promise.all([
        renderGreeting(),
        renderHomeStrip(),
        renderEstaciones(),
        renderHistorial(),
        renderPerfil(),
    ]);

    goTab('inicio');
}

/* 
   INICIO — saludo y vehículo
    */
async function renderGreeting() {
    const u  = State.usuario;
    const hi = document.querySelector('.gr-hi');
    if (hi) hi.innerHTML = `Hola, <strong>${u.nombre}</strong>`;

    await renderVehiculoCard();
}

async function renderVehiculoCard() {
    const vehCard = document.querySelector('.veh-card .veh-row');
    if (!vehCard) return;

    try {
        const vehs = await apiFetch(`/usuarios/${State.usuario.id_usuario}/vehiculos`);
        State.vehiculo = vehs[0] || null;

        if (!State.vehiculo) {
            vehCard.innerHTML = `
                <span class="veh-ico" style="display:flex;align-items:center;color:var(--text-3)"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h13l4 4v6a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></span>
                <div>
                    <div class="veh-n">Sin vehículo registrado</div>
                    <div class="veh-d">Agrega uno para cargar</div>
                </div>
                <button class="btn-primary sm" onclick="goTab('cuenta')">Agregar</button>`;
        } else {
            const v = State.vehiculo;
            vehCard.innerHTML = `
                <span class="veh-ico" style="display:flex;align-items:center;color:var(--text-3)"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h13l4 4v6a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></span>
                <div>
                    <div class="veh-n">${v.nombre_marca} ${v.nombre_modelo}</div>
                    <div class="veh-d">${v.placa} · ${v.anio}</div>
                </div>
                <div class="bat-wrap">
                    <div class="bat-body"><div class="bat-fill" style="width:68%"></div><div class="bat-nub"></div></div>
                    <span class="bat-pct">—</span>
                </div>`;
        }
    } catch(err) {
        vehCard.innerHTML = `<span style="color:var(--text-3);font-size:0.85rem">Error cargando vehículo</span>`;
    }
}

/* 
   HOME STRIP — estaciones disponibles
    */
async function renderHomeStrip() {
    const strip = document.getElementById('home-strip');
    if (!strip) return;
    strip.innerHTML = '<div style="padding:12px;color:var(--text-3);font-size:0.85rem">Cargando…</div>';

    try {
        const ests = await apiFetch('/estaciones?estado=activa');
        const disp = ests.filter(e => parseInt(e.puertos_libres) > 0);

        if (disp.length === 0) {
            strip.innerHTML = emptyState('', 'Sin estaciones disponibles', 'Intenta más tarde');
            return;
        }

        const COLOR = { activa:'#4cba73', ocupada:'#f0a500', mantenimiento:'#aaa' };
        strip.innerHTML = disp.slice(0, 6).map(e => `
            <div class="strip-card" onclick="abrirModalCarga(${e.id_estacion})">
                <div class="strip-status" style="background:${COLOR[e.estado] || '#aaa'}"></div>
                <div class="sc-name">${e.nombre_estacion.replace('Electrolineras ','')}</div>
                <div class="sc-city">${e.calle ? e.calle + ', ' : ''}${e.ciudad}</div>
                <div class="sc-ports">${e.puertos_libres} puerto${e.puertos_libres != 1 ? 's' : ''} libre${e.puertos_libres != 1 ? 's' : ''}</div>
            </div>`).join('');

        // Última carga
        await renderUltimaCarga();
    } catch(err) {
        strip.innerHTML = `<div style="color:var(--text-3);font-size:0.82rem;padding:8px">${err.message}</div>`;
    }
}

async function renderUltimaCarga() {
    const lc = document.querySelector('.last-card .lc-row');
    if (!lc || !State.usuario) return;

    try {
        const sesiones = await apiFetch(`/usuarios/${State.usuario.id_usuario}/sesiones`);
        const ultima   = sesiones.find(s => s.hora_fin);

        if (!ultima) {
            lc.innerHTML = emptyState('kWh', 'Sin cargas previas', 'Tu historial aparecerá aquí');
            return;
        }

        lc.innerHTML = `
            <span class="lc-ico" style="font-size:1.1rem;color:var(--primary)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="16" height="11" rx="2"/><path d="M22 11v3"/><rect x="4" y="9" width="8" height="7" rx="1" fill="var(--primary)" stroke="none"/></svg></span>
            <div>
                <div class="lc-n">${ultima.nombre_estacion.replace('Electrolineras ','')}</div>
                <div class="lc-d">${fDate(ultima.hora_inicio)} · ${fMin(ultima.duracion_minutos)}</div>
            </div>
            <div style="text-align:right">
                <div class="lc-kwh">${parseFloat(ultima.energia_consumida_kwh||0).toFixed(1)} kWh</div>
                <div class="lc-cost">${fmxn(ultima.costo_total)}</div>
            </div>`;
    } catch(_) {}
}