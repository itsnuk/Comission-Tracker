import React, { useState } from 'react';
import { Profile } from '../types';
import { Save, User } from 'lucide-react';

interface SettingsProps {
  user: Profile;
  onUpdateUser: (updatedUser: Profile) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser }) => {
  const [name, setName] = useState(user.full_name);
  const [rate, setRate] = useState(user.default_commission_rate);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
        ...user,
        full_name: name,
        default_commission_rate: rate
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

       <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
           <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Profile Read Only */}
                <div className="flex items-center space-x-4 pb-6 border-b border-slate-100">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-xl text-slate-500 font-bold">
                        {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover"/> : name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-slate-900">Profile Details</h3>
                        <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Default Commission Rate (%)</label>
                    <p className="text-xs text-slate-500 mb-2">This percentage will be pre-filled for new invoice entries.</p>
                    <input 
                        type="number" 
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        value={rate}
                        onChange={(e) => setRate(Number(e.target.value))}
                    />
                </div>

                <div className="pt-4 flex items-center justify-between">
                     {isSaved ? (
                        <span className="text-emerald-600 text-sm flex items-center font-medium">
                            <Save className="w-4 h-4 mr-2" />
                            Changes saved successfully!
                        </span>
                     ) : <span></span>}
                     
                     <button 
                        type="submit"
                        className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                     >
                        Save Preferences
                     </button>
                </div>
           </form>
       </div>
    </div>
  );
};