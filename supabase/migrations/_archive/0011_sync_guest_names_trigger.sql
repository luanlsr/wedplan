-- Ativa a extensão que permite pesquisa ignorando acentuação (ex: 'Laís' vs 'Lais')
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Cria uma função que será executada sempre que alguém confirmar
CREATE OR REPLACE FUNCTION public.sync_guest_name()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Por fim, cria o Gatilho. Ao Inserir em confirmacoes, roda a função acima.
DROP TRIGGER IF EXISTS trg_sync_guest_name ON public.confirmacoes;
CREATE TRIGGER trg_sync_guest_name
AFTER INSERT OR UPDATE OF full_name ON public.confirmacoes
FOR EACH ROW
EXECUTE FUNCTION public.sync_guest_name();
