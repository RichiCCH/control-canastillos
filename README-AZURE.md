# Guía de Despliegue en Azure (Modo Standalone)

Ya tenemos la aplicación configurada con el modo más óptimo para Next.js en la nube: el **modo `standalone`**. Este modo construye el sistema eliminando toda la grasa de `.node_modules`, generando una salida súper ligera ideal para contenedores.

## ¿Qué incluí?
1. **`next.config.ts`**: Editado con `output: 'standalone'`
2. **`web.config`**: Un archivo que le enseña a Azure App Service *(Windows)* a leer Next.js usando `iisnode` sin fallar en routing.
3. **`.github/workflows/azure.yml`**: Una automatización lista para usarse si tienes el código subido en GitHub. Compila, hace zip y despliega instantáneamente las carpetas necesarias a tu "Web App" de Azure.

---

## ☁️ Pasos para configurar en el "Azure Portal"

### 1. Crear el App Service
- Recomiendo elegir el sistema operativo **Linux** con **Node 20 LTS** porque suele ser más barato y ejecutar JavaScript mucho mejor.
- Puedes usar Windows también sin problemas (ya tienes el `web.config` que lo arregla).

### 2. Variables de Entorno (IMPORTANTE)
Antes de desplegar, debes ir a la barra izquierda de tu App Service ➤ **Configuración** ➤ **Variables de entorno** y crear estas (las mismas del `.env.local`):

- `DATABASE_URL`: tu conexión de Supabase / Neon / Postgres (Asegúrate de desactivar IPv6 o usar el Transaction pooler si aplica)
- `NEXTAUTH_URL`: la URL pública (ejemplo: `https://mi-canastillo-app.azurewebsites.net`)
- `NEXTAUTH_SECRET`: tu cadena super secreta aleatoria

Adicionalmente, si estás usando **Linux**, crea esta variable para que Azure sepa qué archivo arrancar:
- **`STARTUP_COMMAND`** : `node server.js`

*(No uses `npm start` ya que en el modo Standalone el arranque directo es más rápido)*

### 3. Método de Despliegue

#### Opción A: Usar GitHub Actions (Recomendado)
Es lo que configuré en `.github/workflows/azure.yml`.
1. Anda al Azure Portal ➤ Información general ➤ **Descargar perfil de publicación** (Descarga un archivo chiquito XML o texto).
2. Ve a tu repositorio de GitHub ➤ Settings ➤ Secrets and variables ➤ Actions.
3. Añade un **New repository secret**:
   - Nombre: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Valor: *Pega todo el texto largo del archivo descargado del perfil de publicación.*
4. En el archivo `azure.yml` asegúrate de que el env `AZURE_WEBAPP_NAME` es igual al nombre real de tu Azure app (`control-canastillos` o `comprasrolonapp2`, etc.).
5. Empujar a la rama `main` disparará el Action y lo desplegará.

#### Opción B: Opción desde VSCode
1. Instala la extensión **Azure App Service** y inicia sesión.
2. Abre la terminal (`Ctrl` + `~`)
3. Haz la construcción manual del standalone:
   ```bash
   npm run build
   cp -r public .next/standalone/
   cp -r .next/static .next/standalone/.next/
   ```
4. Haz clic derecho sobre la carpeta **`.next/standalone`** y presiona **Deploy to Web App...**. Elige tu aplicación.

---

¡Disfruta tu despliegue rápido!
