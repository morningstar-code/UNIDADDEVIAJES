import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
      JWT_SECRET: !!process.env.JWT_SECRET,
      MS_TENANT_ID: !!process.env.MS_TENANT_ID,
    },
  })
}
