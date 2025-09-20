import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only SUPERADMIN can change user roles
    if (!session?.user?.id || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Neautorizováno - pouze superadmin může měnit role' }, { status: 401 })
    }

    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'ID uživatele a role jsou povinné' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['USER', 'ADMIN', 'SUPERADMIN']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Neplatná role. Povolené role: USER, ADMIN, SUPERADMIN' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      return NextResponse.json(
        { error: 'Uživatel nenalezen' },
        { status: 404 }
      )
    }

    // Prevent superadmin from changing their own role
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Nemůžete změnit svou vlastní roli' },
        { status: 400 }
      )
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      include: {
        room: {
          include: {
            floor: true
          }
        },
        presence: true
      }
    })

    return NextResponse.json({
      success: true,
      message: `Role uživatele ${user.name} ${user.lastName || ''} byla změněna na ${role}`,
      user: updatedUser
    })
  } catch (error) {
    console.error('User role update error:', error)
    return NextResponse.json(
      { error: 'Chyba při změně role uživatele' },
      { status: 500 }
    )
  }
}
