import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { backendUrl } from '../utils/supabase/info';

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold">Dashboard</h2>
        <p className="text-gray-600 font-bold">Organization overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Devices</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500">Total</div>
              <div className="text-2xl font-semibold">{data?.devices.total ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Active</div>
              <div className="text-2xl font-semibold">{data?.devices.active ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Inactive</div>
              <div className="text-2xl font-semibold">{data?.devices.inactive ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Archived</div>
              <div className="text-2xl font-semibold">{data?.devices.archived ?? 0}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500">Open</div>
              <div className="text-2xl font-semibold">{data?.tickets.open ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">In Progress</div>
              <div className="text-2xl font-semibold">{data?.tickets.assigned ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Done</div>
              <div className="text-2xl font-semibold">{data?.tickets.done ?? 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
