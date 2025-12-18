import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Building2, Wrench, ClipboardList, TrendingUp, Archive, PieChartIcon } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { WaterDispenser } from './icons/WaterDispenser';

interface DashboardOverviewProps {
  token: string;
  onNavigate: (tab: 'overview' | 'organizations' | 'devices' | 'technicians' | 'maintenance' | 'tickets') => void;
  user?: any;
}

interface Stats {
  totalOrganizations: number;
  activeOrganizations: number;
  archivedOrganizations: number;
  totalDevices: number;
  activeDevices: number;
  archivedDevices: number;
  totalTechnicians: number;
  totalMaintenance: number;
  recentMaintenance: number;
  activeTickets: number;
  // analytics
  maintenanceByDay: number[]; // last 30 days, oldest -> newest
  maintenanceByDayStatus: Record<string, number>[]; // per-day status breakdown
  deviceStatus: { active: number; archived: number };
  orgStatus: { active: number; archived: number };
  maintenanceStatusCounts: Record<string, number>;
}

// Bar chart - vertical bars for the last N days
const BarChart: React.FC<{ data: number[]; color?: string; width?: number; height?: number }> = ({ data, color = '#10b981', width = 420, height = 80 }) => {
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const len = data.length;
  const padding = 8;
  const plotWidth = Math.max(1, width - padding * 2);
  const barGap = Math.max(2, Math.floor(plotWidth / (len * 8)));
  const barTotalWidth = plotWidth / len;
  const barWidth = Math.max(2, Math.floor(barTotalWidth - barGap));

  const onMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - padding;
    const idx = Math.floor(Math.max(0, Math.min(len - 1, x / (plotWidth / len))));
    setHoverIdx(idx);
  };

  const onLeave = () => setHoverIdx(null);

  return (
    <div ref={containerRef} className="relative" onMouseMove={onMove} onMouseLeave={onLeave} style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
        {data.map((v, i) => {
          const x = padding + i * (plotWidth / len) + (barGap / 2);
          const h = Math.round((v / max) * (height - 20));
          const y = height - h - 8;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={h} rx={4} fill={color} opacity={hoverIdx === i ? 1 : 0.9} />
            </g>
          );
        })}
        {hoverIdx !== null && (
          <g pointerEvents="none">
            <rect x={padding + hoverIdx * (plotWidth / len)} y={4} width={barTotalWidth} height={height - 8} fill="#000" opacity={0.02} />
            <text x={padding + hoverIdx * (plotWidth / len) + 8} y={16} fill="#0f172a" fontSize={12} fontWeight={600}>{data[hoverIdx]}</text>
          </g>
        )}
      </svg>
    </div>
  );
};

// Centered stacked horizontal bar for active vs archived
const StackedBarChart: React.FC<{ active: number; archived: number; width?: number; height?: number }> = ({ active, archived, width = 100, height = 150  }) => {
  const total = active + archived || 1;
  const activePct = Math.round((active / total) * 100);
  const activeWidth = Math.max(6, Math.round((active / total) * width));
  const archivedWidth = Math.max(6, width - activeWidth);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width, height, borderRadius: 9999, overflow: 'hidden', background: '#e6e6e6' }}>
        <div style={{ width: `${(active / total) * 100}%`, height: '100%', background: '#10b981', transition: 'width 400ms ease' }} />
      </div>
      <div className="mt-2 text-sm text-center">
        <span className="font-semibold">{active}</span> active • <span className="text-gray-500">{archived}</span> archived
      </div>
    </div>
  );
};

// Line chart for maintenance over the last N days
const LineChart: React.FC<{ data: number[]; dataStatus?: Record<string, number>[]; width?: number; height?: number; color?: string; onHover?: (index: number | null) => void; showTooltip?: boolean }> = ({ data, dataStatus = [], width = 320, height = 160, color = '#10b981', onHover, showTooltip = true }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const [hoverPos, setHoverPos] = React.useState<{ x: number; y: number } | null>(null);

  if (!data || data.length === 0) return <div className="text-sm text-gray-500">No data</div>;
  const padding = 12;
  const w = width;
  const h = height;
  const plotW = Math.max(10, w - padding * 2);
  const plotH = Math.max(10, h - padding * 2);
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = padding + (i / Math.max(1, data.length - 1)) * plotW;
    const y = padding + (1 - v / max) * plotH;
    return { x, y, v };
  });

  // Build path string
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Area path (closed)
  const areaD = `${d} L ${padding + plotW} ${padding + plotH} L ${padding} ${padding + plotH} Z`;

  const onMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    // find nearest point
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dx = Math.abs(p.x - x);
      if (dx < nearestDist) {
        nearestDist = dx;
        nearest = i;
      }
    });
    setHoverIdx(nearest);
    setHoverPos({ x: points[nearest].x, y: points[nearest].y });
    if (onHover) onHover(nearest);
  };

  const onLeave = () => {
    setHoverIdx(null);
    setHoverPos(null);
    if (onHover) onHover(null);
  };

  // statuses order for tooltip
  const statusOrder = ['Yet to Start', 'In Progress', 'Completed', 'Cancelled'];

  return (
    <div ref={containerRef} className="relative" style={{ width: w }} onMouseMove={onMove} onMouseLeave={onLeave}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.14" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#areaGrad)" stroke="none" />
        <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#fff" stroke={color} strokeWidth={1.5} />
        ))}
        {showTooltip && hoverIdx !== null && hoverPos && (
          <g pointerEvents="none">
            <line x1={hoverPos.x} x2={hoverPos.x} y1={padding} y2={h - padding} stroke="#0f172a" strokeWidth={0.6} opacity={0.08} />
          </g>
        )}
      </svg>

      {showTooltip && hoverIdx !== null && hoverPos && (
        <div className="absolute z-20" style={{ left: Math.min(Math.max(0, hoverPos.x + 8), w - 180), top: hoverPos.y - 8 }}>
          <div className="bg-white shadow-lg border rounded-md text-sm p-2 w-44">
            <div className="font-semibold">Day {hoverIdx + 1}</div>
            <div className="mt-1">
              {statusOrder.map((s) => {
                const cnt = (dataStatus[hoverIdx] && dataStatus[hoverIdx][s]) || 0;
                const colorMap: Record<string, string> = {
                  'Yet to Start': '#94a3b8',
                  'In Progress': '#f59e0b',
                  'Completed': '#10b981',
                  'Cancelled': '#ef4444',
                };
                return (
                  <div key={s} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-sm inline-block" style={{ background: colorMap[s] }} />
                      <span className="text-xs text-gray-700">{s}</span>
                    </div>
                    <div className="text-xs font-semibold text-gray-800">{cnt}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact interactive PieChart for status breakdown (lightweight SVG donut)
const PieChart: React.FC<{ counts: Record<string, number>; size?: number; onHover?: (key: string | null) => void; activeKey?: string | null }> = ({ counts = {}, size = 120, onHover, activeKey = null }) => {
  const statusOrder = ['Yet to Start', 'In Progress', 'Completed', 'Cancelled'];
  const colorMap: Record<string, string> = {
    'Yet to Start': '#94a3b8',
    'In Progress': '#f59e0b',
    'Completed': '#10b981',
    'Cancelled': '#ef4444',
  };
  const total = statusOrder.reduce((s, k) => s + (counts[k] || 0), 0) || 1;
  const radius = size / 2;
  const innerRadius = radius * 0.5;
  const [localHover, setLocalHover] = React.useState<string | null>(null);

  // build arcs and mid angles for hover offset
  let startAngle = -Math.PI / 2;
  const slices = statusOrder.map((k) => {
    const value = counts[k] || 0;
    const angle = (value / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    const large = angle > Math.PI ? 1 : 0;
    const x1 = radius + radius * Math.cos(startAngle);
    const y1 = radius + radius * Math.sin(startAngle);
    const x2 = radius + radius * Math.cos(endAngle);
    const y2 = radius + radius * Math.sin(endAngle);
    const mid = startAngle + angle / 2;
    const path = `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;
    return { key: k, value, path, color: colorMap[k] || '#ddd', angle, mid };
  });

  const effectiveHover = activeKey !== null ? activeKey : localHover;

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s) => {
          const isHovered = effectiveHover === s.key;
          // translate outward slightly on hover using mid angle
          const offset = isHovered ? 6 : 0;
          const dx = offset * Math.cos(s.mid);
          const dy = offset * Math.sin(s.mid);
          // use CSS transform for smoother animations (translate + scale)
          const transform = `translate(${dx}px, ${dy}px) scale(${isHovered ? 1.06 : 1})`;
          return (
            <g key={s.key} style={{ transform, transformOrigin: `${radius}px ${radius}px`, transition: 'transform 180ms cubic-bezier(.2,.9,.2,1), opacity 140ms ease' }}>
              <path
                d={s.path}
                fill={s.color}
                opacity={effectiveHover && effectiveHover !== s.key ? 0.35 : 1}
                onMouseEnter={() => { setLocalHover(s.key); onHover && onHover(s.key); }}
                onMouseLeave={() => { setLocalHover(null); onHover && onHover(null); }}
                aria-label={`${s.key}: ${s.value}`}
                role="img"
                style={{ transition: 'opacity 140ms ease' }}
              />
            </g>
          );
        })}
        {/* donut hole to make it look modern */}
        <circle cx={radius} cy={radius} r={innerRadius} fill="#fff" />
      </svg>
      {/* intentionally no center text (user requested removal of '1 items') */}
    </div>
  );
};

// CarouselStatus: alternates between devices view and organizations view every 15s
const CarouselStatus: React.FC<{ stats: Stats }> = ({ stats }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % 2), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full">
      {/* Center the new stacked bar visually */}
      <div className="flex items-center justify-center w-full">
        {index === 0 ? (
          <StackedBarChart active={stats.deviceStatus.active} archived={stats.deviceStatus.archived} width={160} />
        ) : (
          <StackedBarChart active={stats.orgStatus.active} archived={stats.orgStatus.archived} width={160} />
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        <div className={`w-2 h-2 rounded-full ${index === 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        
      </div>
    </div>
  );
};

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ token, onNavigate, user }) => {
  const [stats, setStats] = useState<Stats>({
    totalOrganizations: 0,
    activeOrganizations: 0,
    archivedOrganizations: 0,
    totalDevices: 0,
    activeDevices: 0,
    archivedDevices: 0,
    totalTechnicians: 0,
    totalMaintenance: 0,
    recentMaintenance: 0,
    activeTickets: 0,
    maintenanceByDay: [],
    maintenanceByDayStatus: Array.from({ length: 30 }, () => ({})),
    deviceStatus: { active: 0, archived: 0 },
    orgStatus: { active: 0, archived: 0 },
    maintenanceStatusCounts: {},
  });
  const [loading, setLoading] = useState(true);
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  // compute a formatted date string for the currently selected day (hovered or latest)
  const selectedDayStr = React.useMemo(() => {
    const len = stats.maintenanceByDay && stats.maintenanceByDay.length ? stats.maintenanceByDay.length : 30;
    const idx = (hoveredDayIndex !== null && hoveredDayIndex !== undefined) ? hoveredDayIndex : (len - 1);
    const oldest = new Date();
    oldest.setHours(0, 0, 0, 0);
    oldest.setDate(oldest.getDate() - (len - 1)); // oldest day in the series
    const sel = new Date(oldest);
    sel.setDate(oldest.getDate() + idx);
    return sel.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }, [stats.maintenanceByDay, hoveredDayIndex]);

  // index to display (hovered day or latest)
  const displayDayIndex = (hoveredDayIndex !== null && hoveredDayIndex !== undefined) ? hoveredDayIndex : (stats.maintenanceByDay.length - 1);

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    try {
      // Fetch all data
      const [orgsRes, devicesRes, techsRes, maintRes, ticketsRes] = await Promise.all([
        fetch(`http://localhost:8000/organizations`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`http://localhost:8000/devices`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`http://localhost:8000/technicians`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`http://localhost:8000/maintenance`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`http://localhost:8000/make-server-60660975/tickets`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      const [orgsData, devicesData, techsData, maintData, ticketsData] = await Promise.all([
        orgsRes.json(),
        devicesRes.json(),
        techsRes.json(),
        maintRes.json(),
        ticketsRes.json(),
      ]);

      const organizations = orgsData.organizations || [];
      const devices = devicesData.devices || [];
      const technicians = techsData.technicians || [];
      const maintenance = maintData.maintenance || [];
      const tickets = ticketsData.tickets || [];

      // Calculate stats
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // include today => 30 days

      // Count active devices (not archived and organization is not archived)
      const activeDevicesCount = devices.filter((d: any) => {
        const deviceOrg = organizations.find((o: any) => o.id === d.organization_id);
        return !d.is_archived && !deviceOrg?.archived;
      }).length;

      // Count archived devices (archived OR organization is archived)
      const archivedDevicesCount = devices.filter((d: any) => {
        const deviceOrg = organizations.find((o: any) => o.id === d.organization_id);
        return d.is_archived || deviceOrg?.archived;
      }).length;

      // org counts
      const activeOrgs = organizations.filter((o: any) => !o.archived).length;
      const archivedOrgs = organizations.filter((o: any) => o.archived).length;

      // recent maintenance count (last 30 days)
      const recentMaintenanceCount = maintenance.filter((m: any) => new Date(m.created_at) >= thirtyDaysAgo).length;

      const activeTicketsCount = tickets.filter((t: any) => {
        const s = String(t?.status || '').toLowerCase();
        return s !== 'done';
      }).length;

      // Build maintenanceByDay array (30 days: oldest -> newest)
      const maintenanceByDay: number[] = new Array(30).fill(0);
      const maintenanceByDayStatus: Record<string, number>[] = Array.from({ length: 30 }, () => ({}));
      const maintenanceStatusCounts: Record<string, number> = {};
      for (const m of maintenance) {
        const d = new Date(m.created_at);
        // diff in days from thirtyDaysAgo
        const diffMs = d.setHours(0,0,0,0) - new Date(thirtyDaysAgo).setHours(0,0,0,0);
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 30) {
          maintenanceByDay[diffDays] = (maintenanceByDay[diffDays] || 0) + 1;
          const status = (m.status || 'Unknown').toString();
          maintenanceByDayStatus[diffDays][status] = (maintenanceByDayStatus[diffDays][status] || 0) + 1;
        }
        // status counts (aggregate overall maintenance)
        const statusAll = (m.status || 'Unknown').toString();
        maintenanceStatusCounts[statusAll] = (maintenanceStatusCounts[statusAll] || 0) + 1;
      }

      setStats({
        totalOrganizations: organizations.length,
        activeOrganizations: activeOrgs,
        archivedOrganizations: archivedOrgs,
        totalDevices: devices.length,
        activeDevices: activeDevicesCount,
        archivedDevices: archivedDevicesCount,
        totalTechnicians: technicians.length,
        totalMaintenance: maintenance.length,
        recentMaintenance: recentMaintenanceCount,
        activeTickets: activeTicketsCount,
        maintenanceByDay,
        maintenanceByDayStatus,
        deviceStatus: { active: activeDevicesCount, archived: archivedDevicesCount },
        orgStatus: { active: activeOrgs, archived: archivedOrgs },
        maintenanceStatusCounts,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Organizations',
      value: stats.totalOrganizations,
      subtitle: `${stats.activeOrganizations} active, ${stats.archivedOrganizations} archived`,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
      iconBg: 'bg-blue-600',
      navigateTo: 'organizations' as const,
    },
    {
      title: 'Total Devices',
      value: stats.totalDevices,
      subtitle: `${stats.activeDevices} active, ${stats.archivedDevices} archived`,
      icon: WaterDispenser,
      color: 'text-emerald-600',
      bgColor: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
      iconBg: 'bg-emerald-600',
      navigateTo: 'devices' as const,
    },
    {
      title: 'Total Technicians',
      value: stats.totalTechnicians,
      subtitle: 'Available technicians',
      icon: Wrench,
      color: 'text-orange-600',
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100',
      iconBg: 'bg-orange-600',
      navigateTo: 'technicians' as const,
    },
    {
      title: 'Maintenance Records',
      value: stats.totalMaintenance,
      subtitle: `${stats.recentMaintenance} in last 30 days`,
      icon: ClipboardList,
      color: 'text-purple-600',
      bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100',
      iconBg: 'bg-purple-600',
      navigateTo: 'maintenance' as const,
    },
    {
      title: 'Active Tickets',
      value: stats.activeTickets,
      subtitle: 'Open + In Progress',
      icon: ClipboardList,
      color: 'text-amber-600',
      bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100',
      iconBg: 'bg-amber-600',
      navigateTo: 'tickets' as const,
    },
  ];
  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-6 py-6">
        <div>
          <h2 className="text-lg font-medium">Dashboard Overview</h2>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:flex lg:gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="shadow-sm min-h-20 p-2 lg:flex-1">
              <CardHeader className="pb-1">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-12 mb-1"></div>
                <div className="h-2 bg-gray-200 rounded animate-pulse w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Admin';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-6 py-6">
      {/* Welcome Message */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-semibold">Welcome {userName}!</h1>
        <p className="mt-2 text-gray-600">Monitor your water dispenser management system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:flex lg:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card 
              key={card.title} 
              className={`overflow-hidden border-0 shadow-sm hover:shadow md:shadow-lg transition-all cursor-pointer ${card.bgColor} min-h-12 p-1 lg:flex-1`}
              onClick={() => onNavigate(card.navigateTo)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs text-gray-700">{card.title}</CardTitle>
                  <div className={`p-1.5 rounded-lg ${card.iconBg} shadow-lg`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-lg md:text-xl mb-1 ${card.color} font-semibold`}>{card.value}</div>
                <p className="text-xxs text-gray-500">{card.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dynamic Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm hover:shadow-md transition-shadow min-h-26">
          <CardHeader>
            <CardTitle className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-green-200">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <span>Maintenance</span>
            </CardTitle>
          </CardHeader>
            <CardContent className="space-y-2 p-3">
            <div className="flex flex-col md:flex-row items-right gap-4">
              <div className="flex-1 w-full md:w-auto flex items-center justify-center">
                <div className="relative w-full flex items-center justify-center">
                  {/* decorative water dispenser behind the chart, low opacity */}
                  <div className="hidden md:block absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none opacity-20">
                    <WaterDispenser className="w-24 h-24 text-gray-400" />
                  </div>
                  <div style={{ maxWidth: 420, width: '100%' }}>
                    <LineChart data={stats.maintenanceByDay} dataStatus={stats.maintenanceByDayStatus} width={320} height={160} color="#10b981" showTooltip={false} onHover={(i) => setHoveredDayIndex(i)} />
                  </div>
                </div>
              </div>
              <div className="w-full md:w-36 text-center md:text-right relative z-10">
                <div className="text-lg font-semibold text-green-600">{stats.recentMaintenance}</div>
                <div className="text-sm text-gray-500">in last 30 days</div>
              </div>
            </div>
        
         
          </CardContent>  
        </Card>

        <Card className="relative shadow-sm hover:shadow-md transition-shadow min-h-32">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gray-100">
                <Archive className="w-5 h-5 text-gray-600" />
              </div>
              <span>Day Breakdown</span>
            </CardTitle>
          </CardHeader>
          {/* decorative dispenser icon placed to the left outside the card content area */}
          <div className="hidden md:block absolute -left-10 top-1/2 transform -translate-y-1/2 pointer-events-none opacity-20">
            <WaterDispenser className="w-16 h-16 text-gray-400" />
          </div>
          <CardContent className="p-3">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 flex flex-col items-center">
                {/* Pie chart showing counts for the currently selected day */}
                <div className="mb-2">
                  <PieChart
                    counts={(stats.maintenanceByDayStatus && stats.maintenanceByDayStatus[displayDayIndex]) || {}}
                    size={120}
                    onHover={(k) => setHoveredStatus(k)}
                    activeKey={hoveredStatus}
                  />
                </div>
                {/* small decorative image fallback below pie */}
                <div className="hidden md:block relative w-24 h-12 bg-white rounded overflow-hidden shadow-sm flex items-center justify-center mt-2">
                  <WaterDispenser className="absolute inset-0 m-auto w-16 h-8 text-gray-400 opacity-20" />
                  <img
                    src="/brand-logo.png"
                    alt="dispenser"
                    className="relative z-10 w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600">Selected Day </div>
                <div className="text-sm font-semibold text-gray-800 mb-3">{selectedDayStr}</div>
                <div className="flex flex-col gap-0 items-stretch">
                  {['Yet to Start', 'In Progress', 'Completed', 'Cancelled'].map((s) => {
                    const displayIdx = (hoveredDayIndex !== null && hoveredDayIndex !== undefined) ? hoveredDayIndex : (stats.maintenanceByDay.length - 1);
                    const cnt = (stats.maintenanceByDayStatus && stats.maintenanceByDayStatus[displayIdx] && stats.maintenanceByDayStatus[displayIdx][s]) || 0;
                    const baseMap: Record<string, string> = {
                      'Yet to Start': 'bg-gray-100 text-gray-800 border border-gray-300',
                    'In Progress': 'bg-orange-300 text-yellow-900 border-yellow-400 ',

                      'Completed': 'bg-green-100 text-green-800 border border-green-300',
                      'Cancelled': 'bg-red-200 text-red-900 border border-red-300',
                    };
                    const isHovered = hoveredStatus === s;
                    const hoverClass = isHovered ? 'ring-2 r  ing-offset-1' + (s === 'In Progress' ? ' ring-yellow-40' : s === 'Cancelled' ? ' ring-red-300' : s === 'Completed' ? ' ring-green-300' : ' ring-gray-300') : '';
                    return (
                      <div
                        key={s}
                        className={`flex items-center justify-between px-3 py-2 rounded-md shadow-sm ${hoverClass}`}
                        onMouseEnter={() => setHoveredStatus(s)}
                        onMouseLeave={() => setHoveredStatus(null)}
                        style={{
                          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                          transition: 'transform 180ms cubic-bezier(.2,.9,.2,1), opacity 160ms ease, box-shadow 160ms ease',
                          opacity: (hoveredStatus && hoveredStatus !== s) ? 0.65 : 1,
                          boxShadow: isHovered ? '0 8px 22px rgba(2,6,23,0.06)' : undefined,
                        }}
                      >
                        <div className={`px-3 py-1 rounded-md ${baseMap[s]} font-semibold`}>{s}</div>
                        <div className="ml-3 text-lg font-bold text-gray-800">{cnt}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
