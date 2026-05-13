'use strict';

/**
 * @fileoverview Dependency Injection / Wiring - Khởi tạo và kết nối tất cả các tầng của ứng dụng.
 *
 * File này chịu trách nhiệm:
 * - Khởi tạo kết nối cơ sở dữ liệu (Sequelize + PostgreSQL)
 * - Khởi tạo kết nối Redis (ioredis)
 * - Tạo các repository
 * - Tạo các service (business logic)
 * - Tạo middleware (xác thực, phân quyền, CORS)
 * - Tạo các handler (HTTP controllers)
 * - Thiết lập Express router
 *
 * @module cmd/server/setup
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// --- Các module nội bộ (placeholder - sẽ được implement sau) ---

// Cấu hình ứng dụng
// TODO: Implement module config tại pkg/config
// const config = require('../../pkg/config');

// Logger (Winston)
// TODO: Implement module logger tại pkg/logger/tlog
const logger = require('../../pkg/logger/tlog');

// Kết nối cơ sở dữ liệu - Sequelize + PostgreSQL
// TODO: Implement module database tại internal/infra/database
const database = require('../../internal/infra/database');

// Repository - Tầng truy cập dữ liệu
// TODO: Implement các repository tại internal/infra/persistence
const { UserRepository } = require('../../internal/infra/persistence/user.repository');

// Phân quyền - Casbin hoặc tương tự
// TODO: Implement module authorization tại internal/infra/authorization
const { createEnforcer } = require('../../internal/infra/authorization');

// Service - Tầng business logic
// TODO: Implement các service tại internal/usecase/service
const { JWTService } = require('../../internal/usecase/service/jwt.service');
const { AuthService } = require('../../internal/usecase/service/auth.service');
const { UserService } = require('../../internal/usecase/service/user.service');
const { AuthorizationService } = require('../../internal/usecase/service/authorization.service');

// Middleware - Xác thực và phân quyền
// TODO: Implement middleware tại internal/interface/api/middleware
const { createMiddleware } = require('../../internal/interface/api/middleware');

// Handler - Tầng xử lý HTTP request
// TODO: Implement các handler tại internal/interface/api/handler
const { AuthHandler } = require('../../internal/interface/api/handler/auth.handler');
const { UserHandler } = require('../../internal/interface/api/handler/user.handler');
const { PolicyHandler } = require('../../internal/interface/api/handler/policy.handler');

// Router - Định tuyến HTTP
// TODO: Implement router tại internal/interface/api/router
const { setupRouter } = require('../../internal/interface/api/router');

// Redis client
const Redis = require('ioredis');

/**
 * Khởi tạo và kết nối tất cả các dependency của ứng dụng.
 *
 * Hàm này thực hiện Dependency Injection theo thứ tự:
 * 1. Kết nối infrastructure (DB, Redis)
 * 2. Tạo repository (tầng truy cập dữ liệu)
 * 3. Tạo service (tầng business logic)
 * 4. Tạo middleware (xác thực, phân quyền)
 * 5. Tạo handler (tầng xử lý HTTP)
 * 6. Thiết lập router và Express app
 *
 * @async
 * @param {Object} config - Đối tượng cấu hình ứng dụng
 * @param {Object} config.db - Cấu hình cơ sở dữ liệu PostgreSQL
 * @param {string} config.db.host - Địa chỉ host của database
 * @param {number} config.db.port - Cổng kết nối database
 * @param {string} config.db.name - Tên database
 * @param {string} config.db.username - Tên đăng nhập database
 * @param {string} config.db.password - Mật khẩu database
 * @param {Object} config.redis - Cấu hình Redis
 * @param {string} config.redis.host - Địa chỉ host của Redis
 * @param {number} config.redis.port - Cổng kết nối Redis
 * @param {string} config.redis.password - Mật khẩu Redis (nếu có)
 * @param {Object} config.jwt - Cấu hình JWT
 * @param {string} config.jwt.secret - Khóa bí mật JWT
 * @param {number} config.jwt.accessExpiryMinutes - Thời gian hết hạn access token (phút)
 * @param {number} config.jwt.refreshExpiryHours - Thời gian hết hạn refresh token (giờ)
 * @param {Object} config.casbin - Cấu hình Casbin
 * @param {string} config.casbin.modelPath - Đường dẫn file model Casbin
 * @param {Object} config.cors - Cấu hình CORS
 * @param {string[]} config.cors.origins - Danh sách origin được phép
 * @returns {Promise<{app: express.Application, sequelize: import('sequelize').Sequelize, redis: import('ioredis').Redis}>}
 *   Trả về đối tượng chứa Express app, Sequelize instance và Redis client để main.js quản lý shutdown
 * @throws {Error} Ném lỗi nếu không thể khởi tạo các dependency quan trọng
 */
async function setupDependencies(config) {
  let sequelize;
  let redis;

  try {
    // ========================================
    // 1. KHỞI TẠO KẾT NỐI CƠ SỞ DỮ LIỆU
    // ========================================

    // Khởi tạo Sequelize với PostgreSQL
    sequelize = await database.connect({
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      username: config.db.username,
      password: config.db.password,
      dialect: 'postgres',
      logging: (msg) => logger.debug(msg),
    });

    logger.info('Kết nối cơ sở dữ liệu PostgreSQL thành công');

    // ========================================
    // 2. KHỞI TẠO KẾT NỐI REDIS
    // ========================================

    // Khởi tạo Redis client cho caching và session
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Kiểm tra kết nối Redis
    await redis.ping();
    logger.info('Kết nối Redis thành công');

    // ========================================
    // 3. KHỞI TẠO REPOSITORY (Tầng truy cập dữ liệu)
    // ========================================

    // TODO: Thêm các repository khác khi cần (roleRepo, permissionRepo, v.v.)
    const userRepo = new UserRepository(sequelize);

    logger.info('Khởi tạo repository thành công');

    // ========================================
    // 4. KHỞI TẠO PHÂN QUYỀN (Casbin)
    // ========================================

    // Khởi tạo Casbin enforcer với model và adapter từ database
    const enforcer = await createEnforcer(config.casbin.modelPath, sequelize);

    logger.info('Khởi tạo Casbin enforcer thành công');

    // ========================================
    // 5. KHỞI TẠO SERVICE (Tầng business logic)
    // ========================================

    // Service xử lý JWT token (tạo, xác thực, làm mới token)
    const jwtService = new JWTService(
      config.jwt.secret,
      config.jwt.accessExpiryMinutes,
      config.jwt.refreshExpiryHours
    );

    // Service xác thực người dùng (đăng nhập, đăng ký, đổi mật khẩu)
    const authService = new AuthService(userRepo, jwtService);

    // Service quản lý người dùng (CRUD operations)
    const userService = new UserService(userRepo);

    // Service phân quyền (kiểm tra quyền truy cập)
    const authzService = new AuthorizationService(enforcer);

    logger.info('Khởi tạo service thành công');

    // ========================================
    // 6. KHỞI TẠO MIDDLEWARE
    // ========================================

    // Tạo middleware xác thực và phân quyền
    const mw = createMiddleware(jwtService, authzService, config.cors.origins);

    logger.info('Khởi tạo middleware thành công');

    // ========================================
    // 7. KHỞI TẠO HANDLER (Tầng xử lý HTTP request)
    // ========================================

    // Handler xử lý các request liên quan đến xác thực
    const authHandler = new AuthHandler(authService, userService);

    // Handler xử lý các request liên quan đến quản lý người dùng
    const userHandler = new UserHandler(userService);

    // Handler xử lý các request liên quan đến chính sách phân quyền
    const policyHandler = new PolicyHandler(authzService);

    logger.info('Khởi tạo handler thành công');

    // ========================================
    // 8. THIẾT LẬP EXPRESS APP VÀ ROUTER
    // ========================================

    const app = express();

    // Middleware cơ bản của Express
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // CORS - Cấu hình Cross-Origin Resource Sharing
    app.use(
      cors({
        origin: config.cors.origins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );

    // HTTP request logging với Morgan
    app.use(
      morgan('combined', {
        stream: { write: (message) => logger.http(message.trim()) },
      })
    );

    // Health check endpoint - Kiểm tra trạng thái ứng dụng
    app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Thiết lập router với tất cả các handler và middleware
    setupRouter(app, {
      authHandler,
      userHandler,
      policyHandler,
      middleware: mw,
    });

    logger.info('Thiết lập Express app và router thành công');

    // ========================================
    // 9. TRẢ VỀ CÁC THÀNH PHẦN CẦN THIẾT
    // ========================================

    // Trả về app, sequelize, redis để main.js có thể quản lý graceful shutdown
    return { app, sequelize, redis };
  } catch (error) {
    // Ghi log lỗi nghiêm trọng và dừng ứng dụng
    logger.fatal('Không thể khởi tạo dependency của ứng dụng', {
      error: error.message,
      stack: error.stack,
    });

    // Đóng các kết nối đã mở (nếu có) trước khi thoát
    if (redis) {
      await redis.quit().catch(() => {});
    }
    if (sequelize) {
      await sequelize.close().catch(() => {});
    }

    // Thoát process với mã lỗi
    process.exit(1);
  }
}

module.exports = { setupDependencies };
