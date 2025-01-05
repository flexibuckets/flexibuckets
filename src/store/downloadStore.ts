import { create } from 'zustand';

interface DownloadInfo {
  isDownloading: boolean;
  progress: number;
}

interface DownloadState {
  downloads: Record<string, DownloadInfo>;
  setDownloadState: (fileId: string, isDownloading: boolean, progress: number) => void;
  resetDownload: (fileId: string) => void;
  isAnyDownloadActive: () => boolean;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: {},
  setDownloadState: (fileId, isDownloading, progress) => 
    set((state) => ({
      downloads: {
        ...state.downloads,
        [fileId]: { isDownloading, progress }
      }
    })),
  resetDownload: (fileId) => 
    set((state) => {
      const newDownloads = { ...state.downloads };
      delete newDownloads[fileId];
      return { downloads: newDownloads };
    }),
  isAnyDownloadActive: () => {
    const state = get();
    return Object.values(state.downloads).some(d => d.isDownloading);
  }
}));