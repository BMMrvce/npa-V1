import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Wrench, Search, Calendar, Building2 } from 'lucide-react';
import { backendUrl } from '../utils/supabase/info';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface TechMaintenancePageProps {
  token: string;
}

interface MaintenanceRecord {
  id: string;
  device_id: string;
  technician_id: string;
  organization_id: string;
  description: string;
  status: string;
  charges?: number;
  created_at: string;
  updated_at?: string;
}

interface Device {
  id: string;
  name: string;
  serial_number?: string;
  brand_serial_number?: string;
  organization_id: string;
}

interface Organization {
  id: string;
  name: string;
  organization_code: string;
}

export const TechMaintenancePage: React.FC<TechMaintenancePageProps> = ({ token }) => {
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchAll();
  }, [token]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchMaintenance(),
        fetchDevices(),
        fetchOrganizations(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenance = async () => {
    try {
      const response = await fetch(`${backendUrl}/make-server-60660975/tech/maintenance`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = 'Failed to fetch maintenance records';
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          console.error('Non-JSON error response:', errorText);
        }
        toast.error(errorMsg);
        return;
      }

      const data = await response.json();
      setMaintenance(data.maintenance || []);
    } catch (error) {
      console.error('Error fetching maintenance:', error);
      toast.error('Failed to fetch maintenance records');
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch(`${backendUrl}/devices`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await fetch(`${backendUrl}/organizations`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const getDeviceName = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    return device?.name || 'Unknown Device';
  };

  const getDeviceSerial = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    return device?.serial_number || device?.brand_serial_number || 'N/A';
  };

  const getOrganizationName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    return org?.name || 'Unknown';
  };

  const getOrganizationCode = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    return org?.organization_code || 'N/A';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      'Yet to Start': { variant: 'secondary', label: 'Yet to Start' },
      'In Progress': { variant: 'default', label: 'In Progress' },
      'Completed': { variant: 'outline', label: 'Completed' },
      'Cancelled': { variant: 'destructive', label: 'Cancelled' },
    };
    const config = statusMap[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredMaintenance = maintenance.filter(record => {
    const deviceName = getDeviceName(record.device_id).toLowerCase();
    const orgName = getOrganizationName(record.organization_id).toLowerCase();
    const serial = getDeviceSerial(record.device_id).toLowerCase();
    const searchLower = search.toLowerCase();
    
    const matchesSearch = 
      deviceName.includes(searchLower) ||
      orgName.includes(searchLower) ||
      serial.includes(searchLower) ||
      record.description?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="font-bold">My Maintenance Records</h2>
        <p className="text-sm text-slate-600">Loading maintenance records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            My Maintenance Records
          </h2>
          <p className="text-gray-600 font-bold">View all maintenance work assigned to you</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by device, organization, or serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Yet to Start">Yet to Start</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Assigned Maintenance ({filteredMaintenance.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMaintenance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No maintenance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Charges</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaintenance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(record.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{getOrganizationName(record.organization_id)}</span>
                          <span className="text-xs text-gray-500">{getOrganizationCode(record.organization_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {getDeviceName(record.device_id)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {getDeviceSerial(record.device_id)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {record.description || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        {record.charges != null ? (
                          <span className="font-semibold">₹{record.charges.toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
