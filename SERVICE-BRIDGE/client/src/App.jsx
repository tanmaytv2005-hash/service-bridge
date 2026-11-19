import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Brand from './Brand.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import RoleHome from './pages/RoleHome.jsx';
import ProfessionalHome from './pages/ProfessionalHome.jsx';
import AdminHome from './pages/AdminHome.jsx';
import CustomerHome from './pages/CustomerHome.jsx';
import AdminCategories from './pages/AdminCategories.jsx';
import AdminAddProfessional from './pages/AdminAddProfessional.jsx';
import NewRequest from './pages/NewRequest.jsx';
import MyRequests from './pages/MyRequests.jsx';
import RequestDetail from './pages/RequestDetail.jsx';
import ProfessionalRequests from './pages/ProfessionalRequests.jsx';
import Bookings from './pages/Bookings.jsx';
import Earnings from './pages/Earnings.jsx';
import AdminPayments from './pages/AdminPayments.jsx';
import AdminVideo from './pages/AdminVideo.jsx';
import ProfessionalReviews from './pages/ProfessionalReviews.jsx';
import AdminComplaints from './pages/AdminComplaints.jsx';
import AdminAnalytics from './pages/AdminAnalytics.jsx';
import Notifications from './pages/Notifications.jsx';
import NotificationBell from './pages/NotificationBell.jsx';

function Nav() {
  const { user, logout } = useAuth();
  return (
    <header className="nav">
      <Brand />
      <div className="row">
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            {user.role === 'customer' && <Link to="/customer/requests">My requests</Link>}
            {user.role === 'professional' && <Link to="/professional/requests">Requests</Link>}
            {user.role === 'professional' && <Link to="/professional/earnings">Earnings</Link>}
            {user.role === 'professional' && <Link to="/professional/reviews">Reviews</Link>}
            {(user.role === 'customer' || user.role === 'professional') && <Link to="/bookings">Bookings</Link>}
            <NotificationBell />
            <button className="btn ghost" onClick={logout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register" className="btn">Sign up</Link>
          </>
        )}
      </div>
    </header>
  );
}

function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/customer" element={<ProtectedRoute roles={['customer']}><CustomerHome /></ProtectedRoute>} />
        <Route path="/professional" element={<ProtectedRoute roles={['professional']}><ProfessionalHome /></ProtectedRoute>} />
        <Route path="/admin/categories" element={<ProtectedRoute roles={['admin']}><AdminCategories /></ProtectedRoute>} />
        <Route path="/admin/professionals/new" element={<ProtectedRoute roles={['admin']}><AdminAddProfessional /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminHome /></ProtectedRoute>} />
        <Route path="/customer/requests/new" element={<ProtectedRoute roles={['customer']}><NewRequest /></ProtectedRoute>} />
        <Route path="/customer/requests/:id" element={<ProtectedRoute roles={['customer']}><RequestDetail /></ProtectedRoute>} />
        <Route path="/customer/requests" element={<ProtectedRoute roles={['customer']}><MyRequests /></ProtectedRoute>} />
        <Route path="/professional/requests" element={<ProtectedRoute roles={['professional']}><ProfessionalRequests /></ProtectedRoute>} />
        <Route path="/professional/earnings" element={<ProtectedRoute roles={['professional']}><Earnings /></ProtectedRoute>} />
        <Route path="/admin/payments" element={<ProtectedRoute roles={['admin']}><AdminPayments /></ProtectedRoute>} />
        <Route path="/admin/video" element={<ProtectedRoute roles={['admin']}><AdminVideo /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/professional/reviews" element={<ProtectedRoute roles={['professional']}><ProfessionalReviews /></ProtectedRoute>} />
        <Route path="/admin/complaints" element={<ProtectedRoute roles={['admin']}><AdminComplaints /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute roles={['customer', 'professional']}><Bookings /></ProtectedRoute>} />
        <Route path="*" element={<p className="center">Page not found.</p>} />
      </Routes>
      
    </>
  );
}
