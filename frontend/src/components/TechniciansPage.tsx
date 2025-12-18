import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import { Plus, Wrench, Edit2, Archive, ArchiveRestore, QrCode, KeyRound } from 'lucide-react';
import { backendUrl } from '../utils/supabase/info';
import { Badge } from './ui/badge';
import QRCode from 'qrcode';

interface TechniciansPageProps {
  token: string;
}

interface Technician {
  id: string;
  name: string;
  phone: string;
  email: string;
  auth_user_id?: string | null;
  auth_email?: string | null;
  pan?: string;
  aadhar?: string;
  code?: string;
  is_archived?: boolean;
  created_at: string;
  updated_at?: string;
}

export const TechniciansPage: React.FC<TechniciansPageProps> = ({ token }) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authTech, setAuthTech] = useState<Technician | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authPassword, setAuthPassword] = useState<string | null>(null);
  const [authSaving, setAuthSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedTechnicianQr, setSelectedTechnicianQr] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [selectedTechnicianName, setSelectedTechnicianName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contactNo: '',
    email: '',
    pan: '',
    aadhar: '',
  });
  // Add search state
  const [search, setSearch] = useState('');

  const fetchTechnicians = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/make-server-60660975/technicians`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error fetching technicians:', data.error);
        toast.error(data.error || 'Failed to fetch technicians');
        return;
      }

      setTechnicians(data.technicians || []);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast.error('Failed to fetch technicians');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Sanitize payload: ensure PAN uppercase and Aadhar digits-only (12)
      const sanitizedPayload = {
        ...formData,
        pan: (formData.pan || '').toUpperCase(),
        aadhar: (formData.aadhar || '').replace(/\D/g, '').slice(0, 12),
      };

      const url = editingTech
        ? `${backendUrl}/make-server-60660975/technicians/${editingTech.id}`
        : `${backendUrl}/make-server-60660975/technicians`;
      
      const response = await fetch(url, {
        method: editingTech ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(sanitizedPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`Error ${editingTech ? 'updating' : 'creating'} technician:`, data.error);
        toast.error(data.error || `Failed to ${editingTech ? 'update' : 'create'} technician`);
        return;
      }

      toast.success(`Technician ${editingTech ? 'updated' : 'created'} successfully!`);
      setDialogOpen(false);
      setEditingTech(null);
      setFormData({
        name: '',
        contactNo: '',
        email: '',
        pan: '',
        aadhar: '',
      });

      if (!editingTech && data?.credentials?.email && data?.credentials?.password && data?.technician) {
        setAuthTech(data.technician);
        setAuthEmail(data.credentials.email);
        setAuthUserId(data.technician.auth_user_id || null);
        setAuthPassword(data.credentials.password);
        setAuthDialogOpen(true);
      }
      fetchTechnicians();
    } catch (error) {
      console.error(`Error ${editingTech ? 'updating' : 'creating'} technician:`, error);
      toast.error(`Failed to ${editingTech ? 'update' : 'create'} technician`);
    }
  };

  const openAuthDialog = async (tech: Technician) => {
    try {
      setAuthTech(tech);
      setAuthPassword(null);
      setAuthUserId(null);
      setAuthEmail('');
      setAuthDialogOpen(true);

      const res = await fetch(
        `${backendUrl}/make-server-60660975/technicians/${tech.id}/auth`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Failed to load technician login');
        return;
      }
      setAuthUserId(data.authUserId || null);
      setAuthEmail(data.authEmail || '');
    } catch (e) {
      console.error(e);
      toast.error('Failed to load technician login');
    }
  };

  const saveAuthEmail = async () => {
    if (!authTech) return;
    if (!authEmail || !authEmail.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }

    try {
      setAuthSaving(true);
      const res = await fetch(
        `${backendUrl}/make-server-60660975/technicians/${authTech.id}/auth`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: authEmail }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Failed to update email');
        return;
      }
      setAuthUserId(data.authUserId || authUserId);
      setAuthPassword(data.password || null);
      toast.success('Technician login updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update email');
    } finally {
      setAuthSaving(false);
    }
  };

  const resetAuthPassword = async () => {
    if (!authTech) return;
    try {
      setAuthSaving(true);
      const res = await fetch(
        `${backendUrl}/make-server-60660975/technicians/${authTech.id}/auth/reset-password`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Failed to reset password');
        return;
      }
      setAuthPassword(data.password);
      toast.success('Password reset');
    } catch (e) {
      console.error(e);
      toast.error('Failed to reset password');
    } finally {
      setAuthSaving(false);
    }
  };

  const handleEdit = (tech: Technician) => {
    setEditingTech(tech);
    // Format aadhar with hyphens for display (1234-5678-9012)
    const aadharDigits = (tech.aadhar || '').replace(/\D/g, '');
    const formattedAadhar = aadharDigits.replace(/(.{4})/g, '$1-').replace(/-$/, '');
    
    setFormData({
      name: tech.name,
      contactNo: (tech.phone || '').replace(/\D/g, '').slice(0, 10),
      email: tech.email,
      pan: tech.pan || '',
      aadhar: formattedAadhar,
    });
    setDialogOpen(true);
  };

  const handleArchive = async (techId: string, currentArchived: boolean) => {
    try {
      const response = await fetch(
        `${backendUrl}/make-server-60660975/technicians/${techId}/archive`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ archived: !currentArchived }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error archiving technician:', data.error);
        toast.error(data.error || 'Failed to archive technician');
        return;
      }

      toast.success(`Technician ${!currentArchived ? 'archived' : 'unarchived'} successfully!`);
      fetchTechnicians();
    } catch (error) {
      console.error('Error archiving technician:', error);
      toast.error('Failed to archive technician');
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingTech(null);
      setFormData({
        name: '',
        contactNo: '',
        email: '',
        pan: '',
        aadhar: '',
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'contactNo') {
      // Only digits, max 10
      const next = value.replace(/\D/g, '').slice(0, 10);
      setFormData({ ...formData, contactNo: next });
      return;
    }
    if (field === 'pan') {
      // Allow only alphanumeric, uppercase, max 10
      const next = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
      setFormData({ ...formData, pan: next });
      return;
    }
    if (field === 'aadhar') {
      // Keep digits only internally, format as groups of 4 with hyphens for display, max 12 digits
      const digits = value.replace(/\D/g, '').slice(0, 12);
      const formatted = digits.replace(/(.{4})/g, '$1-').replace(/-$/, '');
      setFormData({ ...formData, aadhar: formatted });
      return;
    }
    setFormData({ ...formData, [field]: value });
  };

  const maskSensitiveData = (data: string, visibleChars: number = 4) => {
    if (!data || data.length <= visibleChars) return data;
    return '*'.repeat(data.length - visibleChars) + data.slice(-visibleChars);
  };

  // Generate formatted technician ID (NPA-TECH-xxxxxx)
  const getFormattedTechnicianId = (tech: Technician, index: number) => {
    // Prefer tech.code if available, else tech.id, else fallback to index
    if (tech.code && tech.code.length > 0) {
      return `NPA-TECH-${tech.code}`;
    }
    if (tech.id && tech.id.length > 0) {
      return `NPA-TECH-${tech.id}`;
    }
    const techNumber = String(index + 1).padStart(6, '0');
    return `NPA-TECH-${techNumber}`;
  };

  const handleShowQrCode = async (tech: Technician, index: number) => {
    try {
      // Generate formatted technician ID
      const formattedId = getFormattedTechnicianId(tech, index);
      
      // QR code contains only the formatted ID
      const url = await QRCode.toDataURL(formattedId, {
        width: 300,
        margin: 2,
      });
      setQrImageUrl(url);
      setSelectedTechnicianQr(formattedId);
      setSelectedTechnicianName(tech.name);
      setQrDialogOpen(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    }
  };

  const searchedTechnicians = technicians
    .filter(t => (showArchived ? t.is_archived === true : t.is_archived !== true))
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase().trim()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold">Technicians</h2>
          <p className="text-gray-600 font-bold">Manage maintenance technicians</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            className="border-2 border-gray-400 rounded px-2 py-1 text-sm min-w-[180px]"
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
            {showArchived ? 'Show Active' : 'Show Archived'}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Technician
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingTech ? 'Edit Technician' : 'Add New Technician'}</DialogTitle>
                <DialogDescription>
                  {editingTech ? 'Update technician information' : 'Register a new maintenance technician'}
                </DialogDescription>
              </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactNo">Contact Number *</Label>
                <Input
                  id="contactNo"
                  type="tel"
                  value={formData.contactNo}
                  maxLength={10}
                  pattern="[0-9]{10}"
                  inputMode="numeric"
                  onChange={(e) => handleInputChange('contactNo', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan">PAN *</Label>
                <Input
                  id="pan"
                  value={formData.pan}
                  onChange={(e) => handleInputChange('pan', e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aadhar">Aadhar *</Label>
                <Input
                  id="aadhar"
                  value={formData.aadhar}
                  onChange={(e) => handleInputChange('aadhar', e.target.value)}
                  placeholder="1234-5678-9012"
                  maxLength={14}
                  inputMode="numeric"
                  pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                onClick={(e) => {
                  // Validate phone number is exactly 10 digits
                  if (!formData.contactNo || formData.contactNo.replace(/\D/g, '').length !== 10) {
                    e.preventDefault();
                    toast.error('Phone number must be exactly 10 digits');
                    return;
                  }
                  // Validate Aadhar is exactly 12 digits (formatted as 1234-5678-9012)
                  const aadharDigits = (formData.aadhar || '').replace(/\D/g, '');
                  if (aadharDigits.length !== 12) {
                    e.preventDefault();
                    toast.error('Aadhar number must be 12 digits (format: 1234-5678-9012)');
                    return;
                  }
                }}
              >
                {editingTech ? 'Update Technician' : 'Create Technician'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="shadow-sm border-2 border-gray-400">
        <CardHeader className="bg-white border-b-2 border-gray-400 py-4">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-slate-100 border border-slate-200">
              <Wrench className="w-5 h-5 text-slate-700" />
            </div>
            <span className="text-slate-900">
              {showArchived ? 'Archived ' : ''}Technicians ({searchedTechnicians.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-slate-500 text-sm">Loading technicians...</p>
            </div>
          ) : searchedTechnicians.length === 0 ? (
            <div className="text-center py-16">
              <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                {showArchived 
                  ? 'No archived technicians found.' 
                  : 'No technicians found. Add your first technician!'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {searchedTechnicians.map((tech, index) => (
                <div 
                  key={tech.id} 
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-slate-900 font-bold">{tech.name}</h3>
                        <Badge variant="outline" className="text-xs font-mono">
                          {tech.code || `TECH-${String(index + 1).padStart(6, '0')}`}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 font-bold mt-0.5">
                        {tech.email} • {tech.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShowQrCode(tech, index)}
                      title="Show QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAuthDialog(tech)}
                      title="Technician login"
                    >
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(tech)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchive(tech.id, tech.is_archived || false)}
                      title={tech.is_archived ? 'Unarchive' : 'Archive'}
                    >
                      {tech.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technician Login Dialog */}
      <Dialog
        open={authDialogOpen}
        onOpenChange={(open: boolean) => {
          setAuthDialogOpen(open);
          if (!open) {
            setAuthTech(null);
            setAuthEmail('');
            setAuthUserId(null);
            setAuthPassword(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Technician Login</DialogTitle>
            <DialogDescription>
              {authTech ? authTech.name : 'Manage technician portal login'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tech-auth-email">Login Email</Label>
              <Input
                id="tech-auth-email"
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="techname@npa.com"
              />
              {authUserId ? (
                <p className="text-xs text-slate-500">Auth user linked.</p>
              ) : (
                <p className="text-xs text-slate-500">No auth user linked yet (saving will create one).</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={saveAuthEmail} disabled={authSaving || !authTech}>
                Save Email
              </Button>
              <Button variant="outline" onClick={resetAuthPassword} disabled={authSaving || !authTech || !authUserId}>
                Reset Password
              </Button>
            </div>

            {authPassword ? (
              <div className="rounded-md border p-3 bg-slate-50">
                <div className="text-xs text-slate-500">Generated password (copy now)</div>
                <div className="mt-1 font-mono text-sm break-all">{authPassword}</div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Technician QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrImageUrl && (
              <>
                <div className="relative">
                  <div className="qr-rainbow-bg absolute inset-0 rounded-2xl opacity-80 blur-xl" />
                  <div className="relative rounded-2xl bg-white p-3 shadow-lg">
                    <img src={qrImageUrl} alt="Technician QR Code" className="w-64 h-64" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 text-center break-all">{selectedTechnicianQr}</p>
                <div className="flex gap-3 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = qrImageUrl;
                      link.download = `${selectedTechnicianQr}-qr-code.png`;
                      link.click();
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Print QR Code - ${selectedTechnicianQr}</title>
                              <style>
                                body { text-align: center; padding: 2em; font-family: Arial, sans-serif; }
                              </style>
                            </head>
                            <body>
                              <img src="${qrImageUrl}" style="width:300px;height:300px;" />
                              <br/>
                              <p style="font-size:12px;margin-top:1em;">${selectedTechnicianQr}</p>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
                      }
                    }}
                  >
                    Print
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
