
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Edit, Plus, Trash2, Upload, QrCode, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import QRCodeLib from 'qrcode';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CryptoWallet {
  id: string;
  currency: string;
  walletAddress: string;
  network: string | null;
  qrCodeUrl: string | null;
  minDepositUsdt: number;
  minWithdrawUsdt: number;
  isEnabled: boolean;
}

const SUPPORTED_CRYPTOS = [
  { symbol: 'BTC', name: 'Bitcoin', networks: ['Bitcoin', 'BTC (Legacy)', 'BTC (SegWit)'] },
  { symbol: 'ETH', name: 'Ethereum', networks: ['Ethereum (ERC20)'] },
  { symbol: 'USDT', name: 'Tether', networks: ['ERC20', 'TRC20', 'BEP20'] },
  { symbol: 'BNB', name: 'Binance Coin', networks: ['BEP20', 'BSC'] },
  { symbol: 'DOGE', name: 'Dogecoin', networks: ['Dogecoin'] },
  { symbol: 'LTC', name: 'Litecoin', networks: ['Litecoin'] },
  { symbol: 'XRP', name: 'Ripple', networks: ['XRP Ledger'] },
  { symbol: 'ADA', name: 'Cardano', networks: ['Cardano'] },
  { symbol: 'SOL', name: 'Solana', networks: ['Solana'] },
];

export function WalletSettingsTab() {
  const [wallets, setWallets] = useState<CryptoWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<CryptoWallet | null>(null);
  const [isNewWallet, setIsNewWallet] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/crypto-wallets');
      if (response.ok) {
        const data = await response.json();
        setWallets(data.wallets || []);
      }
    } catch (error) {
      console.error('Error fetching wallets:', error);
      toast.error('Failed to load wallet settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingWallet({
      id: '',
      currency: '',
      walletAddress: '',
      network: null,
      qrCodeUrl: null,
      minDepositUsdt: 10,
      minWithdrawUsdt: 10,
      isEnabled: true
    });
    setIsNewWallet(true);
    setIsDialogOpen(true);
  };

  const handleEdit = (wallet: CryptoWallet) => {
    setEditingWallet(wallet);
    setIsNewWallet(false);
    setIsDialogOpen(true);
  };

  const handleDelete = (walletId: string) => {
    setWalletToDelete(walletId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!walletToDelete) return;

    try {
      const response = await fetch('/api/admin/crypto-wallets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: walletToDelete })
      });

      if (response.ok) {
        toast.success('Wallet deleted successfully');
        fetchWallets();
        setDeleteConfirmOpen(false);
        setWalletToDelete(null);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete wallet');
      }
    } catch (error) {
      console.error('Error deleting wallet:', error);
      toast.error('Failed to delete wallet');
    }
  };

  return (
    <TabsContent value="wallet-settings" className="mt-0">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Crypto Wallet Settings</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Manage cryptocurrency wallet addresses for user deposits
            </p>
          </div>
          <Button onClick={handleAdd} size="sm" className="bg-[#00D9C0] hover:bg-[#00C0AA]">
            <Plus className="h-4 w-4 mr-2" />
            Add Wallet
          </Button>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Important Security Note</p>
              <p className="text-xs">
                Only add wallet addresses that you fully control. Users will send deposits to these addresses.
                Make sure to verify all addresses before saving to prevent loss of funds.
              </p>
            </div>
          </div>
        </div>

        {loading && wallets.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map((wallet: any) => (
              <WalletCard
                key={wallet.id}
                wallet={wallet}
                onEdit={() => handleEdit(wallet)}
                onDelete={() => handleDelete(wallet.id)}
              />
            ))}

            {wallets.length === 0 && !loading && (
              <div className="col-span-full text-center py-12">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">No crypto wallets configured</p>
                <Button onClick={handleAdd} size="sm" className="bg-[#00D9C0] hover:bg-[#00C0AA]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Wallet
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {editingWallet && (
        <EditWalletDialog
          wallet={editingWallet}
          isNew={isNewWallet}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSave={() => {
            fetchWallets();
            setIsDialogOpen(false);
          }}
        />
      )}
        />
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wallet?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this wallet? Users will not be able to deposit using this cryptocurrency.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TabsContent>
  );
}

function WalletCard({
  wallet,
  onEdit,
  onDelete
}: {
  wallet: CryptoWallet;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#00D9C0]/10 rounded-full flex items-center justify-center">
              <Wallet className="h-5 w-5 text-[#00D9C0]" />
            </div>
            <div>
              <h5 className="font-bold">{wallet.currency}</h5>
              <p className="text-xs text-muted-foreground">{wallet.network || 'Default Network'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {wallet.isEnabled ? (
              <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded">
                Active
              </span>
            ) : (
              <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 px-2 py-0.5 rounded">
                Disabled
              </span>
            )}
          </div>
        </div>

        {wallet.qrCodeUrl && (
          <div className="mb-3 flex justify-center bg-white p-2 rounded">
            <div className="relative w-24 h-24">
              <Image
                src={wallet.qrCodeUrl}
                alt={`${wallet.currency} QR Code`}
                fill
                className="object-contain"
              />
            </div>
          </div>
        )}

        <div className="space-y-2 text-xs mb-3">
          <div>
            <p className="text-muted-foreground mb-1">Wallet Address:</p>
            <p className="font-mono text-xs bg-muted p-2 rounded break-all">
              {wallet.walletAddress}
            </p>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Min Deposit:</span>
            <span className="font-medium">{wallet.minDepositUsdt} {wallet.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Min Withdraw:</span>
            <span className="font-medium">{wallet.minWithdrawUsdt} {wallet.currency}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onEdit} size="sm" variant="outline" className="flex-1">
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button onClick={onDelete} size="sm" variant="outline" className="text-red-600 hover:text-red-700">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EditWalletDialog({
  wallet,
  isNew,
  open,
  onOpenChange,
  onSave
}: {
  wallet: CryptoWallet;
  isNew: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  const [editedWallet, setEditedWallet] = useState<CryptoWallet>(wallet);
  const [qrPreview, setQrPreview] = useState<string | null>(wallet.qrCodeUrl);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedWallet(wallet);
    setQrPreview(wallet.qrCodeUrl);
  }, [wallet]);

  const generateQRCode = async () => {
    if (!editedWallet.walletAddress) {
      toast.error('Please enter a wallet address first');
      return;
    }

    setIsGeneratingQR(true);
    try {
      const qrDataUrl = await QRCodeLib.toDataURL(editedWallet.walletAddress, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrPreview(qrDataUrl);
      setEditedWallet({ ...editedWallet, qrCodeUrl: qrDataUrl });
      toast.success('QR Code generated successfully');
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleSave = async () => {
    if (!editedWallet.currency || !editedWallet.walletAddress) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/crypto-wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedWallet)
      });

      if (response.ok) {
        toast.success(isNew ? 'Wallet added successfully' : 'Wallet updated successfully');
        onSave();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save wallet');
      }
    } catch (error) {
      console.error('Error saving wallet:', error);
      toast.error('Failed to save wallet');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add New' : 'Edit'} Crypto Wallet</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Cryptocurrency Selection */}
          <div>
            <Label>Cryptocurrency <span className="text-red-500">*</span></Label>
            <select
              value={editedWallet.currency}
              onChange={(e) => setEditedWallet({ ...editedWallet, currency: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-background border rounded-md"
              disabled={!isNew}
            >
              <option value="">Select Cryptocurrency</option>
              {SUPPORTED_CRYPTOS.map((crypto: any) => (
                <option key={crypto.symbol} value={crypto.symbol}>
                  {crypto.symbol} - {crypto.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {isNew ? 'Select the cryptocurrency for this wallet' : 'Currency cannot be changed after creation'}
            </p>
          </div>

          {/* Network Selection */}
          {editedWallet.currency && (
            <div>
              <Label>Network</Label>
              <select
                value={editedWallet.network || ''}
                onChange={(e) => setEditedWallet({ ...editedWallet, network: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-background border rounded-md"
              >
                <option value="">Default Network</option>
                {SUPPORTED_CRYPTOS.find((c: any) => c.symbol === editedWallet.currency)?.networks.map((network: any) => (
                  <option key={network} value={network}>{network}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Optional: Specify the blockchain network (e.g., ERC20, TRC20)
              </p>
            </div>
          )}

          {/* Wallet Address */}
          <div>
            <Label>Wallet Address <span className="text-red-500">*</span></Label>
            <Input
              value={editedWallet.walletAddress}
              onChange={(e) => setEditedWallet({ ...editedWallet, walletAddress: e.target.value })}
              placeholder="Enter wallet address"
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The wallet address where users will send their deposits
            </p>
          </div>

          {/* QR Code Section */}
          <div>
            <Label>QR Code</Label>
            <div className="mt-2 space-y-3">
              {qrPreview && (
                <div className="flex justify-center p-4 bg-white rounded-lg border">
                  <div className="relative w-48 h-48">
                    <Image
                      src={qrPreview}
                      alt="QR Code Preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              )}
              <Button
                type="button"
                onClick={generateQRCode}
                disabled={!editedWallet.walletAddress || isGeneratingQR}
                variant="outline"
                className="w-full"
              >
                {isGeneratingQR ? (
                  <>Generating QR Code...</>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    {qrPreview ? 'Regenerate QR Code' : 'Generate QR Code'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Minimum Deposit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Minimum Deposit ({editedWallet.currency || 'USDT'})</Label>
              <Input
                type="number"
                value={editedWallet.minDepositUsdt}
                onChange={(e) => setEditedWallet({ ...editedWallet, minDepositUsdt: parseFloat(e.target.value) || 10 })}
                className="mt-1"
                min="1"
                step="1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the minimum deposit amount in {editedWallet.currency || 'USDT'}
              </p>
            </div>

            {/* Minimum Withdraw */}
            <div>
              <Label>Minimum Withdraw ({editedWallet.currency || 'USDT'})</Label>
              <Input
                type="number"
                value={editedWallet.minWithdrawUsdt}
                onChange={(e) => setEditedWallet({ ...editedWallet, minWithdrawUsdt: parseFloat(e.target.value) || 10 })}
                className="mt-1"
                min="1"
                step="1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the minimum withdraw amount in {editedWallet.currency || 'USDT'}
              </p>
            </div>
          </div>

          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <Label>Enable Deposits</Label>
              <p className="text-xs text-muted-foreground">
                Allow users to deposit using this wallet
              </p>
            </div>
            <Switch
              checked={editedWallet.isEnabled}
              onCheckedChange={(checked) => setEditedWallet({ ...editedWallet, isEnabled: checked })}
            />
          </div>

          {/* Save Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#00D9C0] hover:bg-[#00C0AA]"
            >
              {isSaving ? 'Saving...' : (isNew ? 'Add Wallet' : 'Save Changes')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
