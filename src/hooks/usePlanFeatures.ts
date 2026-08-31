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

type ProfilePlanRow = {
  plan_id?: string | null;
  plan_status?: CurrentSubscription['status'] | 'pending_payment' | null;
  billing_interval?: CurrentSubscription['billing_interval'] | null;
  plan_current_period_end?: string | null;
  account_id?: string | null;
};

type PlanFeatureRow = {
  feature_key: string;
  feature_value: unknown;
};

type SubscriptionRow = {
  id: string;
  status: CurrentSubscription['status'];
  billing_interval: CurrentSubscription['billing_interval'];
  current_period_end?: string | null;
  plan_id: string;
  plans: CurrentPlan | CurrentPlan[] | null;
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
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan_id, plan_status, billing_interval, plan_current_period_end, account_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const profileRow = profile as ProfilePlanRow | null;
      const directPlanId = profileRow?.plan_id;
      const directPlanStatus = profileRow?.plan_status || 'active';
      const directPlanIsEnabled = ['active', 'trialing'].includes(directPlanStatus);

      if (directPlanId && directPlanIsEnabled) {
        const { data: directPlan, error: directPlanError } = await supabase
          .from('plans')
          .select('id, code, name, price_monthly, price_yearly')
          .eq('id', directPlanId)
          .maybeSingle();

        if (directPlanError) throw directPlanError;

        if (directPlan) {
          const { data: featureRows, error: featuresError } = await supabase
            .from('plan_features')
            .select('feature_key, feature_value')
            .eq('plan_id', directPlanId);

          if (featuresError) throw featuresError;

          setSubscription({
            id: `profile:${user.id}`,
            status: directPlanStatus as CurrentSubscription['status'],
            billing_interval: profileRow?.billing_interval || 'monthly',
            current_period_end: profileRow?.plan_current_period_end,
            plan: directPlan as CurrentPlan,
          });

          setFeatures(
            ((featureRows || []) as PlanFeatureRow[]).reduce((acc, item) => ({
              ...acc,
              [item.feature_key]: item.feature_value,
            }), {} as PlanFeatureMap)
          );
          return;
        }
      }

      const accountId = profileRow?.account_id || user.id;

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
        .eq('account_id', accountId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) throw subError;

      const subscriptionRow = sub as SubscriptionRow | null;
      const plan = Array.isArray(subscriptionRow?.plans) ? subscriptionRow.plans[0] : subscriptionRow?.plans;

      if (!subscriptionRow || !plan) {
        setSubscription(null);
        setFeatures({});
        return;
      }

      const { data: featureRows, error: featuresError } = await supabase
        .from('plan_features')
        .select('feature_key, feature_value')
        .eq('plan_id', subscriptionRow.plan_id);

      if (featuresError) throw featuresError;

      setSubscription({
        id: subscriptionRow.id,
        status: subscriptionRow.status,
        billing_interval: subscriptionRow.billing_interval,
        current_period_end: subscriptionRow.current_period_end,
        plan,
      });

      setFeatures(
        ((featureRows || []) as PlanFeatureRow[]).reduce((acc, item) => ({
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPlanFeatures();
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
