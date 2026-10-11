import { useState } from 'react';
import { getPatientStatus } from '../services/api';
import './PatientStatus.css';

export default function PatientStatus() {
  const [patientId, setPatientId] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheck = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const result = await getPatientStatus(patientId);
      setStatus(result);
    } catch (err) {
      setError(err.message || 'Patient not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="status-container">
      <h1>Check Your Status</h1>

      <form onSubmit={handleCheck} className="status-form">
        <div className="form-group">
          <label htmlFor="patientId">Enter Your Patient ID</label>
          <input
            id="patientId"
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder="pat-1234567890"
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Checking...' : 'Check Status'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {status && (
        <div className="status-card">
          <div className="status-header">
            <h2>{status.name}</h2>
            <div className="status-badge">{status.status}</div>
          </div>

          <div className="status-grid">
            <div className="status-item">
              <span className="label">Current Stage:</span>
              <span className="value">{status.currentStage}</span>
            </div>

            <div className="status-item">
              <span className="label">Queue Position:</span>
              <span className="value">{status.position}</span>
            </div>

            <div className="status-item">
              <span className="label">Estimated Wait:</span>
              <span className="value">{status.estimatedWaitMinutes} minutes</span>
            </div>

            <div className="status-item">
              <span className="label">Phone:</span>
              <span className="value">{status.phone}</span>
            </div>
          </div>

          <div className="status-message">
            <p>{status.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}