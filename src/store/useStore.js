import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(persist((set) => ({
    user: {
        name: '',
        phone: '',
        email: '',
    },
    vehicle: {
        model: '',
        color: '',
        plates: '',
        type: 'sedan', // sedan, suv, truck, motorcycle
    },
    currentRequest: {
        location: null,
        issueType: null,
        status: 'idle', // idle, confirming, searching, found, arrived, completed
        helper: null,
    },
    theme: 'light', // light, dark

    setUser: (userData) => set((state) => ({ user: { ...state.user, ...userData } })),
    setVehicle: (vehicleData) => set((state) => ({ vehicle: { ...state.vehicle, ...vehicleData } })),
    setRequest: (requestData) => set((state) => ({ currentRequest: { ...state.currentRequest, ...requestData } })),
    resetRequest: () => set({ currentRequest: { location: null, issueType: null, status: 'idle', helper: null } }),
    toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}), {
    name: 'apoyo-vial-storage', // unique name
    partialize: (state) => ({ theme: state.theme }), // persist only theme if desired, or all
}));
