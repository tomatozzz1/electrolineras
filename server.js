require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app  = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/usuarios',   require('./routes/usuarios'));
app.use('/api/estaciones', require('./routes/estaciones'));
app.use('/api/sesiones',   require('./routes/sesiones'));
app.use('/api',            require('./routes/catalogos'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/tecnico',    require('./routes/tecnico'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

app.listen(port, () => {
    console.log(`Electrolineras API corriendo en http://localhost:${port}`);
    console.log(`Endpoints en http://localhost:${port}/api/`);
});