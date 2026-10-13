import { useEffect, useRef } from 'react';
import { connectSocket } from '../services/socketClient';

/**
 * Subscribes to a Socket.io event for the lifetime of the component.
 *
 * Screens used to do this inline and return the unsubscribe from inside
 * `connectSocket().then(...)`. React never receives that function, so the
 * listener was never removed and a fresh one piled up on every remount —
 * after five visits to a screen each event fired its handler five times.
 *
 * The handler is held in a ref so passing an inline arrow function does not
 * resubscribe on every render.
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void,
  enabled: boolean = true,
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let detach: () => void = () => {};

    connectSocket()
      .then((socket) => {
        if (cancelled) {
          // Unmounted while the socket was still connecting
          return;
        }
        const listener = (payload: T) => savedHandler.current(payload);
        socket.on(event, listener);
        detach = () => socket.off(event, listener);
      })
      .catch(() => {
        // Offline or auth failure — the screen still works without live updates
      });

    return () => {
      cancelled = true;
      detach();
    };
  }, [event, enabled]);
}
