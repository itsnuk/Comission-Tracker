import React, { useState, useEffect } from 'react';
import { CommissionEntry, Profile, CommissionStatus } from '../types';
import { FileText, Save, ArrowLeft, AlertTriangle, CheckCircle, Info, ExternalLink, RefreshCw, Download, Receipt } from 'lucide-react';

interface InvoiceReviewProps {
  user: Profile;
  file: File | null;
  initialData: any;
  existingCommissions: CommissionEntry[];
  onSave: (entry: CommissionEntry) => void;
  onCancel: () => void;
  onFinish: () => void;
}

// Approximate exchange rates for demo purposes
const EXCHANGE_RATES: Record<string, number> = {
    'USD': 34.5,
    'EUR': 37.5,
    'GBP': 43.8,
    'JPY': 0.23,
    'AUD': 22.5,
    'SGD': 25.6,
    'CNY': 4.8,
    'THB': 1
};

export const InvoiceReview: React.FC<InvoiceReviewProps> = ({ 
  user, 
  file, 
  initialData, 
  existingCommissions, 
  onSave, 
  onCancel,
  onFinish 
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'cost_empty' | 'duplicate';
    index: number;
    message: string;
    primaryAction: string;
    secondaryAction: string;
  } | null>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  useEffect(() => {
    if (initialData) {
      // Handle both single object and array responses
      const dataArray = Array.isArray(initialData) ? initialData : [initialData];
      
      const mappedItems = dataArray.map(item => {
        // Default to first day of current month if date parsing fails or is missing
        let dateStr = new Date().toISOString().slice(0, 8) + '01'; 
        let rawDate = item.invoice_date || new Date().toISOString().slice(0, 10);

        if (item.invoice_date) {
            try {
                const d = new Date(item.invoice_date);
                if (!isNaN(d.getTime())) {
                    dateStr = d.toISOString().slice(0, 8) + '01';
                }
            } catch (e) {}
        }

        let amount = item.amount_before_vat ? Number(item.amount_before_vat) : 0;
        const currencyCode = (item.currency_code || 'THB').toUpperCase();
        let conversionInfo = null;

        // Auto Convert if not THB
        if (currencyCode !== 'THB' && amount > 0) {
            const rate = EXCHANGE_RATES[currencyCode];
            if (rate) {
                const originalAmount = amount;
                amount = Number((amount * rate).toFixed(2));
                conversionInfo = {
                    originalCurrency: currencyCode,
                    originalAmount: originalAmount,
                    rate: rate
                };
            }
        }

        return {
            invoice_number: item.invoice_number || '',
            receipt_number: item.receipt_number || null,
            customer: item.customer || '',
            amount_before_vat: amount,
            project: item.project_description || '',
            invoice_month: dateStr,
            client_paid_date: item.receipt_number ? rawDate : undefined, // Set paid date if receipt exists
            commission_rate: user.default_commission_rate,
            cost_before_vat: '', // Always blank initially
            tax: 0,
            conversionInfo // Store conversion info to display to user
        };
      });
      setItems(mappedItems);
    }
  }, [initialData, user.default_commission_rate]);

  const handleChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSaveClick = (index: number) => {
    const item = items[index];
    
    // 1. Check Cost Empty
    if (item.cost_before_vat === '' || item.cost_before_vat === undefined) {
      setModalConfig({
        isOpen: true,
        type: 'cost_empty',
        index,
        message: 'Cost before VAT is empty. Set to 0?',
        primaryAction: 'Yes, set to 0',
        secondaryAction: 'Cancel'
      });
      return;
    }

    proceedWithDuplicateCheck(index);
  };

  const proceedWithDuplicateCheck = (index: number) => {
    const item = items[index];
    
    // 2. Check Duplicate
    const isDuplicate = existingCommissions.some(
      c => c.invoice_number.toLowerCase() === item.invoice_number.toLowerCase() && c.user_id === user.id
    );

    if (isDuplicate) {
      setModalConfig({
        isOpen: true,
        type: 'duplicate',
        index,
        message: `Invoice ${item.invoice_number} already exists. Add anyway?`,
        primaryAction: 'Add Duplicate',
        secondaryAction: 'Cancel'
      });
      return;
    }

    finalizeSave(index);
  };

  const finalizeSave = (index: number) => {
    const item = items[index];
    const cost = item.cost_before_vat === '' ? 0 : Number(item.cost_before_vat);
    const amount = Number(item.amount_before_vat);
    const rate = Number(item.commission_rate);
    
    // Backend computation simulation
    const netTotal = amount - cost;
    const netToPay = netTotal * (rate / 100);

    const newEntry: CommissionEntry = {
      id: crypto.randomUUID(),
      user_id: user.id,
      invoice_number: item.invoice_number,
      receipt_number: item.receipt_number || undefined,
      customer: item.customer,
      project: item.project,
      amount_before_vat: amount,
      cost_before_vat: cost,
      commission_rate: rate,
      tax: Number(item.tax) || 0,
      net_total: netTotal,
      net_to_pay: netToPay,
      invoice_month: item.invoice_month,
      // Logic: If receipt detected, set as Eligible (Client Paid), else Unpaid
      client_paid_date: item.client_paid_date,
      commission_status: item.client_paid_date ? CommissionStatus.ELIGIBLE : CommissionStatus.UNPAID,
      file_name: file?.name,
    };

    onSave(newEntry);
    setSavedIds(prev => new Set(prev).add(index));
    setModalConfig(null);
    
    // Update the item state to reflect the 0 cost if it was auto-set
    if (item.cost_before_vat === '') {
        handleChange(index, 'cost_before_vat', 0);
    }

    // Show Toast
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleModalConfirm = () => {
    if (!modalConfig) return;
    if (modalConfig.type === 'cost_empty') {
       setModalConfig(null);
       proceedWithDuplicateCheck(modalConfig.index);
    } else if (modalConfig.type === 'duplicate') {
       finalizeSave(modalConfig.index);
    }
  };

  const handleDownloadPdf = () => {
      if (file) {
          const url = URL.createObjectURL(file);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      }
  };

  const allSaved = items.length > 0 && items.length === savedIds.size;

  return (
    <div className="h-full flex flex-col md:h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 px-1 gap-4">
        <div className="flex items-center space-x-4">
            <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Review Invoice</h1>
                <p className="text-slate-500 text-sm">Review extracted data and enter missing costs.</p>
            </div>
        </div>
        {allSaved && (
            <button 
                onClick={onFinish}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-sm flex items-center animate-pulse w-full md:w-auto justify-center"
            >
                Go to Commissions <ExternalLink className="w-4 h-4 ml-2" />
            </button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0 overflow-auto md:overflow-hidden pb-8 md:pb-0">
        {/* Left: PDF Preview */}
        <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg flex flex-col h-[500px] md:h-full">
            <div className="bg-slate-900 px-4 py-2 flex items-center justify-between flex-shrink-0">
                <span className="text-slate-300 text-sm font-medium flex items-center truncate">
                    <FileText className="w-4 h-4 mr-2" />
                    {file?.name}
                </span>
                <button 
                    onClick={handleDownloadPdf}
                    className="text-slate-400 hover:text-white flex items-center text-xs ml-4"
                >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                </button>
            </div>
            <div className="flex-1 bg-slate-100 relative overflow-hidden">
                {previewUrl ? (
                    <iframe 
                        src={previewUrl} 
                        className="w-full h-full" 
                        title="PDF Preview"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        No preview available
                    </div>
                )}
            </div>
        </div>

        {/* Right: Forms List */}
        <div className="md:overflow-y-auto pr-2 pb-10 space-y-6">
            {items.map((item, index) => {
                const isSaved = savedIds.has(index);
                return (
                    <div 
                        key={index} 
                        className={`bg-white rounded-xl shadow-sm border transition-all duration-200 
                            ${isSaved ? 'border-emerald-200 bg-slate-50 opacity-75' : 'border-slate-200'}`}
                    >
                        {/* Card Header */}
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                            <h3 className="font-bold text-slate-700 flex items-center">
                                Line Item #{index + 1}
                                {isSaved && <span className="ml-2 text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Saved</span>}
                            </h3>
                        </div>

                        {/* Card Body */}
                        <div className={`p-6 space-y-4 ${isSaved ? 'pointer-events-none grayscale-[0.5]' : ''}`}>
                            
                            {/* Receipt Detected Alert */}
                            {item.receipt_number && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-3 text-sm text-emerald-800 mb-2">
                                    <Receipt className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium">Receipt Found: {item.receipt_number}</p>
                                        <p className="text-xs mt-0.5 opacity-80">
                                            Status set to <strong>Paid by Client</strong>. Paid Date: {item.client_paid_date}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Conversion Alert */}
                            {item.conversionInfo && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3 text-sm text-blue-800 mb-2">
                                    <RefreshCw className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium">Auto-converted from {item.conversionInfo.originalCurrency}</p>
                                        <p className="text-xs mt-0.5 opacity-80">
                                            Original: {item.conversionInfo.originalAmount.toFixed(2)} {item.conversionInfo.originalCurrency} × {item.conversionInfo.rate} = ฿{item.amount_before_vat}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Invoice Number</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-slate-50 text-slate-700"
                                        value={item.invoice_number}
                                        onChange={(e) => handleChange(index, 'invoice_number', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Invoice Month (YYYY-MM-01)</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-slate-50 text-slate-700"
                                        value={item.invoice_month}
                                        onChange={(e) => handleChange(index, 'invoice_month', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Customer</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-slate-50 text-slate-700"
                                    value={item.customer}
                                    onChange={(e) => handleChange(index, 'customer', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Project</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-slate-50 text-slate-700"
                                    value={item.project}
                                    onChange={(e) => handleChange(index, 'project', e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Amount (Ex. VAT) in THB</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">฿</span>
                                        <input 
                                            type="number" 
                                            className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-md text-sm bg-slate-50 text-slate-700"
                                            value={item.amount_before_vat}
                                            onChange={(e) => handleChange(index, 'amount_before_vat', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Tax</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">฿</span>
                                        <input 
                                            type="number" 
                                            className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-md text-sm bg-slate-50 text-slate-700"
                                            value={item.tax}
                                            onChange={(e) => handleChange(index, 'tax', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center mb-1">
                                        <label className="block text-xs font-bold text-amber-700">Cost (Ex. VAT) in THB</label>
                                        <div className="group relative ml-1">
                                            <Info className="w-3 h-3 text-amber-500 cursor-help" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-xs p-2 rounded hidden group-hover:block z-10">
                                                This is usually not on the invoice — enter it manually.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 font-medium">฿</span>
                                        <input 
                                            type="number" 
                                            placeholder="0.00"
                                            className="w-full pl-7 pr-3 py-2 border border-amber-300 rounded-md text-sm bg-amber-50 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-900 font-medium placeholder-amber-300/50"
                                            value={item.cost_before_vat}
                                            onChange={(e) => handleChange(index, 'cost_before_vat', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Commission Rate (%)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-slate-50 text-slate-700"
                                        value={item.commission_rate}
                                        onChange={(e) => handleChange(index, 'commission_rate', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Card Footer */}
                        {!isSaved && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end">
                                <button 
                                    onClick={() => handleSaveClick(index)}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center shadow-sm"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Add to Commissions
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {modalConfig && modalConfig.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center mb-4 text-amber-600">
                    <AlertTriangle className="w-6 h-6 mr-2" />
                    <h3 className="text-lg font-bold">Warning</h3>
                </div>
                <p className="text-slate-600 mb-6">{modalConfig.message}</p>
                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={() => setModalConfig(null)}
                        className="px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-100 transition-colors"
                    >
                        {modalConfig.secondaryAction}
                    </button>
                    <button 
                        onClick={handleModalConfirm}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        {modalConfig.primaryAction}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Success Toast */}
      {showToast && (
          <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Commission added successfully!</span>
          </div>
      )}
    </div>
  );
};