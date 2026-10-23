import { useState } from 'react';
import Nav from './components/Nav';
import CheckInForm from './components/CheckInForm';
import StaffDashboard from './components/StaffDashboard';
import PatientStatus from './components/PatientStatus';
import { QueueProvider } from './context/QueueContext';
import './App.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('checkin');

  return (
    <QueueProvider dept="GOPD">
      <div className="app">
        <Nav currentPage={currentPage} setCurrentPage={setCurrentPage} />

        <main className="page-content">
          {currentPage === 'checkin' && <CheckInForm />}
          {currentPage === 'queue' && <StaffDashboard />}
          {currentPage === 'status' && <PatientStatus />}
        </main>
      </div>
    </QueueProvider>
  );
}