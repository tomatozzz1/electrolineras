const express = require('express');
const { query } = require('./db');
const router  = express.Router();

router.get('/', async (req, res) => {
    const { ciudad, estado } = req.query;
    try {
        let sql = `
            SELECT e.id_estacion, e.nombre_estacion, e.estado, e.fecha_instalacion,
                   d.ciudad, d.estado AS estado_geo, d.calle, d.numero,
                   COUNT(DISTINCT c.id_cargador)         AS total_cargadores,
                   COUNT(DISTINCT p.id_puerto)           AS total_puertos,
                   COUNT(DISTINCT p.id_puerto) FILTER (WHERE p.estado = 'libre') AS puertos_libres,
                   MAX(c.potencia_kw)                   AS potencia_maxima,
                   ARRAY_AGG(DISTINCT tc.nombre)        AS conectores
            FROM estaciones e
            JOIN direcciones d        ON d.id_direccion      = e.id_direccion
            LEFT JOIN cargadores c    ON c.id_estacion       = e.id_estacion
            LEFT JOIN puertos_carga p ON p.id_cargador       = c.id_cargador
            LEFT JOIN tipos_conector tc ON tc.id_tipo_conector = p.id_tipo_conector
            WHERE 1=1`;
        const params = [];
        if (ciudad) { params.push(ciudad); sql += ` AND d.ciudad ILIKE $${params.length}`; }
        if (estado) { params.push(estado); sql += ` AND e.estado = $${params.length}`; }
        sql += ' GROUP BY e.id_estacion, d.ciudad, d.estado, d.calle, d.numero ORDER BY e.nombre_estacion';
        const r = await query(sql, params);
        res.json(r.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
    try {
        const est = await query(
            `SELECT e.*, d.calle, d.numero, d.ciudad, d.estado AS estado_geo, d.codigo_postal, d.pais
             FROM estaciones e
             JOIN direcciones d ON d.id_direccion = e.id_direccion
             WHERE e.id_estacion = $1`,
            [req.params.id]
        );
        if (est.rows.length === 0) return res.status(404).json({ error: 'Estación no encontrada' });

        const cargadores = await query(
            `SELECT c.*, f.nombre_fabricante,
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'id_puerto',       p.id_puerto,
                        'estado',          p.estado,
                        'potencia_max_kw', p.potencia_max_kw,
                        'tipo_conector',   tc.nombre
                    ) ORDER BY p.id_puerto) AS puertos
             FROM cargadores c
             JOIN fabricantes_cargador f ON f.id_fabricante_cargador = c.id_fabricante_cargador
             LEFT JOIN puertos_carga p   ON p.id_cargador            = c.id_cargador
             LEFT JOIN tipos_conector tc ON tc.id_tipo_conector      = p.id_tipo_conector
             WHERE c.id_estacion = $1
             GROUP BY c.id_cargador, f.nombre_fabricante
             ORDER BY c.id_cargador`,
            [req.params.id]
        );
        res.json({ ...est.rows[0], cargadores: cargadores.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/puertos-libres', async (req, res) => {
    try {
        const r = await query(
            `SELECT p.id_puerto, p.estado, p.potencia_max_kw,
                    tc.nombre AS tipo_conector,
                    c.modelo AS modelo_cargador, c.potencia_kw,
                    f.nombre_fabricante
             FROM puertos_carga p
             JOIN cargadores c           ON c.id_cargador           = p.id_cargador
             JOIN tipos_conector tc      ON tc.id_tipo_conector      = p.id_tipo_conector
             JOIN fabricantes_cargador f ON f.id_fabricante_cargador = c.id_fabricante_cargador
             WHERE c.id_estacion = $1 AND p.estado = 'libre'
             ORDER BY p.id_puerto`,
            [req.params.id]
        );
        res.json(r.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;