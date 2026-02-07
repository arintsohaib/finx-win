'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRealtimeAdmin } from '@/hooks/use-realtime-admin';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { PERMISSIONS } from '@/lib/admin-constants';
import { UsersTab } from '@/components/admin/users-tab';
import { AdminManagementTab } from '@/components/admin/admin-management-tab';
import { CryptoWalletsTab } from '@/components/admin/crypto-wallets-tab';
import { AdminFloatingChatButton } from '@/components/admin/chat/admin-floating-chat-button';
import { AdminChatModal } from '@/components/admin/chat/admin-chat-modal';
import { KYCVerificationTab } from '@/components/admin/kyc-verification-tab';
import { WalletRequestsTab } from '@/components/admin/wallet-requests-tab';
import { SummaryTab } from '@/components/admin/summary-tab';
import { MailServerTab } from '@/components/admin/mail-server-tab';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { RefreshCw } from 'lucide-react';

import { AdminLayout } from '@/components/admin/admin-layout';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'summary';

  const { admin, hasPermission } = useAdminAuth();
  const { subscribe } = useRealtimeAdmin();
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    activeTrades: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0
  });

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh stats every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'summary': return 'Dashboard Overview';
      case 'users': return 'User Management';
      case 'wallet-requests': return 'Financial Requests';
      case 'kyc': return 'KYC Verifications';
      case 'crypto-settings': return 'Payment Settings';
      case 'admin-management': return 'System Administrators';
      case 'mail-server': return 'Email Configuration';
      default: return 'Admin Dashboard';
    }
  };

  return (
    <AdminLayout
      title={getTabTitle(currentTab)}
      subtitle="FinX Enterprise Administration Panel"
    >
      <Tabs value={currentTab} onValueChange={(val: string) => router.push(`/admin/dashboard?tab=${val}`)} className="w-full">
        {hasPermission(PERMISSIONS.MANAGE_USERS) && (
          <TabsContent value="summary" className="mt-0 focus-visible:outline-none">
            <SummaryTab realtimeSubscribe={subscribe} />
          </TabsContent>
        )}
        {hasPermission(PERMISSIONS.MANAGE_USERS) && (
          <TabsContent value="users" className="mt-0 focus-visible:outline-none">
            <UsersTab />
          </TabsContent>
        )}
        {(hasPermission(PERMISSIONS.MANAGE_DEPOSITS) || hasPermission(PERMISSIONS.MANAGE_WITHDRAWALS)) && (
          <TabsContent value="wallet-requests" className="mt-0 focus-visible:outline-none">
            <WalletRequestsTab
              realtimeSubscribe={subscribe}
              stats={stats}
              fetchStats={fetchStats}
            />
          </TabsContent>
        )}
        {hasPermission(PERMISSIONS.MANAGE_USERS) && (
          <TabsContent value="kyc" className="mt-0 focus-visible:outline-none">
            <KYCVerificationTab />
          </TabsContent>
        )}
        {hasPermission(PERMISSIONS.MANAGE_WALLET_SETTINGS) && (
          <TabsContent value="crypto-settings" className="mt-0 focus-visible:outline-none">
            <CryptoWalletsTab />
          </TabsContent>
        )}
        {hasPermission(PERMISSIONS.MANAGE_ADMINS) && (
          <TabsContent value="admin-management" className="mt-0 focus-visible:outline-none">
            <AdminManagementTab />
          </TabsContent>
        )}
        {hasPermission(PERMISSIONS.MANAGE_USERS) && (
          <TabsContent value="mail-server" className="mt-0 focus-visible:outline-none">
            <MailServerTab />
          </TabsContent>
        )}
      </Tabs>
    </AdminLayout>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <DashboardContent />
    </Suspense>
  );
}
