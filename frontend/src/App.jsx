import { useState } from 'react';
import Nav from './components/Nav';
import CheckInForm from './components/CheckInForm';
import QueueDashboard from './components/QueueDashboard';
import PatientStatus from './components/PatientStatus';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('checkin');

  return (
    <div className="app">
      <Nav currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <div className="page-content">
        {currentPage === 'checkin' && <CheckInForm />}
        {currentPage === 'queue' && <QueueDashboard />}
        {currentPage === 'status' && <PatientStatus />}
      </div>
    </div>
  );
}

export default App;