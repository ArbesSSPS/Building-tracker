import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const rooms = await prisma.room.findMany({
      include: {
        floor: true,
        users: {
          include: {
            presence: true
          }
        }
      },
      orderBy: [
        { floor: { number: 'asc' } },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(rooms)
  } catch (error) {
    console.error('Rooms fetch error:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání místností' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { name, project, floorId } = await request.json()

    if (!name || !floorId) {
      return NextResponse.json(
        { error: 'Název a patro jsou povinné' },
        { status: 400 }
      )
    }

    const room = await prisma.room.create({
      data: {
        name,
        project: project || null,
        floorId
      },
      include: {
        floor: true
      }
    })

    // Add room to cleaning rotation
    const existingRotations = await prisma.cleaningRotation.findMany({
      where: { floorId },
      orderBy: { order: 'desc' }
    })

    const nextOrder = existingRotations.length > 0 ? existingRotations[0].order + 1 : 0

    await prisma.cleaningRotation.create({
      data: {
        floorId,
        roomId: room.id,
        order: nextOrder
      }
    })

    return NextResponse.json(room)
  } catch (error) {
    console.error('Room creation error:', error)
    return NextResponse.json(
      { error: 'Chyba při vytváření místnosti' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { id, name, project, floorId } = await request.json()

    if (!id || !name || !floorId) {
      return NextResponse.json(
        { error: 'ID, název a patro jsou povinné' },
        { status: 400 }
      )
    }

    const room = await prisma.room.update({
      where: { id },
      data: {
        name,
        project: project || null,
        floorId
      },
      include: {
        floor: true,
        users: {
          include: {
            presence: true
          }
        }
      }
    })

    return NextResponse.json(room)
  } catch (error) {
    console.error('Room update error:', error)
    return NextResponse.json(
      { error: 'Chyba při aktualizaci místnosti' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID místnosti je povinné' },
        { status: 400 }
      )
    }

    // Check if room has users assigned
    const roomWithUsers = await prisma.room.findUnique({
      where: { id },
      include: { users: true }
    })

    if (roomWithUsers?.users?.length && roomWithUsers.users.length > 0) {
      return NextResponse.json(
        { error: 'Nelze smazat místnost s přiřazenými uživateli' },
        { status: 400 }
      )
    }

    // Remove room from cleaning rotation first
    await prisma.cleaningRotation.deleteMany({
      where: { roomId: id }
    })

    await prisma.room.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Místnost byla úspěšně smazána' })
  } catch (error) {
    console.error('Room deletion error:', error)
    return NextResponse.json(
      { error: 'Chyba při mazání místnosti' },
      { status: 500 }
    )
  }
}
