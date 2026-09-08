import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function createWindow() {
  const isDev = process.env.ELECTRON_DEV === 'true';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'iM뱅크 룰렛 추첨기',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:1235/roulette/').catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Prevent navigation to external remote websites
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: '파일',
      submenu: [
        {
          label: '종료',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click() {
            app.quit();
          },
        },
      ],
    },
    {
      label: '보기',
      submenu: [
        { label: '새로고침', role: 'reload' },
        { label: '강제 새로고침', role: 'forceReload' },
        { type: 'separator' },
        { label: '실제 크기', role: 'resetZoom' },
        { label: '확대', role: 'zoomIn' },
        { label: '축소', role: 'zoomOut' },
        { type: 'separator' },
        { label: '전체 화면', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: '개발자 도구', role: 'toggleDevTools' },
      ],
    },
    {
      label: '창',
      submenu: [
        { label: '최소화', role: 'minimize' },
        { label: '닫기', role: 'close' },
      ],
    },
    {
      label: '도움말',
      submenu: [
        {
          label: 'iM뱅크 룰렛 추첨기 정보',
          click() {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '정보',
              message: 'iM뱅크 룰렛 추첨기',
              detail: `버전: ${app.getVersion()}\n사내용 완전 오프라인 Windows 데스크톱 애플리케이션`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
