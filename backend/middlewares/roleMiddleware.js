const { roles } = require('../config/roles');
// The Authorization Middleware
const authorize = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, error: 'Access Denied: No role found' });
    }

    const required = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];

    const rolePermissions = roles[req.user.role] || [];

    const userPermissions = Array.isArray(req.user.permissions)
      ? req.user.permissions
      : typeof req.user.permissions === 'string'
        ? req.user.permissions.split(',').map(p => p.trim())
        : [];

    const combinedPermissions = [...new Set([...rolePermissions, ...userPermissions])];

    const hasPermission = required.some(permission => combinedPermissions.includes(permission));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to perform this action.'
      });
    }

    next();
  };
};

module.exports = authorize;

