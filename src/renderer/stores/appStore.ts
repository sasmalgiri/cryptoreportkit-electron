import { create } from 'zustand';

interface AppState {
  // UI state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Selected coin for detail view
  selectedCoin: string | null;
  setSelectedCoin: (id: string | null) => void;

  // Currency preference
  currency: string;
  setCurrency: (c: string) => void;

  // Connection status
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;

  // Last data update timestamp
  lastUpdate: number | null;
  setLastUpdate: (ts: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  selectedCoin: null,
  setSelectedCoin: (id) => set({ selectedCoin: id }),

  currency: 'usd',
  setCurrency: (c) => set({ currency: c }),

  isOnline: true,
  setIsOnline: (online) => set({ isOnline: online }),

  lastUpdate: null,
  setLastUpdate: (ts) => set({ lastUpdate: ts }),
}));
