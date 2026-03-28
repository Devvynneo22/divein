/// <reference types="vite/client" />

interface Window {
  api: typeof import('../electron/preload').api;
}
