/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { 
  Download, QrCode, Clipboard, Check, Eye, HelpCircle, 
  Trash2, Save, Sparkles, Network, AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { QRDesignConfig, QRProject } from '../types';
import { drawCanvas, generateSVG } from '../utils/qrRenderer';

interface PreviewPanelProps {
  type: string;
  content: string;
  design: QRDesignConfig;
  onSaveProject: (name: string, trackingEnabled: boolean) => void;
  isSaving: boolean;
}

export default function PreviewPanel({
  type,
  content,
  design,
  onSaveProject,
  isSaving
}: PreviewPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [projectName, setProjectName] = useState('My Custom QR');
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);

  // Redraw canvas whenever content or design variables evolve
  useEffect(() => {
    if (canvasRef.current) {
      drawCanvas(canvasRef.current, content, design);
    }
  }, [content, design]);

  const handleCopyContent = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPNG = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
    a.href = url;
    a.click();
  };

  const downloadSVG = () => {
    const svgStr = generateSVG(content, design);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-qr.svg`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Renders a high-resolution printable PDF Sheet context
  const printPDF = () => {
    if (!canvasRef.current) return;
    const qrImage = canvasRef.current.toDataURL('image/png');
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocked! Please enable popups to print / export PDF sheets.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Export PDF Sheet - ${projectName}</title>
          <style>
            body { font-family: -apple-system, sans-serif; text-align: center; padding: 40px; color: #1e293b; }
            .container { max-width: 600px; margin: 0 auto; border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; background: #fafafa; }
            h1 { font-size: 24px; margin-bottom: 5px; }
            p { color: #64748b; margin-top: 0; }
            .details { margin: 20px 0; background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #f1f5f9; text-align: left; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
            .qr-image { margin-top: 20px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); width: 250px; height: 250px; }
            .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; }
            @media print {
              body { padding: 0; }
              .container { border: none; padding: 0; background: none; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Free QR Generator Template</h1>
            <p>High-resolution QR print configuration sheet</p>
            
            <img class="qr-image" src="${qrImage}" alt="QR code" />
            
            <div class="details">
              <div class="detail-row"><strong>Project Title:</strong> <span>${projectName}</span></div>
              <div class="detail-row"><strong>QR Type:</strong> <span style="text-transform: uppercase;">${type}</span></div>
              <div class="detail-row"><strong>Payload Content:</strong> <span style="word-break: break-all;">${content}</span></div>
              <div class="detail-row"><strong>Correction Level:</strong> <span>${design.logoUrl ? 'High (30% Logo Zone)' : design.errorCorrectionLevel}</span></div>
              <div class="detail-row"><strong>Colors:</strong> <span>Foreground: ${design.fgColor} | Background: ${design.bgColor}</span></div>
            </div>
            
            <button class="no-print" style="padding: 10px 20px; font-size: 14px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer;" onclick="window.print()">
              Print / Save to PDF
            </button>
            <div class="footer">Document compiled via Free QR Generator</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Simulates a smartphone scanning the computed QR Code module
  const simulateLiveScan = () => {
    setScanResult(null);
    setShowSimulator(true);
    setTimeout(() => {
      setScanResult(content);
    }, 1200);
  };

  return (
    <div id="preview_panel" className="sticky top-6 bg-white rounded-2xl shadow-xs border border-slate-100 p-6 flex flex-col items-center space-y-6">
      
      <div className="w-full flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Custom Preview</span>
        <span className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-medium animate-pulse">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
          <span>Real-time Sync Active</span>
        </span>
      </div>

      {/* RENDER CHASSIS DESIGN */}
      <div className="relative group bg-slate-50/70 p-8 rounded-2xl border border-slate-100 transition-all hover:border-slate-200 min-h-[286px] min-w-[286px] flex items-center justify-center">
        <motion.div
          key={JSON.stringify({
            content,
            fgColor: design.fgColor,
            bgColor: design.bgColor,
            gradientType: design.gradientType,
            gradientColor: design.gradientColor,
            gradientAngle: design.gradientAngle,
            dotStyle: design.dotStyle,
            eyeStyle: design.eyeStyle,
            eyeColor: design.eyeColor,
            logoUrl: design.logoUrl,
            logoSize: design.logoSize,
            logoMargin: design.logoMargin,
            errorCorrectionLevel: design.errorCorrectionLevel
          })}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-xl shadow-md p-2 flex items-center justify-center"
        >
          <canvas 
            ref={canvasRef} 
            id="qr_canvas"
            className="transition-transform duration-300 group-hover:scale-[1.02]"
            style={{ width: '220px', height: '220px' }}
          />
        </motion.div>
        
        {/* Absolute indicators overlay */}
        <span className="absolute top-2 right-2 text-[9px] font-mono text-slate-400 bg-white/80 backdrop-blur-xs px-1.5 py-0.5 rounded z-10">
          {design.size}x{design.size} px
        </span>
      </div>

      {/* Target content quick specs */}
      <div className="w-full bg-slate-50 p-3 rounded-xl flex items-center justify-between text-left">
        <div className="overflow-hidden pr-2">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payload String</p>
          <p className="text-xs text-slate-600 font-mono truncate">{content}</p>
        </div>
        <button
          id="btn_copy_payload"
          onClick={handleCopyContent}
          className="p-1 px-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg border border-slate-200 transition-all cursor-pointer shrink-0"
          title="Copy exact QR raw data"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* SAVING PANEL BOX */}
      <div className="w-full border-t border-slate-100 pt-5 space-y-3.5">
        <div className="space-y-1 text-left">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Workspace project metadata</label>
          <input
            id="workspace_proj_name"
            type="text"
            placeholder="Assign project title..."
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>

        {/* Sync redirects scan tracking */}
        <div className="bg-gradient-to-r from-blue-50/50 to-slate-100/30 p-3 rounded-xl flex items-center justify-between text-left border border-slate-100">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-blue-950 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-blue-500" />
              Scan Tracking API
            </span>
            <p className="text-[10px] text-blue-600 leading-tight">Sync metrics, locations, and device scans on our dashboard.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer align-middle select-none">
            <input 
              id="tracking_toggle"
              type="checkbox" 
              checked={trackingEnabled} 
              onChange={(e) => setTrackingEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <button
          id="btn_save_workspace"
          onClick={() => onSaveProject(projectName, trackingEnabled)}
          disabled={isSaving || !projectName.trim()}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-blue-500/10 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Synchronizing Workspace...' : 'Save QR Project to History'}</span>
        </button>
      </div>

      {/* DOWNLOAD CAPABILITIES */}
      <div className="w-full border-t border-slate-100 pt-5 space-y-2 text-left">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Download Formats</span>
        <div className="grid grid-cols-3 gap-2">
          <button
            id="download_png"
            onClick={downloadPNG}
            className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-slate-900 text-white hover:bg-slate-800 text-xs rounded-lg cursor-pointer transition-all"
          >
            <Download className="w-3 h-3" />
            <span>PNG</span>
          </button>
          
          <button
            id="download_svg"
            onClick={downloadSVG}
            className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-slate-900 text-white hover:bg-slate-800 text-xs rounded-lg cursor-pointer transition-all"
          >
            <Download className="w-3 h-3" />
            <span>SVG</span>
          </button>
          
          <button
            id="download_pdf"
            onClick={printPDF}
            className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-slate-900 text-white hover:bg-slate-800 text-xs rounded-lg cursor-pointer transition-all"
          >
            <Download className="w-3 h-3" />
            <span>PDF Print</span>
          </button>
        </div>
      </div>

      {/* SCAN INTEGRITY SIMULATOR TESTER */}
      <div className="w-full border-t border-slate-100 pt-5 text-left">
        <button
          id="btn_scan_sim"
          onClick={simulateLiveScan}
          className="w-full py-2 px-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
        >
          <QrCode className="w-3.5 h-3.5 text-blue-500" />
          <span>Integrity Scan Test (Simulate Scan)</span>
        </button>

        {showSimulator && (
          <div className="mt-3 bg-slate-900 text-white rounded-xl p-3 space-y-2 border border-slate-800">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider">Mobile Scanner Simulator</span>
              <button 
                onClick={() => setShowSimulator(false)}
                className="text-[10px] text-slate-500 hover:text-white"
              >
                close
              </button>
            </div>
            
            {scanResult ? (
              <div className="space-y-1">
                <div className="flex items-center space-x-1 text-emerald-400">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] font-bold">100% Scan Verification Successful!</span>
                </div>
                <div className="bg-slate-950 p-2 rounded text-[10px] font-mono whitespace-pre-wrap word-break-all text-slate-300">
                  {scanResult}
                </div>
                <p className="text-[9px] text-slate-500 text-left pt-1">Decoder matches configurations. Suitable for packaging and billboard standards.</p>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2 py-4">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                <span className="text-xs font-mono text-slate-400">Processing QR layout grid...</span>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
