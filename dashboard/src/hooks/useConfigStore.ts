import { create } from 'zustand';

interface ConfigState {
    apiUrl: string;
    setApiUrl: (url: string) => void;
}

export const useConfigStore = create<ConfigState>((set) => {
    // VITE_API_URL is baked in at build time by Render.
    // If not set (local dev), use empty string (relative URLs via Vite proxy).
    let initialUrl = import.meta.env.VITE_API_URL || '';

    // Clean up trailing slash to prevent double-slash in API calls
    initialUrl = initialUrl.replace(/\/$/, '');

    return {
        apiUrl: initialUrl,
        setApiUrl: (url) => set({ apiUrl: url.replace(/\/$/, '') })
    };
});
