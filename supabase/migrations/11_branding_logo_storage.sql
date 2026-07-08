-- AGM UCAPS · Branding (logo) via Supabase Storage

-- ─── Tabla Branding (config simple) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.branding (
  id smallint PRIMARY KEY CHECK (id = 1),
  logo_object_path text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.branding (id, logo_object_path)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branding_select ON public.branding;
CREATE POLICY branding_select ON public.branding
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS branding_write ON public.branding;
CREATE POLICY branding_write ON public.branding
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_proyectos());

DROP POLICY IF EXISTS branding_update ON public.branding;
CREATE POLICY branding_update ON public.branding
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_proyectos())
  WITH CHECK (public.can_manage_proyectos());

-- ─── Bucket Storage para el logo ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branding_objects_select ON storage.objects;
CREATE POLICY branding_objects_select ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'branding');

DROP POLICY IF EXISTS branding_objects_insert ON storage.objects;
CREATE POLICY branding_objects_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'branding'
    AND public.can_manage_proyectos()
  );

DROP POLICY IF EXISTS branding_objects_update ON storage.objects;
CREATE POLICY branding_objects_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'branding'
  )
  WITH CHECK (
    bucket_id = 'branding'
    AND public.can_manage_proyectos()
  );

DROP POLICY IF EXISTS branding_objects_delete ON storage.objects;
CREATE POLICY branding_objects_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'branding'
    AND public.can_manage_proyectos()
  );

