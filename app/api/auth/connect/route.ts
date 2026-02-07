export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { generateToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
// ✅ CRITICAL FIX: Race condition prevention
// Track active login attempts to prevent duplicate logins
const activeLogins = new Map<string, Promise<any>>();

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, signature, message } = await request.json();

    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ✅ CRITICAL FIX: Prevent race conditions from duplicate login attempts
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Check if there's already a login in progress for this wallet
    const existingLogin = activeLogins.get(normalizedAddress);
    if (existingLogin) {
      console.log(`[Auth Connect] Login already in progress for ${normalizedAddress}, waiting...`);
      try {
        // Wait for the existing login to complete and return its result
        return await existingLogin;
      } catch (error) {
        // If existing login failed, allow retry
        activeLogins.delete(normalizedAddress);
      }
    }

    // Create a promise for this login attempt
    const loginPromise = (async () => {
      try {
        // Verify signature
        const recoveredAddress = ethers.verifyMessage(message, signature);
        
        if (recoveredAddress.toLowerCase() !== normalizedAddress) {
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 }
          );
        }

        // ✅ SECURITY FIX: Validate timestamp to prevent replay attacks
        // Extract timestamp from message format: "...Timestamp: ${timestamp}"
        const timestampMatch = message.match(/Timestamp:\s*(\d+)/);
        if (timestampMatch) {
          const messageTimestamp = parseInt(timestampMatch[1]);
          const now = Date.now();
          const signatureAge = now - messageTimestamp;
          
          // Reject signatures older than 5 minutes (300,000 ms)
          if (signatureAge > 5 * 60 * 1000) {
            return NextResponse.json(
              { error: 'Signature expired. Please sign again.' },
              { status: 401 }
            );
          }
          
          // Reject future timestamps (allow 1 minute clock skew)
          if (signatureAge < -60 * 1000) {
            return NextResponse.json(
              { error: 'Invalid timestamp. Please check your system clock.' },
              { status: 401 }
            );
          }
        } else {
          // Log warning if timestamp is missing (for monitoring)
          console.warn('[Auth Connect] Signature without timestamp detected - wallet:', normalizedAddress);
        }

        // Find or create user
        let user = await prisma.user.findUnique({
          where: { walletAddress: normalizedAddress }
        });

        if (!user) {
          // Generate unique 6-digit UID
          let uid = '';
          let isUnique = false;
          
          while (!isUnique) {
            uid = Math.floor(100000 + Math.random() * 900000).toString();
            const existing = await prisma.user.findUnique({
              where: { uid }
            });
            isUnique = !existing;
          }

          // Create new user
          user = await prisma.user.create({
            data: {
              walletAddress: normalizedAddress,
              uid,
              lastLogin: new Date()
            }
          });

          // Create initial balance records for all supported currencies
          const currencies = ['BTC', 'ETH', 'USDT', 'DOGE', 'ADA', 'LTC', 'XRP', 'SOL', 'PI'];
          
          for (const currency of currencies) {
            await prisma.balance.create({
              data: {
                walletAddress: user.walletAddress,
                currency,
                amount: 0
              }
            });
          }
          
          console.log(`[Auth Connect] New user created - UID: ${uid}, Wallet: ${normalizedAddress}`);
        } else {
          // Update existing user
          const updates: any = {
            lastLogin: new Date()
          };

          // Generate UID if missing or invalid
          if (!user.uid || user.uid === '000000' || user.uid.length !== 6) {
            let uid = '';
            let isUnique = false;
            
            while (!isUnique) {
              uid = Math.floor(100000 + Math.random() * 900000).toString();
              const existing = await prisma.user.findUnique({
                where: { uid }
              });
              isUnique = !existing || existing.walletAddress === user.walletAddress;
            }
            
            updates.uid = uid;
          }

          user = await prisma.user.update({
            where: { walletAddress: user.walletAddress },
            data: updates
          });
          
          console.log(`[Auth Connect] Existing user logged in - UID: ${user.uid}, Wallet: ${normalizedAddress}`);
        }

        // Generate auth token
        const token = generateToken(user.walletAddress);

        // Set cookie and return response
        const response = NextResponse.json({
          success: true,
          user: {
            walletAddress: user.walletAddress,
            uid: user.uid,
            createdAt: user.createdAt
          }
        });

        // Set auth token cookie (30 days)
        response.cookies.set('auth-token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 // 30 days
        });

        return response;
      } catch (error) {
        console.error('[Auth Connect] Login error:', error);
        throw error; // Re-throw to be handled by outer catch
      }
    })();

    // Store the login promise
    activeLogins.set(normalizedAddress, loginPromise);

    // Execute and cleanup
    try {
      const result = await loginPromise;
      return result;
    } finally {
      // Always cleanup, regardless of success or failure
      activeLogins.delete(normalizedAddress);
    }

  } catch (error) {
    console.error('[Auth Connect] Authentication failed:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
