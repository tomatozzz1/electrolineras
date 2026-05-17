CREATE DATABASE control_electrolineras
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LOCALE_PROVIDER = 'libc'
    CONNECTION LIMIT = -1
    TEMPLATE = template0;

-- MODULO USUARIOS

CREATE TABLE tipos_usuario (
    id_tipo_usuario SERIAL PRIMARY KEY,
    nombre_tipo     VARCHAR(50)  NOT NULL UNIQUE,
    descripcion     TEXT
);

CREATE TABLE direcciones (
    id_direccion  SERIAL PRIMARY KEY,
    calle         VARCHAR(100) NOT NULL,
    numero        VARCHAR(10),
    ciudad        VARCHAR(50)  NOT NULL,
    estado        VARCHAR(50)  NOT NULL,
    codigo_postal VARCHAR(10)  NOT NULL,
    pais          VARCHAR(50)  NOT NULL DEFAULT 'Mexico'
);

CREATE TABLE usuarios (
    id_usuario       SERIAL PRIMARY KEY,
    nombre           VARCHAR(50)  NOT NULL,
    apellido         VARCHAR(50)  NOT NULL,
    email            VARCHAR(150) NOT NULL UNIQUE,
    telefono         VARCHAR(20),
    password_usuario VARCHAR(255) NOT NULL,
    fecha_registro   TIMESTAMP    NOT NULL DEFAULT NOW(),
    id_direccion     INT,
    id_tipo_usuario  INT,
    CONSTRAINT fk_usuario_direccion
        FOREIGN KEY (id_direccion) REFERENCES direcciones(id_direccion)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_usuario_tipo
        FOREIGN KEY (id_tipo_usuario) REFERENCES tipos_usuario(id_tipo_usuario)
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- MODULO VEHICULOS

CREATE TABLE marcas_vehiculo (
    id_marca     SERIAL PRIMARY KEY,
    nombre_marca VARCHAR(100) NOT NULL UNIQUE,
    pais_origen  VARCHAR(50)  NOT NULL
);

CREATE TABLE tipos_conector (
    id_tipo_conector SERIAL PRIMARY KEY,
    nombre           VARCHAR(50) NOT NULL UNIQUE,
    descripcion      TEXT
);

CREATE TABLE modelos_vehiculo (
    id_modelo        SERIAL PRIMARY KEY,
    id_marca         INT NOT NULL,
    nombre_modelo    VARCHAR(100) NOT NULL,
    id_tipo_conector INT NOT NULL,
    CONSTRAINT fk_modelo_marca
        FOREIGN KEY (id_marca) REFERENCES marcas_vehiculo(id_marca)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_modelo_conector
        FOREIGN KEY (id_tipo_conector) REFERENCES tipos_conector(id_tipo_conector)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT unique_modelo_marca UNIQUE (id_marca, nombre_modelo)
);

CREATE TABLE vehiculos (
    id_vehiculo           SERIAL PRIMARY KEY,
    id_usuario            INT NOT NULL,
    id_modelo             INT NOT NULL,
    placa                 VARCHAR(20)  NOT NULL UNIQUE,
    anio                  INT NOT NULL,
    capacidad_bateria_kwh DECIMAL(6,2),
    CONSTRAINT fk_vehiculo_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_vehiculo_modelo
        FOREIGN KEY (id_modelo) REFERENCES modelos_vehiculo(id_modelo)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_anio_valido
        CHECK (anio >= 1886 AND anio <= EXTRACT(YEAR FROM CURRENT_DATE)),
    CONSTRAINT chk_bateria_positiva
        CHECK (capacidad_bateria_kwh IS NULL OR capacidad_bateria_kwh > 0)
);

-- MODULO SUSCRIPCIONES

CREATE TABLE planes_suscripcion (
    id_plan              SERIAL PRIMARY KEY,
    nombre_plan          VARCHAR(100)  NOT NULL UNIQUE,
    precio_mensual       DECIMAL(10,2) NOT NULL,
    energia_incluida_kwh DECIMAL(10,2) NOT NULL,
    descripcion          TEXT
);

CREATE TABLE suscripciones (
    id_suscripcion SERIAL PRIMARY KEY,
    id_usuario     INT NOT NULL,
    id_plan        INT NOT NULL,
    fecha_inicio   TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_fin      TIMESTAMP,
    estado         VARCHAR(20) NOT NULL DEFAULT 'activa',
    CONSTRAINT fk_suscripcion_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_suscripcion_plan
        FOREIGN KEY (id_plan) REFERENCES planes_suscripcion(id_plan)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE historial_suscripciones (
    id_historial       SERIAL PRIMARY KEY,
    id_suscripcion     INT NOT NULL,
    fecha_cambio       TIMESTAMP NOT NULL DEFAULT NOW(),
    descripcion_cambio TEXT,
    CONSTRAINT fk_historial_suscripcion
        FOREIGN KEY (id_suscripcion) REFERENCES suscripciones(id_suscripcion)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- MODULO ESTACIONES

CREATE TABLE estaciones (
    id_estacion       SERIAL PRIMARY KEY,
    nombre_estacion   VARCHAR(100) NOT NULL,
    id_direccion      INT NOT NULL,
    fecha_instalacion TIMESTAMP NOT NULL DEFAULT NOW(),
    estado            VARCHAR(20) NOT NULL DEFAULT 'activa',
    CONSTRAINT fk_estacion_direccion
        FOREIGN KEY (id_direccion) REFERENCES direcciones(id_direccion)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE fabricantes_cargador (
    id_fabricante_cargador SERIAL PRIMARY KEY,
    nombre_fabricante      VARCHAR(100) NOT NULL,
    pais_fabricante        VARCHAR(50)  NOT NULL,
    contacto               VARCHAR(100) NOT NULL
);

CREATE TABLE cargadores (
    id_cargador            SERIAL PRIMARY KEY,
    id_estacion            INT NOT NULL,
    id_fabricante_cargador INT NOT NULL,
    modelo                 VARCHAR(100) NOT NULL,
    potencia_kw            DECIMAL(6,2) NOT NULL,
    estado                 VARCHAR(20)  NOT NULL DEFAULT 'activo',
    CONSTRAINT fk_cargador_estacion
        FOREIGN KEY (id_estacion) REFERENCES estaciones(id_estacion)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cargador_fabricante
        FOREIGN KEY (id_fabricante_cargador) REFERENCES fabricantes_cargador(id_fabricante_cargador)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE puertos_carga (
    id_puerto        SERIAL PRIMARY KEY,
    id_cargador      INT NOT NULL,
    id_tipo_conector INT NOT NULL,
    potencia_max_kw  DECIMAL(6,2),
    estado           VARCHAR(20) NOT NULL DEFAULT 'libre',
    CONSTRAINT fk_puerto_cargador
        FOREIGN KEY (id_cargador) REFERENCES cargadores(id_cargador)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_puerto_conector
        FOREIGN KEY (id_tipo_conector) REFERENCES tipos_conector(id_tipo_conector)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE estados_cargador (
    id_estado_cargador SERIAL PRIMARY KEY,
    nombre_estado      VARCHAR(50) NOT NULL UNIQUE,
    descripcion        TEXT
);

CREATE TABLE historial_estado_cargador (
    id_historial_estado_cargador SERIAL PRIMARY KEY,
    id_cargador                  INT NOT NULL,
    id_estado_cargador           INT NOT NULL,
    fecha_inicio                 TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_fin                    TIMESTAMP,
    descripcion_cambio           TEXT,
    CONSTRAINT fk_hec_cargador
        FOREIGN KEY (id_cargador) REFERENCES cargadores(id_cargador)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_hec_estado
        FOREIGN KEY (id_estado_cargador) REFERENCES estados_cargador(id_estado_cargador)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- MODULO OPERACION DE CARGA

CREATE TABLE tarifas_energia (
    id_tarifa    SERIAL PRIMARY KEY,
    precio_kwh   DECIMAL(10,2) NOT NULL,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin    TIMESTAMP
);

CREATE TABLE sesiones_carga (
    id_sesion             SERIAL PRIMARY KEY,
    id_usuario            INT NOT NULL,
    id_vehiculo           INT NOT NULL,
    id_puerto             INT NOT NULL,
    hora_inicio           TIMESTAMP NOT NULL DEFAULT NOW(),
    hora_fin              TIMESTAMP,
    energia_consumida_kwh DECIMAL(10,2),
    costo_total           DECIMAL(10,2),
    CONSTRAINT fk_sesion_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sesion_vehiculo
        FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id_vehiculo)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sesion_puerto
        FOREIGN KEY (id_puerto) REFERENCES puertos_carga(id_puerto)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_fechas_sesion
        CHECK (hora_fin IS NULL OR hora_fin >= hora_inicio),
    CONSTRAINT chk_energia_positiva
        CHECK (energia_consumida_kwh IS NULL OR energia_consumida_kwh >= 0),
    CONSTRAINT chk_costo_positivo
        CHECK (costo_total IS NULL OR costo_total >= 0)
);

CREATE TABLE mediciones_energia (
    id_medicion    SERIAL PRIMARY KEY,
    id_sesion      INT NOT NULL,
    fecha_medicion TIMESTAMP NOT NULL DEFAULT NOW(),
    energia_kwh    DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_medicion_sesion
        FOREIGN KEY (id_sesion) REFERENCES sesiones_carga(id_sesion)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_energia_medicion CHECK (energia_kwh >= 0)
);

-- MODULO PAGOS

CREATE TABLE metodos_pago (
    id_metodo_pago SERIAL PRIMARY KEY,
    nombre_metodo  VARCHAR(50) NOT NULL UNIQUE,
    descripcion    TEXT
);

CREATE TABLE pagos (
    id_pago        SERIAL PRIMARY KEY,
    id_usuario     INT NOT NULL,
    id_metodo_pago INT NOT NULL,
    id_sesion      INT,
    monto          DECIMAL(10,2) NOT NULL,
    fecha_pago     TIMESTAMP NOT NULL DEFAULT NOW(),
    estado         VARCHAR(20) NOT NULL DEFAULT 'completado',
    CONSTRAINT fk_pago_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pago_metodo
        FOREIGN KEY (id_metodo_pago) REFERENCES metodos_pago(id_metodo_pago)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pago_sesion
        FOREIGN KEY (id_sesion) REFERENCES sesiones_carga(id_sesion)
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE transacciones_pago (
    id_transaccion     SERIAL PRIMARY KEY,
    id_pago            INT NOT NULL,
    referencia         VARCHAR(100) NOT NULL,
    estado_transaccion VARCHAR(50)  NOT NULL,
    fecha_transaccion  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_transaccion_pago
        FOREIGN KEY (id_pago) REFERENCES pagos(id_pago)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE reembolsos (
    id_reembolso    SERIAL PRIMARY KEY,
    id_pago         INT NOT NULL,
    monto           DECIMAL(10,2) NOT NULL,
    motivo          TEXT,
    fecha_reembolso TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_reembolso_pago
        FOREIGN KEY (id_pago) REFERENCES pagos(id_pago)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- MODULO FACTURACION

CREATE TABLE facturas (
    id_factura    SERIAL PRIMARY KEY,
    id_usuario    INT NOT NULL,
    fecha_emision TIMESTAMP NOT NULL DEFAULT NOW(),
    total         DECIMAL(10,2) NOT NULL,
    estado        VARCHAR(20) NOT NULL DEFAULT 'emitida',
    CONSTRAINT fk_factura_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE detalles_factura (
    id_detalle      SERIAL PRIMARY KEY,
    id_factura      INT NOT NULL,
    descripcion     TEXT,
    cantidad        INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal        DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_detalle_factura
        FOREIGN KEY (id_factura) REFERENCES facturas(id_factura)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE impuestos (
    id_impuesto     SERIAL PRIMARY KEY,
    nombre_impuesto VARCHAR(50)  NOT NULL UNIQUE,
    porcentaje      DECIMAL(5,2) NOT NULL
);

-- MODULO MANTENIMIENTO

CREATE TABLE tecnicos (
    id_tecnico           SERIAL PRIMARY KEY,
    nombre_tecnico       VARCHAR(100) NOT NULL,
    telefono             VARCHAR(15)  NOT NULL,
    especialidad_tecnico VARCHAR(100)
);

CREATE TABLE ordenes_mantenimiento (
    id_orden_mantenimiento SERIAL PRIMARY KEY,
    id_cargador            INT NOT NULL,
    id_tecnico             INT,
    fecha_reporte          TIMESTAMP NOT NULL DEFAULT NOW(),
    descripcion_problema   TEXT,
    estado                 VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    CONSTRAINT fk_orden_cargador
        FOREIGN KEY (id_cargador) REFERENCES cargadores(id_cargador)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_orden_tecnico
        FOREIGN KEY (id_tecnico) REFERENCES tecnicos(id_tecnico)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE historial_mantenimiento (
    id_historial_mantenimiento SERIAL PRIMARY KEY,
    id_orden_mantenimiento     INT NOT NULL,
    fecha_inicio               TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_fin                  TIMESTAMP,
    acciones_realizadas        TEXT,
    CONSTRAINT fk_hm_orden
        FOREIGN KEY (id_orden_mantenimiento) REFERENCES ordenes_mantenimiento(id_orden_mantenimiento)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- MODULO REPORTES

CREATE TABLE reportes_operativos (
    id_reporte_operativo    SERIAL PRIMARY KEY,
    fecha_reporte           DATE NOT NULL UNIQUE,
    total_sesiones          INT NOT NULL DEFAULT 0,
    energia_total_consumida DECIMAL(10,2) NOT NULL DEFAULT 0,
    ingresos_totales        DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE reportes_financieros (
    id_reporte_financiero SERIAL PRIMARY KEY,
    fecha_reporte         DATE NOT NULL UNIQUE,
    total_ingresos        DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_reembolsos      DECIMAL(10,2) NOT NULL DEFAULT 0,
    utilidad              DECIMAL(10,2) NOT NULL DEFAULT 0,
    CONSTRAINT chk_ingresos_positivos   CHECK (total_ingresos >= 0),
    CONSTRAINT chk_reembolsos_positivos CHECK (total_reembolsos >= 0),
    CONSTRAINT chk_utilidad_valida      CHECK (utilidad = total_ingresos - total_reembolsos)
);