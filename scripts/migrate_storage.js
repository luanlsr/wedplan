import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Requer service role para bypass RLS

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env");
  console.log("Certifique-se de usar a SERVICE_ROLE_KEY para ter acesso total ao Storage neste script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateStorage() {
  console.log("🚀 Iniciando migração do Storage...");
  const bucketName = 'casamentos'; // Substitua pelo nome do seu bucket se for diferente

  try {
    // Lista todos os arquivos na raiz ou na pasta antiga
    const { data: files, error: listError } = await supabase
      .storage
      .from(bucketName)
      .list('', { limit: 1000 });

    if (listError) throw listError;

    console.log(`Encontrados ${files?.length || 0} arquivos no bucket '${bucketName}'.`);

    for (const file of files || []) {
      // Ignora diretórios e o arquivo de placeholder vazio
      if (!file.id || file.name === '.emptyFolderPlaceholder') continue;

      console.log(`Processando arquivo: ${file.name}`);

      // LÓGICA DE MIGRAÇÃO:
      // Neste momento você precisa decidir para qual wedding_id o arquivo vai.
      // Como o storage anterior não estava vinculado a um wedding_id, 
      // precisaremos fazer um match com base em dados existentes (ex: buscar do banco o wedding_id baseado no nome do arquivo).
      
      // Exemplo fictício: Se os arquivos antigos tinham o ID do usuário no nome "user_123_avatar.jpg"
      // Teríamos que buscar o wedding_id desse usuário.
      // Como não sabemos o padrão exato, este script loga os arquivos e prepara a função de move.
      
      const newWeddingId = 'SEU_WEDDING_ID_AQUI'; // TODO: Implementar lógica de descoberta do ID
      const newPath = `${newWeddingId}/${file.name}`;

      /* Descomente quando implementar a lógica do wedding_id
      const { error: moveError } = await supabase
        .storage
        .from(bucketName)
        .move(file.name, newPath);

      if (moveError) {
        console.error(`❌ Erro ao mover ${file.name}:`, moveError);
      } else {
        console.log(`✅ Movido com sucesso: ${file.name} -> ${newPath}`);
      }
      */
    }
    
    console.log("✨ Migração concluída (Dry-run).");
  } catch (err) {
    console.error("❌ Ocorreu um erro durante a migração:", err);
  }
}

migrateStorage();
