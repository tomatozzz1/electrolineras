// api
async function apiFetch(path, options = {}) {
    try {
        const res = await fetch(API + path, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error(`Endpoint no encontrado: ${path} (¿reiniciaste el servidor?)`);
        }
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