import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { backendUrl } from '../utils/supabase/info';
import { ClipboardList, AlertCircle, Clock, CheckCheck, TrendingUp } from 'lucide-react';

interface TechDashboardPageProps {
  token: string;
}

type TechDashboard = {
  tickets: { total: number; open: number; assigned: number; done: number };
};

export const TechDashboardPage: React.FC<TechDashboardPageProps> = ({ token }) => {
  const [data, setData] = useState<TechDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${backendUrl}/make-server-60660975/tech/dashboard`, {
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

  const ticketTotal = data?.tickets.total ?? 0;
  const completionRate = ticketTotal > 0 ? ((data?.tickets.done ?? 0) / ticketTotal * 100).toFixed(0) : 0;
  const activeTickets = (data?.tickets.assigned ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
          Technician Dashboard
        </h2>
        <p className="text-gray-600 font-medium mt-1">Track your work progress and assignments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Assigned</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{data?.tickets.total ?? 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{data?.tickets.assigned ?? 0}</p>
                <p className="text-xs text-amber-600 font-medium mt-1">Active tasks</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{data?.tickets.done ?? 0}</p>
                <p className="text-xs text-green-600 font-medium mt-1">{completionRate}% done</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{data?.tickets.open ?? 0}</p>
                <p className="text-xs text-purple-600 font-medium mt-1">Unassigned</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Work Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-gray-700">Active Tasks</span>
                </div>
                <span className="text-2xl font-bold text-amber-700">{data?.tickets.assigned ?? 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCheck className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-700">Completed</span>
                </div>
                <span className="text-2xl font-bold text-green-700">{data?.tickets.done ?? 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-gray-700">Available to Pick</span>
                </div>
                <span className="text-2xl font-bold text-purple-700">{data?.tickets.open ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="w-5 h-5 text-green-600" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Completion Rate</span>
                  <span className="text-sm font-bold text-green-600">{completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-center">
                  <p className="text-4xl font-bold text-slate-900">{ticketTotal}</p>
                  <p className="text-sm text-gray-600 mt-1">Total Tickets Assigned</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
