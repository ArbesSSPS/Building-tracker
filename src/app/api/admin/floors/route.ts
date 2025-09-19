import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const floors = await prisma.floor.findMany({
      include: {
        rooms: {
          include: {
            users: {
              include: {
                presence: true
              }
            }
          }
        },
        cleaningSettings: true
      },
      orderBy: { number: 'asc' }
    })

    return NextResponse.json(floors)
  } catch (error) {
    console.error('Floors fetch error:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání pater' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { number, name } = await request.json()

    if (!number || !name) {
      return NextResponse.json(
        { error: 'Číslo a název patra jsou povinné' },
        { status: 400 }
      )
    }

    const floor = await prisma.floor.create({
      data: {
        number,
        name
      }
    })

    return NextResponse.json(floor)
  } catch (error) {
    console.error('Floor creation error:', error)
    return NextResponse.json(
      { error: 'Chyba při vytváření patra' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { id, number, name } = await request.json()

    if (!id || !number || !name) {
      return NextResponse.json(
        { error: 'ID, číslo a název patra jsou povinné' },
        { status: 400 }
      )
    }

    const floor = await prisma.floor.update({
      where: { id },
      data: {
        number,
        name
      },
      include: {
        rooms: {
          include: {
            users: {
              include: {
                presence: true
              }
            }
          }
        },
        cleaningSettings: true
      }
    })

    return NextResponse.json(floor)
  } catch (error) {
    console.error('Floor update error:', error)
    return NextResponse.json(
      { error: 'Chyba při aktualizaci patra' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID patra je povinné' },
        { status: 400 }
      )
    }

    // Check if floor has rooms
    const floorWithRooms = await prisma.floor.findUnique({
      where: { id },
      include: { rooms: true }
    })

    if (floorWithRooms?.rooms.length > 0) {
      return NextResponse.json(
        { error: 'Nelze smazat patro s místnostmi' },
        { status: 400 }
      )
    }

    await prisma.floor.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Patro bylo úspěšně smazáno' })
  } catch (error) {
    console.error('Floor deletion error:', error)
    return NextResponse.json(
      { error: 'Chyba při mazání patra' },
      { status: 500 }
    )
  }
}
