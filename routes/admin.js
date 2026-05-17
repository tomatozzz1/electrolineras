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
module.exports = router;