import {
    app, BrowserWindow,
    ipcMain, DownloadItem,
    Tray, nativeImage,
    dialog, MenuItem, Menu,
} from 'electron'
import paths from 'path'
import urls from 'url'
import fs from 'fs-extra'

const devMod = process.env.NODE_ENV === 'development'
/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (!devMod) {
    global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

const winURL = process.env.NODE_ENV === 'development' ?
    'http://localhost:9080/index.html' :
    `file://${__dirname}/index.html`

let mainWindow;
let logWindow;

let maindownloadCallback;
const downloadTasks = new Map()

let parking = false;

let iconImage

let root = process.env.LAUNCHER_ROOT
function updateRoot(newRoot) {
    process.env.LAUNCHER_ROOT = newRoot;
    root = newRoot
    app.setPath('appData', root);
}

if (!root) {
    updateRoot(paths.join(app.getPath('appData'), '.launcher'));
}

let theme = 'semantic';

function updateTheme(newTheme) {
    if (theme !== newTheme) theme = newTheme;
}

const isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
    }
})

if (isSecondInstance) {
    app.quit()
}

function createLogWindow() {
    logWindow = new BrowserWindow({
        height: 400,
        width: 600,
        frame: false,
    })
    logWindow.setTitle('Log')
    logWindow.setIcon(iconImage);
    logWindow.loadURL(`${winURL}?logger=true`);
    logWindow.on('closed', () => { logWindow = null })
}

ipcMain.on('minecraft-stdout', (s) => {
    if (logWindow) {
        logWindow.webContents.send('minecraft-stdout', s);
    }
})

ipcMain.on('minecraft-stderr', (s) => {
    if (logWindow) {
        logWindow.webContents.send('minecraft-stderr', s);
    }
})

function createMainWindow() {
    /**
     * Initial window options
     */
    mainWindow = new BrowserWindow({
        height: 626,
        width: 1100,
        resizable: false,
        frame: false,
    })
    mainWindow.setTitle('ILauncher')
    mainWindow.setIcon(iconImage)
    mainWindow.loadURL(`${winURL}?logger=false&theme=${theme}&root=${root}`)

    mainWindow.on('closed', () => { mainWindow = null })
    mainWindow.on('ready-to-show', () => {
    })
    mainWindow.on('show', () => {
    })
    mainWindow.webContents.session.setDownloadPath(paths.join(root, 'temps'))
    mainWindow.webContents.session.on('will-download', (event, item, content) => {
        const save = downloadTasks.get(item.getURL())
        if (save) item.setSavePath(save)
        mainWindow.webContents.send('will-download', {
            file: item.getFilename(),
            url: item.getURL(),
        })
        item.on('updated', ($event, state) => {
            mainWindow.webContents.send('download', {
                file: item.getFilename(),
                url: item.getURL(),
                state,
                byte: item.getReceivedBytes(),
                total: item.getTotalBytes(),
            })
        })
        item.on('done', ($event, state) => {
            downloadTasks.delete(item.getURL())
            mainWindow.webContents.send('download-done', {
                file: item.getFilename(),
                url: item.getURL(),
                state,
                byte: item.getReceivedBytes(),
                total: item.getTotalBytes(),
            })
        })
    })
    maindownloadCallback = (filePath, url) => {
        downloadTasks.set(url, filePath)
        mainWindow.webContents.downloadURL(url)
    }
}

app.on('ready', () => {
    require('./services'); // load all service 
    iconImage = nativeImage.createFromPath(`${__static}/logo.png`) // eslint-disable-line no-undef
    createMainWindow()

    const tray = new Tray(iconImage)
    tray.setToolTip('An Electron Minecraft Launcher')
    const menu = new Menu();
    menu.append(new MenuItem({
        click: (item, win, event) => {
            mainWindow.close();
        },
        role: 'Hint',
        label: 'Exit',
    }))
    tray.setContextMenu(menu)
    app.setName('ILauncher');
})

app.on('window-all-closed', () => {
    if (parking) return;
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) createMainWindow()
})

ipcMain.on('update', (event, newRoot, newTheme) => {
    if (newRoot !== undefined || newTheme !== undefined) {
        if (newRoot) updateRoot(newRoot);
        if (newTheme) updateTheme(newTheme);
        newTheme = newTheme || 'semantic'
        parking = true
        mainWindow.close();
        createMainWindow();
        parking = false;
    }
})

ipcMain.on('park', (debug) => {
    parking = true;
    mainWindow.close()
    createLogWindow();
})

ipcMain.on('restart', () => {
    parking = false;
    if (logWindow) {
        logWindow.close();
        logWindow = undefined;
    }
    createMainWindow()
})

ipcMain.on('exit', () => {
    mainWindow.close()
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

