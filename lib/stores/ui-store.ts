
import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  currentPage: string;
  isChatModalOpen: boolean;
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setCurrentPage: (page: string) => void;
  setChatModalOpen: (open: boolean) => void;
  toggleChatModal: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  isSidebarOpen: false,
  currentPage: 'dashboard',
  isChatModalOpen: false,

  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  setCurrentPage: (page) => set({ currentPage: page }),

  setChatModalOpen: (open) => set({ isChatModalOpen: open }),

  toggleChatModal: () => set(state => ({ isChatModalOpen: !state.isChatModalOpen }))
}));
