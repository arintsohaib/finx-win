'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class DashboardErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error in Dashboard:', error, errorInfo);
    }

    public handleRetry = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 gradient-minimal">
                    <Card className="w-full max-w-md border-red-500/20 bg-card shadow-2xl">
                        <CardHeader className="text-center">
                            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-500" />
                            </div>
                            <CardTitle className="text-xl">Dashboard Error</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-center">
                            <p className="text-muted-foreground text-sm">
                                Something went wrong while loading your dashboard. This is likely a temporary data issue.
                            </p>

                            {this.state.error && (
                                <div className="p-3 bg-muted rounded-lg text-xs font-mono text-left overflow-auto max-h-32">
                                    {this.state.error.toString()}
                                </div>
                            )}

                            <Button onClick={this.handleRetry} className="w-full gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Reload Dashboard
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
