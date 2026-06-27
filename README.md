# AGM UCAPS · Dashboard de Proyectos

Base de datos Supabase para el control de proyectos UCAPS con:

- Catálogos maestros (zonas, municipios, actividades, estados)
- Proyectos con ítems añadidos 1 a 1
- Avance mensual por cantidad instalada (recalcula % automático)
- Roles: `super_admin`, `admin`, `editor`, `viewer`
- Realtime en `proyectos`, `proyecto_items`, `item_avance_mensual`

## Estructura

```
supabase/
  migrations/          ← SQL en orden (ejecutar todos)
  seed.sql             ← Catálogos iniciales
  scripts/
    create_super_admin.sql
```

## Proyecto en Supabase Cloud

| Campo | Valor |
|---|---|
| **Nombre** | `agm-ucaps` |
| **Project ref** | `vpffaevhifagojiqojxe` |
| **URL** | https://vpffaevhifagojiqojxe.supabase.co |
| **Región** | `sa-east-1` (São Paulo) |

> Se creó un proyecto **nuevo** para no mezclar con `NominaCO-Pro` (ya tenía tablas `profiles`, `work_days`, etc.).

### Estado del despliegue

- 5 migraciones aplicadas
- Seed cargado: 5 zonas, 17 municipios, 29 actividades, 5 estados, reporte Julio 2026
- RLS activo en todas las tablas
- Vistas: `v_dashboard_proyectos`, `v_kpi_dashboard`, `v_proyecto_items_detalle`
- Función RPC: `registrar_avance_mes`

### Pendiente (manual en Dashboard)

1. **Authentication → Users → Add user** (tu correo)
2. Ejecutar `scripts/create_super_admin.sql` con el UUID del usuario
3. **Authentication → Providers** → desactivar registro público
4. **Database → Replication** → confirmar Realtime en `proyectos`, `proyecto_items`, `item_avance_mensual`
5. Copiar keys en `.env.local` desde **Settings → API**


**Opción A — SQL Editor (rápido):**

En **SQL Editor**, ejecuta en este orden:

1. `migrations/01_extensions_and_catalogos.sql`
2. `migrations/02_profiles_and_proyectos.sql`
3. `migrations/03_functions_triggers.sql`
4. `migrations/04_views_realtime.sql`
5. `migrations/05_rls_policies.sql`
6. `seed.sql`

**Opción B — Supabase CLI:**

```bash
npm install -g supabase
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase db push
psql $DATABASE_URL -f supabase/seed.sql
```

### 3. Habilitar Realtime

Dashboard → **Database** → **Replication** → activar:

- `proyectos`
- `proyecto_items`
- `item_avance_mensual`

### 4. Configurar Auth

Dashboard → **Authentication** → **Providers**:

- Email: **Enabled**
- Desactiva **Enable sign ups** (solo super admin crea usuarios)

### 5. Crear super admin

1. **Authentication** → **Users** → **Add user** (email + password)
2. Copia el UUID del usuario
3. Ejecuta `scripts/create_super_admin.sql` reemplazando el UUID

### 6. Variables de entorno (para frontend Next.js)

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # solo servidor, nunca en cliente
```

## Flujo de uso

### Super admin crea proyecto e ítems

```sql
-- 1. Crear proyecto
INSERT INTO proyectos (municipio_id, nombre_corto, nombre_completo, valor_ucaps, estado_id)
SELECT m.id, 'Magangué', 'Proyecto Alumbrado Magangué 2025', 3207261648, e.id
FROM municipios m, estados_proyecto e
WHERE m.nombre = 'Magangué' AND e.codigo = 'EJECUCION';

-- 2. Añadir ítem (200 luminarias)
INSERT INTO proyecto_items (proyecto_id, actividad_id, unidad_id, cantidad_total, valor_unitario, numero_item)
SELECT p.id, ac.id, um.id, 200, 977037.92, 1
FROM proyectos p
JOIN actividades_catalogo ac ON ac.nombre = 'Luminaria LED 27W'
JOIN unidades_medida um ON um.codigo = 'UND'
WHERE p.nombre_corto = 'Magangué';
```

### Editor registra avance del mes (100 instaladas)

```sql
SELECT public.registrar_avance_mes(
  p_item_id,           -- uuid del proyecto_item
  p_reporte_id,        -- uuid reporte Julio 2026
  100,                 -- cantidad instalada ESTE mes
  'Avance julio'       -- observación opcional
);
```

**Automáticamente se actualiza:**

- `cantidad_ejecutada` del ítem → 100
- `avance_pct` del ítem → 50%
- `avance_fisico_pct` del proyecto → recalculado ponderado
- `estado_id` del proyecto → sugerido (Ejecución / Finalizado)

### Desde JavaScript (Supabase client)

```typescript
const { data, error } = await supabase.rpc('registrar_avance_mes', {
  p_proyecto_item_id: itemId,
  p_reporte_mensual_id: reporteId,
  p_cantidad_mes: 100,
  p_observaciones: 'Avance julio',
});
```

### Realtime (dashboard en vivo)

```typescript
supabase
  .channel('dashboard')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'proyectos' }, () => {
    refetchDashboard();
  })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'proyecto_items' }, () => {
    refetchItems();
  })
  .subscribe();
```

## Vistas para el dashboard

| Vista | Uso |
|---|---|
| `v_dashboard_proyectos` | Tabla principal del dashboard |
| `v_proyecto_items_detalle` | Detalle ítems con avance |
| `v_kpi_dashboard` | KPIs agregados (totales, conteos por estado) |

```sql
SELECT * FROM v_kpi_dashboard;
SELECT * FROM v_dashboard_proyectos ORDER BY zona, municipio;
```

## Permisos por rol

| Acción | super_admin | admin | editor | viewer |
|---|---|---|---|---|
| Catálogos (CRUD) | ✅ | ❌ | ❌ | ❌ |
| Usuarios | ✅ | ❌ | ❌ | ❌ |
| Crear proyectos/ítems | ✅ | ✅ | ❌ | ❌ |
| Registrar avance mensual | ✅ | ✅ | ✅ | ❌ |
| Ver dashboard | ✅ | ✅ | ✅ | ✅ |

## Próximo paso

Frontend Next.js con diseño `dashboard_agm_v4.html` conectado a estas tablas y vistas.
