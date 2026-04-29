import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
// import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Employees from './pages/Employees';
import Services from './pages/Services';
import Bookings from './pages/Bookings';
import Branches from './pages/Branches';
import EmployeeSchedules from './pages/EmployeeSchedules';
import Settings from './pages/Settings';
import Sidebar from './components/Sidebar';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const userRole = session?.user?.user_metadata?.role || session?.user?.app_metadata?.role;

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        localStorage.setItem('sb_access_token', session.access_token);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        localStorage.setItem('sb_access_token', session.access_token);
      } else {
        localStorage.removeItem('sb_access_token');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    localStorage.removeItem('sb_access_token');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#afafaf' }}>Đang tải...</p>
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  return (
    <div className="app-layout">
      <Sidebar user={session.user} onLogout={handleLogout} />
      <div className="main-content">
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Bookings />} />
            <Route path="/customers" element={<Customers />} />

            {userRole === 'admin' && (
              <>
                <Route path="/employees" element={<Employees />} />
                <Route path="/services" element={<Services />} />
                <Route path="/branches" element={<Branches />} />
                <Route path="/schedules" element={<EmployeeSchedules />} />
                <Route path="/settings" element={<Settings />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      <ToastContainer
        position="bottom-right"
        hideProgressBar={false}
        autoClose={2500}
      />
    </div>
  );
}

export default App;
