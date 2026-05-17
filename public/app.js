// carga componentes HTML
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
    { slot: 'slot-panel-admin',     file: '/components/panel-admin.html' },
    { slot: 'slot-panel-tecnico',   file: '/components/panel-tecnico.html' },
];

async function loadComponents() {
    await Promise.all(COMPONENTS.map(async ({ slot, file }) => {
        try {
            const res = await fetch(file);
            if (!res.ok) { console.warn(`No encontrado: ${file}`); return; }
            const html = await res.text();
            const el   = document.getElementById(slot);
            if (el) el.innerHTML = html;
            else console.warn(`Slot no encontrado: ${slot}`);
        } catch (err) {
            console.error(`Error cargando ${file}:`, err);
        }
    }));
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadComponents();

    document.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !State.usuario) doLogin();
    });

    document.querySelectorAll('.modal-bg').forEach(bg => {
        bg.addEventListener('click', e => { if (e.target === bg) closeModal(bg.id); });
    });

    const regLink = document.querySelector('.register-prompt .link-g');
    if (regLink) regLink.addEventListener('click', e => { e.preventDefault(); mostrarRegistro(); });

    console.log('Electrolineras — listo');
});