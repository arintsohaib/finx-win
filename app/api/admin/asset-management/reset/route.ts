export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-middleware';
// Default assets to restore
const DEFAULT_ASSETS = [
    // Top 9 Crypto
    { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO', order: 1 },
    { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO', order: 2 },
    { symbol: 'USDT', name: 'Tether', type: 'CRYPTO', order: 3 },
    { symbol: 'BNB', name: 'BNB', type: 'CRYPTO', order: 4 },
    { symbol: 'SOL', name: 'Solana', type: 'CRYPTO', order: 5 },
    { symbol: 'XRP', name: 'XRP', type: 'CRYPTO', order: 6 },
    { symbol: 'ADA', name: 'Cardano', type: 'CRYPTO', order: 7 },
    { symbol: 'DOGE', name: 'Dogecoin', type: 'CRYPTO', order: 8 },
    { symbol: 'USDC', name: 'USDC', type: 'CRYPTO', order: 9 },

    // 7 Forex Pairs
    { symbol: 'EURUSD', name: 'Euro / US Dollar', type: 'FOREX', order: 10 },
    { symbol: 'GBPUSD', name: 'British Pound / US Dollar', type: 'FOREX', order: 11 },
    { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', type: 'FOREX', order: 12 },
    { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', type: 'FOREX', order: 13 },
    { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', type: 'FOREX', order: 14 },
    { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', type: 'FOREX', order: 15 },
    { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', type: 'FOREX', order: 16 },

    // 4 Precious Metals
    { symbol: 'GOLD', name: 'Gold', type: 'PRECIOUS_METAL', order: 17 },
    { symbol: 'SILVER', name: 'Silver', type: 'PRECIOUS_METAL', order: 18 },
    { symbol: 'PLATINUM', name: 'Platinum', type: 'PRECIOUS_METAL', order: 19 },
    { symbol: 'PALLADIUM', name: 'Palladium', type: 'PRECIOUS_METAL', order: 20 },

    // US Stocks
    { symbol: 'NVDA', name: 'NVIDIA', type: 'STOCK', order: 50 },
    { symbol: 'GOOGL', name: 'Alphabet', type: 'STOCK', order: 51 },
    { symbol: 'AAPL', name: 'Apple', type: 'STOCK', order: 52 },
    { symbol: 'MSFT', name: 'Microsoft', type: 'STOCK', order: 53 },
    { symbol: 'AMZN', name: 'Amazon', type: 'STOCK', order: 54 },
    { symbol: 'META', name: 'Meta', type: 'STOCK', order: 55 },
    { symbol: 'AVGO', name: 'Broadcom', type: 'STOCK', order: 56 },
    { symbol: 'TSLA', name: 'Tesla', type: 'STOCK', order: 57 },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway', type: 'STOCK', order: 58 },
    { symbol: 'LLY', name: 'Eli Lilly', type: 'STOCK', order: 59 },

    // World Stocks
    { symbol: 'TSM', name: 'TSMC', type: 'STOCK', order: 60 },
    { symbol: '2222.SR', name: 'Saudi Aramco', type: 'STOCK', order: 61 },
    { symbol: '0700.HK', name: 'Tencent', type: 'STOCK', order: 62 },
    { symbol: '005930.KS', name: 'Samsung', type: 'STOCK', order: 63 },
    { symbol: 'ASML', name: 'ASML', type: 'STOCK', order: 64 },
    { symbol: 'BABA', name: 'Alibaba', type: 'STOCK', order: 65 },
    { symbol: '000660.KS', name: 'SK Hynix', type: 'STOCK', order: 66 },
    { symbol: 'ROG.SW', name: 'Roche', type: 'STOCK', order: 67 },
    { symbol: '1398.HK', name: 'ICBC', type: 'STOCK', order: 68 },
    { symbol: 'MC.PA', name: 'LVMH', type: 'STOCK', order: 69 },
];

/**
 * POST /api/admin/asset-management/reset
 * Reset all assets to defaults (20 essential assets)
 */
export async function POST(request: NextRequest) {
    try {
        // Check admin authentication
        const authResult = await requireAdmin(request);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        // Delete all existing assets
        await prisma.assetTradingSettings.deleteMany({});

        // Insert default assets
        const createdAssets = await prisma.assetTradingSettings.createMany({
            data: DEFAULT_ASSETS.map(asset => ({
                assetSymbol: asset.symbol,
                assetName: asset.name,
                assetType: asset.type,
                isEnabled: true,
                sortOrder: asset.order,
            })),
        });

        return NextResponse.json({
            success: true,
            count: createdAssets.count,
            message: `Reset complete: ${createdAssets.count} default assets restored`,
        });
    } catch (error) {
        console.error('[Asset Management API] Error resetting assets:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to reset assets' },
            { status: 500 }
        );
    }
}
