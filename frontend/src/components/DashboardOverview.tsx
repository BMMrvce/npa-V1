import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Building2, Wrench, ClipboardList, TrendingUp, Archive, PieChartIcon } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { WaterDispenser } from './icons/WaterDispenser';

interface DashboardOverviewProps {
  token: string;
  onNavigate: (tab: 'overview' | 'organizations' | 'devices' | 'technicians' | 'maintenance') => void;
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
  // analytics
  maintenanceByDay: number[]; // last 30 days, oldest -> newest
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

// Pie chart for maintenance status breakdown
const PieChart: React.FC<{ counts: Record<string, number>; size?: number }> = ({ counts, size = 100 }) => {
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  if (entries.length === 0) return <div className="text-sm text-gray-500">No data</div>;
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const colors = ['#10b981', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4'];
  let angle = 0;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  const paths = entries.map(([k, v], i) => {
    const portion = v / total;
    const start = angle;
    const end = angle + portion * Math.PI * 2;
    const x1 = cx + r * Math.cos(start - Math.PI / 2);
    const y1 = cy + r * Math.sin(start - Math.PI / 2);
    const x2 = cx + r * Math.cos(end - Math.PI / 2);
    const y2 = cy + r * Math.sin(end - Math.PI / 2);
    const large = end - start > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    angle = end;
    return { d, color: colors[i % colors.length], label: k, value: v };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth={1} />
        ))}
      </svg>
      <div className="mt-2 text-xs text-center">
        {entries.slice(0, 3).map(([k, v], i) => (
          <div key={k} className="flex items-center gap-2 justify-center">
            <span className="w-2 h-2 inline-block" style={{ background: colors[i % colors.length] }} />
            <span className="text-xs text-gray-600">{k}: <span className="font-semibold text-gray-800">{v}</span></span>
          </div>
        ))}
      </div>
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
    maintenanceByDay: [],
    deviceStatus: { active: 0, archived: 0 },
    orgStatus: { active: 0, archived: 0 },
    maintenanceStatusCounts: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    try {
      // Fetch all data
      const [orgsRes, devicesRes, techsRes, maintRes] = await Promise.all([
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
      ]);

      const [orgsData, devicesData, techsData, maintData] = await Promise.all([
        orgsRes.json(),
        devicesRes.json(),
        techsRes.json(),
        maintRes.json(),
      ]);

      const organizations = orgsData.organizations || [];
      const devices = devicesData.devices || [];
      const technicians = techsData.technicians || [];
      const maintenance = maintData.maintenance || [];

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

      // Build maintenanceByDay array (30 days: oldest -> newest)
      const maintenanceByDay: number[] = new Array(30).fill(0);
      const maintenanceStatusCounts: Record<string, number> = {};
      for (const m of maintenance) {
        const d = new Date(m.created_at);
        // diff in days from thirtyDaysAgo
        const diffMs = d.setHours(0,0,0,0) - new Date(thirtyDaysAgo).setHours(0,0,0,0);
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 30) {
          maintenanceByDay[diffDays] = (maintenanceByDay[diffDays] || 0) + 1;
        }
        // status counts (aggregate overall maintenance)
        const status = (m.status || 'Unknown').toString();
        maintenanceStatusCounts[status] = (maintenanceStatusCounts[status] || 0) + 1;
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
        maintenanceByDay,
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
  ];
  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-6 py-6">
        <div>
          <h2 className="text-lg font-medium">Dashboard Overview</h2>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-sm min-h-20 p-2">
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

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card 
              key={card.title} 
              className={`overflow-hidden border-0 shadow-sm hover:shadow md:shadow-lg transition-all cursor-pointer ${card.bgColor} min-h-12 p-1`}
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
              <div className="flex-1 w-full md:w-auto">
                <PieChart counts={stats.maintenanceStatusCounts} size={160} />
              </div>
              <div className="w-full md:w-36 text-center md:text-right relative z-10">
                <div className="text-lg font-semibold text-green-600">{stats.recentMaintenance}</div>
                <div className="text-sm text-gray-500">in last 30 days</div>
              </div>
            </div>
        
         
          </CardContent>  
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow min-h-32">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gray-100">
                <Archive className="w-5 h-5 text-gray-600" />
              </div>
              <span>Active vs Archived</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 flex items-center justify-center">
            <CarouselStatus stats={stats} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
