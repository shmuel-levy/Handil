/**
 * Logs an unexpected error and answers a generic 500.
 *
 * Several routes used to send `err.message` straight to the client, exposing
 * driver and validation internals. The detail belongs in the server log.
 */
function serverError(res, err) {
  if (process.env.NODE_ENV !== 'test') console.error('❌', err);
  return res.status(500).json({ message: 'שגיאת שרת' });
}

module.exports = { serverError };
