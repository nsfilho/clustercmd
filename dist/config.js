"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const systemFile = '/etc/cluster.json';
const localFile = path_1.join(process.env.HOME || '/', '.cluster.json');
const parseConfig = (jsonFile) => {
    return JSON.parse(fs_1.readFileSync(jsonFile).toString());
};
exports.loadConfig = () => {
    if (fs_1.existsSync(systemFile)) {
        return parseConfig(systemFile);
    }
    else if (fs_1.existsSync(localFile)) {
        return parseConfig(localFile);
    }
    return {
        machine: []
    };
};
exports.clusterConfig = exports.loadConfig();
