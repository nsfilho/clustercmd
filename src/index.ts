import program from 'commander';
import { clusterConfig, MachineConfig } from './config';
import { spawn } from 'child_process';

interface ShellConfig {
    shell: string;
    args: string[];
}

const executeCmd = (machine: MachineConfig, command: string) => {
    const regOutHostname = new RegExp('\n', 'gm');
    const filterData = (data: string) =>
        `${machine.name}: ` +
        data
            .replace(/(\r|\n)$/, '')
            .replace(regOutHostname, `\n${machine.name}: `);

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
        const dataStr: string = filterData(data.toString());
        console.log(dataStr);
    });
    shellCmd.stderr.on('data', data => {
        console.error(filterData(data.toString()));
    });
    shellCmd.on('close', code => {
        if (code !== 0) console.log(`${machine.name}: exit with code ${code}`);
    });
    shellCmd.stdin.write(command);
    shellCmd.stdin.end();
};

program
    .helpOption('-h, --help', 'show options')
    .option('-l, --list', 'list all nodes in cluster', () => {
        console.log('Servidores encontrados:', clusterConfig.machine);
    });

program.command('*').action((env, others) => {
    console.log('Cluster Execution:', others.join(' '));
    clusterConfig.machine.forEach(m => executeCmd(m, others.join(' ')));
});

program.parse(process.argv);
