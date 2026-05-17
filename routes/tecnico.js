const express = require('express');
const { query, pool } = require('./db');
const router  = express.Router();

router.get('/perfil/:id_usuario', async (req, res) => {
    try {
        const u = await query('SELECT * FROM usuarios WHERE id_usuario=$1', [req.params.id_usuario]);
        if (!u.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });

        // buscar por nombre completo o por partes
        const nombre = u.rows[0].nombre;
        const apellido = u.rows[0].apellido;
        let t = await query(
            `SELECT * FROM tecnicos
             WHERE nombre_tecnico ILIKE $1
                OR nombre_tecnico ILIKE $2
                OR nombre_tecnico ILIKE $3
             LIMIT 1`,
            [`%${nombre} ${apellido}%`, `%${nombre}%`, `%${apellido}%`]
        );

        // Si no hay match, usar el primer tecnico disponible como fallback
        if (t.rows.length === 0) {
            t = await query('SELECT * FROM tecnicos ORDER BY id_tecnico LIMIT 1');
        }

        res.json({ usuario: u.rows[0], tecnico: t.rows[0] || null });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/ordenes', async (req, res) => {
    try {
        // si solo=true, filtra por ese tecnico; si no, trae todas
        const { solo } = req.query;
        const whereClause = solo === 'true'
            ? 'WHERE om.id_tecnico = $1'
            : '';
        const params = solo === 'true' ? [req.params.id] : [];

        const r = await query(
            `SELECT om.*, c.modelo AS cargador_modelo, c.estado AS cargador_estado,
                    e.nombre_estacion, d.ciudad, d.calle,
                    t.nombre_tecnico
             FROM ordenes_mantenimiento om
             JOIN cargadores c  ON c.id_cargador  = om.id_cargador
             JOIN estaciones e  ON e.id_estacion  = c.id_estacion
             JOIN direcciones d ON d.id_direccion = e.id_direccion
             JOIN tecnicos t    ON t.id_tecnico   = om.id_tecnico
             ${whereClause}
             ORDER BY
                CASE om.estado
                    WHEN 'pendiente'   THEN 1
                    WHEN 'en_proceso'  THEN 2
                    WHEN 'completada'  THEN 3
                END,
                om.fecha_reporte DESC`,
            params
        );
        res.json(r.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.put('/ordenes/:id', async (req, res) => {
    const { estado, acciones } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            'UPDATE ordenes_mantenimiento SET estado=$1 WHERE id_orden_mantenimiento=$2',
            [estado, req.params.id]
        );
        if (acciones) {
            await client.query(
                `INSERT INTO historial_mantenimiento (id_orden_mantenimiento, acciones_realizadas)
                 VALUES ($1,$2)`,
                [req.params.id, acciones]
            );
        }
        await client.query('COMMIT');
        res.json({ ok: true });
    } catch(err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// GET /api/tecnico/cargadores - lista de cargadores para el form de reporte
router.get('/cargadores', async (_req, res) => {
    try {
        const r = await query(
            `SELECT c.id_cargador, c.modelo, c.estado, e.nombre_estacion
             FROM cargadores c
             JOIN estaciones e ON e.id_estacion = c.id_estacion
             ORDER BY e.nombre_estacion, c.id_cargador`
        );
        res.json(r.rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tecnico/ordenes - reportar nuevo problema
router.post('/ordenes', async (req, res) => {
    const { id_cargador, id_tecnico, descripcion_problema } = req.body;
    if (!id_cargador || !id_tecnico || !descripcion_problema)
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    try {
        const r = await query(
            `INSERT INTO ordenes_mantenimiento (id_cargador, id_tecnico, descripcion_problema, estado)
             VALUES ($1, $2, $3, 'pendiente') RETURNING *`,
            [id_cargador, id_tecnico, descripcion_problema]
        );
        res.status(201).json({ ok: true, orden: r.rows[0] });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;