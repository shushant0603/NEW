import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function FileUploadDropzone({ onUploadSuccess }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setErrorMsg('Only CSV datasets (.csv) are supported.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setUploading(true);
    setProgress(0);

    try {
      const res = await api.uploadDataset(file, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        setProgress(percent);
      });
      setSuccessMsg(res.message || `Successfully ingested and preprocessed ${file.name}`);
      if (onUploadSuccess) {
        onUploadSuccess(res);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to upload CSV';
      setErrorMsg(msg);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
        <div>
          <h3 className="text-sm font-bold text-[#0F2D64]">Ingest Custom Life Insurance CSV</h3>
          <p className="text-xs text-slate-500 font-medium">
            Upload custom IRDAI or monthly insurance performance datasets
          </p>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-[#2563EB] bg-[#F0F6FF]'
            : 'border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#2563EB] hover:bg-[#F0F6FF]/60'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFile(e.target.files?.[0])}
          accept=".csv"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3.5 rounded-full bg-[#F0F6FF] text-[#2563EB]">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>
          <div className="text-xs font-bold text-[#0F2D64]">
            {uploading ? 'Processing & Validating Schema...' : 'Click to Browse or Drag & Drop CSV here'}
          </div>
          <p className="text-[11px] text-slate-500 font-medium max-w-sm">
            Automatically detects monthly/year columns, insurer, category, premium (₹ Cr), and policy numbers.
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>Uploading & Preprocessing</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2563EB] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Messages */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-[#D1FAE5]/60 border border-[#10B981]/30 text-[#047857] text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}

