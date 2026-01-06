# Guía de Despliegue en Vercel

## Variables de Entorno Requeridas

Para que la aplicación funcione correctamente en Vercel, debes configurar las siguientes variables de entorno en: **Settings → Environment Variables**

### 1. DATABASE_URL
```
postgresql://neondb_owner:npg_kvJW2NRgKwl6@ep-solitary-cherry-add629aj-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 2. GEMINI_API_KEY
```
AIzaSyBvQXEVvRuQ4kowGFIBmrt-yILIrSKmJ7U
```

### 3. NEXTAUTH_SECRET
```
UwZHnSzRSkFXKs1qWlOsg79rjUDlv/aumzuPcTI4hH4=
```

### 4. NEXTAUTH_URL
**IMPORTANTE:** Usa la URL de tu deployment en Vercel, NO localhost.

Ejemplo:
```
https://control-canastillos-m3w8.vercel.app
```

O si tienes un dominio personalizado:
```
https://tu-dominio.com
```

## Pasos para Configurar

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en **Settings**
3. Click en **Environment Variables** (sidebar izquierdo)
4. Agrega cada variable con su valor correspondiente
5. Selecciona los entornos: **Production**, **Preview**, **Development**
6. Click **Save**

## Redeploy

Después de agregar las variables de entorno:

1. Ve a **Deployments**
2. Click en los 3 puntos (...) del último deployment
3. Click en **Redeploy**
4. Selecciona **"Use existing Build Cache"** o **"Clear build cache and redeploy"** (recomendado si hay problemas)

## Verificación

Una vez desplegado, verifica que:

- ✅ La página de inicio redirige automáticamente a `/login`
- ✅ Puedes iniciar sesión con credenciales válidas
- ✅ El dashboard carga correctamente después del login
- ✅ Las operaciones de base de datos funcionan

## Solución de Problemas

### Error: "Application error"
- **Causa**: Falta `NEXTAUTH_URL` o tiene valor incorrecto
- **Solución**: Verifica que `NEXTAUTH_URL` sea la URL de producción de Vercel

### Error: Build failed
- **Causa**: Variables de entorno faltantes
- **Solución**: Asegúrate de que todas las 4 variables estén configuradas

### Error: Cannot connect to database
- **Causa**: `DATABASE_URL` incorrecta
- **Solución**: Verifica que la URL de conexión a Neon sea correcta

## Usuarios de Prueba

La base de datos ya tiene usuarios creados. Puedes usar:
- Email/Nombre del usuario configurado
- Contraseña del usuario

## Soporte

Si encuentras problemas, revisa:
1. Los logs de Vercel (Runtime Logs)
2. La consola del navegador (F12)
3. Las variables de entorno configuradas
