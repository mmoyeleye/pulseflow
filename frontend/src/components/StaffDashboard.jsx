import { useQueue } from '../context/QueueContext';
import PatientCard from './PatientCard';
import './StaffDashboard.css';

export default function StaffDashboard() {
  const {
    queue, loading, error, lastCalled, lastUpdated,
    isOnline, pendingCount, notice,
    callNext, complete, refresh
  } = useQueue();
  const emergencies = queue.filter((p) => p.urgency === 'EMERGENCY').length;

  return (
    <section className="staff">
      <header className="staff__top">
        <div>
          <h1>Staff Dashboard — GOPD</h1>
          <p className="staff__meta">
            {queue.length} waiting · {emergencies} emergency · updated{' '}
            {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
          </p>
        </div>
        <div className="staff__actions">
          <button className="btn btn--primary" onClick={callNext} disabled={loading || queue.length === 0}>
            {loading ? 'Working…' : 'Call next patient'}
          </button>
          <button className="btn" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {!isOnline && <div className="offline-banner">Offline. Showing the last queue we received.</div>}
      {pendingCount > 0 && <div className="notice">{pendingCount} action(s) waiting to sync.</div>}
      {notice && <div className="notice">{notice}</div>}
      {error && <div className="error-message">{error}</div>}

      {lastCalled && (
        <div className="with-staff">
          <h2>With staff now</h2>
          <PatientCard patient={lastCalled} highlight />
          <button className="btn btn--primary" onClick={() => complete(lastCalled)} disabled={loading}>
            Mark consultation completed
          </button>
        </div>
      )}

      {queue.length === 0 ? (
        <div className="empty">No patients waiting</div>
      ) : (
        <ol className="staff__list">
          {queue.map((p) => (
            <li key={p.patientId}>
              <div className="staff__position">{p.position}</div>
              <PatientCard patient={p} />
              <div className="staff__wait">{p.estimatedWaitMinutes} min</div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}