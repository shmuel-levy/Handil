/**
 * Builds an atomic `$inc` for the unread counter of every recipient.
 *
 * Counts used to be read, incremented in JS and written back with `$set`, so
 * two messages sent close together both read the same value and one of them
 * was lost. `$inc` is applied by MongoDB and cannot race.
 */
function unreadIncrement(recipientIds) {
  const inc = {};
  for (const id of recipientIds) inc[`unreadCounts.${id}`] = 1;
  return inc;
}

module.exports = { unreadIncrement };
