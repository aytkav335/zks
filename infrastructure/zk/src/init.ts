import { Command } from 'commander';
import * as utils from './utils';

import * as db from './db/db';
import * as server from './server';
import * as contract from './contract';
import * as run from './run/run';
import * as env from './env';
import { up } from './up';

export async function init() {
    await checkEnv();
    await env.gitHooks();
    if (!process.env.CI) {
        await up();
    }
    await utils.allowFail(run.yarn());
    await run.plonkSetup();
    await run.verifyKeys.unpack();
    await db.setup();
    await contract.buildDev();
    await deployERC20('dev');
    await contract.build();
    await db.reset();
    await server.genesis();
    await contract.redeploy();
}

async function deployERC20(command: 'dev' | 'new', name?: string, symbol?: string, decimals?: string) {
    if (command == 'dev') {
        await utils.exec(`yarn --silent --cwd contracts deploy-erc20 add-multi '
            [
                { "name": "DAI",  "symbol": "DAI",  "decimals": 18 },
                { "name": "wBTC", "symbol": "wBTC", "decimals":  8 },
                { "name": "BAT",  "symbol": "BAT",  "decimals": 18 },
                { "name": "MLTT", "symbol": "MLTT", "decimals": 18 }
            ]' > ./etc/tokens/localhost.json`);
    } else if (command == 'new') {
        await utils.exec(
            `yarn --cwd contracts deploy-erc20 add --name ${name} --symbol ${symbol} --decimals ${decimals}`
        );
    }
}

async function checkEnv() {
    await utils.exec('which node');
    const { stdout: version } = await utils.exec('node --version');
    if ('v10.20' >= version) {
        throw new Error('Error, node.js version 10.20.1 or higher is required');
    }
    await utils.exec('which yarn');
    await utils.exec('which docker');
    await utils.exec('which docker-compose');
    await utils.exec('which cargo');
    await utils.exec('cargo sqlx --version');
    await utils.exec('which psql');
    await utils.exec('which pg_isready');
    await utils.exec('which diesel');
    await utils.exec('which solc');
}

export const command = new Command('init')
    .description('perform zksync network initialization for development')
    .action(init);
