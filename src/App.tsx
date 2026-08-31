import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LandingPage } from './components/layout/LandingPage';
import { CookieConsent } from './components/layout/CookieConsent';
import { ObservabilityBootstrap } from './components/layout/ObservabilityBootstrap';
import { Loader2 } from 'lucide-react';
import { ConfirmProvider } from './components/ui';

const MainApp = lazy(() => import('./components/MainApp').then((module) => ({ default: module.MainApp })));
const LoginForm = lazy(() => import('./components/auth/LoginForm').then((module) => ({ default: module.LoginForm })));
const SignUpForm = lazy(() => import('./components/auth/SignUpForm').then((module) => ({ default: module.SignUpForm })));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword').then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./components/auth/ResetPassword').then((module) => ({ default: module.ResetPassword })));
const WeddingSitePublic = lazy(() => import('./components/site/WeddingSitePublic').then((module) => ({ default: module.WeddingSitePublic })));
const WeddingGiftsPublic = lazy(() => import('./components/site/WeddingGiftsPublic').then((module) => ({ default: module.WeddingGiftsPublic })));
const LegalPage = lazy(() => import('./components/legal/LegalPage').then((module) => ({ default: module.LegalPage })));
const FreeWeddingTools = lazy(() => import('./components/tools/FreeWeddingTools').then((module) => ({ default: module.FreeWeddingTools })));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="animate-spin text-primary" size={40} />
  </div>
);

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
    <Suspense fallback={<PageFallback />}>
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
        <Route path="/casamento/:slug/presentes" element={<WeddingGiftsPublic />} />
        {!user && <Route path="/ferramentas" element={<FreeWeddingTools />} />}
        {!user && <Route path="/ferramentas/:toolId" element={<FreeWeddingTools />} />}
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
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Router>
          <ObservabilityBootstrap />
          <AppRoutes />
          <CookieConsent />
        </Router>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
