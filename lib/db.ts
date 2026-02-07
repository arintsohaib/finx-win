import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Enhanced Prisma Client with connection pooling, lifecycle management, and idle timeout prevention
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Ensure singleton pattern in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Connection health check and keepalive to prevent idle timeout
let healthCheckInterval: NodeJS.Timeout | null = null
let isReconnecting = false

// Start connection keepalive (ping every 60 seconds to prevent idle timeout)
const startConnectionKeepalive = () => {
  if (healthCheckInterval) return // Already running

  healthCheckInterval = setInterval(async () => {
    // Skip if already reconnecting
    if (isReconnecting) return

    try {
      await prisma.$queryRaw`SELECT 1`
      // Silent on success to reduce log noise
    } catch (error) {
      console.error('[Prisma] Keepalive ping failed, attempting reconnection...', error)

      // Prevent multiple simultaneous reconnections
      if (isReconnecting) return
      isReconnecting = true

      try {
        // Disconnect and reconnect
        await prisma.$disconnect()
        await prisma.$connect()
        console.log('[Prisma] Reconnection successful')
      } catch (reconnectError) {
        console.error('[Prisma] Reconnection failed:', reconnectError)
      } finally {
        isReconnecting = false
      }
    }
  }, 60 * 1000) // 1 minute (more aggressive to prevent timeout)
}

// Initialize keepalive on module load (in all environments except build)
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'test';
if (typeof process !== 'undefined' && !isBuildPhase && process.env.DATABASE_URL) {
  startConnectionKeepalive()
  console.log('[Prisma] Connection keepalive system initialized (60-second interval)')
}

// Graceful shutdown with cleanup
if (typeof process !== 'undefined') {
  const cleanup = async () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
      healthCheckInterval = null
    }
    await prisma.$disconnect()
  }

  process.on('beforeExit', cleanup)
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
}
