## Desplegar en Vercel (con GitHub)

### 1. Variables de entorno en Vercel

En **Vercel → Project → Settings → Environment Variables**, agrega:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vpffaevhifagojiqojxe.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu **anon key** (Dashboard → Settings → API) |

Marca **Production**, **Preview** y **Development**.

### 2. Variables en GitHub (opcional, para Actions)

**Settings → Secrets and variables → Actions → New repository secret**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Conectar repo a Vercel

1. [vercel.com/new](https://vercel.com/new) → Importar repo `agm-ucaps`
2. Framework: **Next.js** (auto-detectado)
3. Agregar las variables de entorno
4. **Deploy**

### 4. Supabase Auth — URL de producción

En **Supabase → Authentication → URL Configuration**:

- **Site URL**: `https://tu-dominio.vercel.app`
- **Redirect URLs**: `https://tu-dominio.vercel.app/**`
