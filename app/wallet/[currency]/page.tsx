import { IndividualWalletPage } from '@/components/wallet/individual-wallet-page';

interface WalletPageProps {
  params: Promise<{
    currency: string;
  }>;
}

export default async function CurrencyWallet({ params }: WalletPageProps) {
  const { currency: rawCurrency } = await params;
  const currency = rawCurrency.toUpperCase();

  return <IndividualWalletPage currency={currency} />;
}
