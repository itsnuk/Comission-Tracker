import React, { useState, useMemo } from 'react';
import { CommissionEntry, CommissionStatus, ViewState } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend 
} from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle2, DollarSign, Calendar, Filter, ArrowRight } from 'lucide-react';

interface DashboardProps {
  entries: CommissionEntry[];
  onNavigate: (view: ViewState) => void;
  isLoading?: boolean;
}

const COLORS = {
  paid: '#10b981', // emerald-500
  eligible: '#3b82f6', // blue-500
  unpaid: '#f59e0b', // amber-500
  text: '#64748b' // slate-500
};

const StatCard = ({ title, value, count, icon: Icon, colorClass, isLoading }: any) => {
  if (isLoading) {
    return <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-32 animate-pulse bg-slate-50" />;
  }
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between transition-all hover:shadow-md">
        <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        <p className="text-xs text-slate-400 mt-2 font-medium">{count} invoices</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClass}`}>
        <Icon className="w-6 h-6" />
        </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ entries, onNavigate, isLoading = false }) => {
  // Date State
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start, end };
  });

  const [periodLabel, setPeriodLabel] = useState('This Month');

  // Filter Helpers
  const setPeriod = (type: 'this_month' | 'last_month' | 'this_year' | 'all') => {
    const now = new Date();
    let start = '';
    let end = '';

    switch (type) {
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        setPeriodLabel('This Month');
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        setPeriodLabel('Last Month');
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
        setPeriodLabel('This Year');
        break;
      case 'all':
        start = '2000-01-01';
        end = '2099-12-31';
        setPeriodLabel('All Time');
        break;
    }
    setDateRange({ start, end });
  };

  // --- Data Processing ---
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      return e.invoice_month >= dateRange.start && e.invoice_month <= dateRange.end;
    });
  }, [entries, dateRange]);

  const kpiData = useMemo(() => {
    const summary = {
      total: { amount: 0, count: 0 },
      unpaid: { amount: 0, count: 0 },
      eligible: { amount: 0, count: 0 },
      paid: { amount: 0, count: 0 }
    };

    filteredEntries.forEach(e => {
      summary.total.amount += e.net_to_pay;
      summary.total.count += 1;

      if (e.commission_status === CommissionStatus.UNPAID) {
        summary.unpaid.amount += e.net_to_pay;
        summary.unpaid.count += 1;
      } else if (e.commission_status === CommissionStatus.ELIGIBLE) {
        summary.eligible.amount += e.net_to_pay;
        summary.eligible.count += 1;
      } else if (e.commission_status === CommissionStatus.PAID) {
        summary.paid.amount += e.net_to_pay;
        summary.paid.count += 1;
      }
    });

    return summary;
  }, [filteredEntries]);

  // Chart 1: Monthly Trend
  const monthlyData = useMemo(() => {
    const dataMap: Record<string, any> = {};
    
    // Sort chronologically first
    const sorted = [...filteredEntries].sort((a, b) => a.invoice_month.localeCompare(b.invoice_month));

    sorted.forEach(e => {
        const monthKey = e.invoice_month.substring(0, 7); // YYYY-MM
        const monthLabel = new Date(e.invoice_month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        if (!dataMap[monthKey]) {
            dataMap[monthKey] = { name: monthLabel, unpaid: 0, eligible: 0, paid: 0, fullDate: monthKey };
        }
        
        dataMap[monthKey][e.commission_status] += e.net_to_pay;
    });

    return Object.values(dataMap);
  }, [filteredEntries]);

  // Chart 2: Top Customers
  const customerData = useMemo(() => {
      const map: Record<string, number> = {};
      filteredEntries.forEach(e => {
          map[e.customer] = (map[e.customer] || 0) + e.net_to_pay;
      });
      
      return Object.entries(map)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
  }, [filteredEntries]);

  // Chart 3: Status Breakdown
  const statusData = useMemo(() => {
      return [
          { name: 'Paid', value: kpiData.paid.amount, color: COLORS.paid },
          { name: 'Eligible', value: kpiData.eligible.amount, color: COLORS.eligible },
          { name: 'Unpaid', value: kpiData.unpaid.amount, color: COLORS.unpaid },
      ].filter(d => d.value > 0);
  }, [kpiData]);

  // Format Helper
  const fmt = (n: number) => `฿${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (entries.length === 0 && !isLoading) {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-10 h-10 text-indigo-500" />
              </div>
              <div className="max-w-md">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">No commissions yet</h2>
                  <p className="text-slate-500">Upload your first invoice to start tracking your earnings and visualizing your data.</p>
              </div>
              <button 
                  onClick={() => onNavigate('upload')}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center"
              >
                  Upload First Invoice <ArrowRight className="w-5 h-5 ml-2" />
              </button>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Date Filter Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
             <div className="bg-indigo-50 p-2 rounded-lg">
                 <Calendar className="w-5 h-5 text-indigo-600" />
             </div>
             <div>
                 <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
                 <p className="text-xs text-slate-500">Showing data for: <span className="font-semibold text-indigo-600">{periodLabel}</span></p>
             </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            {['this_month', 'last_month', 'this_year', 'all'].map((p) => (
                <button
                    key={p}
                    onClick={() => setPeriod(p as any)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        (p === 'this_month' && periodLabel === 'This Month') ||
                        (p === 'last_month' && periodLabel === 'Last Month') ||
                        (p === 'this_year' && periodLabel === 'This Year') ||
                        (p === 'all' && periodLabel === 'All Time')
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    {p.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
            ))}
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-2 ml-2">
                <input 
                    type="date" 
                    className="px-2 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-700 accent-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={dateRange.start}
                    onChange={(e) => {
                        setDateRange(prev => ({ ...prev, start: e.target.value }));
                        setPeriodLabel('Custom Range');
                    }}
                />
                <span className="text-slate-400 text-xs">to</span>
                <input 
                    type="date" 
                    className="px-2 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-700 accent-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={dateRange.end}
                    onChange={(e) => {
                         setDateRange(prev => ({ ...prev, end: e.target.value }));
                         setPeriodLabel('Custom Range');
                    }}
                />
            </div>
        </div>
      </div>

      {/* KPI Cards - Stack vertically on mobile (grid-cols-1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Commission" 
          value={fmt(kpiData.total.amount)}
          count={kpiData.total.count}
          icon={TrendingUp}
          colorClass="bg-slate-100 text-slate-600"
          isLoading={isLoading}
        />
        <StatCard 
          title="Unpaid" 
          value={fmt(kpiData.unpaid.amount)}
          count={kpiData.unpaid.count}
          icon={AlertCircle}
          colorClass="bg-amber-50 text-amber-600"
          isLoading={isLoading}
        />
        <StatCard 
          title="Eligible" 
          value={fmt(kpiData.eligible.amount)}
          count={kpiData.eligible.count}
          icon={CheckCircle2}
          colorClass="bg-blue-50 text-blue-600"
          isLoading={isLoading}
        />
        <StatCard 
          title="Paid" 
          value={fmt(kpiData.paid.amount)}
          count={kpiData.paid.count}
          icon={DollarSign}
          colorClass="bg-emerald-50 text-emerald-600"
          isLoading={isLoading}
        />
      </div>

      {/* Main Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Monthly Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Commission Trend</h2>
            <div className="h-80">
                {isLoading ? <div className="w-full h-full bg-slate-50 animate-pulse rounded-lg" /> :
                monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: COLORS.text, fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: COLORS.text, fontSize: 12}} tickFormatter={(val) => `฿${val}`} />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [fmt(value), 'Amount']}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Bar dataKey="paid" stackId="a" fill={COLORS.paid} radius={[0, 0, 0, 0]} name="Paid" />
                            <Bar dataKey="eligible" stackId="a" fill={COLORS.eligible} radius={[0, 0, 0, 0]} name="Eligible" />
                            <Bar dataKey="unpaid" stackId="a" fill={COLORS.unpaid} radius={[4, 4, 0, 0]} name="Unpaid" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Filter className="w-8 h-8 mb-2 opacity-50" />
                        <p>No data for this period</p>
                    </div>
                )}
            </div>
        </div>

        {/* Chart 3: Status Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
             <h2 className="text-lg font-bold text-slate-900 mb-2">Status Breakdown</h2>
             <div className="flex-1 min-h-[300px]">
                 {isLoading ? <div className="w-full h-full bg-slate-50 animate-pulse rounded-lg" /> :
                 statusData.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [fmt(value), 'Amount']} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                     </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <p>No data</p>
                    </div>
                 )}
             </div>
        </div>

        {/* Chart 2: Top Customers */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <h2 className="text-lg font-bold text-slate-900 mb-6">Top Customers by Commission</h2>
             <div className="h-64">
                {isLoading ? <div className="w-full h-full bg-slate-50 animate-pulse rounded-lg" /> :
                customerData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={customerData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: COLORS.text, fontSize: 12}} tickFormatter={(val) => `฿${val}`} />
                            <YAxis dataKey="name" type="category" width={150} axisLine={false} tickLine={false} tick={{fill: '#334155', fontSize: 12, fontWeight: 500}} />
                            <Tooltip cursor={{fill: '#f8fafc'}} formatter={(value: number) => [fmt(value), 'Commission']} />
                            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        No data available
                    </div>
                )}
             </div>
        </div>

      </div>
    </div>
  );
};