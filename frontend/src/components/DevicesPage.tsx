import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { Plus, QrCode, Edit, Archive, ArchiveRestore, ClipboardList, Printer } from 'lucide-react';
import { projectId, publicAnonKey, backendUrl } from '../utils/supabase/info';
import QRCode from 'qrcode';
import { WaterDispenser } from './icons/WaterDispenser';

interface DevicesPageProps {
  token: string;
}

interface Device {
  id: string;
  name: string;
  organization_id: string;
  serial_number?: string;
  brand_serial_number?: string;
  model?: string;
  status?: string;
  is_archived?: boolean;
  created_at: string;
  device_type?: string;
}

interface Organization {
  id: string;
  name: string;
  organization_code?: string;
  archived?: boolean;
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

export const DevicesPage: React.FC<DevicesPageProps> = ({ token }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedQrCode, setSelectedQrCode] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [searchBrandSerial, setSearchBrandSerial] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'serial' | 'brand' | 'created' >('created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterOrgId, setFilterOrgId] = useState('');
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyDevice, setHistoryDevice] = useState<Device | null>(null);
  const [historyRecords, setHistoryRecords] = useState<MaintenanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [formData, setFormData] = useState({
    deviceName: '',
    organizationId: '',
    serialNumber: '', // kept for display in edit dialog but not submitted on create
    brandSerialNumber: '',
    model: '',
    deviceType: 'Comprehensive',
  });

  const fetchDevices = async () => {
    try {
      setLoading(true);
      console.log('🟢 Fetching devices from:', `${backendUrl}/make-server-60660975/devices`);
      const response = await fetch(`${backendUrl}/make-server-60660975/devices`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log('🟢 Response status:', response.status, response.ok);
      if (response.ok) {
        console.log('✅ Setting devices:', data.devices);
        setDevices(data.devices || []);
      } else {
        console.error('❌ Error fetching devices:', data);
        toast.error(data.error || 'Failed to fetch devices');
      }
    } catch (error) {
      console.error('❌ Exception fetching devices:', error);
      toast.error('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      console.log('🟢 Fetching organizations from:', `${backendUrl}/make-server-60660975/organizations`);
      const response = await fetch(
        `${backendUrl}/make-server-60660975/organizations`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      console.log('🟢 Response status:', response.status, response.ok);
      const data = await response.json();
      console.log('🟢 Response data:', data);
      
      if (response.ok) {
        console.log('✅ Setting organizations:', data.organizations);
        setOrganizations(data.organizations || []);
      } else {
        console.error('❌ Error fetching organizations:', data);
      }
    } catch (error) {
      console.error('❌ Exception fetching organizations:', error);
    }
  };

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
      if (response.ok) {
        setTechnicians(data.technicians || []);
      }
    } catch (error) {
      console.error('❌ Exception fetching technicians:', error);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchOrganizations();
    fetchTechnicians();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (organizations.length === 0) {
      toast.error('Please add an organization first before adding devices');
      return;
    }

    console.log('Submitting device with data:', formData);

    try {
      const response = await fetch(
        `${backendUrl}/make-server-60660975/devices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
      body: JSON.stringify({
        deviceName: formData.deviceName,
        organizationId: formData.organizationId,
        brandSerialNumber: formData.brandSerialNumber,
        model: formData.model,
        deviceType: formData.deviceType,
          }),
        }
      );

      const data = await response.json();
      console.log('Response:', response.status, data);

      if (!response.ok) {
        console.error('Error creating device:', data.error);
        toast.error(data.error || 'Failed to create device');
        return;
      }

      toast.success('Device created successfully with QR code!');
      setDialogOpen(false);
      setFormData({
        deviceName: '',
        organizationId: '',
        serialNumber: '',
        brandSerialNumber: '',
        model: '',
        deviceType: 'Comprehensive',
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
        `${backendUrl}/make-server-60660975/devices/${editingDevice.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
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
      const newArchivedStatus = !device.is_archived;
      const response = await fetch(
        `${backendUrl}/make-server-60660975/devices/${device.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            deviceName: device.name,
            organizationId: device.organization_id,
            serialNumber: device.serial_number || '',
            brandSerialNumber: (device as any).brand_serial_number || '',
            model: device.model || '',
            status: device.status || 'active',
            deviceType: (device as any).device_type || 'Comprehensive',
            is_archived: newArchivedStatus
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error updating device:', data.error);
        toast.error(data.error || 'Failed to update device');
        return;
      }

      toast.success(newArchivedStatus ? 'Device archived!' : 'Device unarchived!');
      fetchDevices();
    } catch (error) {
      console.error('Error updating device:', error);
      toast.error('Failed to update device');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const openEditDialog = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      deviceName: device.name,
      organizationId: device.organization_id,
      serialNumber: device.serial_number || '',
      brandSerialNumber: (device as any).brand_serial_number || '',
      model: device.model || '',
      deviceType: (device as any).device_type || 'Comprehensive',
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

  const getOrganizationName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    return org ? org.name : 'Unknown';
  };

  const getTechnicianName = (techId: string) => {
    const t = technicians.find(t => t.id === techId);
    return t ? t.name : 'Unknown';
  };

  const activeOrganizations = organizations.filter(org => !org.archived);
  
  // Filter devices based on status, organization archive status and search
  let filteredDevices = devices.filter(device => {
    const deviceOrg = organizations.find(org => org.id === device.organization_id);
    const isOrgArchived = deviceOrg?.archived || false;
    const isDeviceArchived = device.is_archived || false;
    
    if (showArchived) {
      // Show archived devices OR devices from archived organizations
      // Also apply search filter when provided
      if (searchBrandSerial && searchBrandSerial.trim() !== '') {
        return (isDeviceArchived || isOrgArchived) && ((device as any).brand_serial_number || '').toLowerCase().includes(searchBrandSerial.toLowerCase());
      }
      return isDeviceArchived || isOrgArchived;
    } else {
      // Show only active devices from active organizations
      if (searchBrandSerial && searchBrandSerial.trim() !== '') {
        return !isDeviceArchived && !isOrgArchived && ((device as any).brand_serial_number || '').toLowerCase().includes(searchBrandSerial.toLowerCase());
      }
      return !isDeviceArchived && !isOrgArchived;
    }
  });

  // Apply organization filter if set
  if (filterOrgId) {
    filteredDevices = filteredDevices.filter(d => d.organization_id === filterOrgId);
  }

  // Apply sorting
  filteredDevices = filteredDevices.sort((a, b) => {
    let va: string | number = '';
    let vb: string | number = '';
    switch (sortBy) {
      case 'name':
        va = (a.name || '').toLowerCase();
        vb = (b.name || '').toLowerCase();
        break;
      case 'serial':
        va = (a.serial_number || '').toLowerCase();
        vb = (b.serial_number || '').toLowerCase();
        break;
      case 'brand':
        va = ((a as any).brand_serial_number || '').toLowerCase();
        vb = ((b as any).brand_serial_number || '').toLowerCase();
        break;
      case 'created':
      default:
        va = new Date(a.created_at).getTime();
        vb = new Date(b.created_at).getTime();
        break;
    }

    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const openHistory = async (device: Device) => {
    setHistoryDevice(device);
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    try {
      const resp = await fetch(`${backendUrl}/make-server-60660975/maintenance/device/${device.id}` , {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
    const orgName = getOrganizationName(historyDevice.organization_id);

    const rowsHtml = historyRecords.map(r => {
      const statusText = (r.status || 'Yet to Start').toString();
      const st = statusText.toLowerCase();
      const statusCls = st.includes('progress') ? 'status-inprogress' : (st.includes('complete') || st.includes('completed')) ? 'status-completed' : 'status-default';
      return `
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb">${new Date(r.created_at).toLocaleDateString('en-IN')}</td>
        <td style="padding:8px;border:1px solid #e5e7eb">${getTechnicianName(r.technician_id)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb"><span class="${statusCls}">${statusText}</span></td>
        <td style="padding:8px;border:1px solid #e5e7eb">${(r.description || '-').replace(/\n/g, '<br/>')}</td>
      </tr>
    `}).join('');

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

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <style>
            body { font-family: Inter, Arial, Helvetica, sans-serif; padding: 20px; color: #111; background: #fff }
            .top { display:flex; gap:12px; align-items:center }
            /* Logo box */
            .logo { width:72px; height:72px; border-radius:6px; display:inline-block; background:#1e90ff; color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center; font-size:20px }
            .org-title { text-align:center; flex:1 }
            /* Large red uppercase header to match supplied image */
            .org-title .big { font-size:44px; font-weight:800; color: rgb(204,0,0); letter-spacing:2px; text-transform:uppercase }
            .org-title .addr { font-size:16px; font-weight:700; color:#111; margin-top:8px }
            .org-title .contact { font-size:14px; color:#111; margin-top:6px }
            /* thicker separator like the image */
            .sep { height:3px; background:#d1d5db; margin:18px 0; width:100%; }
            /* Watermark (logo) - hidden in preview, shown only when printing */
            .watermark { display:none; }
            @media print {
              .watermark { display:block; position:fixed; left:50%; top:40%; transform:translate(-50%,-50%) rotate(-25deg); width:260px; opacity:0.08; pointer-events:none; z-index:0 }
            }
            /* Report title and org box styling */
            .report-title { text-align:center; margin-top:6px; font-weight:700; font-size:14px; color:#2c3e50 }
            .org-box { background:transparent; padding:8px; border-radius:6px; margin-top:8px; text-align:center; font-weight:700; color:#2563eb }
            .serial-red { color: rgb(204,0,0); font-weight:600 }
            .meta { display:flex; justify-content:space-between; margin-top:8px; font-size:12px; color:#505050 }
            .summary { background:#f1f8e9; padding:12px; border-radius:8px; margin-top:12px }
            table { border-collapse:collapse; width:100%; margin-top:12px }
            th, td { padding:8px; border:1px solid #e5e7eb; text-align:left }
            thead th { background: #1976b8; color: #fff; font-weight:700; padding:10px; }
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
              <div class="" style="color:red;font-size:30px;font-weight:Bold">NATIONAL PROCESS AUTOMATION</div>
              <div class="addr">#48, 4th cross, Ganesha Block, Nandini Layout, Bangalore-560096</div>
              <div class="contact">Ph: 080 23498376, 9900143996 &nbsp; e-mail: tech.npa@gmail.com</div>
              <div class="contact">www.npautomation.in</div>
            </div>
            <!-- Generated date removed per request -->
          </div>
          <div class="sep"></div>

          <!-- Watermark (print-only logo) -->
          <img src="/npa-logo.png" class="watermark" onerror="this.style.display='none'" alt="NPA watermark" />

          <div class="report-title">DEVICE SERVICE REPORT</div>
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
      setTimeout(() => w.print(), 200);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2>Devices</h2>
          <p className="text-gray-600">Manage water dispenser devices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={activeOrganizations.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
              <DialogDescription>Register a new water dispenser device</DialogDescription>
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
              <div className="space-y-2">
                <Label htmlFor="deviceType">Device Type *</Label>
                <Select
                  value={formData.deviceType}
                  onValueChange={(value: string) => handleInputChange('deviceType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Comprehensive">Comprehensive</SelectItem>
                    <SelectItem value="Non Comprehensive">Non Comprehensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organization *</Label>
                <Select
                  value={formData.organizationId}
                  onValueChange={(value: string) => handleInputChange('organizationId', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeOrganizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Label htmlFor="edit-serialNumber">Serial Number</Label>
              <Input
                id="edit-serialNumber"
                value={formData.serialNumber}
                onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                disabled
              />
              <p className="text-xs text-slate-500">Serial numbers are generated automatically and cannot be changed here.</p>
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
            <div className="space-y-2">
              <Label htmlFor="edit-deviceType">Device Type *</Label>
              <Select
                value={formData.deviceType}
                onValueChange={(value: string) => handleInputChange('deviceType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select device type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Comprehensive">Comprehensive</SelectItem>
                  <SelectItem value="Non Comprehensive">Non Comprehensive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-organization">Organization *</Label>
              <Select
                value={formData.organizationId}
                onValueChange={(value: string) => handleInputChange('organizationId', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {activeOrganizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Update Device</Button>
          </form>
        </DialogContent>
      </Dialog>

      {activeOrganizations.length === 0 && (
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="text-2xl">⚠️</div>
              <div>
                <p className="text-yellow-900 font-medium">No Organizations Available</p>
                <p className="text-yellow-700 text-sm">You must add at least one active organization before you can add devices.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-2 border-gray-400">
        <CardHeader className="bg-white border-b-2 border-gray-400 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-slate-100 border border-slate-200">
                <WaterDispenser className="w-5 h-5 text-slate-700" />
              </div>
              <span className="text-slate-900">Devices ({filteredDevices.length})</span>
            </CardTitle>
            <div className="flex items-center gap-3">
              <Input
                id="search-brand-serial"
                placeholder="Search by brand serial no"
                value={searchBrandSerial}
                onChange={(e) => setSearchBrandSerial(e.target.value)}
                className="w-60"
              />
              <select
                value={filterOrgId}
                onChange={(e) => setFilterOrgId(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
                title="Filter by organization"
              >
                <option value="">All Orgs</option>
                {activeOrganizations.map(org => (
                  <option key={org.id} value={org.id}>{org.organization_code || org.name}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border rounded px-2 py-1 text-sm"
                title="Sort by"
              >
                <option value="created">Newest</option>
                <option value="name">Name</option>
                <option value="serial">Serial</option>
                <option value="brand">Brand Serial</option>
              </select>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as any)}
                className="border rounded px-2 py-1 text-sm"
                title="Sort direction"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
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
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-slate-500 text-sm">Loading devices...</p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="text-center py-16">
              <WaterDispenser className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                {showArchived 
                  ? 'No archived devices found.' 
                  : 'No devices found. Add your first device!'}
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
                        {device.serial_number} {((device as any).brand_serial_number ? `•  ${(device as any).brand_serial_number}` : '')} • {getOrganizationName(device.organization_id)}
                        {device.model && ` • ${device.model}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShowQrCode(device.serial_number || '')}
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

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Device QR Code</DialogTitle>
            <DialogDescription>Scan this QR code to identify the device</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrImageUrl && (
              <div className="relative">
                <div className="qr-rainbow-bg absolute inset-0 rounded-2xl opacity-80 blur-xl" />
                <div className="relative rounded-2xl bg-white p-3 shadow-lg">
                  <img id="device-qr-img" src={qrImageUrl} alt="QR Code" className="w-64 h-64" />
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600 text-center break-all">{selectedQrCode}</p>
            <div className="flex gap-3 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Download QR image
                  const link = document.createElement('a');
                  link.href = qrImageUrl;
                  link.download = 'device-qr.png';
                  link.click();
                }}
              >
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Print QR image only
                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.write(`<html><head><title>Print QR</title></head><body style='text-align:center;padding:2em;'><img src='${qrImageUrl}' style='width:300px;height:300px;'/><br/><p style='font-size:12px;margin-top:1em;'>${selectedQrCode}</p></body></html>`);
                    win.document.close();
                    win.focus();
                    win.print();
                  }
                }}
              >
                Print
              </Button>
            </div>
          </div>
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
                    <span className="text-xs">Serial: {historyDevice.serial_number} • Org: {getOrganizationName(historyDevice.organization_id)}</span>
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
                <style>{`.history-table thead th { background:#1976b8; color:#fff; font-weight:700; padding:8px 10px } .history-table td { padding:6px 8px } .history-table tr { height:36px }`}</style>
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
