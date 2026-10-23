const API_URL = import.meta.env.VITE_API_URL;

async function request(path, options = {}) {
  const response = await fetch(API_URL + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    throw new Error((data && data.message) || 'Request failed (' + response.status + ')');
  }
  return data;
}

export const checkIn = (name, phone, patientType) =>
  request('/checkin', {
    method: 'POST',
    body: JSON.stringify({ name, phone, patientType })
  });

export const getQueue = (dept = 'GOPD') => request('/queue/' + dept);

export const getPatientStatus = (patientId) => request('/patients/' + patientId);

export const callNextPatient = (dept = 'GOPD') =>
  request('/queue/' + dept + '/call-next', { method: 'POST' });

export const updatePatientStatus = (patientId, version) =>
  request('/patients/' + patientId + '/status', {
    method: 'PATCH',
    body: JSON.stringify({ expectedVersion: version })
  });