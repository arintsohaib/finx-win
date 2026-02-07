
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Wallet, Edit2, Check, X, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface BalanceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  uid: string;
  onSuccess: () => void;
}

interface WalletBalance {
  currency: string;
  balance: number;
  usdValue: number;
  logo: string;
  loading: boolean;
}

interface EditState {
  currency: string | null;
  originalUsdtValue: number;
  newUsdtValue: string;
  conversionRate: number;
}

export function BalanceManagementModal({
  isOpen,
  onClose,
  walletAddress,
  uid,
  onSuccess,
}: BalanceManagementModalProps) {
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [editState, setEditState] = useState<EditState>({
    currency: null,
    originalUsdtValue: 0,
    newUsdtValue: '',
    conversionRate: 0,
  });
  const [saving, setSaving] = useState(false);

  // Crypto logo mapping
  const getCryptoLogo = (currency: string): string => {
    const logoMap: Record<string, string> = {
      BTC: 'https://pbs.twimg.com/media/G1bv0PeXoAAPkh-.jpg',
      ETH: 'https://pbs.twimg.com/media/G2koLlnWAAAhKZl.jpg',
      LTC: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Litecoin_Logo.jpg/2048px-Litecoin_Logo.jpg',
      DOGE: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Shiba_Inu_coin_logo.png/250px-Shiba_Inu_coin_logo.png',
      USDT: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Tether_Logo.svg/2560px-Tether_Logo.svg.png',
      BNB: 'https://cdn.pixabay.com/photo/2021/04/30/16/47/bnb-6219388_1280.png',
      XRP: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Ripple_logo.svg/2560px-Ripple_logo.svg.png',
      ADA: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Cardano_Logo.jpg',
      SOL: 'https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png',
      DOT: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Polkadot_Logo.png',
      MATIC: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Polygon_Icon.svg/1200px-Polygon_Icon.svg.png',
      AVAX: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/03/Avalanche_logo_without_text.png/252px-Avalanche_logo_without_text.png',
    };
    return logoMap[currency] || 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1200px-Bitcoin.svg.png';
  };

  // Fetch all wallet balances with live prices
  const fetchWalletBalances = async () => {
    setLoading(true);
    try {
      // Token automatically sent via httpOnly cookie
      
      // Fetch user's balances using query parameter
      const balancesRes = await fetch(`/api/admin/wallets/balances?walletAddress=${encodeURIComponent(walletAddress)}`, {
        headers: {  },
      });
      
      if (!balancesRes.ok) {
        throw new Error('Failed to fetch balances');
      }
      
      const balancesData = await balancesRes.json();
      const userBalances = balancesData.balances || [];
      
      // Fetch live prices for all currencies
      const walletsWithPrices = await Promise.all(
        userBalances.map(async (bal: any) => {
          try {
            const priceRes = await fetch(`/api/crypto-rate?symbol=${bal.currency}`);
            const priceData = await priceRes.json();
            const rate = bal.currency === 'USDT' ? 1.0 : (priceData.price || 0);
            const balanceNum = parseFloat(bal.amount);
            
            return {
              currency: bal.currency,
              balance: balanceNum,
              usdValue: balanceNum * rate,
              logo: getCryptoLogo(bal.currency),
              loading: false,
            };
          } catch (err) {
            return {
              currency: bal.currency,
              balance: parseFloat(bal.amount),
              usdValue: 0,
              logo: getCryptoLogo(bal.currency),
              loading: false,
            };
          }
        })
      );
      
      setWallets(walletsWithPrices);
    } catch (error: any) {
      console.error('Error fetching wallet balances:', error);
      toast.error('Failed to load wallet balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && walletAddress) {
      fetchWalletBalances();
    }
  }, [isOpen, walletAddress]);

  // Start editing a USDT value
  const handleStartEdit = (currency: string, currentUsdtValue: number, conversionRate: number) => {
    setEditState({
      currency,
      originalUsdtValue: currentUsdtValue,
      newUsdtValue: currentUsdtValue.toFixed(2),
      conversionRate,
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditState({
      currency: null,
      originalUsdtValue: 0,
      newUsdtValue: '',
      conversionRate: 0,
    });
  };

  // Save edited USDT value
  const handleSaveEdit = async (currency: string) => {
    const newUsdtValue = parseFloat(editState.newUsdtValue);
    
    // Validation
    if (isNaN(newUsdtValue) || newUsdtValue < 0) {
      toast.error('Invalid USDT value entered');
      return;
    }
    
    if (newUsdtValue === editState.originalUsdtValue) {
      toast.error('No changes detected');
      handleCancelEdit();
      return;
    }

    setSaving(true);

    try {
      // Token automatically sent via httpOnly cookie
      
      const response = await fetch('/api/admin/wallets/update-by-usdt', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
                  },
        body: JSON.stringify({
          walletAddress,
          uid,
          currency,
          usdtValue: newUsdtValue,
          oldUsdtValue: editState.originalUsdtValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update balance');
      }

      // Determine action type
      const usdtDiff = newUsdtValue - editState.originalUsdtValue;
      const actionType = usdtDiff > 0 ? 'Added' : 'Removed';
      const actionSymbol = usdtDiff > 0 ? '+' : '−';
      const changeUsdtAmount = Math.abs(usdtDiff);
      const changeCryptoAmount = data.data.changeCryptoAmount;
      
      toast.success(
        `${actionSymbol} ${actionType} ${changeCryptoAmount.toFixed(8)} ${currency} (≈ $${changeUsdtAmount.toFixed(2)}) @ ${data.data.conversionRate.toFixed(2)} USDT/${currency}`,
        { duration: 5000 }
      );
      
      // Refresh balances
      await fetchWalletBalances();
      handleCancelEdit();
      onSuccess();
    } catch (error: any) {
      console.error('Error updating balance:', error);
      toast.error(error.message || 'Failed to update balance by USDT value');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    handleCancelEdit();
    onClose();
  };

  // Calculate total portfolio value
  const totalPortfolioValue = wallets.reduce((sum: any, wallet: any) => sum + wallet.usdValue, 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            Manage Balances for UID-{uid}
          </DialogTitle>
          <DialogDescription>
            Click on any USDT Value to edit it inline. The crypto balance will be recalculated automatically using live CoinMarketCap rates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* User Info */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Wallet Address</p>
                <p className="text-xs font-mono text-primary mt-1">
                  {walletAddress.slice(0, 12)}...{walletAddress.slice(-10)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">Total Portfolio Value</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Wallets Table */}
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading wallet balances...</p>
            </div>
          ) : wallets.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[100px]">Coin</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                    <TableHead className="text-right">USDT Value</TableHead>
                    <TableHead className="text-center w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallets.map((wallet) => {
                    const isEditing = editState.currency === wallet.currency;
                    
                    // Calculate conversion rate (for display and editing)
                    const conversionRate = wallet.balance > 0 ? wallet.usdValue / wallet.balance : 0;
                    
                    // Calculate USDT difference when editing
                    const usdtDiff = isEditing 
                      ? parseFloat(editState.newUsdtValue || '0') - editState.originalUsdtValue
                      : 0;
                    const showChange = isEditing && usdtDiff !== 0;
                    
                    // Calculate new crypto balance preview
                    const previewCryptoBalance = isEditing && conversionRate > 0
                      ? parseFloat(editState.newUsdtValue || '0') / conversionRate
                      : wallet.balance;

                    return (
                      <TableRow 
                        key={wallet.currency} 
                        className={`${isEditing ? 'bg-blue-50 dark:bg-blue-950/20' : 'hover:bg-muted/50'} transition-colors`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <img 
                              src={wallet.logo} 
                              alt={wallet.currency} 
                              className="w-8 h-8 rounded-full"
                              onError={(e) => {
                                e.currentTarget.src = 'https://pbs.twimg.com/media/G4hZ6p4XMAARsmM.jpg';
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold">{wallet.currency}</span>
                            {conversionRate > 0 && (
                              <span className="text-xs text-muted-foreground">
                                1 {wallet.currency} = ${conversionRate.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-mono text-sm">
                              {isEditing ? previewCryptoBalance.toFixed(8) : wallet.balance.toFixed(8)}
                            </span>
                            {isEditing && (
                              <Badge variant="outline" className="text-xs">
                                Auto-calculated
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-muted-foreground text-sm">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editState.newUsdtValue}
                                onChange={(e) => setEditState({ ...editState, newUsdtValue: e.target.value })}
                                className="w-40 text-right font-mono"
                                autoFocus
                                disabled={saving}
                              />
                              {showChange && (
                                <Badge 
                                  variant="outline" 
                                  className={`ml-2 ${usdtDiff > 0 ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}
                                >
                                  {usdtDiff > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                  {usdtDiff > 0 ? '+' : ''}${Math.abs(usdtDiff).toFixed(2)}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(wallet.currency, wallet.usdValue, conversionRate)}
                              className="font-mono text-primary hover:text-primary/80 transition-colors flex items-center justify-end w-full gap-2 group"
                            >
                              <span>${wallet.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                                onClick={() => handleSaveEdit(wallet.currency)}
                                disabled={saving}
                              >
                                {saving ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                                onClick={handleCancelEdit}
                                disabled={saving}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-3 text-xs"
                              onClick={() => handleStartEdit(wallet.currency, wallet.usdValue, conversionRate)}
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="h-16 w-16 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No Wallets Found</p>
              <p className="text-sm mt-1">User has no active wallet balances</p>
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">USDT-Based Balance Editing:</p>
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>Click on any USDT Value to edit it directly (crypto balance is auto-calculated)</li>
                  <li>Live CoinMarketCap rates ensure accurate conversions (displayed under each coin symbol)</li>
                  <li>System automatically detects whether you're adding or removing funds</li>
                  <li>All changes are logged in Activity Log with full audit trail</li>
                  <li>Updates sync instantly via WebSocket across all modules (wallet, trade, portfolio)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
