import React, { useState } from 'react';
import { Button } from './ui/button';
import { LogOut, LayoutDashboard, ClipboardList } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { OrgDashboardPage } from './OrgDashboardPage';
import { OrgTicketsPage } from './OrgTicketsPage';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';

interface OrgPortalProps {
  token: string;
  user: any;
  onLogout: () => void;
}

type TabType = 'dashboard' | 'tickets';

export const OrgPortal: React.FC<OrgPortalProps> = ({ token, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [pwOpen, setPwOpen] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const supabase = createClient();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setPwLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated');
      setPwOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Change password error:', err);
      toast.error(err?.message || 'Failed to update password');
    } finally {
      setPwLoading(false);
    }
  };

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
              <Dialog open={pwOpen} onOpenChange={setPwOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Change Password</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>Set a new password for your account.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="org-new-password">New Password</Label>
                      <Input
                        id="org-new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-confirm-password">Confirm Password</Label>
                      <Input
                        id="org-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setPwOpen(false)} disabled={pwLoading}>Cancel</Button>
                      <Button type="submit" disabled={pwLoading}>{pwLoading ? 'Updating…' : 'Update'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
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
