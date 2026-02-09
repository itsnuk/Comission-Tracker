import React, { useState, useMemo } from 'react';
import { CommissionEntry, CommissionStatus, Profile, UserRole } from '../types';
import { Search, Filter, Plus, FileText, Trash2, ArrowUpDown, Info, Calendar, X, Save, AlertTriangle, Download, Users, User, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';

interface CommissionListProps {
  user: Profile;
  entries: CommissionEntry[];
  teamEntries?: CommissionEntry[]; // For managers
  profiles?: Profile[]; // For admin user filter and name lookup
  allowUserFilter?: boolean; // For admin view
  readOnly?: boolean; // Can override to force read-only
  containerClassName?: string; // Allow overriding the container height/style
  onUpdate: (entry: CommissionEntry) => void;
  onDelete: (id: string) => void;
  onAdd: (entry: CommissionEntry) => void;
}

export const CommissionList: React.FC<CommissionListProps> = ({ 
    user, 
    entries, 
    teamEntries = [], 
    profiles = [],
    allowUserFilter = false,
    readOnly = false,
    containerClassName = "h-[calc(100vh-200px)]",
    onUpdate, 
    onDelete, 
    onAdd 
}) => {
  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'all'>('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof CommissionEntry; direction: 'asc' | 'desc' } | null>(null);
  
  // View Mode: 'personal' or 'team'. Only relevant if user is Manager.
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // New Entry State
  const [newEntry, setNewEntry] = useState<Partial<CommissionEntry>>({
    cost_before_vat: 0,
    tax: 0,
    commission_rate: user.default_commission_rate
  });

  // Validation State for inline edits
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({});

  // --- Determine Active Data Source ---
  const isViewReadOnly = readOnly || (user.role === UserRole.MANAGER && viewMode === 'team');
  const activeEntries = (user.role === UserRole.MANAGER && viewMode === 'team') ? teamEntries : entries;

  // --- Filtering & Sorting ---
  const filteredEntries = useMemo(() => {
    let result = [...activeEntries];

    // Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.customer.toLowerCase().includes(lower) || 
        e.invoice_number.toLowerCase().includes(lower) ||
        e.receipt_number?.toLowerCase().includes(lower) ||
        e.project.toLowerCase().includes(lower)
      );
    }
    // Status
    if (statusFilter !== 'all') {
      result = result.filter(e => e.commission_status === statusFilter);
    }
    // Month
    if (monthFilter) {
      result = result.filter(e => e.invoice_month.startsWith(monthFilter));
    }
    // User Filter (Admin only)
    if (allowUserFilter && userFilter !== 'all') {
        result = result.filter(e => e.user_id === userFilter);
    }

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === bValue) return 0;
        
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        const comparison = aValue < bValue ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [activeEntries, searchTerm, statusFilter, monthFilter, userFilter, sortConfig, allowUserFilter]);

  // --- Calculations ---
  const totals = useMemo(() => {
    return filteredEntries.reduce((acc, curr) => ({
      total: acc.total + curr.net_to_pay,
      unpaid: acc.unpaid + (curr.commission_status === CommissionStatus.UNPAID ? curr.net_to_pay : 0),
      eligible: acc.eligible + (curr.commission_status === CommissionStatus.ELIGIBLE ? curr.net_to_pay : 0),
      paid: acc.paid + (curr.commission_status === CommissionStatus.PAID ? curr.net_to_pay : 0),
    }), { total: 0, unpaid: 0, eligible: 0, paid: 0 });
  }, [filteredEntries]);


  // --- Handlers ---
  const handleSort = (key: keyof CommissionEntry) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const validateField = (field: keyof CommissionEntry, value: any): boolean => {
    if (field === 'amount_before_vat' && Number(value) < 0) return false;
    if (field === 'cost_before_vat' && Number(value) < 0) return false;
    if (field === 'commission_rate' && (Number(value) < 0 || Number(value) > 100)) return false;
    if (field === 'invoice_number' && (!value || value.trim() === '')) return false;
    return true;
  };

  const handleInlineUpdate = (id: string, field: keyof CommissionEntry, value: any) => {
    if (isViewReadOnly) return;

    // Validate
    const isValid = validateField(field, value);
    setInvalidFields(prev => ({...prev, [`${id}-${field}`]: !isValid}));
    
    // Even if invalid, we allow typing but show visual feedback (red border)
    // For critical failures (like empty ID), we might block, but for UX, let them fix it.

    const entry = activeEntries.find(e => e.id === id);
    if (!entry) return;

    let updatedValue = value;
    // Type coercion for numbers
    if (['amount_before_vat', 'cost_before_vat', 'commission_rate', 'tax'].includes(field)) {
      updatedValue = Number(value);
    }

    const updatedEntry = { ...entry, [field]: updatedValue };

    // 1. Status special logic (Paid -> ask for date)
    if (field === 'commission_status' && updatedValue === CommissionStatus.PAID && !entry.company_paid_date) {
      const date = window.prompt("Please enter the Company Paid Date (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));
      if (date) {
        onUpdate({ ...updatedEntry, company_paid_date: date });
        return;
      }
    }

    // 2. Date special logic (Date entered -> set Eligible if currently Unpaid)
    // This allows manual override back to Unpaid if the user explicitly chooses it later,
    // as this logic only runs when the date field itself is edited.
    if (field === 'client_paid_date' && updatedValue && entry.commission_status === CommissionStatus.UNPAID) {
        updatedEntry.commission_status = CommissionStatus.ELIGIBLE;
    }

    onUpdate(updatedEntry);
  };

  const handleDeleteClick = (id: string) => {
    if (isViewReadOnly) return;
    if (window.confirm("Delete this commission entry? This cannot be undone.")) {
      onDelete(id);
    }
  };

  const handleDownloadPdf = (fileName: string) => {
      // Mock download
      alert(`Downloading ${fileName}...`);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.invoice_number || !newEntry.amount_before_vat || !newEntry.invoice_month) {
      alert("Please fill in required fields");
      return;
    }

    // Check for duplicates (Verification Checklist: Manual entry with duplicate invoice_number → warning shown)
    if (activeEntries.some(e => e.invoice_number.toLowerCase() === newEntry.invoice_number?.toLowerCase())) {
        if (!window.confirm(`Invoice number "${newEntry.invoice_number}" already exists. Do you want to add it anyway?`)) {
            return;
        }
    }

    // Logic for new entry creation
    const amount = Number(newEntry.amount_before_vat);
    const cost = Number(newEntry.cost_before_vat) || 0;
    const rate = Number(newEntry.commission_rate) || user.default_commission_rate;
    const netTotal = amount - cost;
    const netToPay = netTotal * (rate / 100);

    const entry: CommissionEntry = {
      id: crypto.randomUUID(),
      user_id: user.id,
      invoice_number: newEntry.invoice_number!,
      receipt_number: newEntry.receipt_number,
      customer: newEntry.customer || 'Unknown',
      project: newEntry.project || '',
      amount_before_vat: amount,
      cost_before_vat: cost,
      commission_rate: rate,
      tax: Number(newEntry.tax) || 0,
      net_total: netTotal,
      net_to_pay: netToPay,
      invoice_month: newEntry.invoice_month!,
      commission_status: CommissionStatus.UNPAID,
      note: newEntry.note,
      file_name: newEntry.file_name // Mock file
    };

    onAdd(entry);
    setIsAddModalOpen(false);
    setNewEntry({ cost_before_vat: 0, tax: 0, commission_rate: user.default_commission_rate });
  };

  const handleExport = () => {
    if (filteredEntries.length === 0) return;
    if (filteredEntries.length > 5000) {
      alert("Export limited to 5,000 rows. Please filter your data.");
      return;
    }

    // Formatters
    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB') : ''; 
    const fmtMonth = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
    const getUserName = (id: string) => profiles.find(p => p.id === id)?.full_name || id;

    const data = filteredEntries.map(e => ({
      ...(allowUserFilter || viewMode === 'team' ? { "Freelancer": getUserName(e.user_id) } : {}),
      "Invoice Number": e.invoice_number,
      "Receipt Number": e.receipt_number || '',
      "Customer": e.customer,
      "Project": e.project,
      "Amount Before VAT": e.amount_before_vat,
      "Cost Before VAT": e.cost_before_vat,
      "Commission Rate (%)": e.commission_rate,
      "Net Total": e.net_total,
      "Net to Pay": e.net_to_pay,
      "Tax": e.tax,
      "Invoice Month": fmtMonth(e.invoice_month),
      "Client Paid Date": fmtDate(e.client_paid_date),
      "Status": e.commission_status,
      "Company Paid Date": fmtDate(e.company_paid_date),
      "Note": e.note || ''
    }));

    // Totals Row
    const totalsRow = {
      ...(allowUserFilter || viewMode === 'team' ? { "Freelancer": "" } : {}),
      "Invoice Number": "TOTALS",
      "Receipt Number": "",
      "Customer": "",
      "Project": "",
      "Amount Before VAT": filteredEntries.reduce((sum, e) => sum + e.amount_before_vat, 0),
      "Cost Before VAT": filteredEntries.reduce((sum, e) => sum + e.cost_before_vat, 0),
      "Commission Rate (%)": "",
      "Net Total": filteredEntries.reduce((sum, e) => sum + e.net_total, 0),
      "Net to Pay": filteredEntries.reduce((sum, e) => sum + e.net_to_pay, 0),
      "Tax": filteredEntries.reduce((sum, e) => sum + e.tax, 0),
      "Invoice Month": "",
      "Client Paid Date": "",
      "Status": "",
      "Company Paid Date": "",
      "Note": ""
    };
    data.push(totalsRow);

    // Create Worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Auto-width (simple estimation)
    const wscols = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length, 12) + 2 }));
    ws['!cols'] = wscols;

    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Commissions");

    // Filename
    const filename = monthFilter ? `Commissions_${monthFilter}.xlsx` : `Commissions_Export.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const getProfileName = (id: string) => profiles.find(p => p.id === id)?.full_name || 'Unknown';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    {allowUserFilter ? 'All Commissions' : 'Commissions Table'}
                </h1>
                <p className="text-slate-500 text-sm">
                    {allowUserFilter ? 'Admin view of all commission entries.' : 'View, edit, and manage all your commission records.'}
                </p>
            </div>
            
            {/* Manager Toggle */}
            {user.role === UserRole.MANAGER && !allowUserFilter && (
                <div className="bg-slate-100 p-1 rounded-lg flex space-x-1">
                    <button 
                        onClick={() => setViewMode('personal')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'personal' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        My Commissions
                    </button>
                    <button 
                        onClick={() => setViewMode('team')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'team' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Team Commissions
                    </button>
                </div>
            )}
        </div>
        
        {!isViewReadOnly && (
            <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center shadow-sm"
            >
            <Plus className="w-5 h-5 mr-1" /> Add Commission
            </button>
        )}
      </div>

      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col ${containerClassName}`}>
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Admin User Filter */}
          {allowUserFilter && (
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-slate-500" />
                <select 
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[150px]"
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                >
                    <option value="all">All Employees</option>
                    {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                </select>
              </div>
          )}

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input 
              type="month"
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select 
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CommissionStatus | 'all')}
            >
              <option value="all">All Statuses</option>
              <option value={CommissionStatus.UNPAID}>Unpaid</option>
              <option value={CommissionStatus.ELIGIBLE}>Eligible</option>
              <option value={CommissionStatus.PAID}>Paid</option>
            </select>
          </div>

          <button
              onClick={handleExport}
              disabled={filteredEntries.length === 0}
              className={`flex items-center space-x-2 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium transition-colors
                  ${filteredEntries.length === 0 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-indigo-600'
                  }`}
              title={filteredEntries.length === 0 ? "No entries to export" : "Export to Excel"}
          >
              <Download className="w-4 h-4" />
              <span>Export</span>
          </button>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto relative scrollbar-hide">
          {filteredEntries.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                <FileText className="w-12 h-12 opacity-20" />
                <p>No entries found.</p>
                {!isViewReadOnly && (
                    <button onClick={() => setIsAddModalOpen(true)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
                        Add one manually <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                )}
             </div>
          ) : (
          <table className="w-full text-left text-sm border-collapse min-w-[1200px]">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs sticky top-0 z-10 shadow-sm">
              <tr>
                {/* Conditionally add User Column */}
                {(allowUserFilter || viewMode === 'team') && (
                    <th className="px-4 py-3 border-b border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer w-32">
                        Freelancer
                    </th>
                )}
                {[
                  { key: 'invoice_month', label: 'Month', w: 'w-32' },
                  { key: 'invoice_number', label: 'Inv #', w: 'w-32' },
                  { key: 'customer', label: 'Customer', w: 'min-w-[150px]' },
                  { key: 'project', label: 'Project', w: 'min-w-[150px]' },
                  { key: 'amount_before_vat', label: 'Amt (฿)', w: 'w-28' },
                  { key: 'cost_before_vat', label: 'Cost (฿)', w: 'w-28' },
                  { key: 'commission_rate', label: 'Rate %', w: 'w-20' },
                  { key: 'net_total', label: 'Net (฿)', w: 'w-28' },
                  { key: 'net_to_pay', label: 'Pay (฿)', w: 'w-28' },
                  { key: 'client_paid_date', label: 'Client Pd', w: 'w-32' },
                  { key: 'receipt_number', label: 'Receipt #', w: 'w-32' },
                  { key: 'commission_status', label: 'Status', w: 'w-32' },
                  { key: 'company_paid_date', label: 'Comp Pd', w: 'w-32' },
                  { key: 'id', label: 'Actions', w: 'w-20' },
                ].map((col) => (
                  <th 
                    key={col.key} 
                    className={`px-4 py-3 border-b border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors ${col.w}`}
                    onClick={() => col.key !== 'id' && handleSort(col.key as keyof CommissionEntry)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{col.label}</span>
                      {col.key !== 'id' && <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-indigo-50/30 transition-colors group">
                   
                   {/* User Column (Read Only) */}
                   {(allowUserFilter || viewMode === 'team') && (
                        <td className="px-4 py-2 font-medium text-slate-700 truncate max-w-[150px]">
                            {getProfileName(entry.user_id)}
                        </td>
                   )}

                   {/* Date */}
                  <td className="px-4 py-2">
                    <input 
                      type="date" 
                      className={`bg-transparent w-full rounded px-1 -ml-1 ${isViewReadOnly ? 'cursor-default focus:ring-0' : 'focus:bg-white focus:ring-2 focus:ring-indigo-500'}`}
                      value={entry.invoice_month}
                      readOnly={isViewReadOnly}
                      onChange={(e) => handleInlineUpdate(entry.id, 'invoice_month', e.target.value)}
                    />
                  </td>
                  {/* Inv # */}
                  <td className="px-4 py-2">
                     <div className="flex items-center space-x-2">
                        {entry.file_name ? (
                            <button onClick={() => handleDownloadPdf(entry.file_name!)} title="Download PDF">
                                <FileText className="w-4 h-4 text-indigo-500 hover:text-indigo-700 flex-shrink-0 cursor-pointer" />
                            </button>
                        ) : (
                            <div className="w-4 h-4" />
                        )}
                        <input 
                            type="text" 
                            className={`bg-transparent w-full rounded px-1 -ml-1 font-medium text-slate-700 
                                ${isViewReadOnly ? 'cursor-default focus:ring-0' : 'focus:bg-white focus:ring-2 focus:ring-indigo-500'}
                                ${invalidFields[`${entry.id}-invoice_number`] ? 'border border-red-500 bg-red-50' : ''}`}
                            value={entry.invoice_number}
                            readOnly={isViewReadOnly}
                            onChange={(e) => handleInlineUpdate(entry.id, 'invoice_number', e.target.value)}
                        />
                     </div>
                  </td>
                  {/* Customer */}
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      className={`bg-transparent w-full rounded px-1 -ml-1 ${isViewReadOnly ? 'cursor-default focus:ring-0' : 'focus:bg-white focus:ring-2 focus:ring-indigo-500'}`}
                      value={entry.customer}
                      readOnly={isViewReadOnly}
                      onChange={(e) => handleInlineUpdate(entry.id, 'customer', e.target.value)}
                    />
                  </td>
                   {/* Project */}
                   <td className="px-4 py-2">
                    <input 
                      type="text" 
                      className={`bg-transparent w-full rounded px-1 -ml-1 ${isViewReadOnly ? 'cursor-default focus:ring-0' : 'focus:bg-white focus:ring-2 focus:ring-indigo-500'}`}
                      value={entry.project}
                      readOnly={isViewReadOnly}
                      onChange={(e) => handleInlineUpdate(entry.id, 'project', e.target.value)}
                    />
                  </td>
                  {/* Amount */}
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      className={`bg-transparent w-full rounded px-1 -ml-1 text-right 
                        ${isViewReadOnly ? 'cursor-default focus:ring-0' : 'focus:bg-white focus:ring-2 focus:ring-indigo-500'}
                        ${invalidFields[`${entry.id}-amount_before_vat`] ? 'border border-red-500 bg-red-50' : ''}`}
                      value={entry.amount_before_vat}
                      readOnly={isViewReadOnly}
                      onChange={(e) => handleInlineUpdate(entry.id, 'amount_before_vat', e.target.value)}
                    />
                  </td>
                  {/* Cost */}
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      className={`bg-transparent w-full rounded px-1 -ml-1 text-right text-amber-600 
                        ${isViewReadOnly ? 'cursor-default focus:ring-0' : 'focus:bg-white focus:ring-2 focus:ring-indigo-500'}
                        ${invalidFields[`${entry.id}-cost_before_vat`] ? 'border border-red-500 bg-red-50' : ''}`}
                      value={entry.cost_before_vat}
                      readOnly={isViewReadOnly}
                      onChange={(e) => handleInlineUpdate(entry.id, 'cost_before_vat', e.target.value)}
                    />
                  </td>
                  {/* Rate */}
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      className={`bg-transparent w-full rounded px-1 -ml-1 text-right 
                        ${isViewReadOnly ? 'cursor-default focus:ring-0' : 'focus:bg-white focus:ring-2 focus:ring-indigo-500'}
                        ${invalidFields[`${entry.id}-commission_rate`] ? 'border border-red-500 bg-red-50' : ''}`}
                      value={entry.commission_rate}
                      readOnly={isViewReadOnly}
                      onChange={(e) => handleInlineUpdate(entry.id, 'commission_rate', e.target.value)}
                    />
                  </td>
                  {/* Net Total (Read only) */}
                  <td className="px-4 py-2 text-right text-slate-500">
                    ฿{entry.net_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {/* Net Pay (Read only) */}
                  <td className="px-4 py-2 text-right font-bold text-indigo-600">
                    ฿{entry.net_to_pay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {/* Client Paid Date */}
                  <td className="px-4 py-2">
                    <input 
                      type="date" 
                      className={`bg-transparent w-full rounded px-1 -ml-1 text-xs text-slate-500 ${isViewReadOnly ? 'cursor-default focus:ring-0' : 'focus:bg-white focus:ring-2 focus:ring-indigo-500'}`}
                      value={entry.client_paid_date || ''}
                      readOnly={isViewReadOnly}
                      onChange={(e) => handleInlineUpdate(entry.id, 'client_paid_date', e.target.value)}
                    />
                  </td>
                  {/* Receipt # */}
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      className={`bg-transparent w-full rounded px-1 -ml-1 text-xs text-slate-700 ${isViewReadOnly ? 'cursor-default focus:ring-0' : 'focus:bg-white focus:ring-2 focus:ring-indigo-500'}`}
                      value={entry.receipt_number || ''}
                      placeholder="-"
                      readOnly={isViewReadOnly}
                      onChange={(e) => handleInlineUpdate(entry.id, 'receipt_number', e.target.value)}
                    />
                  </td>
                  {/* Status */}
                  <td className="px-4 py-2">
                    <select 
                        value={entry.commission_status}
                        onChange={(e) => handleInlineUpdate(entry.id, 'commission_status', e.target.value)}
                        disabled={isViewReadOnly}
                        className={`text-xs font-medium rounded-full px-2 py-1 border-0 focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed
                            ${entry.commission_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : ''}
                            ${entry.commission_status === 'eligible' ? 'bg-blue-100 text-blue-800' : ''}
                            ${entry.commission_status === 'unpaid' ? 'bg-slate-100 text-slate-800' : ''}
                        `}
                    >
                        <option value={CommissionStatus.UNPAID}>Unpaid</option>
                        <option value={CommissionStatus.ELIGIBLE}>Eligible</option>
                        <option value={CommissionStatus.PAID}>Paid</option>
                    </select>
                  </td>
                  {/* Comp Paid Date */}
                  <td className="px-4 py-2">
                    <input 
                      type="date" 
                      className={`bg-transparent w-full rounded px-1 -ml-1 text-xs text-slate-500 ${isViewReadOnly ? 'cursor-default focus:ring-0' : 'focus:bg-white focus:ring-2 focus:ring-indigo-500'}`}
                      value={entry.company_paid_date || ''}
                      readOnly={isViewReadOnly}
                      onChange={(e) => handleInlineUpdate(entry.id, 'company_paid_date', e.target.value)}
                    />
                  </td>
                   {/* Actions */}
                   <td className="px-4 py-2 text-center">
                    {!isViewReadOnly && (
                        <button onClick={() => handleDeleteClick(entry.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>

        {/* Totals Footer */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="flex justify-between items-center md:block">
                <span className="text-slate-500">Total Net to Pay</span>
                <p className="font-bold text-slate-900 text-lg">฿{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
             <div className="flex justify-between items-center md:block border-l border-slate-200 md:pl-4">
                <span className="text-slate-500">Unpaid</span>
                <p className="font-bold text-slate-700">฿{totals.unpaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
             <div className="flex justify-between items-center md:block border-l border-slate-200 md:pl-4">
                <span className="text-slate-500">Eligible</span>
                <p className="font-bold text-blue-600">฿{totals.eligible.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
             <div className="flex justify-between items-center md:block border-l border-slate-200 md:pl-4">
                <span className="text-slate-500">Paid</span>
                <p className="font-bold text-emerald-600">฿{totals.paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
        </div>
      </div>

      {/* Add Commission Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                      <h2 className="text-xl font-bold text-slate-900">Add Commission Entry</h2>
                      <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  
                  <form onSubmit={handleAddSubmit} className="space-y-4">
                      {/* ... (Existing form content same as before) ... */}
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Invoice Number *</label>
                              <input 
                                  type="text" 
                                  required
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                  value={newEntry.invoice_number || ''}
                                  onChange={(e) => setNewEntry({...newEntry, invoice_number: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Invoice Month *</label>
                              <input 
                                  type="date" 
                                  required
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                  value={newEntry.invoice_month || ''}
                                  onChange={(e) => setNewEntry({...newEntry, invoice_month: e.target.value})}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Receipt Number (Optional)</label>
                          <input 
                              type="text" 
                              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                              value={newEntry.receipt_number || ''}
                              onChange={(e) => setNewEntry({...newEntry, receipt_number: e.target.value})}
                              placeholder="e.g. TI2025xxxx"
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Customer</label>
                          <input 
                              type="text" 
                              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                              value={newEntry.customer || ''}
                              onChange={(e) => setNewEntry({...newEntry, customer: e.target.value})}
                          />
                      </div>

                       <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Project</label>
                          <input 
                              type="text" 
                              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                              value={newEntry.project || ''}
                              onChange={(e) => setNewEntry({...newEntry, project: e.target.value})}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Amount Before VAT (฿) *</label>
                              <input 
                                  type="number" 
                                  required
                                  step="0.01"
                                  min="0"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                  value={newEntry.amount_before_vat || ''}
                                  onChange={(e) => setNewEntry({...newEntry, amount_before_vat: Number(e.target.value)})}
                              />
                          </div>
                          <div>
                              <div className="flex items-center mb-1">
                                  <label className="block text-xs font-bold text-amber-700">Cost Before VAT (฿)</label>
                                  <div className="group relative ml-1">
                                      <Info className="w-3 h-3 text-amber-500" />
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-xs p-2 rounded hidden group-hover:block z-10">
                                          This is usually not on the invoice — enter it manually.
                                      </div>
                                  </div>
                              </div>
                              <input 
                                  type="number" 
                                  step="0.01"
                                  min="0"
                                  className="w-full px-3 py-2 border border-amber-300 bg-amber-50 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500"
                                  value={newEntry.cost_before_vat || 0}
                                  onChange={(e) => setNewEntry({...newEntry, cost_before_vat: Number(e.target.value)})}
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Commission Rate (%)</label>
                              <input 
                                  type="number" 
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                  value={newEntry.commission_rate || 0}
                                  onChange={(e) => setNewEntry({...newEntry, commission_rate: Number(e.target.value)})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Tax</label>
                              <input 
                                  type="number" 
                                  step="0.01"
                                  min="0"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                  value={newEntry.tax || 0}
                                  onChange={(e) => setNewEntry({...newEntry, tax: Number(e.target.value)})}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Note (Optional)</label>
                          <textarea 
                              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                              rows={2}
                              value={newEntry.note || ''}
                              onChange={(e) => setNewEntry({...newEntry, note: e.target.value})}
                          />
                      </div>
                      
                      <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100 mt-4">
                          <button 
                              type="button"
                              onClick={() => setIsAddModalOpen(false)}
                              className="px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                          >
                              Save Commission
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};