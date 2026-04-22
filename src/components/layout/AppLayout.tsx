import React from 'react';
import { Sidebar, Header, BottomNav } from './index';
import { Onboarding } from './Onboarding';
import { cn } from '../../lib/utils';
import type { UserRole } from '../../types';

interface AppLayoutProps {
  children: React.ReactNode;
  isDark: boolean;
  toggleTheme: () => void;
  userRole: UserRole;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (v: boolean) => void;
  isNewWedding: boolean;
  onOnboardingComplete: (data: { nome1: string; nome2: string; data: string; orcamento: number; }) => Promise<void>;
  pageTitle: string;
  isPublicMode?: boolean;
}

export const AppLayout = ({
  children,
  isDark,
  toggleTheme,
  userRole,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  isNewWedding,
  onOnboardingComplete,
  pageTitle,
  isPublicMode = false
}: AppLayoutProps) => {
  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 flex flex-col lg:flex-row", 
      isDark ? "dark bg-background text-foreground" : "bg-slate-50 text-slate-900"
    )}>
      <Sidebar
        isDark={isDark}
        toggleTheme={toggleTheme}
        userRole={userRole}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isPublicMode={isPublicMode}
      />

      {isNewWedding && (
        <Onboarding onComplete={onOnboardingComplete} />
      )}

      <main className={cn(
        "flex-1 min-h-screen pb-24 lg:pb-10 transition-all duration-500 ease-in-out",
        isSidebarCollapsed ? "lg:ml-24" : "lg:ml-72"
      )}>
        <div className="max-w-[1600px] mx-auto p-3 sm:p-6 lg:p-10">
          <Header title={pageTitle} />
          {children}
        </div>
      </main>

      <BottomNav userRole={userRole} isPublicMode={isPublicMode} />
    </div>
  );
};
