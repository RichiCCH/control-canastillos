import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users, almacenes } from "@/db/schema";
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

        // Buscar usuario por email con su almacén
        const userByEmail = await db
          .select({
            id: users.id,
            nombre: users.nombre,
            email: users.email,
            password: users.password,
            almacenId: users.almacenId,
            rol: users.rol,
            almacenNombre: almacenes.nombre, // Join
          })
          .from(users)
          .leftJoin(almacenes, eq(users.almacenId, almacenes.id))
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
              almacenNombre: almacenes.nombre, // Join
            })
            .from(users)
            .leftJoin(almacenes, eq(users.almacenId, almacenes.id))
            .where(eq(users.nombre, searchValue))
            .limit(1);

          foundUser = userByName.length > 0 ? userByName[0] : null;
        }

        if (!foundUser) {
          return null;
        }

        // Verificar contraseña
        if (foundUser.password !== inputPassword) {
          return null;
        }

        return {
          id: foundUser.id.toString(),
          email: foundUser.email || `${foundUser.nombre}@temp.local`,
          name: foundUser.nombre,
          rol: foundUser.rol || "operador",
          almacenId: foundUser.almacenId,
          almacenNombre: foundUser.almacenNombre, // Add to object
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user.email) {
        try {
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

          if (existingUser.length === 0) {
            await db.insert(users).values({
              nombre: user.name || user.email.split('@')[0],
              email: user.email,
              rol: 'operador',
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
      if (user) {
        token.id = user.id;
        token.rol = (user as any).rol || 'operador';
        token.almacenId = (user as any).almacenId;
        token.almacenNombre = (user as any).almacenNombre; // Store name
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).rol = token.rol as Role;
        (session.user as any).almacenId = token.almacenId as number | null;
        (session.user as any).almacenNombre = token.almacenNombre as string | null; // Pass to session
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
