/* 
   CARGADOR DE COMPONENTES
   Carga cada sección HTML desde /components/ e inyecta en el DOM
    */

const COMPONENTS = [
    { slot: 'slot-login',           file: '/components/login.html' },
    { slot: 'slot-topbar',          file: '/components/topbar.html' },
    { slot: 'slot-sidebar',         file: '/components/sidebar.html' },
    { slot: 'slot-tab-inicio',      file: '/components/tab-inicio.html' },
    { slot: 'slot-tab-estaciones',  file: '/components/tab-estaciones.html' },
    { slot: 'slot-tab-cargando',    file: '/components/tab-cargando.html' },
    { slot: 'slot-tab-historial',   file: '/components/tab-historial.html' },
    { slot: 'slot-tab-cuenta',      file: '/components/tab-cuenta.html' },
    { slot: 'slot-bottom-nav',      file: '/components/bottom-nav.html' },
    { slot: 'slot-modales',         file: '/components/modales.html' },
];

async function loadComponents() {
    await Promise.all(COMPONENTS.map(async ({ slot, file }) => {
        try {
            const res  = await fetch(file);
            const html = await res.text();
            const el   = document.getElementById(slot);
            if (el) el.innerHTML = html;
        } catch (err) {
            console.error(`Error cargando componente ${file}:`, err);
        }
    }));
}

/* 
   Electrolineras — Frontend conectado a la API
   URL del backend: http://localhost:3000
    */

'use strict';

const API = 'http://localhost:3000/api';

/* ─── ESTADO GLOBAL ─── */
const State = {
    usuario:        null,    // objeto usuario del backend
    vehiculo:       null,    // vehículo principal
    sesionActiva:   null,    // { id_sesion, id_puerto, ... }
    chargeInterval: null,
    chargeStart:    null,
    chargeKwh:      0,
    tarifaKwh:      6.0,
    estacionFilter: '',
};

/* 
   UTILIDADES
    */
function showToast(msg, dur = 3000) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), dur);
}

function openModal(id)  { document.getElementById(id).classList.add('open');  document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }

function fmxn(n) { return '$' + Math.round(n || 0).toLocaleString('es-MX'); }
function fDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
}
function fMin(mins) {
    if (!mins) return '—';
    const m = Math.round(mins);
    return m < 60 ? `${m} min` : `${Math.floor(m/60)}h ${m % 60}m`;
}

/* Estado vacío reutilizable */
function emptyState(icon, msg, sub = '') {
    return `<div style="text-align:center;padding:48px 20px;color:var(--text-3)">
        <div style="font-size:2.5rem;margin-bottom:12px">${icon}</div>
        <p style="font-weight:600;color:var(--text-2);margin-bottom:6px">${msg}</p>
        ${sub ? `<p style="font-size:0.82rem">${sub}</p>` : ''}
    </div>`;
}

/* 
   LLAMADAS A LA API
    */
async function apiFetch(path, options = {}) {
    try {
        const res = await fetch(API + path, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
    } catch (err) {
        if (err.name === 'TypeError') {
            throw new Error('No se puede conectar al servidor. ¿Está corriendo node server.js?');
        }
        throw err;
    }
}

/* 
   LOGIN / REGISTRO
    */
function togglePass(btn) {
    const input = btn.closest('.input-wrap').querySelector('input');
    input.type = input.type === 'password' ? 'text' : 'password';
}

async function doLogin() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pass').value;
    const btn      = document.getElementById('login-btn');

    if (!email || !password) { showToast('Ingresa tu correo y contraseña'); return; }

    btn.textContent = 'Verificando…';
    btn.style.opacity = '0.7';

    try {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        State.usuario = data.usuario;
        State.vehiculo = data.vehiculo;

        document.getElementById('screen-login').classList.remove('active');
        document.getElementById('screen-app').classList.add('active');

        await initApp();

        // Si el usuario no tiene vehiculo ni plan, mandarlo a cuenta para completar perfil
        if (!data.vehiculo) {
            showToast('Completa tu perfil: agrega tu vehículo y elige un plan');
            setTimeout(() => goTab('cuenta'), 1500);
        }
    } catch (err) {
        showToast(err.message, 3500);
        btn.textContent = 'Iniciar sesión →';
        btn.style.opacity = '1';
    }
}

/* FORMULARIO DE REGISTRO */
function mostrarRegistro() {
    const panel = document.querySelector('.login-form-wrap');
    panel.innerHTML = `
        <div class="mobile-brand">⚡ Electrolineras</div>
        <h2 class="form-title">Crear cuenta</h2>
        <p class="form-sub">Es gratis y solo toma un minuto</p>

        <div class="form-group">
            <label class="form-label">Nombre</label>
            <div class="input-wrap"><span class="input-icon"></span>
            <input type="text" id="r-nombre" class="form-input" placeholder="Tu nombre"></div>
        </div>
        <div class="form-group">
            <label class="form-label">Apellido</label>
            <div class="input-wrap"><span class="input-icon"></span>
            <input type="text" id="r-apellido" class="form-input" placeholder="Tu apellido"></div>
        </div>
        <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <div class="input-wrap"><span class="input-icon"></span>
            <input type="email" id="r-email" class="form-input" placeholder="tucorreo@ejemplo.com"></div>
        </div>
        <div class="form-group">
            <label class="form-label">Teléfono (opcional)</label>
            <div class="input-wrap"><span class="input-icon"></span>
            <input type="tel" id="r-tel" class="form-input" placeholder="3310001234"></div>
        </div>
        <div class="form-group">
            <label class="form-label">Contraseña</label>
            <div class="input-wrap"><span class="input-icon"></span>
            <input type="password" id="r-pass" class="form-input" placeholder="Mínimo 6 caracteres"></div>
        </div>
        <button class="btn-primary w-full" id="reg-btn" onclick="doRegistro()">Crear cuenta <span class="btn-arr">→</span></button>
        <p class="register-prompt" style="margin-top:16px">¿Ya tienes cuenta? <a href="#" class="link-g" onclick="location.reload()">Iniciar sesión</a></p>
    `;
}

async function doRegistro() {
    const nombre   = document.getElementById('r-nombre').value.trim();
    const apellido = document.getElementById('r-apellido').value.trim();
    const email    = document.getElementById('r-email').value.trim();
    const telefono = document.getElementById('r-tel').value.trim();
    const password = document.getElementById('r-pass').value;
    const btn      = document.getElementById('reg-btn');

    if (!nombre || !apellido || !email || !password) { showToast('Completa todos los campos obligatorios'); return; }
    if (password.length < 6) { showToast('La contraseña debe tener al menos 6 caracteres'); return; }

    btn.textContent = 'Creando cuenta…';
    btn.style.opacity = '0.7';
    try {
        await apiFetch('/auth/registro', {
            method: 'POST',
            body: JSON.stringify({ nombre, apellido, email, telefono, password }),
        });
        showToast('✓ Cuenta creada. ¡Inicia sesión!');
        setTimeout(() => location.reload(), 1500);
    } catch (err) {
        showToast(err.message, 3500);
        btn.textContent = 'Crear cuenta →';
        btn.style.opacity = '1';
    }
}

function doLogout() {
    closeMenu();
    resetSidebarCache();
    State.usuario = null;
    State.vehiculo = null;
    State.sesionActiva = null;
    _marcasCache = [];
    _modelosCache = [];
    if (State.chargeInterval) clearInterval(State.chargeInterval);
    document.getElementById('screen-app').classList.remove('active');
    document.getElementById('screen-login').classList.add('active');
    // Restaurar formulario de login si fue reemplazado
    location.reload();
}

/* 
   NAVEGACIÓN
    */
function goTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const el = document.getElementById(`tab-${name}`);
    if (el) el.classList.add('active');
    document.querySelectorAll('.bn').forEach(b => b.classList.toggle('active', b.dataset.t === name));
    window.scrollTo(0, 0);
}

function toggleMenu() {
    document.getElementById('side-menu').classList.toggle('open');
    document.getElementById('menu-overlay').classList.toggle('open');
    document.body.style.overflow = document.getElementById('side-menu').classList.contains('open') ? 'hidden' : '';
}
function closeMenu() {
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('open');
    document.body.style.overflow = '';
}

function toggleAcc(id) {
    const body = document.getElementById(id);
    const icon = document.getElementById('ico-' + id);
    const open = body.classList.toggle('open');
    if (icon) icon.style.transform = open ? 'rotate(90deg)' : '';
}

/* 
   INICIALIZACIÓN DE LA APP
    */
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

    // Tarifa vigente
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

/* 
   ESTACIONES
    */
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

/* 
   INICIAR CARGA — selección de estación y puerto
    */
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

/* 
   SESIÓN ACTIVA — animación y contador
    */
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

    // Tarifa y metodo de pago real
    document.querySelector('.tar-row:first-child strong').textContent = `$${State.tarifaKwh.toFixed(2)} / kWh`;
    try {
        const pagos = await apiFetch(`/usuarios/${State.usuario.id_usuario}/pagos`);
        const metodo = pagos[0]?.nombre_metodo || 'Tarjeta de credito';
        document.querySelector('.tar-row:last-child strong').textContent = metodo;
    } catch(_) {}

    // Modo cargando en botón principal
    const cbtn = document.getElementById('charge-btn');
    cbtn.classList.add('charging');
    cbtn.querySelector('.cb-text').textContent = 'Cargando…';

    // Reset ring y stats
    document.getElementById('pr-arc').style.strokeDashoffset = '540';
    document.getElementById('pr-pct').textContent = '0%';
    document.getElementById('cs-kwh').textContent  = '0.0';
    document.getElementById('cs-time').textContent = '0s';
    document.getElementById('cs-cost').textContent = '$0';

    goTab('cargando');

    // Simular consumo - velocidad acelerada para demo (1 kWh/seg ≈ completa en ~40s)
    const kwPerSec = 1.0;
    let elapsedSec = 0;

    State.chargeInterval = setInterval(() => {
        elapsedSec++;
        State.chargeKwh += kwPerSec;
        const cost    = State.chargeKwh * State.tarifaKwh;
        const cap     = parseFloat(State.vehiculo?.capacidad_bateria_kwh || 60);
        const startPct = 30; // bateria al inicio de la carga
        const targetPct = 85; // objetivo de carga
        const totalKwh = cap * (targetPct - startPct) / 100;
        const progress = Math.min(State.chargeKwh / totalKwh, 1);
        const battPct  = Math.round(startPct + progress * (targetPct - startPct));

        // Ring SVG
        const offset = 540 * (1 - progress);
        document.getElementById('pr-arc').style.strokeDashoffset = offset;
        document.getElementById('pr-pct').textContent = `${battPct}%`;

        // Stats
        document.getElementById('cs-kwh').textContent  = State.chargeKwh.toFixed(2);
        document.getElementById('cs-time').textContent = elapsedSec < 60
            ? `${elapsedSec}s`
            : `${Math.floor(elapsedSec/60)}m ${elapsedSec % 60}s`;
        document.getElementById('cs-cost').textContent = fmxn(cost);

    }, 1000);
}

async function detenerCarga() {
    if (!State.sesionActiva) { goTab('inicio'); return; }
    clearInterval(State.chargeInterval);

    try {
        const data = await apiFetch(`/sesiones/${State.sesionActiva.id_sesion}/finalizar`, {
            method: 'PUT',
            body: JSON.stringify({ energia_consumida_kwh: State.chargeKwh }),
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

/* 
   HISTORIAL
    */
async function renderHistorial() {
    const list = document.getElementById('history-list');
    if (!list || !State.usuario) return;
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-3)">Cargando historial…</div>';

    try {
        const sesiones = await apiFetch(`/usuarios/${State.usuario.id_usuario}/sesiones`);
        const completas = sesiones.filter(s => s.hora_fin);

        if (completas.length === 0) {
            list.innerHTML = emptyState('kWh', 'Sin cargas registradas', 'Cuando cargues tu auto aparecerá aquí');
            // Resumen en ceros
            document.querySelector('.ms-i:nth-child(1) .ms-v').textContent = '0';
            document.querySelector('.ms-i:nth-child(3) .ms-v').textContent = '0 kWh';
            document.querySelector('.ms-i:nth-child(5) .ms-v').textContent = '$0';
            return;
        }

        // Actualizar resumen del mes
        const mesActual = new Date().getMonth();
        const delMes    = completas.filter(s => new Date(s.hora_inicio).getMonth() === mesActual);
        const totalKwh  = delMes.reduce((a,s) => a + parseFloat(s.energia_consumida_kwh || 0), 0);
        const totalCost = delMes.reduce((a,s) => a + parseFloat(s.costo_total || 0), 0);

        document.querySelector('.ms-i:nth-child(1) .ms-v').textContent = delMes.length;
        document.querySelector('.ms-i:nth-child(3) .ms-v').textContent = `${totalKwh.toFixed(1)} kWh`;
        document.querySelector('.ms-i:nth-child(5) .ms-v').textContent = fmxn(totalCost);

        list.innerHTML = completas.map(s => `
            <div class="hist-item" style="flex-direction:column;align-items:stretch;gap:10px">
                <div style="display:flex;align-items:center;gap:12px">
                    <div class="hi-icon" style="background:var(--green-100)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
                    <div style="flex:1">
                        <div class="hi-n">${s.nombre_estacion.replace('Electrolineras ','')}</div>
                        <div class="hi-d">${s.calle ? s.calle + ', ' : ''}${s.ciudad || ''}</div>
                    </div>
                    <div class="hi-right">
                        <div class="hi-kwh">${parseFloat(s.energia_consumida_kwh||0).toFixed(1)} kWh</div>
                        <div class="hi-cost">${fmxn(s.costo_total)}</div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;border-top:1px solid var(--border);padding-top:8px">
                    <div style="text-align:center">
                        <div style="font-size:0.7rem;color:var(--text-3);margin-bottom:2px">Vehículo</div>
                        <div style="font-size:0.78rem;font-weight:600;color:var(--text)">${s.nombre_marca} ${s.nombre_modelo}</div>
                        <div style="font-size:0.68rem;color:var(--text-3)">${s.placa}</div>
                    </div>
                    <div style="text-align:center">
                        <div style="font-size:0.7rem;color:var(--text-3);margin-bottom:2px">Conector</div>
                        <div style="font-size:0.78rem;font-weight:600;color:var(--primary)">${s.tipo_conector || '—'}</div>
                        <div style="font-size:0.68rem;color:var(--text-3)">${fMin(s.duracion_minutos)}</div>
                    </div>
                    <div style="text-align:center">
                        <div style="font-size:0.7rem;color:var(--text-3);margin-bottom:2px">Pago</div>
                        <div style="font-size:0.78rem;font-weight:600;color:var(--text)">${s.metodo_pago || '—'}</div>
                        <div style="font-size:0.68rem;color:var(--text-3)">${fDate(s.hora_inicio)}</div>
                    </div>
                </div>
            </div>`).join('');
    } catch(err) {
        list.innerHTML = emptyState('!', 'Error al cargar historial', err.message);
    }
}

/* 
   PERFIL / CUENTA
    */
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
        const ultimoPago = pagos[0];
        const metodoTop  = ultimoPago?.nombre_metodo || metodos[0]?.nombre_metodo || '—';
        accBody.innerHTML = `
            <div class="acc-row" style="color:var(--primary);font-weight:600">
                Último pago: ${metodoTop}
            </div>
            ${pagos.slice(0,3).map(p => `
            <div class="acc-row" style="display:flex;justify-content:space-between">
                <span>${p.nombre_metodo} · ${p.nombre_estacion?.replace('Electrolineras ','') || 'Suscripción'}</span>
                <span style="color:var(--primary);font-weight:600">${fmxn(p.monto)}</span>
            </div>`).join('')}
            ${pagos.length === 0 ? '<div class="acc-row" style="color:var(--text-3)">Sin pagos registrados</div>' : ''}
            <div class="acc-row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
                ${metodos.map(m => `<span style="background:var(--green-100);color:var(--primary);
                    padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:600">
                    ${m.nombre_metodo}</span>`).join('')}
            </div>
        `;
    } catch(_) {}
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

/* 
   SIDEBAR — Carga dinámica de acordeones
    */

// Carga vehículos reales del usuario en el sidebar
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
        const pagos = await apiFetch(`/usuarios/${State.usuario.id_usuario}/pagos`);
        if (pagos.length === 0) {
            el.textContent = 'Sin pagos registrados';
        } else {
            el.innerHTML = pagos.slice(0,3).map(p => `
                <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:0.8rem;border-bottom:1px solid var(--border)">
                    <span style="color:var(--text-2)">${p.nombre_metodo}</span>
                    <span style="color:var(--primary);font-weight:600">${fmxn(p.monto)}</span>
                </div>`).join('');
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

/* 
   MODAL: AGREGAR VEHÍCULO (desde sidebar)
    */

let _marcasCache = [];
let _modelosCache = [];

async function abrirModalVehiculo() {
    openModal('modal-vehiculo');
    // Limpiar campos
    ['mv-placa','mv-anio','mv-kwh'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const btnSave = document.getElementById('mv-save-btn');
    if (btnSave) { btnSave.textContent = 'Registrar vehículo'; btnSave.style.opacity = '1'; }

    // Cargar marcas si no están en cache
    if (_marcasCache.length === 0) {
        try {
            _marcasCache  = await apiFetch('/marcas');
            _modelosCache = await apiFetch('/modelos');
        } catch(err) {
            showToast('✕ Error al cargar catálogos: ' + err.message);
            return;
        }
    }

    // Llenar select de marcas
    const selMarca = document.getElementById('mv-marca');
    selMarca.innerHTML = '<option value="">Selecciona marca...</option>' +
        _marcasCache.map(m => `<option value="${m.id_marca}">${m.nombre_marca}</option>`).join('');

    // Resetear modelos
    const selModelo = document.getElementById('mv-modelo');
    selModelo.innerHTML = '<option value="">Primero selecciona una marca</option>';
}

function filtrarModelosSidebar() {
    const marcaId  = document.getElementById('mv-marca')?.value;
    const selModelo = document.getElementById('mv-modelo');
    if (!selModelo) return;

    const filtrados = marcaId
        ? _modelosCache.filter(m => String(m.id_marca) === String(marcaId))
        : [];

    selModelo.innerHTML = filtrados.length
        ? filtrados.map(m => `<option value="${m.id_modelo}">${m.nombre_modelo} (${m.tipo_conector})</option>`).join('')
        : '<option value="">Sin modelos para esta marca</option>';
}

async function guardarVehiculoModal() {
    const id_modelo = document.getElementById('mv-modelo')?.value;
    const placa     = document.getElementById('mv-placa')?.value.trim().toUpperCase();
    const anio      = parseInt(document.getElementById('mv-anio')?.value);
    const kwh       = parseFloat(document.getElementById('mv-kwh')?.value) || null;
    const btn       = document.getElementById('mv-save-btn');

    if (!id_modelo) { showToast('Selecciona una marca y modelo'); return; }
    if (!placa)     { showToast('Ingresa la placa del vehículo'); return; }
    if (!anio || anio < 2000 || anio > 2025) { showToast('Ingresa un año válido (2000-2025)'); return; }

    btn.textContent = 'Guardando...';
    btn.style.opacity = '0.7';

    try {
        await apiFetch('/vehiculos', {
            method: 'POST',
            body: JSON.stringify({
                id_usuario: State.usuario.id_usuario,
                id_modelo:  parseInt(id_modelo),
                placa, anio,
                capacidad_bateria_kwh: kwh,
            }),
        });
        showToast('Vehículo registrado correctamente');
        closeModal('modal-vehiculo');
        // Refrescar datos
        resetSidebarCache();
        await renderVehiculoCard();
        await renderVehiculosCuenta();
    } catch(err) {
        showToast(err.message);
        btn.textContent = 'Registrar vehículo';
        btn.style.opacity = '1';
    }
}

/* 
   MODAL: CAMBIAR PLAN
    */

async function abrirModalPlanes() {
    openModal('modal-planes');
    const list = document.getElementById('modal-planes-list');
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-3)">Cargando planes...</div>';

    try {
        const [planes, subActual] = await Promise.all([
            apiFetch('/planes'),
            apiFetch(`/usuarios/${State.usuario.id_usuario}/suscripcion`),
        ]);

        list.innerHTML = planes.filter(p => p.precio_mensual > 0).map(p => {
            const esActual = subActual?.id_plan === p.id_plan;
            return `
            <div style="border:${esActual ? '2px solid var(--primary)' : '1px solid var(--border)'};
                        border-radius:12px;padding:14px;margin-bottom:10px;
                        background:${esActual ? 'var(--green-50)' : 'var(--surface)'}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <div>
                        <span style="font-weight:700;color:var(--text)">${p.nombre_plan}</span>
                        ${esActual ? '<span style="font-size:0.65rem;background:var(--primary);color:#fff;padding:2px 8px;border-radius:20px;margin-left:8px">Actual</span>' : ''}
                    </div>
                    <span style="font-family:var(--font-d);font-weight:800;color:var(--primary)">${fmxn(p.precio_mensual)}/mes</span>
                </div>
                <div style="font-size:0.78rem;color:var(--text-2);margin-bottom:10px">
                    ${p.energia_incluida_kwh} kWh incluidos · ${p.descripcion || ''}
                </div>
                ${!esActual ? `<button onclick="contratarPlan(${p.id_plan},'${p.nombre_plan}')"
                    style="width:100%;background:var(--primary);color:#fff;border:none;
                           padding:8px;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer">
                    Contratar este plan
                </button>` : '<div style="text-align:center;font-size:0.8rem;color:var(--primary);font-weight:600">✓ Plan activo</div>'}
            </div>`;
        }).join('');
    } catch(err) {
        list.innerHTML = `<div style="color:var(--danger);text-align:center">${err.message}</div>`;
    }
}

async function contratarPlan(idPlan, nombrePlan) {
    try {
        await apiFetch('/suscripciones', {
            method: 'POST',
            body: JSON.stringify({
                id_usuario: State.usuario.id_usuario,
                id_plan: idPlan,
            }),
        });
        showToast(`Plan "${nombrePlan}" activado correctamente`);
        closeModal('modal-planes');
        resetSidebarCache();
        await renderPerfil();
    } catch(err) {
        showToast(err.message);
    }
}

/* 
   ARRANQUE
    */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar todos los componentes HTML primero
    await loadComponents();

    // 2. Enter en login
    document.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !State.usuario) doLogin();
    });

    // 3. Cerrar modales al hacer click en el fondo
    document.querySelectorAll('.modal-bg').forEach(bg => {
        bg.addEventListener('click', e => { if (e.target === bg) closeModal(bg.id); });
    });

    // 4. Enganchar botón de registro
    const regLink = document.querySelector('.register-prompt .link-g');
    if (regLink) regLink.addEventListener('click', e => { e.preventDefault(); mostrarRegistro(); });

    console.log('Electrolineras — Componentes cargados');
});;