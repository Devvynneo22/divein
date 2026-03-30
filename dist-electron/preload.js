"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose a safe, typed API to the renderer process
const api = {
    // We'll populate this with our module handlers
    tasks: {
        list: (filter) => electron_1.ipcRenderer.invoke('tasks:list', filter),
        create: (data) => electron_1.ipcRenderer.invoke('tasks:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('tasks:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('tasks:delete', id),
    },
    notes: {
        list: (filter) => electron_1.ipcRenderer.invoke('notes:list', filter),
        get: (id) => electron_1.ipcRenderer.invoke('notes:get', id),
        create: (data) => electron_1.ipcRenderer.invoke('notes:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('notes:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('notes:delete', id),
        search: (query) => electron_1.ipcRenderer.invoke('notes:search', query),
    },
    app: {
        getVersion: () => electron_1.ipcRenderer.invoke('app:version'),
    },
};
electron_1.contextBridge.exposeInMainWorld('api', api);
