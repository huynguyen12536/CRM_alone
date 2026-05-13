/**
 * Module Error Helpers - Wrap lỗi từ Prisma thành AppError.
 *
 * Tương tự package persistence trong Go:
 * - Nhận diện lỗi NotFound, Duplicate Key từ Prisma
 * - Wrap thành AppError chuẩn với message tiếng Việt
 *
 * @module internal/infra/persistence/error_helpers
 */

const { Prisma } = require('../../generated/prisma');
const {
    ErrNotFound,
    ErrConflict,
    ErrInternalServerError,
} = require('../../../pkg/error/error');

/**
 * Kiểm tra lỗi có phải NotFound không.
 * Prisma throw P2025 khi record không tồn tại.
 *
 * @param {Error} err
 * @returns {boolean}
 */
const isNotFoundError = (err) => {
    return (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
    );
};

/**
 * Kiểm tra lỗi có phải Duplicate Key (unique constraint violation) không.
 * Prisma throw P2002 khi vi phạm unique constraint.
 *
 * @param {Error} err
 * @returns {boolean}
 */
const isDuplicateKeyError = (err) => {
    return (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
    );
};

/**
 * Wrap lỗi khi tìm kiếm (findUnique, findFirst).
 *
 * @param {Error} err - Lỗi gốc từ Prisma
 * @param {string} entityName - Tên entity (ví dụ: 'người dùng', 'sản phẩm')
 * @returns {AppError}
 */
const wrapFindError = (err, entityName) => {
    if (isNotFoundError(err)) {
        return ErrNotFound
            .withMessage(`Không tìm thấy ${entityName}`)
            .withError(err);
    }
    return ErrInternalServerError
        .withMessage(`Không thể truy vấn ${entityName}`)
        .withError(err);
};

/**
 * Wrap lỗi khi tạo mới (create).
 *
 * @param {Error} err - Lỗi gốc từ Prisma
 * @param {string} entityName - Tên entity
 * @returns {AppError}
 */
const wrapCreateError = (err, entityName) => {
    if (isDuplicateKeyError(err)) {
        return ErrConflict
            .withMessage(`${entityName} đã tồn tại`)
            .withError(err);
    }
    return ErrInternalServerError
        .withMessage(`Không thể tạo ${entityName}`)
        .withError(err);
};

/**
 * Wrap lỗi khi cập nhật (update).
 *
 * @param {Error} err - Lỗi gốc từ Prisma
 * @param {string} entityName - Tên entity
 * @returns {AppError}
 */
const wrapUpdateError = (err, entityName) => {
    if (isDuplicateKeyError(err)) {
        return ErrConflict
            .withMessage(`${entityName} đã tồn tại`)
            .withError(err);
    }
    return ErrInternalServerError
        .withMessage(`Không thể cập nhật ${entityName}`)
        .withError(err);
};

/**
 * Wrap lỗi khi xóa (delete).
 *
 * @param {Error} err - Lỗi gốc từ Prisma
 * @param {string} entityName - Tên entity
 * @returns {AppError}
 */
const wrapDeleteError = (err, entityName) => {
    return ErrInternalServerError
        .withMessage(`Không thể xóa ${entityName}`)
        .withError(err);
};

/**
 * Wrap lỗi khi lấy danh sách (findMany).
 *
 * @param {Error} err - Lỗi gốc từ Prisma
 * @param {string} entityName - Tên entity
 * @returns {AppError}
 */
const wrapListError = (err, entityName) => {
    return ErrInternalServerError
        .withMessage(`Không thể lấy danh sách ${entityName}`)
        .withError(err);
};

module.exports = {
    isNotFoundError,
    isDuplicateKeyError,
    wrapFindError,
    wrapCreateError,
    wrapUpdateError,
    wrapDeleteError,
    wrapListError,
};
