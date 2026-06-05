/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LayoutCelularProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: { id: string; label: string; icon: React.ComponentType<any> }[];
  overlay?: React.ReactNode;
}

export default function LayoutCelular({
  children,
  activeTab,
  setActiveTab,
  tabs,
  overlay,
}: LayoutCelularProps) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-0 sm:p-6 font-sans">
      {/* Container Adaptativo: No desktop vira Celular iOS, no mobile expande 100% */}
      <div className="w-full sm:max-w-[430px] sm:h-[880px] sm:rounded-[48px] sm:border-[12px] sm:border-[#1C1C1E] sm:ring-4 sm:ring-zinc-900/40 bg-black flex flex-col relative sm:shadow-2xl overflow-hidden self-center">
        
        {/* Área de Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24 bg-black scrollbar-none pt-14">
          {children}
        </div>

        {/* Overlay do Celular (FAB e Modal Rápido) */}
        {overlay}

        {/* iOS Tab Bar de Vidro (Glassmorphism) no Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#161617]/90 backdrop-blur-xl border-t border-white/5 pb-5 pt-2 px-6 flex justify-around items-center z-40">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 transition-all duration-300 relative ${
                  isActive ? 'text-[#0A84FF] scale-105' : 'text-[#8E8E93] hover:text-zinc-400'
                }`}
              >
                <div className="p-1.5 rounded-full transition-colors relative">
                  <Icon className="w-6 h-6 stroke-[2]" />
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#0A84FF] rounded-full" />
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-tight mt-0.5">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* iOS Home Indicator Bar */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-40 pointer-events-none hidden sm:block"></div>
      </div>
    </div>
  );
}
