const API_URL = import.meta.env.VITE_API_URL;

// Check-in: Register patient
export const checkIn = async (name, phone, patientType) => {
  const response = await fetch(API_URL + '/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name,
      phone: phone,
      patientType: patientType
    })
  });

  if (!response.ok) throw new Error('Check-in failed');
  return response.json();
};

// Get queue
export const getQueue = async (dept) => {
  const url = API_URL + '/queue/' + (dept || 'GOPD');
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to get queue');
  return response.json();
};

// Get patient status
export const getPatientStatus = async (patientId) => {
  const url = API_URL + '/patients/' + patientId;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Patient not found');
  return response.json();
};

// Call next patient
export const callNextPatient = async (dept) => {
  const url = API_URL + '/queue/' + (dept || 'GOPD') + '/call-next';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('Failed to call next');
  return response.json();
};

// Update patient status
export const updatePatientStatus = async (patientId, version) => {
  const url = API_URL + '/patients/' + patientId + '/status';
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedVersion: version })
  });
  if (!response.ok) throw new Error('Failed to update status');
  return response.json();
};