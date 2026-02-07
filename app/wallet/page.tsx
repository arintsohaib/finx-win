import { MultiCurrencyWalletPage } from '@/components/wallet/multi-currency-wallet-page';


/**
 * PROTECTED WALLET PAGE
 * Wrapped in strict AuthGuard to prevent access without valid wallet connection
 */
export default function Wallet() {
    return (
        <MultiCurrencyWalletPage />
    );
}
