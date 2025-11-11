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
import { Plus, QrCode, Edit, Archive, ArchiveRestore, ClipboardList } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
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
  });

  const fetchDevices = async () => {
    try {
      console.log('🔵 Fetching devices from:', `http://localhost:8000/make-server-60660975/devices`);
      const response = await fetch(
        `http://localhost:8000/make-server-60660975/devices`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      console.log('🔵 Response status:', response.status, response.ok);
      const data = await response.json();
      console.log('🔵 Response data:', data);
      
      if (!response.ok) {
        console.error('❌ Error fetching devices:', data.error);
        toast.error(data.error || 'Failed to fetch devices');
        return;
      }

      console.log('✅ Setting devices:', data.devices);
      setDevices(data.devices || []);
    } catch (error) {
      console.error('❌ Exception fetching devices:', error);
      toast.error('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      console.log('🟢 Fetching organizations from:', `http://localhost:8000/make-server-60660975/organizations`);
      const response = await fetch(
        `http://localhost:8000/make-server-60660975/organizations`,
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
        `http://localhost:8000/make-server-60660975/devices`,
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
        `http://localhost:8000/make-server-60660975/devices/${device.id}`,
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
      const resp = await fetch(`http://localhost:8000/make-server-60660975/maintenance/device/${device.id}` , {
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
            <DialogTitle>Maintenance History{historyDevice ? `: ${historyDevice.name}` : ''}</DialogTitle>
            <DialogDescription>
              {historyDevice ? (
                <span className="text-xs">Serial: {historyDevice.serial_number} • Org: {getOrganizationName(historyDevice.organization_id)}</span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="text-center py-8 text-slate-500">Loading history...</div>
          ) : historyRecords.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No maintenance records found for this device.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
