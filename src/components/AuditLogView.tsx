import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  ShieldCheck, 
  User, 
  FileText, 
  Calendar,
  Lock,
  ArrowUpDown
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');

  const uniqueUsers = Array.from(new Set(logs.map(l => l.username)));
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.caseCode || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesUser = userFilter === 'ALL' || log.username === userFilter;

    return matchesSearch && matchesAction && matchesUser;
  });

  const exportCsv = () => {
    const headers = ['Timestamp', 'Officer / User', 'Action', 'Target / Object', 'Case Code', 'Integrity Details'];
    const rows = filteredLogs.map(l => [
      `"${l.timestamp}"`,
      `"${l.username}"`,
      `"${l.action}"`,
      `"${l.target || 'System'}"`,
      `"${l.caseCode || 'N/A'}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Forensic_Audit_Log_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Forensic_Audit_Log_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div id="audit-log-view" className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">
              Chain of Custody Ledger
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="text-xs text-slate-400 font-mono">
              Tamper-Evident Chronological Trail
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <span>Forensic Audit Log & Chain-of-Custody</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Immutable system and user actions logged with timestamps, operator IDs, case affiliations, and cryptographic verification status.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={exportJson}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-sm">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, operator, details, case code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Action:</span>
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              {uniqueActions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Officer:</span>
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Officers</option>
              {uniqueUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Immutable Forensic Ledger Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">Timestamp (UTC / Local)</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Officer / User</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Action Type</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Case Code</th>
                <th className="py-3.5 px-4">Integrity Details & Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.map((log) => {
                let actionBadgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                if (log.action.includes('MATCH') || log.action.includes('CONFIRM')) {
                  actionBadgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                } else if (log.action.includes('REJECT')) {
                  actionBadgeColor = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
                } else if (log.action.includes('CLIP') || log.action.includes('SEAL')) {
                  actionBadgeColor = 'bg-purple-500/10 text-purple-300 border-purple-500/20';
                } else if (log.action.includes('SEARCH') || log.action.includes('INDEX')) {
                  actionBadgeColor = 'bg-blue-500/10 text-blue-300 border-blue-500/20';
                }

                return (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                      {log.timestamp}
                    </td>

                    <td className="py-3.5 px-4 font-sans font-medium text-slate-200 whitespace-nowrap">
                      {log.username}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${actionBadgeColor}`}>
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-blue-400 font-bold whitespace-nowrap">
                      {log.caseCode || 'SYSTEM-WIDE'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 text-[11px] font-sans">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{log.details}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
