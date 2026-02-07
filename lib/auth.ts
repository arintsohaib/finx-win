
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from './db';

// SECURITY: JWT_SECRET must be set via environment variable - no fallback allowed
const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

if (!JWT_SECRET) {
  throw new Error(
    'CRITICAL SECURITY ERROR: NEXTAUTH_SECRET environment variable is not set. ' +
    'Application cannot start without a secure JWT secret. ' +
    'Generate one using: openssl rand -base64 32'
  );
}

export interface AuthPayload {
  walletAddress: string;
  timestamp: number;
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function createAuthMessage(address: string, nonce: string): string {
  return `Welcome to FinX Trading!\n\nPlease sign this message to authenticate your wallet.\n\nWallet: ${address}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
}

export function generateToken(walletAddress: string): string {
  const payload: AuthPayload = {
    walletAddress,
    timestamp: Date.now()
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '180d', // Token valid for 180 days (6 months)
    issuer: 'finx-trading',
    subject: walletAddress
  });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

// Get admin setting with default value
async function getAdminSetting(key: string, defaultValue: string): Promise<string> {
  try {
    const setting = await prisma.adminSettings.findUnique({
      where: { key }
    });

    if (setting) {
      return setting.value;
    }

    // Create default setting if it doesn't exist
    await prisma.adminSettings.create({
      data: {
        key,
        value: defaultValue,
        description: getAdminSettingDescription(key)
      }
    });

    return defaultValue;
  } catch (error) {
    console.error('Error fetching admin setting:', error);
    return defaultValue;
  }
}

function getAdminSettingDescription(key: string): string {
  const descriptions: Record<string, string> = {
  };

  return descriptions[key] || '';
}

// Generate a unique 6-digit numeric UID
async function generateUniqueUID(): Promise<string> {
  let uid = '';
  let isUnique = false;

  while (!isUnique) {
    // Generate a 6-digit random number
    uid = Math.floor(100000 + Math.random() * 900000).toString();

    // Check if it's unique
    const existing = await prisma.user.findUnique({
      where: { uid }
    });

    if (!existing) {
      isUnique = true;
    }
  }

  return uid;
}

export async function createOrUpdateUser(walletAddress: string) {
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { walletAddress }
    });

    let user;
    if (existingUser) {
      // Update existing user
      user = await prisma.user.update({
        where: { walletAddress },
        data: {
          lastLogin: new Date()
        }
      });
    } else {
      // Create new user with unique UID
      const uid = await generateUniqueUID();

      user = await prisma.user.create({
        data: {
          walletAddress,
          uid,
          createdAt: new Date(),
          lastLogin: new Date()
        }
      });
    }

    // Initialize default balances for new users
    const supportedCurrencies = ['USDT', 'BTC', 'ETH', 'DOGE', 'ADA', 'LTC', 'XRP', 'SOL', 'PI'];

    for (const currency of supportedCurrencies) {
      await prisma.balance.upsert({
        where: {
          walletAddress_currency: {
            walletAddress,
            currency
          }
        },
        update: {},
        create: {
          walletAddress,
          currency,
          amount: 0 // Initialize all balances at 0
        }
      });
    }

    return user;
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
}

export async function getUserBalances(walletAddress: string) {
  try {
    const balances = await prisma.balance.findMany({
      where: { walletAddress }
    });

    const balanceMap: Record<string, string> = {};
    balances.forEach((balance: any) => {
      // Robust balance calculation: use the maximum of 'amount' and the sum of real funds.
      // This ensures available funds are visible even if fields are out of sync.
      const calculatedReal = parseFloat(balance.realBalance.toString()) + parseFloat(balance.realWinnings.toString());
      const displayAmount = parseFloat(balance.amount.toString());

      const effectiveBalance = Math.max(calculatedReal, displayAmount);
      balanceMap[balance.currency] = effectiveBalance.toString();
    });

    return balanceMap;
  } catch (error) {
    console.error('Error fetching user balances:', error);
    return {};
  }
}

export async function updateUserBalance(
  walletAddress: string,
  currency: string,
  amount: number | string,
  operation: 'add' | 'subtract' | 'set' = 'set'
) {
  try {
    const currentBalance = await prisma.balance.findUnique({
      where: {
        walletAddress_currency: {
          walletAddress,
          currency
        }
      }
    });

    let newAmount = parseFloat(amount.toString());

    if (currentBalance && operation !== 'set') {
      const current = parseFloat(currentBalance.amount.toString());
      if (operation === 'add') {
        newAmount = current + newAmount;
      } else if (operation === 'subtract') {
        newAmount = current - newAmount;
      }
    }

    const updatedBalance = await prisma.balance.upsert({
      where: {
        walletAddress_currency: {
          walletAddress,
          currency
        }
      },
      update: {
        amount: newAmount,
        updatedAt: new Date()
      },
      create: {
        walletAddress,
        currency,
        amount: newAmount
      }
    });

    return updatedBalance;
  } catch (error) {
    console.error('Error updating user balance:', error);
    throw error;
  }
}
