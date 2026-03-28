import { contextBridge, ipcRenderer } from 'electron';

// Expose a safe, typed API to the renderer process
const api = {
  // We'll populate this with our module handlers
  tasks: {
    list: (filter?: any) => ipcRenderer.invoke('tasks:list', filter),
    create: (data: any) => ipcRenderer.invoke('tasks:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('tasks:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
  },
  notes: {
    list: (filter?: any) => ipcRenderer.invoke('notes:list', filter),
    get: (id: string) => ipcRenderer.invoke('notes:get', id),
    create: (data: any) => ipcRenderer.invoke('notes:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('notes:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('notes:delete', id),
    search: (query: string) => ipcRenderer.invoke('notes:search', query),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:version'),
  },
};

contextBridge.exposeInMainWorld('api', api);

// Necessary for TypeScript to recognize the window.api property
declare global {
  interface Window {
    api: typeof api;
  }
}
