const express = require('express');
const bcrypt  = require('bcryptjs');
const { query } = require('./db');
const router  = express.Router();

router.post('/registro', async (req, res) => {
    const { nombre, apellido, email, telefono, password,
            calle, numero, ciudad, estado, codigo_postal } = req.body;

    if (!nombre || !apellido || !email || !password)
        return res.status(400).json({ error: 'Campos obligatorios: nombre, apellido, email, password' });

    try {
        const existe = await query('SELECT id_usuario FROM usuarios WHERE email = $1', [email]);
        if (existe.rows.length > 0)
            return res.status(409).json({ error: 'El correo ya está registrado' });

        const hash = await bcrypt.hash(password, 10);

        const tipoResult = await query(
            `SELECT id_tipo_usuario FROM tipos_usuario WHERE LOWER(nombre_tipo) = 'cliente' LIMIT 1`
        );
        const idTipoCliente = tipoResult.rows[0]?.id_tipo_usuario;
        if (!idTipoCliente)
            return res.status(500).json({ error: 'Ejecuta el seed primero (tipos_usuario vacío)' });

        // Crear dirección si se proporcionó
        let idDireccion = null;
        if (calle && ciudad && estado && codigo_postal) {
            const dir = await query(
                `INSERT INTO direcciones (calle, numero, ciudad, estado, codigo_postal)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id_direccion`,
                [calle, numero || null, ciudad, estado, codigo_postal]
            );
            idDireccion = dir.rows[0].id_direccion;
        }

        const result = await query(
            `INSERT INTO usuarios (nombre, apellido, email, telefono, password_usuario, id_tipo_usuario, id_direccion)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             RETURNING id_usuario, nombre, apellido, email, telefono, fecha_registro`,
            [nombre, apellido, email, telefono || null, hash, idTipoCliente, idDireccion]
        );
        res.status(201).json({ ok: true, usuario: result.rows[0] });
    } catch (err) {
        console.error('Registro:', err);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
    try {
        const result = await query(
            `SELECT u.*, t.nombre_tipo FROM usuarios u
             LEFT JOIN tipos_usuario t ON t.id_tipo_usuario = u.id_tipo_usuario
             WHERE u.email = $1`,
            [email]
        );
        if (result.rows.length === 0)
            return res.status(401).json({ error: 'Credenciales incorrectas' });

        const user  = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_usuario)
                   || user.password_usuario === password;
        if (!valid)
            return res.status(401).json({ error: 'Credenciales incorrectas' });

        const veh = await query(
            `SELECT v.*, mv.nombre_modelo, ma.nombre_marca
             FROM vehiculos v
             JOIN modelos_vehiculo mv ON mv.id_modelo = v.id_modelo
             JOIN marcas_vehiculo  ma ON ma.id_marca  = mv.id_marca
             WHERE v.id_usuario = $1 LIMIT 1`,
            [user.id_usuario]
        );

        const tipoValido = ['administrador','tecnico'].includes(user.nombre_tipo)
            ? user.nombre_tipo : 'cliente';

        res.json({
            ok: true,
            usuario: {
                id_usuario:     user.id_usuario,
                nombre:         user.nombre,
                apellido:       user.apellido,
                email:          user.email,
                telefono:       user.telefono,
                tipo:           tipoValido,
                fecha_registro: user.fecha_registro,
            },
            vehiculo: veh.rows[0] || null,
        });
    } catch (err) {
        console.error('Login:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;