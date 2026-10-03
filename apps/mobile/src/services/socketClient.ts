import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from './apiClient';

let socket: Socket | null = null;
let pending: Promise<Socket> | null = null;
/** Bumped on every disconnect so an in-flight connect knows it is stale. */
let generation = 0;

/** Strips only a trailing `/api`, so a host like `api.handil.co.il` survives. */
export function socketUrlFrom(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/api\/?$/, '');
}

/**
 * Returns the one shared socket, creating it on first use.
 *
 * This used to create a new socket whenever the existing one was not yet
 * *connected*. On sign-in, the app shell and the open screen subscribe at the
 * same moment, so several sockets were opened and only the last was tracked.
 * Sign-out then disconnected that one and the rest stayed alive with the old
 * user's token — the next person on the device received their notifications.
 */
export function connectSocket(): Promise<Socket> {
  if (socket) return Promise.resolve(socket);
  if (pending) return pending;

  const startedIn = generation;
  const attempt = (async () => {
    const token = await AsyncStorage.getItem('handil_token');
    const s = io(socketUrlFrom(getBaseUrl()), {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    // Signed out while the token was being read — don't resurrect the session
    if (startedIn !== generation) {
      s.disconnect();
      return s;
    }
    socket = s;
    return s;
  })();

  pending = attempt;
  const clear = () => { if (pending === attempt) pending = null; };
  attempt.then(clear, clear);
  return attempt;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  generation += 1;
  pending = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
