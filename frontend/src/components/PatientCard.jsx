import './PatientCard.css';

export default function PatientCard({ patient, highlight = false }) {
  const isEmergency = patient.urgency === 'EMERGENCY' || patient.patientType === 'EMERGENCY';

  return (
    <article
      className={[
        'patient-card',
        isEmergency ? 'is-emergency' : '',
        highlight ? 'is-highlight' : ''
      ].join(' ')}
    >
      <header className="patient-card__header">
        <span className="patient-card__queue">Queue #{patient.queueNumber ?? '—'}</span>
        {isEmergency && <span className="patient-card__tag">EMERGENCY</span>}
      </header>

      <h3 className="patient-card__name">{patient.name}</h3>

      <dl className="patient-card__meta">
        <div>
          <dt>Card</dt>
          <dd>{patient.cardNumber || '—'}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{patient.patientType}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{patient.phone || '—'}</dd>
        </div>
        <div>
          <dt>Stage</dt>
          <dd>{patient.currentStage || '—'}</dd>
        </div>
      </dl>
    </article>
  );
}