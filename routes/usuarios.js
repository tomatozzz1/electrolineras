const express = require('express');
const { query, pool } = require('./db');
const router  = express.Router();

router.get('/:id/perfil', async (req, res) => {
    try {
        const r = await query(
            `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.telefono,
                    u.fecha_registro, t.nombre_tipo,
                    d.calle, d.numero, d.ciudad, d.estado, d.codigo_postal
             FROM usuarios u
             LEFT JOIN tipos_usuario t ON t.id_tipo_usuario = u.id_tipo_usuario
             LEFT JOIN direcciones d   ON d.id_direccion    = u.id_direccion
             WHERE u.id_usuario = $1`,
            [req.params.id]
        );
        if (r.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(r.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
    const { nombre, apellido, telefono } = req.body;
    try {
        await query(
            'UPDATE usuarios SET nombre=$1, apellido=$2, telefono=$3 WHERE id_usuario=$4',
            [nombre, apellido, telefono, req.params.id]
        );
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/vehiculos', async (req, res) => {
    try {
        const r = await query(
            `SELECT v.*, mv.nombre_modelo, ma.nombre_marca, tc.nombre AS tipo_conector
             FROM vehiculos v
             JOIN modelos_vehiculo mv ON mv.id_modelo        = v.id_modelo
             JOIN marcas_vehiculo  ma ON ma.id_marca         = mv.id_marca
             JOIN tipos_conector   tc ON tc.id_tipo_conector = mv.id_tipo_conector
             WHERE v.id_usuario = $1 ORDER BY v.id_vehiculo`,
            [req.params.id]
        );
        res.json(r.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/sesiones', async (req, res) => {
    try {
        const r = await query(
            `SELECT sc.id_sesion, sc.hora_inicio, sc.hora_fin,
                    sc.energia_consumida_kwh, sc.costo_total,
                    e.nombre_estacion, d.ciudad, d.calle,
                    mv.nombre_modelo, ma.nombre_marca, v.placa,
                    v.capacidad_bateria_kwh,
                    tc.nombre AS tipo_conector, f.nombre_fabricante,
                    mp.nombre_metodo AS metodo_pago,
                    p.monto AS monto_pago, p.estado AS estado_pago,
                    EXTRACT(EPOCH FROM (COALESCE(sc.hora_fin, NOW()) - sc.hora_inicio))/60 AS duracion_minutos
             FROM sesiones_carga sc
             JOIN puertos_carga p_c  ON p_c.id_puerto          = sc.id_puerto
             JOIN tipos_conector tc  ON tc.id_tipo_conector     = p_c.id_tipo_conector
             JOIN cargadores c       ON c.id_cargador           = p_c.id_cargador
             JOIN fabricantes_cargador f ON f.id_fabricante_cargador = c.id_fabricante_cargador
             JOIN estaciones e       ON e.id_estacion           = c.id_estacion
             JOIN direcciones d      ON d.id_direccion          = e.id_direccion
             JOIN vehiculos v        ON v.id_vehiculo           = sc.id_vehiculo
             JOIN modelos_vehiculo mv ON mv.id_modelo           = v.id_modelo
             JOIN marcas_vehiculo  ma ON ma.id_marca            = mv.id_marca
             LEFT JOIN pagos p       ON p.id_sesion             = sc.id_sesion
             LEFT JOIN metodos_pago mp ON mp.id_metodo_pago     = p.id_metodo_pago
             WHERE sc.id_usuario = $1
             ORDER BY sc.hora_inicio DESC`,
            [req.params.id]
        );
        res.json(r.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/suscripcion', async (req, res) => {
    try {
        const r = await query(
            `SELECT s.*, ps.nombre_plan, ps.precio_mensual, ps.energia_incluida_kwh
             FROM suscripciones s
             JOIN planes_suscripcion ps ON ps.id_plan = s.id_plan
             WHERE s.id_usuario = $1 AND s.estado = 'activa'
             ORDER BY s.fecha_inicio DESC LIMIT 1`,
            [req.params.id]
        );
        res.json(r.rows[0] || null);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/pagos', async (req, res) => {
    try {
        const r = await query(
            `SELECT p.*, mp.nombre_metodo, e.nombre_estacion, sc.energia_consumida_kwh
             FROM pagos p
             JOIN metodos_pago mp    ON mp.id_metodo_pago = p.id_metodo_pago
             LEFT JOIN sesiones_carga sc ON sc.id_sesion  = p.id_sesion
             LEFT JOIN puertos_carga pc  ON pc.id_puerto  = sc.id_puerto
             LEFT JOIN cargadores c      ON c.id_cargador = pc.id_cargador
             LEFT JOIN estaciones e      ON e.id_estacion = c.id_estacion
             WHERE p.id_usuario = $1
             ORDER BY p.fecha_pago DESC`,
            [req.params.id]
        );
        res.json(r.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;