import React, { useState } from 'react';
import { Button } from './ui/button';
import { DashboardOverview } from './DashboardOverview';
import { OrganizationsPage } from './OrganizationsPage';
import { OrganizationDetailPage } from './OrganizationDetailPage';
import { DevicesPage } from './DevicesPage';
import { TechniciansPage } from './TechniciansPage';
import { MaintenancePage } from './MaintenancePage';
import { GenerateQRPage } from './GenerateQRPage';
import { LayoutDashboard, Building2, Wrench, ClipboardList, LogOut } from 'lucide-react';
import { WaterDispenser } from './icons/WaterDispenser';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface DashboardProps {
  token: string;
  user: any;
  onLogout: () => void;
}

type TabType = 'overview' | 'organizations' | 'devices' | 'technicians' | 'maintenance' | 'generate-qrs';

export const Dashboard: React.FC<DashboardProps> = ({ token, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'organizations' as TabType, label: 'Organizations', icon: Building2 },
    { id: 'devices' as TabType, label: 'Devices', icon: WaterDispenser },
    { id: 'technicians' as TabType, label: 'Technicians', icon: Wrench },
    { id: 'maintenance' as TabType, label: 'Maintenance', icon: ClipboardList },
    { id: 'generate-qrs' as TabType, label: 'Generate QR', icon: ClipboardList },
  ];

  const handleOrganizationClick = (organizationId: string) => {
    setSelectedOrganizationId(organizationId);
  };

  const handleBackToOrganizations = () => {
    setSelectedOrganizationId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ImageWithFallback
                src="/brand-logo.png"
                alt="Brand Logo"
                className="w-10 h-10 rounded-md object-contain border border-gray-200 bg-white"
              />
              <div>
                <h1 className="text-slate-900">
                  NPA Water Dispensers
                </h1>
                <p className="text-xs text-slate-500">ADMIN PANEL</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm text-slate-900">{user?.user_metadata?.name || 'Admin'}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>
              <Button
                variant="destructive-outline"
                size="sm"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedOrganizationId(null);
                  }}
                  className={`
                    flex items-center gap-2 py-3 px-5 border-b-2 transition-all whitespace-nowrap text-sm
                    ${activeTab === tab.id
                      ? 'border-slate-900 text-slate-900 bg-slate-50'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <DashboardOverview token={token} onNavigate={setActiveTab} user={user} />}
        {activeTab === 'organizations' && (
          selectedOrganizationId ? (
            <OrganizationDetailPage 
              token={token} 
              organizationId={selectedOrganizationId}
              onBack={handleBackToOrganizations}
            />
          ) : (
            <OrganizationsPage 
              token={token} 
              onOrganizationClick={handleOrganizationClick}
            />
          )
        )}
        {activeTab === 'devices' && <DevicesPage token={token} />}
        {activeTab === 'technicians' && <TechniciansPage token={token} />}
        {activeTab === 'maintenance' && <MaintenancePage token={token} />}
        {activeTab === 'generate-qrs' && <GenerateQRPage token={token} />}
      </div>
    </div>
  );
};
