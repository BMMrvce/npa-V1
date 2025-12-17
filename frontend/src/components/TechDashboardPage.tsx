import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';

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
        const res = await fetch('http://localhost:8000/make-server-60660975/tech/dashboard', {
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
        <p className="text-gray-600 font-bold">Technician overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Assigned Tickets</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500">Total</div>
              <div className="text-2xl font-semibold">{data?.tickets.total ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">In Progress</div>
              <div className="text-2xl font-semibold">{data?.tickets.assigned ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Done</div>
              <div className="text-2xl font-semibold">{data?.tickets.done ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Open (not assigned to you)</div>
              <div className="text-2xl font-semibold">{data?.tickets.open ?? 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
