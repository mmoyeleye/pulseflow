import { useState, useEffect } from 'react';
import { getQueue, callNextPatient } from '../services/api';
import './QueueDashboard.css';

export default function QueueDashboard() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchQueue();
    // Refresh every 5 seconds
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      setError(null);
      const result = await getQueue('GOPD');
      setQueue(result.queue || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch queue');
    }
  };

  const handleCallNext = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await callNextPatient('GOPD');
      setSuccess('Patient called: ' + result.name);
      // Refresh queue
      setTimeout(fetchQueue, 1000);
    } catch (err) {
      setError(err.message || 'Failed to call next patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="queue-container">
      <h1>Queue Dashboard - GOPD</h1>

      <div className="queue-controls">
        <button 
          onClick={handleCallNext} 
          disabled={loading || queue.length === 0}
          className="call-next-btn"
        >
          {loading ? 'Calling...' : 'Call Next Patient'}
        </button>
        <button onClick={fetchQueue} disabled={loading} className="refresh-btn">
          Refresh
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="queue-stats">
        <div className="stat">
          <span className="stat-label">Patients Waiting:</span>
          <span className="stat-value">{queue.length}</span>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="empty-queue">No patients in queue</div>
      ) : (
        <div className="queue-list">
          {queue.map((patient) => (
            <div key={patient.patientId} className="queue-item">
              <div className="queue-position">#{patient.position}</div>
              <div className="queue-info">
                <h3>{patient.name}</h3>
                <p>Phone: {patient.phone}</p>
                <p>Type: {patient.patientType}</p>
                <p>Stage: {patient.currentStage}</p>
              </div>
              <div className="queue-wait">
                <span className="wait-label">Est. Wait:</span>
                <span className="wait-time">{patient.estimatedWaitMinutes} min</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}