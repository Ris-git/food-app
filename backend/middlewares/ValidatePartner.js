const { body, validationResult } = require('express-validator');

const partnerValidationRules = [
  body('restaurantName')
    .trim()
    .notEmpty().withMessage('Restaurant name is required.')
    .isLength({ min: 2 }).withMessage('Restaurant name must be at least 2 characters long.'),

  body('cuisine')
    .trim()
    .notEmpty().withMessage('Cuisine type is required.')
    .isLength({ min: 2 }).withMessage('Cuisine must be at least 2 characters long.'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Contact phone number is required.')
    .isMobilePhone().withMessage('Please enter a valid phone number.'),

  body('address')
    .trim()
    .notEmpty().withMessage('Restaurant address is required.')
    .isLength({ min: 5 }).withMessage('Address must be at least 5 characters long.'),

  body('description')
    .optional()
    .trim()
];

const validatePartner = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return res.status(400).json({
      success: false,
      message: errorMessages.join(', '),
      errors: errors.array().map(err => ({ field: err.path, message: err.msg })),
    });
  }
  next();
};

module.exports = {
  partnerValidationRules,
  validatePartner,
};
