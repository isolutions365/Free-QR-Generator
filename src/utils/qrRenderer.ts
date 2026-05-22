/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';
import { QRDesignConfig, VCardDetails, WiFiDetails } from '../types';

// Encodes vCard details to standard string format
export function generatevCardString(d: VCardDetails): string {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${d.lastName};${d.firstName};;;`,
    `FN:${d.firstName} ${d.lastName}`,
    `ORG:${d.organization}`,
    `TEL;TYPE=CELL:${d.phoneMobile}`,
    `TEL;TYPE=WORK,VOICE:${d.phoneWork}`,
    `EMAIL;TYPE=PREF,INTERNET:${d.email}`,
    `URL:${d.url}`,
    `ADR;TYPE=WORK:;;${d.address};;;;`,
    'END:VCARD'
  ].join('\n');
}

// Encodes WiFi details to standard string format
export function generateWiFiString(d: WiFiDetails): string {
  const enc = d.encryption === 'none' ? 'nopass' : d.encryption;
  return `WIFI:S:${d.ssid};T:${enc};P:${d.password || ''};H:${d.hidden ? 'true' : 'false'};;`;
}

// Checks if a cell is part of the three large Finder patterns (Eyes)
// Position detection markers are 7x7 grids at [0,0], [size-7, 0], [0, size-7]
export function isEyeArea(row: number, col: number, size: number): boolean {
  if (row < 7 && col < 7) return true; // Top-Left
  if (row < 7 && col >= size - 7) return true; // Top-Right
  if (row >= size - 7 && col < 7) return true; // Bottom-Left
  return false;
}

// Determines if row/col sits in the inner 3x3 core center of any Eye area
export function isEyeCenter(row: number, col: number, size: number): boolean {
  // Top-left core: row 2..4, col 2..4
  if (row >= 2 && row <= 4 && col >= 2 && col <= 4) return true;
  // Top-right core: row 2..4, col (size-5)..(size-3)
  if (row >= 2 && row <= 4 && col >= size - 5 && col <= size - 3) return true;
  // Bottom-left core: row (size-5)..(size-3), col 2..4
  if (row >= size - 5 && row <= size - 3 && col >= 2 && col <= 4) return true;
  return false;
}

// Determines if row/col sits in the middle row/col surrounding an eye core
export function isEyeBorder(row: number, col: number, size: number): boolean {
  if (isEyeArea(row, col, size) && !isEyeCenter(row, col, size)) {
    // Exclude the white spacer ring surrounding the outer border (which is the 1-px inner gap at offset 1 or 5)
    // The actual eye border is row 0 or 6 or col 0 or 6
    if (row === 0 || row === 6 || col === 0 || col === 6) return true;
    if (row === 0 || row === 6 || col === size - 1 || col === size - 7) return true;
    if (row === size - 1 || row === size - 7 || col === 0 || col === 6) return true;
  }
  return false;
}

// High quality custom QR rendering on an HTML5 Canvas
export async function drawCanvas(
  canvas: HTMLCanvasElement,
  content: string,
  config: QRDesignConfig
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  try {
    const qr = QRCode.create(content, {
      errorCorrectionLevel: config.logoUrl ? 'H' : config.errorCorrectionLevel
    });

    const modules = qr.modules;
    const size = modules.size;
    const canvasSize = config.size;
    const margin = config.margin;

    // Scale canvas if dimensions don't match config configuration
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    // Draw solid Background
    ctx.fillStyle = config.bgColor;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const activeAreaSize = canvasSize - (margin * 2);
    const cellSize = activeAreaSize / size;

    // Calculate Clear Zone for custom centered logo
    const centerCell = size / 2;
    const logoCellRadius = config.logoUrl ? (size * (config.logoSize / 100)) / 2 : 0;

    // Configure main matrix Fill Style (Gradient or Solid)
    let fillStyle: string | CanvasGradient = config.fgColor;
    if (config.gradientType !== 'none') {
      if (config.gradientType === 'linear') {
        const x1 = margin;
        const y1 = margin;
        const x2 = margin + activeAreaSize * Math.cos((config.gradientAngle * Math.PI) / 180);
        const y2 = margin + activeAreaSize * Math.sin((config.gradientAngle * Math.PI) / 180);
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, config.fgColor);
        gradient.addColorStop(1, config.gradientColor);
        fillStyle = gradient;
      } else if (config.gradientType === 'radial') {
        const cx = canvasSize / 2;
        const cy = canvasSize / 2;
        const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, activeAreaSize * 0.7);
        gradient.addColorStop(0, config.fgColor);
        gradient.addColorStop(1, config.gradientColor);
        fillStyle = gradient;
      }
    }

    // Pass 1: Render Finder Eyes Custom Borders & Cores
    // We isolate them so colors can be separately overridden if configured
    const drawEye = (oX: number, oY: number) => {
      ctx.fillStyle = config.eyeColor || config.fgColor;
      
      if (config.eyeStyle === 'square') {
        // Outer border
        ctx.fillRect(oX, oY, cellSize * 7, cellSize * 7);
        ctx.fillStyle = config.bgColor;
        ctx.fillRect(oX + cellSize, oY + cellSize, cellSize * 5, cellSize * 5);
        // Inner core
        ctx.fillStyle = config.eyeColor || config.fgColor;
        ctx.fillRect(oX + cellSize * 2, oY + cellSize * 2, cellSize * 3, cellSize * 3);
      } else if (config.eyeStyle === 'rounded' || config.eyeStyle === 'circle') {
        const radius = config.eyeStyle === 'circle' ? (cellSize * 7) / 2 : cellSize * 1.8;
        const innerRadius = config.eyeStyle === 'circle' ? (cellSize * 3) / 2 : cellSize * 0.8;
        
        ctx.beginPath();
        drawRoundRectPath(ctx, oX, oY, cellSize * 7, cellSize * 7, radius);
        ctx.fill();

        ctx.fillStyle = config.bgColor;
        ctx.beginPath();
        drawRoundRectPath(ctx, oX + cellSize, oY + cellSize, cellSize * 5, cellSize * 5, radius * 0.7);
        ctx.fill();

        ctx.fillStyle = config.eyeColor || config.fgColor;
        ctx.beginPath();
        drawRoundRectPath(ctx, oX + cellSize * 2, oY + cellSize * 2, cellSize * 3, cellSize * 3, innerRadius);
        ctx.fill();
      } else if (config.eyeStyle === 'leaf') {
        // Leaf design has top-left and bottom-right corners highly rounded, or elegant diagonal arches
        ctx.beginPath();
        ctx.moveTo(oX + cellSize * 7, oY);
        ctx.arcTo(oX + cellSize * 7, oY + cellSize * 7, oX, oY + cellSize * 7, cellSize * 6);
        ctx.lineTo(oX, oY + cellSize * 7);
        ctx.arcTo(oX, oY, oX + cellSize * 7, oY, cellSize * 6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = config.bgColor;
        ctx.beginPath();
        ctx.moveTo(oX + cellSize * 6, oY + cellSize);
        ctx.arcTo(oX + cellSize * 6, oY + cellSize * 6, oX + cellSize, oY + cellSize * 6, cellSize * 5);
        ctx.lineTo(oX + cellSize, oY + cellSize * 6);
        ctx.arcTo(oX + cellSize, oY + cellSize, oX + cellSize * 6, oY + cellSize, cellSize * 5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = config.eyeColor || config.fgColor;
        ctx.beginPath();
        ctx.moveTo(oX + cellSize * 5, oY + cellSize * 2);
        ctx.arcTo(oX + cellSize * 5, oY + cellSize * 5, oX + cellSize * 2, oY + cellSize * 5, cellSize * 2.5);
        ctx.lineTo(oX + cellSize * 2, oY + cellSize * 5);
        ctx.arcTo(oX + cellSize * 2, oY + cellSize * 2, oX + cellSize * 5, oY + cellSize * 2, cellSize * 2.5);
        ctx.closePath();
        ctx.fill();
      }
    };

    // Draw the 3 Eyes
    drawEye(margin, margin); // Top-Left
    drawEye(margin + (size - 7) * cellSize, margin); // Top-Right
    drawEye(margin, margin + (size - 7) * cellSize); // Bottom-Left

    // Pass 2: Render standard bits / alignment patterns
    ctx.fillStyle = fillStyle;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip rendering bits in the Finder Eye areas
        if (isEyeArea(r, c, size)) continue;

        // Skip rendering bits if inside the logo clear-zone
        if (config.logoUrl && config.logoMargin) {
          const distToCenter = Math.sqrt(Math.pow(r - centerCell, 2) + Math.pow(c - centerCell, 2));
          if (distToCenter < logoCellRadius + 0.5) {
            continue;
          }
        }

        // Draw active modules
        if (modules.get(r, c)) {
          const x = margin + c * cellSize;
          const y = margin + r * cellSize;

          if (config.dotStyle === 'square') {
            ctx.fillRect(x, y, cellSize + 0.5, cellSize + 0.5); // overlapping fixes visual gaps
          } else if (config.dotStyle === 'dots') {
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.4, 0, 2 * Math.PI);
            ctx.fill();
          } else if (config.dotStyle === 'rounded') {
            ctx.beginPath();
            drawRoundRectPath(ctx, x + cellSize * 0.05, y + cellSize * 0.05, cellSize * 0.9, cellSize * 0.9, cellSize * 0.35);
            ctx.fill();
          } else if (config.dotStyle === 'classy') {
            // Elegant dots connected to adjacent ones (liquid mesh feel)
            const top = r > 0 && modules.get(r - 1, c) && !isEyeArea(r - 1, c, size);
            const bottom = r < size - 1 && modules.get(r + 1, c) && !isEyeArea(r + 1, c, size);
            const left = c > 0 && modules.get(r, c - 1) && !isEyeArea(r, c - 1, size);
            const right = c < size - 1 && modules.get(r, c + 1) && !isEyeArea(r, c + 1, size);

            ctx.beginPath();
            const rTopL = (top || left) ? 0 : cellSize * 0.45;
            const rTopR = (top || right) ? 0 : cellSize * 0.45;
            const rBotL = (bottom || left) ? 0 : cellSize * 0.45;
            const rBotR = (bottom || right) ? 0 : cellSize * 0.45;

            ctx.moveTo(x + rTopL, y);
            ctx.lineTo(x + cellSize - rTopR, y);
            ctx.arcTo(x + cellSize, y, x + cellSize, y + rTopR, rTopR);
            ctx.lineTo(x + cellSize, y + cellSize - rBotR);
            ctx.arcTo(x + cellSize, y + cellSize, x + cellSize - rBotR, y + cellSize, rBotR);
            ctx.lineTo(x + rBotL, y + cellSize);
            ctx.arcTo(x, y + cellSize, x, y + cellSize - rBotL, rBotL);
            ctx.lineTo(x, y + rTopL);
            ctx.arcTo(x, y, x + rTopL, y, rTopL);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    // Pass 3: Draw Center Logo
    if (config.logoUrl) {
      const logoSizePx = (activeAreaSize * (config.logoSize / 100));
      const lx = margin + (activeAreaSize - logoSizePx) / 2;
      const ly = margin + (activeAreaSize - logoSizePx) / 2;

      // Draw beautiful circle backing for logo if requested
      if (config.logoMargin) {
        ctx.fillStyle = config.bgColor;
        ctx.beginPath();
        ctx.arc(canvasSize / 2, canvasSize / 2, logoSizePx / 2 + cellSize * 0.5, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Render the logo image
      const img = new Image();
      img.src = config.logoUrl;
      img.crossOrigin = 'anonymous'; // prevent CORS canvas taint
      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, lx, ly, logoSizePx, logoSizePx);
          resolve();
        };
        img.onerror = () => {
          // If profile fails, skip drawing logo gracefully without crashing QR
          resolve();
        };
      });
    }

  } catch (err) {
    console.error("Renderer drawn failure:", err);
  }
}

// Draw custom path on canvas
function drawRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Generates scalable inline SVG source string
export function generateSVG(content: string, config: QRDesignConfig): string {
  try {
    const qr = QRCode.create(content, {
      errorCorrectionLevel: config.logoUrl ? 'H' : config.errorCorrectionLevel
    });
    const modules = qr.modules;
    const size = modules.size;
    const canvasSize = config.size;
    const margin = config.margin;
    
    const activeAreaSize = canvasSize - (margin * 2);
    const cellSize = activeAreaSize / size;
    const centerCell = size / 2;
    const logoCellRadius = config.logoUrl ? (size * (config.logoSize / 100)) / 2 : 0;

    let paths = '';

    // Gradient definition inside defs tags
    let defsStr = '';
    let fillAttr = config.fgColor;
    if (config.gradientType !== 'none') {
      fillAttr = 'url(#qr-gradient)';
      if (config.gradientType === 'linear') {
        const rad = (config.gradientAngle * Math.PI) / 180;
        const x1 = Math.round(50 - 50 * Math.cos(rad));
        const y1 = Math.round(50 - 50 * Math.sin(rad));
        const x2 = Math.round(50 + 50 * Math.cos(rad));
        const y2 = Math.round(50 + 50 * Math.sin(rad));
        defsStr = `
          <defs>
            <linearGradient id="qr-gradient" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
              <stop offset="0%" stop-color="${config.fgColor}" />
              <stop offset="100%" stop-color="${config.gradientColor}" />
            </linearGradient>
          </defs>
        `;
      } else {
        defsStr = `
          <defs>
            <radialGradient id="qr-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="${config.fgColor}" />
              <stop offset="100%" stop-color="${config.gradientColor}" />
            </radialGradient>
          </defs>
        `;
      }
    }

    // Process Modules
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip Eyes area
        if (isEyeArea(r, c, size)) continue;

        // Skip Logo area
        if (config.logoUrl && config.logoMargin) {
          const distToCenter = Math.sqrt(Math.pow(r - centerCell, 2) + Math.pow(c - centerCell, 2));
          if (distToCenter < logoCellRadius + 0.5) {
            continue;
          }
        }

        // Add module
        if (modules.get(r, c)) {
          const x = margin + c * cellSize;
          const y = margin + r * cellSize;

          if (config.dotStyle === 'square') {
            paths += `<rect x="${x}" y="${y}" width="${cellSize + 0.3}" height="${cellSize + 0.3}" fill="${fillAttr}" />\n`;
          } else if (config.dotStyle === 'dots') {
            paths += `<circle cx="${x + cellSize / 2}" cy="${y + cellSize / 2}" r="${cellSize * 0.4}" fill="${fillAttr}" />\n`;
          } else {
            paths += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="${cellSize * 0.3}" ry="${cellSize * 0.3}" fill="${fillAttr}" />\n`;
          }
        }
      }
    }

    // Render Finder eyes custom shapes
    const renderEyeSVG = (oX: number, oY: number) => {
      const eColor = config.eyeColor || config.fgColor;
      if (config.eyeStyle === 'square') {
        return `
          <rect x="${oX}" y="${oY}" width="${cellSize * 7}" height="${cellSize * 7}" fill="${eColor}" />
          <rect x="${oX + cellSize}" y="${oY + cellSize}" width="${cellSize * 5}" height="${cellSize * 5}" fill="${config.bgColor}" />
          <rect x="${oX + cellSize * 2}" y="${oY + cellSize * 2}" width="${cellSize * 3}" height="${cellSize * 3}" fill="${eColor}" />
        `;
      } else if (config.eyeStyle === 'circle') {
        return `
          <circle cx="${oX + (cellSize * 7)/2}" cy="${oY + (cellSize * 7)/2}" r="${(cellSize * 7)/2}" fill="${eColor}" />
          <circle cx="${oX + (cellSize * 7)/2}" cy="${oY + (cellSize * 7)/2}" r="${(cellSize * 5)/2}" fill="${config.bgColor}" />
          <circle cx="${oX + (cellSize * 7)/2}" cy="${oY + (cellSize * 7)/2}" r="${(cellSize * 3)/2}" fill="${eColor}" />
        `;
      } else {
        // Rounded
        const rFactor = cellSize * 1.5;
        return `
          <rect x="${oX}" y="${oY}" width="${cellSize * 7}" height="${cellSize * 7}" rx="${rFactor}" ry="${rFactor}" fill="${eColor}" />
          <rect x="${oX + cellSize}" y="${oY + cellSize}" width="${cellSize * 5}" height="${cellSize * 5}" rx="${rFactor * 0.7}" ry="${rFactor * 0.7}" fill="${config.bgColor}" />
          <rect x="${oX + cellSize * 2}" y="${oY + cellSize * 2}" width="${cellSize * 3}" height="${cellSize * 3}" rx="${rFactor * 0.4}" ry="${rFactor * 0.4}" fill="${eColor}" />
        `;
      }
    };

    const eyeLeftTop = renderEyeSVG(margin, margin);
    const eyeRightTop = renderEyeSVG(margin + (size - 7) * cellSize, margin);
    const eyeLeftBottom = renderEyeSVG(margin, margin + (size - 7) * cellSize);

    // Optional Centered Logo placeholder
    let logoStr = '';
    if (config.logoUrl) {
      const scale = activeAreaSize * (config.logoSize / 100);
      const lx = margin + (activeAreaSize - scale) / 2;
      const ly = margin + (activeAreaSize - scale) / 2;
      logoStr = `
        <circle cx="${canvasSize/2}" cy="${canvasSize/2}" r="${scale/2 + cellSize * 0.4}" fill="${config.bgColor}" />
        <image href="${config.logoUrl}" x="${lx}" y="${ly}" width="${scale}" height="${scale}" />
      `;
    }

    return `<?xml version="1.0" standalone="no"?>
      <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
      <svg width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        ${defsStr}
        <rect width="100%" height="100%" fill="${config.bgColor}" />
        ${paths}
        ${eyeLeftTop}
        ${eyeRightTop}
        ${eyeLeftBottom}
        ${logoStr}
      </svg>
    `;
  } catch (err) {
    console.error("SVG compilation failure:", err);
    return '';
  }
}
