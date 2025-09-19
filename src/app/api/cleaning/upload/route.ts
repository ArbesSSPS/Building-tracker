import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('photos') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Žádné soubory nebyly nahrány' }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'cleaning')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const uploadedFiles: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Pouze obrázky jsou povoleny' }, { status: 400 })
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Soubor je příliš velký (max 5MB)' }, { status: 400 })
      }

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop() || 'jpg'
      const filename = `cleaning_${session.user.id}_${timestamp}_${i}.${fileExtension}`
      const filepath = join(uploadsDir, filename)

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filepath, buffer)

      // Store relative path for database
      uploadedFiles.push(`/uploads/cleaning/${filename}`)
    }

    return NextResponse.json({ 
      success: true, 
      files: uploadedFiles 
    })

  } catch (error) {
    console.error('Photo upload error:', error)
    return NextResponse.json(
      { error: 'Chyba při nahrávání fotografií' },
      { status: 500 }
    )
  }
}
