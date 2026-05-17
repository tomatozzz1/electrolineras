function showToast(msg, dur = 3000) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), dur);
}

function openModal(id)  { document.getElementById(id).classList.add('open');    document.body.style.overflow = 'hidden'; }
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

function emptyState(icon, msg, sub = '') {
    return `<div style="text-align:center;padding:48px 20px;color:var(--text-3)">
        <div style="font-size:2.5rem;margin-bottom:12px">${icon}</div>
        <p style="font-weight:600;color:var(--text-2);margin-bottom:6px">${msg}</p>
        ${sub ? `<p style="font-size:0.82rem">${sub}</p>` : ''}
    </div>`;
}