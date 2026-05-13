import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Requer service_role key para gerenciar auth

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createMasterUser() {
  const email = 'luanfswd@gmail.com';
  const password = '2548#Lsr';

  console.log(`🚀 Criando conta Master para: ${email}...`);

  try {
    let userId = null;

    // 1. Cria o usuário no Auth (se já existir, ele avisa)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'Administrador Master' }
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        console.log(`⚠️ O usuário ${email} já existe no Auth. Buscando ID...`);
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = listData.users.find(u => u.email === email);
        if (existingUser) {
          userId = existingUser.id;
        } else {
          throw new Error('Usuário existe mas não foi encontrado na listagem.');
        }
      } else {
        throw authError;
      }
    } else {
      console.log(`✅ Usuário criado no Auth com ID: ${authData.user.id}`);
      userId = authData.user.id;
    }

    if (!userId) throw new Error('Não foi possível determinar o ID do usuário.');

    // Aguarda um segundo para garantir que a trigger on_auth_user_created gerou o profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Atualiza a tabela profiles para setar a role como 'master'
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'master', email: email }) // Atualiza o email caso não tenha sido preenchido
      .eq('id', userId);

    if (profileError) throw profileError;

    console.log(`👑 SUCESSO! A conta ${email} agora é MASTER.`);
    console.log(`Você já pode acessar /admin no seu aplicativo usando a senha: ${password}`);

  } catch (err) {
    console.error("❌ Ocorreu um erro:", err);
  }
}

createMasterUser();
