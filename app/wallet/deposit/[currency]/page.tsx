
import { DepositPage } from '@/components/wallet/deposit-page';

interface DepositRouteProps {
    params: Promise<{
        currency: string;
    }>;
}

export default async function DepositRoute({ params }: DepositRouteProps) {
    const { currency: rawCurrency } = await params;
    const currency = rawCurrency.toUpperCase();

    return <DepositPage currency={currency} />;
}
