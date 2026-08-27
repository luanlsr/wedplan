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
  weddingId?: string;
  userName?: string;
  onWeddingSwitch?: () => void | Promise<void>;
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
  isPublicMode = false,
  weddingId,
  userName,
  onWeddingSwitch
}: AppLayoutProps) => {
  return (
    <div className={cn(
      "wedplan-app min-h-screen transition-colors duration-500 flex flex-col lg:flex-row", 
      isDark ? "dark text-foreground" : "text-foreground"
    )}>
      <Sidebar
        isDark={isDark}
        toggleTheme={toggleTheme}
        userRole={userRole}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isPublicMode={isPublicMode}
        weddingId={weddingId}
        userName={userName}
        onWeddingSwitch={onWeddingSwitch}
      />

      {isNewWedding && userRole !== 'master' && userName !== 'Luan Master' && (
        <Onboarding onComplete={onOnboardingComplete} />
      )}

      <main className={cn(
        "flex-1 min-h-screen pb-24 lg:pb-10 transition-all duration-500 ease-in-out",
        isSidebarCollapsed ? "lg:ml-24" : "lg:ml-80"
      )}>
        <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:p-8">
          <Header title={pageTitle} isDark={isDark} toggleTheme={toggleTheme} />
          {children}
        </div>
      </main>

      <BottomNav userRole={userRole} isPublicMode={isPublicMode} userName={userName} />
    </div>
  );
};
