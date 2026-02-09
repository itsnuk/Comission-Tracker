import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { CommissionList } from './components/CommissionList';
import { InvoiceUpload } from './components/InvoiceUpload';
import { InvoiceReview } from './components/InvoiceReview';
import { Settings } from './components/Settings';
import { AdminPanel } from './components/AdminPanel';
import { AppState, CommissionEntry, Profile, UserRole, ViewState, CommissionStatus, Team } from './types';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

// --- Expanded Mock Data ---
const MOCK_TEAMS: Team[] = [
    { id: 'team-1', name: 'Design Squad', manager_id: 'user-manager' },
    { id: 'team-2', name: 'Dev Team', manager_id: 'user-admin' }
];

const MOCK_PROFILES: Profile[] = [
    {
        id: 'user-admin',
        email: 'admin@base44.com',
        full_name: 'Admin Alice',
        role: UserRole.ADMIN,
        default_commission_rate: 5,
        team_id: 'team-2'
    },
    {
        id: 'user-manager',
        email: 'manager@base44.com',
        full_name: 'Manager Bob',
        role: UserRole.MANAGER,
        default_commission_rate: 5,
        team_id: 'team-1'
    },
    {
        id: 'user-1',
        email: 'freelancer@base44.com',
        full_name: 'Alex Freelancer',
        role: UserRole.USER,
        default_commission_rate: 5,
        team_id: 'team-1'
    },
    {
        id: 'user-2',
        email: 'designer@base44.com',
        full_name: 'Sarah Designer',
        role: UserRole.USER,
        default_commission_rate: 5,
        team_id: 'team-1'
    }
];

const MOCK_ENTRIES: CommissionEntry[] = [
  {
    id: '1',
    user_id: 'user-1',
    invoice_number: 'INV-2023-001',
    receipt_number: 'TI20230099',
    customer: 'Acme Corp',
    project: 'Website Redesign',
    amount_before_vat: 5000,
    cost_before_vat: 500,
    commission_rate: 5,
    tax: 0,
    net_total: 4500,
    net_to_pay: 225,
    invoice_month: '2023-10-01',
    client_paid_date: '2023-10-15',
    commission_status: CommissionStatus.PAID,
    note: 'Initial deposit',
    file_name: 'invoice_001.pdf'
  },
  {
    id: '2',
    user_id: 'user-1',
    invoice_number: 'INV-2023-005',
    customer: 'Stark Industries',
    project: 'Security Audit',
    amount_before_vat: 12000,
    cost_before_vat: 0,
    commission_rate: 5,
    tax: 0,
    net_total: 12000,
    net_to_pay: 600,
    invoice_month: '2023-11-15',
    commission_status: CommissionStatus.ELIGIBLE,
    file_name: 'stark_inv.pdf'
  },
  {
      id: '3',
      user_id: 'user-2', // Sarah's entry (for Manager Bob to see)
      invoice_number: 'INV-2023-999',
      customer: 'Wayne Enterprises',
      project: 'Logo Design',
      amount_before_vat: 8000,
      cost_before_vat: 0,
      commission_rate: 5,
      tax: 0,
      net_total: 8000,
      net_to_pay: 400,
      invoice_month: '2023-11-20',
      commission_status: CommissionStatus.UNPAID
  }
];

// --- Toast Component ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
        {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        <span className="font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 hover:opacity-75"><X className="w-4 h-4" /></button>
    </div>
);

const App: React.FC = () => {
  // State Management with LocalStorage persistence
  const [user, setUser] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  
  // Review State
  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [reviewData, setReviewData] = useState<any>(null);

  // Toast State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
  };

  // Load data on mount
  useEffect(() => {
    // Simulate loading/checking auth
    setTimeout(() => {
      const storedUser = localStorage.getItem('app_user');
      const storedCommissions = localStorage.getItem('app_commissions');
      const storedProfiles = localStorage.getItem('app_profiles');
      const storedTeams = localStorage.getItem('app_teams');
      
      // Load or Mock Profiles/Teams first
      if (storedProfiles) setProfiles(JSON.parse(storedProfiles));
      else {
          setProfiles(MOCK_PROFILES);
          localStorage.setItem('app_profiles', JSON.stringify(MOCK_PROFILES));
      }

      if (storedTeams) setTeams(JSON.parse(storedTeams));
      else {
          setTeams(MOCK_TEAMS);
          localStorage.setItem('app_teams', JSON.stringify(MOCK_TEAMS));
      }

      // Load Commissions
      if (storedCommissions) {
        setCommissions(JSON.parse(storedCommissions));
      } else {
        setCommissions(MOCK_ENTRIES);
        localStorage.setItem('app_commissions', JSON.stringify(MOCK_ENTRIES));
      }

      // Load User - default to Admin for demo if nothing stored
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        // Default to Admin for Phase 7 Demo
        const adminUser = MOCK_PROFILES.find(p => p.role === UserRole.ADMIN) || MOCK_PROFILES[0];
        setUser(adminUser);
        localStorage.setItem('app_user', JSON.stringify(adminUser));
      }
      
      setIsLoading(false);
    }, 1200); // Slightly longer to show off skeleton
  }, []);

  // Persistence Effects
  useEffect(() => { if (user) localStorage.setItem('app_user', JSON.stringify(user)); }, [user]);
  useEffect(() => { if (commissions.length > 0) localStorage.setItem('app_commissions', JSON.stringify(commissions)); }, [commissions]);
  useEffect(() => { if (profiles.length > 0) localStorage.setItem('app_profiles', JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => { if (teams.length > 0) localStorage.setItem('app_teams', JSON.stringify(teams)); }, [teams]);


  // Handlers
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('app_user');
    window.location.reload(); 
  };

  const handleStartReview = (file: File, extractedData: any) => {
      setReviewFile(file);
      setReviewData(extractedData);
      setCurrentView('review');
  };

  const handleSaveCommission = (entry: CommissionEntry) => {
    const updated = [entry, ...commissions];
    setCommissions(updated);
    showToast("Commission saved successfully!");
  };

  const handleReviewFinish = () => {
    setReviewFile(null);
    setReviewData(null);
    setCurrentView('commissions');
  };

  const handleCancelReview = () => {
      setReviewFile(null);
      setReviewData(null);
      setCurrentView('upload');
  };

  const handleManualEntry = () => {
      setReviewFile(null);
      setReviewData({});
      setCurrentView('review');
  };

  // --- CRUD Handlers ---

  const handleAddCommission = (entry: CommissionEntry) => {
     setCommissions(prev => [entry, ...prev]);
     showToast("New entry added successfully");
  };

  const handleDeleteCommission = (id: string) => {
      setCommissions(prev => prev.filter(c => c.id !== id));
      showToast("Entry deleted", "error");
  };

  const handleUpdateCommission = (updatedEntry: CommissionEntry) => {
    // Backend Calculation Simulation
    let entry = { ...updatedEntry };
    
    // Recalculate totals if core fields changed
    const netTotal = entry.amount_before_vat - entry.cost_before_vat;
    const netToPay = netTotal * (entry.commission_rate / 100);
    
    entry.net_total = netTotal;
    entry.net_to_pay = netToPay;

    // NOTE: Status Automation (e.g. date -> eligible) is now handled in CommissionList.tsx handleInlineUpdate
    // to allow for manual override back to UNPAID if desired by the user.

    setCommissions(prev => prev.map(c => c.id === entry.id ? entry : c));
  };

  const handleUpdateUser = (updatedUser: Profile) => {
    setUser(updatedUser);
    // Also update in profiles list
    setProfiles(prev => prev.map(p => p.id === updatedUser.id ? updatedUser : p));
    showToast("Profile updated");
  };

  // --- Admin/Manager Handlers ---

  const handleUpdateProfile = (updatedProfile: Profile) => {
      setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
      // If updating self
      if (user && user.id === updatedProfile.id) {
          setUser(updatedProfile);
      }
      showToast("User profile updated");
  };

  const handleAddTeam = (teamName: string) => {
      const newTeam: Team = {
          id: `team-${Date.now()}`,
          name: teamName
      };
      setTeams(prev => [...prev, newTeam]);
      showToast(`Team "${teamName}" created`);
  };

  const handleImpersonate = (targetProfile: Profile) => {
      if (window.confirm(`Are you sure you want to log in as ${targetProfile.full_name}? You will lose admin access until you log out.`)) {
          setUser(targetProfile);
          setCurrentView('dashboard');
          showToast(`Logged in as ${targetProfile.full_name}`);
      }
  };

  // --- Derived Data ---

  // For User/Manager: Only show their own commissions by default
  const myCommissions = commissions.filter(c => c.user_id === user?.id);

  // For Manager: Show team commissions
  // Logic: Find the team where this manager is the manager, get all users in that team, get their commissions
  const teamCommissions = React.useMemo(() => {
      if (user?.role !== UserRole.MANAGER || !user.team_id) return [];
      // Assuming manager sees everyone in their assigned team
      const teamMemberIds = profiles.filter(p => p.team_id === user.team_id && p.id !== user.id).map(p => p.id);
      return commissions.filter(c => teamMemberIds.includes(c.user_id));
  }, [user, profiles, commissions]);


  // Render Logic
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-4 md:p-8 space-y-8 animate-pulse">
         {/* Skeleton Header */}
         <div className="w-full h-16 bg-slate-200 rounded-xl"></div>
         
         <div className="flex flex-1 space-x-8">
            {/* Skeleton Sidebar */}
            <div className="hidden md:block w-64 h-[80vh] bg-slate-200 rounded-xl"></div>
            
            {/* Skeleton Content */}
            <div className="flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="h-32 bg-slate-200 rounded-xl"></div>
                    <div className="h-32 bg-slate-200 rounded-xl"></div>
                    <div className="h-32 bg-slate-200 rounded-xl"></div>
                    <div className="h-32 bg-slate-200 rounded-xl"></div>
                </div>
                <div className="h-96 bg-slate-200 rounded-xl"></div>
            </div>
         </div>
      </div>
    );
  }

  // Simple Auth Gate
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-indigo-200">
                <span className="text-white font-bold text-3xl">C</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Commission Tracker</h1>
            <p className="text-slate-500 mb-8">Track your freelance income and commissions with AI-powered invoice extraction.</p>
            
            <div className="space-y-3">
                {MOCK_PROFILES.slice(0, 3).map(p => (
                    <button 
                        key={p.id}
                        onClick={() => { setUser(p); }}
                        className="w-full py-3 bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 font-medium rounded-lg transition-all text-slate-700 flex justify-between px-4 items-center group"
                    >
                        <span>{p.full_name}</span>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded group-hover:bg-indigo-50 uppercase font-bold">{p.role}</span>
                    </button>
                ))}
            </div>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      user={user} 
      currentView={currentView} 
      onNavigate={setCurrentView} 
      onLogout={handleLogout}
    >
      {currentView === 'dashboard' && <Dashboard entries={myCommissions} onNavigate={setCurrentView} isLoading={isLoading} />}
      
      {currentView === 'commissions' && (
        <CommissionList 
            user={user}
            entries={myCommissions} 
            teamEntries={teamCommissions}
            profiles={profiles}
            onUpdate={handleUpdateCommission} 
            onDelete={handleDeleteCommission}
            onAdd={handleAddCommission}
        />
      )}
      
      {currentView === 'upload' && <InvoiceUpload user={user} onReview={handleStartReview} onManualEntry={handleManualEntry} />}
      
      {currentView === 'review' && (
        <InvoiceReview 
            user={user} 
            file={reviewFile} 
            initialData={reviewData} 
            existingCommissions={commissions} 
            onSave={handleSaveCommission} 
            onCancel={handleCancelReview} 
            onFinish={handleReviewFinish}
        />
      )}
      
      {currentView === 'settings' && <Settings user={user} onUpdateUser={handleUpdateUser} />}
      
      {currentView === 'admin' && user.role === UserRole.ADMIN && (
          <AdminPanel 
            currentUser={user}
            profiles={profiles}
            teams={teams}
            allCommissions={commissions}
            onUpdateProfile={handleUpdateProfile}
            onAddTeam={handleAddTeam}
            onUpdateCommission={handleUpdateCommission}
            onDeleteCommission={handleDeleteCommission}
            onImpersonate={handleImpersonate}
          />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </Layout>
  );
};

export default App;