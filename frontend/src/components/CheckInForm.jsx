import { useState } from 'react';
import { checkIn } from '../services/api';
import './CheckInForm.css';

export default function CheckInForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [patientType, setPatientType] = useState('CASH');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

   const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await checkIn(name, phone, patientType);
      setSuccess({
        patientId: result.patientId,
        cardNumber: result.cardNumber,
        returningPatient: result.returningPatient,
        message: result.message
      });
      setName('');
      setPhone('');
      setPatientType('CASH');
    } catch (err) {
      setError(err.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkin-container">
      <h1>Hospital Patient Check-in</h1>
      
      <form onSubmit={handleSubmit} className="checkin-form">
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            type="tel"
            pattern="(\+?234|0)[789][01]\d{8}"
            title="Enter a valid Nigerian mobile number, e.g. 08012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08012345678"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="type">Insurance Type</label>
          <select
            id="type"
            value={patientType}
            onChange={(e) => setPatientType(e.target.value)}
          >
            <option value="CASH">Cash Payment</option>
            <option value="NHIA">NHIA (Government)</option>
            <option value="HMO">HMO (Private)</option>
            <option value="EMERGENCY">Emergency</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Check In'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}
      
      {success && (
        <div className="success-message">
                 <h2>✓ Check-in Successful!</h2>
          <p>Patient card: <strong>{success.cardNumber}</strong></p>
          {success.returningPatient && <p>Welcome back. Your existing card has been used.</p>}
          <p>Patient ID: {success.patientId}</p>
          <p>{success.message}</p>
          <p className="instruction">Keep your card number for future visits</p>
        </div>
      )}
    </div>
  );
}