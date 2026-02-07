
import { TradeDetails } from '@/components/trading/trade-details';

interface TradeDetailsRouteProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function TradeDetailsRoute({ params }: TradeDetailsRouteProps) {
    const { id } = await params;

    return <TradeDetails tradeId={id} />;
}
