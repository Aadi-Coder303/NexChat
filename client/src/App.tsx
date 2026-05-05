import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';

function App() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route 
          path="/" 
          element={user ? <div>Chat Interface</div> : <Navigate to="/login" />} 
        />
      </Routes>
    </div>
  );
}

export default App;
