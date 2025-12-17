import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface OrgTicketsPageProps {
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
  device?: { id: string; name: string; serial_number?: string; brand_serial_number?: string } | null;
  technician?: { id: string; name: string } | null;
};

type Device = { id: string; name: string; serial_number?: string; brand_serial_number?: string; is_archived?: boolean; status?: string };

export const OrgTicketsPage: React.FC<OrgTicketsPageProps> = ({ token }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ deviceId: '', title: '', description: '' });

  const activeDevices = useMemo(
    () => devices.filter(d => d.is_archived !== true),
    [devices]
  );

  const fetchTickets = async () => {
    const res = await fetch('http://localhost:8000/make-server-60660975/org/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch tickets');
    setTickets(data.tickets || []);
  };

  const fetchDevices = async () => {
    const res = await fetch('http://localhost:8000/make-server-60660975/org/devices', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch devices');
    setDevices(data.devices || []);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all([fetchTickets(), fetchDevices()]);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.deviceId || !form.title.trim()) {
      toast.error('Device and title are required');
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/make-server-60660975/org/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deviceId: form.deviceId,
          title: form.title.trim(),
          description: form.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create ticket');
      toast.success('Ticket raised');
      setDialogOpen(false);
      setForm({ deviceId: '', title: '', description: '' });
      await fetchTickets();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to create ticket');
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold">Tickets</h2>
          <p className="text-gray-600 font-bold">Raise and track tickets</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Raise Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Raise Ticket</DialogTitle>
              <DialogDescription>Select a device and describe the issue.</DialogDescription>
            </DialogHeader>
            <form onSubmit={createTicket} className="space-y-4">
              <div className="space-y-2">
                <Label>Device *</Label>
                <Select value={form.deviceId} onValueChange={(v) => setForm(prev => ({ ...prev, deviceId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDevices.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} {d.serial_number ? `(${d.serial_number})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-sm text-slate-600">No tickets yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Technician</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-slate-600">{new Date(t.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="text-sm">{t.device?.name || '—'}</div>
                      <div className="text-xs text-slate-500">{t.device?.serial_number || t.device?.brand_serial_number || ''}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{t.title}</div>
                      {t.description ? <div className="text-xs text-slate-500 line-clamp-2">{t.description}</div> : null}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={statusBadgeClass(t.status)}>{statusLabel(t.status)}</Badge></TableCell>
                    <TableCell className="text-sm">{t.technician?.name || '—'}</TableCell>
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
