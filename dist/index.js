#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const config_1 = require("./config");
const child_process_1 = require("child_process");
const executeCmd = (machine, command) => {
    const regOutHostname = new RegExp('\n', 'gm');
    const filterData = (data) => `${machine.name}: ` +
        data
            .replace(/(\r|\n)$/, '')
            .replace(regOutHostname, `\n${machine.name}: `);
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
        const dataStr = filterData(data.toString());
        console.log(dataStr);
    });
    shellCmd.stderr.on('data', data => {
        console.error(filterData(data.toString()));
    });
    shellCmd.on('close', code => {
        if (code !== 0)
            console.log(`${machine.name}: exit with code ${code}`);
    });
    shellCmd.stdin.write(command);
    shellCmd.stdin.end();
};
commander_1.default
    .helpOption('-h, --help', 'show options')
    .option('-l, --list', 'list all nodes in cluster', () => {
    console.log('Servidores encontrados:', config_1.clusterConfig.machine);
});
commander_1.default.command('*').action((env, others) => {
    console.log('Cluster Execution:', others.join(' '));
    config_1.clusterConfig.machine.forEach(m => executeCmd(m, others.join(' ')));
});
commander_1.default.parse(process.argv);
