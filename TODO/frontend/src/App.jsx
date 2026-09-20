import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import DashboardPage from './pages/DashboardPage';
import HistoricalAnalyticsPage from './pages/HistoricalAnalyticsPage';
import ForecastPage from './pages/ForecastPage';
import ModelEvaluationPage from './pages/ModelEvaluationPage';
import InsurerAnalysisPage from './pages/InsurerAnalysisPage';
import CategoryAnalysisPage from './pages/CategoryAnalysisPage';
import DataQualityPage from './pages/DataQualityPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import api from './services/api';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [metadata, setMetadata] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAppInitialData();
  }, []);

  const loadAppInitialData = async () => {
    setLoadingHealth(true);
    try {
      const [hRes, mRes] = await Promise.all([
        api.getHealth(),
        api.getMetadata(),
      ]);
      setHealth(hRes);
      setMetadata(mRes);
    } catch (err) {
      console.warn('Backend connection notice:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAppInitialData();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#F8FAFC] text-[#1F2937] transition-colors flex flex-col">
        {/* Collapsible Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          health={health}
        />

        {/* Main Content Area (Offset by sidebar width on desktop) */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ${
            collapsed ? 'lg:pl-20' : 'lg:pl-64'
          }`}
        >
          {/* Top Navigation Bar */}
          <TopNavbar
            activeTab={activeTab}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            health={health}
            setMobileOpen={setMobileOpen}
            latestMonthDisplay="Aug 2026"
          />

          {/* Page Content Container */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {activeTab === 'dashboard' && (
              <DashboardPage onNavigate={setActiveTab} />
            )}
            {activeTab === 'analytics' && (
              <HistoricalAnalyticsPage metadata={metadata} />
            )}
            {activeTab === 'forecasting' && (
              <ForecastPage metadata={metadata} />
            )}
            {activeTab === 'evaluation' && (
              <ModelEvaluationPage metadata={metadata} />
            )}
            {activeTab === 'insurers' && (
              <InsurerAnalysisPage metadata={metadata} />
            )}
            {activeTab === 'categories' && (
              <CategoryAnalysisPage metadata={metadata} />
            )}
            {activeTab === 'quality' && (
              <DataQualityPage metadata={metadata} onRefreshMetadata={loadAppInitialData} />
            )}
            {activeTab === 'reports' && (
              <ReportsPage />
            )}
            {activeTab === 'settings' && (
              <SettingsPage health={health} onRefreshHealth={loadAppInitialData} />
            )}
          </main>

          {/* Footer */}
          <footer className="border-t border-[#E5E7EB] py-6 mt-8 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B7280] gap-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                <span className="font-semibold text-[#0F2D64]">
                  Insurance Analytics Intelligence Platform
                </span>
                <span>• 128 Months Verified IRDAI Dataset (2016–2026)</span>
              </div>

              <div className="flex items-center space-x-3">
                <span>3-Way Chronological Partitioning</span>
                <span>•</span>
                <span>24-Month Out-of-Sample Forecast</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </ThemeProvider>
  );
}
