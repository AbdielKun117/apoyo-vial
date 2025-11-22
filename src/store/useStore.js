import { create } from 'zustand';

export const useStore = create((set) => ({
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

    setUser: (userData) => set((state) => ({ user: { ...state.user, ...userData } })),
    setVehicle: (vehicleData) => set((state) => ({ vehicle: { ...state.vehicle, ...vehicleData } })),
    setRequest: (requestData) => set((state) => ({ currentRequest: { ...state.currentRequest, ...requestData } })),
    resetRequest: () => set({ currentRequest: { location: null, issueType: null, status: 'idle', helper: null } }),
}));
