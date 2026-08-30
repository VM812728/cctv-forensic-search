import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  ShieldCheck, 
  Clock, 
  User, 
  Tag, 
  KeyRound,
  Filter
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const filteredLogs = logs.filter(l => {
    const matchesSearch = 
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.caseId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.username.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || l.action.toLowerCase().includes(actionFilter.toLowerCase());
    return matchesSearch && matchesAction;
  });

  const handleExportLogs = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CCTV_Audit_Trail_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div id="audit-log-view" className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <span>Forensic System & Auditor Action Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident record of all candidate searches, human confirmations, clip extractions, and administrative logins.
          </p>
        </div>

        <button
          onClick={handleExportLogs}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-all cursor-pointer backdrop-blur-xs"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Export Audit Trail (JSON)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-lg shadow-black/10">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, details, user, case code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50 backdrop-blur-xs placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-medium">Action:</span>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50 backdrop-blur-xs cursor-pointer"
          >
            <option value="ALL">All Actions ({logs.length})</option>
            <option value="LOGIN">Logins</option>
            <option value="SEARCH">Searches</option>
            <option value="MATCH">Match Reviews</option>
            <option value="CLIP">Clip Generations</option>
            <option value="INDEX">Vector Indexing</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 font-mono text-[11px] border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">Timestamp (UTC)</th>
                <th className="py-3.5 px-4">User & Role</th>
                <th className="py-3.5 px-4">Action Type</th>
                <th className="py-3.5 px-4">Case ID</th>
                <th className="py-3.5 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                    {log.timestamp.substring(0, 19)}
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-200">{log.username}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                      log.action.includes('CONFIRM') 
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : log.action.includes('REJECT')
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : log.action.includes('CLIP')
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        : 'bg-white/5 text-slate-300 border border-white/10'
                    }`}>
                      {log.action}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono text-blue-400 font-medium">
                    {log.caseId || '—'}
                  </td>

                  <td className="py-3 px-4 text-slate-300">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
