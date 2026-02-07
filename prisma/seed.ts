
import { PrismaClient, AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Configuration for default assets (always enabled after database setup)
const DEFAULT_ASSETS = [
    // Top 9 Crypto for Trading (by market cap & volume)
    // These match SUPPORTED_CRYPTOS in lib/wallet-config.ts for wallet functionality
    { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
    { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
    { symbol: 'USDT', name: 'Tether', type: 'crypto' },
    { symbol: 'BNB', name: 'BNB', type: 'crypto' },
    { symbol: 'SOL', name: 'Solana', type: 'crypto' },
    { symbol: 'XRP', name: 'XRP', type: 'crypto' },
    { symbol: 'ADA', name: 'Cardano', type: 'crypto' },
    { symbol: 'DOGE', name: 'Dogecoin', type: 'crypto' },
    { symbol: 'USDC', name: 'USDC', type: 'crypto' },

    // Top 7 Forex Pairs (Always enabled by default)
    { symbol: 'EURUSD', name: 'Euro / US Dollar', type: 'forex' },
    { symbol: 'GBPUSD', name: 'British Pound / US Dollar', type: 'forex' },
    { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', type: 'forex' },
    { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', type: 'forex' },
    { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', type: 'forex' },
    { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', type: 'forex' },
    { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', type: 'forex' },

    // Top 4 Precious Metals (Always enabled by default)
    { symbol: 'GOLD', name: 'Gold', type: 'precious_metal' },
    { symbol: 'SILVER', name: 'Silver', type: 'precious_metal' },
    { symbol: 'PLATINUM', name: 'Platinum', type: 'precious_metal' },
    { symbol: 'PALLADIUM', name: 'Palladium', type: 'precious_metal' },

    // Top  // US Stocks
    { symbol: 'NVDA', name: 'NVIDIA', type: 'STOCK', isEnabled: true, sortOrder: 50 },
    { symbol: 'GOOGL', name: 'Alphabet', type: 'STOCK', isEnabled: true, sortOrder: 51 },
    { symbol: 'AAPL', name: 'Apple', type: 'STOCK', isEnabled: true, sortOrder: 52 },
    { symbol: 'MSFT', name: 'Microsoft', type: 'STOCK', isEnabled: true, sortOrder: 53 },
    { symbol: 'AMZN', name: 'Amazon', type: 'STOCK', isEnabled: true, sortOrder: 54 },
    { symbol: 'META', name: 'Meta', type: 'STOCK', isEnabled: true, sortOrder: 55 },
    { symbol: 'AVGO', name: 'Broadcom', type: 'STOCK', isEnabled: true, sortOrder: 56 },
    { symbol: 'TSLA', name: 'Tesla', type: 'STOCK', isEnabled: true, sortOrder: 57 },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway', type: 'STOCK', isEnabled: true, sortOrder: 58 },
    { symbol: 'LLY', name: 'Eli Lilly', type: 'STOCK', isEnabled: true, sortOrder: 59 },

    // World Stocks
    { symbol: 'TSM', name: 'TSMC', type: 'STOCK', isEnabled: true, sortOrder: 60 },
    { symbol: '2222.SR', name: 'Saudi Aramco', type: 'STOCK', isEnabled: true, sortOrder: 61 },
    { symbol: '0700.HK', name: 'Tencent', type: 'STOCK', isEnabled: true, sortOrder: 62 },
    { symbol: '005930.KS', name: 'Samsung', type: 'STOCK', isEnabled: true, sortOrder: 63 },
    { symbol: 'ASML', name: 'ASML', type: 'STOCK', isEnabled: true, sortOrder: 64 },
    { symbol: 'BABA', name: 'Alibaba', type: 'STOCK', isEnabled: true, sortOrder: 65 },
    { symbol: '000660.KS', name: 'SK Hynix', type: 'STOCK', isEnabled: true, sortOrder: 66 },
    { symbol: 'ROG.SW', name: 'Roche', type: 'STOCK', isEnabled: true, sortOrder: 67 },
    { symbol: '1398.HK', name: 'ICBC', type: 'STOCK', isEnabled: true, sortOrder: 68 },
    { symbol: 'MC.PA', name: 'LVMH', type: 'STOCK', isEnabled: true, sortOrder: 69 },
];

async function main() {
    console.log('🌱 Starting database seed...');

    // 1. Seed Asset Trading Settings (For Charts/Trading)
    console.log('\n--- Seeding Asset Trading Settings ---');
    for (const [index, asset] of DEFAULT_ASSETS.entries()) {
        const upsertedAsset = await prisma.assetTradingSettings.upsert({
            where: { assetSymbol: asset.symbol },
            update: {
                assetName: asset.name,
                assetType: asset.type,
                sortOrder: index + 1,
                // Don't overwrite enabled status if it exists, but ensure defaults are enabled if new
            },
            create: {
                assetSymbol: asset.symbol,
                assetName: asset.name,
                assetType: asset.type,
                isEnabled: true,
                sortOrder: index + 1,
            },
        });
        console.log(`Verified Asset: ${asset.symbol} (${asset.type})`);
    }

    // 2. Seed Crypto Wallets (For Deposits/Admin)
    // Only for assets of type 'crypto'
    console.log('\n--- Seeding Crypto Wallets ---');
    const cryptoAssets = DEFAULT_ASSETS.filter(a => a.type === 'crypto');

    for (const asset of cryptoAssets) {
        // Check if wallet exists
        const existingWallet = await prisma.cryptoWallet.findUnique({
            where: { currency: asset.symbol },
        });

        if (!existingWallet) {
            await prisma.cryptoWallet.create({
                data: {
                    currency: asset.symbol,
                    isEnabled: true, // Auto-enable so they show up in admin
                    walletAddress: '', // Empty address initially, admin must set it
                    network: 'Mainnet', // Default network
                },
            });
            console.log(`Created Wallet: ${asset.symbol}`);
        } else {
            console.log(`Wallet already exists: ${asset.symbol}`);
        }
    }


    // 3. Seed Default Admin User
    console.log('\n--- Seeding Default Admin User ---');
    const username = 'admin';
    const password = 'Password@2026!';
    const passwordHash = await bcrypt.hash(password, 10);

    // Correctly formatted JSON permissions
    const permissions = JSON.stringify([
        "MANAGE_USERS",
        "MANAGE_DEPOSITS",
        "MANAGE_WITHDRAWALS",
        "MANAGE_TRADES",
        "MANAGE_WALLET_SETTINGS",
        "MANAGE_ADMINS",
        "MANAGE_TRADE_SETTINGS",
        "MANAGE_CHAT"
    ]);

    await prisma.admin.upsert({
        where: { username },
        update: {
            passwordHash,
            permissions,
            isActive: true,
            role: AdminRole.SUPER_ADMIN,
        },
        create: {
            username,
            passwordHash,
            permissions,
            isActive: true,
            role: AdminRole.SUPER_ADMIN,
        },
    });
    console.log(`Verified Admin: ${username}`);

    console.log('\n✅ Seeding completed.');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
