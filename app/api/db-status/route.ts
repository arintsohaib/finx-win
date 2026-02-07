export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
export async function GET() {
  try {
    // Test the connection
    await prisma.$queryRaw`SELECT 1 as test`
    
    return NextResponse.json({
      status: 'connected',
      message: 'Database connection is active',
      timestamp: new Date().toISOString(),
      poolConfig: {
        keepaliveInterval: '3 minutes',
        connectionPoolLimit: 10,
        reconnectOnError: true
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error?.message || 'Database connection failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
