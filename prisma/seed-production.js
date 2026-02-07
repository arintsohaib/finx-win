const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_ASSETS = [
    { symbol: 'BTC', type: 'crypto', name: 'Bitcoin' },
    { symbol: 'ETH', type: 'crypto', name: 'Ethereum' },
    { symbol: 'USDT', type: 'crypto', name: 'Tether' },
    { symbol: 'BNB', type: 'crypto', name: 'BNB' },
    { symbol: 'XRP', type: 'crypto', name: 'XRP' },
    { symbol: 'SOL', type: 'crypto', name: 'Solana' },
    { symbol: 'USDC', type: 'crypto', name: 'USDC' },
    { symbol: 'DOGE', type: 'crypto', name: 'Dogecoin' },
    { symbol: 'ADA', type: 'crypto', name: 'Cardano' },
    { symbol: 'AVAX', type: 'crypto', name: 'Avalanche' },
    { symbol: 'EURUSD', type: 'forex', name: 'Euro / US Dollar' },
    { symbol: 'GBPUSD', type: 'forex', name: 'British Pound / US Dollar' },
    { symbol: 'USDJPY', type: 'forex', name: 'US Dollar / Japanese Yen' },
    { symbol: 'GOLD', type: 'precious_metal', name: 'Gold' },
    { symbol: 'SILVER', type: 'precious_metal', name: 'Silver' },
];

async function main() {
    console.log('🌱 Starting comprehensive production database seed...');

    // 1. Seed Asset Trading Settings
    console.log('\n--- Seeding Asset Trading Settings ---');
    for (const [index, asset] of DEFAULT_ASSETS.entries()) {
        await prisma.assetTradingSettings.upsert({
            where: { assetSymbol: asset.symbol },
            update: {
                assetName: asset.name,
                assetType: asset.type,
                isEnabled: true,
                sortOrder: index + 1,
            },
            create: {
                assetSymbol: asset.symbol,
                assetName: asset.name,
                assetType: asset.type,
                isEnabled: true,
                sortOrder: index + 1,
            },
        });
        console.log(`Verified Asset: ${asset.symbol}`);
    }

    // 2. Seed Crypto Wallets for Admin Settings
    console.log('\n--- Seeding Crypto Wallets (Admin Settings) ---');
    const cryptoAssets = DEFAULT_ASSETS.filter(a => a.type === 'crypto');
    for (const asset of cryptoAssets) {
        await prisma.cryptoWallet.upsert({
            where: { currency: asset.symbol },
            update: {
                isEnabled: true,
            },
            create: {
                currency: asset.symbol,
                walletAddress: '', // Admin needs to fill this
                isEnabled: true,
                network: 'Mainnet',
                minDepositUsdt: 10,
                minWithdrawUsdt: 10,
            },
        });
        console.log(`Verified Wallet Setting: ${asset.symbol}`);
    }

    // 3. Seed Default Admin
    console.log('\n--- Seeding Default Admin ---');
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
        // Verified hash for 'admin123'
        const passwordHash = '$2a$10$qNTArPGyXfTtqObW0lKR..olUJCKYJGCL6NIBW.8tv6VqikFz6MR6';
        const permissions = [
            'MANAGE_USERS', 'MANAGE_DEPOSITS', 'MANAGE_WITHDRAWALS',
            'MANAGE_TRADES', 'MANAGE_WALLET_SETTINGS', 'MANAGE_ADMINS',
            'MANAGE_TRADE_SETTINGS', 'MANAGE_CHAT'
        ];

        await prisma.admin.create({
            data: {
                username: 'admin',
                email: 'admin@finx.win',
                passwordHash,
                role: 'SUPER_ADMIN',
                permissions: JSON.stringify(permissions),
                isActive: true,
            },
        });
        console.log('Default super admin created: admin / admin123');
    } else {
        console.log('Admins already exist, skipping admin creation.');
    }

    console.log('\n✅ Comprehensive production seeding completed.');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
