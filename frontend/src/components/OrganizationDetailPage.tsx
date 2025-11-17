import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Plus, QrCode, Edit, Archive, ArchiveRestore, Building2, Mail, Phone, FileText, ClipboardList, Printer } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import QRCode from 'qrcode';
import { WaterDispenser } from './icons/WaterDispenser';

interface OrganizationDetailPageProps {
  token: string;
  organizationId: string;
  onBack: () => void;
}

interface Organization {
  id: string;
  organization_code: string;
  name: string;
  pan: string;
  phone_no: string;
  email: string;
  gst_no: string;
  address?: string;
  archived?: boolean;
  created_at: string;
  updated_at?: string;
}

interface Device {
  id: string;
  name: string;
  organization_id: string;
  serial_number: string;
  brand_serial_number?: string;
  model?: string;
  code?: string;
  status?: string;
  is_archived?: boolean;
  created_at: string;
}

interface MaintenanceRecord {
  id: string;
  device_id: string;
  technician_id: string;
  organization_id: string;
  description: string;
  status: string;
  created_at: string;
}

interface Technician {
  id: string;
  name: string;
}

export const OrganizationDetailPage: React.FC<OrganizationDetailPageProps> = ({ 
  token, 
  organizationId, 
  onBack 
}) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedQrCode, setSelectedQrCode] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [orgEditDialogOpen, setOrgEditDialogOpen] = useState(false);
  const [orgFormData, setOrgFormData] = useState({
    companyName: '',
    pan: '',
    phoneNo: '',
    email: '',
    gstNo: '',
  });
  const [formData, setFormData] = useState({
    deviceName: '',
    serialNumber: '', // kept for display in edit dialog but not submitted on create
    brandSerialNumber: '',
    model: '',
  });
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyDevice, setHistoryDevice] = useState<Device | null>(null);
  const [historyRecords, setHistoryRecords] = useState<MaintenanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  useEffect(() => {
    fetchOrganization();
    fetchDevices();
    fetchTechnicians();
  }, [organizationId, token]);

  const fetchOrganization = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/make-server-60660975/organizations`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        const org = data.organizations?.find((o: Organization) => o.id === organizationId);
        setOrganization(org || null);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      toast.error('Failed to fetch organization details');
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/make-server-60660975/devices`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error fetching devices:', data.error);
        toast.error(data.error || 'Failed to fetch devices');
        return;
      }

      // Filter devices for this organization and exclude archived devices
      const orgDevices = (data.devices || []).filter(
        (device: Device) => device.organization_id === organizationId && !device.is_archived
      );
      setDevices(orgDevices);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/make-server-60660975/technicians`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setTechnicians(data.technicians || []);
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `http://localhost:8000/make-server-60660975/devices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            deviceName: formData.deviceName,
            organizationId: organizationId,
            brandSerialNumber: formData.brandSerialNumber,
            model: formData.model,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error creating device:', data.error);
        toast.error(data.error || 'Failed to create device');
        return;
      }

      toast.success('Device created successfully with QR code!');
      setDialogOpen(false);
      setFormData({
        deviceName: '',
        serialNumber: '',
        brandSerialNumber: '',
        model: '',
      });
      fetchDevices();
    } catch (error) {
      console.error('Error creating device:', error);
      toast.error('Failed to create device');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;

    try {
      const response = await fetch(
        `http://localhost:8000/make-server-60660975/devices/${editingDevice.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            organizationId: organizationId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error updating device:', data.error);
        toast.error(data.error || 'Failed to update device');
        return;
      }

      toast.success('Device updated successfully!');
      setEditDialogOpen(false);
      setEditingDevice(null);
      fetchDevices();
    } catch (error) {
      console.error('Error updating device:', error);
      toast.error('Failed to update device');
    }
  };

  const handleArchiveToggle = async (device: Device) => {
    try {
      const response = await fetch(
        `http://localhost:8000/make-server-60660975/devices/${device.id}/archive`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ archived: !device.is_archived }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error archiving device:', data.error);
        toast.error(data.error || 'Failed to archive device');
        return;
      }

      toast.success(device.is_archived ? 'Device unarchived!' : 'Device archived!');
      fetchDevices();
    } catch (error) {
      console.error('Error archiving device:', error);
      toast.error('Failed to archive device');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  // Organization edit handlers
  const handleOrgInputChange = (field: string, value: string) => {
    if (field === 'pan') {
      const next = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
      setOrgFormData({ ...orgFormData, pan: next });
      return;
    }
    if (field === 'gstNo') {
      const next = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15);
      setOrgFormData({ ...orgFormData, gstNo: next });
      return;
    }
    setOrgFormData({ ...orgFormData, [field]: value });
  };

  const openOrgEditDialog = () => {
    if (!organization) return;
    setOrgFormData({
      companyName: organization.name || '',
      pan: (organization.pan || '').toUpperCase().slice(0, 10),
      phoneNo: organization.phone_no || '',
      email: organization.email || '',
      gstNo: (organization.gst_no || '').toUpperCase().slice(0, 15),
    });
    setOrgEditDialogOpen(true);
  };

  const handleOrgEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    try {
      // Basic GST validation: 15 chars, first 2 digits numeric, 14th 'Z'
      const gst = (orgFormData.gstNo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (gst.length !== 15 || !(/^\d{2}[A-Z0-9]{10}\dZ[A-Z0-9]$/.test(gst))) {
        toast.error('Invalid GST number. It must be 15 characters, start with 2 digits, have Z as 14th character.');
        return;
      }
      const sanitizedPayload = {
        ...orgFormData,
        pan: (orgFormData.pan || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
        gstNo: (orgFormData.gstNo || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15),
      };

      const response = await fetch(
        `http://localhost:8000/make-server-60660975/organizations/${organization.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(sanitizedPayload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error updating organization:', data.error);
        toast.error(data.error || 'Failed to update organization');
        return;
      }

      toast.success('Organization updated successfully!');
      setOrgEditDialogOpen(false);
      // refresh org details
      fetchOrganization();
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization');
    }
  };

  const openEditDialog = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      deviceName: device.name,
      serialNumber: device.serial_number,
      brandSerialNumber: (device as any).brand_serial_number || '',
      model: device.model || '',
    });
    setEditDialogOpen(true);
  };

  const handleShowQrCode = async (qrData: string) => {
    try {
      const url = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
      });
      setQrImageUrl(url);
      setSelectedQrCode(qrData);
      setQrDialogOpen(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    }
  };

  const getTechnicianName = (techId: string) => {
    const t = technicians.find(t => t.id === techId);
    return t ? t.name : 'Unknown';
  };

  const openHistory = async (device: Device) => {
    setHistoryDevice(device);
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    try {
      const resp = await fetch(`http://localhost:8000/make-server-60660975/maintenance/device/${device.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || 'Failed to fetch device history');
        setHistoryRecords([]);
      } else {
        setHistoryRecords(data.maintenance || []);
      }
    } catch (e) {
      console.error('Error fetching device history:', e);
      toast.error('Failed to fetch device history');
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const printDeviceReport = () => {
    if (!historyDevice) return;
    const title = `Maintenance Report - ${historyDevice.name}`;
    const orgName = organization?.name || '';

    const rowsHtml = historyRecords.map(r => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">${new Date(r.created_at).toLocaleDateString('en-IN')}</td>
        <td style="padding:8px;border:1px solid #ddd">${getTechnicianName(r.technician_id)}</td>
        <td style="padding:8px;border:1px solid #ddd">${r.status || 'Yet to Start'}</td>
        <td style="padding:8px;border:1px solid #ddd">${(r.description || '-').replace(/\n/g, '<br/>')}</td>
      </tr>
    `).join('');

    // compute next maintenance date (90 days after latest)
    const nextMaintenance = (() => {
      if (!historyRecords || historyRecords.length === 0) return null;
      const latest = historyRecords.reduce((max, r) => {
        const d = new Date(r.created_at);
        return d > max ? d : max;
      }, new Date(historyRecords[0].created_at));
      const next = new Date(latest);
      next.setDate(next.getDate() + 90);
      return next.toLocaleDateString('en-IN');
    })();

    // Build a letterhead-styled HTML similar to the PDF header in MaintenancePage
    const html = `
      <html>
        <head>
          <title>${title}</title>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <style>
            body { font-family: Inter, Arial, Helvetica, sans-serif; padding: 20px; color: #111; background: #fff }
            .top { display:flex; gap:12px; align-items:center }
            .logo { width:72px; height:72px; border-radius:6px; display:inline-block; background:#1e90ff; color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center; font-size:20px }
            .org-title { text-align:center; flex:1 }
            .org-title .big { font-size:44px; font-weight:800; color: rgb(204,0,0); letter-spacing:2px; text-transform:uppercase }
            .org-title .addr { font-size:16px; font-weight:700; color:#111; margin-top:8px }
            .org-title .contact { font-size:14px; color:#111; margin-top:6px }
            .sep { height:3px; background:#d1d5db; margin:18px 0; width:100%; }
            .report-title { text-align:center; margin-top:6px; font-weight:700; font-size:16px; color:#2c3e50 }
            .org-box { background:transparent; padding:8px; border-radius:6px; margin-top:8px; text-align:center; font-weight:700; color:#2563eb }
            .serial-red { color: rgb(204,0,0); font-weight:800 }
            .meta { display:flex; justify-content:space-between; margin-top:8px; font-size:12px; color:#505050 }
            .summary { background:#f1f8e9; padding:12px; border-radius:8px; margin-top:12px }
            table { border-collapse:collapse; width:100%; margin-top:12px }
            th, td { padding:8px; border:1px solid #e5e7eb; text-align:left }
            thead th { background:#1976b8; color:#fff; font-weight:700; padding:10px }
            .status-inprogress { display:inline-block; background:#fff4ce; color:#b85c00; padding:6px 10px; border-radius:6px; font-weight:700 }
            .status-completed { display:inline-block; background:#e6f9ec; color:#176f2b; padding:6px 10px; border-radius:6px; font-weight:700 }
            .status-default { display:inline-block; background:#f3f4f6; color:#374151; padding:6px 10px; border-radius:6px; font-weight:600 }
            @media print { body { padding:8mm } }
          </style>
        </head>
        <body>
          <div class="top">
            <div>
              <img src="/npa-logo.png" onerror="this.style.display='none'" style="width:72px;height:72px;object-fit:contain" />
              <div class="logo" style="display:none">NP</div>
            </div>
            <div class="org-title">
              <div  style="color:red;font-size:30px;font-weight:Bold" >NATIONAL PROCESS AUTOMATION</div>
              <div class="addr">#48, 4th cross, Ganesha Block, Nandini Layout, Bangalore-560096</div>
              <div class="contact">Ph: 080 23498376, 9900143996 &nbsp; e-mail: tech.npa@gmail.com</div>
              <div class="contact">www.npautomation.in</div>
            </div>
          </div>
          <div class="sep"></div>

          <div class="report-title">MAINTENANCE SERVICE REPORT</div>
          <div class="org-box">${orgName.toUpperCase()}</div>

          <div class="meta">
            <div>Device: <strong>${historyDevice.name}</strong> • Serial: <strong class="serial-red">${historyDevice.serial_number}</strong></div>
            <div>Report ID: NPA-${new Date().toISOString().split('T')[0]}</div>
          </div>

          <div class="summary">
            <div>Total Maintenance Records: <strong>${historyRecords.length}</strong></div>
            <div style="margin-top:6px">Next Maintenance Date: <strong>${nextMaintenance || '-'}</strong></div>
          </div>

          ${historyRecords.length === 0 ? `
            <div style="padding:16px;color:#6b7280">No maintenance records found for this device.</div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          `}
        </body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      // give browser a moment to render then print
      setTimeout(() => { w.print(); }, 200);
    }
  };

  // Filter devices based on archive status and organization archive status
  const filteredDevices = devices.filter(device => {
    if (showArchived) {
      // Show archived devices OR if organization is archived, show all devices
      return device.is_archived || organization?.archived;
    } else {
      // Show only active devices if organization is active
      return !device.is_archived && !organization?.archived;
    }
  });

  if (loading || !organization) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Organizations
          </Button>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organization details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Organizations
        </Button>
      </div>

      {/* Organization Info Card */}
      <Card className="shadow-sm border-2 border-gray-400 bg-white">
        <CardHeader className="border-b-2 border-gray-400">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-3 rounded-md bg-slate-100 border border-slate-200">
                <Building2 className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl text-slate-900">{organization.name}</span>
                  {organization.archived && (
                    <Badge variant="secondary" className="bg-gray-200">Archived</Badge>
                  )}
                </div>
                <p className="text-sm text-slate-500 font-normal mt-1">Organization Details</p>
              </div>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={openOrgEditDialog}
              disabled={organization.archived}
              title="Edit organization"
            >
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-md border border-slate-200">
              <Building2 className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Organization Code</p>
                <p className="text-sm text-slate-900 font-bold">{organization.organization_code || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-md border border-slate-200">
              <Mail className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm text-slate-900 font-bold">{organization.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-md border border-slate-200">
              <Phone className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-sm text-slate-900 font-bold">{organization.phone_no}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-md border border-slate-200">
              <FileText className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">PAN</p>
                <p className="text-sm text-slate-900 font-bold">{organization.pan}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-md border border-slate-200">
              <FileText className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">GST Number</p>
                <p className="text-sm text-slate-900 font-bold">{organization.gst_no}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-md border border-slate-200">
              <Building2 className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Address</p>
                <p className="text-sm text-slate-900 font-bold">{organization.address || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Devices Section */}
      <div className="flex justify-between items-center">
        <div>
          <h2>Devices</h2>
          <p className="text-gray-600">Manage devices for this organization</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={organization.archived}>
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
              <DialogDescription>Add a device to {organization.name}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deviceName">Device Name *</Label>
                <Input
                  id="deviceName"
                  value={formData.deviceName}
                  onChange={(e) => handleInputChange('deviceName', e.target.value)}
                  required
                />
              </div>
              {/* Serial number is generated automatically by the server in format NPA-ORGCODE-YEAR-XXXXXX */}
                <div className="space-y-2">
                  <Label htmlFor="brandSerialNumber">Brand Serial No *</Label>
                  <Input
                    id="brandSerialNumber"
                    value={formData.brandSerialNumber}
                    onChange={(e) => handleInputChange('brandSerialNumber', e.target.value)}
                    required
                  />
                </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">Create Device</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>Update device information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-deviceName">Device Name *</Label>
              <Input
                id="edit-deviceName"
                value={formData.deviceName}
                onChange={(e) => handleInputChange('deviceName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-serialNumber">Serial Number *</Label>
              <Input
                id="edit-serialNumber"
                value={formData.serialNumber}
                disabled
              />
              <p className="text-xs text-slate-500">Serial number is generated by the server and cannot be changed here.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-brandSerialNumber">Brand Serial No *</Label>
              <Input
                id="edit-brandSerialNumber"
                value={formData.brandSerialNumber}
                onChange={(e) => handleInputChange('brandSerialNumber', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model">Model</Label>
              <Input
                id="edit-model"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">Update Device</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Devices Table */}
      <Card className="shadow-sm border-2 border-gray-400">
        <CardHeader className="bg-white border-b-2 border-gray-400 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-slate-100 border border-slate-200">
                <WaterDispenser className="w-5 h-5 text-slate-700" />
              </div>
              <span className="text-slate-900">Organization Devices ({filteredDevices.length})</span>
            </CardTitle>
            <div className="flex items-center gap-3">
              <Label htmlFor="show-archived-devices" className="text-sm text-slate-600 cursor-pointer select-none">
                Show Archived
              </Label>
              <Switch
                id="show-archived-devices"
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredDevices.length === 0 ? (
            <div className="text-center py-16">
                <WaterDispenser className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                {showArchived 
                  ? 'No archived devices found for this organization.' 
                  : 'No devices found. Add your first device for this organization!'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredDevices.map((device) => (
                <div 
                  key={device.id} 
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                 <WaterDispenser className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-slate-900">{device.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {device.serial_number}{device.model && ` • ${device.model}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShowQrCode(device.serial_number)}
                      className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      title="View QR code"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openHistory(device)}
                      className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      title="View maintenance history"
                    >
                      <ClipboardList className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(device)}
                      className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      title="Edit device"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchiveToggle(device)}
                      className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      title={device.is_archived ? 'Unarchive' : 'Archive'}
                    >
                      {device.is_archived ? (
                        <ArchiveRestore className="w-4 h-4" />
                      ) : (
                        <Archive className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Device QR Code</DialogTitle>
            <DialogDescription>Scan this QR code to identify the device</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrImageUrl && (
              <>
                <div className="relative">
                  <div className="qr-rainbow-bg absolute inset-0 rounded-2xl opacity-80 blur-xl" />
                  <div className="relative rounded-2xl bg-white p-3 shadow-lg">
                    <img src={qrImageUrl} alt="QR Code" className="w-64 h-64" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 text-center break-all">{selectedQrCode}</p>
                <div className="flex gap-3 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = qrImageUrl;
                      link.download = `${selectedQrCode}-qr-code.png`;
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
                              <title>Print QR Code - ${selectedQrCode}</title>
                              <style>
                                body { text-align: center; padding: 2em; font-family: Arial, sans-serif; }
                              </style>
                            </head>
                            <body>
                              <img src="${qrImageUrl}" style="width:300px;height:300px;" />
                              <br/>
                              <p style="font-size:12px;margin-top:1em;">${selectedQrCode}</p>
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

      {/* Edit Organization Dialog */}
      <Dialog open={orgEditDialogOpen} onOpenChange={setOrgEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update organization information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOrgEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-companyName">Company Name *</Label>
              <Input
                id="org-companyName"
                value={orgFormData.companyName}
                onChange={(e) => handleOrgInputChange('companyName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-pan">PAN *</Label>
              <Input
                id="org-pan"
                value={orgFormData.pan}
                maxLength={10}
                onChange={(e) => handleOrgInputChange('pan', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-phoneNo">Phone Number *</Label>
              <Input
                id="org-phoneNo"
                type="tel"
                value={orgFormData.phoneNo}
                onChange={(e) => handleOrgInputChange('phoneNo', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-email">Email *</Label>
              <Input
                id="org-email"
                type="email"
                value={orgFormData.email}
                onChange={(e) => handleOrgInputChange('email', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-gstNo">GST Number *</Label>
              <Input
                id="org-gstNo"
                value={orgFormData.gstNo}
                maxLength={15}
                onChange={(e) => handleOrgInputChange('gstNo', e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">Update Organization</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Device History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="w-full flex items-start justify-between gap-4">
                <div>
                  <DialogTitle>Maintenance History{historyDevice ? `: ${historyDevice.name}` : ''}</DialogTitle>
                  <DialogDescription>
                    {historyDevice ? (
                      <span className="text-xs">Serial: {historyDevice.serial_number}</span>
                    ) : null}
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={printDeviceReport}
                    disabled={historyRecords.length === 0}
                    title={historyRecords.length === 0 ? 'No records to print' : 'Print device report'}
                  >
                    <Printer className="w-4 h-4 mr-2" /> Print
                  </Button>
                </div>
              </div>
            </DialogHeader>
          {historyLoading ? (
            <div className="text-center py-8 text-slate-500">Loading history...</div>
          ) : historyRecords.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No maintenance records found for this device.</div>
          ) : (
            <div className="overflow-x-auto">
              <div>
                <style>{`.history-table thead th { background:#1976b8; color:#fff; font-weight:700; padding:8px 10px } .history-table td { padding:6px 8px } .history-table tr { height:24px }`}</style>
                <Table className="history-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Technician</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyRecords.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{new Date(r.created_at).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{getTechnicianName(r.technician_id)}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded text-xs border">
                            {r.status || 'Yet to Start'}
                          </span>
                        </TableCell>
                        <TableCell>{r.description || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
