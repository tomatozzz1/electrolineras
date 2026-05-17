// historial
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
