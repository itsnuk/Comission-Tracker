import React, { useState } from 'react';
import { Upload, X, Loader2, AlertCircle, FileText, CheckCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { extractInvoiceData } from '../services/geminiService';
import { UploadItem, Profile } from '../types';

interface InvoiceUploadProps {
  user: Profile;
  onReview: (file: File, extractedData: any) => void;
  onManualEntry: () => void;
}

export const InvoiceUpload: React.FC<InvoiceUploadProps> = ({ user, onReview, onManualEntry }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = (files: FileList | File[]) => {
    const newItems: UploadItem[] = Array.from(files)
      .slice(0, 5 - queue.length) // Limit to 5 total including existing
      .filter(file => file.type === 'application/pdf')
      .map(file => ({
        id: crypto.randomUUID(),
        file,
        status: 'uploading',
        progress: 0
      }));
    
    if (newItems.length === 0) {
        if (Array.from(files).some(f => f.type !== 'application/pdf')) {
            alert("Only PDF files are supported.");
        }
        return;
    }

    setQueue(prev => [...prev, ...newItems]);

    // Start processing each new item
    newItems.forEach(item => startUploadAndParse(item));
  };

  const startUploadAndParse = async (item: UploadItem) => {
    // 1. Simulate Upload Progress (Save to "Base44")
    for (let i = 10; i <= 100; i += 10) {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: i } : q));
        await new Promise(r => setTimeout(r, 200)); // Simulate network lag
    }

    setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'parsing', progress: 100 } : q));

    // 2. Parse Invoice (Call Backend Function / Gemini)
    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64String = e.target?.result as string;
            // Strip data:application/pdf;base64,
            const base64Data = base64String.split(',')[1];
            
            try {
                const extracted = await extractInvoiceData(base64Data, item.file.type);
                
                if (!extracted || extracted.error) {
                     throw new Error("unreadable");
                }

                setQueue(prev => prev.map(q => q.id === item.id ? { 
                    ...q, 
                    status: 'ready', 
                    extractedData: extracted 
                } : q));

            } catch (err: any) {
                const isUnreadable = err.message === "unreadable" || err.message?.includes("Timeout");
                setQueue(prev => prev.map(q => q.id === item.id ? { 
                    ...q, 
                    status: 'error', 
                    errorMessage: isUnreadable ? "Could not read this PDF" : "Extraction failed"
                } : q));
            }
        };
        reader.readAsDataURL(item.file);

    } catch (err) {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', errorMessage: "File reading failed" } : q));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
        processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removeQueueItem = (id: string) => {
      setQueue(prev => prev.filter(i => i.id !== id));
  };

  const retryItem = (id: string) => {
      const item = queue.find(i => i.id === id);
      if (item) {
          // Reset and restart
          setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'uploading', progress: 0, errorMessage: undefined } : q));
          startUploadAndParse(item);
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Upload Invoices</h1>
        <button 
            onClick={onManualEntry}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
            Skip to Manual Entry &rarr;
        </button>
      </div>

      <div className="space-y-6">
        {/* Drop Zone */}
        <div 
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer bg-white
              ${isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <input 
              type="file" 
              id="fileInput" 
              className="hidden" 
              accept="application/pdf" 
              multiple
              onChange={handleFileSelect} 
          />
          
          <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-7 h-7 text-indigo-600" />
          </div>
          <h3 className="text-xl font-medium text-slate-900 mb-1">Drop PDF invoices here</h3>
          <p className="text-slate-500 text-sm">or click to browse files</p>
          <p className="text-xs text-slate-400 mt-4 font-mono bg-slate-100 px-2 py-1 rounded">Supports PDF only • Max 5 files</p>
        </div>

        {/* Queue List */}
        {queue.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-medium text-slate-900">Upload Queue ({queue.length}/5)</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {queue.map(item => (
                        <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                            {/* Icon */}
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                                ${item.status === 'ready' ? 'bg-emerald-100 text-emerald-600' : 
                                  item.status === 'error' ? 'bg-red-100 text-red-600' : 
                                  'bg-blue-100 text-blue-600'}`}>
                                {item.status === 'ready' ? <CheckCircle className="w-5 h-5" /> : 
                                 item.status === 'error' ? <AlertCircle className="w-5 h-5" /> :
                                 <FileText className="w-5 h-5" />}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between mb-1">
                                    <span className="font-medium text-slate-900 truncate">{item.file.name}</span>
                                    <span className={`text-xs font-medium capitalize 
                                        ${item.status === 'ready' ? 'text-emerald-600' : 
                                          item.status === 'error' ? 'text-red-600' : 'text-slate-500'}`}>
                                        {item.status === 'parsing' ? 'Extracting invoice data...' : 
                                         item.status === 'uploading' ? 'Uploading...' : 
                                         item.status}
                                    </span>
                                </div>
                                
                                {/* Progress Bar / Error Message */}
                                {item.status === 'error' ? (
                                    <div className="flex items-center text-xs text-red-500">
                                        {item.errorMessage || "Error processing file"}
                                        <span className="mx-2">•</span>
                                        <button 
                                            onClick={() => retryItem(item.id)}
                                            className="font-medium hover:underline flex items-center mr-3"
                                        >
                                            <RefreshCw className="w-3 h-3 mr-1" /> Retry
                                        </button>
                                        <button 
                                            onClick={onManualEntry}
                                            className="font-medium hover:underline"
                                        >
                                            Enter Manually
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-300 rounded-full ${item.status === 'ready' ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                            style={{ width: `${item.progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Action Button */}
                            <div className="flex items-center gap-2">
                                {item.status === 'ready' && (
                                    <button 
                                        onClick={() => onReview(item.file, item.extractedData)}
                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center shadow-sm"
                                    >
                                        Review <ArrowRight className="w-4 h-4 ml-1" />
                                    </button>
                                )}
                                <button 
                                    onClick={() => removeQueueItem(item.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};