-- AGM UCAPS · Allow admin to permanently delete projects
--
-- Currently, deletion policies for:
-- - public.proyectos (parent)
-- - public.proyecto_items (dependent)
-- are restricted to super_admin only.
--
-- If an admin user can't delete projects permanentemente, relax the policies to
-- allow admin + super_admin (can_manage_proyectos()).

-- PROYECTOS
DROP POLICY IF EXISTS proyectos_delete ON public.proyectos;
CREATE POLICY proyectos_delete ON public.proyectos
  FOR DELETE TO authenticated
  USING (public.can_manage_proyectos());

-- ITEMS (dependent rows needed for cascaded deletes)
DROP POLICY IF EXISTS items_delete ON public.proyecto_items;
CREATE POLICY items_delete ON public.proyecto_items
  FOR DELETE TO authenticated
  USING (public.can_manage_proyectos());

