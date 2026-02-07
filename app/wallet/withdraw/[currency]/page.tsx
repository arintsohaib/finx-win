
import { WithdrawPage } from '@/components/wallet/withdraw-page';

interface WithdrawRouteProps {
    params: Promise<{
        currency: string;
    }>;
}

export default async function WithdrawRoute({ params }: WithdrawRouteProps) {
    const { currency: rawCurrency } = await params;
    const currency = rawCurrency.toUpperCase();

    return <WithdrawPage currency={currency} />;
}
