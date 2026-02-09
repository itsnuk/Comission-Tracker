import React, { useState } from 'react';
import { Profile, Team, CommissionEntry, UserRole } from '../types';
import { CommissionList } from './CommissionList';
import { Users, Shield, LogIn, Activity, Server, CheckCircle2, AlertTriangle, XCircle, Clock, Database, Zap } from 'lucide-react';

interface AdminPanelProps {
  currentUser: Profile;
  profiles: Profile[];
  teams: Team[];
  allCommissions: CommissionEntry[];
  onUpdateProfile: (profile: Profile) => void;
  onAddTeam: (teamName: string) => void;
  onUpdateCommission: (entry: CommissionEntry) => void;
  onDeleteCommission: (id: string) => void;
  onImpersonate: (profile: Profile) => void;
}

type FeatureStatus = 'active' | 'broken' | 'in-progress' | 'disabled';

interface Feature {
  id: string;
  name: string;
  status: FeatureStatus;
  description: string;
}

const APP_FEATURES: Feature[] = [
  { id: '1', name: 'Google Authentication', status: 'active', description: 'User sign-in and session simulation.' },
  { id: '2', name: 'Gemini AI Parsing', status: 'active', description: 'Invoice extraction using Gemini 3 Flash Preview.' },
  { id: '3', name: 'Commission Engine', status: 'active', description: 'Automated VAT and Commission calculations.' },
  { id: '4', name: 'Receipt Tracking', status: 'active', description: 'Extraction and storage of receipt numbers.' },
  { id: '5', name: 'Excel Export', status: 'active', description: 'Export filtered data to .xlsx format.' },
  { id: '6', name: 'User Management', status: 'active', description: 'Role assignment and team structure.' },
  { id: '7', name: 'Cloud Storage', status: 'in-progress', description: 'Persistent file storage for PDFs (Currently Mocked).' },
  { id: '8', name: 'PDF Download', status: 'broken', description: 'Download original file (Mocked - Link not persistent).' },
  { id: '9', name: 'Email Notifications', status: 'disabled', description: 'Automated emails for payment status changes.' },
  { id: '10', name: 'Multi-Currency', status: 'in-progress', description: 'Real-time exchange rate conversion.' },
];

const StatusBadge = ({ status }: { status: FeatureStatus }) => {
    switch (status) {
        case 'active':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3 mr-1"/> Active</span>;
        case 'broken':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1"/> Broken</span>;
        case 'in-progress':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1"/> In Progress</span>;
        case 'disabled':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"><AlertTriangle className="w-3 h-3 mr-1"/> Disabled</span>;
    }
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  profiles,
  teams,
  allCommissions,
  onUpdateProfile,
  onAddTeam,
  onUpdateCommission,
  onDeleteCommission,
  onImpersonate
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'health'>('overview');
  const [newTeamName, setNewTeamName] = useState('');
  const [isAddingTeam, setIsAddingTeam] = useState(false);

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    const profile = profiles.find(p => p.id === userId);
    if (profile) {
      onUpdateProfile({ ...profile, role: newRole });
    }
  };

  const handleTeamChange = (userId: string, teamId: string) => {
    const profile = profiles.find(p => p.id === userId);
    if (profile) {
      onUpdateProfile({ ...profile, team_id: teamId || undefined });
    }
  };

  const handleAddTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeamName.trim()) {
      onAddTeam(newTeamName.trim());
      setNewTeamName('');
      setIsAddingTeam(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-indigo-600" />
                Admin Panel
            </h1>
            <p className="text-slate-500">System administration and monitoring.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Overview
            </button>
            <button
                onClick={() => setActiveTab('health')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'health' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Activity className="w-4 h-4" /> System Health
            </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-8">
            {/* User Management Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-500" /> User Management
                    </h2>
                    
                    <div className="flex items-center gap-2">
                        {isAddingTeam ? (
                            <form onSubmit={handleAddTeamSubmit} className="flex items-center gap-2">
                                <input 
                                    type="text"
                                    placeholder="Team Name"
                                    className="px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    autoFocus
                                />
                                <button type="submit" className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">Save</button>
                                <button type="button" onClick={() => setIsAddingTeam(false)} className="text-xs text-slate-500 hover:text-red-500">Cancel</button>
                            </form>
                        ) : (
                            <button 
                                onClick={() => setIsAddingTeam(true)}
                                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                            >
                                <Users className="w-4 h-4" /> New Team
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Team</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {profiles.map(profile => (
                                <tr key={profile.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-3 font-medium text-slate-900">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                                {profile.full_name.charAt(0)}
                                            </div>
                                            {profile.full_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-slate-500">{profile.email}</td>
                                    <td className="px-6 py-3">
                                        <select 
                                            value={profile.role}
                                            onChange={(e) => handleRoleChange(profile.id, e.target.value as UserRole)}
                                            className="bg-transparent border border-slate-200 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value={UserRole.USER}>User</option>
                                            <option value={UserRole.MANAGER}>Manager</option>
                                            <option value={UserRole.ADMIN}>Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-3">
                                        <select 
                                            value={profile.team_id || ''}
                                            onChange={(e) => handleTeamChange(profile.id, e.target.value)}
                                            className="bg-transparent border border-slate-200 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 outline-none w-32"
                                        >
                                            <option value="">No Team</option>
                                            {teams.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        {profile.id !== currentUser.id && (
                                            <button 
                                                type="button"
                                                onClick={() => onImpersonate(profile)}
                                                className="inline-flex items-center justify-center space-x-1 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm"
                                                title={`Log in as ${profile.full_name}`}
                                            >
                                                <LogIn className="w-3 h-3" />
                                                <span>Login as</span>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* All Commissions Section */}
            <div className="space-y-4">
                <CommissionList 
                    user={currentUser}
                    profiles={profiles}
                    entries={allCommissions}
                    allowUserFilter={true}
                    containerClassName="h-[600px]"
                    onUpdate={onUpdateCommission}
                    onDelete={onDeleteCommission}
                    onAdd={() => {}} 
                />
            </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* System Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">API Status (Gemini)</p>
                        <h3 className="text-2xl font-bold text-emerald-600">Operational</h3>
                        <p className="text-xs text-slate-400 mt-1">Latency: 240ms</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                        <Zap className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Database Sync</p>
                        <h3 className="text-2xl font-bold text-slate-900">Local Storage</h3>
                        <p className="text-xs text-slate-400 mt-1">Last synced: Just now</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                        <Database className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">System Uptime</p>
                        <h3 className="text-2xl font-bold text-slate-900">99.9%</h3>
                        <p className="text-xs text-slate-400 mt-1">Version v1.0.4</p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                        <Server className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Feature Status Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-slate-500" /> Feature Health & Roadmap
                    </h2>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 w-1/4">Feature Name</th>
                            <th className="px-6 py-3 w-1/6">Status</th>
                            <th className="px-6 py-3">Description / Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {APP_FEATURES.map((feature) => (
                            <tr key={feature.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-3 font-medium text-slate-900">
                                    {feature.name}
                                </td>
                                <td className="px-6 py-3">
                                    <StatusBadge status={feature.status} />
                                </td>
                                <td className="px-6 py-3 text-slate-500">
                                    {feature.description}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};