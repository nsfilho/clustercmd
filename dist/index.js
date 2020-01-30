#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const config_1 = require("./config");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const bufferSize = process.env.BUFFER_SIZE || '50000';
const executeCmd = (machine, command) => {
    return new Promise((resolve, reject) => {
        let dataOut = '';
        const filterData = (data) => data
            // .replace(/(\r|\n)$/, '')
            .split('\n')
            .map(v => {
            const prefixA = `${machine.shortName}: `;
            const prefixB = `\n${machine.shortName}> `;
            const sizeLine = process.stdout.columns - prefixA.length - 1;
            const totalLines = Math.ceil(v.length / sizeLine);
            let result = '';
            for (let x = 0; (x < totalLines && !commander_1.default.trunc) || x === 0; x++) {
                const subPart = v.substr(x * sizeLine, sizeLine);
                const prefixResult = x === 0 ? prefixA : prefixB;
                result += prefixResult + subPart;
            }
            return result;
        })
            .join('\n');
        const shell = machine.local
            ? { shell: '/bin/sh', args: [] }
            : {
                shell: 'ssh',
                args: [
                    //   '-t',
                    `-p ${machine.port}`,
                    `${machine.user}@${machine.name}`,
                    '/bin/sh'
                ]
            };
        const shellCmd = child_process_1.spawn(shell.shell, shell.args);
        shellCmd.stdout.on('data', data => {
            dataOut += data.toString();
        });
        shellCmd.stderr.on('data', data => {
            dataOut += data.toString();
        });
        shellCmd.on('close', code => {
            if (code !== 0)
                dataOut += `\n${machine.shortName}: exit with code ${code}`;
            resolve(filterData(dataOut));
        });
        shellCmd.stdin.write(`export LINES=${bufferSize}\n`);
        shellCmd.stdin.write(`export COLUMNS=${bufferSize}\n`);
        shellCmd.stdin.write('export TERM=vt220\n');
        shellCmd.stdin.write(command);
        shellCmd.stdin.end();
    });
};
const readScript = (file) => {
    if (fs_1.existsSync(file)) {
        return fs_1.readFileSync(file).toString();
    }
    console.error(`File ${file} not found!`);
    return '\n';
};
const executeAll = (cmd) => {
    console.log('Cluster Execution:', cmd.split('\n'));
    const nodesToRun = config_1.clusterConfig.machine.filter(m => commander_1.default.tag === undefined || m.tags.includes(commander_1.default.tag));
    const allPromises = nodesToRun.map(m => executeCmd(m, cmd));
    Promise.all(allPromises).then(allLogs => allLogs.forEach(log => console.log(log)));
};
commander_1.default
    .helpOption('-h, --help', 'show options')
    .option('--no-trunc', 'no truncate lines')
    .option('-t, --tag <tag>', 'only nodes with specific tag')
    .option('-l, --list', 'list all nodes in cluster', () => {
    console.log('Servidores encontrados:', config_1.clusterConfig.machine);
});
commander_1.default.command('exec-script <script>').action((env, others) => {
    executeAll(readScript(env));
});
commander_1.default
    .command('*')
    .alias('exec-command')
    .action((env, others) => {
    executeAll(others.join(' '));
});
commander_1.default.parse(process.argv);
