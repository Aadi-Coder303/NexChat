import { lazy, Suspense, useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';

const ChatLayout   = lazy(() => import('./features/chat/ChatLayout'));

// Minimal fullscreen fallback — no flash, matches background colour
const PageLoader = () => (
  <div className="min-h-[100dvh] bg-[#050505] flex items-center justify-center">
    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

function App() {
  const { user, deviceLogin } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await deviceLogin();
      } catch (error) {
        console.error('Failed to auto-login:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [deviceLogin]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Suspense fallback={<PageLoader />}>
        {user ? <ChatLayout /> : <div className="flex items-center justify-center min-h-screen">Failed to connect. Please refresh.</div>}
      </Suspense>
    </div>
  );
}

export default App;
