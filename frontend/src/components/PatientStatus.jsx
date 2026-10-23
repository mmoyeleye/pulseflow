import { useState } from 'react';
import { getPatientStatus } from '../services/api';
import PatientCard from './PatientCard';
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
      const result = await getPatientStatus(patientId.trim());
      setStatus(result);
    } catch (err) {
      setError(err.message || 'Patient not found');
    } finally {
      setLoading(false);
    }
  };

  const waiting = status && status.status === 'CHECKED_IN' && status.position;

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
            placeholder="Paste the Patient ID from check-in"
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Checking...' : 'Check Status'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {status && (
        <div className="status-result">
          {waiting ? (
            <div className="status-position">
              <span className="status-position__label">Your position</span>
              <span className="status-position__number">{status.position}</span>
              <span className="status-position__wait">
                About {status.estimatedWaitMinutes} minutes to wait
              </span>
            </div>
          ) : (
            <div className="status-position">
              <span className="status-position__label">Status</span>
              <span className="status-position__number status-position__number--small">
                {status.status === 'CALLED' ? 'You have been called' : status.status}
              </span>
            </div>
          )}

          <PatientCard patient={status} />
          {status.message && <p className="status-message">{status.message}</p>}
        </div>
      )}
    </div>
  );
}