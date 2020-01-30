#!/usr/bin/env node

import program from 'commander';
import { clusterConfig, MachineConfig } from './config';
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';

const bufferSize = process.env.BUFFER_SIZE || '50000';

interface ShellConfig {
    shell: string;
    args: string[];
}

const executeCmd = (machine: MachineConfig, command: string) => {
    return new Promise((resolve, reject) => {
        const prefixA = `${machine.shortName}: `;
        const prefixB = `\n${machine.shortName}> `;
        const sizeLine = process.stdout.columns - prefixA.length - 1;
        let dataOut = '';
        const filterData = (data: string) =>
            data
                // .replace(/(\r|\n)$/, '')
                .split('\n')
                .map(v => {
                    const totalLines = Math.ceil(v.length / sizeLine);
                    let result = '';
                    for (
                        let x = 0;
                        (x < totalLines && !program.trunc) || x === 0;
                        x++
                    ) {
                        const subPart = v.substr(x * sizeLine, sizeLine);
                        const prefixResult = x === 0 ? prefixA : prefixB;
                        result += prefixResult + subPart;
                    }
                    return result;
                })
                .join('\n');

        const shell: ShellConfig = machine.local
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
        const shellCmd = spawn(shell.shell, shell.args);
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

const readScript = (file: string): string => {
    if (existsSync(file)) {
        return readFileSync(file).toString();
    }
    console.error(`File ${file} not found!`);
    return '\n';
};

const executeAll = (cmd: string) => {
    console.log('Cluster Execution:', cmd.split('\n'));
    const nodesToRun = clusterConfig.machine.filter(
        m => program.tag === undefined || m.tags.includes(program.tag)
    );
    const allPromises = nodesToRun.map(m => executeCmd(m, cmd));
    Promise.all(allPromises).then(allLogs =>
        allLogs.forEach(log => console.log(log))
    );
};

program
    .helpOption('-h, --help', 'show options')
    .option('--no-trunc', 'no truncate lines')
    .option('-t, --tag <tag>', 'only nodes with specific tag')
    .option('-l, --list', 'list all nodes in cluster', () => {
        console.log('Servidores encontrados:', clusterConfig.machine);
    });

program.command('exec-script <script>').action((env, others) => {
    executeAll(readScript(env));
});

program
    .command('*')
    .alias('exec-command')
    .action((env, others) => {
        executeAll(others.join(' '));
    });

program.parse(process.argv);
