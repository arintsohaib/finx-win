const { PrismaClient } = require('@prisma/client');

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
