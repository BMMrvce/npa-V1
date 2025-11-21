import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Button } from './ui/button';

// Helper: normalize any image data URL into a square PNG data URL of `size` px.
// This ensures every QR embedded in PDFs has identical pixel dimensions and margins.
const normalizeQrDataUrl = async (srcDataUrl: string, size = 1000): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        const ratio = Math.min(size / img.width, size / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = (size - w) / 2;
        const y = (size - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        resolve(canvas.toDataURL('image/png', 1));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = srcDataUrl;
  });
};

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

  // Generate higher-resolution QR images for printing/PDF to improve scanner reliability
  const generatePrintQRs = async (devs: Device[], size = 800): Promise<Record<string, string>> => {
    const map: Record<string, string> = {};
    await Promise.all(devs.map(async (dev) => {
      const content = `${dev.serial_number || dev.code || dev.id}`;
      try {
        const dataUrl = await QRCode.toDataURL(content, { width: size, margin: 2 });
        try {
          const norm = await normalizeQrDataUrl(dataUrl, size);
          map[dev.id] = norm;
        } catch (err) {
          console.warn('QR normalization failed, using raw data URL', err);
          map[dev.id] = dataUrl;
        }
      } catch (e) {
        console.error('QR print error', e);
      }
    }));
    return map;
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

      const pages = chunk(selectedDevicesSorted, 12); // 12 per page (4 columns x 3 rows) to match print layout

  const handlePrint = async () => {
    // ensure QR images are generated
    if (!selectedOrg) return;
    let imageMap: Record<string, string> = qrImages;
    // For print, always generate fresh high-resolution images for the selected devices to
    // guarantee consistent output across organizations and avoid mixing preview/resized images.
    const devicesToPrint = selectedDevicesSorted;
    if (devicesToPrint.length > 0) {
      try {
        // fixed size ensures consistency across orgs
        const hiRes = await generatePrintQRs(devicesToPrint, 1000);
        imageMap = hiRes; // use only high-res images for printing/PDF
      } catch (e) {
        console.error('Failed to generate high-res QR images for print', e);
        // fallback: use existing preview images or lower-res generation
        if (Object.keys(qrImages).length === 0) {
          const generated = await generateQRs();
          if (generated) imageMap = generated;
        } else {
          imageMap = qrImages;
        }
      }
    }

    const org = organizations.find(o => o.id === selectedOrg);
    // remove any empty pages (defensive) and prepare printable pages
    const safePages = pages.filter(p => Array.isArray(p) && p.length > 0);
    const printablePages = safePages.map((pageDevices) => {
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
              /* Set default printed page to A4 landscape */
              @page { size: A4 landscape; margin: 8mm; }
              @media print {
                html, body { width: 297mm; height: 210mm; }
                body { margin:0; padding:0; }
                .page { page-break-after: auto; }
                .page:not(:last-child) { page-break-after: always; }
                .no-print { display:none; }
              }
              body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding: 0; margin: 0; }
              /* page grid: header spans full width then items in 4 columns for 12 per page */
              .page { width: 100%; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; grid-auto-rows: min-content; justify-items: center; box-sizing: border-box; height: calc(210mm - 24mm); padding: 12mm 16mm 10mm 16mm; break-inside: avoid; page-break-inside: avoid; -webkit-column-break-inside: avoid; }
              .org-header { grid-column: 1 / -1; text-align: center; font-size: 16px; font-weight: 700; margin: 6px 0 12px 0; color: #1e90ff; text-transform: uppercase; letter-spacing: 1px; justify-self: center; width: 100%; }
              .qr-item { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding-top: 2px; }
              /* slightly larger print QR to reduce gaps and improve scanability (increased by ~20%) */
              .qr-img img { width: 276px; height:276px; object-fit:contain; background: transparent; padding:0; display:block; }
              .qr-label { margin-top: 0px; font-size: 10px; text-align:center; font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #333; }
            </style>
          </head>
          <body>
            ${printablePages}
          </body>
        </html>
      `;

    // Prefer generating a PDF for printing because PDF page breaks are deterministic
    // and avoid browser print-layout quirks that can add a blank page.
    try {
      await generatePdfAndOpenOrPrint(selectedDevicesSorted, imageMap, org?.name || 'QR Codes');
      return;
    } catch (pdfErr) {
      console.warn('PDF generation failed, falling back to HTML print preview', pdfErr);
    }

    // Fallback: use the HTML print preview (consistent WYSIWYG grid)
    const win = window.open('', '_blank');
    if (win) {
      // Embed script that waits for all images to finish loading before printing.
      const htmlWithLoader = html.replace('</body>', `
        <script>
          (function waitImagesAndPrint(){
            function allLoaded() {
              const imgs = Array.from(document.images || []);
              if (imgs.length === 0) return Promise.resolve();
              return Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; })));
            }
            allLoaded().then(() => {
              // give browser a tiny moment to stabilise layout
              setTimeout(() => {
                try { window.focus(); } catch(e){}
                try { window.print(); } catch(e){}
              }, 150);
            });
          })();
        </script>
      </body>`);

      win.document.write(htmlWithLoader);
      win.document.close();
    }
  };

  // Generate a PDF using jsPDF and either open it in a new tab and trigger print,
  // or fall back to prompting a download. This is more reliable across browsers.
  const generatePdfAndOpenOrPrint = async (items: Device[], imageMap: Record<string, string>, orgName: string) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 8; // mm
    const availW = pageWidth - margin * 2;
    const availH = pageHeight - margin * 2;
    const cols = 4;
    const rows = 3;
    const gap = 8; // mm
      const headerH = 24; // mm - fixed header zone for organization name (increase slightly for longer names)
    const cellW = (availW - gap * (cols - 1)) / cols;
    const cellH = (availH - headerH - gap * (rows - 1)) / rows;

    // Determine a single square image size that fits within the cell
      // increase allowed PDF QR size by ~20%
      const imageMaxW = Math.min(96, cellW - 10); // allow a bit larger QR in PDF
      const imageMaxH = Math.min(96, cellH - 18);
    const imageSize = Math.min(imageMaxW, imageMaxH); // ensure square and uniform across pages/orgs

    // chunk items into pages of cols*rows
    const pages = [] as Device[][];
    for (let i = 0; i < items.length; i += cols * rows) pages.push(items.slice(i, i + cols * rows));

    for (let p = 0; p < pages.length; p++) {
      if (p > 0) doc.addPage();
      // header
        // header - render organization name inside a fixed header zone using wrapping
        doc.setTextColor(37, 99, 235);
        // Choose an initial font size (prefer fixed for uniformity) and wrap into lines that fit the page width
        let headerFontSize = 12;
        doc.setFontSize(headerFontSize);
        const maxHeaderWidth = availW - 10; // leave small side padding
        let headerLines = doc.splitTextToSize(orgName || '', maxHeaderWidth);
        // If the wrapped lines exceed headerH, reduce font size until they fit or reach minimum
        while ((headerLines.length * (headerFontSize * 0.6)) > headerH && headerFontSize > 9) {
          headerFontSize -= 1;
          doc.setFontSize(headerFontSize);
          headerLines = doc.splitTextToSize(orgName || '', maxHeaderWidth);
        }
        doc.setFontSize(headerFontSize);
        doc.setFont('helvetica', 'bold');
        // compute vertical start inside headerH to vertically center the block of text
        const lineHeight = headerFontSize * 0.6;
        let startY = margin + (headerH / 2) - ((headerLines.length - 1) * lineHeight) / 2 + (headerFontSize * 0.3);
        headerLines.forEach((line: string) => {
          doc.text(line, pageWidth / 2, startY, { align: 'center' });
          startY += lineHeight;
        });

      const pageItems = pages[p];
      for (let idx = 0; idx < pageItems.length; idx++) {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        const x = margin + col * (cellW + gap);
        const y = margin + headerH + row * (cellH + gap);

        const dev = pageItems[idx];
        const img = imageMap[dev.id] || '';
            if (img) {
          try {
                const imgW = imageSize;
                const imgH = imageSize;
                const imgX = x + (cellW - imgW) / 2;
                const imgY = y + (cellH - imgH) / 2 - 6; // center vertically with small top bias
                doc.addImage(img, 'PNG', imgX, imgY, imgW, imgH);
          } catch (e) {
            console.error('addImage error', e);
          }
        }

        // label
        const label = (dev.serial_number || dev.code || dev.id || '').toString();
        doc.setFontSize(9);
        const labelX = x + cellW / 2;
        const labelY = y + (imageSize || 40) + (cellH - imageSize) / 2 + 2;
        doc.setTextColor(51, 51, 51);
        doc.text(label, labelX, labelY, { align: 'center', maxWidth: cellW - 4 });
      }
    }

    // Try to open in new tab and print
    try {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) {
        // some browsers block auto-print on blob URLs — attempt it
        setTimeout(() => { try { w.print(); } catch (e) { /* ignore */ } }, 700);
        return;
      }
    } catch (e) {
      console.error('Failed to open PDF blob', e);
    }

    // fallback: trigger download
    doc.save(`${orgName || 'qr-codes'}.pdf`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl">Generate & Print QR Codes</h2>
          <p className="text-sm text-gray-600">Select an organization and generate printable QR sheets (12 per page, 4 columns × 3 rows).</p>
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
      <style>{`@media print { .no-print { display: none; } html, body { width: 297mm; height: 210mm; } body { margin:0; padding:0; background: #fff } .page { page-break-after: auto; break-inside: avoid; page-break-inside: avoid; -webkit-column-break-inside: avoid; box-sizing: border-box; height: calc(210mm - 24mm); padding: 12mm 16mm 10mm 16mm; } .page:not(:last-child) { page-break-after: always; } .org-header { text-transform: uppercase; letter-spacing: 1px; color:#1e90ff; font-weight:700; justify-self: center; width:100%; text-align:center; } .qr-img img { width:192px; height:192px } .qr-label { font-size:10px; margin-top:0px } }`}</style>

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
                      <img src={qrImages[dev.id]} alt={dev.serial_number || dev.code || dev.name} style={{ width: '134px', height: '134px' }} />
                    ) : (
                      <div className="text-xs text-gray-400">No QR generated</div>
                    )}
                  </div>

                  <div className="mt-1 text-sm font-semibold text-center">{dev.serial_number}</div>
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
