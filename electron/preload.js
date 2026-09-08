import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
});
