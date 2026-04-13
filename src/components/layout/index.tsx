import { LayoutDashboard, Briefcase, DollarSign, Settings, Moon, Sun, TrendingUp, LogOut, Heart, CheckCircle2 } from "lucide-react";
import { cn } from "../ui";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export const Sidebar = ({ activeTab, setActiveTab, isDark, toggleTheme }: SidebarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "suppliers", label: "Fornecedores", icon: Briefcase },
    { id: "guests", label: "Convidados", icon: Heart },
    { id: "tasks", label: "Tarefas", icon: CheckCircle2 },
    { id: "financial", label: "Financeiro", icon: DollarSign },
    { id: "planning", label: "Planejamento", icon: TrendingUp },
    { id: "settings", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="w-72 h-screen fixed left-0 top-0 glass border-r border-white/10 p-6 flex flex-col z-50">
      <div className="flex items-center gap-3 mb-10 px-2 group cursor-pointer">
        <div className="w-12 h-12 rounded-2xl bg-white overflow-hidden flex items-center justify-center shadow-xl shadow-primary/20 border border-white/10 transition-transform group-hover:scale-110 duration-500">
          <img src="/logo-wedplan.png" alt="WedPlan Logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="font-black text-xl tracking-tighter uppercase italic text-foreground leading-none">Wed<br/><span className="text-primary not-italic">Plan</span></h1>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative",
              activeTab === item.id 
                ? "bg-primary text-white shadow-xl shadow-primary/20" 
                : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
            )}
          >
            <item.icon size={22} className={cn(activeTab === item.id ? "text-white" : "group-hover:text-primary")} />
            <span className="font-semibold tracking-wide">{item.label}</span>
            {activeTab === item.id && (
              <div className="absolute right-2 w-1.5 h-1.2 rounded-full bg-white/50" />
            )}
          </button>
        ))}
      </nav>

      <div className="space-y-4 pt-6 mt-6 border-t border-primary/10">
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          <span className="font-medium">{isDark ? "Modo Claro" : "Modo Escuro"}</span>
        </button>
        
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </div>
  );
};

export const Header = ({ title }: { title: string }) => (
  <header className="flex items-center justify-between mb-8">
    <h2 className="text-3xl font-extrabold tracking-tight pt-2">{title}</h2>
    <div className="flex items-center gap-6">
      <div className="text-right">
        <p className="text-sm font-black uppercase tracking-tighter">WedPlan</p>
        <p className="text-[10px] text-primary uppercase tracking-widest font-black italic">Wedding Management Suite</p>
      </div>
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-blue-400 p-0.5 shadow-lg shadow-primary/20 transition-transform hover:rotate-3 duration-300">
        <div className="w-full h-full rounded-[0.9rem] bg-white dark:bg-card flex items-center justify-center text-primary font-black italic text-lg shadow-inner">
          WP
        </div>
      </div>
    </div>
  </header>
);
