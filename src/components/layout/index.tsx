import { LayoutDashboard, Briefcase, DollarSign, Settings, Moon, Sun, TrendingUp, LogOut, Heart, CheckCircle2, Menu, X, UserCheck, ChevronLeft, ChevronRight, Users, CreditCard, Globe2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, NavLink } from "react-router-dom";
import { useState } from "react";
import { WeddingSwitcher } from "./WeddingSwitcher";
import { BrandLogo } from "./BrandLogo";

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
  weddingId?: string;
  userName?: string;
  onWeddingSwitch?: () => void | Promise<void>;
}

export const Sidebar = ({ isDark, toggleTheme, userRole = 'couple', isCollapsed, onToggleCollapse, isPublicMode, weddingId, userName, onWeddingSwitch }: SidebarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const coupleItems = [
    { id: "dashboard", path: "/", label: "Dashboard", icon: LayoutDashboard, end: true, hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
    { id: "suppliers", path: "/fornecedores", label: "Fornecedores", icon: Briefcase, hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
    { id: "guests", path: "/convidados", label: "Convidados", icon: Heart, hidden: userRole === 'master' || isPublicMode },
    { id: "tasks", path: "/tarefas", icon: CheckCircle2, label: "Tarefas", hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
    { id: "financial", path: "/financeiro", label: "Financeiro", icon: DollarSign, hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
    { id: "planning", path: "/planejamento", label: "Planejamento", icon: TrendingUp, hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
    { id: "wedding-site", path: "/site", label: "Site do Casal", icon: Globe2, hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
    { id: "checkin", path: "/checkin", label: "Check-in Dia", icon: UserCheck, hidden: userRole === 'master' || isPublicMode },
    { id: "settings", path: "/configuracoes", label: "Configurações", icon: Settings, hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
  ] as MenuItem[];

  const masterItems = [
    { id: "admin-dashboard", path: "/", label: "Visão Geral", icon: LayoutDashboard, end: true },
    { id: "admin-users", path: "/usuarios", label: "Usuários", icon: Users },
    { id: "admin-subscriptions", path: "/assinaturas", label: "Assinaturas", icon: CreditCard },
    { id: "admin-domains", path: "/dominios", label: "Domínios", icon: Globe2 },
    { id: "admin-settings", path: "/configuracoes-master", label: "Configurações", icon: Settings },
  ] as MenuItem[];

  let menuItems: MenuItem[] = [];
  
  if (userRole === 'master') {
    menuItems = masterItems.filter(item => !item.hidden);
  } else {
    menuItems = coupleItems.filter(item => {
      if (item.hidden) return false;
      if (item.visibleOnlyForStaff && userRole !== 'staff') return false;
      return true;
    });
  }

  return (
    <>
    <style>{tooltipStyles}</style>
    <div className={cn(
      "hidden lg:flex h-screen fixed left-0 top-0 bg-card/90 backdrop-blur-xl border-r border-border p-5 flex-col z-50 transition-all duration-500 shadow-sm",
      isCollapsed ? "w-24" : "w-80"
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
        "flex items-center mb-8 px-2 group cursor-pointer overflow-hidden justify-center shrink-0 transition-all duration-500",
        isCollapsed ? "mt-2" : "mt-2"
      )} onClick={() => navigate('/dashboard')}>
        <div className={cn(
          "shrink-0 transition-all duration-700 ease-in-out flex items-center justify-center relative",
          isCollapsed ? "w-11 h-11" : "w-40 h-24"
        )}>
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              <motion.div
                key="favicon"
                initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
                transition={{ duration: 0.4, ease: "backOut" }}
                className="w-full h-full flex items-center justify-center"
              >
                <BrandLogo variant="mark" size="md" />
              </motion.div>
            ) : (
              <motion.div
                key="full-logo"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full h-full flex items-center"
              >
                <BrandLogo size="md" showTagline />
              </motion.div>

            )}
          </AnimatePresence>
        </div>

      </div>



      {!isPublicMode && userRole !== 'master' && userRole !== 'staff' && (
        <WeddingSwitcher 
          currentWeddingId={weddingId} 
          isCollapsed={isCollapsed} 
          onSwitch={() => onWeddingSwitch?.()} 
        />
      )}

      {/* User Profile Info */}
      {!isPublicMode && (
        <div className={cn(
          "mb-6 p-3 rounded-xl bg-secondary/60 border border-border flex items-center shrink-0 transition-all duration-500 overflow-hidden",
          isCollapsed ? "justify-center" : "justify-start gap-3"
        )}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-blue-400 p-0.5 shrink-0 shadow-lg">
            <div className="w-full h-full rounded-lg bg-card flex items-center justify-center text-primary font-extrabold text-sm">
              {userName ? userName.substring(0, 2).toUpperCase() : 'US'}
            </div>
          </div>
          
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0, width: 0, x: -10 }}
                animate={{ opacity: 1, width: "auto", x: 0 }}
                exit={{ opacity: 0, width: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col min-w-0"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary leading-none mb-1 truncate">
                  {userRole}
                </span>
                <span className="text-sm font-semibold truncate max-w-[150px]">
                  {userName || 'Usuário WedPlan'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}


      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.end}
            data-tooltip={isCollapsed ? item.label : undefined}
            className={({ isActive }) => cn(
              "w-full flex items-center rounded-xl transition-all duration-300 group relative overflow-visible",
              isCollapsed ? "justify-center p-3 sidebar-tooltip" : "gap-3 px-3.5 py-3",
              isActive 
                ? "bg-primary text-white shadow-sm shadow-primary/20" 
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={22} className={cn("shrink-0 transition-all duration-500 ease-in-out", isActive ? "text-white" : "group-hover:text-primary")} />
                <span className={cn(
                  "font-semibold text-sm tracking-normal whitespace-nowrap transition-all duration-500 ease-in-out",
                  isCollapsed ? "w-0 opacity-0 pointer-events-none -translate-x-4" : "w-auto opacity-100 translate-x-0"
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

      <div className="space-y-3 pt-5 mt-5 border-t border-border">
        <button 
          onClick={toggleTheme}
          data-tooltip={isCollapsed ? (isDark ? "Modo Claro" : "Modo Escuro") : undefined}
          className={cn(
            "w-full flex items-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-500 ease-in-out relative",
            isCollapsed ? "justify-center p-3 sidebar-tooltip" : "gap-3 px-3.5 py-3"
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
              isCollapsed ? "justify-center p-3 sidebar-tooltip" : "gap-3 px-3.5 py-3"
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

export const BottomNav = ({ userRole = 'couple', isPublicMode = false, userName }: { userRole?: string; isPublicMode?: boolean; userName?: string }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const coupleMainActions = [
    { id: "dashboard", path: "/", icon: LayoutDashboard, label: "Início", end: true, hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
    { id: "checkin", path: "/checkin", icon: UserCheck, label: "Check-in", visibleOnlyForStaff: true, hidden: userRole === 'master' || isPublicMode },
    { id: "suppliers", path: "/fornecedores", icon: Briefcase, label: "Fornec.", hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
    { id: "guests", path: "/convidados", icon: Heart, label: "Convid.", hidden: userRole === 'master' || isPublicMode },
    { id: "tasks", path: "/tarefas", icon: CheckCircle2, label: "Tarefas", hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
  ] as MenuItem[];

  const masterMainActions = [
    { id: "admin-dashboard", path: "/", icon: LayoutDashboard, label: "Início", end: true },
    { id: "admin-users", path: "/usuarios", icon: Users, label: "Usuários" },
    { id: "admin-subscriptions", path: "/assinaturas", icon: CreditCard, label: "Assinaturas" },
  ] as MenuItem[];

  const rawMainActions = userRole === 'master' ? masterMainActions : coupleMainActions;

  const mainActions = rawMainActions.filter(item => {
    if (item.hidden) return false;
    if (item.visibleOnlyForStaff && userRole !== 'staff') return false;
    return true;
  });

  const coupleMoreActions = [
    { id: "financial", path: "/financeiro", icon: DollarSign, label: "Financeiro", hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
    { id: "planning", path: "/planejamento", icon: TrendingUp, label: "Planejamento", hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
    { id: "wedding-site", path: "/site", icon: Globe2, label: "Site do Casal", hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
    { id: "checkin", path: "/checkin", icon: UserCheck, label: "Check-in", hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
    { id: "settings", path: "/configuracoes", icon: Settings, label: "Configurações", hidden: userRole === 'master' || userRole === 'staff' || isPublicMode },
  ] as MenuItem[];

  const masterMoreActions = [
    { id: "admin-domains", path: "/dominios", icon: Globe2, label: "Domínios" },
    { id: "admin-settings", path: "/configuracoes-master", icon: Settings, label: "Configurações" },
  ] as MenuItem[];

  const rawMoreActions = userRole === 'master' ? masterMoreActions : coupleMoreActions;
  
  const moreActions = rawMoreActions.filter(item => !item.hidden);

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background shadow-xl border-t border-white/10 px-2 xs:px-4 py-2 flex items-center justify-around z-[60] safe-area-bottom">
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
        <div className="lg:hidden fixed inset-0 z-[55] bg-background animate-in fade-in slide-in-from-bottom-10 duration-300">
          <div className="p-6 pt-20 space-y-6 flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-blue-400 p-0.5 shadow-xl">
                <div className="w-full h-full rounded-[0.9rem] bg-white dark:bg-card flex items-center justify-center text-primary font-black text-2xl italic">
                  {userName ? userName.substring(0, 2).toUpperCase() : 'US'}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary leading-none mb-1">Bem-vindo(a)</p>
                <h3 className="text-xl font-extrabold uppercase tracking-tight leading-none truncate max-w-[200px]">{userName || 'Usuário WedPlan'}</h3>
              </div>

            </div>
            <h3 className="text-xl font-black mb-2 italic uppercase tracking-tighter opacity-50">Menu do Sistema</h3>
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
               {!isPublicMode && (
                 <button 
                   onClick={handleSignOut}
                   className="w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] bg-destructive/10 text-destructive font-black uppercase tracking-tighter transition-all active:scale-95 mb-6"
                 >
                   <LogOut size={22} />
                   <span>Encerrar Sessão</span>
                 </button>
               )}
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center opacity-30">WedPlan Premium Suite</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const Header = ({ title, isDark, toggleTheme }: { title: string; isDark: boolean; toggleTheme?: () => void }) => (
  <header className="mb-6 sm:mb-8 flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card/80 px-4 py-4 shadow-sm backdrop-blur-xl sm:px-5">
    <div className="flex min-w-0 items-center gap-3">
      <BrandLogo variant="mark" size="sm" />
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-primary">WedPlan</p>
        <h1 className="truncate text-xl font-extrabold text-foreground sm:text-2xl">
          {title}
        </h1>
      </div>
    </div>

    {toggleTheme && (
      <button 
        onClick={toggleTheme}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/60 text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95"
        aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      >
        {isDark ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-primary" />}
      </button>
    )}
  </header>
);
