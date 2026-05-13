
const { newEnforcer } = require('casbin');
const tlog = require('../../../pkg/logger/tlog');


let enforcer = null;


const initEnforcer = async (modelPath, policyPath) => {
    try {
        if (policyPath) {

            enforcer = await newEnforcer(modelPath, policyPath);
        } else {

            enforcer = await newEnforcer(modelPath);
        }


        enforcer.enableAutoSave(true);


        await seedDefaultPolicies(enforcer);

        tlog.info('Casbin enforcer initialized', {
            model: modelPath,
            policy: policyPath || 'in-memory',
        });

        return enforcer;
    } catch (err) {
        tlog.error('Failed to create casbin enforcer', {
            error: err.message,
            model: modelPath,
        });
        throw err;
    }
};


const seedDefaultPolicies = async (e) => {
    const policies = await e.getPolicy();

    if (policies.length === 0) {

        await e.addPolicy('admin', '*', '*');

        await e.addPolicy('viewer', '*', 'GET');

        tlog.info('Default casbin policies seeded', {
            policiesAdded: 2,
        });
    }
};


const getEnforcer = () => {
    if (!enforcer) {
        throw new Error('Casbin enforcer not initialized. Call initEnforcer() first.');
    }
    return enforcer;
};


const checkPermission = async (sub, obj, act) => {
    if (!enforcer) {
        throw new Error('Casbin enforcer not initialized. Call initEnforcer() first.');
    }
    return enforcer.enforce(sub, obj, act);
};


const casbinMiddleware = (getRoleFromReq) => {
    return async (req, res, next) => {
        try {
            const role = getRoleFromReq(req);
            const obj = req.path;
            const act = req.method;

            const allowed = await checkPermission(role, obj, act);

            if (!allowed) {
                return res.status(403).json({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Bạn không có quyền truy cập tài nguyên này',
                    },
                });
            }

            next();
        } catch (err) {
            tlog.error('Authorization check failed', {
                error: err.message,
                path: req.path,
                method: req.method,
            });
            return res.status(500).json({
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Lỗi kiểm tra quyền truy cập',
                },
            });
        }
    };
};

module.exports = {
    initEnforcer,
    getEnforcer,
    checkPermission,
    casbinMiddleware,
};
