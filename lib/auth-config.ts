import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Role } from "./permissions";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const searchValue = credentials.email as string;
        const inputPassword = credentials.password as string;

        // Buscar usuario por email O por nombre (para compatibilidad)
        const userByEmail = await db
          .select({
            id: users.id,
            nombre: users.nombre,
            email: users.email,
            password: users.password,
            almacenId: users.almacenId,
            rol: users.rol,
          })
          .from(users)
          .where(eq(users.email, searchValue))
          .limit(1);

        let foundUser = userByEmail.length > 0 ? userByEmail[0] : null;

        // Si no se encontró por email, buscar por nombre
        if (!foundUser) {
          const userByName = await db
            .select({
              id: users.id,
              nombre: users.nombre,
              email: users.email,
              password: users.password,
              almacenId: users.almacenId,
              rol: users.rol,
            })
            .from(users)
            .where(eq(users.nombre, searchValue))
            .limit(1);

          foundUser = userByName.length > 0 ? userByName[0] : null;
        }

        if (!foundUser) {
          return null;
        }

        // Verificar contraseña
        // Por ahora, comparación simple de texto plano
        // En producción, deberías usar bcrypt para comparar hashes
        if (foundUser.password !== inputPassword) {
          return null;
        }

        return {
          id: foundUser.id.toString(),
          email: foundUser.email || `${foundUser.nombre}@temp.local`,
          name: foundUser.nombre,
          rol: foundUser.rol || "operador",
          almacenId: foundUser.almacenId,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Si es login con Google, buscar o crear usuario
      if (account?.provider === "google" && user.email) {
        try {
          // Buscar usuario por email
          const existingUser = await db
            .select({
              id: users.id,
              nombre: users.nombre,
              email: users.email,
              almacenId: users.almacenId,
              rol: users.rol,
            })
            .from(users)
            .where(eq(users.email, user.email))
            .limit(1);

          // Si no existe, crear nuevo usuario
          if (existingUser.length === 0) {
            await db.insert(users).values({
              nombre: user.name || user.email.split('@')[0],
              email: user.email,
              rol: 'operador', // Rol por defecto
            });
          }

          return true;
        } catch (error) {
          console.error('Error en signIn callback:', error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      // Si es login inicial
      if (user) {
        // Agregar datos del usuario al token
        token.id = user.id;
        token.rol = (user as any).rol || 'operador';
        token.almacenId = (user as any).almacenId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).rol = token.rol as Role;
        (session.user as any).almacenId = token.almacenId as number | null;
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
