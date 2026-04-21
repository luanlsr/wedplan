import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { MainApp } from './components/MainApp';
import { LoginForm } from './components/auth/LoginForm';
import { SignUpForm } from './components/auth/SignUpForm';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';
import { LandingPage } from './components/layout/LandingPage';
import { NotFound } from './components/layout/NotFound';
import { Loader2 } from 'lucide-react';
import { ConfirmProvider } from './components/ui';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (user) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPassword onSuccess={() => navigate('/login')} />} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        <LandingPage 
          onGetStarted={() => navigate('/signup')} 
          onLogin={() => navigate('/login')} 
        />
      } />
      <Route path="/login" element={
        <LoginForm 
          onSuccess={() => navigate('/')} 
          onNavigateToSignUp={() => navigate('/signup')}
          onNavigateToForgot={() => navigate('/forgot-password')}
        />
      } />
      <Route path="/signup" element={
        <SignUpForm 
          onSuccess={() => navigate('/')} 
          onNavigateToLogin={() => navigate('/login')}
        />
      } />
      <Route path="/forgot-password" element={
        <ForgotPassword 
          onNavigateToLogin={() => navigate('/login')}
        />
      } />
      <Route path="/reset-password" element={
        <ResetPassword 
          onSuccess={() => navigate('/login')}
        />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Router>
          <AppRoutes />
        </Router>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
