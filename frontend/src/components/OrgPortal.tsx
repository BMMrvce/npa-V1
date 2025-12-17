import React, { useState } from 'react';
import { Button } from './ui/button';
import { LogOut, LayoutDashboard, ClipboardList } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { OrgDashboardPage } from './OrgDashboardPage';
import { OrgTicketsPage } from './OrgTicketsPage';

interface OrgPortalProps {
  token: string;
  user: any;
  onLogout: () => void;
}

type TabType = 'dashboard' | 'tickets';

export const OrgPortal: React.FC<OrgPortalProps> = ({ token, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tickets' as TabType, label: 'Tickets', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ImageWithFallback
                src="/npa-logo.png"
                alt="Brand Logo"
                className="w-10 h-10 rounded-md object-contain border border-gray-200 bg-white"
              />
              <div>
                <h1 className="text-slate-900">NPA Water Dispensers</h1>
                <p className="text-xs text-slate-500">ORGANIZATION PORTAL</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm text-slate-900">{user?.user_metadata?.name || 'Organization'}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>
              <Button variant="destructive-outline" size="sm" onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <OrgDashboardPage token={token} />}
        {activeTab === 'tickets' && <OrgTicketsPage token={token} />}
      </div>
    </div>
  );
};
