import { UserRole } from '@prisma/client'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  room?: Room
  presence?: Presence
}

export interface Floor {
  id: string
  number: number
  name: string
  rooms: Room[]
  createdAt: Date
  updatedAt: Date
}

export interface Room {
  id: string
  name: string
  floorId: string
  floor?: Floor
  users: User[]
  createdAt: Date
  updatedAt: Date
}

export interface Presence {
  id: string
  userId: string
  user?: User
  isPresent: boolean
  lastSeen: Date
  createdAt: Date
  updatedAt: Date
}

export interface ActivityLog {
  id: string
  userId: string
  user?: User
  action: 'check_in' | 'check_out'
  timestamp: Date
  createdAt: Date
}

export interface CleaningSettings {
  id: string
  floorId: string
  floor?: Floor
  frequency: 'weekly' | 'biweekly' | 'monthly'
  createdAt: Date
  updatedAt: Date
}

export interface CleaningRotation {
  id: string
  floorId: string
  floor?: Floor
  roomId: string
  room?: Room
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface CleaningRecord {
  id: string
  floorId: string
  floor?: Floor
  roomId: string
  room?: Room
  userId: string
  user?: User
  photos: string[] // Parsed from JSON string
  completedAt: Date
  period: string
  createdAt: Date
}

export interface BuildingStats {
  totalPresent: number
  floorPresent: number
  floorStats?: Floor[]
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  room?: Room
  presence?: Presence
}
