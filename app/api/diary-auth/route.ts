import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json() as { password?: string }
  const { password } = body

  if (!password) {
    return NextResponse.json({ ok: false })
  }

  const correct = process.env.DIARY_PASSWORD
  if (password === correct) {
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ ok: false })
}
