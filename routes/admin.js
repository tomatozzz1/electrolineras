const express = require('express');
const { query } = require('./db');
const router  = express.Router();

router.get('/dashboard', async (_req, res) => {
    try {
        const [estaciones, usuarios, sesiones, ingresos, cargadores] = await Promise.all([
            query('SELECT COUNT(*) FROM estaciones'),
            query('SELECT COUNT(*) FROM usuarios'),
            query('SELECT COUNT(*) FROM sesiones_carga WHERE hora_fin IS NULL'),
            query("SELECT COALESCE(SUM(monto),0) AS total FROM pagos WHERE estado=$1 AND fecha_pago::date = CURRENT_DATE", ['completado']),
            query('SELECT COUNT(*) FROM cargadores'),
        ]);
        res.json({
            estaciones:       parseInt(estaciones.rows[0].count),
            usuarios:         parseInt(usuarios.rows[0].count),
            sesiones_activas: parseInt(sesiones.rows[0].count),
            ingresos_hoy:     parseFloat(ingresos.rows[0].total),
            cargadores:       parseInt(cargadores.rows[0].count),
        });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.get('/usuarios', async (_req, res) => {
    try {
        const r = await query(
            `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.telefono,
                    u.fecha_registro, t.nombre_tipo,
                    COUNT(DISTINCT v.id_vehiculo) AS vehiculos,
                    COUNT(DISTINCT sc.id_sesion)  AS sesiones
             FROM usuarios u
             LEFT JOIN tipos_usuario t   ON t.id_tipo_usuario = u.id_tipo_usuario
             LEFT JOIN vehiculos v       ON v.id_usuario      = u.id_usuario
             LEFT JOIN sesiones_carga sc ON sc.id_usuario     = u.id_usuario
             GROUP BY u.id_usuario, t.nombre_tipo
             ORDER BY u.fecha_registro DESC`
        );
        res.json(r.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.get('/estaciones', async (_req, res) => {
    try {
        const r = await query(
            `SELECT e.*, d.ciudad, d.calle, d.numero, d.estado AS estado_geo,
                    COUNT(DISTINCT c.id_cargador) AS total_cargadores,
                    COUNT(DISTINCT p.id_puerto)   AS total_puertos,
                    COUNT(DISTINCT p.id_puerto) FILTER (WHERE p.estado='libre') AS puertos_libres
             FROM estaciones e
             JOIN direcciones d      ON d.id_direccion = e.id_direccion
             LEFT JOIN cargadores c  ON c.id_estacion  = e.id_estacion
             LEFT JOIN puertos_carga p ON p.id_cargador = c.id_cargador
             GROUP BY e.id_estacion, d.ciudad, d.calle, d.numero, d.estado
             ORDER BY e.nombre_estacion`
        );
        res.json(r.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.put('/estaciones/:id', async (req, res) => {
    try {
        await query('UPDATE estaciones SET estado=$1 WHERE id_estacion=$2', [req.body.estado, req.params.id]);
        res.json({ ok: true });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.get('/cargadores', async (_req, res) => {
    try {
        const r = await query(
            `SELECT c.*, e.nombre_estacion, f.nombre_fabricante,
                    COUNT(p.id_puerto) AS total_puertos,
                    COUNT(p.id_puerto) FILTER (WHERE p.estado='libre') AS puertos_libres
             FROM cargadores c
             JOIN estaciones e           ON e.id_estacion           = c.id_estacion
             JOIN fabricantes_cargador f ON f.id_fabricante_cargador = c.id_fabricante_cargador
             LEFT JOIN puertos_carga p   ON p.id_cargador           = c.id_cargador
             GROUP BY c.id_cargador, e.nombre_estacion, f.nombre_fabricante
             ORDER BY e.nombre_estacion, c.id_cargador`
        );
        res.json(r.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.put('/cargadores/:id', async (req, res) => {
    try {
        await query('UPDATE cargadores SET estado=$1 WHERE id_cargador=$2', [req.body.estado, req.params.id]);
        res.json({ ok: true });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.get('/reportes/operativos', async (_req, res) => {
    try {
        const r = await query('SELECT * FROM reportes_operativos ORDER BY fecha_reporte DESC LIMIT 30');
        res.json(r.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.get('/reportes/financieros', async (_req, res) => {
    try {
        const r = await query('SELECT * FROM reportes_financieros ORDER BY fecha_reporte DESC LIMIT 30');
        res.json(r.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.get('/ordenes', async (_req, res) => {
    try {
        const r = await query(
            `SELECT om.*, c.modelo AS cargador_modelo, e.nombre_estacion,
                    t.nombre_tecnico, t.especialidad_tecnico
             FROM ordenes_mantenimiento om
             JOIN cargadores c  ON c.id_cargador = om.id_cargador
             JOIN estaciones e  ON e.id_estacion = c.id_estacion
             LEFT JOIN tecnicos t ON t.id_tecnico = om.id_tecnico
             ORDER BY
                CASE om.estado
                    WHEN 'pendiente'  THEN 1
                    WHEN 'en_proceso' THEN 2
                    WHEN 'completada' THEN 3
                END,
                om.fecha_reporte DESC`
        );
        res.json(r.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.put('/ordenes/:id', async (req, res) => {
    try {
        await query(
            'UPDATE ordenes_mantenimiento SET estado=$1 WHERE id_orden_mantenimiento=$2',
            [req.body.estado, req.params.id]
        );
        res.json({ ok: true });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.get('/tarifas', async (_req, res) => {
    try {
        const r = await query('SELECT * FROM tarifas_energia ORDER BY fecha_inicio DESC');
        res.json(r.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.post('/tarifas', async (req, res) => {
    const { precio_kwh, fecha_inicio, fecha_fin } = req.body;
    try {
        const r = await query(
            'INSERT INTO tarifas_energia (precio_kwh, fecha_inicio, fecha_fin) VALUES ($1,$2,$3) RETURNING *',
            [precio_kwh, fecha_inicio, fecha_fin || null]
        );
        res.status(201).json({ ok: true, tarifa: r.rows[0] });
    } catch(err) { res.status(500).json({ error: err.message }); }
});


// DELETE /api/admin/cargadores/:id
router.delete('/cargadores/:id', async (req, res) => {
    try {
        const sesionActiva = await query(
            `SELECT COUNT(*) FROM sesiones_carga sc
             JOIN puertos_carga p ON p.id_puerto = sc.id_puerto
             WHERE p.id_cargador = $1 AND sc.hora_fin IS NULL`,
            [req.params.id]
        );
        if (parseInt(sesionActiva.rows[0].count) > 0)
            return res.status(409).json({ error: 'El cargador tiene sesiones activas' });

        await query('DELETE FROM cargadores WHERE id_cargador = $1', [req.params.id]);
        res.json({ ok: true });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/fabricantes
router.get('/fabricantes', async (_req, res) => {
    try {
        const r = await query('SELECT * FROM fabricantes_cargador ORDER BY nombre_fabricante');
        res.json(r.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/cargadores
router.post('/cargadores', async (req, res) => {
    const { id_estacion, id_fabricante_cargador, modelo, potencia_kw, estado } = req.body;
    if (!id_estacion || !id_fabricante_cargador || !modelo || !potencia_kw)
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    try {
        const r = await query(
            `INSERT INTO cargadores (id_estacion, id_fabricante_cargador, modelo, potencia_kw, estado)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [id_estacion, id_fabricante_cargador, modelo, potencia_kw, estado || 'activo']
        );
        res.status(201).json({ ok: true, cargador: r.rows[0] });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/estaciones
router.post('/estaciones', async (req, res) => {
    const { nombre_estacion, calle, numero, ciudad, estado_geo, codigo_postal, estado } = req.body;
    if (!nombre_estacion || !calle || !ciudad || !estado_geo || !codigo_postal)
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    const client = await require('./db').pool.connect();
    try {
        await client.query('BEGIN');
        const dir = await client.query(
            `INSERT INTO direcciones (calle, numero, ciudad, estado, codigo_postal)
             VALUES ($1,$2,$3,$4,$5) RETURNING id_direccion`,
            [calle, numero || null, ciudad, estado_geo, codigo_postal]
        );
        const est = await client.query(
            `INSERT INTO estaciones (nombre_estacion, id_direccion, estado)
             VALUES ($1,$2,$3) RETURNING *`,
            [nombre_estacion, dir.rows[0].id_direccion, estado || 'activa']
        );
        await client.query('COMMIT');
        res.status(201).json({ ok: true, estacion: est.rows[0] });
    } catch(err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// DELETE /api/admin/cargadores/:id
router.delete('/cargadores/:id', async (req, res) => {
    try {
        await query('DELETE FROM cargadores WHERE id_cargador=$1', [req.params.id]);
        res.json({ ok: true });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/tecnicos
router.get('/tecnicos', async (_req, res) => {
    try {
        const r = await query('SELECT * FROM tecnicos ORDER BY nombre_tecnico');
        res.json(r.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/ordenes/:id/asignar
router.put('/ordenes/:id/asignar', async (req, res) => {
    const { id_tecnico, estado } = req.body;
    try {
        await query(
            `UPDATE ordenes_mantenimiento
             SET id_tecnico = $1, estado = COALESCE($2, estado)
             WHERE id_orden_mantenimiento = $3`,
            [id_tecnico, estado, req.params.id]
        );
        res.json({ ok: true });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/ordenes ahora incluye tecnico NULL
// POST /api/admin/estaciones
router.post('/estaciones', async (req, res) => {
    const { nombre_estacion, calle, numero, ciudad, estado_geo, codigo_postal, estado } = req.body;
    if (!nombre_estacion || !calle || !ciudad || !estado_geo || !codigo_postal)
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    const client = await require('./db').pool.connect();
    try {
        await client.query('BEGIN');
        const dir = await client.query(
            `INSERT INTO direcciones (calle, numero, ciudad, estado, codigo_postal)
             VALUES ($1,$2,$3,$4,$5) RETURNING id_direccion`,
            [calle, numero || null, ciudad, estado_geo, codigo_postal]
        );
        const est = await client.query(
            `INSERT INTO estaciones (nombre_estacion, id_direccion, estado)
             VALUES ($1,$2,$3) RETURNING *`,
            [nombre_estacion, dir.rows[0].id_direccion, estado || 'activa']
        );
        await client.query('COMMIT');
        res.status(201).json({ ok: true, estacion: est.rows[0] });
    } catch(err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// POST /api/admin/cargadores
router.post('/cargadores', async (req, res) => {
    const { id_estacion, id_fabricante_cargador, modelo, potencia_kw, estado,
            tipo_conector, potencia_puerto } = req.body;
    if (!id_estacion || !id_fabricante_cargador || !modelo || !potencia_kw)
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    const client = await require('./db').pool.connect();
    try {
        await client.query('BEGIN');
        const c = await client.query(
            `INSERT INTO cargadores (id_estacion, id_fabricante_cargador, modelo, potencia_kw, estado)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [id_estacion, id_fabricante_cargador, modelo, potencia_kw, estado || 'activo']
        );
        // crear puerto automáticamente si se especificó conector
        if (tipo_conector) {
            const tc = await client.query(
                'SELECT id_tipo_conector FROM tipos_conector WHERE id_tipo_conector = $1', [tipo_conector]
            );
            if (tc.rows.length > 0) {
                await client.query(
                    `INSERT INTO puertos_carga (id_cargador, id_tipo_conector, potencia_max_kw, estado)
                     VALUES ($1,$2,$3,'libre')`,
                    [c.rows[0].id_cargador, tipo_conector, potencia_puerto || potencia_kw]
                );
            }
        }
        await client.query('COMMIT');
        res.status(201).json({ ok: true, cargador: c.rows[0] });
    } catch(err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// DELETE /api/admin/cargadores/:id
router.delete('/cargadores/:id', async (req, res) => {
    try {
        const sesionActiva = await query(
            `SELECT COUNT(*) FROM sesiones_carga sc
             JOIN puertos_carga p ON p.id_puerto = sc.id_puerto
             WHERE p.id_cargador = $1 AND sc.hora_fin IS NULL`,
            [req.params.id]
        );
        if (parseInt(sesionActiva.rows[0].count) > 0)
            return res.status(409).json({ error: 'El cargador tiene sesiones activas' });

        await query('DELETE FROM cargadores WHERE id_cargador = $1', [req.params.id]);
        res.json({ ok: true });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/fabricantes
router.get('/fabricantes', async (_req, res) => {
    try {
        const r = await query('SELECT * FROM fabricantes_cargador ORDER BY nombre_fabricante');
        res.json(r.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;