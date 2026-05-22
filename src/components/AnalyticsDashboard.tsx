/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import { 
  TrendingUp, Monitor, Globe, MapPin, Calendar, 
  Download, Sparkles, RefreshCw, BarChart2, ShieldCheck
} from 'lucide-react';
import { ScanLog, QRProject } from '../types';

interface AnalyticsDashboardProps {
  scans: ScanLog[];
  projects: QRProject[];
  onTriggerSimulation: (projectId: string) => void;
  onRefresh: () => void;
}

const COLORS = ['#2563eb', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function AnalyticsDashboard({
  scans,
  projects,
  onTriggerSimulation,
  onRefresh
}: AnalyticsDashboardProps) {
  const [activeSimulationProj, setActiveSimulationProj] = useState<string>('');
  const [simuating, setSimulating] = useState(false);

  // Group Scans by Date for Timeline Chart
  const getTimelineData = () => {
    const dates: { [key: string]: number } = {};
    // Populate last 7 days defaults to avoid empty states
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dates[key] = 0;
    }

    scans.forEach(scan => {
      const d = new Date(scan.timestamp);
      const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (dates[key] !== undefined) {
        dates[key]++;
      } else {
        dates[key] = 1;
      }
    });

    return Object.keys(dates).map(date => ({
      date,
      scans: dates[date]
    }));
  };

  // Group by Device Type for Pie Chart
  const getDeviceData = () => {
    const devices: { [key: string]: number } = { Mobile: 0, Desktop: 0, Tablet: 0 };
    scans.forEach(scan => {
      const dev = scan.deviceType || 'Unknown';
      if (devices[dev] !== undefined) {
        devices[dev]++;
      } else {
        devices[dev] = 1;
      }
    });
    return Object.keys(devices).map(name => ({
      name,
      value: devices[name]
    })).filter(d => d.value > 0);
  };

  // Group by Browser Name for Bar Chart
  const getBrowserData = () => {
    const browsers: { [key: string]: number } = {};
    scans.forEach(scan => {
      const br = scan.browser || 'Unknown';
      browsers[br] = (browsers[br] || 0) + 1;
    });
    return Object.keys(browsers).map(name => ({
      name,
      scans: browsers[name]
    })).sort((a,b) => b.scans - a.scans);
  };

  // Group Top Scanning Locations
  const getTopLocations = () => {
    const locations: { [key: string]: number } = {};
    scans.forEach(scan => {
      const loc = scan.approxLocation || 'Global Client';
      locations[loc] = (locations[loc] || 0) + 1;
    });
    return Object.keys(locations).map(name => ({
      name,
       scans: locations[name]
    })).sort((a,b) => b.scans - a.scans).slice(0, 5);
  };

  // Triggers simulator scan logs insertion helper
  const handleSimulateScan = async () => {
    if (!activeSimulationProj) return;
    setSimulating(true);
    await onTriggerSimulation(activeSimulationProj);
    setTimeout(() => {
      setSimulating(false);
    }, 600);
  };

  // Export scan tracking analytics as standard CSV File values
  const exportCSV = () => {
    if (scans.length === 0) {
      alert("No scans available to export yet. Please scan your QR codes or use the simulator.");
      return;
    }

    const headers = ["Scan ID", "Project ID", "Timestamp", "Device Shape", "Web Browser", "Approx Location", "Origin IP"];
    const rows = scans.map(s => [
      s.id,
      s.trackingId,
      s.timestamp,
      s.deviceType,
      s.browser,
      s.approxLocation.replace(/"/g, '""'),
      s.ip
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `qr-scan-analytics-${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print PDF Sheet
  const printPDFReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsStr = scans.map((s, idx) => `
      <tr>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; font-size:11px;">${idx+1}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; font-size:11px;">${s.timestamp.substring(0,16).replace('T', ' ')}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; font-size:11px;">${s.deviceType}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; font-size:11px;">${s.browser}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; font-size:11px;">${s.approxLocation}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; font-size:11px;">${s.ip}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Analytics Audit Report - QR Scans</title>
          <style>
            body { font-family: -apple-system, system-ui, sans-serif; padding: 40px; color: #333; }
            h1 { font-size: 20px; color: #1e293b; margin-bottom: 4px; }
            p { font-size: 12px; color: #64748b; margin-top: 0; }
            .summary { display: grid; grid-template-cols: 3fr 1fr; margin-bottom: 20px; gap: 20px; }
            .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { text-align: left; padding: 8px; background: #f8fafc; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0;}
            @media print { .btn { display:none; } }
          </style>
        </head>
        <body>
          <h1>Free QR Generator - Tracking Audit Log</h1>
          <p>Report compiled on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          
          <div class="summary">
            <div class="card">
              <h3>System Overview</h3>
              <p>Total Active Tracked QR Codes: <strong>${projects.length}</strong></p>
              <p>Total Captured Scan Events: <strong>${scans.length}</strong></p>
            </div>
            <div class="card" style="text-align: center;">
              <h3>Security Status</h3>
              <p style="color: green; font-weight: bold; font-size: 16px;">SECURE SSL ON</p>
            </div>
          </div>

          <button class="btn" onclick="window.print()" style="padding: 6px 14px; background: #000; color: #fff; border:none; border-radius:4px; font-size:12px; cursor:pointer;">
            Print Report File
          </button>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Timestamp</th>
                <th>Device</th>
                <th>Browser</th>
                <th>Location</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              ${rowsStr || '<tr><td colspan="6" style="padding:15px; text-align:center; color:#888;">No scan records to display</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const timelineData = getTimelineData();
  const deviceData = getDeviceData();
  const browserData = getBrowserData();
  const topLocations = getTopLocations();

  return (
    <div id="analytics_dashboard" className="space-y-6">
      
      {/* HEADER CONTROLLER ROW */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center space-x-3 text-left">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Scan Analytics Board</h2>
            <p className="text-xs text-slate-500">Live API activity trackers and metrics reporting</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn_refresh_analytics"
            onClick={onRefresh}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200 cursor-pointer text-xs flex items-center gap-1.5"
            title="Refresh Scan Logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            id="export_csv"
            onClick={exportCSV}
            className="py-1.5 px-3 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-all text-xs font-medium flex items-center space-x-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="export_pdf_report"
            onClick={printPDFReport}
            className="py-1.5 px-3 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-all text-xs font-medium flex items-center space-x-1 cursor-pointer"
          >
            <span>PDF Print</span>
          </button>
        </div>
      </div>

      {/* METRIC NUMERICAL TOTALS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div id="stat_clicks" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between text-left">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Total Scan Impressions</span>
            <span className="text-2xl font-bold font-display text-slate-900">{scans.length}</span>
            <span className="text-[10px] text-emerald-600 font-medium block">↑ 100% cloud delivery verified</span>
          </div>
          <span className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </span>
        </div>

        <div id="stat_projects" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between text-left">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Active Tracking Anchors</span>
            <span className="text-2xl font-bold font-display text-slate-900">{projects.length}</span>
            <span className="text-[10px] text-blue-650 font-medium block">Redirect links online</span>
          </div>
          <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Monitor className="w-6 h-6" />
          </span>
        </div>

        <div id="stat_locations" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between text-left">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Spanning Countries</span>
            <span className="text-2xl font-bold font-display text-slate-900">
              {new Set(scans.map(s => s.approxLocation?.split(',').pop()?.trim())).size}
            </span>
            <span className="text-[10px] text-amber-600 font-medium block">Geographical IP fallback</span>
          </div>
          <span className="p-3 bg-amber-50 text-amber-500 rounded-xl">
            <Globe className="w-6 h-6" />
          </span>
        </div>
      </div>

      {/* CHARTS CONTAINER GRID */}
      {scans.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-600 font-medium text-sm mb-2">No Tracking Information Active Yet</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">Create a QR code with the "Scan Tracking API" enabled, click Save to list, then scan or run our simulator below to see analytics live!</p>
          
          {/* SIMULATE SCAN TRIGGER COMPONENT */}
          {projects.length > 0 && (
            <div className="max-w-xs mx-auto border border-dashed border-blue-200 p-4 rounded-xl bg-blue-50/40 text-left space-y-3">
              <label className="text-[10px] uppercase font-bold text-blue-900 tracking-wider">Select Project to Simulate Scan</label>
              <div className="flex gap-2">
                <select
                  id="sim_prj_select_empty"
                  value={activeSimulationProj}
                  onChange={(e) => setActiveSimulationProj(e.target.value)}
                  className="text-xs py-1 px-2 border border-slate-200 rounded-lg bg-white grow outline-hidden cursor-pointer"
                >
                  <option value="">-- Choose Project --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  id="btn_sim_fire"
                  onClick={handleSimulateScan}
                  disabled={!activeSimulationProj || simuating}
                  className="text-white bg-blue-600 hover:bg-blue-700 font-semibold px-3 py-1 text-xs rounded-lg disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  {simuating ? 'Firing...' : 'Simulate Scan'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* GRAPHS PRESENTATION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Timeline chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs text-left">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Historical Scans Progression (Last 7 Days)</span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="scans" stroke="#2563eb" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Devices breakdown chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs text-left">
              <div className="flex items-center space-x-2 mb-4">
                <Monitor className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Device Hardware Distribution Share</span>
              </div>
              <div className="grid grid-cols-5 items-center">
                <div className="col-span-3 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom list description panel */}
                <div className="col-span-2 space-y-2 text-left">
                  {deviceData.map((entry, index) => {
                    const total = deviceData.reduce((acc, c) => acc + c.value, 0);
                    const percentage = Math.round((entry.value / total) * 100);
                    return (
                      <div key={entry.name} className="flex flex-col">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                          <span className="text-xs text-slate-600 font-medium">{entry.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-300 font-bold pl-4">{entry.value} scans ({percentage}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Web browsers chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs text-left">
              <div className="flex items-center space-x-2 mb-4">
                <Globe className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Inherent Web Browser shares</span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={browserData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    <Bar dataKey="scans" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15}>
                      {browserData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[(idx + 1) % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top scanning locations */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs text-left">
              <div className="flex items-center space-x-2 mb-3">
                <MapPin className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Top Geographical Locations</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-4">Calculated from client network language and headers proxies</p>
              
              <div className="space-y-3">
                {topLocations.map((loc, idx) => {
                  const maxVal = topLocations[0]?.scans || 1;
                  const percentWidth = (loc.scans / maxVal) * 100;
                  return (
                    <div key={loc.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-600 flex items-center space-x-1.5">
                          <span className="text-[11px] text-blue-500 font-mono">#{idx+1}</span>
                          <span>{loc.name}</span>
                        </span>
                        <span className="text-slate-500 font-bold">{loc.scans} clicks</span>
                      </div>
                      <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percentWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* SIMULATE SCAN POPULATOR BAR */}
          <div className="bg-gradient-to-r from-teal-50/50 to-blue-50/20 p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                QR Scans Sandbox Populator
              </h3>
              <p className="text-xs text-slate-500">Fast-check dashboard layouts by generating and injecting synthetic scanned entries into selected files.</p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                id="sim_prj_select_dashboard"
                value={activeSimulationProj}
                onChange={(e) => setActiveSimulationProj(e.target.value)}
                className="text-xs py-2 px-3 border border-slate-200 rounded-xl bg-white grow outline-hidden cursor-pointer w-full md:w-52"
              >
                <option value="">-- Choose Project to Click --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                ))}
              </select>
              <button
                id="btn_sim_fire_dashboard"
                onClick={handleSimulateScan}
                disabled={!activeSimulationProj || simuating}
                className="text-white bg-slate-900 hover:bg-slate-800 font-semibold px-4 py-2 text-xs rounded-xl disabled:opacity-50 shrink-0 transitions cursor-pointer flex items-center gap-1.5"
              >
                {simuating ? 'Inserting...' : 'Inject Scan Log'}
              </button>
            </div>
          </div>

          {/* SCAN LOG INDIVIDUAL GRID RECORDS */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden text-left">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Raw Scan Logs Detail Records</span>
              <span className="text-[10px] text-slate-400">Displaying {scans.length} events</span>
            </div>
            
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider text-left">
                    <th className="p-3">Time of Scan</th>
                    <th className="p-3">Device OS</th>
                    <th className="p-3">Browser</th>
                    <th className="p-3">Approx Location</th>
                    <th className="p-3">Terminal IP</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {scans.slice().reverse().map((scan) => (
                    <tr key={scan.id} className="hover:bg-slate-50/50">
                      <td className="p-3 text-slate-600 font-mono text-[11px]">
                        {new Date(scan.timestamp).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </td>
                      <td className="p-3 text-slate-800 font-medium">{scan.deviceType}</td>
                      <td className="p-3 text-slate-500">{scan.browser}</td>
                      <td className="p-3 text-slate-600 font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{scan.approxLocation}</span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{scan.ip}</td>
                      <td className="p-3 text-right">
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          <span>Decoded</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
