'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { universalWeb3Service } from '@/lib/web3-universal';
import { ethers } from 'ethers';

export default function DebugWalletPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [envInfo, setEnvInfo] = useState<any>({});
    const [walletStatus, setWalletStatus] = useState<string>('Unknown');
    const [accounts, setAccounts] = useState<string[]>([]);

    const addLog = (msg: string) => {
        const time = new Date().toISOString().split('T')[1].slice(0, 8);
        setLogs(prev => [`[${time}] ${msg}`, ...prev]);
    };

    const checkEnvironment = async () => {
        addLog('Checking environment...');

        // Basic Window Checks
        const win = window as any;
        const info = {
            userAgent: navigator.userAgent,
            isSecureContext: window.isSecureContext,
            hasEthereum: !!win.ethereum,
            hasTrust: !!win.trustwallet,
            hasPhantom: !!win.phantom,
            hasCoinbase: !!win.coinbaseWalletExtension,
            ethereumKeys: win.ethereum ? Object.keys(win.ethereum) : [],
            isMetaMask: win.ethereum?.isMetaMask,
            isTrust: win.ethereum?.isTrust || win.ethereum?.isTrustWallet,
        };
        setEnvInfo(info);
        addLog(`UA: ${navigator.userAgent}`);
        addLog(`window.ethereum: ${!!win.ethereum ? 'Present' : 'Missing'}`);

        if (win.ethereum) {
            addLog(`isMetaMask: ${win.ethereum.isMetaMask}`);
            addLog(`isTrust: ${win.ethereum.isTrust}`);
        }

        // Service Check
        const wallets = await universalWeb3Service.detectWallets();
        addLog(`Detected Wallets via Service: ${wallets.map(w => w.name).join(', ')}`);

        const isMobile = universalWeb3Service.isMobile();
        const inWalletBrowser = universalWeb3Service.isInWalletBrowser();
        addLog(`Service isMobile: ${isMobile}`);
        addLog(`Service isInWalletBrowser: ${inWalletBrowser}`);
    };

    const attemptConnect = async () => {
        try {
            addLog('Attempting connection via UniversalWeb3Service...');
            const address = await universalWeb3Service.connect();
            addLog(`Connected: ${address}`);
            setWalletStatus('Connected');
            setAccounts([address]);
        } catch (error: any) {
            addLog(`Connection Error: ${error.message}`);
            console.error(error);
            setWalletStatus('Error');
        }
    };

    const attemptRawConnect = async () => {
        try {
            addLog('Attempting RAW window.ethereum.request...');
            const win = window as any;
            if (!win.ethereum) {
                addLog('Error: window.ethereum is undefined');
                return;
            }

            const accounts = await win.ethereum.request({ method: 'eth_requestAccounts' });
            addLog(`Raw Connect Success: ${JSON.stringify(accounts)}`);
            setAccounts(accounts);
        } catch (error: any) {
            addLog(`Raw Connect Error: ${error.message}`);
        }
    };

    useEffect(() => {
        checkEnvironment();
        // Poll for changes every 2s
        const interval = setInterval(() => {
            const win = window as any;
            if (win.ethereum && !envInfo.hasEthereum) {
                addLog('Detected late injection of window.ethereum!');
                checkEnvironment();
            }
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-4 space-y-4 max-w-2xl mx-auto pb-24">
            <Card className="bg-[#0f172a] border-[#1e293b] text-white">
                <CardHeader>
                    <CardTitle>Web3 Debugger</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={checkEnvironment} variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white border-none">
                            Re-Scan Env
                        </Button>
                        <Button onClick={() => setLogs([])} variant="outline" className="bg-gray-600 hover:bg-gray-700 text-white border-none">
                            Clear Logs
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Button onClick={attemptConnect} className="w-full bg-green-600 hover:bg-green-700 text-white">
                            Attempt Universal Connect
                        </Button>
                        <Button onClick={attemptRawConnect} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                            Attempt RAW window.ethereum Connect
                        </Button>
                    </div>

                    <div className="p-3 bg-black/50 rounded-lg text-xs font-mono space-y-1 overflow-x-auto">
                        <p><strong>Status:</strong> <span className={walletStatus === 'Connected' ? 'text-green-400' : 'text-yellow-400'}>{walletStatus}</span></p>
                        <p><strong>Accounts:</strong> {accounts.join(', ') || 'None'}</p>
                        <p className="whitespace-pre-wrap break-all"><strong>UA:</strong> {envInfo.userAgent}</p>
                        <p><strong>Has Ethereum:</strong> {envInfo.hasEthereum ? 'Yes' : 'No'}</p>
                        <p><strong>Detailed Flags:</strong></p>
                        <pre>{JSON.stringify({
                            isMetaMask: envInfo.isMetaMask,
                            isTrust: envInfo.isTrust,
                            hasPhantom: envInfo.hasPhantom
                        }, null, 2)}</pre>
                    </div>

                    <div className="h-64 overflow-y-auto p-2 bg-black border border-gray-800 rounded font-mono text-xs">
                        <div className="mb-2 text-cyan-400 border-b border-cyan-900/30 pb-1">
                            <strong>Universal Web3 Service Logs:</strong>
                        </div>
                        {universalWeb3Service.getLogs().map((log, i) => (
                            <div key={`svc-${i}`} className="border-b border-gray-900/50 py-0.5 text-cyan-200/70">
                                {log}
                            </div>
                        ))}
                        <div className="my-2 border-t border-gray-700"></div>
                        <div className="mb-2 text-green-400 border-b border-green-900/30 pb-1">
                            <strong>Page Logs:</strong>
                        </div>
                        {logs.map((log, i) => (
                            <div key={i} className="border-b border-gray-900 py-1 text-gray-300">
                                {log}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
