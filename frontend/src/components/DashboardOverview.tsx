import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Building2, Wrench, ClipboardList, TrendingUp, Archive } from 'lucide-react';
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

// Simple sparkline (30px tall) - accepts an array of numbers (oldest -> newest)
const SparklineChart: React.FC<{ data: number[]; color?: string; width?: number; height?: number }> = ({ data, color = '#10b981', width = 220, height = 48 }) => {
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState<{ left: number; top: number } | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const len = data.length;
  const pointsArr = data.map((d, i) => {
    const x = (i / (len - 1)) * width;
    const y = max === min ? height / 2 : height - ((d - min) / (max - min)) * height;
    return { x, y, v: d };
  });
  const points = pointsArr.map(p => `${p.x},${p.y}`).join(' ');

  const onMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / width));
    const idx = Math.round(ratio * (len - 1));
    setHoverIdx(idx);
    setTooltipPos({ left: Math.min(width - 60, Math.max(4, pointsArr[idx].x)), top: pointsArr[idx].y - 10 });
  };

  const onLeave = () => {
    setHoverIdx(null);
    setTooltipPos(null);
  };

  return (
    <div ref={containerRef} className="relative" onMouseMove={onMove} onMouseLeave={onLeave}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
        <polyline fill="none" stroke={color} strokeWidth={2} points={points} strokeLinecap="round" strokeLinejoin="round" />
        {hoverIdx !== null && (
          <>
            <circle cx={pointsArr[hoverIdx].x} cy={pointsArr[hoverIdx].y} r={4} fill="#fff" stroke={color} strokeWidth={2} />

            {/* SVG tooltip */}
            <g transform={`translate(${pointsArr[hoverIdx].x}, ${Math.max(8, pointsArr[hoverIdx].y - 10)})`} pointerEvents="none">
              <rect x={-28} y={-22} width={56} height={18} rx={4} fill="#0f172a" />
              <text x={0} y={-9} fill="#fff" fontSize={10} fontFamily="Inter, ui-sans-serif, system-ui" textAnchor="middle">{pointsArr[hoverIdx].v}</text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
};

// Simple donut chart using two segments (active vs archived)
const DonutChart: React.FC<{ active: number; archived: number; size?: number }> = ({ active, archived, size = 80 }) => {
  const [hover, setHover] = React.useState(false);
  const total = active + archived || 1;
  const activePct = (active / total) * 100;
  const archivedPct = (archived / total) * 100;
  const radius = (size / 2) - 6;
  const circumference = 2 * Math.PI * radius;
  const activeStroke = (activePct / 100) * circumference;
  const archivedStroke = circumference - activeStroke;

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} className="inline-block">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          {/* archived background arc */}
          <circle r={radius} fill="none" stroke="#e6e6e6" strokeWidth={hover ? 14 : 12} />
          {/* active arc on top */}
          <circle r={radius} fill="none" stroke="#10b981" strokeWidth={hover ? 14 : 12}
            strokeDasharray={`${activeStroke} ${archivedStroke}`} strokeDashoffset={-circumference * 0.25} strokeLinecap="round" transform="rotate(-90)" />
        </g>
      </svg>
      {hover && (
        <div className="text-xs text-gray-600 mt-1 text-center">{active} active • {archived} archived</div>
      )}
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
      <div className="space-y-6">
        <div>
          <h2>Dashboard Overview</h2>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-md">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Admin';

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="mb-8">
        <h1 className="text-4xl">Welcome {userName}!</h1>
      </div>

      <div>
        <h2>Dashboard Overview</h2>
        <p className="text-gray-600">Monitor your water dispenser management system</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card 
              key={card.title} 
              className={`overflow-hidden border-0 shadow-md hover:shadow-lg transition-all cursor-pointer ${card.bgColor}`}
              onClick={() => onNavigate(card.navigateTo)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-gray-700">{card.title}</CardTitle>
                  <div className={`p-2.5 rounded-xl ${card.iconBg} shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl mb-1 ${card.color}`}>
                  {card.value}
                </div>
                <p className="text-xs text-gray-600">{card.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dynamic Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <span>Maintenance (last 30 days)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <SparklineChart data={stats.maintenanceByDay} />
              </div>
              <div className="w-28 text-right">
                <div className="text-lg font-semibold text-green-600">{stats.recentMaintenance}</div>
                <div className="text-xs text-gray-500">in last 30 days</div>
              </div>
            </div>
            <div className="text-xs text-gray-500">Hover or open Maintenance tab for details.</div>

            {/* Maintenance status breakdown badges */}
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(stats.maintenanceStatusCounts || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([status, count]) => {
                  // Friendly mapping for some common statuses
                  const friendly = status === 'Yet to Start' ? 'Pending' :
                                  status.toLowerCase().includes('complete') ? 'Completed' :
                                  status.toLowerCase().includes('in progress') || status.toLowerCase().includes('inprogress') ? 'In Progress' :
                                  status;
                  const colorClass = friendly === 'Completed' ? 'bg-green-100 text-green-700' : friendly === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700';
                  return (
                    <div key={status} className={`px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}>{friendly}: {count}</div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gray-100">
                <Archive className="w-5 h-5 text-gray-600" />
              </div>
              <span>Active vs Archived</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex items-center">
            <div className="flex-shrink-0">
              <DonutChart active={stats.deviceStatus.active + stats.orgStatus.active} archived={stats.deviceStatus.archived + stats.orgStatus.archived} />
            </div>
            <div className="ml-4">
              <div className="text-sm"><span className="font-semibold">Devices:</span> <span className="text-green-600">{stats.deviceStatus.active}</span> active • <span className="text-gray-500">{stats.deviceStatus.archived}</span> archived</div>
              <div className="text-sm mt-2"><span className="font-semibold">Organizations:</span> <span className="text-green-600">{stats.orgStatus.active}</span> active • <span className="text-gray-500">{stats.orgStatus.archived}</span> archived</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
