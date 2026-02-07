
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { SUPPORTED_CURRENCIES, CURRENCY_NAMES } from '@/lib/types';

const CURRENCY_ICONS: Record<string, string> = {
  BTC: '₿',
  ETH: 'Ξ',
  USDT: '₮',
  DOGE: 'Ð',
  ADA: '₳',
  LTC: 'Ł',
  XRP: 'X',
  SOL: '◎',
  PI: 'π'
};

export function DepositDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  const handleBack = () => {
    router.back();
  };

  const handleWalletSelect = (currency: string) => {
    router.push(`/deposit/${currency.toLowerCase()}`);
  };

  const filteredCurrencies = SUPPORTED_CURRENCIES.filter((currency: any) =>
    currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (CURRENCY_NAMES as any)[currency].toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen gradient-subtle">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="hover:bg-white dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold gradient-text-simple">Send Crypto Now</h1>
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg gradient-text-simple">Choose a wallet to send crypto from</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search wallets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Wallet List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCurrencies.map((currency) => {
                const balance = user?.balances?.[currency] || '0';

                return (
                  <Card
                    key={currency}
                    className="glass-card cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                    onClick={() => handleWalletSelect(currency)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-[#00D9C0]/10 flex items-center justify-center font-bold text-[#00D9C0] text-lg">
                            {CURRENCY_ICONS[currency]}
                          </div>
                          <div>
                            <h3 className="font-semibold">{currency} wallet</h3>
                            <p className="text-sm text-muted-foreground">
                              {(CURRENCY_NAMES as any)[currency]}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-medium">
                            {parseFloat(balance).toFixed(7)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {currency}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredCurrencies.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No wallets found</p>
                <p>Try adjusting your search term</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
