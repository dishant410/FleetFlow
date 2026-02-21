/**
 * validateRequest — Express middleware factory for Joi schema validation
 * @param {Joi.ObjectSchema} schema - Joi schema to validate req.body
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(400).json({ message: 'Validation error', errors: messages });
    }
    next();
  };
};

/**
 * validateQuery — Express middleware factory for Joi query params validation
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(400).json({ message: 'Validation error', errors: messages });
    }
    req.query = value;
    next();
  };
};

module.exports = { validateRequest, validateQuery };
