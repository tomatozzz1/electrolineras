// modal planes

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