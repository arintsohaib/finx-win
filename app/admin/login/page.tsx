'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Lock, User, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { useAdminAuth } from '@/hooks/use-admin-auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Clear any stale admin data on page load
  useEffect(() => {
    try {
      localStorage.removeItem('admin_info');
      localStorage.removeItem('admin_username');
      localStorage.removeItem('admin_id');
      localStorage.removeItem('admin_token');
    } catch (e) {
      console.warn('LocalStorage access failed (cleanup)', e);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Perform login using the hook (handles storage and memory tokens)
      const result = await login(username, password);

      if (result.success) {
        toast.success('Login Successful! ✓', {
          description: 'Redirecting to admin dashboard...',
          duration: 2000,
        });

        // Use router.push for soft navigation to preserve the memoryToken in the hook
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 500);
      } else {
        toast.error('Login Failed', {
          description: result.error || 'Invalid username or password. Please try again.'
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login Failed', {
        description: 'Network error occurred. Please check your connection and try again.'
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl mb-6">
            <Shield className="h-8 w-8 text-primary shadow-sm" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">
            FinX <span className="text-primary font-black">Admin</span>
          </h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Enterprise Control Systems</p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl font-bold">Authentication Required</CardTitle>
            <CardDescription className="text-slate-400 font-medium">Please enter your administrative credentials to access the terminal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Identity</Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:ring-primary/20 transition-all rounded-xl"
                    placeholder="Username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Security Key</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:ring-primary/20 transition-all rounded-xl"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 rounded-xl"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verifying Identity...
                  </div>
                ) : (
                  'Secure Login'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
            Node Identity: <span className="text-slate-500">ADMIN-CORE-01</span>
          </p>
        </div>
      </div>
    </div>
  );
}