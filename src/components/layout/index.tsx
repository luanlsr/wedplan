import { LayoutDashboard, Briefcase, DollarSign, Settings, Moon, Sun, TrendingUp, LogOut, Heart, CheckCircle2, Menu, X, UserCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, NavLink } from "react-router-dom";
import { useState } from "react";

// Estilos customizados para tooltips premium quando colapsado
const tooltipStyles = `
  .sidebar-tooltip {
    position: relative;
  }
  .sidebar-tooltip:after {
    content: attr(data-tooltip);
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%) translateX(10px);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 100;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
  }
  .sidebar-tooltip:hover:after {
    opacity: 1;
    transform: translateY(-50%) translateX(15px);
  }
`;

interface MenuItem {
  id: string;
  path: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
  hidden?: boolean;
  visibleOnlyForStaff?: boolean;
}

interface SidebarProps {
  isDark: boolean;
  toggleTheme: () => void;
  userRole?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar = ({ isDark, toggleTheme, userRole = 'couple', isCollapsed, onToggleCollapse }: SidebarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = ([
    { id: "dashboard", path: "/", label: "Dashboard", icon: LayoutDashboard, end: true, hidden: userRole === 'staff' },
    { id: "suppliers", path: "/fornecedores", label: "Fornecedores", icon: Briefcase, hidden: userRole === 'staff' },
    { id: "guests", path: "/convidados", label: "Convidados", icon: Heart },
    { id: "tasks", path: "/tarefas", icon: CheckCircle2, label: "Tarefas", hidden: userRole === 'staff' },
    { id: "financial", path: "/financeiro", label: "Financeiro", icon: DollarSign, hidden: userRole === 'staff' },
    { id: "planning", path: "/planejamento", label: "Planejamento", icon: TrendingUp, hidden: userRole === 'staff' },
    { id: "checkin", path: "/checkin", label: "Check-in Dia", icon: UserCheck },
    { id: "settings", path: "/configuracoes", label: "Configurações", icon: Settings, hidden: userRole === 'staff' },
  ] as MenuItem[]).filter(item => {
    if (item.hidden) return false;
    if (item.visibleOnlyForStaff && userRole !== 'staff') return false;
    return true;
  });

  return (
    <>
    <style>{tooltipStyles}</style>
    <div className={cn(
      "hidden lg:flex h-screen fixed left-0 top-0 glass border-r border-white/10 p-6 flex-col z-50 transition-all duration-500",
      isCollapsed ? "w-24" : "w-72"
    )}>
      {/* Collapse Toggle Button */}
      <button 
        onClick={onToggleCollapse}
        className="absolute -right-3 top-24 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-lg border border-white/20 hover:scale-110 transition-all z-[60]"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={cn(
        "flex items-center gap-3 mb-10 px-2 group cursor-pointer overflow-hidden transition-all duration-500",
        isCollapsed ? "justify-center" : "justify-start"
      )} onClick={() => navigate('/dashboard')}>
        <div className="w-12 h-12 rounded-2xl bg-white shrink-0 overflow-hidden flex items-center justify-center shadow-xl shadow-primary/20 border border-white/10 transition-transform group-hover:scale-110 duration-500">
          <img src="/logo-wedplan.png" alt="WedPlan Logo" className="w-full h-full object-cover" />
        </div>
        {!isCollapsed && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <h1 className="font-black text-xl tracking-tighter uppercase italic text-foreground leading-none">Wed<br/><span className="text-primary not-italic">Plan</span></h1>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.end}
            data-tooltip={isCollapsed ? item.label : undefined}
            className={({ isActive }) => cn(
              "w-full flex items-center rounded-xl transition-all duration-300 group relative overflow-visible",
              isCollapsed ? "justify-center p-3 sidebar-tooltip" : "gap-4 px-4 py-3.5",
              isActive 
                ? "bg-primary text-white shadow-xl shadow-primary/20" 
                : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={22} className={cn("shrink-0 transition-all", isActive ? "text-white" : "group-hover:text-primary")} />
                {!isCollapsed && (
                  <span className="font-semibold tracking-wide whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-500">{item.label}</span>
                )}
                {isActive && !isCollapsed && (
                  <div className="absolute right-2 w-1.5 h-6 rounded-full bg-white/50" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-4 pt-6 mt-6 border-t border-primary/10">
        <button 
          onClick={toggleTheme}
          data-tooltip={isCollapsed ? (isDark ? "Modo Claro" : "Modo Escuro") : undefined}
          className={cn(
            "w-full flex items-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all",
            isCollapsed ? "justify-center p-3 sidebar-tooltip" : "gap-4 px-4 py-3"
          )}
        >
          <div className="shrink-0">{isDark ? <Sun size={20} /> : <Moon size={20} />}</div>
          {!isCollapsed && <span className="font-medium whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-500">{isDark ? "Modo Claro" : "Modo Escuro"}</span>}
        </button>
        
        <button 
          onClick={handleSignOut}
          data-tooltip={isCollapsed ? "Sair" : undefined}
          className={cn(
            "w-full flex items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all",
            isCollapsed ? "justify-center p-3 sidebar-tooltip" : "gap-4 px-4 py-3"
          )}
        >
          <div className="shrink-0"><LogOut size={20} /></div>
          {!isCollapsed && <span className="font-medium whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-500">Sair</span>}
        </button>
      </div>
    </div>
    </>
  );
};

export const BottomNav = ({ userRole = 'couple' }: { userRole?: string }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mainActions = ([
    { id: "dashboard", path: "/", icon: LayoutDashboard, label: "Início", end: true, hidden: userRole === 'staff' },
    { id: "checkin", path: "/checkin", icon: UserCheck, label: "Check-in", visibleOnlyForStaff: true },
    { id: "suppliers", path: "/fornecedores", icon: Briefcase, label: "Fornec.", hidden: userRole === 'staff' },
    { id: "guests", path: "/convidados", icon: Heart, label: "Convid." },
    { id: "tasks", path: "/tarefas", icon: CheckCircle2, label: "Tarefas", hidden: userRole === 'staff' },
  ] as MenuItem[]).filter(item => {
    if (item.hidden) return false;
    if (item.visibleOnlyForStaff && userRole !== 'staff') return false;
    return true;
  });

  const moreActions = ([
    { id: "financial", path: "/financeiro", icon: DollarSign, label: "Financeiro", hidden: userRole === 'staff' },
    { id: "planning", path: "/planejamento", icon: TrendingUp, label: "Planejamento", hidden: userRole === 'staff' },
    { id: "checkin", path: "/checkin", icon: UserCheck, label: "Check-in", hidden: userRole === 'staff' },
    { id: "settings", path: "/configuracoes", icon: Settings, label: "Configurações", hidden: userRole === 'staff' },
  ] as MenuItem[]).filter(item => !item.hidden);

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/10 px-4 py-2 flex items-center justify-between z-[60] safe-area-bottom">
        {mainActions.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.end}
            onClick={() => setIsMenuOpen(false)}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all min-w-[64px]",
              isActive ? "text-primary scale-110" : "text-muted-foreground"
            )}
          >
            <item.icon size={24} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all min-w-[64px]",
            isMenuOpen ? "text-primary scale-110" : "text-muted-foreground"
          )}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          <span className="text-[10px] font-bold">Mais</span>
        </button>
      </div>

      {/* Mobile Over-Menu */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[55] bg-background/80 backdrop-blur-md animate-in fade-in slide-in-from-bottom-10 duration-300">
          <div className="p-8 pt-20 space-y-6">
            <h3 className="text-2xl font-black mb-8">Outras Ferramentas</h3>
            <div className="grid grid-cols-2 gap-4">
              {moreActions.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "p-6 rounded-3xl flex flex-col gap-3 font-bold text-left transition-all",
                    isActive ? "bg-primary text-white" : "bg-secondary/50"
                  )}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
                    <item.icon size={24} />
                  </div>
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const Header = ({ title }: { title: string }) => (
  <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
    <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight pt-2">{title}</h2>
    <div className="flex items-center gap-4 lg:gap-6">
      <div className="text-right hidden sm:block">
        <p className="text-sm font-black uppercase tracking-tighter">WedPlan</p>
        <p className="text-[10px] text-primary uppercase tracking-widest font-black italic">Wedding Management Suite</p>
      </div>
      <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-tr from-primary to-blue-400 p-0.5 shadow-lg shadow-primary/20 transition-transform hover:rotate-3 duration-300">
        <div className="w-full h-full rounded-[0.9rem] bg-white dark:bg-card flex items-center justify-center text-primary font-black italic text-lg shadow-inner">
          WP
        </div>
      </div>
    </div>
  </header>
);
