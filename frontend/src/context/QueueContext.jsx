import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { getQueue, callNextPatient } from '../services/api';

const POLL_MS = 5000;
const QueueContext = createContext(null);

const initialState = {
  queue: [],
  lastUpdated: null,
  loading: false,
  error: null,
  lastCalled: null
};

function reducer(state, action) {
  switch (action.type) {
    case 'QUEUE_LOADED':
      return { ...state, queue: action.queue, lastUpdated: new Date(), error: null };
    case 'QUEUE_ERROR':
      return { ...state, error: action.error };
    case 'CALL_START':
      return { ...state, loading: true, error: null };
    case 'CALL_SUCCESS':
      return { ...state, loading: false, lastCalled: action.patient };
    case 'CALL_ERROR':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

export function QueueProvider({ children, dept = 'GOPD' }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refresh = useCallback(async () => {
    try {
      const data = await getQueue(dept);
      dispatch({ type: 'QUEUE_LOADED', queue: data.queue || [] });
    } catch (err) {
      dispatch({ type: 'QUEUE_ERROR', error: err.message });
    }
  }, [dept]);

  // Poll the queue every few seconds so every staff screen stays current
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const callNext = useCallback(async () => {
    dispatch({ type: 'CALL_START' });
    try {
      const patient = await callNextPatient(dept);
      dispatch({ type: 'CALL_SUCCESS', patient });
      await refresh();
    } catch (err) {
      dispatch({ type: 'CALL_ERROR', error: err.message });
    }
  }, [dept, refresh]);

  return (
    <QueueContext.Provider value={{ ...state, refresh, callNext }}>
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueue must be used inside QueueProvider');
  return ctx;
}