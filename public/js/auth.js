// auth
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

        const tipo = data.usuario.tipo;
        if (tipo === 'administrador') {
            const el = document.getElementById('screen-admin');
            if (!el) { showToast('Error: panel admin no cargó. Recarga la página.'); return; }
            el.classList.add('active');
            await initAdmin();
        } else if (tipo === 'tecnico') {
            const el = document.getElementById('screen-tecnico');
            if (!el) { showToast('Error: panel técnico no cargó. Recarga la página.'); return; }
            el.classList.add('active');
            await initTecnico();
        } else {
            document.getElementById('screen-app').classList.add('active');
            await initApp();
            if (!data.vehiculo) {
                showToast('Completa tu perfil: agrega tu vehículo y elige un plan');
                setTimeout(() => goTab('cuenta'), 1500);
            }
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
            <div class="input-wrap"><input type="text" id="r-nombre" class="form-input" placeholder="Tu nombre"></div>
        </div>
        <div class="form-group">
            <label class="form-label">Apellido</label>
            <div class="input-wrap"><input type="text" id="r-apellido" class="form-input" placeholder="Tu apellido"></div>
        </div>
        <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <div class="input-wrap"><input type="email" id="r-email" class="form-input" placeholder="tucorreo@ejemplo.com"></div>
        </div>
        <div class="form-group">
            <label class="form-label">Teléfono <span style="color:var(--text-3);font-weight:400">(opcional)</span></label>
            <div class="input-wrap"><input type="tel" id="r-tel" class="form-input" placeholder="3310001234"></div>
        </div>
        <div class="form-group">
            <label class="form-label">Contraseña</label>
            <div class="input-wrap"><input type="password" id="r-pass" class="form-input" placeholder="Mínimo 6 caracteres"></div>
        </div>

        <div style="margin:18px 0 10px;padding-top:16px;border-top:1px solid var(--border)">
            <div style="font-size:0.72rem;font-weight:700;color:var(--text-3);
                        text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">
                Dirección <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-3)">(opcional)</span>
            </div>

            <div class="form-group">
                <label class="form-label">Calle</label>
                <div class="input-wrap"><input type="text" id="r-calle" class="form-input" placeholder="Av. Vallarta"></div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <div class="form-group">
                    <label class="form-label">Número</label>
                    <div class="input-wrap"><input type="text" id="r-numero" class="form-input" placeholder="123"></div>
                </div>
                <div class="form-group">
                    <label class="form-label">Código postal</label>
                    <div class="input-wrap"><input type="text" id="r-cp" class="form-input" placeholder="45010"></div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <div class="form-group">
                    <label class="form-label">Ciudad</label>
                    <div class="input-wrap"><input type="text" id="r-ciudad" class="form-input" placeholder="Zapopan"></div>
                </div>
                <div class="form-group">
                    <label class="form-label">Estado</label>
                    <div class="input-wrap"><input type="text" id="r-estado" class="form-input" placeholder="Jalisco"></div>
                </div>
            </div>
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
    const calle    = document.getElementById('r-calle')?.value.trim();
    const numero   = document.getElementById('r-numero')?.value.trim();
    const ciudad   = document.getElementById('r-ciudad')?.value.trim();
    const estado   = document.getElementById('r-estado')?.value.trim();
    const cp       = document.getElementById('r-cp')?.value.trim();
    const btn      = document.getElementById('reg-btn');

    if (!nombre || !apellido || !email || !password) { showToast('Completa los campos obligatorios'); return; }
    if (password.length < 6) { showToast('La contraseña debe tener al menos 6 caracteres'); return; }

    btn.textContent = 'Creando cuenta…';
    btn.style.opacity = '0.7';
    try {
        await apiFetch('/auth/registro', {
            method: 'POST',
            body: JSON.stringify({
                nombre, apellido, email, telefono, password,
                calle:         calle   || null,
                numero:        numero  || null,
                ciudad:        ciudad  || null,
                estado:        estado  || null,
                codigo_postal: cp      || null,
            }),
        });
        showToast('Cuenta creada. Inicia sesión');
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
    // ocultar todos los paneles
    ['screen-app','screen-admin','screen-tecnico'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
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