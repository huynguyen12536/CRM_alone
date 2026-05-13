/**
 * Module Config - Quản lý cấu hình ứng dụng từ biến môi trường.
 *
 * Tương tự package config trong Go (cleanenv):
 * - Load cấu hình từ .env file hoặc environment variables
 * - Cung cấp giá trị mặc định cho mọi config
 * - Singleton pattern với AppConfig
 * - Helper methods: isProduction(), isDevelopment(), getRedisAddr()
 *
 * @module pkg/config
 */

require('dotenv').config();
const tlog = require('../logger/tlog');
const url = require('url');

/**
 * @typedef {Object} ServerConfig
 * @property {string} port - Port server lắng nghe
 * @property {string} env - Môi trường (development | production | test)
 * @property {string} serviceName - Tên service
 * @property {string} version - Phiên bản ứng dụng
 */

/**
 * @typedef {Object} DatabaseConfig
 * @property {string} host - Database host
 * @property {number} port - Database port
 * @property {string} user - Database user
 * @property {string} password - Database password
 * @property {string} dbName - Database name
 * @property {string} sslMode - SSL mode (disable | require | prefer)
 * @property {string} timeZone - Múi giờ database
 * @property {string} url - Full connection URL cho Prisma
 */

/**
 * @typedef {Object} JWTConfig
 * @property {string} secret - JWT secret key
 * @property {number} accessExpiryMinutes - Thời gian hết hạn access token (phút)
 * @property {number} refreshExpiryHours - Thời gian hết hạn refresh token (giờ)
 */

/**
 * @typedef {Object} LogConfig
 * @property {string} level - Mức log (error | warn | info | debug)
 * @property {boolean} enableConsole - Bật/tắt console logging
 * @property {string} filePath - Đường dẫn file log
 * @property {string} maxSize - Kích thước tối đa file log
 * @property {string} maxFiles - Thời gian giữ file log cũ
 * @property {boolean} compress - Nén file log cũ
 */

/**
 * @typedef {Object} CookieConfig
 * @property {string} name - Tên cookie access token
 * @property {string} refreshName - Tên cookie refresh token
 * @property {string} domain - Domain cho cookie
 * @property {boolean} secure - Cookie chỉ gửi qua HTTPS
 * @property {string} sameSite - SameSite policy (Lax | Strict | None)
 * @property {string} path - Path cho cookie
 */

/**
 * @typedef {Object} RateLimitConfig
 * @property {boolean} enabled - Bật/tắt rate limiting
 * @property {number} requestsPerMinute - Số request tối đa mỗi phút
 */

/**
 * @typedef {Object} CasbinConfig
 * @property {string} modelPath - Đường dẫn tới file casbin model
 */

/**
 * @typedef {Object} Config
 * @property {ServerConfig} server
 * @property {DatabaseConfig} database
 * @property {JWTConfig} jwt
 * @property {LogConfig} log
 * @property {CookieConfig} cookie
 * @property {RateLimitConfig} rateLimit
 * @property {CasbinConfig} casbin
 * @property {string} redisUrl
 * @property {string[]} corsAllowedOrigins
 */

/** @type {Config|null} */
let AppConfig = null;

/**
 * Đọc biến môi trường với giá trị mặc định.
 *
 * @param {string} key - Tên biến môi trường
 * @param {*} defaultValue - Giá trị mặc định
 * @returns {string}
 */
const env = (key, defaultValue = '') => {
    return process.env[key] || defaultValue;
};

/**
 * Đọc biến môi trường dạng số nguyên.
 *
 * @param {string} key
 * @param {number} defaultValue
 * @returns {number}
 */
const envInt = (key, defaultValue = 0) => {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Đọc biến môi trường dạng boolean.
 *
 * @param {string} key
 * @param {boolean} defaultValue
 * @returns {boolean}
 */
const envBool = (key, defaultValue = false) => {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value === 'true' || value === '1';
};

/**
 * Load toàn bộ cấu hình từ environment variables.
 * Tương tự cleanenv.ReadConfig() trong Go.
 *
 * @returns {Config} Application config
 */
const load = () => {
    if (AppConfig) {
        tlog.warn('Config already loaded, returning existing config');
        return AppConfig;
    }

    AppConfig = {
        server: {
            port: env('PORT', '3000'),
            env: env('NODE_ENV', 'development'),
            serviceName: env('SERVICE_NAME', 'crm2-backend'),
            version: env('SERVICE_VERSION', '1.0.0'),
        },

        database: {
            host: env('DB_HOST', 'localhost'),
            port: envInt('DB_PORT', 5432),
            user: env('DB_USER', 'postgres'),
            password: env('DB_PASSWORD', ''),
            dbName: env('DB_NAME', 'crm2_dev'),
            sslMode: env('DB_SSLMODE', 'disable'),
            timeZone: env('DB_TIMEZONE', 'Asia/Ho_Chi_Minh'),
            url: env('DATABASE_URL', ''),
        },

        jwt: {
            secret: env('JWT_SECRET', 'change-this-secret-in-production-min-32-chars'),
            accessExpiryMinutes: envInt('JWT_ACCESS_EXPIRY_MINUTES', 15),
            refreshExpiryHours: envInt('JWT_REFRESH_EXPIRY_HOURS', 12),
        },

        log: {
            level: env('LOG_LEVEL', 'info'),
            enableConsole: envBool('LOG_ENABLE_CONSOLE', true),
            filePath: env('LOG_FILE_PATH', 'logs/app-%DATE%.log'),
            maxSize: env('LOG_MAX_SIZE', '100m'),
            maxFiles: env('LOG_MAX_FILES', '30d'),
            compress: envBool('LOG_COMPRESS', true),
        },

        cookie: {
            name: env('COOKIE_NAME', 'app_token'),
            refreshName: env('COOKIE_REFRESH_NAME', 'app_refresh'),
            domain: env('COOKIE_DOMAIN', ''),
            secure: envBool('COOKIE_SECURE', false),
            sameSite: env('COOKIE_SAMESITE', 'Lax'),
            path: env('COOKIE_PATH', '/'),
        },

        rateLimit: {
            enabled: envBool('RATE_LIMIT_ENABLED', true),
            requestsPerMinute: envInt('RATE_LIMIT_REQUESTS_PER_MIN', 60),
        },

        casbin: {
            modelPath: env('CASBIN_MODEL_PATH', 'configs/casbin_model.conf'),
        },

        redisUrl: env('REDIS_URL', 'redis://localhost:6379'),
        corsAllowedOrigins: env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(','),
    };

    tlog.info('Application config loaded', {
        env: AppConfig.server.env,
        port: AppConfig.server.port,
        service: AppConfig.server.serviceName,
    });

    return AppConfig;
};

/**
 * Lấy config instance. Nếu chưa load, tự động load.
 *
 * @returns {Config}
 */
const getConfig = () => {
    if (!AppConfig) {
        return load();
    }
    return AppConfig;
};

/**
 * Kiểm tra có đang chạy production không.
 *
 * @returns {boolean}
 */
const isProduction = () => {
    return getConfig().server.env === 'production';
};

/**
 * Kiểm tra có đang chạy development không.
 *
 * @returns {boolean}
 */
const isDevelopment = () => {
    return getConfig().server.env === 'development';
};

/**
 * Lấy Redis address (host:port) từ Redis URL.
 * Tương tự GetRedisAddr() trong Go.
 *
 * @returns {string} Redis address (ví dụ: 'localhost:6379')
 */
const getRedisAddr = () => {
    const cfg = getConfig();
    try {
        const parsed = new url.URL(cfg.redisUrl);
        return parsed.host || cfg.redisUrl;
    } catch {
        return cfg.redisUrl;
    }
};

module.exports = {
    load,
    getConfig,
    isProduction,
    isDevelopment,
    getRedisAddr,
};
