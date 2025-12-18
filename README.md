# Sistema de Control de Canastillos

Sistema de gestión de canastillos entre almacenes desarrollado con Next.js 14, TypeScript, Tailwind CSS, Drizzle ORM y PostgreSQL (Neon).

## Características

- **Gestión de Usuarios y Almacenes**: Simulación de usuarios asignados a almacenes específicos
- **Registro de Salidas**: Envío de canastillos de un almacén a otro
- **Aprobación de Recepciones**: Confirmación o rechazo de canastillos entrantes
- **Búsqueda y Historial**: Consulta de canastillos con su historial completo de movimientos
- **Inventario**: Visualización del inventario actual de cada almacén con estadísticas

## Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Estilos**: Tailwind CSS 4
- **Base de Datos**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Validación**: TypeScript con tipos estrictos

## Estructura del Proyecto

```
control-canastillos/
├── app/
│   ├── api/                    # API Routes
│   │   ├── almacenes/          # CRUD de almacenes
│   │   ├── canastillos/        # CRUD de canastillos
│   │   │   └── [codigo]/historial/  # Historial por código
│   │   ├── movimientos/        # Gestión de movimientos
│   │   │   └── [id]/           # Aprobar/rechazar
│   │   └── users/              # CRUD de usuarios
│   ├── buscar/                 # Búsqueda de canastillos
│   ├── inventario/             # Inventario por almacén
│   ├── recepciones/            # Aprobación de recepciones
│   ├── salida/                 # Registro de salidas
│   ├── layout.tsx              # Layout principal
│   └── page.tsx                # Página de inicio
├── components/
│   ├── navigation.tsx          # Barra de navegación
│   └── user-selector.tsx       # Selector de usuario
├── db/
│   ├── index.ts                # Configuración de Drizzle
│   └── schema.ts               # Esquema de base de datos
├── lib/
│   └── auth.ts                 # Helpers de autenticación
└── drizzle.config.ts           # Configuración de Drizzle Kit
```

## Esquema de Base de Datos

### Tablas Principales

1. **almacenes**
   - id, nombre, ubicacion, descripcion, created_at

2. **users**
   - id, nombre, email, password, almacen_id, rol, created_at
   - Preparado para autenticación futura

3. **canastillos**
   - id, codigo (único), estado, almacen_actual_id, descripcion, created_at, updated_at
   - Estados: disponible, en_transito, aprobado, dañado

4. **movimientos**
   - id, canastillo_id, almacen_origen_id, almacen_destino_id
   - usuario_solicitante_id, usuario_aprobador_id
   - estado, observaciones, fecha_solicitud, fecha_aprobacion, created_at
   - Estados: pendiente, aprobado, rechazado

## Instalación

### 1. Clonar el repositorio

```bash
cd control-canastillos
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` basado en `.env.local.example`:

```bash
cp .env.local.example .env.local
```

Edita `.env.local` y agrega tu conexión a Neon PostgreSQL:

```env
DATABASE_URL=postgresql://usuario:password@ep-ejemplo.us-east-2.aws.neon.tech/dbname?sslmode=require
```

### 4. Configurar la base de datos

#### Opción A: Push directo (desarrollo)

```bash
npm run db:push
```

#### Opción B: Generar y aplicar migraciones (producción)

```bash
npm run db:generate
npm run db:migrate
```

### 5. Poblar datos iniciales (opcional)

Puedes usar Drizzle Studio para agregar datos iniciales:

```bash
npm run db:studio
```

O crear un script de seed con datos de ejemplo:
- Almacenes: "Almacén Central", "Almacén Norte", "Almacén Sur"
- Usuarios asignados a cada almacén
- Canastillos con códigos como: CAN-001, CAN-002, etc.

### 6. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Uso del Sistema

### 1. Seleccionar Usuario

Al abrir la aplicación, usa el selector de usuario en la parte superior para simular qué usuario y almacén estás usando.

### 2. Registrar Salida de Canastillos

- Ve a "Registrar Salida"
- Selecciona el almacén de destino
- Ingresa los códigos de canastillos (uno por línea o separados por comas)
- Agrega observaciones opcionales
- Los canastillos cambiarán a estado "En Tránsito"

### 3. Aprobar Recepciones

- Ve a "Aprobar Recepciones"
- Verás las solicitudes pendientes para tu almacén
- Puedes aprobar o rechazar cada movimiento
- Al aprobar, el canastillo cambiará de almacén y estado a "Aprobado"

### 4. Buscar Canastillo

- Ve a "Buscar Canastillo"
- Ingresa el código del canastillo
- Verás toda su información y su historial completo de movimientos

### 5. Ver Inventario

- Ve a "Inventario"
- Selecciona un almacén
- Verás estadísticas y listado completo de canastillos
- Puedes filtrar por estado

## API Routes

### Almacenes

- `GET /api/almacenes` - Listar todos los almacenes
- `POST /api/almacenes` - Crear nuevo almacén

### Usuarios

- `GET /api/users` - Listar todos los usuarios con sus almacenes
- `POST /api/users` - Crear nuevo usuario

### Canastillos

- `GET /api/canastillos` - Listar canastillos (filtrable por almacenId o codigo)
- `POST /api/canastillos` - Crear nuevo canastillo
- `GET /api/canastillos/[codigo]/historial` - Obtener historial de un canastillo

### Movimientos

- `GET /api/movimientos?almacenDestinoId=X` - Obtener movimientos pendientes
- `POST /api/movimientos` - Crear nueva solicitud de movimiento
- `POST /api/movimientos/[id]/aprobar` - Aprobar un movimiento
- `POST /api/movimientos/[id]/rechazar` - Rechazar un movimiento

## Scripts Disponibles

```bash
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Construir para producción
npm start            # Iniciar servidor de producción
npm run lint         # Ejecutar linter

# Scripts de base de datos
npm run db:generate  # Generar migraciones
npm run db:migrate   # Aplicar migraciones
npm run db:push      # Push directo del esquema (desarrollo)
npm run db:studio    # Abrir Drizzle Studio
```

## Roadmap / Mejoras Futuras

- [ ] Implementar autenticación real (NextAuth.js)
- [ ] Agregar roles y permisos
- [ ] Exportar reportes a Excel/PDF
- [ ] Dashboard con gráficos y métricas
- [ ] Notificaciones en tiempo real
- [ ] Aplicación móvil
- [ ] Escaneo de códigos QR/barras
- [ ] API REST pública con autenticación
- [ ] Tests unitarios y de integración

## Contribución

Este proyecto fue creado con fines educativos. Si deseas contribuir:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## Soporte

Para preguntas o problemas, por favor abre un issue en el repositorio.

---

Desarrollado con Next.js 14 y Drizzle ORM
