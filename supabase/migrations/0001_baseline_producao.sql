-- ============================================================
-- BASELINE DE PRODUÇÃO — gerada em 2026-06-19 a partir de
-- `supabase db dump --schema public` do projeto eternalplanner
-- (ref whzxmuozumymgopgtslq). Substitui o histórico de
-- migrations 0001-0021 + fix_rls_policies.sql + rollback_and_fix.sql
-- + drop_all_tables.sql, arquivados em supabase/migrations/_archive/.
-- Esta migration é marcada como já aplicada via
-- `supabase migration repair` (Task 5) — NUNCA deve ser reaplicada
-- manualmente contra o banco de produção.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";





CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  couple_role_id UUID;
  premium_type_id UUID;
  new_account_id UUID;
BEGIN
  -- Buscar IDs necessários
  SELECT id INTO couple_role_id FROM public.roles WHERE name = 'couple' LIMIT 1;
  SELECT id INTO premium_type_id FROM public.account_types ORDER BY price DESC LIMIT 1;

  -- 1. Criar a conta com status pending_payment
  INSERT INTO public.accounts (id, account_type_id, status)
  VALUES (new.id, premium_type_id, 'pending_payment')
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO new_account_id;

  -- 2. Criar/atualizar o profile vinculando à conta e ao role
  INSERT INTO public.profiles (id, email, full_name, role_id, account_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    couple_role_id,
    new.id  -- account.id = user.id (mesmo UUID)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role_id = COALESCE(EXCLUDED.role_id, public.profiles.role_id),
    account_id = COALESCE(EXCLUDED.account_id, public.profiles.account_id);

  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_master"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN coalesce(user_role = 'master', false);
END;
$$;


ALTER FUNCTION "public"."is_master"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_guest_name"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_guest_id UUID;
BEGIN
  -- Pesquisa o convidado cujo nome seja o começo do novo nome completo informado
  -- Se encontrar vários, ele ordena pelo tamanho do nome, garantindo que vai 
  -- pegar "Thiago Marques" ao invés de apenas "Thiago".
  SELECT id INTO v_guest_id
  FROM public.guests
  WHERE unaccent(NEW.full_name) ILIKE (unaccent(nome) || '%')
    AND wedding_id = NEW.wedding_id
  ORDER BY LENGTH(nome) DESC
  LIMIT 1;

  -- Se encontrou um match com exatidão, atualiza o nome
  IF FOUND THEN
    UPDATE public.guests
    SET nome = NEW.full_name,
        updated_at = NOW()
    WHERE id = v_guest_id
      -- Só atualiza se o nome realmente for diferente para evitar queries repetidas
      AND nome != NEW.full_name;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_guest_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";




CREATE TABLE IF NOT EXISTS "public"."account_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "features" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."account_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_type_id" "uuid",
    "status" "text" DEFAULT 'pending_payment'::"text",
    "asaas_customer_id" "text",
    "asaas_subscription_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categorias_presentes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wedding_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categorias_presentes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chaves_pix" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key_value" "text" NOT NULL,
    "key_type" "text" DEFAULT 'email'::"text",
    "holder_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "wedding_id" "uuid" DEFAULT 'c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a'::"uuid"
);


ALTER TABLE "public"."chaves_pix" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."confirmacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "children" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "wedding_id" "uuid" DEFAULT 'c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a'::"uuid",
    "is_attending" boolean DEFAULT true
);


ALTER TABLE "public"."confirmacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wedding_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "categoria" "text",
    "status" "text" DEFAULT 'pendente'::"text",
    "adultos" integer DEFAULT 1,
    "criancas" integer DEFAULT 0,
    "children_names" "text",
    "telefone" "text",
    "observacoes" "text",
    "is_present" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "invitation_sent" boolean DEFAULT false
);


ALTER TABLE "public"."guests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."installments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "numero" integer NOT NULL,
    "valor" numeric NOT NULL,
    "data_vencimento" "date" NOT NULL,
    "status" "text" DEFAULT 'pendente'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "data_pagamento" "date",
    "wedding_id" "uuid"
);


ALTER TABLE "public"."installments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."installments"."data_pagamento" IS 'Data real em que a parcela foi paga pelo usuário';



CREATE TABLE IF NOT EXISTS "public"."lista_presentes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "image_url" "text",
    "price" numeric(10,2),
    "buy_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "wedding_id" "uuid" DEFAULT 'c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a'::"uuid",
    "subtitle" "text",
    "brand" "text",
    "is_featured" boolean DEFAULT false,
    "is_bought" boolean DEFAULT false,
    "bought_by" "text",
    "category" "uuid"
);


ALTER TABLE "public"."lista_presentes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."planning_simulations" (
    "wedding_id" "uuid" NOT NULL,
    "current_step" "text" DEFAULT 'intro'::"text",
    "current_month_index" integer DEFAULT 0,
    "simulated_aportes" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."planning_simulations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "role" "text" DEFAULT 'couple'::"text",
    "wedding_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "asaas_customer_id" "text",
    "email" "text",
    "account_id" "uuid",
    "role_id" "uuid",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['master'::"text", 'couple'::"text", 'staff'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wedding_id" "uuid" NOT NULL,
    "fornecedor" "text" NOT NULL,
    "servico" "text",
    "categoria" "text",
    "valor_total" numeric DEFAULT 0,
    "tipo_pagamento" "text",
    "data_contrato" "date",
    "staff_names" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "phone" "text",
    "email" "text",
    "cnpj_cpf" "text",
    "address" "text",
    "contract_url" "text"
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."staff_suppliers_view" WITH ("security_invoker"='on') AS
 SELECT "id",
    "wedding_id",
    "fornecedor",
    "servico",
    "categoria",
    "staff_names"
   FROM "public"."suppliers";


ALTER VIEW "public"."staff_suppliers_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wedding_id" "uuid" NOT NULL,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "categoria" "text",
    "data_limite" "date",
    "status" "text" DEFAULT 'pendente'::"text",
    "ordem" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wedding_members" (
    "wedding_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'owner'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wedding_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid",
    "couple_name1" "text" NOT NULL,
    "couple_name2" "text" NOT NULL,
    "wedding_date" "date",
    "total_budget" numeric DEFAULT 0,
    "theme" "text" DEFAULT 'light'::"text",
    "public_checkin_token" "uuid" DEFAULT "gen_random_uuid"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "asaas_subscription_id" "text",
    "subscription_status" "text" DEFAULT 'trial'::"text",
    "account_id" "uuid"
);


ALTER TABLE "public"."weddings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."account_types"
    ADD CONSTRAINT "account_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."account_types"
    ADD CONSTRAINT "account_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categorias_presentes"
    ADD CONSTRAINT "categorias_presentes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chaves_pix"
    ADD CONSTRAINT "chaves_pix_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."confirmacoes"
    ADD CONSTRAINT "confirmacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."installments"
    ADD CONSTRAINT "installments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lista_presentes"
    ADD CONSTRAINT "lista_presentes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."planning_simulations"
    ADD CONSTRAINT "planning_simulations_pkey" PRIMARY KEY ("wedding_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wedding_members"
    ADD CONSTRAINT "wedding_members_pkey" PRIMARY KEY ("wedding_id", "user_id");



ALTER TABLE ONLY "public"."weddings"
    ADD CONSTRAINT "weddings_owner_id_key" UNIQUE ("owner_id");



ALTER TABLE ONLY "public"."weddings"
    ADD CONSTRAINT "weddings_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_categories_wedding" ON "public"."categorias_presentes" USING "btree" ("wedding_id");



CREATE INDEX "idx_gifts_category_fk" ON "public"."lista_presentes" USING "btree" ("category");



CREATE OR REPLACE TRIGGER "trg_sync_guest_name" AFTER INSERT OR UPDATE OF "full_name" ON "public"."confirmacoes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_guest_name"();



CREATE OR REPLACE TRIGGER "update_guests_updated_at" BEFORE UPDATE ON "public"."guests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_weddings_updated_at" BEFORE UPDATE ON "public"."weddings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_account_type_id_fkey" FOREIGN KEY ("account_type_id") REFERENCES "public"."account_types"("id");



ALTER TABLE ONLY "public"."lista_presentes"
    ADD CONSTRAINT "fk_gift_category" FOREIGN KEY ("category") REFERENCES "public"."categorias_presentes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."installments"
    ADD CONSTRAINT "installments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."installments"
    ADD CONSTRAINT "installments_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weddings"
    ADD CONSTRAINT "weddings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weddings"
    ADD CONSTRAINT "weddings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Acesso ao casamento vinculado" ON "public"."weddings" FOR SELECT USING ((("auth"."uid"() = "owner_id") OR ("id" IN ( SELECT "profiles"."wedding_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Acesso por Wedding ID (Noivo/Staff)" ON "public"."guests" FOR SELECT USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['couple'::"text", 'staff'::"text", 'master'::"text"])) AND ("wedding_id" = ( SELECT "profiles"."wedding_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Admin Categories All Access" ON "public"."categorias_presentes" TO "authenticated", "anon" USING (true);



CREATE POLICY "Admin RSVP Management" ON "public"."confirmacoes" FOR DELETE TO "authenticated", "anon" USING (true);



CREATE POLICY "Admin RSVP Update" ON "public"."confirmacoes" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Check-in via Token Público" ON "public"."guests" FOR UPDATE USING (true) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."weddings"
  WHERE ("weddings"."id" = "guests"."wedding_id"))));



CREATE POLICY "Guest RSVP Registration" ON "public"."confirmacoes" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Guests Reservation Access" ON "public"."lista_presentes" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Isolated Insert Confirmations" ON "public"."confirmacoes" FOR INSERT TO "anon" WITH CHECK (("wedding_id" = 'c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a'::"uuid"));



CREATE POLICY "Isolated Manage Gifts" ON "public"."lista_presentes" TO "anon" USING (("wedding_id" = 'c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a'::"uuid"));



CREATE POLICY "Isolated Manage Pix" ON "public"."chaves_pix" TO "anon" USING (("wedding_id" = 'c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a'::"uuid"));



CREATE POLICY "Isolated Read Confirmations" ON "public"."confirmacoes" FOR SELECT TO "anon" USING (("wedding_id" = 'c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a'::"uuid"));



CREATE POLICY "Isolated Read Gifts" ON "public"."lista_presentes" FOR SELECT TO "anon" USING (("wedding_id" = 'c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a'::"uuid"));



CREATE POLICY "Isolated Read Pix" ON "public"."chaves_pix" FOR SELECT TO "anon" USING (("wedding_id" = 'c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a'::"uuid"));



CREATE POLICY "Leitura pública de convidados" ON "public"."guests" FOR SELECT USING (true);



CREATE POLICY "Leitura pública do casamento via token" ON "public"."weddings" FOR SELECT USING (true);



CREATE POLICY "Master can update all profiles" ON "public"."profiles" FOR UPDATE USING ("public"."is_master"());



CREATE POLICY "Master can update all weddings" ON "public"."weddings" FOR UPDATE USING ("public"."is_master"());



CREATE POLICY "Master can view all profiles" ON "public"."profiles" FOR SELECT USING ("public"."is_master"());



CREATE POLICY "Master can view all weddings" ON "public"."weddings" FOR SELECT USING ("public"."is_master"());



CREATE POLICY "Noivo gere convidados" ON "public"."guests" USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['couple'::"text", 'master'::"text"])) AND ("wedding_id" = ( SELECT "profiles"."wedding_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Noivo gere fornecedores" ON "public"."suppliers" USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['couple'::"text", 'master'::"text"])) AND ("wedding_id" = ( SELECT "profiles"."wedding_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Noivo gere parcelas" ON "public"."installments" USING ((EXISTS ( SELECT 1
   FROM ("public"."suppliers" "s"
     JOIN "public"."profiles" "p" ON (("p"."id" = "auth"."uid"())))
  WHERE (("s"."id" = "installments"."supplier_id") AND ("s"."wedding_id" = "p"."wedding_id") AND ("p"."role" = ANY (ARRAY['couple'::"text", 'master'::"text"]))))));



CREATE POLICY "Noivo gere tarefas" ON "public"."tasks" USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['couple'::"text", 'master'::"text"])) AND ("wedding_id" = ( SELECT "profiles"."wedding_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Owners can link themselves" ON "public"."wedding_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Proprietário atualiza casamento" ON "public"."weddings" FOR UPDATE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Public Categories Access" ON "public"."categorias_presentes" FOR SELECT USING (("active" = true));



CREATE POLICY "Public Confirmations Access" ON "public"."confirmacoes" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public Gifts Access" ON "public"."lista_presentes" FOR SELECT USING (true);



CREATE POLICY "Users can join weddings" ON "public"."wedding_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage guests of their weddings" ON "public"."guests" USING (((EXISTS ( SELECT 1
   FROM "public"."wedding_members"
  WHERE (("wedding_members"."wedding_id" = "guests"."wedding_id") AND ("wedding_members"."user_id" = "auth"."uid"())))) OR "public"."is_master"()));



CREATE POLICY "Users can manage installments of their weddings" ON "public"."installments" USING (((EXISTS ( SELECT 1
   FROM "public"."wedding_members"
  WHERE (("wedding_members"."wedding_id" = "installments"."wedding_id") AND ("wedding_members"."user_id" = "auth"."uid"())))) OR "public"."is_master"()));



CREATE POLICY "Users can manage simulations of their weddings" ON "public"."planning_simulations" USING (((EXISTS ( SELECT 1
   FROM "public"."wedding_members"
  WHERE (("wedding_members"."wedding_id" = "planning_simulations"."wedding_id") AND ("wedding_members"."user_id" = "auth"."uid"())))) OR "public"."is_master"()));



CREATE POLICY "Users can manage suppliers of their weddings" ON "public"."suppliers" USING (((EXISTS ( SELECT 1
   FROM "public"."wedding_members"
  WHERE (("wedding_members"."wedding_id" = "suppliers"."wedding_id") AND ("wedding_members"."user_id" = "auth"."uid"())))) OR "public"."is_master"()));



CREATE POLICY "Users can manage tasks of their weddings" ON "public"."tasks" USING (((EXISTS ( SELECT 1
   FROM "public"."wedding_members"
  WHERE (("wedding_members"."wedding_id" = "tasks"."wedding_id") AND ("wedding_members"."user_id" = "auth"."uid"())))) OR "public"."is_master"()));



CREATE POLICY "Users can see their wedding memberships" ON "public"."wedding_members" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_master"()));



CREATE POLICY "Usuários criam próprio casamento" ON "public"."weddings" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Usuários gerenciam próprio perfil" ON "public"."profiles" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."account_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categorias_presentes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chaves_pix" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."confirmacoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."installments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lista_presentes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."planning_simulations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wedding_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weddings" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_master"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_master"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_master"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_guest_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_guest_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_guest_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."account_types" TO "anon";
GRANT ALL ON TABLE "public"."account_types" TO "authenticated";
GRANT ALL ON TABLE "public"."account_types" TO "service_role";



GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."categorias_presentes" TO "anon";
GRANT ALL ON TABLE "public"."categorias_presentes" TO "authenticated";
GRANT ALL ON TABLE "public"."categorias_presentes" TO "service_role";



GRANT ALL ON TABLE "public"."chaves_pix" TO "anon";
GRANT ALL ON TABLE "public"."chaves_pix" TO "authenticated";
GRANT ALL ON TABLE "public"."chaves_pix" TO "service_role";



GRANT ALL ON TABLE "public"."confirmacoes" TO "anon";
GRANT ALL ON TABLE "public"."confirmacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."confirmacoes" TO "service_role";



GRANT ALL ON TABLE "public"."guests" TO "anon";
GRANT ALL ON TABLE "public"."guests" TO "authenticated";
GRANT ALL ON TABLE "public"."guests" TO "service_role";



GRANT ALL ON TABLE "public"."installments" TO "anon";
GRANT ALL ON TABLE "public"."installments" TO "authenticated";
GRANT ALL ON TABLE "public"."installments" TO "service_role";



GRANT ALL ON TABLE "public"."lista_presentes" TO "anon";
GRANT ALL ON TABLE "public"."lista_presentes" TO "authenticated";
GRANT ALL ON TABLE "public"."lista_presentes" TO "service_role";



GRANT ALL ON TABLE "public"."planning_simulations" TO "anon";
GRANT ALL ON TABLE "public"."planning_simulations" TO "authenticated";
GRANT ALL ON TABLE "public"."planning_simulations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."staff_suppliers_view" TO "anon";
GRANT ALL ON TABLE "public"."staff_suppliers_view" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_suppliers_view" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."wedding_members" TO "anon";
GRANT ALL ON TABLE "public"."wedding_members" TO "authenticated";
GRANT ALL ON TABLE "public"."wedding_members" TO "service_role";



GRANT ALL ON TABLE "public"."weddings" TO "anon";
GRANT ALL ON TABLE "public"."weddings" TO "authenticated";
GRANT ALL ON TABLE "public"."weddings" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




-- ============================================================
-- STORAGE: buckets e policies (schema storage, fora do dump
-- --schema public). Conteúdo confirmado contra o dump real de
-- produção em 2026-06-19.
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('casamentos', 'casamentos', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contracts' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING (bucket_id = 'contracts' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING (bucket_id = 'contracts' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Membros do casamento podem ver arquivos" ON storage.objects;
CREATE POLICY "Membros do casamento podem ver arquivos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'casamentos'
        AND (
            EXISTS (
                SELECT 1 FROM public.wedding_members
                WHERE wedding_id::text = (string_to_array(name, '/'))[1]
                AND user_id = auth.uid()
            )
            OR public.is_master()
        )
    );

DROP POLICY IF EXISTS "Membros do casamento podem fazer upload" ON storage.objects;
CREATE POLICY "Membros do casamento podem fazer upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'casamentos'
        AND (
            EXISTS (
                SELECT 1 FROM public.wedding_members
                WHERE wedding_id::text = (string_to_array(name, '/'))[1]
                AND user_id = auth.uid()
            )
            OR public.is_master()
        )
    );

DROP POLICY IF EXISTS "Membros do casamento podem deletar arquivos" ON storage.objects;
CREATE POLICY "Membros do casamento podem deletar arquivos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'casamentos'
        AND (
            EXISTS (
                SELECT 1 FROM public.wedding_members
                WHERE wedding_id::text = (string_to_array(name, '/'))[1]
                AND user_id = auth.uid()
            )
            OR public.is_master()
        )
    );



