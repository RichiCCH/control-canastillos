import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { users, almacenes, usuariosAlmacenes } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Role } from "./permissions";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const searchValue = credentials.email as string;
        const inputPassword = credentials.password as string;

        // Buscar usuario por email o por nombre
        let foundUser: any = null;
        for (const whereField of [
          eq(users.email, searchValue),
          eq(users.nombre, searchValue),
        ]) {
          const result = await db
            .select({
              id: users.id, nombre: users.nombre, email: users.email,
              password: users.password, almacenId: users.almacenId, rol: users.rol,
            })
            .from(users)
            .where(whereField)
            .limit(1);
          if (result.length > 0) { foundUser = result[0]; break; }
        }

        if (!foundUser || foundUser.password !== inputPassword) return null;

        // ── Cargar TODOS los almacenes asignados (tabla pivote) ──────────────
        const asignaciones = await db
          .select({
            almacenId: usuariosAlmacenes.almacenId,
            esPrincipal: usuariosAlmacenes.esPrincipal,
            nombre: almacenes.nombre,
          })
          .from(usuariosAlmacenes)
          .innerJoin(almacenes, eq(usuariosAlmacenes.almacenId, almacenes.id))
          .where(eq(usuariosAlmacenes.usuarioId, foundUser.id));

        // Fallback: si la tabla pivote está vacía, usar almacenId directo
        let almacenesAsignados = asignaciones.map(a => ({
          id: a.almacenId, nombre: a.nombre, esPrincipal: a.esPrincipal === 1,
        }));

        if (almacenesAsignados.length === 0 && foundUser.almacenId) {
          const alm = await db
            .select({ id: almacenes.id, nombre: almacenes.nombre })
            .from(almacenes)
            .where(eq(almacenes.id, foundUser.almacenId))
            .limit(1);
          if (alm.length > 0) almacenesAsignados = [{ ...alm[0], esPrincipal: true }];
        }

        const almacenPrincipal =
          almacenesAsignados.find(a => a.esPrincipal) ??
          almacenesAsignados[0] ??
          null;

        return {
          id: foundUser.id.toString(),
          email: foundUser.email || `${foundUser.nombre}@temp.local`,
          name: foundUser.nombre,
          rol: foundUser.rol || 'operador',
          almacenId: almacenPrincipal?.id ?? null,
          almacenNombre: almacenPrincipal?.nombre ?? null,
          almacenes: almacenesAsignados,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.rol = (user as any).rol || 'operador';
        token.almacenId = (user as any).almacenId;
        token.almacenNombre = (user as any).almacenNombre;
        token.almacenes = (user as any).almacenes || [];
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).rol = token.rol as Role;
        (session.user as any).almacenId = token.almacenId as number | null;
        (session.user as any).almacenNombre = token.almacenNombre as string | null;
        (session.user as any).almacenes = (token.almacenes as { id: number; nombre: string; esPrincipal: boolean }[]) || [];
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },
});
