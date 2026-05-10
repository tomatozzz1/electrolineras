-- Electrolineras - Seed de datos
-- Ejecutar DESPUES de 1_schema.sql
-- Contrasena de todos los usuarios: 12345678

INSERT INTO tipos_usuario (nombre_tipo, descripcion) VALUES
('administrador', 'Acceso total al sistema'),
('cliente',       'Usuario que contrata servicios'),
('tecnico',       'Personal de mantenimiento'),
('invitado',      'Acceso limitado al sistema'),
('supervisor',    'Monitorea actividades'),
('operador',      'Gestiona procesos'),
('soporte',       'Atiende incidencias'),
('analista',      'Revisa metricas'),
('desarrollador', 'Acceso tecnico'),
('auditor',       'Revisa cumplimiento');

INSERT INTO tipos_conector (nombre, descripcion) VALUES
('CCS2',      'Combined Charging System 2'),
('CHAdeMO',   'Protocolo japones de carga rapida DC'),
('Tipo 2 AC', 'IEC 62196 - carga AC trifasica'),
('NACS',      'North American Charging Standard'),
('Tipo 1 AC', 'SAE J1772 - carga AC monofasica'),
('J1772',     'Estandar de carga lenta en America del Norte'),
('Mennekes',  'Estandar europeo de carga lenta'),
('CCS1',      'Carga rapida DC en America del Norte'),
('GB/T',      'Estandar unico de China'),
('ChaoJi',    'Nuevo estandar de ultra-alta potencia');

INSERT INTO metodos_pago (nombre_metodo, descripcion) VALUES
('Tarjeta de credito', 'Visa, Mastercard, Amex'),
('Tarjeta de debito',  'Pago mediante tarjeta de debito'),
('SPEI',               'Transferencia bancaria electronica'),
('PayPal',             'Pago digital via PayPal'),
('Pago movil',         'A traves de aplicaciones moviles'),
('Efectivo',           'Pago en efectivo en estacion');

INSERT INTO planes_suscripcion (nombre_plan, precio_mensual, energia_incluida_kwh, descripcion) VALUES
('Sin plan',       0.00,    0.00, 'Pago por uso, sin suscripcion mensual'),
('Plan Bronce',    0.00,    0.00, 'Ideal para usuarios ocasionales'),
('Plan Plata',   299.00,   60.00, 'Para conductores urbanos. 60 kWh incluidos al mes'),
('Plan Oro',     799.00,  200.00, 'Alto recorrido. 200 kWh en cualquier cargador'),
('Plan Platino',1499.00,  500.00, '500 kWh mensuales'),
('Plan Nocturno',249.00,   80.00, '40% descuento entre 21:00 y 06:00'),
('Plan Eco',     499.00,  100.00, 'Energia 100% renovable. 100 kWh al mes'),
('Plan Viajero',1099.00,  350.00, '350 kWh, prioridad en cargadores de 150 kW'),
('Plan Flotas', 2400.00, 1000.00, 'Hasta 3 vehiculos. 1000 kWh compartidos'),
('Plan Empresa',5900.00, 3000.00, 'Hasta 10 vehiculos. 3000 kWh');

INSERT INTO tarifas_energia (precio_kwh, fecha_inicio, fecha_fin) VALUES
(6.00, '2025-01-01', '2025-07-31'),
(8.53, '2025-08-01', '2025-08-31'),
(6.87, '2025-09-01', '2025-09-30'),
(7.54, '2025-10-01', '2025-10-31'),
(7.40, '2025-11-01', '2025-11-30'),
(8.79, '2025-12-01', '2025-12-31'),
(8.63, '2026-01-01', '2026-01-31'),
(9.21, '2026-02-01', '2026-02-28'),
(7.03, '2026-03-01', '2026-03-31'),
(7.94, '2026-04-01', '2026-04-30'),
(6.88, '2026-05-01', NULL);

INSERT INTO estados_cargador (nombre_estado, descripcion) VALUES
('activo',            'Funcionando correctamente'),
('en uso',            'Hay un vehiculo conectado'),
('mantenimiento',     'En reparacion o mantenimiento'),
('fuera de servicio', 'No disponible por falla');

INSERT INTO impuestos (nombre_impuesto, porcentaje) VALUES
('IVA', 16.00);

INSERT INTO direcciones (calle, numero, ciudad, estado, codigo_postal) VALUES
('Ruisenor',          '10', 'Zapopan', 'Jalisco', '45134'),
('Paloma',            '22', 'Zapopan', 'Jalisco', '45134'),
('Camino a Copalita', '5',  'Zapopan', 'Jalisco', '45134'),
('Encino',            '8',  'Zapopan', 'Jalisco', '45134'),
('Gavilan',           '3',  'Zapopan', 'Jalisco', '45134'),
('Aguila',            '17', 'Zapopan', 'Jalisco', '45134'),
('Fresno',            '9',  'Zapopan', 'Jalisco', '45134'),
('Palma',             '1',  'Zapopan', 'Jalisco', '45134'),
('Limon',             '6',  'Zapopan', 'Jalisco', '45134'),
('Papaya',            '14', 'Zapopan', 'Jalisco', '45134');

INSERT INTO usuarios (nombre, apellido, email, telefono, password_usuario, id_direccion, id_tipo_usuario) VALUES
('Juan',     'Perez Perez',      'juanperez@gmail.com',        '3324157475', '12345678', 1,  (SELECT id_tipo_usuario FROM tipos_usuario WHERE nombre_tipo = 'administrador')),
('Jonathan', 'Garcia Garcia',    'jonaga@gmail.com',           '3321157475', '12345678', 2,  (SELECT id_tipo_usuario FROM tipos_usuario WHERE nombre_tipo = 'cliente')),
('Juana',    'La Cubana',        'juanalacubana@gmail.com',    '3322157475', '12345678', 3,  (SELECT id_tipo_usuario FROM tipos_usuario WHERE nombre_tipo = 'cliente')),
('Clark',    'Kent Lopez',       'superman@gmail.com',         '3323157475', '12345678', 4,  (SELECT id_tipo_usuario FROM tipos_usuario WHERE nombre_tipo = 'cliente')),
('Homero',   'Simpson Perez',    'homer@gmail.com',            '3325157475', '12345678', 5,  (SELECT id_tipo_usuario FROM tipos_usuario WHERE nombre_tipo = 'cliente')),
('Jessy',    'Picman Pacman',    'jessylavaquerita@gmail.com', '3326157475', '12345678', 6,  (SELECT id_tipo_usuario FROM tipos_usuario WHERE nombre_tipo = 'cliente')),
('Elena',    'Olmost Heaven',    'elena@gmail.com',            '3328157475', '12345678', 7,  (SELECT id_tipo_usuario FROM tipos_usuario WHERE nombre_tipo = 'cliente')),
('Maria',    'Rivera Contreras', 'maria@gmail.com',            '3329257475', '12345678', 8,  (SELECT id_tipo_usuario FROM tipos_usuario WHERE nombre_tipo = 'cliente')),
('David',    'Visbal Arjona',    'david@gmail.com',            '3331257475', '12345678', 9,  (SELECT id_tipo_usuario FROM tipos_usuario WHERE nombre_tipo = 'tecnico')),
('Lucia',    'Martinez Soto',    'lucia@gmail.com',            '3332157475', '12345678', 10, (SELECT id_tipo_usuario FROM tipos_usuario WHERE nombre_tipo = 'cliente'));

INSERT INTO marcas_vehiculo (nombre_marca, pais_origen) VALUES
('Toyota',     'Japon'),
('Volkswagen', 'Alemania'),
('Hyundai',    'Corea del Sur'),
('Stellantis', 'Paises Bajos'),
('Chevrolet',  'Estados Unidos'),
('Ford',       'Estados Unidos'),
('BYD',        'China'),
('Honda',      'Japon'),
('Nissan',     'Japon'),
('Geely',      'China');

INSERT INTO modelos_vehiculo (id_marca, nombre_modelo, id_tipo_conector) VALUES
((SELECT id_marca FROM marcas_vehiculo WHERE nombre_marca = 'Toyota'),     'bZ4X',          (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'CCS2')),
((SELECT id_marca FROM marcas_vehiculo WHERE nombre_marca = 'Volkswagen'), 'ID.4',          (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'CCS2')),
((SELECT id_marca FROM marcas_vehiculo WHERE nombre_marca = 'Hyundai'),    'IONIQ 5',       (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'CCS2')),
((SELECT id_marca FROM marcas_vehiculo WHERE nombre_marca = 'Stellantis'), 'e-2008',        (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'Tipo 2 AC')),
((SELECT id_marca FROM marcas_vehiculo WHERE nombre_marca = 'Chevrolet'),  'Blazer EV',     (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'NACS')),
((SELECT id_marca FROM marcas_vehiculo WHERE nombre_marca = 'Ford'),       'Mustang Mach-E',(SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'NACS')),
((SELECT id_marca FROM marcas_vehiculo WHERE nombre_marca = 'BYD'),        'Dolphin',       (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'GB/T')),
((SELECT id_marca FROM marcas_vehiculo WHERE nombre_marca = 'Honda'),      'Prologue',      (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'NACS')),
((SELECT id_marca FROM marcas_vehiculo WHERE nombre_marca = 'Nissan'),     'Ariya',         (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'CHAdeMO')),
((SELECT id_marca FROM marcas_vehiculo WHERE nombre_marca = 'Geely'),      'EX30',          (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'CCS2'));

INSERT INTO fabricantes_cargador (nombre_fabricante, pais_fabricante, contacto) VALUES
('ChargeTech',         'Estados Unidos', 'contact@chargetech.com'),
('ElectroVolt',        'Alemania',       'info@electrovolt.de'),
('PowerGrid Solutions','Canada',         'support@powergrid.ca'),
('Voltix Energy',      'Espana',         'ventas@voltix.es'),
('Ampere Systems',     'Francia',        'contact@ampere.fr'),
('EcoCharge',          'Japon',          'info@ecocharge.jp'),
('NextGen Charging',   'Corea del Sur',  'support@nextgen.kr'),
('EnerGo Corp',        'Reino Unido',    'contact@energo.uk'),
('CargaMax',           'Mexico',         'ventas@cargamax.mx'),
('GreenPlug',          'Suecia',         'info@greenplug.se');

INSERT INTO estaciones (nombre_estacion, id_direccion, fecha_instalacion, estado) VALUES
('Estacion #1',   1, NOW() - INTERVAL '9 days',  'activa'),
('Estacion #2',   2, NOW() - INTERVAL '8 days',  'inactiva'),
('Estacion #3',   3, NOW() - INTERVAL '7 days',  'mantenimiento'),
('Estacion #4',   4, NOW() - INTERVAL '6 days',  'activa'),
('Estacion #5',   5, NOW() - INTERVAL '5 days',  'inactiva'),
('Estacion #6',   6, NOW() - INTERVAL '4 days',  'mantenimiento'),
('Estacion #7',   7, NOW() - INTERVAL '3 days',  'activa'),
('Estacion #8',   8, NOW() - INTERVAL '2 days',  'inactiva'),
('Estacion #9',   9, NOW() - INTERVAL '1 day',   'mantenimiento'),
('Estacion #10', 10, NOW(),                       'activa');

INSERT INTO cargadores (id_estacion, id_fabricante_cargador, modelo, potencia_kw, estado) VALUES
(1,   1, 'Modelo 1',   60.00, 'activo'),
(2,   2, 'Modelo 2',   70.00, 'en uso'),
(3,   3, 'Modelo 3',   80.00, 'mantenimiento'),
(4,   4, 'Modelo 4',   90.00, 'activo'),
(5,   5, 'Modelo 5',  100.00, 'fuera de servicio'),
(6,   6, 'Modelo 6',  110.00, 'en uso'),
(7,   7, 'Modelo 7',  120.00, 'activo'),
(8,   8, 'Modelo 8',  130.00, 'en uso'),
(9,   9, 'Modelo 9',  140.00, 'mantenimiento'),
(10, 10, 'Modelo 10', 150.00, 'activo');

INSERT INTO puertos_carga (id_cargador, id_tipo_conector, potencia_max_kw, estado) VALUES
(1,  (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'CCS2'),      60.00, 'libre'),
(2,  (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'CHAdeMO'),   70.00, 'ocupado'),
(3,  (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'Tipo 2 AC'), 80.00, 'fuera'),
(4,  (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'NACS'),      90.00, 'libre'),
(5,  (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'CCS2'),     100.00, 'ocupado'),
(6,  (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'J1772'),    110.00, 'ocupado'),
(7,  (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'CCS2'),     120.00, 'libre'),
(8,  (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'NACS'),     130.00, 'ocupado'),
(9,  (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'CHAdeMO'),  140.00, 'fuera'),
(10, (SELECT id_tipo_conector FROM tipos_conector WHERE nombre = 'CCS2'),     150.00, 'libre');

INSERT INTO historial_estado_cargador (id_cargador, id_estado_cargador, fecha_inicio, descripcion_cambio) VALUES
(1, (SELECT id_estado_cargador FROM estados_cargador WHERE nombre_estado = 'activo'),            NOW() - INTERVAL '5 hours', 'Cargador disponible'),
(2, (SELECT id_estado_cargador FROM estados_cargador WHERE nombre_estado = 'en uso'),            NOW() - INTERVAL '4 hours', 'Cargador en uso por cliente'),
(3, (SELECT id_estado_cargador FROM estados_cargador WHERE nombre_estado = 'mantenimiento'),     NOW() - INTERVAL '3 hours', 'Mantenimiento programado'),
(4, (SELECT id_estado_cargador FROM estados_cargador WHERE nombre_estado = 'activo'),            NOW() - INTERVAL '2 hours', 'Cargador disponible'),
(5, (SELECT id_estado_cargador FROM estados_cargador WHERE nombre_estado = 'fuera de servicio'), NOW() - INTERVAL '1 hour',  'Falla detectada');

INSERT INTO vehiculos (id_usuario, id_modelo, placa, anio, capacidad_bateria_kwh) VALUES
((SELECT id_usuario FROM usuarios WHERE email = 'juanalacubana@gmail.com'),   (SELECT id_modelo FROM modelos_vehiculo WHERE nombre_modelo = 'Dolphin'),        'JAL-1234',  2025, 71.4),
((SELECT id_usuario FROM usuarios WHERE email = 'superman@gmail.com'),         (SELECT id_modelo FROM modelos_vehiculo WHERE nombre_modelo = 'Prologue'),       'MEX-5678',  2025, 82.0),
((SELECT id_usuario FROM usuarios WHERE email = 'homer@gmail.com'),            (SELECT id_modelo FROM modelos_vehiculo WHERE nombre_modelo = 'IONIQ 5'),        'GDL-9012',  2025, 84.0),
((SELECT id_usuario FROM usuarios WHERE email = 'jessylavaquerita@gmail.com'), (SELECT id_modelo FROM modelos_vehiculo WHERE nombre_modelo = 'Ariya'),          'NLE-3456',  2025, 54.0),
((SELECT id_usuario FROM usuarios WHERE email = 'elena@gmail.com'),            (SELECT id_modelo FROM modelos_vehiculo WHERE nombre_modelo = 'Blazer EV'),      'QRO-2468',  2025, 102.0),
((SELECT id_usuario FROM usuarios WHERE email = 'maria@gmail.com'),            (SELECT id_modelo FROM modelos_vehiculo WHERE nombre_modelo = 'Mustang Mach-E'), 'PUE-1357',  2025, 91.0),
((SELECT id_usuario FROM usuarios WHERE email = 'david@gmail.com'),            (SELECT id_modelo FROM modelos_vehiculo WHERE nombre_modelo = 'bZ4X'),           'BCN-4826',  2025, 85.0),
((SELECT id_usuario FROM usuarios WHERE email = 'lucia@gmail.com'),            (SELECT id_modelo FROM modelos_vehiculo WHERE nombre_modelo = 'ID.4'),           'SLP-9753',  2025, 87.0),
((SELECT id_usuario FROM usuarios WHERE email = 'jonaga@gmail.com'),           (SELECT id_modelo FROM modelos_vehiculo WHERE nombre_modelo = 'e-2008'),         'ZAC-1111',  2024, 60.5),
((SELECT id_usuario FROM usuarios WHERE email = 'juanperez@gmail.com'),        (SELECT id_modelo FROM modelos_vehiculo WHERE nombre_modelo = 'EX30'),           'ZAP-9999',  2025, 69.0);

INSERT INTO suscripciones (id_usuario, id_plan, fecha_inicio, fecha_fin, estado) VALUES
((SELECT id_usuario FROM usuarios WHERE email = 'juanalacubana@gmail.com'),   (SELECT id_plan FROM planes_suscripcion WHERE nombre_plan = 'Plan Plata'),   '2025-04-25', '2025-05-25', 'activa'),
((SELECT id_usuario FROM usuarios WHERE email = 'superman@gmail.com'),         (SELECT id_plan FROM planes_suscripcion WHERE nombre_plan = 'Plan Oro'),     '2025-02-22', '2025-03-24', 'activa'),
((SELECT id_usuario FROM usuarios WHERE email = 'homer@gmail.com'),            (SELECT id_plan FROM planes_suscripcion WHERE nombre_plan = 'Plan Bronce'),  '2025-02-14', '2025-03-16', 'cancelada'),
((SELECT id_usuario FROM usuarios WHERE email = 'jessylavaquerita@gmail.com'), (SELECT id_plan FROM planes_suscripcion WHERE nombre_plan = 'Plan Platino'), '2025-08-05', '2025-09-04', 'activa'),
((SELECT id_usuario FROM usuarios WHERE email = 'elena@gmail.com'),            (SELECT id_plan FROM planes_suscripcion WHERE nombre_plan = 'Plan Eco'),     '2025-05-21', '2025-06-20', 'cancelada'),
((SELECT id_usuario FROM usuarios WHERE email = 'lucia@gmail.com'),            (SELECT id_plan FROM planes_suscripcion WHERE nombre_plan = 'Plan Plata'),   '2025-03-01', NULL,         'activa');

INSERT INTO historial_suscripciones (id_suscripcion, fecha_cambio, descripcion_cambio) VALUES
(1, '2025-04-25 10:00:00', 'Suscripcion activada desde la app'),
(2, '2025-02-22 09:00:00', 'Upgrade de plan solicitado'),
(3, '2025-03-16 12:00:00', 'Cancelacion solicitada por el usuario'),
(4, '2025-08-05 08:00:00', 'Suscripcion activada desde la app'),
(5, '2025-06-20 15:00:00', 'Suscripcion expirada automaticamente'),
(6, '2025-03-01 11:00:00', 'Renovacion automatica procesada con exito');

INSERT INTO sesiones_carga (id_usuario, id_vehiculo, id_puerto, hora_inicio, hora_fin, energia_consumida_kwh, costo_total) VALUES
((SELECT id_usuario FROM usuarios WHERE email = 'juanalacubana@gmail.com'),   (SELECT id_vehiculo FROM vehiculos WHERE placa = 'JAL-1234'),  1, '2026-03-01 08:00:00', '2026-03-01 09:15:00', 38.50, 272.91),
((SELECT id_usuario FROM usuarios WHERE email = 'superman@gmail.com'),         (SELECT id_vehiculo FROM vehiculos WHERE placa = 'MEX-5678'),  4, '2026-03-02 10:30:00', '2026-03-02 12:00:00', 55.20, 390.82),
((SELECT id_usuario FROM usuarios WHERE email = 'homer@gmail.com'),            (SELECT id_vehiculo FROM vehiculos WHERE placa = 'GDL-9012'),  7, '2026-03-05 07:45:00', '2026-03-05 09:30:00', 62.00, 439.14),
((SELECT id_usuario FROM usuarios WHERE email = 'jessylavaquerita@gmail.com'), (SELECT id_vehiculo FROM vehiculos WHERE placa = 'NLE-3456'),  1, '2026-03-08 14:00:00', '2026-03-08 15:20:00', 41.80, 295.95),
((SELECT id_usuario FROM usuarios WHERE email = 'juanalacubana@gmail.com'),   (SELECT id_vehiculo FROM vehiculos WHERE placa = 'JAL-1234'),  4, '2026-04-01 09:00:00', '2026-04-01 10:30:00', 48.60, 376.92),
((SELECT id_usuario FROM usuarios WHERE email = 'superman@gmail.com'),         (SELECT id_vehiculo FROM vehiculos WHERE placa = 'MEX-5678'),  7, '2026-04-10 16:00:00', '2026-04-10 17:45:00', 53.40, 413.86),
((SELECT id_usuario FROM usuarios WHERE email = 'lucia@gmail.com'),            (SELECT id_vehiculo FROM vehiculos WHERE placa = 'SLP-9753'), 10, '2026-04-15 11:00:00', '2026-04-15 12:20:00', 44.10, 341.77),
((SELECT id_usuario FROM usuarios WHERE email = 'jonaga@gmail.com'),           (SELECT id_vehiculo FROM vehiculos WHERE placa = 'ZAC-1111'),  1, '2026-04-20 08:30:00', '2026-04-20 09:45:00', 35.80, 277.50);

INSERT INTO mediciones_energia (id_sesion, fecha_medicion, energia_kwh) VALUES
(1, '2026-03-01 08:30:00', 18.20),
(1, '2026-03-01 09:00:00', 38.50),
(2, '2026-03-02 11:00:00', 27.10),
(2, '2026-03-02 11:45:00', 55.20),
(3, '2026-03-05 08:30:00', 31.00),
(3, '2026-03-05 09:15:00', 62.00),
(4, '2026-03-08 14:40:00', 20.90),
(4, '2026-03-08 15:10:00', 41.80);

INSERT INTO pagos (id_usuario, id_metodo_pago, id_sesion, monto, fecha_pago, estado) VALUES
((SELECT id_usuario FROM usuarios WHERE email = 'juanalacubana@gmail.com'),   1, 1, 272.91, '2026-03-01 09:20:00', 'completado'),
((SELECT id_usuario FROM usuarios WHERE email = 'superman@gmail.com'),         2, 2, 390.82, '2026-03-02 12:10:00', 'completado'),
((SELECT id_usuario FROM usuarios WHERE email = 'homer@gmail.com'),            1, 3, 439.14, '2026-03-05 09:40:00', 'completado'),
((SELECT id_usuario FROM usuarios WHERE email = 'jessylavaquerita@gmail.com'), 3, 4, 295.95, '2026-03-08 15:30:00', 'completado'),
((SELECT id_usuario FROM usuarios WHERE email = 'juanalacubana@gmail.com'),   1, 5, 376.92, '2026-04-01 10:40:00', 'completado'),
((SELECT id_usuario FROM usuarios WHERE email = 'superman@gmail.com'),         2, 6, 413.86, '2026-04-10 18:00:00', 'reembolsado'),
((SELECT id_usuario FROM usuarios WHERE email = 'lucia@gmail.com'),            4, 7, 341.77, '2026-04-15 12:30:00', 'completado'),
((SELECT id_usuario FROM usuarios WHERE email = 'jonaga@gmail.com'),           1, 8, 277.50, '2026-04-20 10:00:00', 'completado');

INSERT INTO transacciones_pago (id_pago, referencia, estado_transaccion, fecha_transaccion) VALUES
(1, 'TXN-001-2026', 'completado',  '2026-03-01 09:21:00'),
(2, 'TXN-002-2026', 'completado',  '2026-03-02 12:11:00'),
(3, 'TXN-003-2026', 'completado',  '2026-03-05 09:41:00'),
(4, 'TXN-004-2026', 'completado',  '2026-03-08 15:31:00'),
(5, 'TXN-005-2026', 'completado',  '2026-04-01 10:41:00'),
(6, 'TXN-006-2026', 'reembolsado', '2026-04-10 18:01:00'),
(7, 'TXN-007-2026', 'completado',  '2026-04-15 12:31:00'),
(8, 'TXN-008-2026', 'completado',  '2026-04-20 10:01:00');

INSERT INTO reembolsos (id_pago, monto, motivo, fecha_reembolso) VALUES
(6, 413.86, 'Falla en el cargador durante la sesion', '2026-04-10 19:00:00');

INSERT INTO tecnicos (nombre_tecnico, telefono, especialidad_tecnico) VALUES
('Carlos Mendoza', '3310001111', 'Cargadores DC'),
('Laura Jimenez',  '3310002222', 'Instalaciones electricas'),
('Pedro Sanchez',  '3310003333', 'Sistemas de control'),
('Ana Torres',     '3310004444', 'Mantenimiento preventivo'),
('Roberto Flores', '3310005555', 'Cargadores AC');

INSERT INTO ordenes_mantenimiento (id_cargador, id_tecnico, fecha_reporte, descripcion_problema, estado) VALUES
(1, 1, '2026-04-01 09:00:00', 'Pantalla tactil sin respuesta',    'completada'),
(3, 2, '2026-04-05 11:00:00', 'Conector CCS2 con desgaste',       'en_proceso'),
(5, 3, '2026-04-10 14:00:00', 'Fallo en comunicacion OCPP',       'pendiente'),
(7, 4, '2026-04-15 08:00:00', 'Ventilador interno ruidoso',       'completada'),
(9, 5, '2026-04-20 10:00:00', 'Error de calibracion de potencia', 'pendiente');

INSERT INTO historial_mantenimiento (id_orden_mantenimiento, fecha_inicio, fecha_fin, acciones_realizadas) VALUES
(1, '2026-04-02 09:00:00', '2026-04-02 12:00:00', 'Reemplazo de pantalla y calibracion del sistema'),
(4, '2026-04-16 08:00:00', '2026-04-16 10:30:00', 'Limpieza y lubricacion del ventilador');

INSERT INTO reportes_operativos (fecha_reporte, total_sesiones, energia_total_consumida, ingresos_totales) VALUES
('2026-03-01', 12, 420.50, 2980.35),
('2026-03-02', 15, 510.20, 3621.52),
('2026-04-01',  8, 280.80, 1990.08),
('2026-04-10', 10, 350.60, 2485.26),
('2026-04-15',  9, 310.40, 2200.84);

INSERT INTO reportes_financieros (fecha_reporte, total_ingresos, total_reembolsos, utilidad) VALUES
('2026-03-01', 2980.35,    0.00, 2980.35),
('2026-03-02', 3621.52,    0.00, 3621.52),
('2026-04-01', 1990.08,    0.00, 1990.08),
('2026-04-10', 2485.26, 413.86, 2071.40),
('2026-04-15', 2200.84,    0.00, 2200.84);