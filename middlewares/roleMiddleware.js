const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Admins bypass all restrictions
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if the user's role is permitted for this endpoint
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role (${req.user.role}) is not authorized to access this resource` 
      });
    }
    
    next();
  };
};

module.exports = authorize;