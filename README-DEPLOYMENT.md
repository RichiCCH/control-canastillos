# 🚀 Guía Completa de Despliegue en Vercel

## ✅ Estado del Proyecto

- ✅ Código completamente funcional y testeado
- ✅ Build local exitoso sin errores
- ✅ TypeScript sin errores
- ✅ Todas las funcionalidades implementadas
- ✅ Base de datos PostgreSQL en Neon configurada

---

## 📦 Funcionalidades Implementadas

1. **Sistema de Autenticación** con NextAuth v5
2. **Control de Inventario** multi-almacén
3. **Gestión de Movimientos** (entrada/salida)
4. **Sistema de Aprobaciones** (4 estados: pendiente, aprobado, rechazado, anulado)
5. **Sistema de Notificaciones** en tiempo real
6. **Exportación a Excel** del historial de movimientos
7. **Dashboard** con estadísticas
8. **Gestión de Usuarios** con roles (admin, supervisor, operador)

---

## 🔧 Pasos para Desplegar en Vercel

### PASO 1: Eliminar Proyecto Anterior (si existe)

1. Ve a https://vercel.com/dashboard
2. Si existe un proyecto "control-canastillos":
   - Click en el proyecto
   - Settings → General
   - Scroll hasta abajo
   - Click en "Delete Project"
   - Confirma la eliminación

### PASO 2: Importar Proyecto Nuevo

1. Ve a https://vercel.com/new
2. Click en "Import Git Repository"
3. Busca `RichiCCH/control-canastillos` (o el nombre de tu repo)
4. Click en "Import"

### PASO 3: Configurar Variables de Entorno ⚠️ CRÍTICO

**ANTES de hacer Deploy**, haz click en "Environment Variables" y agrega:

#### Variable 1
```
Name: DATABASE_URL
Value: postgresql://neondb_owner:npg_kvJW2NRgKwl6@ep-solitary-cherry-add629aj-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
Environments: ✓ Production ✓ Preview ✓ Development
```

#### Variable 2
```
Name: GEMINI_API_KEY
Value: AIzaSyBvQXEVvRuQ4kowGFIBmrt-yILIrSKmJ7U
Environments: ✓ Production ✓ Preview ✓ Development
```

#### Variable 3
```
Name: NEXTAUTH_SECRET
Value: UwZHnSzRSkFXKs1qWlOsg79rjUDlv/aumzuPcTI4hH4=
Environments: ✓ Production ✓ Preview ✓ Development
```

#### Variable 4 - ⚠️ LA MÁS IMPORTANTE
```
Name: NEXTAUTH_URL
Value: [ESPERA - Configúrala DESPUÉS del primer deploy]
Environments: ✓ Production ✓ Preview ✓ Development
```

**NOTA**: Para NEXTAUTH_URL, primero despliega sin ella, copia la URL que te da Vercel (ej: `https://control-canastillos-xyz.vercel.app`), luego agrégala y haz redeploy.

### PASO 4: Deploy

1. Después de agregar las primeras 3 variables, click en "Deploy"
2. Espera a que el deployment termine
3. **Copia la URL que te da Vercel** (ejemplo: `https://control-canastillos-xyz.vercel.app`)

### PASO 5: Agregar NEXTAUTH_URL y Redeploy

1. Ve a Settings → Environment Variables
2. Agrega la variable:
   ```
   Name: NEXTAUTH_URL
   Value: https://TU-URL-EXACTA.vercel.app
   ```
3. Marca los 3 environments (Production, Preview, Development)
4. Click en "Save"
5. Ve a Deployments
6. Click en los 3 puntos (...) del último deployment
7. Click en "Redeploy"
8. Selecciona "Clear build cache and redeploy"
9. Click en "Redeploy"

---

## ✅ Verificación Post-Deployment

Después del redeploy final, verifica:

1. ✅ La URL abre sin errores
2. ✅ Te redirige automáticamente a `/login`
3. ✅ Puedes iniciar sesión con:
   - Usuario/Email de la base de datos
   - Contraseña correspondiente
4. ✅ El dashboard carga correctamente
5. ✅ Las funcionalidades funcionan (movimientos, aprobaciones, etc.)

---

## 🔑 Credenciales de Prueba

Los usuarios están en la base de datos Neon. Puedes:
- Conectarte a la BD para ver usuarios existentes
- Crear nuevos usuarios desde el panel de admin

---

## 📝 Estructura del Proyecto

```
control-canastillos/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── login/             # Página de login
│   ├── inventario/        # Gestión de inventario
│   ├── salida/            # Registro de salidas
│   ├── recepciones/       # Aprobación de entradas
│   ├── historial/         # Historial con exportación Excel
│   ├── mis-movimientos/   # Movimientos del usuario
│   └── admin/             # Panel administrativo
├── components/            # Componentes React
├── lib/                   # Utilidades y configuración
│   ├── auth-config.ts    # NextAuth configuración
│   ├── auth.ts           # Helpers de autenticación
│   └── permissions.ts    # Sistema de permisos
├── db/                    # Drizzle ORM
│   └── schema.ts         # Esquema de base de datos
└── public/               # Archivos estáticos
```

---

## 🐛 Solución de Problemas

### Error: "Application error"
**Causa**: Falta `NEXTAUTH_URL` o tiene valor incorrecto
**Solución**: Verifica que NEXTAUTH_URL sea la URL de Vercel, NO localhost

### Error: "404: NOT_FOUND"
**Causa**: Deployment no completado o proyecto eliminado
**Solución**: Re-importa el proyecto siguiendo PASO 2

### Error: "Cannot connect to database"
**Causa**: DATABASE_URL incorrecta
**Solución**: Verifica que DATABASE_URL esté bien copiada

### Build Failed
**Causa**: Variables de entorno faltantes
**Solución**: Verifica que las 4 variables estén configuradas

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Vercel (Deployments → [deployment] → Runtime Logs)
2. Verifica la consola del navegador (F12)
3. Confirma que las 4 variables de entorno están configuradas

---

## 🎉 Funcionalidades Listas para Usar

- ✅ Login con email/nombre y contraseña
- ✅ Dashboard personalizado por rol
- ✅ Registro de salidas de productos
- ✅ Aprobación/rechazo de movimientos
- ✅ Historial completo con filtros
- ✅ Exportación a Excel
- ✅ Notificaciones en tiempo real
- ✅ Gestión de usuarios (admin)
- ✅ Control de permisos por rol
- ✅ Sistema de 4 estados (pendiente, aprobado, rechazado, anulado)

---

**Última actualización**: 2026-01-05
**Versión**: 1.0.0
**Framework**: Next.js 16 + React 19
**Base de datos**: PostgreSQL (Neon)
**Autenticación**: NextAuth v5
