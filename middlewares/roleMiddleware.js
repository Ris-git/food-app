const { roles } = require('../config/roles');

// The Authorization Middleware
const authorize = (requiredPermission) => {
    return (req, res, next) => {
        
        if (!req.user || !req.user.role) {
            return res.status(403).json({ success: false, error: 'Access Denied: No role found' });
        }
        const userRole = req.user.role;
        const userPermissions = roles[userRole] || [];
        if (!userPermissions.includes(requiredPermission)) {
            return res.status(403).json({ 
                success: false, 
                error: `Forbidden: You do not have permission to perform this action.` 
            });
        }
        next();
    };
};

module.exports = authorize;