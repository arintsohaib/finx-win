
import { TradePage } from '@/components/trading/trade-page';

interface TradeRouteProps {
    params: Promise<{
        asset: string;
    }>;
}

export default async function TradeRoute({ params }: TradeRouteProps) {
    const { asset } = await params;

    return <TradePage asset={asset} />;
}
