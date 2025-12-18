import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { backendUrl } from '../utils/supabase/info';
import { Package, CheckCircle, XCircle, Archive, AlertCircle, Clock, CheckCheck } from 'lucide-react';

interface OrgDashboardPageProps {
  token: string;
}

type OrgDashboard = {
  devices: { total: number; active: number; inactive: number; archived: number };
  tickets: { open: number; assigned: number; done: number };
};

export const OrgDashboardPage: React.FC<OrgDashboardPageProps> = ({ token }) => {
  const [data, setData] = useState<OrgDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${backendUrl}/make-server-60660975/org/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load dashboard');
        setData(json);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="font-bold">Dashboard</h2>
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  const deviceTotal = data?.devices.total ?? 0;
  const deviceActivePercent = deviceTotal > 0 ? ((data?.devices.active ?? 0) / deviceTotal * 100).toFixed(0) : 0;
  
  const ticketTotal = (data?.tickets.open ?? 0) + (data?.tickets.assigned ?? 0) + (data?.tickets.done ?? 0);
  const ticketDonePercent = ticketTotal > 0 ? ((data?.tickets.done ?? 0) / ticketTotal * 100).toFixed(0) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
          Dashboard Overview
        </h2>
        <p className="text-gray-600 font-medium mt-1">Welcome to your organization portal</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Devices</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{data?.devices.total ?? 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Devices</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{data?.devices.active ?? 0}</p>
                <p className="text-xs text-green-600 font-medium mt-1">{deviceActivePercent}% of total</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{data?.tickets.open ?? 0}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{data?.tickets.done ?? 0}</p>
                <p className="text-xs text-purple-600 font-medium mt-1">{ticketDonePercent}% resolved</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CheckCheck className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-blue-600" />
              Device Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-700">Active</span>
                </div>
                <span className="text-2xl font-bold text-green-700">{data?.devices.active ?? 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-gray-700">Inactive</span>
                </div>
                <span className="text-2xl font-bold text-amber-700">{data?.devices.inactive ?? 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Archive className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-700">Archived</span>
                </div>
                <span className="text-2xl font-bold text-gray-700">{data?.devices.archived ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5 text-purple-600" />
              Ticket Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-gray-700">Open</span>
                </div>
                <span className="text-2xl font-bold text-amber-700">{data?.tickets.open ?? 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-700">In Progress</span>
                </div>
                <span className="text-2xl font-bold text-blue-700">{data?.tickets.assigned ?? 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCheck className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-700">Completed</span>
                </div>
                <span className="text-2xl font-bold text-green-700">{data?.tickets.done ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
