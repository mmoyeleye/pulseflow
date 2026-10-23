import { useQueue } from '../context/QueueContext';
import PatientCard from './PatientCard';
import './StaffDashboard.css';

export default function StaffDashboard() {
  const { queue, loading, error, lastCalled, lastUpdated, callNext, refresh } = useQueue();
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
          <button
            className="btn btn--primary"
            onClick={callNext}
            disabled={loading || queue.length === 0}
          >
            {loading ? 'Calling…' : 'Call next patient'}
          </button>
          <button className="btn" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {lastCalled && (
        <div className="notice">
          Last called: <strong>{lastCalled.name}</strong> (queue #{lastCalled.queueNumber})
        </div>
      )}
      {error && <div className="error-message">{error}</div>}

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