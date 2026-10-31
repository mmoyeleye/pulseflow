import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { getQueue, callNextPatient } from '../services/api';
import { enqueue, listPending } from '../offline/queueDb';
import { syncPending } from '../offline/syncEngine';

const POLL_MS = 5000;
const QueueContext = createContext(null);

const initialState = {
  queue: [],
  lastUpdated: null,
  loading: false,
  error: null,
  lastCalled: null,
  pendingCount: 0,
  isOnline: navigator.onLine,
  notice: null
};

function reducer(state, action) {
  switch (action.type) {
    case 'QUEUE_LOADED':
      return { ...state, queue: action.queue, lastUpdated: new Date(), error: null, isOnline: true };
    case 'NETWORK_DOWN':
      return { ...state, isOnline: false };
    case 'NETWORK_UP':
      return { ...state, isOnline: true };
    case 'QUEUE_ERROR':
      return { ...state, error: action.error };
    case 'CALL_START':
      return { ...state, loading: true, error: null, notice: null };
    case 'CALL_SUCCESS':
      return { ...state, loading: false, lastCalled: action.patient };
    case 'CALL_QUEUED':
      return { ...state, loading: false, notice: 'Offline: this call will be sent when the connection returns.' };
    case 'CALL_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'PENDING_COUNT':
      return { ...state, pendingCount: action.count };
    case 'SYNC_REPORT':
      return { ...state, notice: action.notice };
    default:
      return state;
  }
}

export function QueueProvider({ children, dept = 'GOPD' }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refreshPending = useCallback(async () => {
    const pending = await listPending();
    dispatch({ type: 'PENDING_COUNT', count: pending.length });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await getQueue(dept);
      dispatch({ type: 'QUEUE_LOADED', queue: data.queue || [] });
    } catch (err) {
      if (err instanceof TypeError) dispatch({ type: 'NETWORK_DOWN' });
      else dispatch({ type: 'QUEUE_ERROR', error: err.message });
    }
  }, [dept]);

  const sync = useCallback(async () => {
    const results = await syncPending();
    if (results.length > 0) {
      const sent = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);
      let notice = `Synced ${sent} offline action(s).`;
      if (failed.length > 0) {
        notice += ` ${failed.length} could not be applied: ${failed.map((f) => f.message).join('; ')}`;
      }
      dispatch({ type: 'SYNC_REPORT', notice });
    }
    await refreshPending();
    await refresh();
  }, [refresh, refreshPending]);

  // Browser online/offline events, plus a retry every few seconds while offline
  useEffect(() => {
    const goOnline = () => {
      dispatch({ type: 'NETWORK_UP' });
      sync();
    };
    const goOffline = () => dispatch({ type: 'NETWORK_DOWN' });
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [sync]);

  useEffect(() => {
    sync();
    const id = setInterval(sync, POLL_MS);
    return () => clearInterval(id);
  }, [sync]);

  const callNext = useCallback(async () => {
    dispatch({ type: 'CALL_START' });
    try {
      const patient = await callNextPatient(dept);
      dispatch({ type: 'CALL_SUCCESS', patient });
      await refresh();
    } catch (err) {
      if (err instanceof TypeError) {
        await enqueue({ type: 'CALL_NEXT', dept });
        dispatch({ type: 'CALL_QUEUED' });
        await refreshPending();
      } else {
        dispatch({ type: 'CALL_ERROR', error: err.message });
      }
    }
  }, [dept, refresh, refreshPending]);

  return (
    <QueueContext.Provider value={{ ...state, refresh, callNext, sync }}>
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueue must be used inside QueueProvider');
  return ctx;
}