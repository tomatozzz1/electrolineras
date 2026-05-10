/* ════════════════════════════════════════════════════════════
   Electrolineras — Servidor API REST
   Stack: Node.js + Express + PostgreSQL (pg)
   Puerto: 3000 (configurable en .env)
   ════════════════════════════════════════════════════════════ */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const { Pool } = require('pg');

const app  = express();
const port = process.env.PORT || 3000;

/* ─── Conexión a PostgreSQL ─── */
const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'control_electrolineras',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
});

pool.connect((err) => {
    if (err) {
        console.error('❌  Error conectando a PostgreSQL:', err.message);
    } else {
        console.log('✅  Conectado a PostgreSQL —', process.env.DB_NAME || 'control_electrolineras');
    }
});

/* ─── Middleware ─── */
app.use(cors({ origin: '*' }));   // en producción restringe al dominio del frontend
app.use(express.json());
app.use(express.static('public')); // sirve el frontend desde /public

/* Helper para queries */
const query = (text, params) => pool.query(text, params);

/* ════════════════════════════════════════════════════════════
   AUTENTICACIÓN
   ════════════════════════════════════════════════════════════ */

// POST /api/auth/registro
app.post('/api/auth/registro', async (req, res) => {
    const { nombre, apellido, email, telefono, password } = req.body;

    if (!nombre || !apellido || !email || !password) {
        return res.status(400).json({ error: 'Campos obligatorios: nombre, apellido, email, password' });
    }

    try {
        // Verificar email único
        const existe = await query('SELECT id_usuario FROM usuarios WHERE email = $1', [email]);
        if (existe.rows.length > 0) {
            return res.status(409).json({ error: 'El correo ya está registrado' });
        }

        const hash = await bcrypt.hash(password, 10);

        const result = await query(
            `INSERT INTO usuarios (nombre, apellido, email, telefono, password_usuario, id_tipo_usuario)
             VALUES ($1, $2, $3, $4, $5, 1)          -- 1 = cliente
             RETURNING id_usuario, nombre, apellido, email, telefono, fecha_registro`,
            [nombre, apellido, email, telefono || null, hash]
        );

        res.status(201).json({ ok: true, usuario: result.rows[0] });
    } catch (err) {
        console.error('Registro:', err);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    try {
        const result = await query(
            `SELECT u.*, t.nombre_tipo
             FROM usuarios u
             LEFT JOIN tipos_usuario t ON t.id_tipo_usuario = u.id_tipo_usuario
             WHERE u.email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = result.rows[0];
        // Acepta bcrypt (app) y texto plano (seed de desarrollo)
        const valid = await bcrypt.compare(password, user.password_usuario)
                   || user.password_usuario === password;

        if (!valid) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // Traer vehículo principal si existe
        const veh = await query(
            `SELECT v.*, mv.nombre_modelo, ma.nombre_marca
             FROM vehiculos v
             JOIN modelos_vehiculo mv ON mv.id_modelo = v.id_modelo
             JOIN marcas_vehiculo ma ON ma.id_marca = mv.id_marca
             WHERE v.id_usuario = $1
             LIMIT 1`,
            [user.id_usuario]
        );

        res.json({
            ok: true,
            usuario: {
                id_usuario:     user.id_usuario,
                nombre:         user.nombre,
                apellido:       user.apellido,
                email:          user.email,
                telefono:       user.telefono,
                tipo:           user.nombre_tipo,
                fecha_registro: user.fecha_registro,
            },
            vehiculo: veh.rows[0] || null,
        });
    } catch (err) {
        console.error('Login:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/* ════════════════════════════════════════════════════════════
   USUARIOS
   ════════════════════════════════════════════════════════════ */

// GET /api/usuarios/:id/perfil
app.get('/api/usuarios/:id/perfil', async (req, res) => {
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
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/usuarios/:id
app.put('/api/usuarios/:id', async (req, res) => {
    const { nombre, apellido, telefono } = req.body;
    try {
        await query(
            'UPDATE usuarios SET nombre=$1, apellido=$2, telefono=$3 WHERE id_usuario=$4',
            [nombre, apellido, telefono, req.params.id]
        );
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ════════════════════════════════════════════════════════════
   VEHÍCULOS
   ════════════════════════════════════════════════════════════ */

// GET /api/usuarios/:id/vehiculos
app.get('/api/usuarios/:id/vehiculos', async (req, res) => {
    try {
        const r = await query(
            `SELECT v.*, mv.nombre_modelo, ma.nombre_marca, tc.nombre AS tipo_conector
             FROM vehiculos v
             JOIN modelos_vehiculo mv ON mv.id_modelo        = v.id_modelo
             JOIN marcas_vehiculo  ma ON ma.id_marca         = mv.id_marca
             JOIN tipos_conector   tc ON tc.id_tipo_conector = mv.id_tipo_conector
             WHERE v.id_usuario = $1
             ORDER BY v.id_vehiculo`,
            [req.params.id]
        );
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/vehiculos  — registrar vehículo
app.post('/api/vehiculos', async (req, res) => {
    const { id_usuario, id_modelo, placa, anio, capacidad_bateria_kwh } = req.body;
    if (!id_usuario || !id_modelo || !placa || !anio) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    try {
        const r = await query(
            `INSERT INTO vehiculos (id_usuario, id_modelo, placa, anio, capacidad_bateria_kwh)
             VALUES ($1,$2,$3,$4,$5)
             RETURNING *`,
            [id_usuario, id_modelo, placa.toUpperCase(), anio, capacidad_bateria_kwh || null]
        );
        res.status(201).json({ ok: true, vehiculo: r.rows[0] });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'La placa ya está registrada' });
        res.status(500).json({ error: err.message });
    }
});

// GET /api/marcas  — catálogo de marcas
app.get('/api/marcas', async (_req, res) => {
    const r = await query('SELECT * FROM marcas_vehiculo ORDER BY nombre_marca');
    res.json(r.rows);
});

// GET /api/modelos?id_marca=  — modelos por marca
app.get('/api/modelos', async (req, res) => {
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

/* ════════════════════════════════════════════════════════════
   ESTACIONES
   ════════════════════════════════════════════════════════════ */

// GET /api/estaciones
app.get('/api/estaciones', async (req, res) => {
    const { ciudad, estado } = req.query;
    try {
        let sql = `
            SELECT
                e.id_estacion,
                e.nombre_estacion,
                e.estado,
                e.fecha_instalacion,
                d.ciudad, d.estado AS estado_geo, d.calle, d.numero,
                COUNT(DISTINCT c.id_cargador)          AS total_cargadores,
                COUNT(DISTINCT p.id_puerto)            AS total_puertos,
                COUNT(DISTINCT p.id_puerto)
                    FILTER (WHERE p.estado = 'libre')  AS puertos_libres,
                MAX(c.potencia_kw)                     AS potencia_maxima,
                ARRAY_AGG(DISTINCT tc.nombre)          AS conectores
            FROM estaciones e
            JOIN direcciones d       ON d.id_direccion    = e.id_direccion
            LEFT JOIN cargadores c   ON c.id_estacion     = e.id_estacion
            LEFT JOIN puertos_carga p ON p.id_cargador    = c.id_cargador
            LEFT JOIN tipos_conector tc ON tc.id_tipo_conector = p.id_tipo_conector
            WHERE 1=1`;
        const params = [];
        if (ciudad) { params.push(ciudad); sql += ` AND d.ciudad ILIKE $${params.length}`; }
        if (estado) { params.push(estado); sql += ` AND e.estado = $${params.length}`; }
        sql += ' GROUP BY e.id_estacion, d.ciudad, d.estado, d.calle, d.numero ORDER BY e.nombre_estacion';

        const r = await query(sql, params);
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/estaciones/:id  — detalle con cargadores y puertos
app.get('/api/estaciones/:id', async (req, res) => {
    try {
        const est = await query(
            `SELECT e.*, d.calle, d.numero, d.ciudad, d.estado AS estado_geo,
                    d.codigo_postal, d.pais
             FROM estaciones e
             JOIN direcciones d ON d.id_direccion = e.id_direccion
             WHERE e.id_estacion = $1`,
            [req.params.id]
        );
        if (est.rows.length === 0) return res.status(404).json({ error: 'Estación no encontrada' });

        const cargadores = await query(
            `SELECT c.*, f.nombre_fabricante,
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'id_puerto',        p.id_puerto,
                        'estado',           p.estado,
                        'potencia_max_kw',  p.potencia_max_kw,
                        'tipo_conector',    tc.nombre
                    ) ORDER BY p.id_puerto) AS puertos
             FROM cargadores c
             JOIN fabricantes_cargador f ON f.id_fabricante_cargador = c.id_fabricante_cargador
             LEFT JOIN puertos_carga p   ON p.id_cargador = c.id_cargador
             LEFT JOIN tipos_conector tc ON tc.id_tipo_conector = p.id_tipo_conector
             WHERE c.id_estacion = $1
             GROUP BY c.id_cargador, f.nombre_fabricante
             ORDER BY c.id_cargador`,
            [req.params.id]
        );

        res.json({ ...est.rows[0], cargadores: cargadores.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ════════════════════════════════════════════════════════════
   SESIONES DE CARGA
   ════════════════════════════════════════════════════════════ */

// POST /api/sesiones  — iniciar carga
app.post('/api/sesiones', async (req, res) => {
    const { id_usuario, id_vehiculo, id_puerto } = req.body;
    if (!id_usuario || !id_vehiculo || !id_puerto) {
        return res.status(400).json({ error: 'id_usuario, id_vehiculo e id_puerto son requeridos' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verificar que el puerto esté libre
        const puerto = await client.query(
            'SELECT estado FROM puertos_carga WHERE id_puerto = $1 FOR UPDATE',
            [id_puerto]
        );
        if (puerto.rows.length === 0) throw new Error('Puerto no existe');
        if (puerto.rows[0].estado !== 'libre') throw new Error('El puerto no está disponible');

        // Crear sesión
        const sesion = await client.query(
            `INSERT INTO sesiones_carga (id_usuario, id_vehiculo, id_puerto)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [id_usuario, id_vehiculo, id_puerto]
        );

        // Marcar puerto como ocupado
        await client.query(
            'UPDATE puertos_carga SET estado = $1 WHERE id_puerto = $2',
            ['ocupado', id_puerto]
        );

        await client.query('COMMIT');
        res.status(201).json({ ok: true, sesion: sesion.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        const code = err.message.includes('disponible') || err.message.includes('libre') ? 409 : 500;
        res.status(code).json({ error: err.message });
    } finally {
        client.release();
    }
});

// PUT /api/sesiones/:id/finalizar  — terminar carga
app.put('/api/sesiones/:id/finalizar', async (req, res) => {
    const { energia_consumida_kwh } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Obtener tarifa vigente
        const tarifa = await client.query(
            `SELECT precio_kwh FROM tarifas_energia
             WHERE fecha_inicio <= NOW()
               AND (fecha_fin IS NULL OR fecha_fin >= NOW())
             ORDER BY fecha_inicio DESC LIMIT 1`
        );
        const precio = tarifa.rows[0]?.precio_kwh || 6.0;
        const costo  = (energia_consumida_kwh || 0) * precio;

        // Actualizar sesión
        const sesion = await client.query(
            `UPDATE sesiones_carga
             SET hora_fin = NOW(),
                 energia_consumida_kwh = $1,
                 costo_total = $2
             WHERE id_sesion = $3
             RETURNING *, (SELECT id_puerto FROM sesiones_carga WHERE id_sesion = $3) AS id_puerto_ref`,
            [energia_consumida_kwh || 0, costo.toFixed(2), req.params.id]
        );

        if (sesion.rows.length === 0) throw new Error('Sesión no encontrada');

        // Liberar puerto
        await client.query(
            'UPDATE puertos_carga SET estado = $1 WHERE id_puerto = $2',
            ['libre', sesion.rows[0].id_puerto]
        );

        await client.query('COMMIT');
        res.json({ ok: true, sesion: sesion.rows[0], precio_kwh: precio });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// GET /api/usuarios/:id/sesiones  — historial del usuario
app.get('/api/usuarios/:id/sesiones', async (req, res) => {
    try {
        const r = await query(
            `SELECT
                sc.id_sesion, sc.hora_inicio, sc.hora_fin,
                sc.energia_consumida_kwh, sc.costo_total,
                e.nombre_estacion,
                d.ciudad, d.calle,
                mv.nombre_modelo, ma.nombre_marca, v.placa,
                v.capacidad_bateria_kwh,
                tc.nombre AS tipo_conector,
                f.nombre_fabricante,
                mp.nombre_metodo AS metodo_pago,
                p.monto AS monto_pago,
                p.estado AS estado_pago,
                EXTRACT(EPOCH FROM (COALESCE(sc.hora_fin, NOW()) - sc.hora_inicio))/60
                    AS duracion_minutos
             FROM sesiones_carga sc
             JOIN puertos_carga p_c  ON p_c.id_puerto    = sc.id_puerto
             JOIN tipos_conector tc  ON tc.id_tipo_conector = p_c.id_tipo_conector
             JOIN cargadores c       ON c.id_cargador     = p_c.id_cargador
             JOIN fabricantes_cargador f ON f.id_fabricante_cargador = c.id_fabricante_cargador
             JOIN estaciones e       ON e.id_estacion     = c.id_estacion
             JOIN direcciones d      ON d.id_direccion    = e.id_direccion
             JOIN vehiculos v        ON v.id_vehiculo     = sc.id_vehiculo
             JOIN modelos_vehiculo mv ON mv.id_modelo     = v.id_modelo
             JOIN marcas_vehiculo  ma ON ma.id_marca      = mv.id_marca
             LEFT JOIN pagos p       ON p.id_sesion       = sc.id_sesion
             LEFT JOIN metodos_pago mp ON mp.id_metodo_pago = p.id_metodo_pago
             WHERE sc.id_usuario = $1
             ORDER BY sc.hora_inicio DESC`,
            [req.params.id]
        );
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/sesiones/:id  — sesión individual
app.get('/api/sesiones/:id', async (req, res) => {
    try {
        const r = await query(
            `SELECT sc.*, e.nombre_estacion, p.id_cargador,
                    tc.nombre AS tipo_conector, p.potencia_max_kw
             FROM sesiones_carga sc
             JOIN puertos_carga p ON p.id_puerto = sc.id_puerto
             JOIN cargadores c    ON c.id_cargador = p.id_cargador
             JOIN estaciones e    ON e.id_estacion = c.id_estacion
             JOIN tipos_conector tc ON tc.id_tipo_conector = p.id_tipo_conector
             WHERE sc.id_sesion = $1`,
            [req.params.id]
        );
        if (r.rows.length === 0) return res.status(404).json({ error: 'Sesión no encontrada' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ════════════════════════════════════════════════════════════
   SUSCRIPCIONES
   ════════════════════════════════════════════════════════════ */

// GET /api/planes
app.get('/api/planes', async (_req, res) => {
    const r = await query('SELECT * FROM planes_suscripcion ORDER BY precio_mensual');
    res.json(r.rows);
});

// GET /api/usuarios/:id/suscripcion
app.get('/api/usuarios/:id/suscripcion', async (req, res) => {
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
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/suscripciones
app.post('/api/suscripciones', async (req, res) => {
    const { id_usuario, id_plan } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Cancelar suscripción activa anterior
        await client.query(
            "UPDATE suscripciones SET estado='cancelada', fecha_fin=NOW() WHERE id_usuario=$1 AND estado='activa'",
            [id_usuario]
        );
        const r = await client.query(
            `INSERT INTO suscripciones (id_usuario, id_plan)
             VALUES ($1, $2) RETURNING *`,
            [id_usuario, id_plan]
        );
        await client.query('COMMIT');
        res.status(201).json({ ok: true, suscripcion: r.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

/* ════════════════════════════════════════════════════════════
   CATÁLOGOS (solo lectura)
   ════════════════════════════════════════════════════════════ */

// GET /api/metodos-pago
app.get('/api/metodos-pago', async (_req, res) => {
    const r = await query('SELECT * FROM metodos_pago ORDER BY id_metodo_pago');
    res.json(r.rows);
});

// GET /api/usuarios/:id/pagos
app.get('/api/usuarios/:id/pagos', async (req, res) => {
    try {
        const r = await query(
            `SELECT p.*, mp.nombre_metodo,
                    e.nombre_estacion, sc.energia_consumida_kwh
             FROM pagos p
             JOIN metodos_pago mp ON mp.id_metodo_pago = p.id_metodo_pago
             LEFT JOIN sesiones_carga sc ON sc.id_sesion = p.id_sesion
             LEFT JOIN puertos_carga pc  ON pc.id_puerto = sc.id_puerto
             LEFT JOIN cargadores c      ON c.id_cargador = pc.id_cargador
             LEFT JOIN estaciones e      ON e.id_estacion = c.id_estacion
             WHERE p.id_usuario = $1
             ORDER BY p.fecha_pago DESC`,
            [req.params.id]
        );
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/conectores',  async (_req, res) => res.json((await query('SELECT * FROM tipos_conector')).rows));
app.get('/api/tarifas/vigente', async (_req, res) => {
    const r = await query(
        `SELECT * FROM tarifas_energia
         WHERE fecha_inicio <= NOW() AND (fecha_fin IS NULL OR fecha_fin >= NOW())
         ORDER BY fecha_inicio DESC LIMIT 1`
    );
    res.json(r.rows[0] || { precio_kwh: 6.0 });
});

/* ════════════════════════════════════════════════════════════
   PUERTOS  — para seleccionar en la app
   ════════════════════════════════════════════════════════════ */

// GET /api/estaciones/:id/puertos-libres
app.get('/api/estaciones/:id/puertos-libres', async (req, res) => {
    try {
        const r = await query(
            `SELECT p.id_puerto, p.estado, p.potencia_max_kw,
                    tc.nombre AS tipo_conector,
                    c.modelo AS modelo_cargador, c.potencia_kw,
                    f.nombre_fabricante
             FROM puertos_carga p
             JOIN cargadores c    ON c.id_cargador           = p.id_cargador
             JOIN tipos_conector tc ON tc.id_tipo_conector   = p.id_tipo_conector
             JOIN fabricantes_cargador f ON f.id_fabricante_cargador = c.id_fabricante_cargador
             WHERE c.id_estacion = $1 AND p.estado = 'libre'
             ORDER BY p.id_puerto`,
            [req.params.id]
        );
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ─── Salud del servidor ─── */
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

/* ─── Iniciar ─── */
app.listen(port, () => {
    console.log(`⚡ Electrolineras API corriendo en http://localhost:${port}`);
    console.log(`   Endpoints disponibles en http://localhost:${port}/api/`);
});