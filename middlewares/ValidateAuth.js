const { body, validationResult } = require('express-validator');

//sign up
const signupValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  
  body('email')
    .trim()
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isAlphanumeric().withMessage('Username must contain only letters and numbers'),
  
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  
  body('phone')
    .trim()
    .isMobilePhone().withMessage('Please enter a valid phone number')
];

// for Login Form
const loginValidationRules = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

//  if validation passed or failed
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  // If there are errors, stop execution and return 400 Bad Request
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
    });
  }
  
  // If validation passed, pass control to the next middleware
  next();
};

module.exports = {
  signupValidationRules,
  loginValidationRules,
  validate
};