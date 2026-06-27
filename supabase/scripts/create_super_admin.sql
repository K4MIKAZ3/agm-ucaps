-- Crear el primer SUPER ADMIN después de registrar el usuario en Supabase Auth
--
-- PASOS:
-- 1. Supabase Dashboard → Authentication → Users → Add user
--    Email: tu-correo@agm.com  /  Password: (segura)
-- 2. Copia el UUID del usuario creado
-- 3. Reemplaza 'UUID-DEL-USUARIO' abajo y ejecuta en SQL Editor

INSERT INTO public.profiles (id, email, nombre, rol, activo)
VALUES (
  'UUID-DEL-USUARIO'::uuid,
  'tu-correo@agm.com',
  'Super Admin AGM',
  'super_admin',
  true
)
ON CONFLICT (id) DO UPDATE SET
  rol = 'super_admin',
  activo = true;

-- Verificar:
-- SELECT id, email, rol FROM public.profiles WHERE rol = 'super_admin';
