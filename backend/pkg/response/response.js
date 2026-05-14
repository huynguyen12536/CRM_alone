const { AppError, isAppError } = require('../../pkg/error/error');
const tlog = require('../../pkg/logger/tlog');

function getStackTrace(skip) {
    const err = {};
    Error.captureStackTrace(err, getStackTrace);
    const lines = err.stack.split('\n');
    return lines.slice(skip + 1).join('\n');
}

function getRequestContext(req) {
    const fields = {
        path: req.path || req.originalUrl,
        method: req.method,
        client_ip: req.ip,
    };
    const requestID = req.get('X-Request-ID');
    if (requestID) {
        fields.request_id = requestID;
    }
    if (req.user) {
        fields.user = req.user;
    }
    return fields;
}

function OK(res, data, message) {
    res.status(200).json({
        is_success: true,
        data,
        message,
    });
}

function Created(res, data, message) {
    res.status(201).json({
        is_success: true,
        data,
        message,
    });
}

function NoContent(res) {
    res.status(204).send();
}

function ValidationError(res, fields) {
    res.status(400).json({
        is_success: false,
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Dữ liệu không hợp lệ',
            fields,
        },
    });
}

function WriteErrorResponse(res, req, err) {
    if (isAppError(err)) {
        const logFields = getRequestContext(req);
        logFields.error_code = err.code;
        logFields.error_message = err.message;
        logFields.http_status = err.httpStatus;
        if (err.err) {
            logFields.error = err.err;
        }
        if (err.httpStatus >= 500) {
            logFields.stack_trace = getStackTrace(2);
            tlog.error('Server error', logFields);
        } else if (err.httpStatus >= 400) {
            tlog.warn('Client error', logFields);
        }
        res.status(err.httpStatus).json({
            is_success: false,
            error: {
                code: err.code,
                message: err.message,
            },
        });
        return;
    }
    const logFields = getRequestContext(req);
    logFields.stack_trace = getStackTrace(2);
    logFields.error = err;
    tlog.error('Unexpected error', logFields);
    res.status(500).json({
        is_success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Đã xảy ra lỗi máy chủ nội bộ',
        },
    });
}

module.exports = {
    OK,
    Created,
    NoContent,
    ValidationError,
    WriteErrorResponse,
};
