-- AGM UCAPS · Permisos RLS alineados con roles de la aplicación

CREATE OR REPLACE FUNCTION public.can_edit_proyecto_content()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_rol() IN ('super_admin', 'admin', 'editor');
$$;

-- Admin y super_admin gestionan usuarios (sin eliminar cuentas)
CREATE OR REPLACE FUNCTION public.can_manage_usuarios()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_rol() IN ('super_admin', 'admin');
$$;

-- ─── PROFILES ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.can_manage_usuarios()
  );

DROP POLICY IF EXISTS profiles_super_admin_all ON public.profiles;
CREATE POLICY profiles_manage ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_usuarios());

CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.can_manage_usuarios() OR id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    OR public.is_super_admin()
    OR (
      public.get_user_rol() = 'admin'
      AND (
        rol IN ('viewer', 'editor')
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = profiles.id
            AND p.rol = rol
            AND p.rol NOT IN ('viewer', 'editor')
        )
      )
    )
  );

CREATE POLICY profiles_super_admin_delete ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ─── PROYECTOS ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS proyectos_update ON public.proyectos;
CREATE POLICY proyectos_update ON public.proyectos
  FOR UPDATE TO authenticated
  USING (public.can_edit_proyecto_content())
  WITH CHECK (public.can_edit_proyecto_content());

-- ─── ÍTEMS ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS items_insert ON public.proyecto_items;
CREATE POLICY items_insert ON public.proyecto_items
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_proyecto_content());

DROP POLICY IF EXISTS items_update ON public.proyecto_items;
CREATE POLICY items_update ON public.proyecto_items
  FOR UPDATE TO authenticated
  USING (public.can_edit_proyecto_content())
  WITH CHECK (public.can_edit_proyecto_content());

DROP POLICY IF EXISTS items_delete ON public.proyecto_items;
CREATE POLICY items_delete ON public.proyecto_items
  FOR DELETE TO authenticated
  USING (public.can_manage_proyectos());
