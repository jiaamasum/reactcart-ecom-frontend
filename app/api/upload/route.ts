import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'No file provided' } }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Only image files are allowed' } }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })

    const ext = path.extname(file.name || '').toLowerCase() || '.png'
    const base = path.basename((file.name || 'upload').replace(/[^a-zA-Z0-9-_\.]/g, ''), ext)
    const filename = `${Date.now()}_${base}${ext}`
    const filepath = path.join(uploadsDir, filename)

    await fs.writeFile(filepath, buffer)

    const url = `/uploads/${filename}`
    return NextResponse.json({ data: { url }, error: null }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ data: null, error: { code: 'UPLOAD_ERROR', message: e?.message || 'Upload failed' } }, { status: 500 })
  }
}
