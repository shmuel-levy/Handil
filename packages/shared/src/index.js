/**
 * @handil/shared — the contract both apps agree on.
 *
 * Categories, enums, limits and request schemas live here so the API and the
 * mobile client cannot drift apart.
 */
const categories = require('./categories');
const constants  = require('./constants');
const schemas    = require('./schemas');

module.exports = {
  ...categories,
  ...constants,
  schemas,
};
