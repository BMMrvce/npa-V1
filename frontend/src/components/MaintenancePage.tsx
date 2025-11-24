import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { Plus, ClipboardList, FileText, Calendar, Download, Redo, ChevronLeft, ChevronRight } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MaintenancePageProps {
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
}


interface Device {
  id: string;
  name: string;
  organization_id: string;
  serial_number?: string;
  model?: string;
  is_archived?: boolean;
  device_type?: string; // 'Comprehensive' | 'Non Comprehensive'
}

interface Technician {
  id: string;
  name: string;
  phone: string;
  email: string;
  code?: string;
  is_archived?: boolean;
}

interface Organization {
  id: string;
  name: string;
  organization_code: string;
  archived?: boolean;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({ token }) => {
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [orgReport, setOrgReport] = useState<MaintenanceRecord[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [bulkOrgId, setBulkOrgId] = useState('');
  const [formData, setFormData] = useState({
    deviceId: '',
    organizationId: '',
    technicianId: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    charges: '',
  });
  const [bulkFormData, setBulkFormData] = useState({
    technicianId: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [bulkDeviceSearch, setBulkDeviceSearch] = useState('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState<string>('');
  const [editingChargesId, setEditingChargesId] = useState<string | null>(null);
  const [editingChargesValue, setEditingChargesValue] = useState<string>('');
  // Pagination for report dialog (page starts at 1)
  const [reportPage, setReportPage] = useState<number>(1);
  const reportPageSize = 10;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Check horizontal overflow for the table and update button visibility
  const updateTableScrollState = () => {
    const el = tableContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollWidth > el.clientWidth && el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  // Helper: returns true if device has an active maintenance (Yet to Start or In Progress)
  const isDeviceUnderActiveMaintenance = (deviceId: string) => {
    return maintenance.some(m => m.device_id === deviceId && m.status && !['Completed', 'Cancelled'].includes(m.status));
  };

  const updateVerticalScrollState = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 0);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  };

  useEffect(() => {
    updateTableScrollState();
    const onResize = () => updateTableScrollState();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [orgReport, reportPage]);

  useEffect(() => {
    updateVerticalScrollState();
    const onResizeV = () => updateVerticalScrollState();
    window.addEventListener('resize', onResizeV);
    return () => window.removeEventListener('resize', onResizeV);
  }, [orgReport, reportPage]);

  const scrollTableBy = (distance: number) => {
    const el = tableContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: distance, behavior: 'smooth' });
    // schedule update after scroll
    setTimeout(updateTableScrollState, 300);
  };

  const scrollReportBy = (distance: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ top: distance, behavior: 'smooth' });
    setTimeout(updateVerticalScrollState, 300);
  };

  // Pagination helpers
  const reportTotalPages = Math.max(1, Math.ceil(orgReport.length / reportPageSize));
  const reportPageRecords = orgReport.slice((reportPage - 1) * reportPageSize, reportPage * reportPageSize);
  const gotoPage = (p: number) => {
    const next = Math.max(1, Math.min(reportTotalPages, p));
    setReportPage(next);
    // refresh scroll state after page change
    setTimeout(() => {
      updateTableScrollState();
      updateVerticalScrollState();
    }, 150);
  };

  const fetchMaintenance = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/maintenance`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error fetching maintenance records:', data.error);
        toast.error(data.error || 'Failed to fetch maintenance records');
        return;
      }

      setMaintenance(data.maintenance || []);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      toast.error('Failed to fetch maintenance records');
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/devices`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/technicians`,
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
  };  const fetchOrganizations = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/organizations`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  useEffect(() => {
    fetchMaintenance();
    fetchDevices();
    fetchTechnicians();
    fetchOrganizations();
  }, [token]);

  // Reset display count whenever a new report is generated or dialog opens
  useEffect(() => {
    // Reset to first page when a new report is generated or dialog opens
    setReportPage(1);
  }, [orgReport, reportDialogOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if technicians exist
    if (technicians.length === 0) {
      toast.error('Cannot schedule maintenance: No technicians available. Please add a technician first.');
      return;
    }

    // Get organization ID from selected device
    const selectedDevice = devices.find((d: { id: any; }) => d.id === formData.deviceId);
    if (!selectedDevice) {
      toast.error('Invalid device selected');
      return;
    }

    // Prevent scheduling if this device already has an active maintenance
    const activeForDevice = maintenance.find(m => m.device_id === selectedDevice.id && m.status && !['Completed', 'Cancelled'].includes(m.status));
    if (activeForDevice) {
      toast.error(`Cannot schedule: device "${selectedDevice.name}" already has an active maintenance (${activeForDevice.status}). Close it first.`);
      return;
    }

    try {
      // Frontend validation for charges: only allow when device is Non Comprehensive
      if (formData.charges && formData.charges !== '') {
        const devType = getDeviceType(formData.deviceId);
        const num = Number(formData.charges);
        if (devType.toLowerCase().trim() !== 'non comprehensive') {
          toast.error('Charges can only be entered for Non Comprehensive devices');
          return;
        }
        if (Number.isNaN(num) || num < 0) {
          toast.error('Charges must be a non-negative number');
          return;
        }
      }
      const response = await fetch(
        `http://localhost:8000/maintenance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            organizationId: formData.organizationId || selectedDevice.organization_id,
            charges: formData.charges && formData.charges !== '' ? parseFloat(String(formData.charges)) : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error creating maintenance record:', data.error);
        toast.error(data.error || 'Failed to create maintenance record');
        return;
      }

      toast.success('Maintenance record created successfully!');
      setDialogOpen(false);
      setFormData({
        deviceId: '',
        organizationId: '',
        technicianId: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
        charges: '',
      });
      fetchMaintenance();
    } catch (error) {
      console.error('Error creating maintenance record:', error);
      toast.error('Failed to create maintenance record');
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedDevices.length === 0) {
      toast.error('Please select at least one device');
      return;
    }

    // Check if technicians exist
    const activeTechs = technicians.filter((t: Technician) => !t.is_archived);
    if (activeTechs.length === 0) {
      toast.error('Cannot schedule maintenance: No active technicians available. Please add a technician first.');
      return;
    }

    // Split selected devices into allowed and blocked by active maintenance
    const blockedDevices = selectedDevices.filter(did => isDeviceUnderActiveMaintenance(did));
    const allowedDevices = selectedDevices.filter(did => !isDeviceUnderActiveMaintenance(did));

    if (blockedDevices.length > 0 && allowedDevices.length === 0) {
      const names = blockedDevices.map(did => getDeviceName(did)).join(', ');
      toast.error(`Cannot schedule: these devices already have active maintenance and must be closed first: ${names}`);
      return;
    }

    try {
      if (blockedDevices.length > 0) {
        const names = blockedDevices.map(did => getDeviceName(did)).join(', ');
        toast.warning(`Skipping devices with active maintenance: ${names}`);
      }
      const response = await fetch(
        `http://localhost:8000/make-server-60660975/maintenance/bulk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            organizationId: bulkOrgId,
            deviceIds: allowedDevices,
            technicianId: bulkFormData.technicianId,
            notes: bulkFormData.notes,
            date: bulkFormData.date,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error creating bulk maintenance records:', data.error);
        toast.error(data.error || 'Failed to create maintenance records');
        return;
      }

      toast.success(`${data.count} maintenance records created successfully!`);
      setBulkDialogOpen(false);
      setBulkOrgId('');
      setSelectedDevices([]);
      setBulkFormData({
        technicianId: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
      });
      fetchMaintenance();
    } catch (error) {
      console.error('Error creating bulk maintenance records:', error);
      toast.error('Failed to create maintenance records');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleGenerateReport = async () => {
    if (!selectedOrgId) {
      toast.error('Please select an organization');
      return;
    }
    if (reportStartDate && reportEndDate && reportStartDate > reportEndDate) {
      toast.error('Start date cannot be after end date');
      return;
    }
    try {
      let url = `http://localhost:8000/make-server-60660975/maintenance/organization/${selectedOrgId}`;
      if (reportStartDate || reportEndDate) {
        const params = [];
        if (reportStartDate) params.push(`start=${reportStartDate}`);
        if (reportEndDate) params.push(`end=${reportEndDate}`);
        url += `?${params.join('&')}`;
      }
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Error fetching organization report:', data.error);
        toast.error(data.error || 'Failed to generate report');
        return;
      }
      // Filter strictly by date range (inclusive)
      let filtered = data.maintenance || [];
      if (reportStartDate || reportEndDate) {
        filtered = filtered.filter((r: { created_at: string }) => {
          const d = r.created_at.split('T')[0];
          if (reportStartDate && d < reportStartDate) return false;
          if (reportEndDate && d > reportEndDate) return false;
          return true;
        });
      }
      // Sort the filtered records by device serial number so reports are ordered by serial
      try {
        filtered.sort((a: any, b: any) => {
          const sa = getDeviceSerial(a.device_id) || '';
          const sb = getDeviceSerial(b.device_id) || '';
          return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: 'base' });
        });
      } catch (e) {
        // if devices not loaded or comparator fails, silently continue without sorting
      }
      setOrgReport(filtered);
      setReportDialogOpen(true);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  const getDeviceName = (deviceId: string) => {
    const device = devices.find((d: { id: string; }) => d.id === deviceId);
    return device ? device.name : 'Unknown';
  };

  const getDeviceSerial = (deviceId: string) => {
    const device = devices.find((d: { id: string; }) => d.id === deviceId) as any;
    return device ? (device.serial_number || '-') : '-';
  };

  const getDeviceBrandSerial = (deviceId: string) => {
    const device = devices.find((d: { id: string; }) => d.id === deviceId) as any;
    return device ? ((device as any).brand_serial_number || '-') : '-';
  };

  const getDeviceType = (deviceId: string) => {
    const device = devices.find((d: any) => d.id === deviceId) as any;
    if (!device) return 'Comprehensive';
    // support multiple property names in case devices come with different keys
    const raw = device.device_type || device.deviceType || device.type || '';
    if (!raw || String(raw).trim() === '') return 'Comprehensive';
    return String(raw);
  };

  const getTechnicianName = (techId: string) => {
    const tech = technicians.find((t: { id: string; }) => t.id === techId);
    return tech ? tech.name : 'Unknown';
  };

  const getOrganizationName = (orgId: string) => {
    const org = organizations.find((o: { id: string; }) => o.id === orgId);
    return org ? org.name : 'Unknown';
  };

  const getOrgDevices = (orgId: string) => {
    return devices.filter((d: { organization_id: string; }) => d.organization_id === orgId);
  };

  const handleDeviceToggle = (deviceId: string) => {
    // Prevent toggling devices that are under active maintenance
    if (isDeviceUnderActiveMaintenance(deviceId)) return;
    setSelectedDevices((prev: string[]) =>
      prev.includes(deviceId)
        ? prev.filter((id: string) => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSelectAllDevices = (orgId: string) => {
    const orgDevices = getOrgDevices(orgId);
    // Only consider devices that are not under active maintenance
    const allowedDevices = orgDevices.filter(d => !isDeviceUnderActiveMaintenance(d.id));
    if (selectedDevices.length === allowedDevices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(allowedDevices.map((d: { id: any; }) => d.id));
    }
  };

  const activeTechnicians = technicians.filter((t: Technician) => !t.is_archived);
  const activeOrganizations = organizations.filter((o: Organization) => !o.archived);
  const [maintenanceOrgFilter, setMaintenanceOrgFilter] = useState('');
  const filteredMaintenance = maintenance.filter((r: { organization_id: string }) =>
    !maintenanceOrgFilter || r.organization_id === maintenanceOrgFilter
  );
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  // sort by date desc (most recent first)
  const sortedMaintenance = [...filteredMaintenance].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const totalPages = Math.max(1, Math.ceil(sortedMaintenance.length / pageSize));
  const paginatedMaintenance = sortedMaintenance.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Ensure currentPage is within valid bounds if filtered length changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages]);

  // Helper to get next maintenance date (90 days after last maintenance)
  function getNextMaintenanceDate(records: any[]): string | null {
    if (!records || records.length === 0) return null;
    // Find latest maintenance date
    const latest = records.reduce((max, r) => {
      const d = new Date(r.created_at);
      return d > max ? d : max;
    }, new Date(records[0].created_at));
    // Add 90 days
    const next = new Date(latest);
    next.setDate(next.getDate() + 90);
    return next.toLocaleDateString('en-IN');
  }

  const totalSelectedCharges = selectedReportIds.length > 0
    ? orgReport.filter(r => selectedReportIds.includes(r.id)).reduce((s, r) => s + (Number((r as any).charges) || 0), 0)
    : orgReport.reduce((s, r) => s + (Number((r as any).charges) || 0), 0);

  const generatePDF = async (recordsOverride?: any[]) => {
    const recordsToPrint = recordsOverride || (selectedReportIds.length > 0
      ? orgReport.filter((r: { id: string }) => selectedReportIds.includes(r.id))
      : orgReport);
    if (!selectedOrgId || recordsToPrint.length === 0) {
      toast.error('No data to generate PDF');
      return;
    }

    try {
      // If records provided may not be ordered; sort by serial no for printable report
      try {
        recordsToPrint.sort((a: any, b: any) => {
          const sa = getDeviceSerial(a.device_id) || '';
          const sb = getDeviceSerial(b.device_id) || '';
          return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: 'base' });
        });
      } catch (e) {
        // ignore sort errors
      }

      // Set A4 landscape explicitly
      const doc = new jsPDF({ format: 'a4', unit: 'mm', orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const orgName = getOrganizationName(selectedOrgId);

      // ========== REPORT HEADING (matches company letterhead) ==========
      // Attempt to load an external PNG logo from the public root (/npa-logo.png).
      // If present, embed it; otherwise fall back to a drawn blue NP box.
      const logoX = 15;
      const logoY = 8;
      const logoW = 36;
      const logoH = 36;

      async function loadImageDataUrl(url: string): Promise<string | null> {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const blob = await res.blob();
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          return null;
        }
      }

      // Try several common public paths for the logo. Place your PNG/SVG at `frontend/public/npa-logo.png` or `npa-logo.svg` so it's served at '/npa-logo.*'
      const candidateUrls = [
        `${window.location.origin}/npa-logo.png`,
        `${window.location.origin}/npa-logo.svg`,
        `/npa-logo.png`,
        `/npa-logo.svg`,
        `${window.location.origin}/public/npa-logo.png`,
        `${window.location.origin}/public/npa-logo.svg`,
        `./npa-logo.png`,
        `./npa-logo.svg`
      ];

      let logoData: string | null = null;
      let resolvedLogoUrl: string | null = null;
      for (const u of candidateUrls) {
        const data = await loadImageDataUrl(u);
        if (data) {
          logoData = data;
          resolvedLogoUrl = u;
          break;
        }
      }

      const hasLogo = !!logoData;
      if (!hasLogo) {
        // Helpful console message for debugging when logo isn't found
        console.warn('NPA logo not found at standard public paths. Checked:', candidateUrls.join(', '));
      }
      if (logoData) {
        try {
          doc.addImage(logoData, 'PNG', logoX, logoY, logoW, logoH);
        } catch (err) {
          // fallback if addImage fails
          doc.setFillColor(11, 116, 209);
          doc.roundedRect(logoX, logoY, logoW, logoH, 2, 2, 'F');
          doc.setFontSize(22);
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.text('NP', logoX + logoW / 2, logoY + logoH / 2 + 5, { align: 'center', baseline: 'middle' });
        }
      } else {
        // Blue square logo background fallback
        doc.setFillColor(11, 116, 209); // NPA blue
        doc.roundedRect(logoX, logoY, logoW, logoH, 2, 2, 'F');
        // White NP letters inside logo
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('NP', logoX + logoW / 2, logoY + logoH / 2 + 5, { align: 'center', baseline: 'middle' });
      }

      // Main title centered. If logo present, center it in the remaining space to the right of the logo
      // Compute available content area to the right of the logo (with a small gap)
      const gapAfterLogo = 8; // mm gap between logo and title area
      const leftContentX = logoX + logoW + gapAfterLogo;
      const rightContentX = pageWidth - 15; // right margin
      const titleCenterX = hasLogo
        ? leftContentX + (rightContentX - leftContentX) / 2
        : pageWidth / 2;

      // Reduce font size a touch so long title fits well
      const titleFontSize = hasLogo ? 20 : 26;
      doc.setFontSize(titleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(204, 0, 0);

      // Place title vertically roughly centered with the logo but a little higher to mirror the sample
      const titleY = logoY + logoH / 2 - (hasLogo ? 2 :4);
      doc.text('NATIONAL PROCESS AUTOMATION', titleCenterX, titleY, { align: 'center' });

      // Address / contact lines centered under title
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(35, 35, 35);
      const addrLines = ['#48, 4th cross, Ganesha Block, Nandini Layout, Bangalore-560096'];
  // Move address up slightly so it sits closer to the title, per user's request
  // Use a very small gap between title and address to tighten spacing
  let ay = titleY + (titleFontSize / 3);
      addrLines.forEach((line) => {
        doc.text(line, titleCenterX, ay, { align: 'center' });
        ay += 6;
      });

      // Contact line with blue email text
      const contactLine = '       Ph: 080 23498376, 9900143996  e-mail: tech.npa@gmail.com';
      // Print the pre-email part
      const contactParts = contactLine.split(' e-mail: ');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(35, 35, 35);
      doc.text(contactParts[0] + ' e-mail: ', pageWidth / 2 - 40, ay, { align: 'left' });
      // Email in blue and underlined (visual only)
      const emailX = pageWidth / 2 - 40 + doc.getTextWidth(contactParts[0] + ' e-mail: ');
      doc.setTextColor(0,0,0);
      doc.text(contactParts[1], emailX, ay, { align: 'left' });
      // Underline email
      const emailWidth = doc.getTextWidth(contactParts[1]);
      // doc.setDrawColor(11, 91, 209);
      // doc.setLineWidth(0.2);
      // doc.line(emailX, ay + 1.5, emailX + emailWidth, ay + 1.5);
      ay += 8;

  // Website centered
  doc.setTextColor(35, 35, 35);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('www.npautomation.in', titleCenterX, ay, { align: 'center' });

  // Thin separator line below header (adjusted to match raised address)
  const sepY = ay + 4;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.6);
      doc.line(15, sepY, pageWidth - 15, sepY);


  // ========== REPORT HEADER ==========
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(44, 62, 80); // Dark gray
  // Place the report title below the separator so it never overlaps
  const reportTitleY = sepY + 10;
  doc.text('MAINTENANCE SERVICE REPORT', pageWidth / 2, reportTitleY, { align: 'center' });
  // Organization Name Box
  doc.setFillColor(236, 240, 241); // Light gray background
  const orgBoxY = reportTitleY + 4;
  doc.roundedRect(15, orgBoxY, pageWidth - 30, 10, 2, 2, 'F');
  // Wrap long organization names to fit inside the page width
  const orgText = orgName ? orgName.toUpperCase() : '';
  const maxOrgWidth = pageWidth - 60; // leave margins
  const orgLines = doc.splitTextToSize(orgText, maxOrgWidth);
  // Choose font size based on number of lines
  const orgFontSize = orgLines.length === 1 ? 16 : orgLines.length === 2 ? 12 : 14;
  doc.setFontSize(orgFontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 91, 209); // NPA blue
  // Draw each line centered inside the org box
  const lineHeight = orgFontSize * 0.6;
  let startY = orgBoxY + 6 - (orgLines.length > 1 ? (lineHeight * (orgLines.length - 1)) / 2 : 0);
  orgLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, startY, { align: 'center' });
    startY += lineHeight;
  });

  // ========== REPORT METADATA ==========
  const metaY = orgBoxY + 14;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      // Report date
      const reportDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      doc.text(`Report Generated: ${reportDate}`, 17, metaY);
      // Report ID
      const reportId = `NPA-MR-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      doc.text(`Report ID: ${reportId}`, pageWidth - 17, metaY, { align: 'right' });

      // ========== SUMMARY SECTION ==========
      const summaryY = metaY + 6;
      doc.setFillColor(241, 248, 233); // Light green background
      doc.roundedRect(15, summaryY, pageWidth - 30, 16, 2, 2, 'F');
      // Summary title
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 62, 80);
      doc.text('REPORT SUMMARY', 18, summaryY + 6);
      // Calculate statistics
      const uniqueDevices = [...new Set(recordsToPrint.map((r: { deviceId: any; }) => r.deviceId))].length;
      const uniqueTechnicians = [...new Set(recordsToPrint.map((r: { technicianId: any; }) => r.technicianId))].length;
      const nextMaintDate = getNextMaintenanceDate(recordsToPrint);
      // Summary stats
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      // Draw Total Records with the value bolded
      const totalLabel = `Total Records: `;
      doc.text(totalLabel, 18, summaryY + 12);
      doc.setFont('helvetica', 'bold');
      doc.text(String(recordsToPrint.length), 18 + doc.getTextWidth(totalLabel), summaryY + 12);
      // Draw Next Maintenance with the value bolded
      doc.setFont('helvetica', 'normal');
      const nextLabelX = 120;
      const nextLabel = `Next Maintenance: `;
      doc.text(nextLabel, nextLabelX, summaryY + 12);
      doc.setFont('helvetica', 'bold');
      doc.text(nextMaintDate || '-', nextLabelX + doc.getTextWidth(nextLabel), summaryY + 12);
      const pdfTotalCharges = recordsToPrint.reduce((s: number, r: any) => s + (Number(r.charges) || 0), 0);
      // Draw total charges in bold on the right side of the summary box for emphasis
      // Use `Rs` instead of the rupee glyph to avoid missing-glyph substitution in builtin PDF fonts.
      doc.setFont('helvetica', 'bold');
      // Start with a comfortable font size and reduce if the text would overflow the summary box
      let totalFontSize = 10;
      let totalText = `Total Charges: Rs ${pdfTotalCharges.toFixed(2)}`;
      // Maximum width we allow for the total text inside the summary box (leave some padding)
      const summaryRightMargin = 15;
      const leftPaddingForSummary = 18; // space used by left-side labels
      const maxTotalWidth = pageWidth - summaryRightMargin - leftPaddingForSummary - 12;
      doc.setFontSize(totalFontSize);
      let tw = doc.getTextWidth(totalText);
      while (tw > maxTotalWidth && totalFontSize > 7) {
        totalFontSize -= 1;
        doc.setFontSize(totalFontSize);
        tw = doc.getTextWidth(totalText);
      }
      // Draw the total right-aligned within the summary box with a small right padding
      const totalX = pageWidth - summaryRightMargin - 3;
      const totalY = summaryY + 12;
      doc.text(totalText, totalX, totalY, { align: 'right' });
      // restore normal font and size
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // ========== MAINTENANCE RECORDS TABLE ==========
      // Prepare table data with serial numbers
      // Move Charges column after Service Note for better readability in PDF
      const tableData = recordsToPrint.map((record: { created_at: string | number | Date; device_id: string; technician_id: string; status: string; description: any; charges?: number }, index: number) => [
        String(index + 1),
        new Date(record.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        getDeviceSerial(record.device_id),
        getDeviceBrandSerial(record.device_id),
        getTechnicianName(record.technician_id),
        record.description || 'Routine maintenance',
        // Use 'Rs' prefix to avoid missing rupee glyph in the embedded PDF font and show decimals clearly
        (record.charges != null ? `Rs ${Number(record.charges).toFixed(2)}` : '-'),
        record.status || 'Yet to Start'
      ]);
      // Compute column widths dynamically to use full content width (page minus margins)
      const leftMargin = 15;
      const rightMargin = 15;
      const contentWidth = pageWidth - leftMargin - rightMargin;
      // Base widths (mm) for fixed columns (charges column moved after notes).
      // Increase Serial No column and reduce row height (smaller font + padding) to fit amounts.
      const col0 = 14;   // # (wider so multi-digit row numbers don't stack)
      const col1 = 20;  // Service Date
      const col2 = 48;  // Serial No (increased width per request)
      const col4 = 26;  // Charges (wide enough for numbers)
      const col7 = 22;  // Status (last column)
      // Technician slightly smaller; Service Note (col6) takes remaining space
      const col3 = 32;  // Brand Serial No (increased slightly)
      const col5 = 28;  // Technician (increased slightly)
      // Service Note takes remaining space but at least 18mm
      const remaining = contentWidth - (col0 + col1 + col2 + col3 + col4 + col5 + col7);
      const col6 = Math.max(18, remaining);

      // Add table using autoTable
      autoTable(doc, {
        startY: summaryY + 18,
          head: [['#', 'Service Date', 'Serial No', 'Brand Serial No', 'Technician', 'Service Note', 'Charges', 'Status']],
          body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [41, 128, 185], // Professional blue
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 3
        },
        bodyStyles: {
          // Slightly smaller font and tighter padding to avoid page overflow
          fontSize: 6.5,
          textColor: [40, 40, 40],
          cellPadding: 2,
          valign: 'middle'
        },
        alternateRowStyles: {
          fillColor: [249, 249, 249]
        },
        // Column indexes changed because Charges moved after Service Note
        columnStyles: {
          0: { cellWidth: col0, halign: 'center', fontStyle: 'bold' }, // #
          1: { cellWidth: col1, halign: 'center' }, // Service Date
          2: { cellWidth: col2, halign: 'center', fontStyle: 'bold' }, // Serial No (bold)
          3: { cellWidth: col3, halign: 'center', fontStyle: 'bold' }, // Brand Serial No (bold)
          4: { cellWidth: col5, halign: 'left' },   // Technician (reuse col5 size)
          5: { cellWidth: col6, halign: 'left' },   // Service Note (remaining)
          6: { cellWidth: col4, halign: 'right', fontStyle: 'bold' },  // Charges (wider, right-aligned, bold)
          7: { cellWidth: col7, halign: 'center', fontStyle: 'bold' } // Status
        },
        // Reserve bottom margin so table won't draw into the footer/certification area
        margin: { left: leftMargin, right: rightMargin, bottom: 36 },
        styles: {
          overflow: 'linebreak',
          cellPadding: 3,
          valign: 'middle',
          lineColor: [220, 220, 220],
          lineWidth: 0.1
        },
        didDrawCell: (data) => {
          // Color code the status column (last column index 7)
          if (data.column.index === 7 && data.section === 'body') {
            const status = data.cell.raw as string;
            let fillColor: [number, number, number] = [249, 249, 249]; // default gray
            let textColor: [number, number, number] = [100, 100, 100];
            
            // Status colors: Yet to Start=Gray, In Progress=Yellow, Completed=Green, Cancelled=Red
            if (status === 'Yet to Start') {
              fillColor = [229, 231, 235]; // gray-200
              textColor = [31, 41, 55]; // gray-800
            } else if (status === 'In Progress') {
              fillColor = [254, 249, 195]; // yellow-100
              textColor = [133, 77, 14]; // yellow-800
            } else if (status === 'Completed') {
              fillColor = [220, 252, 231]; // green-100
              textColor = [22, 101, 52]; // green-800
            } else if (status === 'Cancelled') {
              fillColor = [254, 226, 226]; // red-100
              textColor = [153, 27, 27]; // red-800
            }
            
            // Apply the background color
            doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            
            // Apply the text color and redraw text
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(status, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, {
              align: 'center',
              baseline: 'middle'
            });
          }
        },
        didDrawPage: (data) => {
          // Add repeating watermark pattern
          doc.saveGraphicsState();
          // jsPDF typings for GState can be absent depending on the installed types — use any to avoid TS errors
          try {
            (doc as any).setGState(new (doc as any).GState({ opacity: 0.06 }));
          } catch (e) {
            // If GState or setGState isn't available, silently continue without watermark opacity adjustment
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(40);
          doc.setTextColor(41, 128, 185);
          
          // Single large slanted logo watermark in the center (or fallback to text)
          try {
            const wmW = 120; // watermark width in mm
            const wmH = 120; // watermark height in mm
            const cx = pageWidth / 2;
            const cy = pageHeight / 2;

            if (typeof logoData !== 'undefined' && logoData) {
              try {
                // Try rotating around the center and draw the image
                // doc.rotate accepts an origin option in supported jsPDF versions
                // If rotate isn't available, addImage will still draw unrotated
                if (typeof (doc as any).rotate === 'function') {
                  (doc as any).rotate(25, { origin: [cx, cy] });
                  doc.addImage(logoData, 'PNG', cx - wmW / 2, cy - wmH / 2, wmW, wmH);
                  (doc as any).rotate(0, { origin: [cx, cy] });
                } else {
                  // Fallback: draw unrotated but large
                  doc.addImage(logoData, 'PNG', cx - wmW / 2, cy - wmH / 2, wmW, wmH);
                }
              } catch (e) {
                // If image placement fails, fallback to text watermark
                doc.setFontSize(40);
                doc.setTextColor(200, 200, 200);
                doc.text('NPA®', cx, cy, { align: 'center', angle: 45, baseline: 'middle' });
              }
            } else {
              // No logo loaded: draw large slanted text watermark
              doc.setFontSize(40);
              doc.setTextColor(200, 200, 200);
              doc.text('NPA®', cx, cy, { align: 'center', angle: 45, baseline: 'middle' });
            }
          } catch (err) {
            // On any error, fallback to single text watermark
            const cx = pageWidth / 2;
            const cy = pageHeight / 2;
            doc.setFontSize(40);
            doc.setTextColor(200, 200, 200);
            doc.text('NPA®', cx, cy, { align: 'center', angle: 45, baseline: 'middle' });
          }
          
          doc.restoreGraphicsState();
          
          // Add page footer on each page
          const footerY = pageHeight - 15;
          // Footer line
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(15, footerY - 4, pageWidth - 15, footerY - 4);
          // Footer text
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(120, 120, 120);
          doc.text('National Process Automation | Bengaluru-96', 15, footerY);
          doc.text('Contact: tech.npa@gmail.com | www.npautomation.in', 15, footerY + 4);
          // Page number and generated date handled after table rendering
          // to ensure the total page count is correct. (See post-processing below.)
        }
      });

      // ========== CERTIFICATION SECTION (on last page) ==========
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      if (finalY < pageHeight - 50) {
        // Add certification box with proper sizing
        const boxHeight = 28;
        doc.setDrawColor(41, 128, 185);
        doc.setLineWidth(0.7);
        doc.roundedRect(15, finalY, pageWidth - 30, boxHeight, 2, 2, 'S');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 62, 80);
        doc.text('CERTIFICATION', 18, finalY + 6);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(
          'This report has been automatically generated by NPA Water Dispensers Management System. All maintenance activities have been performed as per standard operating procedures.',
          18,
          finalY + 11,
          { maxWidth: pageWidth - 95 }
        );
        // Signature line
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.3);
        doc.line(pageWidth - 70, finalY + 21, pageWidth - 20, finalY + 21);
        doc.setFontSize(7);
        doc.text('Authorized Signature', pageWidth - 45, finalY + 24, { align: 'center' });
      }

      // Post-process: write page numbers (Page X of N) and generated date
      // after the table is fully rendered so we have the correct total page count.
      const totalPages = doc.getNumberOfPages();
      const genDate = new Date().toLocaleDateString('en-IN');
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const footerY = pageHeight - 15;
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text(`Page ${p} of ${totalPages}`, pageWidth - 15, footerY, { align: 'right' });
        doc.text(`Generated: ${genDate}`, pageWidth - 15, footerY + 4, { align: 'right' });
      }

      // Save the PDF
      const fileName = `NPA_Maintenance_Report_${orgName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('PDF report generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const handleReportSelect = (id: string) => {
    setSelectedReportIds(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  // Update vertical scroll button visibility on scroll (no auto-loading with pagination)
  const handleReportScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setCanScrollUp(target.scrollTop > 0);
    setCanScrollDown(target.scrollTop + target.clientHeight < target.scrollHeight - 1);
  };

  const handleStatusChange = async (recordId: string, newStatus: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/maintenance/${recordId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error updating maintenance status:', data.error);
        toast.error(data.error || 'Failed to update status');
        return;
      }

      toast.success('Status updated successfully!');
      fetchMaintenance();
    } catch (error) {
      console.error('Error updating maintenance status:', error);
      toast.error('Failed to update status');
    }
  };

  const startEditNotes = (record: MaintenanceRecord) => {
    setEditingNotesId(record.id);
    setEditingNotesText(record.description || '');
  };

  const cancelEditNotes = () => {
    setEditingNotesId(null);
    setEditingNotesText('');
  };

  const saveEditNotes = async (recordId: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/maintenance/${recordId}/notes`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ notes: editingNotesText }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error updating notes:', data.error);
        toast.error(data.error || 'Failed to update notes');
        return;
      }

      toast.success('Notes updated successfully!');
      setEditingNotesId(null);
      setEditingNotesText('');
      fetchMaintenance();
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Failed to update notes');
    }
  };

  const startEditCharges = (record: any) => {
    setEditingChargesId(record.id);
    setEditingChargesValue(record.charges != null ? String(record.charges) : '');
  };

  const cancelEditCharges = () => {
    setEditingChargesId(null);
    setEditingChargesValue('');
  };

  const saveEditCharges = async (recordId: string) => {
    const val = editingChargesValue;
    const num = Number(val);
    if (Number.isNaN(num) || num < 0) {
      toast.error('Charges must be a non-negative number');
      return;
    }

    try {
      const resp = await fetch(`http://localhost:8000/maintenance/${recordId}/charges`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ charges: num }),
      });
      // Try to parse JSON response, but fall back to text for non-JSON or empty bodies
      let data: any = null;
      try {
        data = await resp.json();
      } catch (e) {
        try {
          const txt = await resp.text();
          data = { error: txt };
        } catch (ee) {
          data = { error: `HTTP ${resp.status}` };
        }
      }

      if (!resp.ok) {
        console.error('Failed to save charges response:', resp.status, data);
        toast.error(data?.error || `Failed to save charges (status ${resp.status})`);
        return;
      }
      toast.success('Charges updated');
      setEditingChargesId(null);
      setEditingChargesValue('');
      // refresh both maintenance lists and report if open
      fetchMaintenance();
      if (reportDialogOpen) {
        // regenerate report for currently selected org
        if (selectedOrgId) await handleGenerateReport();
      }
    } catch (e) {
      console.error('Error saving charges (network or unexpected):', e);
      toast.error('Failed to save charges. See console for details');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Yet to Start':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2>Maintenance Records</h2>
          <p className="text-gray-600">Track device maintenance activities</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Bulk Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule Organization Maintenance</DialogTitle>
                <DialogDescription>Schedule maintenance for multiple devices at once</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkOrg">Organization *</Label>
                  <Select
                    value={bulkOrgId}
                    onValueChange={(value: any) => {
                      setBulkOrgId(value);
                      setSelectedDevices([]);
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeOrganizations.map((org: { id: any; name: any; }) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {bulkOrgId && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Select Devices *</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectAllDevices(bulkOrgId)}
                      >
                        {selectedDevices.length === getOrgDevices(bulkOrgId).filter(d => !isDeviceUnderActiveMaintenance(d.id)).length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                      <div>
                        <input
                          type="text"
                          value={bulkDeviceSearch}
                          onChange={(e) => setBulkDeviceSearch(e.target.value)}
                          placeholder="Search devices..."
                          className="w-full rounded-md border border-input px-3 py-2 text-sm mb-2"
                        />
                      </div>
                      {getOrgDevices(bulkOrgId).filter(d => {
                        const q = bulkDeviceSearch.toLowerCase();
                        const nameMatch = (d.name || '').toLowerCase().includes(q);
                        const brandMatch = ((d as any).brand_serial_number || '').toLowerCase().includes(q);
                        return q === '' ? true : nameMatch || brandMatch;
                      }).length === 0 ? (
                        <p className="text-sm text-gray-500">No devices found for this organization</p>
                      ) : (
                        getOrgDevices(bulkOrgId)
                          .filter(d => {
                            const q = bulkDeviceSearch.toLowerCase();
                            const nameMatch = (d.name || '').toLowerCase().includes(q);
                            const brandMatch = ((d as any).brand_serial_number || '').toLowerCase().includes(q);
                            return q === '' ? true : nameMatch || brandMatch;
                          })
                          .map((device: { id: string; name: any; }) => (
                            <div key={device.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={device.id}
                                checked={selectedDevices.includes(device.id)}
                                onCheckedChange={() => !isDeviceUnderActiveMaintenance(device.id) && handleDeviceToggle(device.id)}
                                disabled={isDeviceUnderActiveMaintenance(device.id)}
                              />
                              <label
                                htmlFor={device.id}
                                className={isDeviceUnderActiveMaintenance(device.id) ? 'text-sm text-gray-400 cursor-not-allowed flex-1' : 'text-sm cursor-pointer flex-1'}
                              >
                                {device.name}
                                {isDeviceUnderActiveMaintenance(device.id) && <span className="ml-2 text-xs text-yellow-700 font-medium">(Active)</span>}
                              </label>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="bulkTechnician">Technician *</Label>
                  <Select
                    value={bulkFormData.technicianId}
                    onValueChange={(value: any) => setBulkFormData({ ...bulkFormData, technicianId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTechnicians.length === 0 ? (
                        <div className="p-2 text-sm text-red-500">
                          No active technicians available. Please add a technician first.
                        </div>
                      ) : (
                        activeTechnicians.map((tech: { id: any; name: any; }) => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkDate">Date *</Label>
                  <input
                    id="bulkDate"
                    type="date"
                    value={bulkFormData.date}
                    onChange={(e: { target: { value: any; }; }) => setBulkFormData({ ...bulkFormData, date: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    title="Bulk Date"
                    aria-label="Bulk Date"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkNotes">Notes</Label>
                  <Textarea
                    id="bulkNotes"
                    value={bulkFormData.notes}
                    onChange={(e: { target: { value: any; }; }) => setBulkFormData({ ...bulkFormData, notes: e.target.value })}
                    placeholder="Enter maintenance notes..."
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={selectedDevices.length === 0 || activeTechnicians.length === 0}
                >
                  Schedule {selectedDevices.length} Device{selectedDevices.length !== 1 ? 's' : ''}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Maintenance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Maintenance Record</DialogTitle>
                <DialogDescription>Record a maintenance service for a device</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                <div className="space-y-2">
                  <Label htmlFor="orgSelectSingle">Organization *</Label>
                  <Select
                    value={formData.organizationId}
                    onValueChange={(value: string) => {
                      setFormData({ ...formData, organizationId: value, deviceId: '' });
                      setDeviceSearch('');
                    }}
                  >
                    <SelectTrigger id="orgSelectSingle">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeOrganizations.map((org: { id: any; name: any; }) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                  <Label htmlFor="device">Device *</Label>
                  <Select
                    value={formData.deviceId}
                    onValueChange={(value: string) => handleInputChange('deviceId', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-3 py-2">
                        <input
                          type="text"
                          value={deviceSearch}
                          onChange={(e) => setDeviceSearch(e.target.value)}
                          placeholder="Search devices... (name or brand serial)"
                          className="w-full rounded-md border border-input px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {devices
                          .filter((d: any) => {
                            // If organization selected in the single form, limit devices
                            if (formData.organizationId && d.organization_id !== formData.organizationId) return false;
                            const q = deviceSearch.toLowerCase();
                            const nameMatch = (d.name || '').toLowerCase().includes(q);
                            const brandMatch = ((d as any).brand_serial_number || '').toLowerCase().includes(q);
                            return q === '' ? true : nameMatch || brandMatch;
                          })
                          .map((device: { id: any; name: any; }) => (
                            <SelectItem
                              key={device.id}
                              value={device.id}
                              disabled={isDeviceUnderActiveMaintenance(device.id)}
                              className={isDeviceUnderActiveMaintenance(device.id) ? 'text-gray-400' : ''}
                            >
                              {device.name}{isDeviceUnderActiveMaintenance(device.id) ? ' (Active)' : ''}
                            </SelectItem>
                          ))}
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technician">Technician *</Label>
                  <Select
                    value={formData.technicianId}
                    onValueChange={(value: string) => handleInputChange('technicianId', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTechnicians.length === 0 ? (
                        <div className="p-2 text-sm text-red-500">
                          No active technicians available. Please add a technician first.
                        </div>
                      ) : (
                        activeTechnicians.map((tech: { id: any; name: any; }) => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e: { target: { value: string; }; }) => handleInputChange('date', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    title="Date"
                    aria-label="Date"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e: { target: { value: string; }; }) => handleInputChange('notes', e.target.value)}
                    placeholder="Enter maintenance notes..."
                    rows={4}
                  />
                </div>
                {formData.deviceId && getDeviceType(formData.deviceId) === 'Non Comprehensive' && (
                  <div className="space-y-2">
                    <Label htmlFor="charges">Charges (₹)</Label>
                    <input
                      id="charges"
                      type="number"
                      min="0"
                      step="0.01"
                      value={String(formData.charges)}
                      onChange={(e: { target: { value: any; }; }) => handleInputChange('charges', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Enter service charge"
                    />
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={activeTechnicians.length === 0 || isDeviceUnderActiveMaintenance(formData.deviceId) || !formData.organizationId}
                >
                  Create Record
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {activeTechnicians.length === 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="text-orange-600 text-xl">⚠️</div>
              <div>
                <p className="font-medium text-orange-900">No Active Technicians</p>
                <p className="text-sm text-orange-700 mt-1">
                  You need to add at least one technician before you can schedule maintenance.
                  Please go to the Technicians tab to add a technician.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organization Report Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Organization Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="orgSelect">Select Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org: { id: any; name: any; }) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportStartDate">Start Date</Label>
              <input
                id="reportStartDate"
                type="date"
                value={reportStartDate}
                onChange={e => setReportStartDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                title="Start Date"
                aria-label="Start Date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportEndDate">End Date</Label>
              <input
                id="reportEndDate"
                type="date"
                value={reportEndDate}
                onChange={e => setReportEndDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                title="End Date"
                aria-label="End Date"
              />
            </div>
            <Button onClick={handleGenerateReport} disabled={!selectedOrgId}>
              Generate Report
            </Button>
          </div>
          {selectedOrgId && orgReport.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 font-bold">
                Next Maintenance Date: <span className="text-blue-700">{getNextMaintenanceDate(orgReport) || '-'}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            All Maintenance Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-center py-4 text-gray-500">Loading maintenance records...</p>
          )}

          {!loading && maintenance.length === 0 && (
            <p className="text-center py-4 text-gray-500">No maintenance records found. Add your first record!</p>
          )}

          {!loading && maintenance.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-64">
                    <Label htmlFor="maintenanceOrgFilter" className="text-sm">Filter by organization</Label>
                    <Select value={maintenanceOrgFilter} onValueChange={(val: any) => { setMaintenanceOrgFilter(val === 'ALL' ? '' : val); setCurrentPage(1); }}>
                      <SelectTrigger id="maintenanceOrgFilter">
                        <SelectValue placeholder="All organizations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Organizations</SelectItem>
                        {activeOrganizations.map((org: { id: any; name: any; }) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMaintenanceOrgFilter('')}>Clear</Button>
              </div>

              {paginatedMaintenance.length === 0 ? (
                <p className="text-center py-4 text-gray-500">No maintenance records found for the selected organization.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Device</TableHead>
                          <TableHead>Technician</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Charges</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                          {paginatedMaintenance.map((record: { id: any; created_at: string | number | Date; device_id: string; technician_id: string; organization_id: string; status: string; description: any; }) => (
                          <TableRow key={record.id} className="py-2">
                            <TableCell className="py-2 text-sm">{new Date(record.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>{getDeviceName(record.device_id)}</TableCell>
                            <TableCell>{getTechnicianName(record.technician_id)}</TableCell>
                            <TableCell>{getOrganizationName(record.organization_id)}</TableCell>
                            <TableCell className="max-w-[360px]">
                              {editingNotesId === record.id ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editingNotesText}
                                    onChange={(e) => setEditingNotesText(e.target.value)}
                                    rows={3}
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => saveEditNotes(record.id)}>Save</Button>
                                    <Button size="sm" variant="outline" onClick={cancelEditNotes}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-3">
                                  <div className="whitespace-pre-wrap break-words flex-1">
                                    {record.description || '-'}
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => startEditNotes(record as any)}>Edit</Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {editingChargesId === record.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editingChargesValue}
                                    onChange={(e) => setEditingChargesValue(e.target.value)}
                                    aria-label="Edit charges"
                                    className="w-11 rounded-md border px-2 py-1 text-sm"
                                  />
                                  <div className="flex gap-1">
                                    <Button size="sm" onClick={() => saveEditCharges(record.id)}>Save</Button>
                                    <Button size="sm" variant="outline" onClick={cancelEditCharges}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <div className="font-medium">{(record as any).charges != null ? `₹${Number((record as any).charges).toFixed(2)}` : '-'}</div>
                                  {/* Only show edit for Non Comprehensive devices */}
                                  {getDeviceType(record.device_id).toLowerCase().trim() === 'non comprehensive' && (
                                    <Button size="sm" variant="ghost" onClick={() => startEditCharges(record)}>Edit</Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                              <TableCell>
                              <Select
                                value={record.status}
                                onValueChange={(value: string) => handleStatusChange(record.id, value)}
                              >
                                <SelectTrigger className={`w-[140px] ${getStatusColor(record.status)}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Yet to Start" className="bg-gray-100 text-gray-800">Yet to Start</SelectItem>
                                  <SelectItem value="In Progress" className="bg-yellow-100 text-yellow-800">In Progress</SelectItem>
                                  <SelectItem value="Completed" className="bg-green-100 text-green-800">Completed</SelectItem>
                                  <SelectItem value="Cancelled" className="bg-red-100 text-red-800">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Showing {Math.min((currentPage - 1) * pageSize + 1, sortedMaintenance.length)} to {Math.min(currentPage * pageSize, sortedMaintenance.length)} of {sortedMaintenance.length}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`px-2 py-1 rounded ${currentPage === i + 1 ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        {/* constrain dialog and hide outer overflow; inner area will scroll */}
  <DialogContent style={{ width: 'calc(95vw * 1.2)', maxWidth: '70vw' }} className="max-w-[1800px] max-h-[90vh] overflow-hidden rounded-lg">
          <div className="flex flex-col h-full">
            <DialogHeader className="sticky top-0 bg-white z-20 px-6 pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DialogTitle>
                    Organization Report: <span className="text-red-900 org-clamp" title={getOrganizationName(selectedOrgId)}>
                      {getOrganizationName(selectedOrgId)}
                    </span>
                  </DialogTitle>
                  <DialogDescription>View all maintenance records for this organization</DialogDescription>
                </div>
                {orgReport.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generatePDF(orgReport)}
                    className="ml-4"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                )}
              </div>
            </DialogHeader>

            <div>
              <style>{`
                /* Small visible scrollbar for the report dialog */
                .report-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.28) transparent; scrollbar-gutter: stable; }
                .report-scroll::-webkit-scrollbar { width: 8px; }
                .report-scroll::-webkit-scrollbar-track { background: transparent; }
                .report-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.25); border-radius: 8px; }
                .report-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.36); }
                /* Clamp long organization name in the dialog header to two lines */
                .org-clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
              `}</style>

              <div ref={scrollContainerRef} onScroll={handleReportScroll} className="flex-1 report-scroll overflow-auto px-6 pb-6 relative">
              <div className="space-y-4">
                {orgReport.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No maintenance records found for this organization.</p>
                ) : (
                  <>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Total Maintenance Records: <span className="font-semibold">{orgReport.length}</span></p>
                      <p className="text-sm text-gray-600 mt-2">Next Maintenance Date: <span className="font-bold">{getNextMaintenanceDate(orgReport) || '-'}</span></p>
                      <p className="text-sm text-gray-400 ">Total Charges: <span className="font-semibold">{`₹${totalSelectedCharges.toFixed(2)}`}</span></p>
                    </div>

                    <p className="text-sm text-gray-600">Showing <span className="font-semibold">{orgReport.length === 0 ? 0 : (Math.min((reportPage) * reportPageSize, orgReport.length) - (reportPageSize - 1) > orgReport.length ? orgReport.length : (reportPage - 1) * reportPageSize + 1)}</span> to <span className="font-semibold">{Math.min(reportPage * reportPageSize, orgReport.length)}</span> of <span className="font-semibold">{orgReport.length}</span> records. <span className="ml-2">Page <span className="font-semibold">{reportPage}</span> of <span className="font-semibold">{reportTotalPages}</span></span></p>

                    <div className="overflow-x-auto w-full relative">
                      <div ref={tableContainerRef} className="overflow-x-auto">
                        <Table className="min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead></TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Serial No</TableHead>
                            <TableHead>Brand Serial No</TableHead>
                            <TableHead>Charges</TableHead>
                            <TableHead>Device</TableHead>
                            <TableHead>Technician</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportPageRecords.map((record: { id: string; created_at: string | number | Date; device_id: string; technician_id: string; status: string; description: any; }) => (
                            <TableRow key={record.id}>
                              <TableCell>
                                <input type="checkbox" title="Select record" aria-label="Select maintenance record" checked={selectedReportIds.includes(record.id)} onChange={() => handleReportSelect(record.id)} />
                              </TableCell>
                              <TableCell>{new Date(record.created_at).toLocaleDateString('en-IN')}</TableCell>
                              <TableCell>{getDeviceSerial(record.device_id)}</TableCell>
                              <TableCell>{getDeviceBrandSerial(record.device_id)}</TableCell>
                              <TableCell className="text-right">
                                {editingChargesId === record.id ? (
                                  <div className="flex items-center gap-2 justify-end">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={editingChargesValue}
                                      onChange={(e) => setEditingChargesValue(e.target.value)}
                                      aria-label="Edit charges"
                                      className="w-11 rounded-md border px-2 py-1 text-sm"
                                    />
                                    <div className="flex gap-1">
                                      <Button size="sm" onClick={() => saveEditCharges(record.id)}>Save</Button>
                                      <Button size="sm" variant="outline" onClick={cancelEditCharges}>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="font-medium">{(record as any).charges != null ? `₹${Number((record as any).charges).toFixed(2)}` : '-'}</div>
                                    {getDeviceType(record.device_id).toLowerCase().trim() === 'non comprehensive' && (
                                      <Button size="sm" variant="ghost" onClick={() => startEditCharges(record)}>Edit</Button>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>{getDeviceName(record.device_id)}</TableCell>
                              <TableCell>{getTechnicianName(record.technician_id)}</TableCell>
                              <TableCell className="max-w-[360px] whitespace-pre-wrap break-words">{record.description || '-'}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(record.status)}`}>{record.status}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        </Table>
                      </div>

                      {/* horizontal scroll controls */}
                      {canScrollLeft && (
                        <button
                          aria-label="Scroll table left"
                          onClick={() => scrollTableBy(-300)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white border rounded-full p-2 shadow-sm hover:shadow-md"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      )}
                      {canScrollRight && (
                        <button
                          aria-label="Scroll table right"
                          onClick={() => scrollTableBy(300)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white border rounded-full p-2 shadow-sm hover:shadow-md"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}

                    </div>

                    {/* Vertical scroll controls (up/down) positioned relative to the scroll container */}
                    {canScrollUp && (
                      <button
                        aria-label="Scroll up"
                        onClick={() => scrollReportBy(-300)}
                        className="absolute right-4 top-20 bg-white border rounded-full p-2 shadow-sm hover:shadow-md"
                      >
                        <ChevronLeft className="w-4 h-4 transform -rotate-90" />
                      </button>
                    )}
                    {canScrollDown && (
                      <button
                        aria-label="Scroll down"
                        onClick={() => scrollReportBy(300)}
                        className="absolute right-4 bottom-6 bg-white border rounded-full p-2 shadow-sm hover:shadow-md"
                      >
                        <ChevronRight className="w-4 h-4 transform rotate-90" />
                      </button>
                    )}

                    {reportTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-sm text-gray-600">Page <span className="font-semibold">{reportPage}</span> of <span className="font-semibold">{reportTotalPages}</span></div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => gotoPage(reportPage - 1)} disabled={reportPage === 1}>Prev</Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: reportTotalPages }).map((_, i) => (
                              <button
                                key={i}
                                onClick={() => gotoPage(i + 1)}
                                className={`px-2 py-1 rounded ${reportPage === i + 1 ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => gotoPage(reportPage + 1)} disabled={reportPage === reportTotalPages}>Next</Button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end mt-2">
                      <Button variant="outline" size="sm" onClick={() => generatePDF(orgReport.filter((r: { id: string }) => selectedReportIds.includes(r.id)))} disabled={selectedReportIds.length === 0}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Selected PDF
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
