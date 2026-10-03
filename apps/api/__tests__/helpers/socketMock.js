/**
 * Shared Socket.io mock.
 *
 * Routes call `getIO()` and then either `io.emit(event, payload)` (broadcast)
 * or `io.to(room).emit(event, payload)` (targeted). This records every emit so
 * tests can assert that the right real-time event reached the right room.
 *
 * Usage in a test file:
 *
 *   jest.mock('../../src/socket', () => require('../helpers/socketMock').mock);
 *   const { emitted, reset } = require('../helpers/socketMock');
 *
 *   beforeEach(reset);
 *   expect(emitted.find((e) => e.event === 'new_quote')).toBeDefined();
 */

/** @type {{ room: string|null, event: string, payload: any }[]} */
const emitted = [];

function reset() {
  emitted.length = 0;
}

/** Every emit recorded for `event`. */
function eventsOf(event) {
  return emitted.filter((e) => e.event === event);
}

/** True if `event` was emitted to `room`. */
function emittedTo(room, event) {
  return emitted.some((e) => e.room === room && e.event === event);
}

const io = {
  // Broadcast to everyone — used by POST /api/posts ("new_post")
  emit(event, payload) {
    emitted.push({ room: null, event, payload });
  },
  // Targeted at a room — used for `user:<id>` notifications
  to(room) {
    return {
      emit(event, payload) {
        emitted.push({ room: String(room), event, payload });
      },
    };
  },
};

const mock = {
  getIO: () => io,
  initSocket: () => io,
};

module.exports = { mock, io, emitted, reset, eventsOf, emittedTo };
