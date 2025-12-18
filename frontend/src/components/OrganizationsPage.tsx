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
import { Plus, Building2, Edit, Eye, Archive, ArchiveRestore, KeyRound } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface OrganizationsPageProps {
  token: string;
  onOrganizationClick?: (organizationId: string) => void;
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

export const OrganizationsPage: React.FC<OrganizationsPageProps> = ({ token, onOrganizationClick }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authOrg, setAuthOrg] = useState<Organization | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authPassword, setAuthPassword] = useState<string | null>(null);
  const [authSaving, setAuthSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchOrg, setSearchOrg] = useState('');
  const [orgSortBy, setOrgSortBy] = useState<'name' | 'code' | 'created'>('name');
  const [orgSortDir, setOrgSortDir] = useState<'asc' | 'desc'>('asc');
  const [formData, setFormData] = useState({
    companyName: '',
    pan: '',
    phoneNo: '',
    email: '',
    gstNo: '',
    address: '',
  });

  const fetchOrganizations = async () => {
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
      
      if (!response.ok) {
        console.error('Error fetching organizations:', data.error);
        toast.error(data.error || 'Failed to fetch organizations');
        return;
      }

      setOrganizations(data.organizations || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Basic GST validation: 15 chars
      const gst = (formData.gstNo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (gst.length !== 15) {
        toast.error('GST number must be exactly 15 characters');
        return;
      }
      
      const sanitizedPayload = {
        ...formData,
        pan: (formData.pan || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
        gstNo: gst,
      };
      
      const response = await fetch(
        `http://localhost:8000/make-server-60660975/organizations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(sanitizedPayload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error creating organization:', data.error);
        toast.error(data.error || 'Failed to create organization');
        return;
      }

      toast.success('Organization created successfully!');
      setDialogOpen(false);
      setFormData({
        companyName: '',
        pan: '',
        phoneNo: '',
        email: '',
        gstNo: '',
        address: '',
      });

      if (data?.credentials?.email && data?.credentials?.password && data?.organization) {
        setAuthOrg(data.organization);
        setAuthEmail(data.credentials.email);
        setAuthUserId(data.organization.auth_user_id || null);
        setAuthPassword(data.credentials.password);
        setAuthDialogOpen(true);
      }
      fetchOrganizations();
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error('Failed to create organization');
    }
  };

  const openAuthDialog = async (org: Organization) => {
    try {
      setAuthOrg(org);
      setAuthPassword(null);
      setAuthUserId(null);
      setAuthEmail('');
      setAuthDialogOpen(true);

      const res = await fetch(
        `http://localhost:8000/make-server-60660975/organizations/${org.id}/auth`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Failed to load org login');
        return;
      }
      setAuthUserId(data.authUserId || null);
      setAuthEmail(data.authEmail || '');
    } catch (e) {
      console.error(e);
      toast.error('Failed to load org login');
    }
  };

  const saveAuthEmail = async () => {
    if (!authOrg) return;
    if (!authEmail || !authEmail.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }

    try {
      setAuthSaving(true);
      const res = await fetch(
        `http://localhost:8000/make-server-60660975/organizations/${authOrg.id}/auth`,
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
      toast.success('Org login updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update email');
    } finally {
      setAuthSaving(false);
    }
  };

  const resetAuthPassword = async () => {
    if (!authOrg) return;
    try {
      setAuthSaving(true);
      const res = await fetch(
        `http://localhost:8000/make-server-60660975/organizations/${authOrg.id}/auth/reset-password`,
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    try {
      // Basic GST validation
      const gst = (formData.gstNo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (gst.length !== 15) {
        toast.error('GST number must be exactly 15 characters');
        return;
      }
      
      const sanitizedPayload = {
        ...formData,
        pan: (formData.pan || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
        gstNo: gst,
      };
      
      const response = await fetch(
        `http://localhost:8000/make-server-60660975/organizations/${editingOrg.id}`,
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
      setEditDialogOpen(false);
      setEditingOrg(null);
      fetchOrganizations();
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization');
    }
  };

  const handleArchiveToggle = async (org: Organization) => {
    try {
      const response = await fetch(
        `http://localhost:8000/make-server-60660975/organizations/${org.id}/archive`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ archived: !org.archived }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error archiving organization:', data.error);
        toast.error(data.error || 'Failed to archive organization');
        return;
      }

      toast.success(org.archived ? 'Organization unarchived!' : 'Organization archived!');
      fetchOrganizations();
    } catch (error) {
      console.error('Error archiving organization:', error);
      toast.error('Failed to archive organization');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'pan') {
      const next = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
      setFormData({ ...formData, pan: next });
      return;
    }
    if (field === 'gstNo') {
      const next = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15);
      setFormData({ ...formData, gstNo: next });
      return;
    }
    setFormData({ ...formData, [field]: value });
  };

  const openEditDialog = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      companyName: org.name,
      pan: org.pan || '',
      phoneNo: org.phone_no || '',
      email: org.email || '',
      gstNo: org.gst_no || '',
      address: org.address || '',
    });
    setEditDialogOpen(true);
  };

  let filteredOrganizations = organizations.filter(org =>
    showArchived ? org.archived : !org.archived
  );

  if (searchOrg && searchOrg.trim() !== '') {
    const q = searchOrg.trim().toLowerCase();
    filteredOrganizations = filteredOrganizations.filter(o => (
      (o.name || '').toLowerCase().includes(q) ||
      (o.organization_code || '').toLowerCase().includes(q) ||
      (o.email || '').toLowerCase().includes(q)
    ));
  }

  filteredOrganizations = filteredOrganizations.sort((a, b) => {
    let va: string | number = '';
    let vb: string | number = '';
    switch (orgSortBy) {
      case 'code':
        va = (a.organization_code || '').toLowerCase();
        vb = (b.organization_code || '').toLowerCase();
        break;
      case 'created':
        va = new Date(a.created_at).getTime();
        vb = new Date(b.created_at).getTime();
        break;
      case 'name':
      default:
        va = (a.name || '').toLowerCase();
        vb = (b.name || '').toLowerCase();
        break;
    }
    if (va < vb) return orgSortDir === 'asc' ? -1 : 1;
    if (va > vb) return orgSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Helper to get next maintenance date (90 days after last maintenance)
  function getNextMaintenanceDate(records: any[]): string | null {
    if (!records || records.length === 0) return null;
    // Find latest maintenance date
    const latest = records.reduce((max, r) => {
      const d = new Date(r.date);
      return d > max ? d : max;
    }, new Date(records[0].date));
    // Add 90 days
    const next = new Date(latest);
    next.setDate(next.getDate() + 90);
    return next.toLocaleDateString('en-IN');
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2>Organizations</h2>
          <p className="text-gray-600">Manage water dispenser organizations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Organization</DialogTitle>
              <DialogDescription>Create a new organization with company details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan">PAN *</Label>
                <Input
                  id="pan"
                  value={formData.pan}
                  onChange={(e) => handleInputChange('pan', e.target.value.toUpperCase())}
                  maxLength={10}
                  placeholder="ABCDE1234F"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNo">Phone Number *</Label>
                <Input
                  id="phoneNo"
                  type="tel"
                  value={formData.phoneNo}
                  onChange={(e) => handleInputChange('phoneNo', e.target.value)}
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
                <Label htmlFor="gstNo">GST Number *</Label>
                <Input
                  id="gstNo"
                  value={formData.gstNo}
                  onChange={(e) => handleInputChange('gstNo', e.target.value.toUpperCase())}
                  maxLength={15}
                  placeholder="22ABCDE1234F1Z5"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">Create Organization</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update organization information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-companyName">Company Name *</Label>
              <Input
                id="edit-companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pan">PAN *</Label>
              <Input
                id="edit-pan"
                value={formData.pan}
                onChange={(e) => handleInputChange('pan', e.target.value.toUpperCase())}
                maxLength={10}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phoneNo">Phone Number *</Label>
              <Input
                id="edit-phoneNo"
                type="tel"
                value={formData.phoneNo}
                onChange={(e) => handleInputChange('phoneNo', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gstNo">GST Number *</Label>
              <Input
                id="edit-gstNo"
                value={formData.gstNo}
                onChange={(e) => handleInputChange('gstNo', e.target.value.toUpperCase())}
                maxLength={15}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">Update Organization</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Org Login Dialog */}
      <Dialog
        open={authDialogOpen}
        onOpenChange={(open: boolean) => {
          setAuthDialogOpen(open);
          if (!open) {
            setAuthOrg(null);
            setAuthEmail('');
            setAuthUserId(null);
            setAuthPassword(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Organization Login</DialogTitle>
            <DialogDescription>
              {authOrg ? `${authOrg.name} (${authOrg.organization_code})` : 'Manage org portal login'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-auth-email">Login Email</Label>
              <Input
                id="org-auth-email"
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="npa001@npa.com "
              />
              {authUserId ? (
                <p className="text-xs text-slate-500">Auth user linked.</p>
              ) : (
                <p className="text-xs text-slate-500">No auth user linked yet (saving will create one).</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={saveAuthEmail} disabled={authSaving || !authOrg}>
                Save Email
              </Button>
              <Button variant="outline" onClick={resetAuthPassword} disabled={authSaving || !authOrg || !authUserId}>
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

      <Card className="shadow-sm border-2 border-gray-400">
        <CardHeader className="bg-white border-b-2 border-gray-400 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-slate-100 border border-slate-200">
                <Building2 className="w-5 h-5 text-slate-700" />
              </div>
              <span className="text-slate-900">Organizations ({filteredOrganizations.length})</span>
            </CardTitle>
            <div className="flex items-center gap-3">
              <Input
                id="search-org"
                placeholder="Search organizations"
                value={searchOrg}
                onChange={(e) => setSearchOrg(e.target.value)}
                className="w-72"
              />
              <select
                title="Sort organizations by"
                value={orgSortBy}
                onChange={(e) => setOrgSortBy(e.target.value as any)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="name">Name</option>
                <option value="code">Code</option>
                <option value="created">Created</option>
              </select>
              <select
                title="Sort direction"
                value={orgSortDir}
                onChange={(e) => setOrgSortDir(e.target.value as any)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
              <Label htmlFor="show-archived" className="text-sm text-slate-600 cursor-pointer select-none">
                Show Archived
              </Label>
              <Switch
                id="show-archived"
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
              <p className="text-slate-500 text-sm">Loading organizations...</p>
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                {showArchived 
                  ? 'No archived organizations found.' 
                  : 'No organizations found. Add your first organization!'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredOrganizations.map((org) => (
                <div 
                  key={org.id} 
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-slate-900 font-bold">{org.name}</h3>
                      <p className="text-xs text-slate-500 font-bold mt-0.5">
                        {org.organization_code || 'N/A'} • {org.archived ? 'Archived' : 'Active'}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {org.email} • {org.phone_no}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {onOrganizationClick && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOrganizationClick(org.id)}
                        className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAuthDialog(org)}
                      className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      title="Organization login"
                    >
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(org)}
                      className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      title="Edit organization"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchiveToggle(org)}
                      className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      title={org.archived ? 'Unarchive' : 'Archive'}
                    >
                      {org.archived ? (
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
    </div>
  );
};
