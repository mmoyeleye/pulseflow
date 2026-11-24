import { callNextPatient, updatePatientStatus } from "../services/api";
import { listPending, removeAction } from "./queueDb";

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
        let patient = null;
        if (action.type === "CALL_NEXT") {
          patient = await callNextPatient(action.dept);
        } else if (action.type === "UPDATE_STATUS") {
          await updatePatientStatus(
            action.patientId,
            action.version,
            action.status,
          );
        }
        await removeAction(action.id);
        results.push({ action, ok: true, patient });
      } catch (err) {
        if (isNetworkError(err)) break;
        await removeAction(action.id);
        results.push({ action, ok: false, message: err.message });
      }
    }
  } finally {
    running = false;
  }

  return results;
}
