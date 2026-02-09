import React from 'react';
import { LayoutDashboard, Receipt, UploadCloud, Settings, LogOut, Menu, X, ChevronDown, ShieldCheck } from 'lucide-react';
import { Profile, ViewState, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: Profile;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
}

const NavItem = ({ 
  icon: Icon, 
  label, 
  isActive, 
  onClick 
}: { 
  icon: React.ElementType, 
  label: string, 
  isActive: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
      isActive 
        ? 'bg-indigo-600 text-white shadow-md' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ user, currentView, onNavigate, onLogout, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-slate-200 h-full">
        <div className="p-6 flex items-center space-x-2 border-b border-slate-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">ComTracker</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            isActive={currentView === 'dashboard'} 
            onClick={() => onNavigate('dashboard')} 
          />
          <NavItem 
            icon={Receipt} 
            label="Commissions" 
            isActive={currentView === 'commissions'} 
            onClick={() => onNavigate('commissions')} 
          />
          <NavItem 
            icon={UploadCloud} 
            label="Upload Invoice" 
            isActive={currentView === 'upload'} 
            onClick={() => onNavigate('upload')} 
          />
          <NavItem 
            icon={Settings} 
            label="Settings" 
            isActive={currentView === 'settings'} 
            onClick={() => onNavigate('settings')} 
          />
          
          {user.role === UserRole.ADMIN && (
            <div className="pt-4 mt-4 border-t border-slate-100">
               <NavItem 
                icon={ShieldCheck} 
                label="Admin Panel" 
                isActive={currentView === 'admin'} 
                onClick={() => onNavigate('admin')} 
              />
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                        {user.full_name.charAt(0)}
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.full_name}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between z-20">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">C</span>
            </div>
            <span className="font-bold text-slate-800">ComTracker</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-6 h-6 text-slate-600" /> : <Menu className="w-6 h-6 text-slate-600" />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute inset-0 bg-white z-10 pt-20 px-4 space-y-2">
             <NavItem 
                icon={LayoutDashboard} 
                label="Dashboard" 
                isActive={currentView === 'dashboard'} 
                onClick={() => { onNavigate('dashboard'); setIsMobileMenuOpen(false); }} 
              />
              <NavItem 
                icon={Receipt} 
                label="Commissions" 
                isActive={currentView === 'commissions'} 
                onClick={() => { onNavigate('commissions'); setIsMobileMenuOpen(false); }} 
              />
              <NavItem 
                icon={UploadCloud} 
                label="Upload Invoice" 
                isActive={currentView === 'upload'} 
                onClick={() => { onNavigate('upload'); setIsMobileMenuOpen(false); }} 
              />
              <NavItem 
                icon={Settings} 
                label="Settings" 
                isActive={currentView === 'settings'} 
                onClick={() => { onNavigate('settings'); setIsMobileMenuOpen(false); }} 
              />
              {user.role === UserRole.ADMIN && (
                <NavItem 
                    icon={ShieldCheck} 
                    label="Admin Panel" 
                    isActive={currentView === 'admin'} 
                    onClick={() => { onNavigate('admin'); setIsMobileMenuOpen(false); }} 
                />
              )}
              <div className="pt-6 border-t border-slate-100">
                  <button onClick={onLogout} className="flex items-center space-x-2 text-red-600 font-medium">
                      <LogOut className="w-5 h-5" /> <span>Log out</span>
                  </button>
              </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {children}
            </div>
        </main>
      </div>
    </div>
  );
};