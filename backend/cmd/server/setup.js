'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const logger = require('../../pkg/logger/tlog');

const database = require('../../internal/infra/database');

const { UserRepository } = require('../../internal/infra/persistence/user.repository');

const { createEnforcer } = require('../../internal/infra/authorization');

const { JWTService } = require('../../internal/usecase/service/jwt.service');
const { AuthService } = require('../../internal/usecase/service/auth.service');
const { UserService } = require('../../internal/usecase/service/user.service');
const { AuthorizationService } = require('../../internal/usecase/service/authorization.service');

const { createMiddleware } = require('../../internal/interface/api/middleware');

const { AuthHandler } = require('../../internal/interface/api/handler/auth.handler');
const { UserHandler } = require('../../internal/interface/api/handler/user.handler');
const { PolicyHandler } = require('../../internal/interface/api/handler/policy.handler');

const { setupRouter } = require('../../internal/interface/api/router');

const Redis = require('ioredis');

async function setupDependencies(config) {
  let sequelize;
  let redis;

  try {
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

    await redis.ping();
    logger.info('Kết nối Redis thành công');

    const userRepo = new UserRepository(sequelize);

    logger.info('Khởi tạo repository thành công');

    const enforcer = await createEnforcer(config.casbin.modelPath, sequelize);

    logger.info('Khởi tạo Casbin enforcer thành công');

    const jwtService = new JWTService(
      config.jwt.secret,
      config.jwt.accessExpiryMinutes,
      config.jwt.refreshExpiryHours
    );

    const authService = new AuthService(userRepo, jwtService);

    const userService = new UserService(userRepo);

    const authzService = new AuthorizationService(enforcer);

    logger.info('Khởi tạo service thành công');

    const mw = createMiddleware(jwtService, authzService, config.cors.origins);

    logger.info('Khởi tạo middleware thành công');

    const authHandler = new AuthHandler(authService, userService);

    const userHandler = new UserHandler(userService);

    const policyHandler = new PolicyHandler(authzService);

    logger.info('Khởi tạo handler thành công');

    const app = express();

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    app.use(
      cors({
        origin: config.cors.origins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );

    app.use(
      morgan('combined', {
        stream: { write: (message) => logger.http(message.trim()) },
      })
    );

    app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    setupRouter(app, {
      authHandler,
      userHandler,
      policyHandler,
      middleware: mw,
    });

    logger.info('Thiết lập Express app và router thành công');

    return { app, sequelize, redis };
  } catch (error) {
    logger.fatal('Không thể khởi tạo dependency của ứng dụng', {
      error: error.message,
      stack: error.stack,
    });

    if (redis) {
      await redis.quit().catch(() => {});
    }
    if (sequelize) {
      await sequelize.close().catch(() => {});
    }

    process.exit(1);
  }
}

module.exports = { setupDependencies };
