

const { PrismaClient } = require('../../generated/prisma');
const tlog = require('../../../pkg/logger/tlog');


let client = null;

let initialized = false;


const init = async (options = {}) => {
    if (initialized) {
        tlog.warn('Database already initialized, skipping re-initialization');
        return client;
    }

    try {
        const logLevels = options.log || (process.env.NODE_ENV === 'development'
            ? ['warn', 'error']
            : ['error']);

        client = new PrismaClient({
            log: logLevels,
        });

        await client.$connect();

        initialized = true;

        tlog.info('Database connection established', {
            provider: 'postgresql',
        });

        return client;
    } catch (err) {
        tlog.error('Failed to initialize database connection', {
            error: err.message,
        });
        throw err;
    }
};


const getClient = () => {
    if (!client) {
        throw new Error('Database not initialized. Call init() first.');
    }
    return client;
};


const close = async () => {
    if (client) {
        await client.$disconnect();
        client = null;
        initialized = false;
        tlog.info('Database connection closed');
    }
};

const withTx = async (fn, options = {}) => {
    if (!client) {
        throw new Error('Database not initialized. Call init() first.');
    }

    const txOptions = {
        maxWait: options.maxWait || 5000,
        timeout: options.timeout || 10000,
    };

    return client.$transaction(async (tx) => {
        return fn(tx);
    }, txOptions);
};

module.exports = {
    init,
    getClient,
    close,
    withTx,
};
