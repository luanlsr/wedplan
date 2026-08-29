-- Recursos de ferramentas premium por plano.
-- Aditiva e segura para producao: apenas adiciona/atualiza chaves em plan_features.

WITH feature_seed(plan_code, feature_key, feature_value) AS (
  VALUES
    ('essential', 'premium_tools', 'true'::jsonb),
    ('essential', 'advanced_tools', 'false'::jsonb),
    ('premium', 'premium_tools', 'true'::jsonb),
    ('premium', 'advanced_tools', 'true'::jsonb),
    ('pro_couple', 'premium_tools', 'true'::jsonb),
    ('pro_couple', 'advanced_tools', 'true'::jsonb),
    ('pro_agency', 'premium_tools', 'true'::jsonb),
    ('pro_agency', 'advanced_tools', 'true'::jsonb)
)
INSERT INTO public.plan_features (plan_id, feature_key, feature_value)
SELECT p.id, fs.feature_key, fs.feature_value
FROM feature_seed fs
JOIN public.plans p ON p.code = fs.plan_code
ON CONFLICT (plan_id, feature_key) DO UPDATE
SET feature_value = EXCLUDED.feature_value;
