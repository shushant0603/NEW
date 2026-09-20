import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  RotateCw,
  Search,
  Bell,
  Calendar,
  Activity,
  User,
  Shield,
  Clock,
  LogOut,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { NAV_ITEMS } from './Sidebar';

export default function TopNavbar({
  activeTab,
  onRefresh,
  refreshing,
  health,
  setMobileOpen,
  latestMonthDisplay = 'Aug 2026',
  currentUser = null,
  onLogout = null,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef(null);
  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab);
  const pageTitle = currentNav ? currentNav.label : 'Dashboard';

  const userName = currentUser?.name || 'Gulshan Kumar';
  const userRole = currentUser?.role || 'Chief Actuary & ML Lead';
  const userEmail = currentUser?.email || 'admin@gulshan.in';
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E5E7EB] shadow-sm">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Drawer Trigger & Title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl text-[#6B7280] hover:text-[#0F2D64] hover:bg-[#F0F6FF] transition-colors"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center space-x-1.5 text-[11px] text-[#6B7280] font-medium">
              <span>SureInsight</span>
              <span>/</span>
              <span className="text-[#10B981] font-semibold">{pageTitle}</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-[#0F2D64] tracking-tight leading-tight">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Center: Search Input Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search policies, insights, metrics..."
              className="w-full pl-10 pr-4 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-xs text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F2D64]/20 focus:border-[#0F2D64] transition-all"
            />
          </div>
        </div>

        {/* Right: Date Range Picker, Live Data Badge, Notifications & Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Date Range Picker Badge */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#1F2937]">
            <Calendar className="w-3.5 h-3.5 text-[#0F2D64]" />
            <span>Jan 2016 – Aug 2026</span>
          </div>

          {/* Status Badge: Live Data */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#D1FAE5] text-[11px] font-bold text-[#047857]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span>Live Data</span>
          </div>

          {/* Refresh Data Button */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh Data & Predictions"
            className="p-2 rounded-xl bg-[#F8FAFC] hover:bg-[#E8F1FF] border border-[#E2E8F0] text-[#0F2D64] text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#10B981]' : ''}`} />
          </button>

          {/* Notification Bell Button */}
          <button
            title="Notifications"
            className="relative p-2 rounded-xl bg-[#F8FAFC] hover:bg-[#E8F1FF] border border-[#E2E8F0] text-[#0F2D64] transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full"></span>
          </button>

          {/* User Profile Avatar with Dropdown */}
          <div className="relative pl-2 border-l border-[#E5E7EB]" ref={menuRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F2D64] to-[#2563EB] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {userInitial}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-[#0F2D64] leading-tight flex items-center gap-1">
                  <span>{userName}</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </div>
                <div className="text-[10px] text-[#6B7280] font-medium mt-0.5 truncate max-w-[120px]">
                  {userRole}
                </div>
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E5E7EB] p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-3 border-b border-slate-100 bg-[#F8FAFC] rounded-xl mb-1.5">
                  <div className="text-xs font-bold text-[#0F2D64]">{userName}</div>
                  <div className="text-[11px] text-slate-500 truncate">{userEmail}</div>
                  <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB] text-[9px] font-bold mt-1.5 border border-[#BFDBFE]">
                    <Shield className="w-2.5 h-2.5" />
                    <span>{userRole}</span>
                  </div>
                </div>

                {onLogout && (
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
