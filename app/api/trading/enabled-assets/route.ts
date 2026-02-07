export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


/**
 * GET: Fetch all enabled trading assets from database
 * Returns symbols categorized by asset type (crypto, forex, precious_metals)
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch all enabled asset trading settings
    const enabledAssets = await prisma.assetTradingSettings.findMany({
      where: {
        isEnabled: true
      },
      select: {
        assetSymbol: true,
        assetName: true,
        assetType: true,
        isEnabled: true
      },
      orderBy: [
        { assetType: 'asc' },
        { assetSymbol: 'asc' }
      ]
    });

    // Categorize assets by type
    const cryptoSymbols: string[] = [];
    const forexSymbols: string[] = [];
    const metalSymbols: string[] = [];
    const stockSymbols: string[] = [];

    // Stablecoins that should not appear in trading (they are the base currency)
    const EXCLUDED_STABLECOINS = ['USDT', 'USDC'];

    enabledAssets.forEach((asset: any) => {
      const symbol = asset.assetSymbol.toUpperCase();
      const assetType = asset.assetType.toLowerCase(); // ✅ Case-insensitive matching

      // Match asset type (handle variations: CRYPTO/crypto, PRECIOUS_METAL/precious_metals, STOCK/stocks)
      if (assetType === 'crypto') {
        // ✅ Exclude stablecoins (USDT, USDC) from trading - they're base currency
        if (!EXCLUDED_STABLECOINS.includes(symbol)) {
          cryptoSymbols.push(symbol);
        } else {
          console.log(`⚠️ Excluding stablecoin ${symbol} from trading (base currency)`);
        }
      } else if (assetType === 'forex') {
        forexSymbols.push(symbol);
      } else if (assetType === 'precious_metal' || assetType === 'precious_metals') {
        metalSymbols.push(symbol);
      } else if (assetType === 'stock' || assetType === 'stocks') {
        stockSymbols.push(symbol);
      } else {
        console.warn(`⚠️ Unknown asset type "${asset.assetType}" for ${symbol}`);
      }
    });

    // All symbols combined for fetching prices
    const allSymbols = [...cryptoSymbols, ...forexSymbols, ...metalSymbols, ...stockSymbols];

    console.log(`✅ Dynamic assets loaded: ${allSymbols.length} total (Crypto: ${cryptoSymbols.length}, Forex: ${forexSymbols.length}, Metals: ${metalSymbols.length}, Stocks: ${stockSymbols.length})`);

    return NextResponse.json({
      success: true,
      data: {
        allSymbols,
        cryptoSymbols,
        forexSymbols,
        metalSymbols,
        stockSymbols,
        totalCount: allSymbols.length,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('❌ Error fetching enabled assets:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch enabled assets',
        data: {
          allSymbols: [],
          cryptoSymbols: [],
          forexSymbols: [],
          metalSymbols: [],
          totalCount: 0,
          timestamp: Date.now()
        }
      },
      { status: 500 }
    );
  }
}
