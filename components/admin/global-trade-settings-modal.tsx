'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Globe, AlertCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface GlobalTradeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalTradeSettingsModal({ isOpen, onClose }: GlobalTradeSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [globalMode, setGlobalMode] = useState<string>('disabled');
  const [globalWinPercentage, setGlobalWinPercentage] = useState<string>('2.5');
  const [globalLossPercentage, setGlobalLossPercentage] = useState<string>('0.002');

  useEffect(() => {
    if (isOpen) {
      fetchGlobalSettings();
    }
  }, [isOpen]);

  const fetchGlobalSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/global-trade-settings', {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setGlobalMode(data.globalMode || 'disabled');
        setGlobalWinPercentage(data.globalWinPercentage || '2.5');
        setGlobalLossPercentage(data.globalLossPercentage || '0.002');
      }
    } catch (error) {
      console.error('Error fetching global settings:', error);
      toast.error('Failed to load global settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    const winPercent = parseFloat(globalWinPercentage);
    const lossPercent = parseFloat(globalLossPercentage);

    if (globalMode === 'custom') {
      if (isNaN(winPercent) || winPercent < 0.01 || winPercent > 99.99) {
        toast.error('Win percentage must be between 0.01% and 99.99%');
        return;
      }

      if (isNaN(lossPercent) || lossPercent < 0.001 || lossPercent > 99.99) {
        toast.error('Loss percentage must be between 0.001% and 99.99%');
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/global-trade-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          globalMode,
          globalWinPercentage: winPercent,
          globalLossPercentage: lossPercent,
        }),
      });

      if (response.ok) {
        toast.success('Global trade settings updated successfully');
        fetchGlobalSettings();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating global settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'win':
        return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-300';
      case 'loss':
        return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-300';
      case 'custom':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-300';
      case 'automatic':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400 border-gray-300';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950/30 rounded-lg flex items-center justify-center">
              <Globe className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Global Trade Control Settings</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure global win/loss behavior that applies to all users
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning Banner */}
          <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">
                    Important: Global Settings Override Individual User Settings
                  </p>
                  <p className="text-xs text-orange-800 dark:text-orange-300">
                    When global custom mode is enabled, these settings will override individual user trade status settings for all new and existing users. Use with caution.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Form */}
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Global Mode Selection */}
              <div className="space-y-3">
                <Label htmlFor="globalMode" className="text-base font-semibold">
                  Global Trade Mode
                </Label>
                <select
                  id="globalMode"
                  value={globalMode}
                  onChange={(e) => setGlobalMode(e.target.value)}
                  className={`w-full px-4 py-3 text-sm font-semibold rounded-lg border transition-colors ${getModeColor(globalMode)}`}
                  disabled={loading}
                >
                  <option value="disabled">🚫 Disabled (Use Individual User Settings)</option>
                  <option value="automatic">⚙️ Automatic (Real Market Data for All)</option>
                  <option value="win">✅ Win (All Users Win)</option>
                  <option value="loss">❌ Loss (All Users Lose)</option>
                  <option value="custom">🎯 Custom Percentages</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {globalMode === 'disabled' && '🚫 Individual user trade status settings will be respected'}
                  {globalMode === 'automatic' && '⚙️ All users will get real market-based trade results from CoinGecko API'}
                  {globalMode === 'win' && '✅ All users will win their trades with realistic price movements (1-5%)'}
                  {globalMode === 'loss' && '❌ All users will lose their trades with minimal price movements (0.002%)'}
                  {globalMode === 'custom' && '🎯 All users will use the custom percentages defined below'}
                </p>
              </div>

              {/* Custom Percentage Inputs */}
              {globalMode === 'custom' && (
                <div className="space-y-4 p-4 border-2 border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50/50 dark:bg-purple-950/10">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                    Custom Percentage Configuration
                  </h4>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Win Percentage */}
                    <div className="space-y-2">
                      <Label htmlFor="globalWinPercentage" className="text-sm font-medium">
                        Win Price Movement (%)
                      </Label>
                      <div className="relative">
                        <Input
                          id="globalWinPercentage"
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="99.99"
                          value={globalWinPercentage}
                          onChange={(e) => setGlobalWinPercentage(e.target.value)}
                          className="pr-8"
                          placeholder="2.5"
                          disabled={loading}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Price will move <span className="font-semibold text-green-600 dark:text-green-400">{globalWinPercentage}%</span> in favorable direction when user wins
                      </p>
                    </div>

                    {/* Loss Percentage */}
                    <div className="space-y-2">
                      <Label htmlFor="globalLossPercentage" className="text-sm font-medium">
                        Loss Price Movement (%)
                      </Label>
                      <div className="relative">
                        <Input
                          id="globalLossPercentage"
                          type="number"
                          step="0.001"
                          min="0.001"
                          max="99.99"
                          value={globalLossPercentage}
                          onChange={(e) => setGlobalLossPercentage(e.target.value)}
                          className="pr-8"
                          placeholder="0.002"
                          disabled={loading}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Price will move <span className="font-semibold text-red-600 dark:text-red-400">{globalLossPercentage}%</span> against position when user loses
                      </p>
                    </div>
                  </div>

                  {/* Example Calculation */}
                  <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded border">
                    <p className="text-xs font-semibold mb-2">Example (Entry: $50,000):</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-green-600 dark:text-green-400">
                        <p className="font-medium">Win Exit Price:</p>
                        <p className="font-mono">
                          ${(50000 * (1 + parseFloat(globalWinPercentage || '0') / 100)).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-red-600 dark:text-red-400">
                        <p className="font-medium">Loss Exit Price:</p>
                        <p className="font-mono">
                          ${(50000 * (1 - parseFloat(globalLossPercentage || '0') / 100)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Current Global Status</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {globalMode === 'disabled' && 'Individual user settings are active'}
                    {globalMode === 'automatic' && 'All trades use real market data'}
                    {globalMode === 'win' && `All trades win with ${globalWinPercentage}% favorable movement`}
                    {globalMode === 'loss' && `All trades lose with ${globalLossPercentage}% adverse movement`}
                    {globalMode === 'custom' && `Custom mode: Win ${globalWinPercentage}% / Loss ${globalLossPercentage}%`}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${getModeColor(globalMode)}`}>
                  {globalMode.toUpperCase()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              onClick={() => {
                fetchGlobalSettings();
                onClose();
              }}
              variant="outline"
              disabled={loading || saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || saving}
              className="min-w-[120px]"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
