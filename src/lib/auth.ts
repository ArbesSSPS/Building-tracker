import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Heslo', type: 'password' },
        rememberMe: { label: 'Zůstat přihlášen', type: 'checkbox' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            room: {
              include: {
                floor: true
              }
            },
            presence: true
          }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          room: user.room ? {
            id: user.room.id,
            name: user.room.name,
            project: user.room.project || null,
            floorId: user.room.floorId,
            createdAt: user.room.createdAt,
            updatedAt: user.room.updatedAt,
            floor: user.room.floor,
            users: [],
            cleaningRotations: [],
            cleaningRecords: []
          } : undefined,
          presence: user.presence,
          rememberMe: credentials.rememberMe === 'true'
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dní (v sekundách)
    updateAge: 24 * 60 * 60, // 24 hodin (v sekundách)
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 dní (v sekundách)
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.room = user.room
        token.presence = user.presence
        token.rememberMe = user.rememberMe
        // Nastavíme expiraci na základě rememberMe
        if (user.rememberMe) {
          token.exp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 dní
        } else {
          token.exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hodin
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role
        session.user.room = token.room as any
        session.user.presence = token.presence as any
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin'
  }
}
