const express = require('express');
const { query, pool } = require('./db');
const router  = express.Router();

router.get('/marcas', async (_req, res) => {
    res.json((await query('SELECT * FROM marcas_vehiculo ORDER BY nombre_marca')).rows);
});

router.get('/modelos', async (req, res) => {
    const { id_marca } = req.query;
    const r = id_marca
        ? await query(
            `SELECT mv.*, tc.nombre AS tipo_conector
             FROM modelos_vehiculo mv
             JOIN tipos_conector tc ON tc.id_tipo_conector = mv.id_tipo_conector
             WHERE mv.id_marca = $1 ORDER BY mv.nombre_modelo`, [id_marca])
        : await query(
            `SELECT mv.*, ma.nombre_marca, tc.nombre AS tipo_conector
             FROM modelos_vehiculo mv
             JOIN marcas_vehiculo ma ON ma.id_marca = mv.id_marca
             JOIN tipos_conector tc ON tc.id_tipo_conector = mv.id_tipo_conector
             ORDER BY ma.nombre_marca, mv.nombre_modelo`);
    res.json(r.rows);
});

router.post('/vehiculos', async (req, res) => {
    const { id_usuario, id_modelo, placa, anio, capacidad_bateria_kwh } = req.body;
    if (!id_usuario || !id_modelo || !placa || !anio)
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    try {
        const r = await query(
            `INSERT INTO vehiculos (id_usuario, id_modelo, placa, anio, capacidad_bateria_kwh)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [id_usuario, id_modelo, placa.toUpperCase(), anio, capacidad_bateria_kwh || null]
        );
        res.status(201).json({ ok: true, vehiculo: r.rows[0] });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'La placa ya está registrada' });
        res.status(500).json({ error: err.message });
    }
});

router.get('/planes', async (_req, res) => {
    res.json((await query('SELECT * FROM planes_suscripcion ORDER BY precio_mensual')).rows);
});

router.post('/suscripciones', async (req, res) => {
    const { id_usuario, id_plan } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            "UPDATE suscripciones SET estado='cancelada', fecha_fin=NOW() WHERE id_usuario=$1 AND estado='activa'",
            [id_usuario]
        );
        const r = await client.query(
            `INSERT INTO suscripciones (id_usuario, id_plan) VALUES ($1,$2) RETURNING *`,
            [id_usuario, id_plan]
        );
        await client.query('COMMIT');
        res.status(201).json({ ok: true, suscripcion: r.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

router.get('/metodos-pago', async (_req, res) => {
    res.json((await query('SELECT * FROM metodos_pago ORDER BY id_metodo_pago')).rows);
});

router.get('/conectores', async (_req, res) => {
    res.json((await query('SELECT * FROM tipos_conector')).rows);
});

router.get('/tarifas/vigente', async (_req, res) => {
    const r = await query(
        `SELECT * FROM tarifas_energia
         WHERE fecha_inicio <= NOW() AND (fecha_fin IS NULL OR fecha_fin >= NOW())
         ORDER BY fecha_inicio DESC LIMIT 1`
    );
    res.json(r.rows[0] || { precio_kwh: 6.0 });
});

module.exports = router;