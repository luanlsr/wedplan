import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { logError, logEvent, setObservabilityContext } from '../../utils/observability';

export const ObservabilityBootstrap = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    setObservabilityContext({ userId: user?.id || null });
  }, [user?.id]);

  useEffect(() => {
    void logEvent({
      eventName: 'route.viewed',
      source: 'web',
      route: `${location.pathname}${location.search}`,
      metadata: {
        pathname: location.pathname,
        hasSearch: Boolean(location.search),
      },
    });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      logError('browser.error', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError('browser.unhandled_rejection', event.reason);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
};
