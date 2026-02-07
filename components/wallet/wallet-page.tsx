

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Wallet, AlertTriangle, DollarSign, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { SUPPORTED_CURRENCIES, CURRENCY_NAMES } from '@/lib/types';
import { SUPPORTED_CRYPTOS } from '@/lib/wallet-config';
import { toast } from 'sonner';

// Crypto Icon Component with proper error handling
function CryptoIcon({ currency, isUSDT }: { currency: string; isUSDT: boolean }) {
  const [imageError, setImageError] = useState(false);
  const cryptoConfig = SUPPORTED_CRYPTOS[currency];

  // Reset error state when currency changes
  useEffect(() => {
    setImageError(false);
  }, [currency]);

  if (!cryptoConfig?.logoUrl || imageError) {
    return (
      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${isUSDT
        ? 'bg-gradient-to-br from-[#00D9C0] to-blue-500 text-white shadow-md'
        : 'bg-[#00D9C0]/10 text-[#00D9C0]'
        }`}>
        {cryptoConfig?.icon || currency.charAt(0)}
      </div>
    );
  }

  return (
    <div className="relative">
      <img
        src={cryptoConfig.logoUrl}
        alt={currency}
        className={`w-12 h-12 rounded-full object-cover ${isUSDT
          ? 'ring-2 ring-[#00D9C0] shadow-md'
          : 'ring-2 ring-[#00D9C0]/30'
          }`}
        onError={() => setImageError(true)}
      />
    </div>
  );
}

export function WalletPage() {
  const router = useRouter();
  const { user, refreshBalances } = useAuthStore();
  const [activeTab, setActiveTab] = useState('deposit');

  // Deposit state
  const [searchTerm, setSearchTerm] = useState('');

  // Withdrawal state
  const [selectedCurrency, setSelectedCurrency] = useState('BTC');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleWalletSelect = (currency: string) => {
    router.push(`/wallet/deposit/${currency.toLowerCase()}`);
  };

  const handleMaxClick = () => {
    const realBalance = parseFloat(user?.balanceDetails?.[selectedCurrency]?.realBalance || '0');
    const realWinnings = parseFloat(user?.balanceDetails?.[selectedCurrency]?.realWinnings || '0');
    const withdrawableBalance = realBalance + realWinnings;
    setAmount(withdrawableBalance.toFixed(8));
  };

  const handleWithdrawalSubmit = async () => {
    if (!destinationAddress || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amountValue = parseFloat(amount);

    if (isNaN(amountValue) || amountValue < 10) {
      toast.error('Minimum withdrawal amount is 10 USDT equivalent');
      return;
    }

    const realBalance = parseFloat(user?.balanceDetails?.[selectedCurrency]?.realBalance || '0');
    const realWinnings = parseFloat(user?.balanceDetails?.[selectedCurrency]?.realWinnings || '0');
    const withdrawableBalance = realBalance + realWinnings;

    if (withdrawableBalance < amountValue) {
      toast.error('Insufficient withdrawable balance.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: selectedCurrency,
          amount: amountValue,
          destinationAddress
        })
      });

      if (response.ok) {
        toast.success('Withdrawal request submitted! Amount frozen pending admin approval.');
        await refreshBalances();
        setDestinationAddress('');
        setAmount('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit withdrawal request');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCurrencies = SUPPORTED_CURRENCIES
    .filter((currency: any) =>
      currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (CURRENCY_NAMES as any)[currency].toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // USDT always comes first
      if (a === 'USDT') return -1;
      if (b === 'USDT') return 1;
      return 0;
    });

  const realBalance = parseFloat(user?.balanceDetails?.[selectedCurrency]?.realBalance || '0');
  const realWinnings = parseFloat(user?.balanceDetails?.[selectedCurrency]?.realWinnings || '0');
  const frozenBalance = parseFloat(user?.balanceDetails?.[selectedCurrency]?.frozenBalance || '0');
  const withdrawableBalance = realBalance + realWinnings;
  const totalBalance = withdrawableBalance;

  const amountValue = parseFloat(amount) || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="gradientGhost"
              size="sm"
              onClick={handleBack}
              className="hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold gradient-text-simple">Wallet</h1>
          </div>
        </div>

        <Card className="glass-card">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="deposit">Deposit</TabsTrigger>
                <TabsTrigger value="withdrawal">Withdrawal</TabsTrigger>
              </TabsList>

              {/* DEPOSIT TAB */}
              <TabsContent value="deposit" className="mt-0">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Send Crypto Now</h2>
                    <p className="text-sm text-muted-foreground">
                      Choose a wallet to send crypto from
                    </p>
                  </div>

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                    {filteredCurrencies.map((currency) => {
                      const walletBalance = user?.balances?.[currency] || '0';
                      const isUSDT = currency === 'USDT';

                      return (
                        <Card
                          key={currency}
                          className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] relative overflow-hidden ${isUSDT
                            ? 'bg-gradient-to-br from-[#00D9C0]/10 via-blue-500/10 to-purple-500/10 border-2 border-[#00D9C0]/30'
                            : ''
                            }`}
                          onClick={() => handleWalletSelect(currency)}
                        >
                          {isUSDT && (
                            <div className="absolute top-2 right-2 z-10">
                              <span className="text-[9px] font-bold bg-gradient-to-r from-[#00D9C0] to-blue-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                                DEFAULT
                              </span>
                            </div>
                          )}
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 flex-shrink-0">
                                  <CryptoIcon currency={currency} isUSDT={isUSDT} />
                                </div>
                                <div>
                                  <h3 className={`font-semibold ${isUSDT ? 'text-[#00D9C0]' : ''}`}>
                                    {currency} Wallet
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {(CURRENCY_NAMES as any)[currency]}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-mono text-sm font-medium ${isUSDT ? 'text-[#00D9C0]' : ''}`}>
                                  {parseFloat(walletBalance).toFixed(7)}
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
                </div>
              </TabsContent>

              {/* WITHDRAWAL TAB */}
              <TabsContent value="withdrawal" className="mt-0">
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-lg font-semibold mb-2">Withdrawal</h2>
                    <p className="text-sm text-muted-foreground">
                      Send your crypto to an external wallet
                    </p>
                  </div>

                  {/* Balance Display */}
                  <div className="space-y-3">
                    <Card className="glass-card relative overflow-hidden">
                      <div className="gradient-overlay" />
                      <CardContent className="p-6 relative z-10">
                        <div className="text-center">
                          <p className="text-muted-foreground text-sm">Total Balance</p>
                          <p className="text-3xl font-bold gradient-text-simple">
                            {totalBalance.toFixed(7)} {selectedCurrency}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Balance Breakdown */}
                    <Card className="glass-card bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                          <Info className="h-4 w-4 mr-2" />
                          Balance Breakdown
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-800 dark:text-blue-200">Deposited Funds:</span>
                            <span className="font-mono text-blue-900 dark:text-blue-100 font-medium">
                              {realBalance.toFixed(7)} {selectedCurrency}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-800 dark:text-blue-200">Trading Winnings:</span>
                            <span className="font-mono text-blue-900 dark:text-blue-100 font-medium">
                              {realWinnings.toFixed(7)} {selectedCurrency}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-blue-300 dark:border-blue-700 pt-1">
                            <span className="text-blue-900 dark:text-blue-100 font-semibold">Withdrawable:</span>
                            <span className="font-mono text-blue-900 dark:text-blue-100 font-bold">
                              {withdrawableBalance.toFixed(7)} {selectedCurrency}
                            </span>
                          </div>
                          {frozenBalance > 0 && (
                            <div className="flex justify-between border-t border-orange-300 dark:border-orange-700 pt-1 text-xs">
                              <span className="text-orange-700 dark:text-orange-300">Pending Approval:</span>
                              <span className="font-mono text-orange-700 dark:text-orange-300 font-semibold">
                                {frozenBalance.toFixed(7)} {selectedCurrency}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    {/* Currency Selection */}
                    <div>
                      <Label htmlFor="currency" className="text-sm font-medium">
                        Currency
                      </Label>
                      <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_CURRENCIES.map((curr: any) => (
                            <SelectItem key={curr} value={curr}>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{curr}</span>
                                <span className="text-muted-foreground text-sm">
                                  {(CURRENCY_NAMES as any)[curr]}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Destination Address */}
                    <div>
                      <Label htmlFor="address" className="text-sm font-medium">
                        Destination Address
                      </Label>
                      <Input
                        id="address"
                        placeholder="Enter wallet address"
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        className="mt-1 font-mono text-sm"
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <Label htmlFor="amount" className="text-sm font-medium">
                          Amount
                        </Label>
                        <Button
                          type="button"
                          variant="gradientGhost"
                          size="sm"
                          onClick={handleMaxClick}
                          className="text-[#00D9C0] hover:text-[#00C0AA] text-sm"
                        >
                          Max
                        </Button>
                      </div>
                      <div className="flex">
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0.00000000"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="flex-1 font-mono"
                          min="0"
                          step="0.00000001"
                        />
                        <div className="ml-2 bg-muted px-3 py-2 rounded-md text-sm font-medium border">
                          {selectedCurrency}
                        </div>
                      </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center space-x-2 text-sm font-medium">
                        <DollarSign className="h-4 w-4" />
                        <span>Transaction Details</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Minimum Withdrawal Amount:
                          </span>
                          <span>10.00 USDT ($ 10.00)</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-medium">
                          <span>Withdrawal Amount:</span>
                          <span>{amountValue.toFixed(8)} {selectedCurrency}</span>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleWithdrawalSubmit}
                      disabled={
                        isSubmitting ||
                        !destinationAddress ||
                        !amount ||
                        amountValue < 10 ||
                        withdrawableBalance < amountValue
                      }
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        'Send now'
                      )}
                    </Button>

                    {/* Warnings */}
                    <div className="space-y-3">
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-yellow-800">
                            Withdrawal requests will be frozen until approved by an admin.
                            Please check if your receiving address is correct before sending.
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                        <p className="text-sm text-red-800 font-medium">
                          Please do not transfer funds to strangers
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
