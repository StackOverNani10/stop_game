import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GameProvider } from './contexts/GameContext';
import { supabase } from './lib/supabase';
import { Layout } from './components/layout/Layout';
import LoadingScreen from './components/screen/LoadingScreen';
import { Auth } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { Game } from './pages/Game'
import { JoinGame } from './pages/JoinGame'
import { Ranking } from './pages/Ranking'
import { Profile } from './pages/Profile'
import VerifyEmail from './pages/VerifyEmail'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen message="Verificando autenticación..." />;
  }

  return user ? <>{children}</> : <Navigate to="/auth" replace />
}

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  const withSuspense = (Component: React.ComponentType, message: string = 'Cargando contenido...') => (
    <Suspense fallback={<LoadingScreen message={message} />}>
      <Component />
    </Suspense>
  );

  // No mostramos loading aquí para evitar doble pantalla de carga

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          !user ?
            withSuspense(Auth, 'Preparando el inicio de sesión...') :
            <Navigate to="/" replace />
        }
      />
      <Route
        path="/verify-email"
        element={user ? <Navigate to="/dashboard" replace /> : <VerifyEmail />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:gameCode"
        element={
          <ProtectedRoute>
            <Layout>
              <Game />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/game"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/join/:code?"
        element={
          <ProtectedRoute>
            <Layout>
              <JoinGame />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ranking"
        element={
          <ProtectedRoute>
            <Layout>
              <Ranking />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function AppContent() {
  const { user, loading } = useAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Efecto para manejar la autenticación inicial
  useEffect(() => {
    // Verificar si es un callback de OAuth
    const checkAuthStatus = async () => {
      try {
        // Verificar si hay tokens en la URL (callback de OAuth)
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');

        if (accessToken || refreshToken) {
          // Si hay tokens en la URL, esperar a que Supabase procese la sesión
          console.log('Procesando callback de autenticación...');
          return;
        }

        // Si no es un callback, verificar la sesión actual
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // Si hay sesión, redirigir al dashboard si está en auth
          if (window.location.pathname === '/auth') {
            const preAuthPath = sessionStorage.getItem('preAuthPath') || '/dashboard';
            sessionStorage.removeItem('preAuthPath');
            window.location.href = preAuthPath;
          }
        } else {
          // Si no hay sesión, redirigir a auth si no está ya ahí
          if (window.location.pathname !== '/auth') {
            window.location.href = '/auth';
          }
        }
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();

    // Configurar listener de cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Cambio en el estado de autenticación:', event);

        if (event === 'SIGNED_IN' && session) {
          const preAuthPath = sessionStorage.getItem('preAuthPath') || '/dashboard';
          sessionStorage.removeItem('preAuthPath');

          // Solo redirigir si está en la raíz o en auth
          if (['/', '/auth'].includes(window.location.pathname)) {
            window.location.href = preAuthPath;
          }
        } else if (event === 'SIGNED_OUT') {
          // Redirigir a auth solo si no está ya ahí
          if (!window.location.pathname.startsWith('/auth')) {
            window.location.href = '/auth';
          }
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Mostrar pantalla de carga solo durante la verificación inicial
  if (isCheckingAuth) {
    return <LoadingScreen message="Iniciando sesión..." />;
  }

  // Main app content
  return (
    <div className="min-h-screen">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#1f2937',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff'
            }
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff'
            }
          }
        }}
      />
      <AppRoutes />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <Router>
          <AppContent />
        </Router>
      </GameProvider>
    </AuthProvider>
  );
}

export default App