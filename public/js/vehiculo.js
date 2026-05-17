// modal vehículo
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