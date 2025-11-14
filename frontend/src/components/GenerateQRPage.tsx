import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from './ui/button';

interface Device {
  id: string;
  name?: string;
  code?: string;
  serial_number?: string;
  organization_id?: string;
}

interface Organization {
  id: string;
  name?: string;
}

export const GenerateQRPage: React.FC<{ token: string }> = ({ token }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [selectAll, setSelectAll] = useState(true);

  useEffect(() => {
    fetchOrganizations();
    fetchDevices();
  }, [token]);

  // initialize selection whenever devices or selectedOrg change
  useEffect(() => {
    if (!selectedOrg) {
      setSelectedIds({});
      setSelectAll(false);
      return;
    }
    const orgDevices = devices.filter(d => d.organization_id === selectedOrg);
    const sel: Record<string, boolean> = {};
    orgDevices.forEach(d => { sel[d.id] = true; });
    setSelectedIds(sel);
    setSelectAll(orgDevices.length > 0);
  }, [selectedOrg, devices]);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('http://localhost:8000/organizations', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setOrganizations(data.organizations || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch('http://localhost:8000/devices', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error(err);
    }
  };

  const generateQRs = async (): Promise<Record<string, string> | undefined> => {
    // helper: generate QR images for currently selected devices (used as a fallback for printing)
    if (!selectedOrg) return;
    setGenerating(true);
    try {
      const orgDevices = devices.filter(d => d.organization_id === selectedOrg && (selectedIds[d.id] ?? true));
      const map: Record<string, string> = {};
      await Promise.all(orgDevices.map(async (dev) => {
        const content = `${dev.serial_number || dev.code || dev.id}`;
        try {
          const dataUrl = await QRCode.toDataURL(content, { width: 200, margin: 2 });
          map[dev.id] = dataUrl;
        } catch (e) {
          console.error('QR error', e);
        }
      }));
      // merge into existing images so UI previews are preserved
      setQrImages(prev => ({ ...prev, ...map }));
      return map;
    } finally {
      setGenerating(false);
    }
  };

  // auto-generate QR images for all devices in the selected organization (QRs are static)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedOrg) {
        setQrImages({});
        return;
      }
      setGenerating(true);
      const orgDevices = devices.filter(d => d.organization_id === selectedOrg);
      const map: Record<string, string> = {};
      await Promise.all(orgDevices.map(async (dev) => {
        const content = `${dev.serial_number || dev.code || dev.id}`;
        try {
          const dataUrl = await QRCode.toDataURL(content, { width: 200, margin: 2 });
          map[dev.id] = dataUrl;
        } catch (e) {
          console.error('QR error', e);
        }
      }));
      if (!cancelled) setQrImages(map);
      setGenerating(false);
    };
    run();
    return () => { cancelled = true; };
  }, [selectedOrg, devices]);

  const devicesForOrg = devices.filter(d => d.organization_id === selectedOrg);
  // derive selected devices (preserve sort by serial_number asc)
  const selectedDevices = devicesForOrg.filter(d => (selectedIds[d.id] ?? true));
  const selectedDevicesSorted = [...selectedDevices].sort((a, b) => {
    const sa = (a.serial_number || a.code || a.id || '').toString();
    const sb = (b.serial_number || b.code || b.id || '').toString();
    return sa.localeCompare(sb, undefined, { numeric: true });
  });
  // also sort all devices for rendering so deselected devices remain visible
  const devicesForOrgSorted = [...devicesForOrg].sort((a, b) => {
    const sa = (a.serial_number || a.code || a.id || '').toString();
    const sb = (b.serial_number || b.code || b.id || '').toString();
    return sa.localeCompare(sb, undefined, { numeric: true });
  });
  const chunk = <T,>(arr: T[], size: number) => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const pages = chunk(selectedDevicesSorted, 6); // 6 per page (3 columns x 2 rows) to match print layout

  const handlePrint = async () => {
    // ensure QR images are generated
    if (!selectedOrg) return;
    let imageMap: Record<string, string> = qrImages;
    if (Object.keys(qrImages).length === 0) {
      const generated = await generateQRs();
      if (generated) imageMap = generated;
    }

    const org = organizations.find(o => o.id === selectedOrg);
    const printablePages = pages.map((pageDevices) => {
      const itemsHtml = pageDevices.map(dev => {
        const img = imageMap[dev.id] || '';
        // print serial number only per request
        const title = (dev.serial_number || dev.code || dev.id || '').toString();
        return `
          <div class="qr-item">
            <div class="qr-img"><img src="${img}" alt="${title}"/></div>
            <div class="qr-label">${title}</div>
          </div>
        `;
      }).join('\n');

      // include organization name as a header on each printed page
      const headerHtml = `<div class="org-header">${org?.name || ''}</div>`;
      return `<div class="page">${headerHtml}${itemsHtml}</div>`;
    }).join('\n');

    const html = `
      <html>
        <head>
          <title>QR Codes - ${org?.name || ''}</title>
            <style>
            body { font-family: system-ui, -apple-system, 'Arial', Roboto, 'Helvetica Neue', Arial; padding: 20px; }
            /* page grid: header spans full width then items in 3 columns */
            .page { width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; page-break-after: always; grid-auto-rows: min-content; justify-items: center; }
            .org-header { grid-column: 1 / -1; text-align: center; font-size: 28px; font-weight: 800; margin: 8px 0 4px 0; color: #2563eb; }
            .qr-item { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding-top: 8px; }
            /* smaller print QR so layout matches preview */
            .qr-img img { width: 160px; height:160px; object-fit:contain; background: #79bee6ff; padding:4px; }
            .qr-label { margin-top: 10px; font-size: 14px; text-align:center; font-family: 'Segoe UI', Roboto, Arial, sans-serif; }
            @media print { body { margin:0; } .no-print { display:none; } }
          </style>
        </head>
        <body>
          ${printablePages}
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      // Wait a tick for images to load
      setTimeout(() => {
        win.focus();
        win.print();
      }, 500);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl">Generate & Print QR Codes</h2>
          <p className="text-sm text-gray-600">Select an organization and generate printable QR sheets (6 per page, 3 columns × 2 rows).</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button onClick={handlePrint} variant="outline">Print</Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <label htmlFor="org-select" className="text-sm">Organization:</label>
        <select id="org-select" aria-label="Organization" className="border rounded px-3 py-2" value={selectedOrg || ''} onChange={(e) => setSelectedOrg(e.target.value || null)}>
          <option value="">-- Select organization --</option>
          {organizations.map(o => (
            <option key={o.id} value={o.id}>{o.name || o.id}</option>
          ))}
        </select>
        {/* QR images are generated automatically from device info; no manual generate button needed */}
        <div className="flex items-center">
          {generating ? <div className="text-sm text-gray-600">Generating QR images…</div> : null}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <input
            id="select-all"
            type="checkbox"
            checked={selectAll}
            onChange={(e) => {
              const checked = e.target.checked;
              setSelectAll(checked);
              if (!selectedOrg) return;
              const orgDevices = devices.filter(d => d.organization_id === selectedOrg);
              const next: Record<string, boolean> = { ...selectedIds };
              orgDevices.forEach(d => { next[d.id] = checked; });
              setSelectedIds(next);
            }}
          />
          <label htmlFor="select-all" className="text-sm">Select all</label>
        </div>
      </div>

      {/* print styles */}
      <style>{`@media print { .no-print { display: none; } .page { page-break-after: always; } }`}</style>

      <div>
  {devicesForOrgSorted.length === 0 && <div className="text-sm text-gray-500">No devices for selected organization.</div>}

        {/* Compact preview grid: 3 QR cards per row */}
        {devicesForOrgSorted.length > 0 && (
          <div className="bg-white p-4 mb-4 shadow-sm rounded w-full">
            <div className="org-header w-full text-center font-semibold mb-2 text-blue-600 text-xl">{organizations.find(o => o.id === selectedOrg)?.name || ''}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start justify-items-center">
              {devicesForOrgSorted.map(dev => (
                // show all devices (selected or not). deselected items are visible but dimmed and marked
                <div key={dev.id} className={`relative bg-white border rounded p-2 flex flex-col items-center shadow-sm w-full ${!selectedIds[dev.id] ? 'opacity-60 grayscale' : ''}`}>
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-white p-0.5 rounded">
                    <input
                      type="checkbox"
                      aria-label={`Select device ${dev.serial_number || dev.code || dev.id}`}
                      title={`Select device ${dev.serial_number || dev.code || dev.id}`}
                      checked={!!selectedIds[dev.id]}
                      onChange={(e) => {
                        const next = { ...selectedIds, [dev.id]: e.target.checked };
                        setSelectedIds(next);
                        const orgDevices = devices.filter(d => d.organization_id === selectedOrg);
                        const allSelected = orgDevices.every(d => next[d.id]);
                        setSelectAll(allSelected);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-center py-2">
                    {qrImages[dev.id] ? (
                      <img src={qrImages[dev.id]} alt={dev.serial_number || dev.code || dev.name} className="w-28 h-28" />
                    ) : (
                      <div className="text-xs text-gray-400">No QR generated</div>
                    )}
                  </div>

                  <div className="mt-2 text-sm font-semibold text-center">{dev.serial_number}</div>
                  {!selectedIds[dev.id] && (
                    <div className="mt-1 text-xs text-red-600">Not Selected</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateQRPage;
