import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface WeddingOption {
  id: string;
  couple_name1: string;
  couple_name2: string;
}

interface WeddingSwitcherProps {
  currentWeddingId?: string;
  onSwitch: (newId: string) => void;
  isCollapsed?: boolean;
}

export function WeddingSwitcher({ currentWeddingId, onSwitch, isCollapsed }: WeddingSwitcherProps) {
  const { user } = useAuth();
  const [weddings, setWeddings] = useState<WeddingOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserWeddings();
    }
  }, [user]);

  const fetchUserWeddings = async () => {
    if (!user) return;
    
    try {
      // Primeiro verifica o papel do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('role_id, roles(name)')
        .eq('id', user.id)
        .single();

      const rolesData = (profile as any)?.roles;
      const isMaster = (Array.isArray(rolesData) ? rolesData[0]?.name : rolesData?.name) === 'master';

      if (isMaster) {
        // Se for master, carrega TODOS os casamentos
        const { data: allWeddings } = await supabase
          .from('weddings')
          .select('id, couple_name1, couple_name2')
          .order('created_at', { ascending: false });
        
        setWeddings(allWeddings || []);
        return;
      }

      // Se não for master, pega os casamentos onde o usuário é dono
      const { data: ownedWeddings } = await supabase
        .from('weddings')
        .select('id, couple_name1, couple_name2')
        .eq('owner_id', user.id);

      setWeddings(ownedWeddings || []);
    } catch (err) {
      console.error('Error fetching user weddings:', err);
    }
  };

  const handleSwitch = async (id: string) => {
    if (id === currentWeddingId || !user) {
      setIsOpen(false);
      return;
    }
    
    // Atualiza o profile com o novo wedding_id
    await supabase.from('profiles').update({ wedding_id: id }).eq('id', user.id);
    setIsOpen(false);
    onSwitch(id);
  };

  const currentWedding = weddings.find(w => w.id === currentWeddingId);
  const displayName = currentWedding 
    ? `${currentWedding.couple_name1 || 'Cônjuge 1'} & ${currentWedding.couple_name2 || 'Cônjuge 2'}`
    : 'Selecionar Casamento';

  if (weddings.length <= 1) return null; // Não mostra se houver apenas 1 casamento

  return (
    <div className="relative mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-3 rounded-xl border border-white/10 bg-secondary/30 hover:bg-secondary/50 transition-colors",
          isCollapsed && "justify-center px-0"
        )}
      >
        {!isCollapsed && (
          <div className="flex flex-col items-start truncate pr-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contexto Atual</span>
            <span className="text-sm font-bold truncate max-w-[160px]">{displayName}</span>
          </div>
        )}
        <ChevronsUpDown size={16} className="text-muted-foreground shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-xl border border-border/50 bg-popover shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
          {weddings.map(w => {
            const name = `${w.couple_name1 || 'Cônjuge 1'} & ${w.couple_name2 || 'Cônjuge 2'}`;
            return (
              <button
                key={w.id}
                onClick={() => handleSwitch(w.id)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg text-sm hover:bg-secondary/50 transition-colors",
                  w.id === currentWeddingId && "bg-primary/10 text-primary font-bold"
                )}
              >
                <span className="truncate pr-2">{name}</span>
                {w.id === currentWeddingId && <Check size={16} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
