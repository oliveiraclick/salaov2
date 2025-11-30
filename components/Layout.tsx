
import React from 'react';
import { ViewState } from '../types';
import { Scissors, Package, Settings, Users, Store, LayoutDashboard, LogIn, Wallet, Calendar, ShoppingBag } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  setView: (view: ViewState) => void;
  salonName?: string;
  activeClientTab?: 'home' | 'appointments' | 'store';
  onClientTabChange?: (tab: 'home' | 'appointments' | 'store') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, salonName, activeClientTab, onClientTabChange }) => {
  const isPublicMode = currentView === ViewState.PUBLIC_SALON || currentView === ViewState.MARKETPLACE || currentView === ViewState.CLIENT_AUTH || currentView === ViewState.CLIENT_STORE || currentView === ViewState.SAAS_LP;
  const isMarketplace = currentView === ViewState.MARKETPLACE;
  const isSaaS_LP = currentView === ViewState.SAAS_LP;
  const isSalonView = currentView === ViewState.PUBLIC_SALON;
  
  // Logic to determine if we show the Client Bottom Nav
  // Show if we are in the Salon View (Public Mode) but NOT in Marketplace or SaaS LP
  const isClientView = isSalonView; 

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => setView(view)}
      className={`flex flex-col items-center justify-center w-full py-3 transition-colors duration-200 ${
        currentView === view ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <Icon size={22} strokeWidth={currentView === view ? 2.5 : 2} />
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header - Show only if NOT SaaS LP, NOT Public Salon, and NOT Marketplace (Marketplace has its own header now) */}
      {!isSaaS_LP && !isSalonView && !isMarketplace && (
      <header className="bg-white shadow-sm sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
        <div>
           <h1 className="text-xl font-bold text-slate-800 truncate max-w-[200px]">
             {salonName || 'Painel Admin'}
           </h1>
        </div>
        
        {!isPublicMode && currentView === ViewState.CLIENT_PREVIEW && (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wide">
            Modo Cliente
          </span>
        )}
      </header>
      )}

      {/* Main Content */}
      {/* Remove padding for SalonView to allow full-bleed immersive headers */}
      <main className={`flex-1 overflow-y-auto ${isSaaS_LP || isSalonView ? '' : 'p-4 pb-24'} max-w-3xl mx-auto w-full no-scrollbar`}>
        {children}
      </main>

      {/* Bottom Navigation - SALON ADMIN */}
      {!isPublicMode && currentView !== ViewState.SAAS_ADMIN && currentView !== ViewState.SAAS_PLANS && (
        <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex justify-around items-center z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto">
          <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Início" />
          <NavItem view={ViewState.FINANCE} icon={Wallet} label="Financeiro" />
          <NavItem view={ViewState.SERVICES} icon={Scissors} label="Serviços" />
          <NavItem view={ViewState.PRODUCTS} icon={Package} label="Produtos" />
          <NavItem view={ViewState.TEAM} icon={Users} label="Equipe" />
          <NavItem view={ViewState.SETTINGS} icon={Settings} label="Ajustes" />
        </nav>
      )}

      {/* Bottom Nav - CLIENT (Public Salon View) */}
      {isClientView && onClientTabChange && (
        <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex justify-around items-center z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
           <button 
             onClick={() => onClientTabChange('home')}
             className={`flex flex-col items-center justify-center w-full py-3 transition-colors duration-200 ${
               activeClientTab === 'home' ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'
             }`}
           >
              <Store size={24} strokeWidth={activeClientTab === 'home' ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">Início</span>
           </button>
           <button 
             onClick={() => onClientTabChange('store')}
             className={`flex flex-col items-center justify-center w-full py-3 transition-colors duration-200 ${
               activeClientTab === 'store' ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'
             }`}
           >
              <ShoppingBag size={24} strokeWidth={activeClientTab === 'store' ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">Loja</span>
           </button>
           <button 
             onClick={() => onClientTabChange('appointments')}
             className={`flex flex-col items-center justify-center w-full py-3 transition-colors duration-200 ${
               activeClientTab === 'appointments' ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'
             }`}
           >
              <Calendar size={24} strokeWidth={activeClientTab === 'appointments' ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">Conta</span>
           </button>
        </nav>
      )}

      {/* Bottom Nav - MARKETPLACE */}
      {isMarketplace && (
         <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex justify-around items-center z-50 pb-safe px-6 py-3">
             <button className="flex flex-col items-center text-rose-600">
                <Store size={24} />
                <span className="text-xs font-bold mt-1">Explorar</span>
             </button>
             <button 
                data-action="login"
                className="flex flex-col items-center text-slate-400 hover:text-slate-800"
             >
                <LayoutDashboard size={24} />
                <span className="text-xs font-bold mt-1">Sou Parceiro</span>
             </button>
         </nav>
      )}
    </div>
  );
};

export default Layout;
