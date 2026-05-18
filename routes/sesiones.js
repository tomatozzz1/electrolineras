const express = require('express');
const { query, pool } = require('./db');
const router  = express.Router();

router.post('/', async (req, res) => {
    const { id_usuario, id_vehiculo, id_puerto } = req.body;
    if (!id_usuario || !id_vehiculo || !id_puerto)
        return res.status(400).json({ error: 'id_usuario, id_vehiculo e id_puerto son requeridos' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const puerto = await client.query(
            'SELECT estado FROM puertos_carga WHERE id_puerto = $1 FOR UPDATE', [id_puerto]
        );
        if (puerto.rows.length === 0)    throw new Error('Puerto no existe');
        if (puerto.rows[0].estado !== 'libre') throw new Error('El puerto no está disponible');

        const sesion = await client.query(
            `INSERT INTO sesiones_carga (id_usuario, id_vehiculo, id_puerto)
             VALUES ($1,$2,$3) RETURNING *`,
            [id_usuario, id_vehiculo, id_puerto]
        );
        await client.query(
            'UPDATE puertos_carga SET estado = $1 WHERE id_puerto = $2', ['ocupado', id_puerto]
        );
        await client.query('COMMIT');
        res.status(201).json({ ok: true, sesion: sesion.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        const code = err.message.includes('disponible') || err.message.includes('libre') ? 409 : 500;
        res.status(code).json({ error: err.message });
    } finally { client.release(); }
});

router.put('/:id/finalizar', async (req, res) => {
    const { energia_consumida_kwh, id_metodo_pago } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const tarifa = await client.query(
            `SELECT precio_kwh FROM tarifas_energia
             WHERE fecha_inicio <= NOW() AND (fecha_fin IS NULL OR fecha_fin >= NOW())
             ORDER BY fecha_inicio DESC LIMIT 1`
        );
        const precio = tarifa.rows[0]?.precio_kwh || 6.0;
        const costo  = (energia_consumida_kwh || 0) * precio;

        const sesion = await client.query(
            `UPDATE sesiones_carga
             SET hora_fin = NOW(), energia_consumida_kwh = $1, costo_total = $2
             WHERE id_sesion = $3 RETURNING *`,
            [energia_consumida_kwh || 0, costo.toFixed(2), req.params.id]
        );
        if (sesion.rows.length === 0) throw new Error('Sesión no encontrada');

        await client.query(
            'UPDATE puertos_carga SET estado = $1 WHERE id_puerto = $2',
            ['libre', sesion.rows[0].id_puerto]
        );
        await client.query(
            `INSERT INTO pagos (id_usuario, id_metodo_pago, id_sesion, monto, estado)
             VALUES ($1,$2,$3,$4,'completado')`,
            [sesion.rows[0].id_usuario, id_metodo_pago || 1, sesion.rows[0].id_sesion, costo.toFixed(2)]
        );
        await client.query('COMMIT');
        res.json({ ok: true, sesion: sesion.rows[0], precio_kwh: precio });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await query(
            `SELECT sc.*, e.nombre_estacion, p.id_cargador,
                    tc.nombre AS tipo_conector, p.potencia_max_kw
             FROM sesiones_carga sc
             JOIN puertos_carga p ON p.id_puerto    = sc.id_puerto
             JOIN cargadores c    ON c.id_cargador  = p.id_cargador
             JOIN estaciones e    ON e.id_estacion  = c.id_estacion
             JOIN tipos_conector tc ON tc.id_tipo_conector = p.id_tipo_conector
             WHERE sc.id_sesion = $1`,
            [req.params.id]
        );
        if (r.rows.length === 0) return res.status(404).json({ error: 'Sesión no encontrada' });
        res.json(r.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;