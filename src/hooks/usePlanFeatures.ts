import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type PlanFeatureMap = Record<string, unknown>;

export type CurrentPlan = {
  id: string;
  code: string;
  name: string;
  price_monthly: number;
  price_yearly?: number | null;
};

export type CurrentSubscription = {
  id: string;
  status: 'incomplete' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  billing_interval: 'monthly' | 'yearly';
  current_period_end?: string | null;
  plan: CurrentPlan | null;
};

export const usePlanFeatures = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [features, setFeatures] = useState<PlanFeatureMap>({});
  const [loading, setLoading] = useState(true);

  const loadPlanFeatures = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setFeatures({});
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          status,
          billing_interval,
          current_period_end,
          plan_id,
          plans (
            id,
            code,
            name,
            price_monthly,
            price_yearly
          )
        `)
        .eq('account_id', user.id)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) throw subError;

      const plan = Array.isArray((sub as any)?.plans) ? (sub as any).plans[0] : (sub as any)?.plans;

      if (!sub || !plan) {
        setSubscription(null);
        setFeatures({});
        return;
      }

      const { data: featureRows, error: featuresError } = await supabase
        .from('plan_features')
        .select('feature_key, feature_value')
        .eq('plan_id', (sub as any).plan_id);

      if (featuresError) throw featuresError;

      setSubscription({
        id: (sub as any).id,
        status: (sub as any).status,
        billing_interval: (sub as any).billing_interval,
        current_period_end: (sub as any).current_period_end,
        plan,
      });

      setFeatures(
        (featureRows || []).reduce((acc, item: any) => ({
          ...acc,
          [item.feature_key]: item.feature_value,
        }), {} as PlanFeatureMap)
      );
    } catch (error) {
      console.error('[usePlanFeatures] Erro ao carregar plano:', error);
      setSubscription(null);
      setFeatures({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPlanFeatures();
  }, [loadPlanFeatures]);

  const hasFeature = useCallback((featureKey: string) => {
    const value = features[featureKey];
    return value === true || value === 'true' || Number(value) > 0;
  }, [features]);

  return useMemo(() => ({
    subscription,
    features,
    loading,
    hasFeature,
    refresh: loadPlanFeatures,
  }), [features, hasFeature, loadPlanFeatures, loading, subscription]);
};
