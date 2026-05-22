/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Supported QR Content Types
export type QRType = 'url' | 'text' | 'email' | 'phone' | 'wifi' | 'vcard' | 'pdf' | 'image' | 'sms' | 'whatsapp' | 'social' | 'location' | 'crypto';

// QR Design Configuration
export interface QRDesignConfig {
  size: number;
  margin: number;
  fgColor: string;
  bgColor: string;
  gradientType: 'none' | 'linear' | 'radial';
  gradientColor: string;
  gradientAngle: number;
  dotStyle: 'square' | 'dots' | 'rounded' | 'classy';
  eyeStyle: 'square' | 'rounded' | 'circle' | 'leaf';
  eyeColor: string;
  logoUrl?: string;
  logoSize: number; // percentage (10-30)
  logoMargin: boolean; // draw clear-zone under logo
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
}

// vCard details
export interface VCardDetails {
  firstName: string;
  lastName: string;
  organization: string;
  phoneMobile: string;
  phoneWork: string;
  email: string;
  url: string;
  address: string;
}

// WiFi details
export interface WiFiDetails {
  ssid: string;
  password?: string;
  encryption: 'WEP' | 'WPA' | 'none';
  hidden: boolean;
}

// QR Saved Projects
export interface QRProject {
  id: string;
  name: string;
  type: QRType;
  content: string; // The URL or encoded details
  rawDetails: any;  // parsed vcard, wifi, or string
  design: QRDesignConfig;
  createdAt: string;
  updatedAt: string;
  scanCount: number;
  trackingEnabled: boolean;
  trackingId?: string; // Short ID used on the tracking redirects path
}

// Analytical logs of individual scans
export interface ScanLog {
  id: string;
  trackingId: string;
  timestamp: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
  browser: string;
  approxLocation: string;
  ip: string;
}

// Global state profile config
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
}
