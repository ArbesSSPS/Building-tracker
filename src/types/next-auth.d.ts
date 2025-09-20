import { UserRole } from '@prisma/client'
import { Room, Presence } from './index'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      room?: Room
      presence?: Presence
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    room?: Room
    presence?: Presence
    rememberMe?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole
    room?: Room
    presence?: Presence
    rememberMe?: boolean
  }
}
