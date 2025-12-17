import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface TechTicketsPageProps {
  token: string;
}

type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'done';

const normalizedStatus = (status: TicketStatus) => (status === 'assigned' ? 'in_progress' : status);

const statusLabel = (status: TicketStatus) => {
  const s = normalizedStatus(status);
  if (s === 'in_progress') return 'In Progress';
  if (s === 'done') return 'Done';
  return 'Open';
};

const statusBadgeClass = (status: TicketStatus) => {
  const s = normalizedStatus(status);
  if (s === 'done') return 'bg-green-100 text-green-800 border-green-200';
  if (s === 'in_progress') return 'bg-yellow-200 text-yellow-900 border-yellow-300';
  return 'bg-red-100 text-red-800 border-red-200';
};

type Ticket = {
  id: string;
  title: string;
  description?: string;
  status: TicketStatus;
  created_at: string;
  organization?: { id: string; name: string; organization_code?: string } | null;
  device?: { id: string; name: string; serial_number?: string; brand_serial_number?: string } | null;
};

export const TechTicketsPage: React.FC<TechTicketsPageProps> = ({ token }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    const res = await fetch('http://localhost:8000/make-server-60660975/tech/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch tickets');
    setTickets(data.tickets || []);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await fetchTickets();
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const markDone = async (ticketId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/make-server-60660975/tech/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'done' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update ticket');
      toast.success('Marked done');
      await fetchTickets();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to update ticket');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="font-bold">Assigned Tickets</h2>
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold">Assigned Tickets</h2>
        <p className="text-gray-600 font-bold">Track and update your tickets</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-sm text-slate-600">No assigned tickets.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-slate-600">{new Date(t.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="text-sm">{t.organization?.name || '—'}</div>
                      <div className="text-xs text-slate-500">{t.organization?.organization_code || ''}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{t.device?.name || '—'}</div>
                      <div className="text-xs text-slate-500">{t.device?.serial_number || t.device?.brand_serial_number || ''}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{t.title}</div>
                      {t.description ? <div className="text-xs text-slate-500 line-clamp-2">{t.description}</div> : null}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={statusBadgeClass(t.status)}>{statusLabel(t.status)}</Badge></TableCell>
                    <TableCell>
                      {t.status !== 'done' ? (
                        <Button variant="outline" onClick={() => markDone(t.id)}>Mark Done</Button>
                      ) : (
                        <div className="text-xs text-slate-500">Done</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
