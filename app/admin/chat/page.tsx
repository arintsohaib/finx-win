'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/admin-layout';
import { RefreshCw } from 'lucide-react';

export default function AdminChatPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to admin dashboard - chat is available via floating button modal
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <AdminLayout
      title="Messaging"
      subtitle="Redirecting to dashboard..."
    >
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading Chat Interface...</p>
      </div>
    </AdminLayout>
  );
}
