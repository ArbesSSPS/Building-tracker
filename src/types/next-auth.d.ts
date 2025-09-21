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
    room?: {
      id: string
      name: string
      project: string | null
      floorId: string
      createdAt: Date
      updatedAt: Date
      floor: {
        id: string
        number: number
        name: string
        createdAt: Date
        updatedAt: Date
      }
      users: any[]
      cleaningRotations: any[]
      cleaningRecords: any[]
    }
    presence?: Presence | null
    rememberMe?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole
    room?: {
      id: string
      name: string
      project: string | null
      floorId: string
      createdAt: Date
      updatedAt: Date
      floor: {
        id: string
        number: number
        name: string
        createdAt: Date
        updatedAt: Date
      }
      users: any[]
      cleaningRotations: any[]
      cleaningRecords: any[]
    }
    presence?: Presence | null
    rememberMe?: boolean
  }
}
