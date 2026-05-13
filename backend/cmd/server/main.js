'use strict';

const path = require('path');

// Load biến môi trường từ file .env
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const logger = require('../../pkg/logger/tlog');

// Khởi tạo logger
logger.init();

// Load cấu hình ứng dụng (sẽ được implement đầy đủ sau)
const config = require('../../pkg/config');

const { setupDependencies } = require('./setup');

// ============================================================
// Hàm khởi động chính (async IIFE)
// ============================================================

(async function main() {
  let server;
  let sequelize;
  let redis;

  try {
    // Khởi tạo dependencies thông qua setup
    const deps = await setupDependencies(config);
    const app = deps.app;
    sequelize = deps.sequelize;
    redis = deps.redis;

    // ============================================================
    // Health check endpoint (base-level, trước khi đăng ký routes)
    // ============================================================

    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // ============================================================
    // Khởi động server
    // ============================================================

    const PORT = process.env.PORT || 3000;

    server = app.listen(PORT, () => {
      logger.info(`Server đang chạy tại port ${PORT}`);
      logger.info(`Môi trường: ${process.env.NODE_ENV || 'development'}`);
    });

    // ============================================================
    // Graceful shutdown - Xử lý tắt server an toàn
    // ============================================================

    function gracefulShutdown(signal) {
      logger.info(`Nhận tín hiệu ${signal}. Đang tắt server...`);

      server.close(async (err) => {
        if (err) {
          logger.error('Lỗi khi đóng HTTP server:', err);
          process.exit(1);
        }

        logger.info('HTTP server đã đóng.');

        try {
          // Đóng kết nối database
          if (sequelize) {
            await sequelize.close();
            logger.info('Đã đóng kết nối database.');
          }

          // Đóng kết nối Redis
          if (redis) {
            await redis.disconnect();
            logger.info('Đã đóng kết nối Redis.');
          }
        } catch (closeErr) {
          logger.error('Lỗi khi đóng kết nối:', closeErr);
        }

        logger.info('Tất cả kết nối đã được đóng. Thoát process.');
        process.exit(0);
      });

      // Timeout buộc thoát nếu không đóng được trong thời gian cho phép
      setTimeout(() => {
        logger.error('Không thể đóng server trong thời gian cho phép. Buộc thoát.');
        process.exit(1);
      }, 10000);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    logger.error('Lỗi khởi động server:', err);
    process.exit(1);
  }
})();

// ============================================================
// Xử lý lỗi không được bắt
// ============================================================

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection tại:', promise, 'lý do:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});
