// navegación
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