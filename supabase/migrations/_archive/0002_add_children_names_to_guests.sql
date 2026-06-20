-- Migration: Adicionar nomes das crianças na tabela de convidados
-- Descrição: Permite especificar os nomes das crianças vinculadas a um grupo/família.

ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS children_names TEXT;

-- Adicionar um comentário para documentar a coluna
COMMENT ON COLUMN guests.children_names IS 'Lista de nomes das crianças (separados por vírgula ou texto livre)';
