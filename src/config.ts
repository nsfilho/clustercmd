import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const systemFile = '/etc/cluster.json';
const localFile = join(process.env.HOME || '/', '.cluster.json');

export interface MachineConfig {
    name: string;
    port: number;
    user: string;
    local: boolean;
    shortName: string;
    tags: string[];
}

export interface ClusterConfig {
    machine: MachineConfig[];
}

const parseConfig = (jsonFile: string): ClusterConfig => {
    return JSON.parse(readFileSync(jsonFile).toString());
};

export const loadConfig = (): ClusterConfig => {
    if (existsSync(systemFile)) {
        return parseConfig(systemFile);
    } else if (existsSync(localFile)) {
        return parseConfig(localFile);
    }
    return {
        machine: []
    };
};

export const clusterConfig: ClusterConfig = loadConfig();
