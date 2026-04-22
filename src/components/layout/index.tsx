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
  isPublicMode?: boolean;
}

export const Sidebar = ({ isDark, toggleTheme, userRole = 'couple', isCollapsed, onToggleCollapse, isPublicMode }: SidebarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = ([
    { id: "dashboard", path: "/", label: "Dashboard", icon: LayoutDashboard, end: true, hidden: userRole === 'staff' || isPublicMode },
    { id: "suppliers", path: "/fornecedores", label: "Fornecedores", icon: Briefcase, hidden: userRole === 'staff' || isPublicMode },
    { id: "guests", path: "/convidados", label: "Convidados", icon: Heart, hidden: isPublicMode },
    { id: "tasks", path: "/tarefas", icon: CheckCircle2, label: "Tarefas", hidden: userRole === 'staff' || isPublicMode },
    { id: "financial", path: "/financeiro", label: "Financeiro", icon: DollarSign, hidden: userRole === 'staff' || isPublicMode },
    { id: "planning", path: "/planejamento", label: "Planejamento", icon: TrendingUp, hidden: userRole === 'staff' || isPublicMode },
    { id: "checkin", path: "/checkin", label: "Check-in Dia", icon: UserCheck, hidden: isPublicMode },
    { id: "settings", path: "/configuracoes", label: "Configurações", icon: Settings, hidden: userRole === 'staff' || isPublicMode },
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
        className="absolute -right-3 top-24 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-lg border border-white/20 hover:scale-110 transition-all duration-500 ease-in-out z-[60]"
      >
        <div className={cn("transition-transform duration-500", isCollapsed ? "rotate-0" : "rotate-0")}>
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </div>
      </button>

      <div className={cn(
        "flex items-center gap-3 mb-10 px-2 group cursor-pointer overflow-hidden",
        isCollapsed ? "justify-center" : "justify-start"
      )} onClick={() => navigate('/dashboard')}>
        <div className="w-12 h-12 rounded-2xl bg-white shrink-0 overflow-hidden flex items-center justify-center shadow-xl shadow-primary/20 border border-white/10 transition-transform group-hover:scale-110 duration-700 ease-in-out">
          <img src="/logo-wedplan.png" alt="WedPlan Logo" className="w-full h-full object-cover" />
        </div>
        <div className={cn(
          "transition-all duration-500 ease-in-out",
          isCollapsed ? "w-0 opacity-0 pointer-events-none -translate-x-10" : "w-auto opacity-100 translate-x-0"
        )}>
          <h1 className="font-black text-xl tracking-tighter uppercase italic text-foreground leading-none">Wed<br/><span className="text-primary not-italic">Plan</span></h1>
        </div>
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
                <item.icon size={22} className={cn("shrink-0 transition-all duration-500 ease-in-out", isActive ? "text-white" : "group-hover:text-primary")} />
                <span className={cn(
                  "font-semibold tracking-wide whitespace-nowrap transition-all duration-500 ease-in-out",
                  isCollapsed ? "w-0 opacity-0 pointer-events-none -translate-x-4" : "w-auto opacity-100 translate-x-0 ml-4"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className={cn(
                    "absolute right-2 w-1.5 h-6 rounded-full bg-white/50 transition-all duration-500",
                    isCollapsed ? "opacity-0 scale-0" : "opacity-100 scale-100"
                  )} />
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
            "w-full flex items-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-500 ease-in-out relative",
            isCollapsed ? "justify-center p-3 sidebar-tooltip" : "gap-4 px-4 py-3"
          )}
        >
          <div className="shrink-0 transition-transform duration-500">{isDark ? <Sun size={20} /> : <Moon size={20} />}</div>
          <span className={cn(
            "font-medium whitespace-nowrap transition-all duration-500 ease-in-out",
            isCollapsed ? "w-0 opacity-0 pointer-events-none -translate-x-4" : "w-auto opacity-100 translate-x-0"
          )}>
            {isDark ? "Modo Claro" : "Modo Escuro"}
          </span>
        </button>
        
        {!isPublicMode && (
          <button 
            onClick={handleSignOut}
            data-tooltip={isCollapsed ? "Sair" : undefined}
            className={cn(
              "w-full flex items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-500 ease-in-out relative",
              isCollapsed ? "justify-center p-3 sidebar-tooltip" : "gap-4 px-4 py-3"
            )}
          >
            <div className="shrink-0 transition-transform duration-500"><LogOut size={20} /></div>
            <span className={cn(
              "font-medium whitespace-nowrap transition-all duration-500 ease-in-out",
              isCollapsed ? "w-0 opacity-0 pointer-events-none -translate-x-4" : "w-auto opacity-100 translate-x-0"
            )}>
              Sair
            </span>
          </button>
        )}
      </div>
    </div>
    </>
  );
};

export const BottomNav = ({ userRole = 'couple', isPublicMode = false }: { userRole?: string; isPublicMode?: boolean }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mainActions = ([
    { id: "dashboard", path: "/", icon: LayoutDashboard, label: "Início", end: true, hidden: userRole === 'staff' || isPublicMode },
    { id: "checkin", path: "/checkin", icon: UserCheck, label: "Check-in", visibleOnlyForStaff: true, hidden: isPublicMode },
    { id: "suppliers", path: "/fornecedores", icon: Briefcase, label: "Fornec.", hidden: userRole === 'staff' || isPublicMode },
    { id: "guests", path: "/convidados", icon: Heart, label: "Convid.", hidden: isPublicMode },
    { id: "tasks", path: "/tarefas", icon: CheckCircle2, label: "Tarefas", hidden: userRole === 'staff' || isPublicMode },
  ] as MenuItem[]).filter(item => {
    if (item.hidden) return false;
    if (item.visibleOnlyForStaff && userRole !== 'staff') return false;
    return true;
  });

  const moreActions = ([
    { id: "financial", path: "/financeiro", icon: DollarSign, label: "Financeiro", hidden: userRole === 'staff' || isPublicMode },
    { id: "planning", path: "/planejamento", icon: TrendingUp, label: "Planejamento", hidden: userRole === 'staff' || isPublicMode },
    { id: "checkin", path: "/checkin", icon: UserCheck, label: "Check-in", hidden: userRole === 'staff' || isPublicMode },
    { id: "settings", path: "/configuracoes", icon: Settings, label: "Configurações", hidden: userRole === 'staff' || isPublicMode },
  ] as MenuItem[]).filter(item => !item.hidden);

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/10 px-2 xs:px-4 py-2 flex items-center justify-around z-[60] safe-area-bottom">
        {mainActions.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.end}
            onClick={() => setIsMenuOpen(false)}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all min-w-[50px] xs:min-w-[64px]",
              isActive ? "text-primary scale-110" : "text-muted-foreground"
            )}
          >
            <item.icon size={20} className="xs:w-[24px] xs:h-[24px]" />
            <span className="text-[9px] xs:text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
          </NavLink>
        ))}
        {!isPublicMode && (
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all min-w-[50px] xs:min-w-[64px]",
              isMenuOpen ? "text-primary scale-110" : "text-muted-foreground"
            )}
          >
            {isMenuOpen ? <X size={20} className="xs:w-[24px] xs:h-[24px]" /> : <Menu size={20} className="xs:w-[24px] xs:h-[24px]" />}
            <span className="text-[9px] xs:text-[10px] font-black uppercase tracking-tighter">Mais</span>
          </button>
        )}
      </div>

      {/* Mobile Over-Menu */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[55] bg-background/90 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-10 duration-300">
          <div className="p-6 pt-20 space-y-6 flex flex-col h-full">
            <h3 className="text-3xl font-black mb-4 italic uppercase tracking-tighter">Outros <span className="text-primary italic not-italic">Apps</span></h3>
            <div className="grid grid-cols-2 gap-4 flex-1 content-start">
              {moreActions.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "p-5 rounded-[2rem] border border-white/5 flex flex-col gap-4 font-black transition-all",
                    isActive ? "bg-primary text-white shadow-xl shadow-primary/20" : "bg-secondary/40 text-foreground"
                  )}
                >
                  {({ isActive }: { isActive: boolean }) => (
                    <>
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                        isActive ? "bg-white/20" : "bg-card shadow-lg"
                      )}>
                        <item.icon size={24} />
                      </div>
                      <span className="text-sm uppercase tracking-tighter">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
            
            <div className="mt-auto pb-24 border-t border-white/10 pt-6">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center opacity-30">WedPlan Premium Suite</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const Header = ({ title }: { title: string }) => (
  <header className="flex items-center justify-between mb-4 sm:mb-8 flex-wrap gap-4 relative">
    <div className="flex-1 min-w-0">
      <h2 className="text-2xl lg:text-3xl font-black tracking-tighter uppercase italic leading-none pt-2 truncate">{title}</h2>
      <div className="h-1 w-12 bg-primary rounded-full mt-2" />
    </div>
    <div className="flex items-center gap-3 lg:gap-6">
      <div className="text-right hidden sm:block">
        <p className="text-sm font-black uppercase tracking-tighter">WedPlan</p>
        <p className="text-[10px] text-primary uppercase tracking-widest font-black italic">Wedding Suite</p>
      </div>
      <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-tr from-primary to-blue-400 p-0.5 shadow-lg shadow-primary/20 transition-transform active:scale-95 duration-300">
        <div className="w-full h-full rounded-[0.9rem] bg-white dark:bg-card flex items-center justify-center text-primary font-black italic text-base sm:text-lg shadow-inner">
          WP
        </div>
      </div>
    </div>
  </header>
);
