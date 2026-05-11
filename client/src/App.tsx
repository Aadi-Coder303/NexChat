import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Route-level code splitting — each page only loads when navigated to
const LoginPage    = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const RecoverPage  = lazy(() => import('./features/auth/RecoverPage'));
const ChatLayout   = lazy(() => import('./features/chat/ChatLayout'));

// Minimal fullscreen fallback — no flash, matches background colour
const PageLoader = () => (
  <div className="min-h-[100dvh] bg-[#050505] flex items-center justify-center">
    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

function App() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/recover"  element={<RecoverPage />} />
          <Route
            path="/"
            element={user ? <ChatLayout /> : <Navigate to="/login" />}
          />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
