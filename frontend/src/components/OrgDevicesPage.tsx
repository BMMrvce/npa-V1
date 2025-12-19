import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Package, Search } from 'lucide-react';
import { backendUrl } from '../utils/supabase/info';
import { Input } from './ui/input';

interface OrgDevicesPageProps {
  token: string;
}

interface Device {
  id: string;
  name: string;
  serial_number?: string;
  brand_serial_number?: string;
  status?: string;
  is_archived?: boolean;
  device_type?: string;
  model?: string;
}

export const OrgDevicesPage: React.FC<OrgDevicesPageProps> = ({ token }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDevices();
  }, [token]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/make-server-60660975/org/devices`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to fetch devices');
        return;
      }

      setDevices(data.devices || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter(device => {
    const searchLower = search.toLowerCase();
    return (
      device.name?.toLowerCase().includes(searchLower) ||
      device.serial_number?.toLowerCase().includes(searchLower) ||
      device.brand_serial_number?.toLowerCase().includes(searchLower) ||
      device.model?.toLowerCase().includes(searchLower)
    );
  });

  const activeDevices = filteredDevices.filter(d => !d.is_archived);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="font-bold">My Devices</h2>
        <p className="text-sm text-slate-600">Loading devices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold flex items-center gap-2">
            <Package className="w-5 h-5" />
            My Devices
          </h2>
          <p className="text-gray-600 font-bold">View all your registered devices</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search devices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Devices ({activeDevices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeDevices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No devices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device Name</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Brand Serial</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {device.serial_number || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {device.brand_serial_number || '-'}
                      </TableCell>
                      <TableCell>
                        {device.model && String(device.model).trim() ? String(device.model).trim() : '-'}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const type = device.device_type && String(device.device_type).trim() 
                            ? String(device.device_type).trim() 
                            : 'Comprehensive';
                          return (
                            <Badge variant={type === 'Comprehensive' ? 'default' : 'secondary'}>
                              {type}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={device.status === 'active' ? 'default' : 'secondary'}>
                          {device.status || 'Unknown'}
                        </Badge>
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
