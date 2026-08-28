import { useEffect } from 'react';
import { wsManager } from '../services/websocket';

export function useWebSocket(event, handler) {
  useEffect(() => {
    const unsubscribe = wsManager.on(event, handler);
    return unsubscribe;
  }, [event, handler]);
}
