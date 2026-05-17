--  TRIGGER 1: trg_liberar_puerto
--  Cuando una sesion de carga termina (hora_fin se actualiza),
--  el puerto vuelve automaticamente a estado 'libre'


CREATE OR REPLACE FUNCTION fn_liberar_puerto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.hora_fin IS NOT NULL AND OLD.hora_fin IS NULL THEN
        UPDATE puertos_carga
        SET estado = 'libre'
        WHERE id_puerto = NEW.id_puerto;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_liberar_puerto
AFTER UPDATE ON sesiones_carga
FOR EACH ROW
EXECUTE FUNCTION fn_liberar_puerto();


--  TRIGGER 2: trg_estado_cargador
--  Cuando todos los puertos de un cargador estan ocupados,
--  el cargador pasa a 'en uso'. Cuando al menos uno queda
--  libre, vuelve a 'activo'.


CREATE OR REPLACE FUNCTION fn_estado_cargador()
RETURNS TRIGGER AS $$
DECLARE
    v_libres INT;
    v_total  INT;
BEGIN
    SELECT
        COUNT(*) FILTER (WHERE estado = 'libre'),
        COUNT(*)
    INTO v_libres, v_total
    FROM puertos_carga
    WHERE id_cargador = COALESCE(NEW.id_cargador, OLD.id_cargador);

    IF v_libres = 0 THEN
        UPDATE cargadores
        SET estado = 'en uso'
        WHERE id_cargador = COALESCE(NEW.id_cargador, OLD.id_cargador)
          AND estado = 'activo';
    ELSE
        UPDATE cargadores
        SET estado = 'activo'
        WHERE id_cargador = COALESCE(NEW.id_cargador, OLD.id_cargador)
          AND estado = 'en uso';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_estado_cargador
AFTER INSERT OR UPDATE OR DELETE ON puertos_carga
FOR EACH ROW
EXECUTE FUNCTION fn_estado_cargador();


--  TRIGGER 3: trg_historial_cargador
--  Cada vez que el estado de un cargador cambia, registra
--  automaticamente el cambio en historial_estado_cargador
--  y cierra el registro anterior con fecha_fin


CREATE OR REPLACE FUNCTION fn_historial_cargador()
RETURNS TRIGGER AS $$
DECLARE
    v_id_estado INT;
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    UPDATE historial_estado_cargador
    SET fecha_fin = NOW()
    WHERE id_cargador = NEW.id_cargador
      AND fecha_fin IS NULL;

    SELECT id_estado_cargador INTO v_id_estado
    FROM estados_cargador
    WHERE nombre_estado = NEW.estado
    LIMIT 1;

    IF v_id_estado IS NOT NULL THEN
        INSERT INTO historial_estado_cargador
            (id_cargador, id_estado_cargador, fecha_inicio, descripcion_cambio)
        VALUES
            (NEW.id_cargador, v_id_estado, NOW(),
             'Cambio automatico de ' || OLD.estado || ' a ' || NEW.estado);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_historial_cargador
AFTER UPDATE OF estado ON cargadores
FOR EACH ROW
EXECUTE FUNCTION fn_historial_cargador();


--  TRIGGER 4: trg_reporte_operativo
--  Al finalizar una sesion de carga, suma automaticamente
--  los valores al reporte operativo del dia correspondiente.
--  Si no existe el reporte del dia, lo crea.


CREATE OR REPLACE FUNCTION fn_reporte_operativo()
RETURNS TRIGGER AS $$
DECLARE
    v_fecha  DATE;
    v_energia DECIMAL(10,2);
    v_costo   DECIMAL(10,2);
BEGIN
    IF NEW.hora_fin IS NULL OR OLD.hora_fin IS NOT NULL THEN
        RETURN NEW;
    END IF;

    v_fecha   := NEW.hora_inicio::DATE;
    v_energia := COALESCE(NEW.energia_consumida_kwh, 0);
    v_costo   := COALESCE(NEW.costo_total, 0);

    INSERT INTO reportes_operativos
        (fecha_reporte, total_sesiones, energia_total_consumida, ingresos_totales)
    VALUES
        (v_fecha, 1, v_energia, v_costo)
    ON CONFLICT (fecha_reporte) DO UPDATE
        SET total_sesiones          = reportes_operativos.total_sesiones + 1,
            energia_total_consumida = reportes_operativos.energia_total_consumida + v_energia,
            ingresos_totales        = reportes_operativos.ingresos_totales + v_costo;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reporte_operativo
AFTER UPDATE ON sesiones_carga
FOR EACH ROW
EXECUTE FUNCTION fn_reporte_operativo();


--  TRIGGER 5: trg_reporte_financiero
--  Al registrar un pago completado, actualiza el reporte
--  financiero del dia. Si hay un reembolso, lo descuenta.
--  Si no existe el reporte del dia, lo crea.


CREATE OR REPLACE FUNCTION fn_reporte_financiero()
RETURNS TRIGGER AS $$
DECLARE
    v_fecha DATE;
BEGIN
    v_fecha := COALESCE(NEW.fecha_pago, NOW())::DATE;

    IF TG_OP = 'INSERT' AND NEW.estado = 'completado' THEN
        INSERT INTO reportes_financieros
            (fecha_reporte, total_ingresos, total_reembolsos, utilidad)
        VALUES
            (v_fecha, NEW.monto, 0, NEW.monto)
        ON CONFLICT (fecha_reporte) DO UPDATE
            SET total_ingresos = reportes_financieros.total_ingresos + NEW.monto,
                utilidad       = reportes_financieros.total_ingresos + NEW.monto
                               - reportes_financieros.total_reembolsos;
    END IF;

    IF TG_OP = 'UPDATE'
        AND NEW.estado = 'reembolsado'
        AND OLD.estado != 'reembolsado' THEN

        INSERT INTO reportes_financieros
            (fecha_reporte, total_ingresos, total_reembolsos, utilidad)
        VALUES
            (v_fecha, 0, NEW.monto, -NEW.monto)
        ON CONFLICT (fecha_reporte) DO UPDATE
            SET total_reembolsos = reportes_financieros.total_reembolsos + NEW.monto,
                utilidad         = reportes_financieros.total_ingresos
                               - (reportes_financieros.total_reembolsos + NEW.monto);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reporte_financiero
AFTER INSERT OR UPDATE ON pagos
FOR EACH ROW
EXECUTE FUNCTION fn_reporte_financiero();


--  TRIGGER 6 (BONUS): trg_subtotal_factura
--  Al insertar un detalle de factura, calcula el subtotal
--  automaticamente como cantidad * precio_unitario


CREATE OR REPLACE FUNCTION fn_subtotal_factura()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subtotal := NEW.cantidad * NEW.precio_unitario;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subtotal_factura
BEFORE INSERT OR UPDATE ON detalles_factura
FOR EACH ROW
EXECUTE FUNCTION fn_subtotal_factura();


--  TRIGGER 7 (BONUS): trg_historial_suscripcion
--  Al cambiar el estado de una suscripcion, registra
--  automaticamente el cambio en historial_suscripciones


CREATE OR REPLACE FUNCTION fn_historial_suscripcion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    INSERT INTO historial_suscripciones
        (id_suscripcion, fecha_cambio, descripcion_cambio)
    VALUES
        (NEW.id_suscripcion, NOW(),
         'Estado cambiado de ' || OLD.estado || ' a ' || NEW.estado);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_historial_suscripcion
AFTER UPDATE OF estado ON suscripciones
FOR EACH ROW
EXECUTE FUNCTION fn_historial_suscripcion();


--  VERIFICACION - ejecuta esto para confirmar que los
--  triggers se crearon correctamente


SELECT
    trigger_name                          AS trigger,
    event_object_table                    AS tabla,
    event_manipulation                    AS evento,
    action_timing                         AS momento
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;