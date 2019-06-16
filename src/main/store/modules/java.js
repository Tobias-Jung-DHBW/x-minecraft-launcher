import { app, shell } from 'electron';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import Task from 'treelike-task';
import officialEndpoint from 'main/utils/jre';
import { requireString } from 'universal/utils/object';
import base from 'universal/store/modules/java';

const JAVA_FILE = os.platform() === 'win32' ? 'javaw.exe' : 'java';

/**
 * @type { import("universal/store/modules/java").JavaModule }
 */
const mod = {
    ...base,
    actions: {
        async load(context) {
            const loaded = await context.dispatch('getPersistence', { path: 'java.json' });
            if (loaded && loaded instanceof Array) {
                context.commit('addJava', loaded.filter(l => typeof l.path === 'string'));
            }
        },
        async init(context) {
            if (context.state.all.length === 0) {
                await context.dispatch('refreshLocalJava');
            } else {
                await context.state.all.map(j => context.dispatch('resolveJava', j.path)
                    .then((result) => { if (!result) { context.commit('removeJava', j); } }));
            }
        },
        async save(context, { mutation }) {
            switch (mutation) {
                case 'addJava':
                case 'removeJava':
                case 'defaultJava':
                    await context.dispatch('setPersistence', { path: 'java.json', data: context.state });
                    break;
                default:
            }
        },
        async installJava(context) {
            console.log('Try auto Java from Mojang source');
            context.commit('refreshingProfile', true);
            const local = path.join(context.rootState.root, 'jre', 'bin', JAVA_FILE);
            await context.dispatch('resolveJava', local);
            for (const j of context.state.all) {
                if (j.path === local) {
                    context.commit('refreshingProfile', false);
                    console.log(`Found exists installation at ${local}`);
                    return undefined;
                }
            }

            const task = Task.create('installJre', officialEndpoint);
            const handle = await context.dispatch('executeTask', task);
            context.dispatch('waitTask', handle).finally(() => {
                context.commit('refreshingProfile', false);
                context.dispatch('refreshLocalJava');
            });
            return handle;
        },
        async redirectToJvmPage() {
            shell.openExternal('https://www.java.com/download/');
        },
        /**
         * Test if this javapath exist and works
         */
        async resolveJava(context, javaPath) {
            requireString(javaPath);
            const exists = fs.existsSync(javaPath);
            if (!exists) return undefined;

            const resolved = context.state.all.filter(java => java.path === javaPath)[0];
            if (resolved) return resolved;

            /**
             * @param {string} str
             */
            const getJavaVersion = (str) => {
                const match = /(\d+\.\d+\.\d+)(_(\d+))?/.exec(str);
                if (match === null) return undefined;
                return match[1];
            };
            return new Promise((resolve, reject) => {
                const proc = exec(`"${javaPath}" -version`, (err, sout, serr) => {
                    const version = getJavaVersion(serr);
                    if (serr && version !== undefined) {
                        const java = {
                            path: javaPath,
                            version,
                            majorVersion: Number.parseInt(version.split('.')[0], 10),
                        };
                        context.commit('addJava', java);
                        resolve(java);
                    } else {
                        resolve(undefined);
                    }
                });
                proc.stderr.on('data', (chunk) => {
                    // console.log(chunk.toString());
                });
            });
        },
        /**
         * scan local java locations and cache
         */
        async refreshLocalJava({ state, dispatch, commit }) {
            commit('refreshingProfile', true);
            try {
                const unchecked = new Set();

                unchecked.add(path.join(app.getPath('userData'), 'jre', 'bin', JAVA_FILE));
                if (process.env.JAVA_HOME) unchecked.add(path.join(process.env.JAVA_HOME, 'bin', JAVA_FILE));

                const which = () => new Promise((resolve, reject) => {
                    exec('which java', (error, stdout, stderr) => {
                        resolve(stdout.replace('\n', ''));
                    });
                });
                const where = () => new Promise((resolve, reject) => {
                    exec('where java', (error, stdout, stderr) => {
                        resolve(stdout.split('\r\n'));
                    });
                });

                if (os.platform() === 'win32') {
                    const out = await new Promise((resolve, reject) => {
                        exec('REG QUERY HKEY_LOCAL_MACHINE\\Software\\JavaSoft\\ /s /v JavaHome', (error, stdout, stderr) => {
                            if (!stdout) resolve([]);
                            resolve(stdout.split(os.EOL).map(item => item.replace(/[\r\n]/g, ''))
                                .filter(item => item != null && item !== undefined)
                                .filter(item => item[0] === ' ')
                                .map(item => `${item.split('    ')[3]}\\bin\\javaw.exe`));
                        });
                    });
                    for (const o of [...out, ...await where()]) {
                        unchecked.add(o);
                    }
                } else if (os.platform() === 'darwin') {
                    unchecked.add('/Library/Internet Plug-Ins/JavaAppletPlugin.plugin/Contents/Home/bin/java');
                    unchecked.add(await which());
                } else {
                    unchecked.add(await which());
                }

                state.all.forEach(j => unchecked.add(j.path));

                console.log(`Checking these location for java ${JSON.stringify(Array.from(unchecked))}.`);

                await Promise.all(Array.from(unchecked).filter(jPath => typeof jPath === 'string')
                    .map(jPath => dispatch('resolveJava', jPath)));
            } finally {
                commit('refreshingProfile', false);
            }
        },
    },
};

export default mod;