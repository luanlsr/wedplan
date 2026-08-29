-- Seed manual para contas demo de marketing do WedPlan.
-- Execute no SQL Editor do Supabase somente depois de criar os usuários Auth demo.
--
-- Usuários sugeridos:
--   demo.essential@wedplan.com.br
--   demo.premium@wedplan.com.br
--   demo.pro@wedplan.com.br
--   demo.agency@wedplan.com.br
--
-- Este script é aditivo e restaura apenas dados vinculados aos usuários demo acima.
-- Não cria senhas e não deve ser usado com contas reais de clientes.

DO $$
DECLARE
  demo record;
  supplier record;
  v_user_id uuid;
  v_account_id uuid;
  v_wedding_id uuid;
  v_plan_id uuid;
  v_role_id uuid;
  v_supplier_id uuid;
  v_site_id uuid;
  v_category_home uuid;
  v_category_trip uuid;
  v_category_decor uuid;
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'couple' LIMIT 1;

  FOR demo IN
    SELECT *
    FROM (
      VALUES
        ('essential', 'demo.essential@wedplan.com.br', 'Mariana', 'Gabriel', 'Demo Essencial'),
        ('premium', 'demo.premium@wedplan.com.br', 'Mariana', 'Gabriel', 'Demo Premium'),
        ('pro_couple', 'demo.pro@wedplan.com.br', 'Mariana', 'Gabriel', 'Demo Pro Casal'),
        ('pro_agency', 'demo.agency@wedplan.com.br', 'Mariana', 'Gabriel', 'Demo Pro Assessoria')
    ) AS d(plan_code, email, bride, groom, account_name)
  LOOP
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(demo.email) LIMIT 1;
    SELECT id INTO v_plan_id FROM public.plans WHERE code = demo.plan_code LIMIT 1;

    IF v_user_id IS NULL THEN
      RAISE NOTICE 'Usuário Auth demo não encontrado: %. Crie o usuário antes de executar a seed.', demo.email;
      CONTINUE;
    END IF;

    IF v_plan_id IS NULL THEN
      RAISE NOTICE 'Plano não encontrado: %. Rode as migrations de planos antes desta seed.', demo.plan_code;
      CONTINUE;
    END IF;

    v_account_id := v_user_id;

    INSERT INTO public.accounts (id, status, created_at, updated_at)
    VALUES (v_account_id, 'active', now(), now())
    ON CONFLICT (id) DO UPDATE
    SET status = 'active',
        updated_at = now();

    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      role_id,
      account_id,
      plan_id,
      plan_status,
      billing_interval,
      plan_current_period_end,
      plan_assigned_at,
      updated_at
    )
    VALUES (
      v_user_id,
      demo.email,
      demo.account_name,
      'couple',
      v_role_id,
      v_account_id,
      v_plan_id,
      'active',
      'monthly',
      current_date + interval '12 months',
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        role_id = EXCLUDED.role_id,
        account_id = EXCLUDED.account_id,
        plan_id = EXCLUDED.plan_id,
        plan_status = EXCLUDED.plan_status,
        billing_interval = EXCLUDED.billing_interval,
        plan_current_period_end = EXCLUDED.plan_current_period_end,
        plan_assigned_at = EXCLUDED.plan_assigned_at,
        updated_at = now();

    SELECT id
    INTO v_wedding_id
    FROM public.weddings
    WHERE owner_id = v_user_id OR account_id = v_account_id
    ORDER BY created_at
    LIMIT 1;

    IF v_wedding_id IS NULL THEN
      INSERT INTO public.weddings (
        owner_id,
        account_id,
        couple_name1,
        couple_name2,
        wedding_date,
        total_budget,
        theme,
        subscription_status,
        created_at,
        updated_at
      )
      VALUES (
        v_user_id,
        v_account_id,
        demo.bride,
        demo.groom,
        date '2027-05-15',
        62000,
        'light',
        'active',
        now(),
        now()
      )
      RETURNING id INTO v_wedding_id;
    END IF;

    UPDATE public.weddings
    SET owner_id = v_user_id,
        account_id = v_account_id,
        couple_name1 = demo.bride,
        couple_name2 = demo.groom,
        wedding_date = date '2027-05-15',
        total_budget = 62000,
        theme = 'light',
        subscription_status = 'active',
        updated_at = now()
    WHERE id = v_wedding_id;

    UPDATE public.profiles
    SET wedding_id = v_wedding_id
    WHERE id = v_user_id;

    INSERT INTO public.wedding_members (wedding_id, user_id, role)
    VALUES (v_wedding_id, v_user_id, 'owner')
    ON CONFLICT (wedding_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

    DELETE FROM public.subscriptions
    WHERE account_id = v_account_id
      AND metadata ->> 'marketing_demo' = 'true';

    INSERT INTO public.subscriptions (
      account_id,
      plan_id,
      status,
      billing_interval,
      current_period_start,
      current_period_end,
      metadata
    )
    VALUES (
      v_account_id,
      v_plan_id,
      'active',
      'monthly',
      current_date,
      current_date + interval '1 month',
      jsonb_build_object('marketing_demo', true, 'plan_code', demo.plan_code)
    );

    DELETE FROM public.installments
    WHERE wedding_id = v_wedding_id
       OR supplier_id IN (SELECT id FROM public.suppliers WHERE wedding_id = v_wedding_id);
    DELETE FROM public.suppliers WHERE wedding_id = v_wedding_id;
    DELETE FROM public.guests WHERE wedding_id = v_wedding_id;
    DELETE FROM public.tasks WHERE wedding_id = v_wedding_id;
    DELETE FROM public.guest_messages WHERE wedding_id = v_wedding_id;
    DELETE FROM public.lista_presentes WHERE wedding_id = v_wedding_id;
    DELETE FROM public.categorias_presentes WHERE wedding_id = v_wedding_id;
    DELETE FROM public.wedding_site_images WHERE wedding_id = v_wedding_id;
    DELETE FROM public.wedding_site_story_items WHERE wedding_id = v_wedding_id;
    DELETE FROM public.wedding_site_events WHERE wedding_id = v_wedding_id;
    DELETE FROM public.domain_requests
    WHERE wedding_site_id IN (SELECT id FROM public.wedding_sites WHERE wedding_id = v_wedding_id);
    DELETE FROM public.wedding_sites WHERE wedding_id = v_wedding_id;

    FOR supplier IN
      SELECT *
      FROM (
        VALUES
          ('Espaço Jardim Aurora', 'Cerimônia e festa', 'Espaço', 18500, date '2026-09-20'),
          ('Buffet Casa Flor', 'Jantar completo', 'Buffet', 16800, date '2026-10-05'),
          ('Luz & Lente Filmes', 'Foto e vídeo', 'Foto e vídeo', 7200, date '2026-10-18'),
          ('DJ Theo Martins', 'Som, pista e iluminação', 'Música', 4100, date '2026-11-03'),
          ('Ateliê Bela Noiva', 'Vestido e ajustes', 'Moda', 5800, date '2026-11-12'),
          ('Doce Enlace', 'Doces finos e bem-casados', 'Doces', 3600, date '2026-12-02')
      ) AS s(fornecedor, servico, categoria, valor_total, data_contrato)
    LOOP
      INSERT INTO public.suppliers (
        wedding_id,
        fornecedor,
        servico,
        categoria,
        valor_total,
        tipo_pagamento,
        data_contrato,
        phone,
        email,
        address,
        staff_names
      )
      VALUES (
        v_wedding_id,
        supplier.fornecedor,
        supplier.servico,
        supplier.categoria,
        supplier.valor_total,
        'entrada_parcelas',
        supplier.data_contrato,
        '(11) 99999-0000',
        lower(replace(supplier.fornecedor, ' ', '.')) || '@demo.wedplan.com.br',
        'Rua das Flores, 150 - São Paulo, SP',
        'Equipe demo'
      )
      RETURNING id INTO v_supplier_id;

      INSERT INTO public.installments (supplier_id, wedding_id, numero, valor, data_vencimento, status, data_pagamento)
      VALUES
        (v_supplier_id, v_wedding_id, 1, round((supplier.valor_total * 0.35)::numeric, 2), supplier.data_contrato + interval '7 days', 'pago', supplier.data_contrato + interval '7 days'),
        (v_supplier_id, v_wedding_id, 2, round((supplier.valor_total * 0.30)::numeric, 2), date '2027-02-15', 'pendente', null),
        (v_supplier_id, v_wedding_id, 3, round((supplier.valor_total * 0.35)::numeric, 2), date '2027-04-15', 'pendente', null);
    END LOOP;

    INSERT INTO public.guests (wedding_id, nome, categoria, status, adultos, criancas, telefone, observacoes, invitation_sent)
    SELECT
      v_wedding_id,
      CASE
        WHEN n <= 12 THEN (ARRAY[
          'Ana Clara Mendes', 'Rafael Lima', 'Bianca Souza', 'Pedro Henrique', 'Clara Martins', 'João Victor',
          'Luiza Carvalho', 'Bruno Nogueira', 'Helena Rocha', 'Felipe Azevedo', 'Marina Costa', 'Thiago Almeida'
        ])[n]
        ELSE 'Convidado Demo ' || lpad(n::text, 3, '0')
      END,
      CASE WHEN n % 17 = 0 THEN 'Staff' WHEN n % 9 = 0 THEN 'Família' WHEN n % 4 = 0 THEN 'Amigos' ELSE 'Convidados' END,
      CASE WHEN n <= 113 THEN 'confirmado' WHEN n <= 134 THEN 'pendente' ELSE 'recusado' END,
      1,
      CASE WHEN n % 19 = 0 THEN 1 ELSE 0 END,
      '(11) 9' || lpad(n::text, 4, '0') || '-0000',
      CASE WHEN n % 19 = 0 THEN 'Inclui criança no convite' ELSE null END,
      n <= 128
    FROM generate_series(1, 148) AS n;

    INSERT INTO public.tasks (wedding_id, titulo, descricao, categoria, data_limite, status, ordem)
    SELECT
      v_wedding_id,
      title,
      description,
      category,
      due_date,
      status,
      row_number() OVER ()
    FROM (
      VALUES
        ('Definir orçamento final', 'Revisar prioridades do casal', 'Financeiro', date '2026-09-05', 'concluido'),
        ('Fechar espaço da festa', 'Contrato e sinal confirmados', 'Fornecedores', date '2026-09-20', 'concluido'),
        ('Escolher buffet', 'Degustação e proposta final', 'Fornecedores', date '2026-10-05', 'concluido'),
        ('Contratar fotografia', 'Pacote foto e filme', 'Fornecedores', date '2026-10-18', 'concluido'),
        ('Enviar save the date', 'Comunicação inicial aos convidados', 'Convidados', date '2026-11-01', 'concluido'),
        ('Montar lista de presentes', 'Categorias e links principais', 'Site do casal', date '2026-11-20', 'concluido'),
        ('Revisar lista de convidados', 'Cortar duplicados e confirmar famílias', 'Convidados', date '2026-12-01', 'concluido'),
        ('Escolher identidade visual', 'Cores, papelaria e site', 'Design', date '2026-12-10', 'concluido'),
        ('Contratar música', 'DJ, cerimônia e pista', 'Fornecedores', date '2026-12-20', 'concluido'),
        ('Agendar prova de vestido', 'Primeira prova com ateliê', 'Moda', date '2027-01-10', 'concluido'),
        ('Fechar decoração', 'Mesa, cerimônia e buquê', 'Decoração', date '2027-01-20', 'concluido'),
        ('Publicar site do casal', 'História, RSVP e presentes', 'Site do casal', date '2027-01-30', 'concluido'),
        ('Conferir documentação civil', 'Cartório e prazos', 'Cerimônia', date '2027-02-15', 'concluido'),
        ('Enviar convites oficiais', 'Lista revisada e links de RSVP', 'Convidados', date '2027-02-28', 'concluido'),
        ('Definir doces e bolo', 'Degustação e quantidade', 'Buffet', date '2027-03-10', 'concluido'),
        ('Escolher lembranças', 'Bem-casados e tags', 'Detalhes', date '2027-03-25', 'concluido'),
        ('Fechar roteiro da cerimônia', 'Entrada, votos e música', 'Cerimônia', date '2027-04-01', 'concluido'),
        ('Confirmar hospedagem de convidados', 'Bloco de quartos sugerido', 'Convidados', date '2027-04-05', 'em_progresso'),
        ('Revisar pagamentos finais', 'Parcelas vencendo no mês', 'Financeiro', date '2027-04-15', 'em_progresso'),
        ('Prova final de traje', 'Ajustes finais', 'Moda', date '2027-04-20', 'em_progresso'),
        ('Definir mapa de mesas', 'Famílias e grupos próximos', 'Convidados', date '2027-04-28', 'pendente'),
        ('Confirmar transporte', 'Chegada do casal e família', 'Logística', date '2027-05-02', 'pendente'),
        ('Reunião final com assessoria', 'Checklist da semana', 'Assessoria', date '2027-05-08', 'pendente'),
        ('Enviar lembrete de RSVP', 'Últimas confirmações', 'Convidados', date '2027-05-10', 'pendente'),
        ('Separar itens pessoais', 'Alianças, votos e emergência', 'Dia do casamento', date '2027-05-14', 'pendente')
    ) AS t(title, description, category, due_date, status);

    INSERT INTO public.planning_simulations (wedding_id, current_step, current_month_index, simulated_aportes, updated_at)
    VALUES (
      v_wedding_id,
      'planning',
      5,
      jsonb_build_object('monthlyContribution', 4200, 'reserve', 8500),
      now()
    )
    ON CONFLICT (wedding_id) DO UPDATE
    SET current_step = EXCLUDED.current_step,
        current_month_index = EXCLUDED.current_month_index,
        simulated_aportes = EXCLUDED.simulated_aportes,
        updated_at = now();

    INSERT INTO public.wedding_sites (
      wedding_id,
      slug,
      status,
      title,
      subtitle,
      welcome_message,
      template_id,
      font_primary,
      font_secondary,
      color_primary,
      color_secondary,
      background_primary,
      background_secondary,
      party_same_as_ceremony,
      gift_intro,
      gift_delivery_name,
      gift_delivery_address,
      gift_delivery_city,
      gift_delivery_state,
      gift_delivery_zip,
      gift_delivery_notes,
      published_at
    )
    VALUES (
      v_wedding_id,
      'demo-' || demo.plan_code,
      'published',
      demo.bride || ' & ' || demo.groom,
      '15 de maio de 2027',
      'Estamos muito felizes em compartilhar esse momento com vocês.',
      'romantic-editorial',
      'Playfair Display',
      'Manrope',
      '#8b6f43',
      '#2f3829',
      '#fbfaf7',
      '#ffffff',
      true,
      'Escolhemos alguns itens que combinam com a nossa nova casa.',
      demo.bride || ' e ' || demo.groom,
      'Rua das Flores, 150 - Apto 82',
      'São Paulo',
      'SP',
      '01234-000',
      'Portaria 24 horas',
      now()
    )
    RETURNING id INTO v_site_id;

    INSERT INTO public.wedding_site_story_items (wedding_site_id, wedding_id, title, body, icon, event_date, sort_order)
    VALUES
      (v_site_id, v_wedding_id, 'O primeiro encontro', 'Um café rápido virou uma conversa de horas.', 'heart', date '2021-08-14', 1),
      (v_site_id, v_wedding_id, 'A primeira viagem', 'Descobrimos que planejar juntos também podia ser divertido.', 'map-pin', date '2022-11-05', 2),
      (v_site_id, v_wedding_id, 'O pedido', 'No lugar que virou o nosso favorito.', 'sparkles', date '2025-12-20', 3);

    INSERT INTO public.wedding_site_events (wedding_site_id, wedding_id, event_type, title, address, event_date, event_time, maps_query, sort_order)
    VALUES
      (v_site_id, v_wedding_id, 'ceremony', 'Cerimônia e festa', 'Espaço Jardim Aurora, São Paulo - SP', date '2027-05-15', time '16:30', 'Espaço Jardim Aurora São Paulo SP', 1),
      (v_site_id, v_wedding_id, 'party', 'Recepção', 'Espaço Jardim Aurora, São Paulo - SP', date '2027-05-15', time '18:00', 'Espaço Jardim Aurora São Paulo SP', 2);

    INSERT INTO public.categorias_presentes (wedding_id, name, active)
    VALUES
      (v_wedding_id, 'Casa nova', true),
      (v_wedding_id, 'Lua de mel', true),
      (v_wedding_id, 'Decoração', true);

    SELECT id INTO v_category_home FROM public.categorias_presentes WHERE wedding_id = v_wedding_id AND name = 'Casa nova' LIMIT 1;
    SELECT id INTO v_category_trip FROM public.categorias_presentes WHERE wedding_id = v_wedding_id AND name = 'Lua de mel' LIMIT 1;
    SELECT id INTO v_category_decor FROM public.categorias_presentes WHERE wedding_id = v_wedding_id AND name = 'Decoração' LIMIT 1;

    INSERT INTO public.lista_presentes (wedding_id, title, subtitle, image_url, price, buy_url, brand, is_featured, category)
    VALUES
      (v_wedding_id, 'Jogo de panelas inox', 'Conjunto para a cozinha nova', 'https://images.unsplash.com/photo-1556911220-bff31c812dba', 479.90, 'https://www.wedplan.com.br', 'Tramontina', true, v_category_home),
      (v_wedding_id, 'Cota lua de mel', 'Ajude na viagem dos sonhos', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', 250.00, 'https://www.wedplan.com.br', 'WedPlan', true, v_category_trip),
      (v_wedding_id, 'Luminária de mesa', 'Para deixar a sala aconchegante', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c', 189.90, 'https://www.wedplan.com.br', 'Casa Demo', false, v_category_decor),
      (v_wedding_id, 'Jogo de taças', 'Brinde especial na casa nova', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3', 219.90, 'https://www.wedplan.com.br', 'Oxford', false, v_category_home);

    INSERT INTO public.guest_messages (wedding_id, author_name, author_email, message, status)
    VALUES
      (v_wedding_id, 'Ana Clara', 'ana.demo@wedplan.com.br', 'Que alegria fazer parte desse dia!', 'approved'),
      (v_wedding_id, 'Rafael Lima', 'rafael.demo@wedplan.com.br', 'Vocês merecem uma festa linda.', 'approved');

    RAISE NOTICE 'Conta demo restaurada: % / wedding_id=%', demo.email, v_wedding_id;
  END LOOP;
END $$;
