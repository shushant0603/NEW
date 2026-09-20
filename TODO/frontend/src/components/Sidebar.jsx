import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Sparkles,
  Scale,
  Building2,
  Layers,
  ShieldCheck,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  CheckCircle2,
  X
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { id: 'analytics', label: 'Historical Analytics', icon: TrendingUp, badge: '128m' },
  { id: 'forecasting', label: 'Forecasting', icon: Sparkles, badge: '24m' },
  { id: 'evaluation', label: 'Model Evaluation', icon: Scale, badge: null },
  { id: 'insurers', label: 'Insurer Analysis', icon: Building2, badge: null },
  { id: 'categories', label: 'Category Analysis', icon: Layers, badge: null },
  { id: 'quality', label: 'Data Quality', icon: ShieldCheck, badge: 'Audit' },
  { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet, badge: null },
  { id: 'settings', label: 'Settings', icon: Settings, badge: null },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  health,
}) {
  const handleNavClick = (id) => {
    setActiveTab(id);
    if (mobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-[#E5E7EB] shadow-sm transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#E5E7EB] bg-white">
          <div
            className="flex items-center space-x-3 cursor-pointer overflow-hidden"
            onClick={() => handleNavClick('dashboard')}
          >
            {/* SureInsight Logo Badge */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#10B981] via-[#059669] to-[#2563EB] flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/15">
              <Shield className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <div className="font-extrabold text-base text-[#0F2D64] tracking-tight leading-tight flex items-center gap-1">
                  Sure<span className="text-[#10B981]">Insight</span>
                </div>
                <div className="text-[11px] text-[#6B7280] font-medium tracking-wide">
                  Insurance Analytics
                </div>
              </div>
            )}
          </div>

          {/* Close button for Mobile Drawer */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#0F2D64] hover:bg-[#F0F6FF] lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 bg-[#F8FAFC]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-0' : 'justify-between px-3.5'
                } py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-[#0F2D64] text-white shadow-md shadow-blue-950/20'
                    : 'text-[#4B5563] hover:text-[#0F2D64] hover:bg-[#E8F1FF]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-[#10B981]' : 'text-[#6B7280] group-hover:text-[#0F2D64]'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!collapsed && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#10B981] text-white'
                        : 'bg-[#E5E7EB] text-[#4B5563]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Collapsed Tooltip Indicator */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F2D64] text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Dataset Status & Collapse Toggle */}
        <div className="p-3 border-t border-[#E5E7EB] bg-white space-y-2">
          {!collapsed && (
            <div className="p-3 rounded-xl bg-[#F0F6FF] border border-[#D1E4FF] text-[11px]">
              <div className="flex items-center justify-between text-[#4B5563]">
                <span className="font-bold uppercase tracking-wider text-[10px] text-[#0F2D64]">Dataset Status</span>
                <span className="inline-flex items-center text-[#10B981] font-extrabold bg-[#D1FAE5] px-2 py-0.5 rounded-full text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] mr-1 animate-pulse"></span>
                  Live Data
                </span>
              </div>
              <div className="text-[#0F2D64] font-bold mt-1.5 text-xs">
                Jan 2016 – Aug 2026
              </div>
              <div className="text-[10px] text-[#6B7280] mt-0.5 font-medium">
                128 Monthly IRDAI Filings
              </div>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center py-2 rounded-xl text-[#6B7280] hover:text-[#0F2D64] hover:bg-[#F0F6FF] transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center space-x-2 text-xs font-medium">
                <ChevronLeft className="w-4 h-4" />
               
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
