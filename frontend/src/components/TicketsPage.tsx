import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface TicketsPageProps {
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
  assigned_technician_id?: string | null;
  organization?: { id: string; name: string; organization_code?: string } | null;
  device?: { id: string; name: string; serial_number?: string; brand_serial_number?: string } | null;
  technician?: { id: string; name: string } | null;
};

type Technician = { id: string; name: string; is_archived?: boolean };

export const TicketsPage: React.FC<TicketsPageProps> = ({ token }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAssign, setPendingAssign] = useState<Record<string, string>>({});

  const activeTechnicians = useMemo(
    () => technicians.filter(t => t.is_archived !== true),
    [technicians]
  );

  const fetchTickets = async () => {
    const res = await fetch('http://localhost:8000/make-server-60660975/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch tickets');
    setTickets(data.tickets || []);
  };

  const fetchTechnicians = async () => {
    const res = await fetch('http://localhost:8000/make-server-60660975/technicians', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch technicians');
    setTechnicians(data.technicians || []);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all([fetchTickets(), fetchTechnicians()]);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleAssign = async (ticketId: string) => {
    const technicianId = pendingAssign[ticketId];
    if (!technicianId) {
      toast.error('Select a technician');
      return;
    }

    try {
      const res = await fetch(`http://localhost:8000/make-server-60660975/tickets/${ticketId}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ technicianId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to assign ticket');
      toast.success('Technician assigned');
      setPendingAssign(prev => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });
      await fetchTickets();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to assign ticket');
    }
  };

  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    try {
      const res = await fetch(`http://localhost:8000/make-server-60660975/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update status');
      toast.success('Status updated');
      await fetchTickets();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="font-bold">Tickets</h2>
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold">Tickets</h2>
        <p className="text-gray-600 font-bold">Manage raised tickets</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-sm text-slate-600">No tickets yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Technician</TableHead>
                  <TableHead>Actions</TableHead>
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
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass(t.status)}>{statusLabel(t.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{t.technician?.name || '—'}</div>
                    </TableCell>
                    <TableCell className="space-y-2">
                      {t.status !== 'done' ? (
                        <div className="flex flex-col gap-2 min-w-[220px]">
                          <div className="flex gap-2">
                            <Select
                              value={pendingAssign[t.id] ?? (t.assigned_technician_id || '')}
                              onValueChange={(v) => setPendingAssign(prev => ({ ...prev, [t.id]: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select technician" />
                              </SelectTrigger>
                              <SelectContent>
                                {activeTechnicians.map((tech) => (
                                  <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              onClick={() => handleAssign(t.id)}
                              disabled={!pendingAssign[t.id]}
                            >
                              Assign
                            </Button>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleStatusChange(t.id, 'done')}
                              disabled={t.status === 'done'}
                            >
                              Mark Done
                            </Button>
                            {t.status !== 'open' ? (
                              <Button
                                variant="ghost"
                                onClick={() => handleStatusChange(t.id, 'open')}
                              >
                                Reopen
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">No actions</div>
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
