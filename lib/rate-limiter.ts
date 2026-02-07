// Rate Limiter Implementation for API Security
// Prevents brute force attacks and API abuse

import { NextRequest } from 'next/server';

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

interface RateLimitStore {
    [key: string]: RateLimitEntry;
}

class RateLimiter {
    private store: RateLimitStore = {};
    private readonly maxRequests: number;
    private readonly windowMs: number;
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;

        // Cleanup old entries every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Check if request should be rate limited
     * @param identifier - IP address or user ID
     * @returns true if rate limit exceeded, false otherwise
     */
    isRateLimited(identifier: string): boolean {
        const now = Date.now();
        const entry = this.store[identifier];

        // No entry or entry expired
        if (!entry || now > entry.resetTime) {
            this.store[identifier] = {
                count: 1,
                resetTime: now + this.windowMs,
            };
            return false;
        }

        // Increment counter
        entry.count++;

        // Check if limit exceeded
        if (entry.count > this.maxRequests) {
            return true;
        }

        return false;
    }

    /**
     * Get rate limit info for an identifier
     */
    getRateLimitInfo(identifier: string): {
        remaining: number;
        resetTime: number;
        limit: number;
    } {
        const entry = this.store[identifier];
        const now = Date.now();

        if (!entry || now > entry.resetTime) {
            return {
                remaining: this.maxRequests,
                resetTime: now + this.windowMs,
                limit: this.maxRequests,
            };
        }

        return {
            remaining: Math.max(0, this.maxRequests - entry.count),
            resetTime: entry.resetTime,
            limit: this.maxRequests,
        };
    }

    /**
     * Clean up expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        Object.keys(this.store).forEach((key) => {
            if (now > this.store[key].resetTime) {
                delete this.store[key];
            }
        });
    }

    /**
     * Destroy the rate limiter (cleanup interval)
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

// Create rate limiters for different endpoints
export const authRateLimiter = new RateLimiter(
    10, // 10 requests
    15 * 60 * 1000 // per 15 minutes
);

export const apiRateLimiter = new RateLimiter(
    100, // 100 requests
    15 * 60 * 1000 // per 15 minutes
);

export const strictRateLimiter = new RateLimiter(
    5, // 5 requests
    15 * 60 * 1000 // per 15 minutes (for sensitive operations)
);

/**
 * Extract client identifier from request (IP address)
 */
export function getClientIdentifier(request: NextRequest): string {
    // Try to get real IP from headers (if behind proxy/nginx)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // Fallback to connection IP
    return 'unknown';
}

/**
 * Check rate limit and return appropriate response if exceeded
 */
export function checkRateLimit(
    request: NextRequest,
    limiter: RateLimiter = apiRateLimiter
): { limited: boolean; identifier: string; info: ReturnType<typeof limiter.getRateLimitInfo> } {
    const identifier = getClientIdentifier(request);
    const limited = limiter.isRateLimited(identifier);
    const info = limiter.getRateLimitInfo(identifier);

    return { limited, identifier, info };
}

/**
 * Helper to create rate limit headers
 */
export function getRateLimitHeaders(info: ReturnType<typeof apiRateLimiter.getRateLimitInfo>): Record<string, string> {
    return {
        'X-RateLimit-Limit': info.limit.toString(),
        'X-RateLimit-Remaining': info.remaining.toString(),
        'X-RateLimit-Reset': new Date(info.resetTime).toISOString(),
    };
}

/**
 * Export for cleanup on shutdown
 */
export function destroyRateLimiters(): void {
    authRateLimiter.destroy();
    apiRateLimiter.destroy();
    strictRateLimiter.destroy();
}
