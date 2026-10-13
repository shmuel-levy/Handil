const mongoose = require('mongoose');

/**
 * `router.param` handler that answers 404 for a malformed id.
 *
 * Without it `findById('abc')` throws a CastError, which the routes reported as
 * a 500 — and some of them echoed Mongoose's internal message to the client.
 */
function objectIdParam(message = 'לא נמצא') {
  return (req, res, next, value) => {
    if (!mongoose.isValidObjectId(value)) return res.status(404).json({ message });
    next();
  };
}

module.exports = { objectIdParam };
