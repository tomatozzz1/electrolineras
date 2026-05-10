# ⚡ Electrolineras — ERP para Centros de Carga de Vehículos Eléctricos

Sistema web completo para la gestión y operación de estaciones de carga de vehículos eléctricos. Incluye backend REST API, base de datos PostgreSQL y frontend interactivo para usuarios finales.

---

## Tecnologías utilizadas

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL 17 |
| ORM/Driver | node-postgres (pg) |
| Seguridad | bcryptjs |

---

## Requisitos previos

Antes de ejecutar el proyecto asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) v18 o superior
- [PostgreSQL](https://www.postgresql.org/) v15 o superior
- [DBngin](https://dbngin.com/) (opcional, para manejar PostgreSQL en Mac/Windows fácilmente)
- [DBeaver](https://dbeaver.io/) (opcional, para visualizar la base de datos)
- Git

---

## Instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/tomatozzz1/electrolineras.git
cd electrolineras
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y edítalo con tus datos:

```bash
cp .env.example .env
```

Abre `.env` y llena tus datos de PostgreSQL:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=control_electrolineras
DB_USER=postgres
DB_PASSWORD=tu_password_aqui
PORT=3000
```

> **Nota:** Si usas DBngin, el puerto por defecto es `5434`, no `5432`.

### 4. Crear la base de datos

Abre DBeaver, conéctate a PostgreSQL y ejecuta:

```sql
CREATE DATABASE control_electrolineras
    WITH OWNER = postgres ENCODING = 'UTF8';
```

### 5. Ejecutar el schema

Con la conexión activa en `control_electrolineras`, abre el archivo `1_schema.sql` en DBeaver y ejecuta con **Alt+X**.

Esto crea las 31 tablas del sistema con todas sus relaciones y restricciones.

### 6. Insertar datos de prueba

Abre `2_seed.sql` y ejecuta con **Alt+X**.

Esto inserta usuarios, estaciones, vehículos, cargadores y sesiones de ejemplo.

### 7. Instalar triggers

Abre `3_triggers.sql` y ejecuta con **Alt+X**.

Esto instala los 7 disparadores PL/pgSQL que automatizan la lógica del negocio.

### 8. Iniciar el servidor

```bash
node server.js
```

Debes ver:

```
⚡ Electrolineras API corriendo en http://localhost:3000
   Endpoints disponibles en http://localhost:3000/api/
✅ Conectado a PostgreSQL — control_electrolineras
```

### 9. Abrir la aplicación

Abre tu navegador y ve a:

```
http://localhost:3000
```

---

## Usuarios de prueba

Todos los usuarios del seed tienen la contraseña `12345678`.

| Nombre | Email | Tipo |
|---|---|---|
| Juan Pérez | juanperez@gmail.com | Administrador |
| Jonathan García | jonaga@gmail.com | Cliente |
| Juana La Cubana | juanalacubana@gmail.com | Cliente |
| Homero Simpson | homer@gmail.com | Cliente |
| Lucía Martínez | lucia@gmail.com | Cliente |
| David Visbal | david@gmail.com | Técnico |

---

## Estructura del proyecto

```
electrolineras/
├── public/                  # Frontend (servido estáticamente)
│   ├── index.html           # Interfaz de usuario
│   ├── styles.css           # Estilos
│   └── app.js               # Lógica del frontend
├── server.js                # API REST (Express + PostgreSQL)
├── package.json             # Dependencias de Node.js
├── .env.example             # Plantilla de variables de entorno
├── 1_schema.sql             # Creación de tablas
├── 2_seed.sql               # Datos de prueba
└── 3_triggers.sql           # Disparadores PL/pgSQL
```

---

## Módulos del sistema

| Módulo | Tablas | Descripción |
|---|---|---|
| Usuarios | 3 tablas | Registro, autenticación y tipos de usuario |
| Vehículos | 4 tablas | Marcas, modelos, conectores y vehículos registrados |
| Suscripciones | 3 tablas | Planes, suscripciones e historial |
| Estaciones | 6 tablas | Estaciones, cargadores, puertos y estados |
| Operación | 3 tablas | Sesiones de carga, mediciones y tarifas |
| Pagos | 4 tablas | Pagos, transacciones, reembolsos y métodos |
| Facturación | 3 tablas | Facturas, detalles e impuestos |
| Mantenimiento | 3 tablas | Técnicos, órdenes e historial |
| Reportes | 2 tablas | Reportes operativos y financieros |

---

## API REST — Endpoints principales

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/auth/registro` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/estaciones` | Listar estaciones con disponibilidad |
| GET | `/api/estaciones/:id` | Detalle de estación con cargadores |
| GET | `/api/estaciones/:id/puertos-libres` | Puertos disponibles |
| POST | `/api/sesiones` | Iniciar sesión de carga |
| PUT | `/api/sesiones/:id/finalizar` | Finalizar sesión de carga |
| GET | `/api/usuarios/:id/sesiones` | Historial del usuario |
| GET | `/api/usuarios/:id/vehiculos` | Vehículos del usuario |
| POST | `/api/vehiculos` | Registrar vehículo |
| GET | `/api/planes` | Listar planes de suscripción |
| POST | `/api/suscripciones` | Contratar plan |

---

## Triggers PL/pgSQL

| Trigger | Tabla | Evento | Función |
|---|---|---|---|
| `trg_liberar_puerto` | sesiones_carga | UPDATE | Libera el puerto al terminar la carga |
| `trg_estado_cargador` | puertos_carga | INSERT/UPDATE/DELETE | Actualiza estado del cargador según sus puertos |
| `trg_historial_cargador` | cargadores | UPDATE | Registra cambios de estado automáticamente |
| `trg_reporte_operativo` | sesiones_carga | UPDATE | Suma sesiones al reporte diario |
| `trg_reporte_financiero` | pagos | INSERT/UPDATE | Actualiza ingresos y reembolsos del día |
| `trg_subtotal_factura` | detalles_factura | INSERT/UPDATE | Calcula subtotal = cantidad × precio |
| `trg_historial_suscripcion` | suscripciones | UPDATE | Registra cambios de plan del usuario |

---

## Solución de problemas frecuentes

**Error: `EADDRINUSE: address already in use :::3000`**
El puerto ya está ocupado por una instancia anterior del servidor.
```bash
npx kill-port 3000
node server.js
```

**Error: `database "control_electrolineras" does not exist`**
La base de datos no existe aún. Créala desde DBeaver conectado a `postgres` y luego ejecuta el schema.

**Error: `password authentication failed`**
La contraseña en tu `.env` no coincide con la de PostgreSQL. Verifica el campo `DB_PASSWORD`.

**El servidor conecta pero no se ven estaciones**
La seed no se ejecutó o hay un error en ella. Ejecuta `2_seed.sql` nuevamente en DBeaver.

**Puerto de PostgreSQL incorrecto**
Si usas DBngin, cambia `DB_PORT=5432` a `DB_PORT=5434` en tu `.env`.

---

## Equipo de desarrollo

Proyecto desarrollado para la materia de **Bases de Datos** — 2026.
