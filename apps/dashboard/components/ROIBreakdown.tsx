import React, { useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';

interface PersonaData {
  count: number;
  cost_usd: number;
}

export interface ROIReport {
  project: string;
  total_missions: number;
  total_cost_usd: number;
  average_cost_per_mission: number;
  persona_breakdown: Record<string, PersonaData>;
  time_series?: { date: string; cost: number }[];
  project_persona_breakdown?: Record<string, Record<string, PersonaData>>;
  project_breakdown?: Record<string, { count: number; cost_usd: number }>;
  currency: string;
  generated_at: string;
}

interface ROIBreakdownProps {
  report: ROIReport;
}

const CHART_COLORS = ['#00ffaa', '#00e5ff', '#4361ee', '#ffcc00', '#ff0055', '#9d4edd'];

/**
 * ROIBreakdown: A tactical UI component for visualizing mission costs and agent efficiency.
 * Styled for the Sovereign Factory Observation Lounge.
 */
export const ROIBreakdown: React.FC<ROIBreakdownProps> = ({ report }) => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [personaSearch, setPersonaSearch] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: report.currency || 'USD',
      minimumFractionDigits: 4,
    }).format(value);
  };

  const getPersonasForDisplay = () => {
    let basePersonas: [string, any][] = [];
    const projectPersonaMap = report.project_persona_breakdown;

    if (selectedProject && projectPersonaMap) {
      const projectKey = Object.keys(projectPersonaMap).find(
        k => k.toUpperCase() === selectedProject
      );
      if (projectKey) {
        basePersonas = Object.entries(projectPersonaMap[projectKey]) as [string, any][];
      } else {
        basePersonas = Object.entries(report.persona_breakdown) as [string, any][];
      }
    } else {
      basePersonas = Object.entries(report.persona_breakdown) as [string, any][];
    }

    return basePersonas
      .filter(([name]) => 
        name && name.replace(/_/g, ' ').toLowerCase().includes(personaSearch.toLowerCase())
      )
      .sort(([, a], [, b]) => b.cost_usd - a.cost_usd);
  };

  const personas = getPersonasForDisplay();

  const chartData = personas.map(([name, stats]) => ({
    name: name.replace(/_/g, ' ').toUpperCase(),
    value: stats.cost_usd
  }));

  const projectData = report.project_breakdown
    ? (Object.entries(report.project_breakdown) as [string, any][]).map(([name, stats]) => ({
        name: name.toUpperCase(),
        avgCost: stats.count > 0 ? stats.cost_usd / stats.count : 0
      }))
    : [];

  const personaAvgCostData = (() => {
    const projectPersonaMap = report.project_persona_breakdown;
    if (!selectedProject || !projectPersonaMap) return [];

    const projectKey = Object.keys(projectPersonaMap).find(
      k => k.toUpperCase() === selectedProject
    );
    if (!projectKey) return [];

    return (Object.entries(projectPersonaMap[projectKey] || {}) as [string, any][])
      .map(([name, stats]) => ({
        name: name.replace(/_/g, ' ').toUpperCase(),
        avgCost: stats.count > 0 ? stats.cost_usd / stats.count : 0
      }))
      .sort((a, b) => b.avgCost - a.avgCost);
  })();

  return (
    <div className="bg-[#0d1022] border border-[#00ffaa]/20 rounded-lg p-6 font-mono text-slate-300">
      <div className="flex justify-between items-center mb-6 border-b border-[#00ffaa]/10 pb-4">
        <div>
          <h2 className="text-[#00ffaa] text-xl font-bold uppercase tracking-wider">
            Quark's ROI Analysis
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Project: <span className="text-slate-300">{report.project}</span> | 
            Generated: {new Date(report.generated_at).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] bg-[#00ffaa]/10 text-[#00ffaa] px-2 py-1 rounded border border-[#00ffaa]/30">
            V11 ECONOMICS NOMINAL
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
          <p className="text-[10px] uppercase text-slate-500 mb-1">Total Mission Cost</p>
          <p className="text-2xl font-bold text-[#00ffaa]">{formatCurrency(report.total_cost_usd)}</p>
        </div>
        <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
          <p className="text-[10px] uppercase text-slate-500 mb-1">Total Executions</p>
          <p className="text-2xl font-bold text-white">{report.total_missions}</p>
        </div>
        <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
          <p className="text-[10px] uppercase text-slate-500 mb-1">Avg Cost / Mission</p>
          <p className="text-2xl font-bold text-blue-400">{formatCurrency(report.average_cost_per_mission)}</p>
        </div>
      </div>

      {/* Cost Evolution Time-Series */}
      {report.time_series && report.time_series.length > 0 && (
        <div className="h-64 w-full mb-8 bg-slate-900/20 rounded border border-slate-800 p-2">
          <h3 className="text-[10px] uppercase text-slate-500 mb-2 tracking-widest pl-2">30-Day Cost Evolution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={report.time_series} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(str) => typeof str === 'string' ? str.split('-').slice(1).join('/') : str}
              />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value: number) => `$${value.toFixed(2)}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0d1022', border: '1px solid #1e293b', borderRadius: '4px', fontSize: '10px' }}
                itemStyle={{ color: '#00ffaa' }}
                labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                formatter={(value: any) => [formatCurrency(Number(value)), 'Daily Cost']}
              />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#00ffaa"
                strokeWidth={2}
                dot={{ fill: '#0d1022', stroke: '#00ffaa', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, fill: '#00ffaa' }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cost Distribution Chart */}
      <div className="h-64 w-full mb-8 bg-slate-900/20 rounded border border-slate-800 p-2">
        <h3 className="text-[10px] uppercase text-slate-500 mb-2 tracking-widest pl-2">Cost Distribution per Persona</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#0d1022', border: '1px solid #1e293b', borderRadius: '4px', fontSize: '10px' }}
              itemStyle={{ color: '#00ffaa' }}
              formatter={(value: any) => formatCurrency(Number(value))}
            />
            <Legend 
              verticalAlign="middle" align="right" layout="vertical"
              wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', paddingLeft: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Project Average Cost Comparison */}
      {projectData.length > 0 && (
        <div className="h-64 w-full mb-8 bg-slate-900/20 rounded border border-slate-800 p-2">
          <h3 className="text-[10px] uppercase text-slate-500 mb-2 tracking-widest pl-2">Avg Cost per Mission by Project</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value: number) => `$${value.toFixed(2)}`} />
              <Tooltip
                cursor={{ fill: 'rgba(0, 255, 170, 0.05)' }}
                contentStyle={{ backgroundColor: '#0d1022', border: '1px solid #1e293b', borderRadius: '4px', fontSize: '10px' }}
                itemStyle={{ color: '#00ffaa' }}
                formatter={(value: any) => [formatCurrency(Number(value)), 'Avg Cost']}
              />
              <Bar
                dataKey="avgCost"
                fill="#00ffaa"
                radius={[4, 4, 0, 0]}
                barSize={40}
                style={{ cursor: 'pointer' }}
                onClick={(barData: any) => {
                  if (barData && barData.name) {
                    setSelectedProject(prev => prev === barData.name ? null : barData.name);
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Persona Average Cost Comparison within Project */}
      {selectedProject && personaAvgCostData.length > 0 && (
        <div className="h-64 w-full mb-8 bg-slate-900/20 rounded border border-slate-800 p-2 border-l-4 border-l-[#00ffaa]">
          <h3 className="text-[10px] uppercase text-[#00ffaa] mb-2 tracking-widest pl-2 font-bold">
            Avg Cost per Mission by Persona | Project: {selectedProject}
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={personaAvgCostData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value: number) => `$${value.toFixed(2)}`} />
              <Tooltip
                cursor={{ fill: 'rgba(0, 255, 170, 0.05)' }}
                contentStyle={{ backgroundColor: '#0d1022', border: '1px solid #1e293b', borderRadius: '4px', fontSize: '10px' }}
                itemStyle={{ color: '#00ffaa' }}
                formatter={(value: any) => [formatCurrency(Number(value)), 'Avg Cost']}
              />
              <Bar
                dataKey="avgCost"
                fill="#00ffaa"
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Persona Breakdown */}
      <div>
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
          <h3 className="text-xs uppercase text-slate-500 tracking-widest border-l-2 border-[#00ffaa] pl-2">
            Persona Resource Allocation {selectedProject ? `| Project: ${selectedProject}` : '(Global)'}
          </h3>
          {selectedProject && (
            <button 
              onClick={() => setSelectedProject(null)}
              className="text-[10px] text-red-500 hover:text-red-400 uppercase font-bold"
            >
              [Clear Filter]
            </button>
          )}
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Filter personas by name..."
            value={personaSearch}
            onChange={(e) => setPersonaSearch(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-xs text-[#00ffaa] focus:outline-none focus:border-[#00ffaa]/50 transition-colors placeholder:text-slate-600"
          />
        </div>

        <div className="space-y-3">
          {personas.map(([name, stats]) => (
            <div key={name} className="flex items-center justify-between bg-slate-900/30 p-3 rounded hover:bg-slate-900/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#00ffaa] group-hover:animate-pulse" />
                <span className="capitalize text-sm font-medium text-slate-200">
                  {name.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex gap-8 text-xs">
                <div className="text-right">
                  <p className="text-slate-500 uppercase text-[9px]">Missions</p>
                  <p className="text-slate-300">{stats.count}</p>
                </div>
                <div className="text-right w-24">
                  <p className="text-slate-500 uppercase text-[9px]">Accumulated Cost</p>
                  <p className="text-[#00ffaa] font-bold">{formatCurrency(stats.cost_usd)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rules of Acquisition Footer */}
      <div className="mt-8 pt-4 border-t border-slate-800 text-center">
        <p className="text-[9px] italic text-slate-600">
          "Rule of Acquisition #10: Greed is eternal." — Provided by Sovereign Economics Division
        </p>
      </div>
    </div>
  );
};

export default ROIBreakdown;