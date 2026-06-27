-- AGM UCAPS · Funciones y triggers de avance automático

-- ─── Helpers de rol ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT rol FROM public.profiles WHERE id = auth.uid() AND activo = true),
    'anon'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_rol() = 'super_admin';
$$;

CREATE OR REPLACE FUNCTION public.can_edit_avance()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_rol() IN ('super_admin', 'admin', 'editor');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_proyectos()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_rol() IN ('super_admin', 'admin');
$$;

-- ─── Recalcular avance de un ítem desde registros mensuales ─────────────────
CREATE OR REPLACE FUNCTION public.recalcular_item_avance(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total       numeric(18,4);
  v_ejecutada   numeric(18,4);
  v_unitario    numeric(18,2);
  v_avance      numeric(8,4);
  v_valor_ej    numeric(18,2);
BEGIN
  SELECT cantidad_total, valor_unitario
  INTO v_total, v_unitario
  FROM public.proyecto_items
  WHERE id = p_item_id AND NOT anulado;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(cantidad_mes), 0)
  INTO v_ejecutada
  FROM public.item_avance_mensual
  WHERE proyecto_item_id = p_item_id;

  -- No permitir superar cantidad total
  v_ejecutada := LEAST(v_ejecutada, v_total);

  IF v_total > 0 THEN
    v_avance := ROUND((v_ejecutada / v_total) * 100, 4);
  ELSE
    v_avance := 0;
  END IF;

  v_valor_ej := ROUND(v_ejecutada * v_unitario, 2);

  UPDATE public.proyecto_items
  SET
    cantidad_ejecutada = v_ejecutada,
    avance_pct         = v_avance,
    valor_ejecutado    = v_valor_ej,
    completado         = (v_total > 0 AND v_ejecutada >= v_total),
    updated_at         = now()
  WHERE id = p_item_id;
END;
$$;

-- ─── Recalcular avance del proyecto (ponderado por valor) ───────────────────
CREATE OR REPLACE FUNCTION public.recalcular_proyecto_avance(p_proyecto_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sum_valor_total   numeric(18,2);
  v_sum_valor_ej      numeric(18,2);
  v_avance            numeric(8,4);
  v_estado_sugerido   uuid;
  v_auto              boolean;
BEGIN
  SELECT avance_calculado_auto INTO v_auto
  FROM public.proyectos WHERE id = p_proyecto_id;

  IF NOT FOUND OR v_auto IS NOT TRUE THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(valor_total), 0),
    COALESCE(SUM(valor_ejecutado), 0)
  INTO v_sum_valor_total, v_sum_valor_ej
  FROM public.proyecto_items
  WHERE proyecto_id = p_proyecto_id AND NOT anulado;

  IF v_sum_valor_total > 0 THEN
    v_avance := ROUND((v_sum_valor_ej / v_sum_valor_total) * 100, 4);
  ELSE
    SELECT
      CASE WHEN COUNT(*) FILTER (WHERE NOT anulado) = 0 THEN 0
           ELSE ROUND(
             AVG(avance_pct) FILTER (WHERE NOT anulado), 4
           )
      END
    INTO v_avance
    FROM public.proyecto_items
    WHERE proyecto_id = p_proyecto_id;
  END IF;

  -- Sugerir estado según avance
  IF v_avance >= 100 THEN
    SELECT id INTO v_estado_sugerido FROM public.estados_proyecto
    WHERE codigo = 'FINALIZADO' LIMIT 1;
  ELSIF v_avance > 0 THEN
    SELECT id INTO v_estado_sugerido FROM public.estados_proyecto
    WHERE codigo = 'EJECUCION' LIMIT 1;
  ELSE
    SELECT id INTO v_estado_sugerido FROM public.estados_proyecto
    WHERE codigo = 'NO_INICIADO' LIMIT 1;
  END IF;

  UPDATE public.proyectos
  SET
    avance_fisico_pct = COALESCE(v_avance, 0),
    estado_id         = COALESCE(v_estado_sugerido, estado_id),
    updated_at        = now()
  WHERE id = p_proyecto_id;
END;
$$;

-- ─── Actualizar acumulados en item_avance_mensual al insertar/editar ─────────
CREATE OR REPLACE FUNCTION public.sync_item_avance_mensual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total         numeric(18,4);
  v_prev_acum     numeric(18,4);
  v_nuevo_acum    numeric(18,4);
  v_unitario      numeric(18,2);
  v_proyecto_id   uuid;
BEGIN
  SELECT pi.cantidad_total, pi.valor_unitario, pi.proyecto_id
  INTO v_total, v_unitario, v_proyecto_id
  FROM public.proyecto_items pi
  WHERE pi.id = NEW.proyecto_item_id;

  -- Acumulado previo (otros meses, excluyendo registro actual en UPDATE)
  SELECT COALESCE(SUM(cantidad_mes), 0)
  INTO v_prev_acum
  FROM public.item_avance_mensual
  WHERE proyecto_item_id = NEW.proyecto_item_id
    AND id IS DISTINCT FROM NEW.id;

  v_nuevo_acum := LEAST(v_prev_acum + NEW.cantidad_mes, v_total);

  NEW.cantidad_acumulada  := v_nuevo_acum;
  NEW.valor_ejecutado_mes := ROUND(NEW.cantidad_mes * v_unitario, 2);

  IF v_total > 0 THEN
    NEW.avance_pct := ROUND((v_nuevo_acum / v_total) * 100, 4);
  ELSE
    NEW.avance_pct := 0;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_item_avance_mensual
  BEFORE INSERT OR UPDATE OF cantidad_mes ON public.item_avance_mensual
  FOR EACH ROW EXECUTE FUNCTION public.sync_item_avance_mensual();

-- ─── Propagar recálculo al guardar avance mensual ───────────────────────────
CREATE OR REPLACE FUNCTION public.after_item_avance_mensual_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id     uuid;
  v_proyecto_id uuid;
BEGIN
  v_item_id := COALESCE(NEW.proyecto_item_id, OLD.proyecto_item_id);

  SELECT proyecto_id INTO v_proyecto_id
  FROM public.proyecto_items WHERE id = v_item_id;

  PERFORM public.recalcular_item_avance(v_item_id);

  IF v_proyecto_id IS NOT NULL THEN
    PERFORM public.recalcular_proyecto_avance(v_proyecto_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_after_item_avance_insert
  AFTER INSERT ON public.item_avance_mensual
  FOR EACH ROW EXECUTE FUNCTION public.after_item_avance_mensual_change();

CREATE TRIGGER trg_after_item_avance_update
  AFTER UPDATE OF cantidad_mes ON public.item_avance_mensual
  FOR EACH ROW EXECUTE FUNCTION public.after_item_avance_mensual_change();

CREATE TRIGGER trg_after_item_avance_delete
  AFTER DELETE ON public.item_avance_mensual
  FOR EACH ROW EXECUTE FUNCTION public.after_item_avance_mensual_change();

-- ─── Recalcular proyecto al cambiar ítems ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.after_proyecto_item_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proyecto_id uuid;
BEGIN
  v_proyecto_id := COALESCE(NEW.proyecto_id, OLD.proyecto_id);
  PERFORM public.recalcular_proyecto_avance(v_proyecto_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_after_proyecto_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.proyecto_items
  FOR EACH ROW EXECUTE FUNCTION public.after_proyecto_item_change();

-- ─── Re-sincronizar acumulados de todos los meses de un ítem (consistencia) ──
CREATE OR REPLACE FUNCTION public.resync_acumulados_item(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r             RECORD;
  v_acum        numeric(18,4) := 0;
  v_total       numeric(18,4);
  v_unitario    numeric(18,2);
BEGIN
  SELECT cantidad_total, valor_unitario INTO v_total, v_unitario
  FROM public.proyecto_items WHERE id = p_item_id;

  FOR r IN
    SELECT iam.id, iam.cantidad_mes, rm.anio, rm.mes
    FROM public.item_avance_mensual iam
    JOIN public.reportes_mensuales rm ON rm.id = iam.reporte_mensual_id
    WHERE iam.proyecto_item_id = p_item_id
    ORDER BY rm.anio, rm.mes
  LOOP
    v_acum := LEAST(v_acum + r.cantidad_mes, v_total);

    UPDATE public.item_avance_mensual
    SET
      cantidad_acumulada  = v_acum,
      avance_pct          = CASE WHEN v_total > 0 THEN ROUND((v_acum / v_total) * 100, 4) ELSE 0 END,
      valor_ejecutado_mes = ROUND(r.cantidad_mes * v_unitario, 2)
    WHERE id = r.id;
  END LOOP;

  PERFORM public.recalcular_item_avance(p_item_id);
END;
$$;

-- ─── RPC: registrar avance del mes (uso desde la app) ───────────────────────
CREATE OR REPLACE FUNCTION public.registrar_avance_mes(
  p_proyecto_item_id uuid,
  p_reporte_mensual_id uuid,
  p_cantidad_mes numeric,
  p_observaciones text DEFAULT NULL
)
RETURNS public.item_avance_mensual
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.item_avance_mensual;
BEGIN
  IF NOT public.can_edit_avance() THEN
    RAISE EXCEPTION 'Sin permiso para registrar avance';
  END IF;

  INSERT INTO public.item_avance_mensual (
    proyecto_item_id, reporte_mensual_id, cantidad_mes, observaciones, registrado_por
  ) VALUES (
    p_proyecto_item_id, p_reporte_mensual_id, p_cantidad_mes, p_observaciones, auth.uid()
  )
  ON CONFLICT (proyecto_item_id, reporte_mensual_id)
  DO UPDATE SET
    cantidad_mes   = EXCLUDED.cantidad_mes,
    observaciones  = EXCLUDED.observaciones,
    registrado_por = auth.uid(),
    updated_at     = now()
  RETURNING * INTO v_result;

  PERFORM public.resync_acumulados_item(p_proyecto_item_id);

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_avance_mes TO authenticated;
