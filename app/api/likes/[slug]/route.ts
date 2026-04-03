import { NextRequest, NextResponse } from 'next/server'

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function redisGet(key: string): Promise<number> {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    return 0
  }
  const res = await fetch(`${UPSTASH_REDIS_REST_URL}/get/${key}`, {
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
    },
    cache: 'no-store',
  })
  const data = await res.json()
  return Number(data.result) || 0
}

async function redisIncr(key: string): Promise<number> {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    return 0
  }
  const res = await fetch(`${UPSTASH_REDIS_REST_URL}/incr/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
    },
    cache: 'no-store',
  })
  const data = await res.json()
  return Number(data.result) || 0
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const key = `likes:${params.slug}`
  const likes = await redisGet(key)
  return NextResponse.json({ likes })
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const key = `likes:${params.slug}`
  const likes = await redisIncr(key)
  return NextResponse.json({ likes })
}
