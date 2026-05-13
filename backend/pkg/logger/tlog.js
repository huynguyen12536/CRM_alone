/**
 * Module Logger sử dụng Winston với hỗ trợ xoay vòng file hàng ngày.
 *
 * Kiến trúc multi-transport (tương tự Zap's Tee Core):
 * - Console: colorized trong development, JSON trong production
 * - File: JSON structured logging với xoay vòng hàng ngày
 *
 * Múi giờ mặc định: Asia/Ho_Chi_Minh (Việt Nam)
 *
 * @module pkg/logger
 */

const winston = require('winston');
require('winston-daily-rotate-file');
const moment = require('moment-timezone');

/** @type {winston.Logger|null} Logger toàn cục */
let globalLogger = null;

/**
 * Cấu hình mặc định cho logger.
 *
 * @typedef {Object} LoggerConfig
 * @property {string} environment - Môi trường chạy ('development' | 'production' | 'test')
 * @property {string} level - Mức log tối thiểu ('error' | 'warn' | 'info' | 'debug')
 * @property {string} appName - Tên ứng dụng (metadata mặc định)
 * @property {string} version - Phiên bản ứng dụng (metadata mặc định)
 * @property {boolean} enableConsole - Bật/tắt ghi log ra console
 * @property {boolean} enableFile - Bật/tắt ghi log ra file
 * @property {string} filePath - Đường dẫn file log (hỗ trợ %DATE% placeholder)
 * @property {string} maxSize - Kích thước tối đa mỗi file log (ví dụ: '100m')
 * @property {string} maxFiles - Thời gian giữ file log cũ (ví dụ: '30d')
 * @property {string} timezone - Múi giờ cho timestamp (mặc định: Asia/Ho_Chi_Minh)
 * @property {boolean} silent - Tắt toàn bộ output (dùng cho testing)
 */
const DefaultConfig = {
    environment: 'development',
    level: 'info',
    appName: 'app',
    version: '1.0.0',
    enableConsole: true,
    enableFile: false,
    filePath: 'logs/app-%DATE%.log',
    maxSize: '100m',
    maxFiles: '30d',
    timezone: 'Asia/Ho_Chi_Minh',
    silent: false
};

/**
 * Tạo hàm format timestamp theo múi giờ được cấu hình.
 *
 * @param {string} timezone - Múi giờ (ví dụ: 'Asia/Ho_Chi_Minh')
 * @returns {Function} Hàm trả về chuỗi timestamp đã format
 */
const createTimestampFormat = (timezone) => {
    return () => moment().tz(timezone).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
};

/**
 * Tạo hàm format timestamp ngắn gọn cho development console.
 *
 * @param {string} timezone - Múi giờ
 * @returns {Function} Hàm trả về chuỗi timestamp dạng HH:mm:ss
 */
const createShortTimestampFormat = (timezone) => {
    return () => moment().tz(timezone).format('HH:mm:ss');
};

/**
 * Các trường metadata mặc định cần lọc khỏi printf format
 * để tránh hiển thị trùng lặp.
 */
const DEFAULT_META_FIELDS = ['service', 'version', 'timestamp', 'level', 'message'];

/**
 * Khởi tạo logger với cấu hình tùy chỉnh.
 *
 * Hỗ trợ nhiều transport đồng thời (multi-transport):
 * - Console transport: colorized printf trong development, JSON trong production
 * - File transport: JSON structured logging với xoay vòng hàng ngày
 *
 * @param {LoggerConfig} [cfg] - Cấu hình tùy chỉnh (merge với DefaultConfig)
 * @returns {winston.Logger} Instance logger đã được khởi tạo
 *
 * @example
 * // Khởi tạo cho production với file logging
 * const logger = init({
 *     environment: 'production',
 *     enableFile: true,
 *     appName: 'crm-api',
 *     version: '2.1.0'
 * });
 */
const init = (cfg = {}) => {
    const config = { ...DefaultConfig, ...cfg };
    const transports = [];
    const timestampFormat = createTimestampFormat(config.timezone);
    const shortTimestampFormat = createShortTimestampFormat(config.timezone);

    // Console transport
    if (config.enableConsole) {
        const consoleFormat = config.environment === 'production'
            ? winston.format.combine(
                winston.format.timestamp({ format: timestampFormat }),
                winston.format.json()
            )
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: shortTimestampFormat }),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    // Lọc các trường metadata mặc định để tránh trùng lặp
                    const filteredMeta = Object.keys(meta)
                        .filter((key) => !DEFAULT_META_FIELDS.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = meta[key];
                            return obj;
                        }, {});

                    const metaStr = Object.keys(filteredMeta).length
                        ? ' ' + JSON.stringify(filteredMeta)
                        : '';

                    return `${timestamp} ${level}: ${message}${metaStr}`;
                })
            );

        transports.push(new winston.transports.Console({
            level: config.level,
            format: consoleFormat,
            silent: config.silent
        }));
    }

    // File transport với xoay vòng hàng ngày
    if (config.enableFile) {
        transports.push(new winston.transports.DailyRotateFile({
            filename: config.filePath,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: config.maxSize,
            maxFiles: config.maxFiles,
            level: config.level,
            format: winston.format.combine(
                winston.format.timestamp({ format: timestampFormat }),
                winston.format.json()
            ),
            silent: config.silent
        }));
    }

    // Nếu không có transport nào được bật, thêm console mặc định
    if (transports.length === 0) {
        transports.push(new winston.transports.Console({
            silent: true
        }));
    }

    // Exception và rejection handlers
    const exceptionHandlers = [
        new winston.transports.Console({ silent: config.silent })
    ];
    const rejectionHandlers = [
        new winston.transports.Console({ silent: config.silent })
    ];

    if (config.enableFile) {
        exceptionHandlers.push(
            new winston.transports.File({ filename: 'logs/exceptions.log' })
        );
        rejectionHandlers.push(
            new winston.transports.File({ filename: 'logs/rejections.log' })
        );
    }

    globalLogger = winston.createLogger({
        level: config.level,
        silent: config.silent,
        defaultMeta: {
            service: config.appName,
            version: config.version
        },
        transports,
        exceptionHandlers,
        rejectionHandlers
    });

    return globalLogger;
};

/**
 * Khởi tạo logger với cấu hình mặc định.
 * Tiện lợi khi không cần tùy chỉnh gì thêm.
 *
 * @returns {winston.Logger} Instance logger với cấu hình mặc định
 */
const initWithDefaults = () => init(DefaultConfig);

/**
 * Lấy instance logger toàn cục.
 * Nếu chưa được khởi tạo, tự động khởi tạo với cấu hình mặc định.
 *
 * @returns {winston.Logger} Instance logger toàn cục
 */
const L = () => {
    if (!globalLogger) {
        init();
    }
    return globalLogger;
};

/**
 * Ghi log mức info.
 *
 * @param {string} msg - Nội dung thông báo
 * @param {Object} [meta={}] - Metadata bổ sung
 */
const info = (msg, meta = {}) => L().info(msg, meta);

/**
 * Ghi log mức error.
 *
 * @param {string} msg - Nội dung lỗi
 * @param {Object} [meta={}] - Metadata bổ sung (ví dụ: stack trace, error code)
 */
const error = (msg, meta = {}) => L().error(msg, meta);

/**
 * Ghi log mức debug.
 *
 * @param {string} msg - Nội dung debug
 * @param {Object} [meta={}] - Metadata bổ sung
 */
const debug = (msg, meta = {}) => L().debug(msg, meta);

/**
 * Ghi log mức warn.
 *
 * @param {string} msg - Nội dung cảnh báo
 * @param {Object} [meta={}] - Metadata bổ sung
 */
const warn = (msg, meta = {}) => L().warn(msg, meta);

/**
 * Ghi log mức fatal (error) và thoát process.
 * Sử dụng cho các lỗi nghiêm trọng không thể phục hồi.
 *
 * Lưu ý: Hàm này sẽ gọi process.exit(1) sau khi ghi log.
 * Đảm bảo các transport đã flush xong trước khi thoát.
 *
 * @param {string} msg - Nội dung lỗi nghiêm trọng
 * @param {Object} [meta={}] - Metadata bổ sung
 */
const fatal = (msg, meta = {}) => {
    const logger = L();
    logger.error(`[FATAL] ${msg}`, meta);

    // Đợi các transport ghi xong trước khi thoát
    logger.on('finish', () => {
        process.exit(1);
    });

    // Kết thúc logger để flush buffer
    logger.end();

    // Fallback timeout nếu flush không hoàn thành trong 3 giây
    setTimeout(() => {
        process.exit(1);
    }, 3000);
};

/**
 * Tạo child logger với context bổ sung (tương tự Zap's With()).
 * Child logger kế thừa toàn bộ cấu hình từ logger cha,
 * nhưng thêm metadata cố định vào mọi log entry.
 *
 * @param {Object} context - Metadata cố định cho child logger
 * @returns {winston.Logger} Child logger với context đã gắn
 *
 * @example
 * const requestLogger = withContext({ requestId: 'abc-123', userId: 42 });
 * requestLogger.info('Xử lý request'); // Tự động kèm requestId và userId
 */
const withContext = (context = {}) => {
    return L().child(context);
};

module.exports = {
    init,
    initWithDefaults,
    L,
    info,
    error,
    debug,
    warn,
    fatal,
    withContext
};
