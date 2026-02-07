
import { ethers } from 'ethers';

export interface MetaMaskError extends Error {
  code: number;
}

export class Web3Service {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    }
  }

  async isMetaMaskInstalled(): Promise<boolean> {
    return typeof window !== 'undefined' && Boolean(window.ethereum);
  }

  async isConnected(): Promise<boolean> {
    if (!this.provider) return false;
    
    try {
      const accounts = await this.provider.listAccounts();
      return accounts.length > 0;
    } catch (error) {
      return false;
    }
  }

  async getCurrentAccount(): Promise<string | null> {
    if (!this.provider) return null;
    
    try {
      const accounts = await this.provider.listAccounts();
      return accounts.length > 0 ? accounts[0].address : null;
    } catch (error) {
      return null;
    }
  }

  async connect(): Promise<string> {
    if (!this.provider) {
      throw new Error('MetaMask is not installed');
    }

    try {
      await this.provider.send('eth_requestAccounts', []);
      this.signer = await this.provider.getSigner();
      return await this.signer.getAddress();
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected connection request');
      }
      throw new Error('Failed to connect to MetaMask');
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('No signer available');
    }

    try {
      return await this.signer.signMessage(message);
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected signature request');
      }
      throw new Error('Failed to sign message');
    }
  }

  async getBalance(address?: string): Promise<string> {
    if (!this.provider) return '0';
    
    try {
      const addr = address || await this.getCurrentAccount();
      if (!addr) return '0';
      
      const balance = await this.provider.getBalance(addr);
      return ethers.formatEther(balance);
    } catch (error) {
      return '0';
    }
  }

  async getNetwork(): Promise<{ name: string; chainId: number }> {
    if (!this.provider) {
      throw new Error('Provider not available');
    }

    try {
      const network = await this.provider.getNetwork();
      return {
        name: network.name,
        chainId: Number(network.chainId)
      };
    } catch (error) {
      throw new Error('Failed to get network information');
    }
  }

  async switchNetwork(chainId: number): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not available');
    }

    try {
      await this.provider.send('wallet_switchEthereumChain', [
        { chainId: `0x${chainId.toString(16)}` }
      ]);
    } catch (error: any) {
      if (error.code === 4902) {
        throw new Error('Network not added to MetaMask');
      }
      throw new Error('Failed to switch network');
    }
  }

  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', callback);
    }
  }

  onChainChanged(callback: (chainId: string) => void): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('chainChanged', callback);
    }
  }

  removeAllListeners(): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        // Remove all wallet event listeners to prevent ghost connections
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
        window.ethereum.removeAllListeners('connect');
        window.ethereum.removeAllListeners('disconnect');
        console.log('[Web3Service] All event listeners removed');
      } catch (error) {
        console.error('[Web3Service] Error removing listeners:', error);
      }
    }
  }

  // Force disconnect and cleanup
  disconnect(): void {
    this.removeAllListeners();
    this.provider = null;
    this.signer = null;
    console.log('[Web3Service] Disconnected and cleaned up');
  }
}

export const web3Service = new Web3Service();

// Type definitions for MetaMask (legacy - use web3-universal.ts for new code)
// Keeping for backward compatibility
