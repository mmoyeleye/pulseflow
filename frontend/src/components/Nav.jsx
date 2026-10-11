import './Nav.css';

export default function Nav({ currentPage, setCurrentPage }) {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <h1 className="nav-title">Hospital Queue</h1>
        <div className="nav-buttons">
          <button 
            className={currentPage === 'checkin' ? 'active' : ''}
            onClick={() => setCurrentPage('checkin')}
          >
            Check In
          </button>
          <button 
            className={currentPage === 'queue' ? 'active' : ''}
            onClick={() => setCurrentPage('queue')}
          >
            Queue Dashboard
          </button>
          <button 
            className={currentPage === 'status' ? 'active' : ''}
            onClick={() => setCurrentPage('status')}
          >
            Check Status
          </button>
        </div>
      </div>
    </nav>
  );
}