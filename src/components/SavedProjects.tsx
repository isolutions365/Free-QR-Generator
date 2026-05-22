/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FolderPlus, Trash2, LayoutGrid, Zap, Copy, Check, 
  ExternalLink, Upload, Download, AlertCircle, FileText, Globe
} from 'lucide-react';
import { QRProject } from '../types';

interface SavedProjectsProps {
  projects: QRProject[];
  onSelectProject: (p: QRProject) => void;
  onDeleteProject: (id: string) => void;
  onImportProjects: (list: QRProject[]) => void;
}

export default function SavedProjects({
  projects,
  onSelectProject,
  onDeleteProject,
  onImportProjects
}: SavedProjectsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (trackingId: string, id: string) => {
    // Generate actual tracking URL pointing to local server scan endpoint
    const url = `${window.location.origin}/qr/${trackingId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportAll = () => {
    if (projects.length === 0) {
      alert("No projects to export.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `free-qr-projects-backup-${new Date().toISOString().substring(0,10)}.json`);
    dlAnchorElem.click();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportProjects(parsed);
            alert(`Backup files imported successfully! loaded ${parsed.length} projects.`);
          } else {
            alert("Vulnerability check failed: Backup format must be a valid JSON list.");
          }
        } catch (err) {
          alert("Error parsing backup JSON file.");
        }
      };
    }
  };

  return (
    <div id="saved_projects" className="space-y-6">

      {/* TOP CONFIG BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center space-x-3 text-left">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Projects History & Presets</h2>
            <p className="text-xs text-slate-500">Restore or export saved designs and tracking parameters</p>
          </div>
        </div>

        {/* Bulk tools */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <label className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center space-x-1.5 grow sm:grow-0">
            <Upload className="w-3.5 h-3.5" />
            <span>Import backup</span>
            <input 
              id="import_backup_input"
              type="file" 
              accept=".json" 
              onChange={handleImportBackup} 
              className="hidden" 
            />
          </label>

          <button
            id="btn_export_all_proj"
            onClick={handleExportAll}
            className="py-1.5 px-3 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center space-x-1.5 grow sm:grow-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export backup</span>
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 space-y-3">
          <p className="text-slate-600 font-medium text-sm">Workspace Library Empty</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">Create and style a custom QR code project, assign a title on the preview column, and click 'Save QR Project' to start building your collection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((proj) => {
            const shortUrl = `${window.location.origin}/qr/${proj.trackingId || proj.id}`;
            return (
              <div
                key={proj.id}
                id={`project_card_${proj.id}`}
                className="bg-white rounded-2xl border border-slate-150 shadow-xs hover:shadow-sm transition-all p-5 flex flex-col justify-between text-left space-y-4 hover:border-blue-300 leading-normal"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 max-w-[70%]">
                    <h3 className="text-sm font-bold text-slate-800 truncate">{proj.name}</h3>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full uppercase font-semibold">
                        {proj.type}
                      </span>
                      {proj.trackingEnabled && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" />
                          <span>Track API ON</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center space-x-1">
                    <button
                      id={`btn_apply_proj_${proj.id}`}
                      onClick={() => onSelectProject(proj)}
                      className="text-xs font-bold py-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all cursor-pointer"
                    >
                      Retrieve Design
                    </button>
                    
                    <button
                      id={`btn_delete_proj_${proj.id}`}
                      onClick={() => onDeleteProject(proj.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tracking short link display */}
                {proj.trackingEnabled && (
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest">Tracking short redirects link</span>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-blue-600 truncate max-w-[75%]">{shortUrl}</p>
                      
                      <div className="flex gap-2">
                        <button
                          id={`btn_copy_short_${proj.id}`}
                          onClick={() => handleCopyLink(proj.trackingId || proj.id, proj.id)}
                          className="text-[10px] flex items-center space-x-1 text-slate-500 hover:text-slate-800"
                        >
                          {copiedId === proj.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>

                        <a 
                          id={`link_test_short_${proj.id}`}
                          href={shortUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] text-slate-400 hover:text-slate-800 flex items-center gap-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Details list info footer */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                  <span>Created: {new Date(proj.createdAt).toLocaleDateString()}</span>
                  <span className="font-semibold text-slate-700">Scan count: {proj.scanCount || 0} hits</span>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
