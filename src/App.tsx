import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { MainApp } from './components/MainApp';
import { LoginForm } from './components/auth/LoginForm';
import { SignUpForm } from './components/auth/SignUpForm';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';
import { LandingPage } from './components/layout/LandingPage';
import { CookieConsent } from './components/layout/CookieConsent';
import { WeddingSitePublic } from './components/site/WeddingSitePublic';
import { LegalPage } from './components/legal/LegalPage';
import { Loader2 } from 'lucide-react';
import { ConfirmProvider } from './components/ui';



function AppRoutes() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const hasToken = new URLSearchParams(window.location.search).has('token');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        (user || hasToken) ? <MainApp /> : 
        <LandingPage 
          onGetStarted={(options) => {
            const params = new URLSearchParams();
            if (options?.plan) params.set('plan', options.plan);
            if (options?.billing) params.set('billing', options.billing);
            navigate(`/checkout/dados-pessoais${params.toString() ? `?${params.toString()}` : ''}`);
          }}
          onLogin={() => navigate('/login')} 
        />
      } />

      <Route path="/casamento/:slug" element={<WeddingSitePublic />} />
      <Route path="/termos-de-uso" element={<LegalPage type="terms" />} />
      <Route path="/politica-de-privacidade" element={<LegalPage type="privacy" />} />
      <Route path="/checkout" element={<Navigate to="/checkout/dados-pessoais" replace />} />
      <Route path="/checkout/:step" element={
        user ? <Navigate to="/" replace /> :
        <SignUpForm
          onSuccess={() => navigate('/')} 
          onNavigateToLogin={() => navigate('/login')}
        />
      } />

      <Route path="/login" element={
        user ? <Navigate to="/" replace /> :
        <LoginForm
          onSuccess={() => navigate('/')} 
          onNavigateToSignUp={() => navigate('/checkout/dados-pessoais')}
          onNavigateToForgot={() => navigate('/forgot-password')}
        />
      } />

      <Route path="/signup" element={<Navigate to="/checkout/dados-pessoais" replace />} />

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

      {/* Rota para o check-in direto via token */}
      {hasToken && <Route path="/checkin" element={<MainApp />} />}

      {/* Rota catch-all: Se logado ou com token, vai pro MainApp. Se não, volta pro Início */}
      <Route path="/*" element={
        (user || hasToken) ? <MainApp /> : <Navigate to="/" replace />
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Router>
          <AppRoutes />
          <CookieConsent />
        </Router>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
