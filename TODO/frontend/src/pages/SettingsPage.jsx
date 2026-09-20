import React, { useState, useEffect } from 'react';
import {
  Settings,
  Activity,
  Database,
  Sliders,
  Cpu,
  ShieldCheck,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export default function SettingsPage({ health, onRefreshHealth }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const [dataSummary, setDataSummary] = useState(null);
  const [pingLatency, setPingLatency] = useState(null);
  const [testingPing, setTestingPing] = useState(false);

  useEffect(() => {
    fetchDataInfo();
    measureLatency();
  }, []);

  const fetchDataInfo = async () => {
    try {
      const s = await api.getDataSummary();
      setDataSummary(s);
    } catch (err) {
      console.error(err);
    }
  };

  const measureLatency = async () => {
    setTestingPing(true);
    const start = performance.now();
    try {
      await api.getHealth();
      const end = performance.now();
      setPingLatency(Math.round(end - start));
    } catch (err) {
      setPingLatency(null);
    } finally {
      setTestingPing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F2D64] bg-[#F0F6FF] px-2.5 py-1 rounded-full border border-[#BFDBFE]">
          Platform Architecture & Settings
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F2D64] mt-2">
          System Diagnostics & Engine Configurations
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
          Inspect backend service telemetry, time-series chronological partitioning parameters, and user display settings.
        </p>
      </div>

      {/* Grid: Service Telemetry & Display Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Telemetry Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-[#2563EB]" />
              <h3 className="text-sm font-bold text-[#0F2D64]">
                Backend API Telemetry
              </h3>
            </div>
            <button
              onClick={measureLatency}
              disabled={testingPing}
              className="text-xs text-[#2563EB] hover:text-[#0F2D64] font-bold flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingPing ? 'animate-spin' : ''}`} />
              <span>Ping API</span>
            </button>
          </div>

          <div className="space-y-3 text-xs font-medium">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
              <span className="text-slate-600">Service Status:</span>
              <span className="inline-flex items-center text-[#047857] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#10B981] mr-1.5 animate-pulse"></span>
                Operational (Healthy)
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
              <span className="text-slate-600">Roundtrip Latency:</span>
              <span className="font-mono font-bold text-[#0F2D64]">
                {pingLatency !== null ? `${pingLatency} ms` : 'Testing...'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
              <span className="text-slate-600">Active Dataset Path:</span>
              <span className="font-mono text-[11px] text-[#2563EB] font-bold truncate max-w-[200px]">
                {health?.data_source || 'life_insurance_nbp_consolidated.csv'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
              <span className="text-slate-600">Records Loaded:</span>
              <span className="font-mono font-bold text-[#0F2D64]">
                {health?.dataset_records?.toLocaleString() || '19,411'} Rows
              </span>
            </div>
          </div>
        </div>

        {/* Display & Interface Preferences */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-3">
            <Sliders className="w-5 h-5 text-[#0F2D64]" />
            <h3 className="text-sm font-bold text-[#0F2D64]">
              Theme & Display Preferences
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Theme Toggle Button */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-between">
              <div>
                <div className="font-bold text-[#0F2D64]">Interface Theme</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Currently active: <strong className="capitalize text-[#2563EB]">SureInsight Light Theme</strong>
                </div>
              </div>

              <button
                onClick={toggleTheme}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E5E7EB] text-xs font-bold text-[#0F2D64] transition-colors shadow-2xs cursor-pointer"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-[#2563EB]" />}
                <span>Toggle {isDark ? 'Light' : 'Dark'}</span>
              </button>
            </div>

            {/* Currency Convention Info */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-1">
              <div className="font-bold text-[#0F2D64]">Reporting Currency Units</div>
              <div className="text-[11px] text-slate-500 font-medium">
                New business premium values follow the statutory IRDAI standard formatted in <strong>₹ Crore</strong> (1 Cr = ₹10,000,000 INR).
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model & Chronological Splitting Configuration Card */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-3">
          <Cpu className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold text-[#0F2D64]">
            ML Time-Series Partitioning Configuration
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Training Horizon</span>
            <div className="text-sm font-bold text-[#0F2D64] mt-1">90 Months</div>
            <div className="text-[11px] text-slate-500 font-medium">Jan 2016 – Jun 2023 (70.3%)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#D1FAE5]/40 border border-[#10B981]/30">
            <span className="text-[10px] text-[#047857] uppercase font-bold">Validation Selection</span>
            <div className="text-sm font-bold text-[#047857] mt-1">19 Months</div>
            <div className="text-[11px] text-[#047857] font-semibold">Jul 2023 – Jan 2025 (14.8%)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F0F6FF] border border-[#BFDBFE]">
            <span className="text-[10px] text-[#1E40AF] uppercase font-bold">Untouched Test Holdout</span>
            <div className="text-sm font-bold text-[#2563EB] mt-1">19 Months</div>
            <div className="text-[11px] text-[#1E40AF] font-semibold">Feb 2025 – Aug 2026 (14.8%)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] text-amber-800 uppercase font-bold">Retrained Projection</span>
            <div className="text-sm font-bold text-amber-800 mt-1">24 Months</div>
            <div className="text-[11px] text-amber-800 font-semibold">Sep 2026 – Aug 2028 (100% Data)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

