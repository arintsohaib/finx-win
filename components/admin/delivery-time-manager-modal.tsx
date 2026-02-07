
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit2, Trash2, Clock, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
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
import { toSeconds, toDisplayLabel, fromSeconds, validateDeliveryTime } from '@/lib/delivery-time-utils';

interface DeliveryTime {
  id: string;
  durationSeconds: number;
  displayLabel: string;
  isEnabled: boolean;
  sortOrder: number;
  profitPercentage?: number;
}

interface DeliveryTimeManagerModalProps {
  assetTradingId: string;
  assetSymbol: string;
  assetName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeliveryTimeManagerModal({
  assetTradingId,
  assetSymbol,
  assetName,
  open,
  onOpenChange
}: DeliveryTimeManagerModalProps) {
  const [deliveryTimes, setDeliveryTimes] = useState<DeliveryTime[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [timeToDelete, setTimeToDelete] = useState<{ id: string, label: string } | null>(null);

  // Form state for add/edit
  const [formValue, setFormValue] = useState('1');
  const [formUnit, setFormUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days' | 'years'>('minutes');
  const [formProfit, setFormProfit] = useState('10');

  useEffect(() => {
    if (open) {
      fetchDeliveryTimes();
    }
  }, [open, assetTradingId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchDeliveryTimes = async () => {
    setLoading(true);
    try {
      // Fetch delivery times
      const deliveryTimesRes = await fetch(`/api/admin/delivery-times?assetTradingId=${assetTradingId}`, {
        headers: getAuthHeaders(),
      });

      // Fetch asset settings to get profit levels
      const assetSettingsRes = await fetch(`/api/admin/asset-trading-settings?id=${assetTradingId}`, {
        headers: getAuthHeaders(),
      });

      if (deliveryTimesRes.ok && assetSettingsRes.ok) {
        const deliveryData = await deliveryTimesRes.json();
        const assetData = await assetSettingsRes.json();

        const times = deliveryData.deliveryTimes || [];
        const profitLevels = assetData.settings?.profitLevels || [];

        // Match profit percentages with delivery times
        const timesWithProfit = times.map((dt: any) => {
          const profitLevel = profitLevels.find((pl: any) => pl.duration === dt.displayLabel);
          return {
            ...dt,
            profitPercentage: profitLevel?.percentage || 10
          };
        });

        setDeliveryTimes(timesWithProfit);
      }
    } catch (error) {
      console.error('Error fetching delivery times:', error);
      toast.error('Failed to load delivery times');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormValue('1');
    setFormUnit('minutes');
    setFormProfit('10');
  };

  const handleEdit = (dt: DeliveryTime) => {
    const { value, unit } = fromSeconds(dt.durationSeconds);
    setFormValue(value.toString());
    setFormUnit(unit);
    setFormProfit((dt.profitPercentage || 10).toString());
    setEditingId(dt.id);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormValue('1');
    setFormUnit('minutes');
    setFormProfit('10');
  };

  const handleSave = async () => {
    const value = parseInt(formValue, 10);
    if (isNaN(value) || value <= 0) {
      toast.error('Please enter a valid positive number');
      return;
    }

    const profitValue = parseFloat(formProfit);
    if (isNaN(profitValue) || profitValue < 0) {
      toast.error('Please enter a valid profit percentage (0 or greater)');
      return;
    }

    const durationSeconds = toSeconds({ value, unit: formUnit });
    const validation = validateDeliveryTime(durationSeconds);

    if (!validation.valid) {
      toast.error(validation.error || 'Invalid duration');
      return;
    }

    const displayLabel = toDisplayLabel(durationSeconds);

    try {
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch('/api/admin/delivery-times', {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: editingId,
          assetTradingId,
          durationSeconds,
          displayLabel,
          profitPercentage: profitValue,
          isEnabled: true,
          sortOrder: deliveryTimes.length
        })
      });

      if (response.ok) {
        toast.success(isAdding ? 'Delivery time added' : 'Delivery time updated');
        fetchDeliveryTimes();
        handleCancel();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save delivery time');
      }
    } catch (error) {
      console.error('Error saving delivery time:', error);
      toast.error('Failed to save delivery time');
    }
  };

  const handleToggle = async (id: string, isEnabled: boolean) => {
    const dt = deliveryTimes.find((d: any) => d.id === id);
    if (!dt) return;

    try {
      const response = await fetch('/api/admin/delivery-times', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: dt.id,
          assetTradingId,
          durationSeconds: dt.durationSeconds,
          displayLabel: dt.displayLabel,
          isEnabled,
          sortOrder: dt.sortOrder
        })
      });

      if (response.ok) {
        setDeliveryTimes(prev =>
          prev.map((d: any) => d.id === id ? { ...d, isEnabled } : d)
        );
        toast.success(isEnabled ? 'Delivery time enabled' : 'Delivery time disabled');
      } else {
        toast.error('Failed to update delivery time');
      }
    } catch (error) {
      console.error('Error toggling delivery time:', error);
      toast.error('Failed to update delivery time');
    }
  };

  const handleDelete = (id: string, displayLabel: string) => {
    setTimeToDelete({ id, label: displayLabel });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteTime = async () => {
    if (!timeToDelete) return;

    try {
      const response = await fetch(`/api/admin/delivery-times?id=${timeToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        toast.success('Delivery time deleted');
        fetchDeliveryTimes();
        setDeleteConfirmOpen(false);
        setTimeToDelete(null);
      } else {
        toast.error('Failed to delete delivery time');
      }
    } catch (error) {
      console.error('Error deleting delivery time:', error);
      toast.error('Failed to delete delivery time');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Manage Delivery Times: {assetSymbol}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{assetName}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add New Button */}
          {!isAdding && !editingId && (
            <Button onClick={handleAdd} size="sm" variant="gradient" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add New Delivery Time
            </Button>
          )}

          {/* Add/Edit Form */}
          {(isAdding || editingId) && (
            <div className="p-4 border-2 border-primary/50 rounded-lg bg-primary/5 space-y-3">
              <Label className="text-sm font-semibold">
                {isAdding ? 'Add New Delivery Time' : 'Edit Delivery Time'}
              </Label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder="Value"
                    min="1"
                    className="w-32"
                  />
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as any)}
                    className="border rounded px-3 py-2 bg-background"
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="years">Years</option>
                  </select>
                  <Input
                    type="number"
                    value={formProfit}
                    onChange={(e) => setFormProfit(e.target.value)}
                    placeholder="Profit %"
                    min="0"
                    step="0.01"
                    className="w-32"
                  />
                  <span className="text-sm">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleSave} size="sm" variant="default" className="gap-2 flex-1">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button onClick={handleCancel} size="sm" variant="outline" className="gap-2 flex-1">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Min: 10 seconds | Max: 365 days (1 year) | Profit: Any positive percentage
              </p>
            </div>
          )}

          {/* Delivery Times List */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : deliveryTimes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No delivery times configured</p>
                <p className="text-xs mt-1">Click &quot;Add New Delivery Time&quot; to get started</p>
              </div>
            ) : (
              deliveryTimes.map((dt) => (
                <div
                  key={dt.id}
                  className={`p-3 rounded-lg border flex items-center gap-3 ${dt.isEnabled ? 'bg-muted/50' : 'bg-muted/20 opacity-60'
                    }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-lg">{dt.displayLabel}</div>
                      <div className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
                        {dt.profitPercentage || 10}% profit
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {dt.durationSeconds} seconds
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={dt.isEnabled}
                      onCheckedChange={(checked) => handleToggle(dt.id, checked)}
                    />
                    <Button
                      onClick={() => handleEdit(dt)}
                      size="sm"
                      variant="gradientGhost"
                      disabled={isAdding || editingId !== null}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(dt.id, dt.displayLabel)}
                      size="sm"
                      variant="gradientGhost"
                      className="text-red-500 hover:text-red-600"
                      disabled={isAdding || editingId !== null}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded text-xs space-y-1">
            <p className="font-semibold text-blue-900 dark:text-blue-100">💡 Tips:</p>
            <ul className="list-disc list-inside text-blue-800 dark:text-blue-200 space-y-1">
              <li>Delivery times appear in abbreviated format (30s, 2m, 4h, 7d)</li>
              <li>Disabled delivery times won&apos;t appear to users</li>
              <li>Duplicate durations are automatically prevented</li>
              <li>Times are automatically sorted by duration</li>
            </ul>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery Time?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the delivery time: <strong>{timeToDelete?.label}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTime} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
