-- AGM UCAPS · Row Level Security

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_medida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubros_presupuesto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_ucaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes_mensuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_avance_mensual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_rubros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_balance_ucaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_snapshot_mensual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importaciones ENABLE ROW LEVEL SECURITY;

-- ─── PROFILES ────────────────────────────────────────────────────────────────
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_super_admin()
  );

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND rol = (SELECT rol FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY profiles_super_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ─── CATÁLOGOS: lectura todos, escritura solo super_admin ────────────────────
CREATE POLICY catalogos_select ON public.zonas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogos_super_admin ON public.zonas
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY municipios_select ON public.municipios FOR SELECT TO authenticated USING (true);
CREATE POLICY municipios_super_admin ON public.municipios
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY estados_select ON public.estados_proyecto FOR SELECT TO authenticated USING (true);
CREATE POLICY estados_super_admin ON public.estados_proyecto
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY unidades_select ON public.unidades_medida FOR SELECT TO authenticated USING (true);
CREATE POLICY unidades_super_admin ON public.unidades_medida
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY cat_item_select ON public.categorias_item FOR SELECT TO authenticated USING (true);
CREATE POLICY cat_item_super_admin ON public.categorias_item
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY actividades_select ON public.actividades_catalogo FOR SELECT TO authenticated USING (true);
CREATE POLICY actividades_super_admin ON public.actividades_catalogo
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY rubros_select ON public.rubros_presupuesto FOR SELECT TO authenticated USING (true);
CREATE POLICY rubros_super_admin ON public.rubros_presupuesto
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY cat_ucaps_select ON public.categorias_ucaps FOR SELECT TO authenticated USING (true);
CREATE POLICY cat_ucaps_super_admin ON public.categorias_ucaps
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ─── PROYECTOS ───────────────────────────────────────────────────────────────
CREATE POLICY proyectos_select ON public.proyectos
  FOR SELECT TO authenticated
  USING (public.get_user_rol() IN ('super_admin', 'admin', 'editor', 'viewer'));

CREATE POLICY proyectos_insert ON public.proyectos
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_proyectos());

CREATE POLICY proyectos_update ON public.proyectos
  FOR UPDATE TO authenticated
  USING (public.can_manage_proyectos())
  WITH CHECK (public.can_manage_proyectos());

CREATE POLICY proyectos_delete ON public.proyectos
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ─── ÍTEMS DE PROYECTO ───────────────────────────────────────────────────────
CREATE POLICY items_select ON public.proyecto_items
  FOR SELECT TO authenticated
  USING (public.get_user_rol() IN ('super_admin', 'admin', 'editor', 'viewer'));

CREATE POLICY items_insert ON public.proyecto_items
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_proyectos());

CREATE POLICY items_update ON public.proyecto_items
  FOR UPDATE TO authenticated
  USING (public.can_manage_proyectos())
  WITH CHECK (public.can_manage_proyectos());

CREATE POLICY items_delete ON public.proyecto_items
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ─── AVANCE MENSUAL ──────────────────────────────────────────────────────────
CREATE POLICY avance_select ON public.item_avance_mensual
  FOR SELECT TO authenticated
  USING (public.get_user_rol() IN ('super_admin', 'admin', 'editor', 'viewer'));

CREATE POLICY avance_insert ON public.item_avance_mensual
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_avance());

CREATE POLICY avance_update ON public.item_avance_mensual
  FOR UPDATE TO authenticated
  USING (public.can_edit_avance())
  WITH CHECK (public.can_edit_avance());

CREATE POLICY avance_delete ON public.item_avance_mensual
  FOR DELETE TO authenticated
  USING (public.can_manage_proyectos());

-- ─── REPORTES MENSUALES ──────────────────────────────────────────────────────
CREATE POLICY reportes_select ON public.reportes_mensuales
  FOR SELECT TO authenticated
  USING (public.get_user_rol() IN ('super_admin', 'admin', 'editor', 'viewer'));

CREATE POLICY reportes_manage ON public.reportes_mensuales
  FOR ALL TO authenticated
  USING (public.can_manage_proyectos())
  WITH CHECK (public.can_manage_proyectos());

-- ─── RUBROS / BALANCE / SNAPSHOTS / IMPORTS ──────────────────────────────────
CREATE POLICY rubros_proy_select ON public.proyecto_rubros
  FOR SELECT TO authenticated USING (true);
CREATE POLICY rubros_proy_manage ON public.proyecto_rubros
  FOR ALL TO authenticated
  USING (public.can_manage_proyectos()) WITH CHECK (public.can_manage_proyectos());

CREATE POLICY balance_select ON public.proyecto_balance_ucaps
  FOR SELECT TO authenticated USING (true);
CREATE POLICY balance_manage ON public.proyecto_balance_ucaps
  FOR ALL TO authenticated
  USING (public.can_manage_proyectos()) WITH CHECK (public.can_manage_proyectos());

CREATE POLICY snapshot_select ON public.proyecto_snapshot_mensual
  FOR SELECT TO authenticated USING (true);
CREATE POLICY snapshot_manage ON public.proyecto_snapshot_mensual
  FOR ALL TO authenticated
  USING (public.can_manage_proyectos()) WITH CHECK (public.can_manage_proyectos());

CREATE POLICY import_select ON public.importaciones
  FOR SELECT TO authenticated
  USING (public.get_user_rol() IN ('super_admin', 'admin'));
CREATE POLICY import_insert ON public.importaciones
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_proyectos());
