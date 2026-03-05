# Manual Técnico - Sistema de Control de Inventario

## Documentación para Desarrolladores

---

## Tabla de Contenidos

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Base de Datos](#base-de-datos)
5. [Autenticación y Autorización](#autenticación-y-autorización)
6. [API Endpoints](#api-endpoints)
7. [Componentes Frontend](#componentes-frontend)
8. [Utilidades y Librerías](#utilidades-y-librerías)
9. [Despliegue](#despliegue)
10. [Desarrollo Local](#desarrollo-local)
11. [Testing](#testing)
12. [Mejores Prácticas](#mejores-prácticas)

---

## Arquitectura del Sistema

### Overview

El sistema utiliza una arquitectura **monolítica** basada en Next.js con App Router, combinando frontend y backend en una sola aplicación:

```
┌─────────────────────────────────────────────┐
│           Next.js Application               │
│  ┌───────────────────────────────────────┐  │
│  │         Frontend (React)              │  │
│  │  - Pages (App Router)                 │  │
│  │  - Components                         │  │
│  │  - Client State Management            │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │      API Routes (Backend)             │  │
│  │  - REST Endpoints                     │  │
│  │  - Business Logic                     │  │
│  │  - Data Validation                    │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │     Database Layer (Drizzle ORM)      │  │
│  │  - Type-safe queries                  │  │
│  │  - Migrations                         │  │
│  │  - Schema validation                  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    ↓
         ┌──────────────────────┐
         │  PostgreSQL (Neon)   │
         │  - Serverless DB     │
         │  - Auto-scaling      │
         └──────────────────────┘
```

### Características Arquitectónicas

- **Monorepo:** Todo en un proyecto Next.js
- **Server-Side Rendering (SSR):** Páginas pre-renderizadas en servidor
- **API Routes:** Backend REST integrado en Next.js
- **Static Generation:** Páginas estáticas cuando es posible
- **Client-Side Navigation:** SPA-like routing con Next.js Link
- **JWT Auth:** Sesiones basadas en tokens JSON Web Token

---

## Stack Tecnológico

### Core

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Next.js** | 15.2.8 | Framework React full-stack |
| **React** | 18.3.1 | Librería UI |
| **TypeScript** | 5.x | Tipado estático |
| **Node.js** | 20.x+ | Runtime JavaScript |

### Base de Datos

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **PostgreSQL** | 15+ | Base de datos relacional |
| **Neon** | Latest | Proveedor serverless PostgreSQL |
| **Drizzle ORM** | 0.45.1 | ORM type-safe |
| **Drizzle Kit** | 0.31.8 | Herramienta de migraciones |

### Autenticación

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **NextAuth** | 5.0.0-beta.30 | Sistema de autenticación |
| **@auth/core** | 0.41.0 | Core de NextAuth |
| **bcryptjs** | 3.0.3 | Hashing de contraseñas |

### Styling

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Tailwind CSS** | 4.x | Framework CSS utility-first |
| **@tailwindcss/postcss** | 4.x | PostCSS plugin |

### Librerías de Utilidad

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **jsPDF** | 3.0.4 | Generación de PDFs |
| **XLSX** | 0.18.5 | Exportación a Excel |
| **dotenv** | 17.2.3 | Gestión de variables de entorno |

### DevDependencies

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **ESLint** | 9.x | Linting de código |
| **tsx** | 4.21.0 | Ejecución de scripts TypeScript |

---

## Estructura del Proyecto

### Árbol de Directorios

```
control-canastillos/
│
├── app/                              # Next.js App Router
│   ├── api/                          # API Routes (Backend)
│   │   ├── admin/                    # Endpoints de administración
│   │   │   ├── ajustes/
│   │   │   │   └── route.ts          # GET, POST ajustes
│   │   │   ├── almacenes/
│   │   │   │   ├── route.ts          # GET, POST almacenes
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # PATCH, DELETE almacén
│   │   │   ├── inventario-almacen/
│   │   │   │   └── route.ts          # GET inventario completo
│   │   │   ├── productos/
│   │   │   │   ├── route.ts          # GET, POST productos
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # PATCH, DELETE producto
│   │   │   └── users/
│   │   │       ├── route.ts          # GET, POST usuarios
│   │   │       └── [id]/
│   │   │           └── route.ts      # PUT, DELETE usuario
│   │   ├── almacenes/
│   │   │   └── route.ts              # GET almacenes activos
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts          # NextAuth handler
│   │   ├── historial/
│   │   │   └── route.ts              # GET historial movimientos
│   │   ├── inventario/
│   │   │   └── route.ts              # GET inventario por almacén
│   │   ├── mis-movimientos/
│   │   │   └── route.ts              # GET movimientos del usuario
│   │   ├── movimientos/
│   │   │   ├── route.ts              # GET, POST, PUT, DELETE movimientos
│   │   │   └── [id]/
│   │   │       ├── anular/
│   │   │       │   └── route.ts      # POST anular movimiento
│   │   │       ├── aprobar/
│   │   │       │   └── route.ts      # POST aprobar movimiento
│   │   │       ├── rechazar/
│   │   │       │   └── route.ts      # POST rechazar movimiento
│   │   │       └── reenviar/
│   │   │           └── route.ts      # POST reenviar movimiento
│   │   ├── notificaciones/
│   │   │   ├── route.ts              # GET, PATCH notificaciones
│   │   │   └── [id]/
│   │   │       └── route.ts          # PATCH notificación individual
│   │   ├── productos/
│   │   │   └── route.ts              # GET productos activos
│   │   ├── stats/
│   │   │   └── route.ts              # GET estadísticas dashboard
│   │   └── users/
│   │       └── route.ts              # GET usuario actual
│   │
│   ├── admin/                        # Páginas de administración
│   │   ├── ajustes/
│   │   │   └── page.tsx              # Gestión de ajustes
│   │   ├── almacenes/
│   │   │   └── page.tsx              # CRUD almacenes
│   │   ├── productos/
│   │   │   └── page.tsx              # CRUD productos
│   │   └── usuarios/
│   │       └── page.tsx              # CRUD usuarios
│   │
│   ├── historial/
│   │   └── page.tsx                  # Vista de historial
│   ├── inventario/
│   │   └── page.tsx                  # Consulta de inventario
│   ├── login/
│   │   └── page.tsx                  # Página de login
│   ├── mis-movimientos/
│   │   └── page.tsx                  # Movimientos propios
│   ├── recepciones/
│   │   └── page.tsx                  # Aprobar recepciones
│   ├── salida/
│   │   └── page.tsx                  # Registrar salidas
│   │
│   ├── layout.tsx                    # Layout raíz con footer
│   ├── page.tsx                      # Dashboard principal
│   └── globals.css                   # Estilos globales
│
├── components/                       # Componentes React
│   ├── navigation.tsx                # Barra de navegación
│   ├── notifications-bell.tsx        # Campana de notificaciones
│   ├── protected-route.tsx           # HOC para rutas protegidas
│   └── providers.tsx                 # Providers (SessionProvider)
│
├── db/                               # Database Layer
│   ├── index.ts                      # Configuración de conexión DB
│   └── schema.ts                     # Schema Drizzle (tablas)
│
├── lib/                              # Utilidades y librerías
│   ├── auth-config.ts                # Configuración NextAuth
│   ├── auth.ts                       # Utilidades de autenticación
│   ├── notifications.ts              # Sistema de notificaciones
│   ├── permissions.ts                # Sistema de permisos RBAC
│   └── utils/
│       └── pdf.ts                    # Generación de PDFs
│
├── public/                           # Assets estáticos
│   ├── logo.png                      # Logo de la empresa
│   └── favicon.ico                   # Icono del navegador
│
├── scripts/                          # Scripts de DB
│   ├── reset-canastillos.ts          # Resetear tabla canastillos
│   ├── reset-completo.ts             # Reset completo de BD
│   └── seed.ts                       # Poblar BD con datos demo
│
├── drizzle/                          # Migraciones (generadas)
│   └── migrations/
│
├── .env.local                        # Variables de entorno (local)
├── .gitignore                        # Git ignore
├── drizzle.config.ts                 # Configuración Drizzle Kit
├── eslint.config.mjs                 # Configuración ESLint
├── next.config.mjs                   # Configuración Next.js
├── package.json                      # Dependencias
├── package-lock.json                 # Lock de dependencias
├── postcss.config.mjs                # Configuración PostCSS
├── tailwind.config.ts                # Configuración Tailwind
├── tsconfig.json                     # Configuración TypeScript
├── vercel.json                       # Configuración Vercel
├── MANUAL_USUARIO.md                 # Manual de usuario
├── MANUAL_TECNICO.md                 # Este documento
└── README.md                         # Readme del proyecto
```

---

## Base de Datos

### Schema Drizzle

El schema está definido en `db/schema.ts` usando Drizzle ORM.

#### Tablas Principales

**1. almacenes (Warehouses)**

```typescript
export const almacenes = pgTable('almacenes', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull().unique(),
  ubicacion: varchar('ubicacion', { length: 255 }),
  descripcion: text('descripcion'),
  activo: integer('activo').default(1).notNull(), // 1=activo, 0=inactivo
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**2. users**

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  almacenId: integer('almacen_id').references(() => almacenes.id, { onDelete: 'set null' }),
  rol: varchar('rol', { length: 50 }).notNull().default('operador'), // admin, supervisor, operador
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

**2b. usuarios_almacenes (User-Warehouse Mapping)**

Tabla pivote que permite que un usuario esté asignado a múltiples almacenes.

```typescript
export const usuariosAlmacenes = pgTable('usuarios_almacenes', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  almacenId: integer('almacen_id').references(() => almacenes.id, { onDelete: 'cascade' }).notNull(),
  esPrincipal: integer('es_principal').default(0).notNull(), // 1 = almacén principal
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```
```

**3. productos (Products)**

```typescript
export const productos = pgTable('productos', {
  id: serial('id').primaryKey(),
  codigo: varchar('codigo', { length: 50 }).notNull().unique(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  tipo: varchar('tipo', { length: 50 }).notNull(), // canastillo_negro, canastillo_color, cooler, caja
  descripcion: text('descripcion'),
  unidadMedida: varchar('unidad_medida', { length: 50 }).default('Unidad'),
  precioBase: integer('precio_base'),
  stockMinimo: integer('stock_minimo').default(0),
  activo: integer('activo').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**4. inventario (Stock Levels)**

```typescript
export const inventario = pgTable('inventario', {
  id: serial('id').primaryKey(),
  productoId: integer('producto_id').references(() => productos.id, { onDelete: 'cascade' }).notNull(),
  almacenId: integer('almacen_id').references(() => almacenes.id, { onDelete: 'cascade' }).notNull(),
  cantidad: integer('cantidad').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**5. movimientos (Movement Headers)**

```typescript
export const movimientos = pgTable('movimientos', {
  id: serial('id').primaryKey(),
  tipoMovimiento: varchar('tipo_movimiento', { length: 20 }).notNull().default('salida'), // salida, entrada, baja
  almacenOrigenId: integer('almacen_origen_id').references(() => almacenes.id, { onDelete: 'set null' }),
  almacenDestinoId: integer('almacen_destino_id').references(() => almacenes.id, { onDelete: 'set null' }),
  usuarioSolicitanteId: integer('usuario_solicitante_id').references(() => users.id, { onDelete: 'set null' }),
  usuarioAprobadorId: integer('usuario_aprobador_id').references(() => users.id, { onDelete: 'set null' }),
  estado: varchar('estado', { length: 20 }).notNull().default('pendiente'), // pendiente, aprobado, rechazado, anulado
  motivo: varchar('motivo', { length: 255 }),
  proveedorResponsable: varchar('proveedor_responsable', { length: 255 }),
  observaciones: text('observaciones'),
  transportadoPor: varchar('transportado_por', { length: 255 }),
  fechaSolicitud: timestamp('fecha_solicitud').defaultNow().notNull(),
  fechaAprobacion: timestamp('fecha_aprobacion'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**6. movimientos_detalle (Movement Line Items)**

```typescript
export const movimientosDetalle = pgTable('movimientos_detalle', {
  id: serial('id').primaryKey(),
  movimientoId: integer('movimiento_id').references(() => movimientos.id, { onDelete: 'cascade' }).notNull(),
  productoId: integer('producto_id').references(() => productos.id, { onDelete: 'cascade' }).notNull(),
  cantidad: integer('cantidad').notNull(),
  precioUnitario: integer('precio_unitario'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**7. notificaciones (Notifications)**

```typescript
export const notificaciones = pgTable('notificaciones', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  movimientoId: integer('movimiento_id').references(() => movimientos.id, { onDelete: 'cascade' }),
  tipo: varchar('tipo', { length: 50 }).notNull(), // nuevo_movimiento, movimiento_aprobado, movimiento_rechazado
  titulo: varchar('titulo', { length: 255 }).notNull(),
  mensaje: text('mensaje').notNull(),
  leida: integer('leida').default(0).notNull(), // 0=no leída, 1=leída
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Relaciones

```
users ──┬── (1:N) movimientos (usuarioSolicitanteId)
        ├── (1:N) movimientos (usuarioAprobadorId)
        ├── (1:N) notificaciones
        └── (N:1) almacenes

almacenes ──┬── (1:N) users
            ├── (1:N) inventario
            ├── (1:N) movimientos (almacenOrigenId)
            └── (1:N) movimientos (almacenDestinoId)

productos ──┬── (1:N) inventario
            └── (1:N) movimientosDetalle

movimientos ──┬── (1:N) movimientosDetalle
              └── (1:N) notificaciones

inventario ──┬── (N:1) productos
             └── (N:1) almacenes
```

### Migraciones

**Generar migración:**

```bash
npm run db:generate
```

Genera un archivo SQL en `drizzle/migrations/` basado en cambios del schema.

**Aplicar migración:**

```bash
npm run db:push
```

Aplica las migraciones pendientes a la base de datos.

**Drizzle Studio:**

```bash
npm run db:studio
```

Abre una interfaz web para explorar la base de datos.

### Scripts de Base de Datos

**Seed (Poblar con datos demo):**

```bash
npm run db:seed
```

Ejecuta `scripts/seed.ts` que crea:
- 3 almacenes demo
- 1 usuario admin
- Productos de ejemplo
- Inventario inicial

**Reset (Limpiar tablas):**

```bash
npm run db:reset-completo
```

Elimina TODOS los datos de todas las tablas.

---

## Autenticación y Autorización

### NextAuth 5 Configuration

**Archivo:** `lib/auth-config.ts`

```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });

        if (!user || user.password !== credentials.password) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.nombre,
          email: user.email,
          rol: user.rol,
          almacenId: user.almacenId,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.rol = user.rol;
        token.almacenId = user.almacenId;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.id;
      session.user.rol = token.rol;
      session.user.almacenId = token.almacenId;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
});
```

### Sistema de Permisos RBAC

**Archivo:** `lib/permissions.ts`

**Definición de Roles:**

```typescript
export type Role = 'admin' | 'supervisor' | 'operador';
```

**Definición de Permisos:**

```typescript
export type Permission =
  | 'admin.users.view'
  | 'admin.users.create'
  | 'admin.users.edit'
  | 'admin.users.delete'
  | 'admin.almacenes.view'
  | 'admin.almacenes.create'
  | 'admin.almacenes.edit'
  | 'admin.almacenes.delete'
  | 'admin.productos.view'
  | 'admin.productos.create'
  | 'admin.productos.edit'
  | 'admin.productos.delete'
  | 'admin.ajustes.view'
  | 'admin.ajustes.create'
  | 'movimientos.create'
  | 'movimientos.approve'
  | 'movimientos.reject'
  | 'movimientos.edit'
  | 'movimientos.delete'
  | 'movimientos.view_all'
  | 'inventario.view'
  | 'inventario.view_all'
  | 'historial.view'
  | 'historial.view_all';
```

**Matriz de Permisos:**

```typescript
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'admin.users.view',
    'admin.users.create',
    'admin.users.edit',
    'admin.users.delete',
    'admin.almacenes.view',
    'admin.almacenes.create',
    'admin.almacenes.edit',
    'admin.almacenes.delete',
    'admin.productos.view',
    'admin.productos.create',
    'admin.productos.edit',
    'admin.productos.delete',
    'admin.ajustes.view',
    'admin.ajustes.create',
    'movimientos.create',
    'movimientos.approve',
    'movimientos.reject',
    'movimientos.edit',
    'movimientos.delete',
    'movimientos.view_all',
    'inventario.view',
    'inventario.view_all',
    'historial.view',
    'historial.view_all',
  ],
  supervisor: [
    'movimientos.create',
    'movimientos.approve',
    'movimientos.reject',
    'movimientos.view_all',
    'inventario.view',
    'inventario.view_all',
    'historial.view',
    'historial.view_all',
  ],
  operador: [
    'movimientos.create',
    'movimientos.approve',
    'movimientos.reject',
    'inventario.view',
    'historial.view',
  ],
};
```

**Funciones de Verificación:**

```typescript
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}
```

### Protección de API Routes

**Ejemplo de uso en API:**

```typescript
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'admin.users.view');

    // Lógica del endpoint

  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    if (error.message === 'FORBIDDEN') {
      return forbiddenResponse('No tienes permisos para ver usuarios');
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
```

### Protección de Páginas Frontend

**Ejemplo con ProtectedRoute:**

```typescript
import ProtectedRoute from '@/components/protected-route';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredPermission="admin.users.view">
      <div>Contenido protegido</div>
    </ProtectedRoute>
  );
}
```

---

## API Endpoints

### Convenciones

- **Base URL:** `/api/`
- **Autenticación:** Todas las rutas (excepto `/api/auth`) requieren sesión válida
- **Content-Type:** `application/json`
- **Respuestas de Error:**
  ```json
  {
    "error": "Mensaje descriptivo del error"
  }
  ```

### Endpoints de Administración

#### Usuarios

**GET `/api/admin/users`**
- **Permiso:** `admin.users.view`
- **Respuesta:**
  ```json
  [
    {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "rol": "operador",
      "almacenId": 1,
      "almacenNombre": "Almacén Central",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
  ```

**POST `/api/admin/users`**
- **Permiso:** `admin.users.create`
- **Body:**
  ```json
  {
    "nombre": "María López",
    "email": "maria@example.com",
    "password": "password123",
    "rol": "operador",
    "almacenId": 2
  }
  ```
- **Respuesta:** 201 Created

**PUT `/api/admin/users/[id]`**
- **Permiso:** `admin.users.edit`
- **Body:** (campos opcionales)
  ```json
  {
    "nombre": "María López Updated",
    "email": "maria.nueva@example.com",
    "password": "newpassword",
    "rol": "supervisor",
    "almacenId": 3
  }
  ```

**DELETE `/api/admin/users/[id]`**
- **Permiso:** `admin.users.delete`
- **Respuesta:** 200 OK

#### Almacenes

**GET `/api/admin/almacenes`**
- **Permiso:** `admin.almacenes.view`
- **Respuesta:**
  ```json
  [
    {
      "id": 1,
      "nombre": "Almacén Central",
      "ubicacion": "Av. Principal 123",
      "descripcion": "Almacén principal",
      "activo": 1,
      "usuariosAsignados": 5,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
  ```

**POST `/api/admin/almacenes`**
- **Permiso:** `admin.almacenes.create`
- **Body:**
  ```json
  {
    "nombre": "Almacén Norte",
    "ubicacion": "Zona Norte, Calle 10",
    "descripcion": "Almacén secundario"
  }
  ```

**PATCH `/api/admin/almacenes/[id]`**
- **Permiso:** `admin.almacenes.edit`
- **Body:**
  ```json
  {
    "nombre": "Almacén Norte Updated",
    "ubicacion": "Nueva dirección",
    "descripcion": "Descripción actualizada",
    "activo": 0
  }
  ```

**DELETE `/api/admin/almacenes/[id]`**
- **Permiso:** `admin.almacenes.delete`
- **Restricción:** No puede tener usuarios asignados
- **Respuesta:** 200 OK

#### Productos

**GET `/api/admin/productos`**
- **Permiso:** `admin.productos.view`
- **Query Params:**
  - `tipo` (opcional): Filtrar por tipo de producto
- **Respuesta:**
  ```json
  [
    {
      "id": 1,
      "codigo": "CAN-NEG-001",
      "nombre": "Canastillo Negro Grande",
      "tipo": "canastillo_negro",
      "descripcion": "Canastillo negro de alta resistencia",
      "unidadMedida": "Unidad",
      "precioBase": 50,
      "stockMinimo": 10,
      "activo": 1,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
  ```

**POST `/api/admin/productos`**
- **Permiso:** `admin.productos.create`
- **Body:**
  ```json
  {
    "codigo": "COO-001",
    "nombre": "Cooler Grande",
    "tipo": "cooler",
    "descripcion": "Cooler de alta capacidad",
    "unidadMedida": "Unidad",
    "precioBase": 150,
    "stockMinimo": 5
  }
  ```

**PATCH `/api/admin/productos/[id]`**
- **Permiso:** `admin.productos.edit`
- **Body:** (campos opcionales)

**DELETE `/api/admin/productos/[id]`**
- **Permiso:** `admin.productos.delete`
- **Nota:** Soft delete (activo = 0)

#### Ajustes de Inventario

**GET `/api/admin/ajustes`**
- **Permiso:** `admin.ajustes.view`
- **Respuesta:** Lista de movimientos tipo "entrada" o "baja"

**POST `/api/admin/ajustes`**
- **Permiso:** `admin.ajustes.create`
- **Body:**
  ```json
  {
    "tipoMovimiento": "entrada",
    "motivo": "Compra a proveedor",
    "proveedorResponsable": "Proveedor XYZ",
    "observaciones": "Compra de 100 unidades",
    "almacenId": 1,
    "productos": [
      {
        "productoId": 5,
        "cantidad": 100
      }
    ]
  }
  ```

**GET `/api/admin/inventario-almacen?almacenId={id}`**
- **Permiso:** `admin.ajustes.view`
- **Respuesta:** Inventario completo del almacén para reconteo

### Endpoints de Operación

#### Movimientos

**GET `/api/movimientos?almacenDestinoId={id}`**
- **Permiso:** `movimientos.approve`
- **Respuesta:** Movimientos pendientes para el almacén destino

**POST `/api/movimientos`**
- **Permiso:** `movimientos.create`
- **Body:**
  ```json
  {
    "almacenDestinoId": 2,
    "transportadoPor": "Juan Transportes",
    "observaciones": "Envío urgente",
    "productos": [
      {
        "productoId": 1,
        "cantidad": 50
      },
      {
        "productoId": 3,
        "cantidad": 30
      }
    ]
  }
  ```

**PUT `/api/movimientos/[id]`**
- **Permiso:** `movimientos.edit`
- **Restricción:** Solo movimientos pendientes

**DELETE `/api/movimientos/[id]`**
- **Permiso:** `movimientos.delete`

**POST `/api/movimientos/[id]/aprobar`**
- **Permiso:** `movimientos.approve`
- **Efecto:**
  - Incrementa inventario en almacén destino
  - Decrementa inventario en almacén origen
  - Cambia estado a "aprobado"
  - Crea notificación al solicitante

**POST `/api/movimientos/[id]/rechazar`**
- **Permiso:** `movimientos.reject`
- **Body:**
  ```json
  {
    "motivo": "Productos incorrectos"
  }
  ```
- **Efecto:**
  - Cambia estado a "rechazado"
  - NO modifica inventario
  - Crea notificación al solicitante con motivo

**POST `/api/movimientos/[id]/anular`**
- **Permiso:** `movimientos.edit`
- **Restricción:** Solo movimientos pendientes
- **Efecto:** Cambia estado a "anulado"

**POST `/api/movimientos/[id]/reenviar`**
- **Permiso:** `movimientos.edit`
- **Restricción:** Solo movimientos rechazados
- **Efecto:** Cambia estado a "pendiente"

#### Inventario

**GET `/api/inventario?almacenId={id}`**
- **Permiso:** `inventario.view` o `inventario.view_all`
- **Query Params:**
  - `almacenId` (opcional para admins)
- **Respuesta:**
  ```json
  [
    {
      "productoId": 1,
      "productoCodigo": "CAN-NEG-001",
      "productoNombre": "Canastillo Negro Grande",
      "productoTipo": "canastillo_negro",
      "cantidad": 150,
      "stockMinimo": 10,
      "unidadMedida": "Unidad"
    }
  ]
  ```

#### Historial

**GET `/api/historial?almacenId={id}`**
- **Permiso:** `historial.view` o `historial.view_all`
- **Respuesta:** Todos los movimientos (aprobados, rechazados, anulados) del almacén

#### Notificaciones

**GET `/api/notificaciones?soloNoLeidas=true`**
- **Autenticación:** Requerida
- **Query Params:**
  - `soloNoLeidas`: boolean (opcional)
- **Respuesta:**
  ```json
  [
    {
      "id": 1,
      "tipo": "nuevo_movimiento",
      "titulo": "Nueva recepción pendiente",
      "mensaje": "Tienes una nueva recepción de Almacén Central",
      "movimientoId": 15,
      "leida": 0,
      "createdAt": "2024-01-20T14:30:00Z"
    }
  ]
  ```

**PATCH `/api/notificaciones`**
- **Body:** (vacío)
- **Efecto:** Marca todas las notificaciones del usuario como leídas

**PATCH `/api/notificaciones/[id]`**
- **Body:** (vacío)
- **Efecto:** Marca notificación específica como leída

---

## Componentes Frontend

### Navigation Component

**Archivo:** `components/navigation.tsx`

**Props:** Ninguno (usa sesión interna)

**Funcionalidad:**
- Barra de navegación sticky en top
- Links según rol del usuario:
  - Operador: Dashboard, Inventario, Salida, Recepciones, Mis Movimientos, Historial
  - Admin: + Usuarios, Almacenes, Productos, Ajustes
- Campana de notificaciones
- Info del usuario (nombre, rol, almacén)
- Botón de logout
- Responsive: menú hamburguesa en mobile

**Estilos:**
- Links admin: `bg-gray-600`
- Logout: `bg-red-600`
- Links activos: `shadow-md`

### NotificationsBell Component

**Archivo:** `components/notifications-bell.tsx`

**Props:** Ninguno

**Funcionalidad:**
- Muestra campana (🔔) con contador de no leídas
- Dropdown con lista de notificaciones
- Click en notificación:
  - Marca como leída
  - Navega al movimiento relacionado
- Botón "Marcar todas como leídas"
- Filtro: Solo no leídas / Todas

**Estado:**
- Actualiza cada 30 segundos (polling)
- Se puede forzar refresh

### ProtectedRoute Component

**Archivo:** `components/protected-route.tsx`

**Props:**
```typescript
interface Props {
  children: React.ReactNode;
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
}
```

**Funcionalidad:**
- Verifica que el usuario tenga sesión
- Verifica que el usuario tenga el permiso requerido
- Si no cumple: muestra fallback o redirect a login
- Si cumple: renderiza children

**Uso:**
```tsx
<ProtectedRoute requiredPermission="admin.users.view">
  <UserManagementPage />
</ProtectedRoute>
```

---

## Utilidades y Librerías

### Generación de PDFs

**Archivo:** `lib/utils/pdf.ts`

**Funciones:**

**1. `generarPDFSalida(movimiento)`**

Genera PDF térmico (80mm x 200mm) para salidas.

**Parámetros:**
```typescript
interface MovimientoPDF {
  id: number;
  fechaSolicitud: Date;
  transportadoPor: string;
  almacenOrigen: { nombre: string };
  almacenDestino: { nombre: string };
  usuarioSolicitante: { nombre: string };
  detalles: Array<{
    cantidad: number;
    producto: {
      codigo: string;
      nombre: string;
      tipo: string;
    };
  }>;
}
```

**Output:** Descarga automática de PDF

**2. `generarPDFRecepcion(movimiento)`**

Similar a salida pero con fecha de aprobación y usuario aprobador.

**3. `generarPDFReconteo(reconteo)`**

Genera PDF en hoja Carta (Letter) para reconteos.

**Parámetros:**
```typescript
interface ReconteoPDF {
  almacenNombre: string;
  motivo: string;
  observaciones?: string;
  fecha: Date;
  usuarioNombre: string;
  productos: Array<{
    codigo: string;
    nombre: string;
    tipo: string;
    stockActual: number;
    stockFisico: number;
    diferencia: number;
  }>;
}
```

**Características:**
- Tabla completa con todos los productos
- Diferencias resaltadas (verde/rojo)
- Resumen ejecutivo
- Sección de firmas
- Pie de página con timestamp

### Sistema de Notificaciones

**Archivo:** `lib/notifications.ts`

**Funciones:**

**`crearNotificacionNuevoMovimiento(movimientoId, almacenDestinoId)`**
- Notifica a todos los usuarios del almacén destino
- Tipo: `nuevo_movimiento`
- Mensaje: "Tienes una nueva recepción de [Almacén Origen]"

**`crearNotificacionMovimientoAprobado(movimientoId, usuarioSolicitanteId)`**
- Notifica al usuario que creó el movimiento
- Tipo: `movimiento_aprobado`
- Mensaje: "Tu movimiento fue aprobado por [Almacén Destino]"

**`crearNotificacionMovimientoRechazado(movimientoId, usuarioSolicitanteId, motivo)`**
- Notifica al usuario que creó el movimiento
- Tipo: `movimiento_rechazado`
- Mensaje: "Tu movimiento fue rechazado: [motivo]"

---

## Despliegue

### Plataforma: Vercel

**URL de Producción:** https://control-canastillos.vercel.app

### Configuración de Vercel

**Archivo:** `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "framework": "nextjs",
  "installCommand": "npm install"
}
```

### Variables de Entorno en Vercel

Configurar en: **Vercel Dashboard → Settings → Environment Variables**

**Variables requeridas:**

```env
# Database
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# NextAuth
NEXTAUTH_URL=https://control-canastillos.vercel.app
NEXTAUTH_SECRET=your-super-secret-key-here

# Node Environment
NODE_ENV=production
```

### Deployment desde CLI

**Instalar Vercel CLI:**

```bash
npm install -g vercel
```

**Login:**

```bash
vercel login
```

**Vincular proyecto:**

```bash
vercel link
```

**Deploy a producción:**

```bash
vercel --prod
```

### Deployment Automático

**GitHub Integration:**
- Vercel detecta automáticamente pushes a `main`
- Cada push dispara un deployment automático
- Preview deployments para otras branches

**Proceso:**
1. `git push origin main`
2. Vercel detecta cambio
3. Corre build: `npm run build`
4. Deploy a producción si tiene éxito
5. Notificación de resultado

---

## Desarrollo Local

### Requisitos

- **Node.js:** v20.x o superior
- **npm:** v9.x o superior
- **PostgreSQL:** 15+ (local o Neon remoto)

### Instalación

**1. Clonar repositorio:**

```bash
git clone https://github.com/RichiCCH/control-canastillos.git
cd control-canastillos
```

**2. Instalar dependencias:**

```bash
npm install
```

**3. Configurar variables de entorno:**

Crear archivo `.env.local`:

```env
# Database (Neon o PostgreSQL local)
DATABASE_URL=postgresql://user:password@localhost:5432/control_canastillos?sslmode=prefer

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-local-secret-key

# Node Environment
NODE_ENV=development
```

**4. Ejecutar migraciones:**

```bash
npm run db:push
```

**5. Poblar base de datos (opcional):**

```bash
npm run db:seed
```

**6. Iniciar servidor de desarrollo:**

```bash
npm run dev
```

**7. Abrir navegador:**

```
http://localhost:3000
```

**Usuario demo (si ejecutó seed):**
- Email: `admin@example.com`
- Password: `admin123`

### Scripts NPM

```json
{
  "dev": "next dev",                  // Servidor desarrollo (port 3000)
  "build": "next build",              // Build producción
  "start": "next start",              // Iniciar build de producción
  "lint": "eslint",                   // Linting
  "db:generate": "drizzle-kit generate", // Generar migraciones
  "db:push": "drizzle-kit push",      // Aplicar migraciones
  "db:studio": "drizzle-kit studio",  // Abrir Drizzle Studio
  "db:seed": "tsx scripts/seed.ts",   // Poblar BD
  "db:reset": "tsx scripts/reset-canastillos.ts", // Reset tabla canastillos
  "db:reset-completo": "tsx scripts/reset-completo.ts" // Reset total
}
```

### Estructura de Trabajo

**Desarrollo de nueva feature:**

1. Crear branch:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```

2. Desarrollar cambios
3. Commitear:
   ```bash
   git add .
   git commit -m "feat: agregar nueva funcionalidad"
   ```

4. Push:
   ```bash
   git push origin feature/nueva-funcionalidad
   ```

5. Crear Pull Request en GitHub
6. Review y merge a `main`

---

## Testing

### Testing Manual

Actualmente el proyecto no tiene tests automatizados. Se recomienda testing manual con:

**Checklist de Testing:**

**Autenticación:**
- [ ] Login con credenciales válidas
- [ ] Login con credenciales inválidas
- [ ] Logout correcto
- [ ] Redirección a login en rutas protegidas

**Permisos:**
- [ ] Operador no ve rutas admin
- [ ] Admin ve todas las rutas
- [ ] Supervisor ve inventarios de todos

**Movimientos:**
- [ ] Crear salida con stock suficiente
- [ ] Error al crear salida sin stock
- [ ] Aprobar recepción incrementa inventario
- [ ] Rechazar recepción no modifica inventario
- [ ] Anular movimiento pendiente
- [ ] Reenviar movimiento rechazado

**Inventario:**
- [ ] Ver inventario por almacén
- [ ] Reconteo completo
- [ ] Ajustes de entrada incrementan stock
- [ ] Ajustes de baja decrementan stock

**Notificaciones:**
- [ ] Notificación al crear movimiento
- [ ] Notificación al aprobar
- [ ] Notificación al rechazar
- [ ] Marcar como leída

### Tests Automatizados (Futuro)

**Herramientas recomendadas:**
- **Jest:** Unit tests
- **React Testing Library:** Component tests
- **Playwright:** E2E tests

**Ejemplo de estructura:**

```
tests/
├── unit/
│   ├── lib/
│   │   ├── permissions.test.ts
│   │   └── notifications.test.ts
│   └── components/
│       └── navigation.test.tsx
├── integration/
│   └── api/
│       ├── movimientos.test.ts
│       └── users.test.ts
└── e2e/
    ├── login.spec.ts
    ├── movimientos.spec.ts
    └── admin.spec.ts
```

---

## Mejores Prácticas

### Código

**1. TypeScript:**
- Tipar todas las funciones y componentes
- Evitar `any`, usar tipos específicos
- Usar interfaces para estructuras complejas

**2. Next.js:**
- Usar `'use client'` solo cuando necesites interactividad
- Preferir Server Components cuando sea posible
- Usar dynamic imports para componentes pesados

**3. API Routes:**
- Siempre validar permisos al inicio
- Usar try-catch para manejo de errores
- Retornar códigos HTTP apropiados (200, 201, 400, 401, 403, 500)

**4. Base de Datos:**
- Usar transacciones para operaciones relacionadas
- Indexar columnas frecuentemente consultadas
- Evitar N+1 queries (usar joins)

**5. Frontend:**
- Componentes pequeños y reutilizables
- Estados locales solo cuando sea necesario
- Usar React hooks apropiadamente

### Seguridad

**1. Autenticación:**
- ✅ Implementar hashing de contraseñas con bcrypt
- ✅ Usar variables de entorno para secrets
- ✅ Validar sesión en todas las rutas protegidas

**2. Autorización:**
- ✅ Verificar permisos en backend (nunca solo frontend)
- ✅ Usar RBAC (Role-Based Access Control)
- ✅ Validar propiedad de recursos

**3. Validación:**
- ✅ Validar todos los inputs del usuario
- ✅ Sanitizar datos antes de guardar en BD
- ✅ Usar prepared statements (Drizzle ORM lo hace automáticamente)

**4. Datos Sensibles:**
- ✅ No exponer información innecesaria en APIs
- ✅ Logs sin contraseñas ni tokens
- ✅ HTTPS en producción (manejado por Vercel)

### Performance

**1. Caching:**
- Usar `export const dynamic = 'force-dynamic'` solo cuando sea necesario
- Cachear respuestas de APIs cuando sea posible
- Usar React.memo para componentes pesados

**2. Optimización de Queries:**
- Limitar resultados con `.limit()`
- Usar paginación para listas grandes
- Evitar cargar datos innecesarios

**3. Frontend:**
- Lazy loading de componentes grandes
- Optimizar imágenes con `next/image`
- Minimizar re-renders innecesarios

### Git

**Commits:**
- Usar conventional commits:
  - `feat:` nueva funcionalidad
  - `fix:` corrección de bug
  - `docs:` documentación
  - `style:` formato (sin cambio de lógica)
  - `refactor:` refactorización
  - `test:` agregar tests
  - `chore:` tareas de mantenimiento

**Branches:**
- `main` - producción estable
- `develop` - desarrollo integrado
- `feature/*` - nuevas funcionalidades
- `fix/*` - correcciones

---

## Troubleshooting

### Errores Comunes

**1. Error de conexión a base de datos**

```
Error: Connection refused
```

**Solución:**
- Verificar que `DATABASE_URL` en `.env.local` sea correcta
- Confirmar que la base de datos esté corriendo
- Revisar firewall y permisos de red

**2. Error de autenticación**

```
Error: NEXTAUTH_SECRET not configured
```

**Solución:**
- Agregar `NEXTAUTH_SECRET` a `.env.local`
- Generar secret: `openssl rand -base64 32`

**3. Errores de migración**

```
Error: Migration failed
```

**Solución:**
- Ejecutar `npm run db:push` manualmente
- Verificar schema en `db/schema.ts`
- Revisar logs de PostgreSQL

**4. Errores de permisos**

```
Error: FORBIDDEN
```

**Solución:**
- Verificar rol del usuario en BD
- Confirmar que el permiso esté en `lib/permissions.ts`
- Revisar matriz ROLE_PERMISSIONS

**5. Build failed en Vercel**

```
Error: Build failed
```

**Solución:**
- Revisar logs de Vercel
- Confirmar que todas las dependencias estén en `package.json`
- Verificar variables de entorno en Vercel Dashboard
- Ejecutar `npm run build` localmente para reproducir error

---

## Despliegue en Vercel

El sistema está optimizado para desplegarse en **Vercel** con **PostgreSQL (Supabase/Neon)**.

### Checklist de Despliegue

1.  **Variables de Entorno:** Configurar en el dashboard de Vercel:
    - `DATABASE_URL`: URI de conexión a PostgreSQL.
    - `NEXTAUTH_SECRET`: Un string aleatorio largo para firmar las cookies.
    - `NEXTAUTH_URL`: La URL base de la app (ej: `https://tu-app.vercel.app`).
    - `GEMINI_API_KEY`: Key de Google AI para funciones inteligentes (opcional).

2.  **Base de Datos:**
    - Crear la base de datos en Supabase.
    - Ejecutar las migraciones SQL que están en `db/migrations/`.
    - (Opcional) Correr `npm run db:seed` para datos iniciales.

3.  **Build en Vercel:**
    - El comando de build es `npm run build`.
    - El sistema automáticamente limpia archivos temporales y excluye carpetas legacy during the build process defined in `tsconfig.json`.

---

## Recursos Adicionales

### Documentación Externa

- **Next.js:** https://nextjs.org/docs
- **Drizzle ORM:** https://orm.drizzle.team/docs
- **NextAuth:** https://next-auth.js.org
- **Vercel:** https://vercel.com/docs

### Repositorio

**GitHub:** https://github.com/RichiCCH/control-canastillos

---

**Manual Técnico - Versión 1.1.0**
**Última actualización:** Marzo 2026

