# Guía Completa: Configurar Google OAuth

## Paso 1: Crear Proyecto en Google Cloud

1. Ve a: https://console.cloud.google.com/
2. Click en el selector de proyectos (arriba a la izquierda)
3. Click en "NUEVO PROYECTO"
4. Nombre del proyecto: "Control Inventario"
5. Click en "CREAR"
6. Espera unos segundos y selecciona el nuevo proyecto

## Paso 2: Configurar Pantalla de Consentimiento OAuth

1. En el menú lateral, ve a: **APIs y servicios > Pantalla de consentimiento de OAuth**
2. Selecciona: **Externo** (External)
3. Click en "CREAR"

### Configuración de la Pantalla:

**Información de la aplicación:**
- Nombre de la app: Control de Inventario
- Correo de asistencia al usuario: TU_EMAIL_AQUI@gmail.com
- Logo de la app: (opcional, puedes dejarlo vacío)

**Información de contacto del desarrollador:**
- Direcciones de correo electrónico: TU_EMAIL_AQUI@gmail.com

4. Click en "GUARDAR Y CONTINUAR"
5. En "Permisos", click en "GUARDAR Y CONTINUAR" (sin cambios)
6. En "Usuarios de prueba", click en "AGREGAR USUARIOS" y agrega tu email
7. Click en "GUARDAR Y CONTINUAR"
8. Revisa el resumen y click en "VOLVER AL PANEL"

## Paso 3: Crear Credenciales OAuth 2.0

1. En el menú lateral, ve a: **APIs y servicios > Credenciales**
2. Click en "+ CREAR CREDENCIALES"
3. Selecciona: "ID de cliente de OAuth 2.0"

### Configuración del Cliente:

**Tipo de aplicación:** Aplicación web

**Nombre:** Control Inventario Web Client

**Orígenes de JavaScript autorizados:**
- Agregar URI: http://localhost:3000

**URIs de redireccionamiento autorizados:**
- Agregar URI: http://localhost:3000/api/auth/callback/google

4. Click en "CREAR"

## Paso 4: Copiar las Credenciales

Después de crear, verás una ventana emergente con:
- **ID de cliente:** algo como `123456789-abc123def456.apps.googleusercontent.com`
- **Secreto del cliente:** algo como `GOCSPX-xyz123abc456...`

¡COPIA ESTOS VALORES! Los necesitarás en el siguiente paso.

## Paso 5: Actualizar .env.local

Abre el archivo .env.local y reemplaza:

```
GOOGLE_CLIENT_ID=TU_GOOGLE_CLIENT_ID_AQUI
GOOGLE_CLIENT_SECRET=TU_GOOGLE_CLIENT_SECRET_AQUI
```

Con tus valores reales (sin comillas).

## Paso 6: Reiniciar el Servidor

En la terminal:
1. Presiona Ctrl+C para detener el servidor
2. Ejecuta: npm run dev
3. Abre: http://localhost:3000/login

¡Listo! Ahora podrás iniciar sesión con Google.

## Solución de Problemas

### Error: redirect_uri_mismatch
- Verifica que la URI de redireccionamiento sea exactamente:
  http://localhost:3000/api/auth/callback/google
- Sin espacios al inicio o final
- Sin / al final

### Error: invalid_client
- Verifica que copiaste correctamente el ID y el secreto
- Asegúrate de que no haya espacios extras en .env.local

### Error: access_denied
- Verifica que agregaste tu email como usuario de prueba
- En Google Cloud Console > Pantalla de consentimiento > Usuarios de prueba

