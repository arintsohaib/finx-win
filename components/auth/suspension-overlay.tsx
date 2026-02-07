
'use client';

import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SuspensionOverlayProps {
    reason: string | null;
}

export function SuspensionOverlay({ reason }: SuspensionOverlayProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
            <Card className="w-full max-w-md border-red-500/50 shadow-2xl bg-card">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-500">
                        Account Suspended
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground">
                        Your access to this platform has been suspended by the administration.
                    </p>

                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg p-4 text-sm">
                        <p className="font-semibold text-red-700 dark:text-red-400 mb-1">Reason:</p>
                        <p className="text-red-600 dark:text-red-300">
                            {reason || 'Violation of Terms of Service'}
                        </p>
                    </div>

                    <p className="text-xs text-muted-foreground pt-4">
                        If you believe this is a mistake, please contact support.
                    </p>

                    <button
                        onClick={() => window.location.reload()}
                        className="text-xs text-primary underline hover:text-primary/80"
                    >
                        Check Status
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}
