

class AppError extends Error {

    constructor({ code, message, httpStatus, err = null }) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
        this.err = err;
    }

    toString() {
        if (this.err) {
            return `${this.code}: ${this.message} (${this.err.message || this.err})`;
        }
        return `${this.code}: ${this.message}`;
    }

    withMessage(message) {
        return new AppError({
            code: this.code,
            message,
            httpStatus: this.httpStatus,
            err: this.err,
        });
    }

    withError(err) {
        return new AppError({
            code: this.code,
            message: this.message,
            httpStatus: this.httpStatus,
            err,
        });
    }

    toJSON() {
        return {
            code: this.code,
            message: this.message,
        };
    }
}

// ─── 400 Bad Request ─────────────────────────────────────────────────────────

const ErrBadRequest = new AppError({
    code: 'BAD_REQUEST',
    message: 'Yêu cầu không hợp lệ',
    httpStatus: 400,
});

const ErrValidation = new AppError({
    code: 'VALIDATION_ERROR',
    message: 'Dữ liệu không hợp lệ',
    httpStatus: 400,
});

// ─── 401 Unauthorized ────────────────────────────────────────────────────────

const ErrUnauthorized = new AppError({
    code: 'UNAUTHORIZED',
    message: 'Chưa xác thực',
    httpStatus: 401,
});

const ErrInvalidCredentials = new AppError({
    code: 'INVALID_CREDENTIALS',
    message: 'Thông tin đăng nhập không chính xác',
    httpStatus: 401,
});

const ErrTokenExpired = new AppError({
    code: 'TOKEN_EXPIRED',
    message: 'Token đã hết hạn',
    httpStatus: 401,
});

// ─── 403 Forbidden ───────────────────────────────────────────────────────────

const ErrForbidden = new AppError({
    code: 'FORBIDDEN',
    message: 'Không có quyền truy cập',
    httpStatus: 403,
});

// ─── 404 Not Found ───────────────────────────────────────────────────────────

const ErrNotFound = new AppError({
    code: 'NOT_FOUND',
    message: 'Không tìm thấy tài nguyên',
    httpStatus: 404,
});

const ErrUserNotFound = new AppError({
    code: 'USER_NOT_FOUND',
    message: 'Không tìm thấy người dùng',
    httpStatus: 404,
});

// ─── 409 Conflict ────────────────────────────────────────────────────────────

const ErrConflict = new AppError({
    code: 'CONFLICT',
    message: 'Dữ liệu đã tồn tại',
    httpStatus: 409,
});

const ErrUsernameExists = new AppError({
    code: 'USERNAME_EXISTS',
    message: 'Tên đăng nhập đã tồn tại',
    httpStatus: 409,
});

const ErrEmailExists = new AppError({
    code: 'EMAIL_EXISTS',
    message: 'Email đã tồn tại',
    httpStatus: 409,
});

// ─── 429 Too Many Requests ───────────────────────────────────────────────────

const ErrTooManyRequests = new AppError({
    code: 'TOO_MANY_REQUESTS',
    message: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
    httpStatus: 429,
});

// ─── 500 Internal Server Error ───────────────────────────────────────────────

const ErrInternalServerError = new AppError({
    code: 'INTERNAL_ERROR',
    message: 'Đã xảy ra lỗi máy chủ nội bộ',
    httpStatus: 500,
});

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Kiểm tra một error có phải là AppError không.
 *
 * @param {Error} err
 * @returns {boolean}
 */
const isAppError = (err) => err instanceof AppError;

module.exports = {
    AppError,
    ErrBadRequest,
    ErrValidation,
    ErrUnauthorized,
    ErrInvalidCredentials,
    ErrTokenExpired,
    ErrForbidden,
    ErrNotFound,
    ErrUserNotFound,
    ErrConflict,
    ErrUsernameExists,
    ErrEmailExists,
    ErrTooManyRequests,
    ErrInternalServerError,
    isAppError,
};
