import { callNextPatient, updatePatientStatus } from '../services/api';
import { listPending, removeAction } from './queueDb';

let running = false;

// fetch() throws a TypeError when there is no connection. Anything else is a reply from the server.
const isNetworkError = (err) => err instanceof TypeError;

export async function syncPending() {
  if (running) return [];
  running = true;
  const results = [];

  try {
    const pending = await listPending();
    for (const action of pending) {
      try {
        if (action.type === 'CALL_NEXT') {
          await callNextPatient(action.dept);
        } else if (action.type === 'UPDATE_STATUS') {
          await updatePatientStatus(action.patientId, action.version);
        }
        await removeAction(action.id);
        results.push({ action, ok: true });
      } catch (err) {
        if (isNetworkError(err)) break; // still offline: keep this and everything after it
        // The server refused it (queue empty, already called, version changed).
        // Drop it so it doesn't block the queue, and report it.
        await removeAction(action.id);
        results.push({ action, ok: false, message: err.message });
      }
    }
  } finally {
    running = false;
  }

  return results;
}