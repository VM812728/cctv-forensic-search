import React, { useState } from 'react';
import { 
  FolderKanban, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Plus,
  AlertCircle
} from 'lucide-react';
import { Case } from '../types';

interface CasesViewProps {
  cases: Case[];
  currentCase?: Case;
  onSelectCase: (caseId: string) => void;
  onNavigateTab: (tab: any) => void;
  onDeleteCase: (caseId: string) => void;
}

export const CasesView: React.FC<CasesViewProps> = ({
  cases,
  currentCase,
  onSelectCase,
  onNavigateTab,
  onDeleteCase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredCases = cases.filter(c => {
    const matchesSearch = 
      c.caseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.candidate?.candidateName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.candidate?.rollNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.centreName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.examName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="cases-view" className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <FolderKanban className="w-5 h-5 text-blue-400" />
            <span>Examination Case Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse, search, and manage candidate identification cases across multiple examination centres.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('new_search')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all cursor-pointer backdrop-blur-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Case</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-lg shadow-black/10">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by case ID, roll number, candidate name, centre..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50 backdrop-blur-xs placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50 backdrop-blur-xs cursor-pointer"
          >
            <option value="ALL">All Statuses ({cases.length})</option>
            <option value="Review Required">Review Required</option>
            <option value="Completed">Completed</option>
            <option value="Searching">Searching</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 font-mono text-[11px] border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">Case Code</th>
                <th className="py-3.5 px-4">Candidate</th>
                <th className="py-3.5 px-4">Examination & Centre</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Matches</th>
                <th className="py-3.5 px-4 text-center">Clips</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {filteredCases.map((c) => {
                const isSelected = currentCase?.id === c.id;
                return (
                  <tr 
                    key={c.id} 
                    className={`transition-colors ${
                      isSelected ? 'bg-blue-500/10' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                      {c.caseCode}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {c.candidate?.photoUrl ? (
                          <img
                            src={c.candidate.photoUrl}
                            alt="Candidate"
                            className="w-9 h-9 rounded-xl object-cover border border-white/15"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 font-mono text-[10px]">
                            N/A
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-200">{c.candidate?.candidateName || 'N/A'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{c.candidate?.rollNumber || ''}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <div className="text-slate-200 font-medium truncate">{c.examName}</div>
                      <div className="text-[11px] text-slate-400 truncate">{c.centreName}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide ${
                        c.status === 'Completed' || c.status === 'Exported'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : c.status === 'Review Required'
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse'
                          : 'bg-white/5 text-slate-300 border border-white/10'
                      }`}>
                        {c.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200">
                      {c.totalMatchesCount}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-purple-300">
                      {c.clipsCount}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {c.createdAt.substring(0, 10)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            onSelectCase(c.id);
                            onNavigateTab('search_results');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Open</span>
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Delete case ${c.caseCode}?`)) {
                              onDeleteCase(c.id);
                            }
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-all cursor-pointer"
                          title="Delete Case"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
