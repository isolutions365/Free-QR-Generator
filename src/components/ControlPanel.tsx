/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Link2, AlignLeft, Mail, Phone, Wifi, Award, FileText, Image, 
  Settings, Sparkles, Sliders, Palette, ShieldAlert, Check,
  AlertTriangle, AlertCircle, Info, Upload, X,
  MessageSquare, Send, Share2, MapPin, Coins,
  Save, Trash2, Layers
} from 'lucide-react';
import { QRDesignConfig, QRType, VCardDetails, WiFiDetails } from '../types';
import { generatevCardString, generateWiFiString } from '../utils/qrRenderer';

export interface ValidationReport {
  isValid: boolean;
  status: 'valid' | 'warning' | 'info';
  message: string;
  fixes?: { label: string; actionId: string; suggestion: string }[];
}

function getValidationReport(
  type: QRType,
  urlVal: string,
  textVal: string,
  emailDetails: { to: string; subject: string; body: string },
  phoneVal: string,
  wifi: WiFiDetails,
  vcard: VCardDetails,
  smsDetails?: { phone: string; message: string },
  whatsappDetails?: { phone: string; message: string },
  socialDetails?: { platform: string; username: string },
  locationDetails?: { query: string },
  cryptoDetails?: { chain: string; address: string; amount: string }
): ValidationReport {
  switch (type) {
    case 'url': {
      const urlStr = urlVal.trim();
      if (!urlStr) {
        return {
          isValid: false,
          status: 'info',
          message: 'Website URL input is empty.',
          fixes: [{ label: 'Prepopulate google.com', actionId: 'prepopulate_url', suggestion: 'https://google.com' }]
        };
      }
      
      const hasProtocol = /^(https?:\/\/)/i.test(urlStr);
      const hasSpaces = /\s/.test(urlStr);
      const fixes: ValidationReport['fixes'] = [];

      if (!hasProtocol) {
        fixes.push({
          label: 'Prepend "https://"',
          actionId: 'prepend_https',
          suggestion: `https://${urlStr}`
        });
      }
      if (hasSpaces) {
        fixes.push({
          label: 'Remove blank spaces',
          actionId: 'strip_spaces',
          suggestion: urlStr.replace(/\s+/g, '')
        });
      }

      if (fixes.length > 0) {
        return {
          isValid: false,
          status: 'warning',
          message: 'URL format issues detected. Scanners might treat it as raw text instead of a website link.',
          fixes
        };
      }

      // Final syntax checks
      try {
        if (hasProtocol) {
          new URL(urlStr);
        }
      } catch (e) {
        return {
          isValid: false,
          status: 'warning',
          message: 'URL contains irregular syntax or illegal characters.',
          fixes: [{ label: 'Reset to default format', actionId: 'prepopulate_url', suggestion: 'https://google.com' }]
        };
      }

      return {
        isValid: true,
        status: 'valid',
        message: 'Website URL is properly structured and ready for scanning!'
      };
    }
    case 'text': {
      const txt = textVal.trim();
      if (!txt) {
        return {
          isValid: false,
          status: 'info',
          message: 'Enter plain text content to map onto the QR structure.',
          fixes: [{ label: 'Load sample phrase', actionId: 'sample_text', suggestion: 'Scan to connect with ProQR Suite' }]
        };
      }
      if (txt.length > 300) {
        return {
          isValid: true,
          status: 'warning',
          message: `Text is dense (${txt.length} chars). Code resolution might scan slower on low-tier lens.`,
          fixes: [{ label: 'Trim text to 150 chars', actionId: 'trim_text', suggestion: txt.slice(0, 150) }]
        };
      }
      return {
        isValid: true,
        status: 'valid',
        message: 'Text conforms perfectly to standard text payload schemas.'
      };
    }
    case 'email': {
      const emailTo = emailDetails.to.trim();
      if (!emailTo) {
        return {
          isValid: false,
          status: 'warning',
          message: 'Recipient address is empty.',
          fixes: []
        };
      }
      const isEmailValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailTo);
      if (!isEmailValid) {
        const withSpacesRemoved = emailTo.replace(/\s+/g, '');
        const autoFixes: ValidationReport['fixes'] = [];
        if (/\s/.test(emailTo)) {
          autoFixes.push({ label: 'Strip draft spaces', actionId: 'trim_email_spaces', suggestion: withSpacesRemoved });
        }
        return {
          isValid: false,
          status: 'warning',
          message: 'Recipient email format appears malformed (expected mailto style: user@domain.com).',
          fixes: autoFixes
        };
      }
      return {
        isValid: true,
        status: 'valid',
        message: 'Email syntax verified. Devices will invoke their local mail app setup instantly.'
      };
    }
    case 'phone': {
      const rawPhone = phoneVal.trim();
      if (!rawPhone) {
        return {
          isValid: false,
          status: 'warning',
          message: 'Phone payload is unallocated.',
          fixes: []
        };
      }
      const numbersOnly = rawPhone.replace(/[^+\d]/g, '');
      const hasAlpha = /[a-zA-Z]/.test(rawPhone);
      const isPhoneValid = /^\+?[0-9\s\-()]{5,20}$/.test(rawPhone);

      if (hasAlpha || !isPhoneValid) {
        return {
          isValid: false,
          status: 'warning',
          message: 'Phone format contains illegal letters or is too short.',
          fixes: numbersOnly.length >= 5 ? [{ label: 'Clean letters / Leave raw number', actionId: 'clean_phone', suggestion: numbersOnly }] : []
        };
      }
      return {
        isValid: true,
        status: 'valid',
        message: 'Phone string is valid. Code triggers immediate mobile system dialing.'
      };
    }
    case 'wifi': {
      const ssidStr = wifi.ssid.trim();
      const needsPass = wifi.encryption !== 'none';
      const password = wifi.password;

      if (!ssidStr) {
        return {
          isValid: false,
          status: 'warning',
          message: 'SSID (WiFi Network Name) is blank.',
          fixes: []
        };
      }

      if (needsPass) {
        if (!password) {
          return {
            isValid: false,
            status: 'warning',
            message: 'A security passkey is required for protected networks.',
            fixes: []
          };
        }
        if (wifi.encryption === 'WPA' && password.length < 8) {
          return {
            isValid: false,
            status: 'warning',
            message: 'WPA password security protocols mandate a minimum of 8 characters.',
            fixes: []
          };
        }
        if (wifi.encryption === 'WEP' && password.length !== 5 && password.length !== 13 && password.length !== 10 && password.length !== 26) {
          return {
            isValid: false,
            status: 'warning',
            message: 'WEP key must be exactly 5, 13, 10, or 26 characters depending on key bitness.',
            fixes: []
          };
        }
      }

      return {
        isValid: true,
        status: 'valid',
        message: 'SSID and authorization attributes verified. Mobile scan will auto-associate smoothly.'
      };
    }
    case 'vcard': {
      const fn = vcard.firstName.trim();
      const ln = vcard.lastName.trim();
      const email = vcard.email.trim();
      const url = vcard.url.trim();

      if (!fn && !ln) {
        return {
          isValid: false,
          status: 'warning',
          message: 'No contact name assigned to the MeCard profiles.',
          fixes: [{ label: 'Set as Test Client', actionId: 'vcard_mock_name', suggestion: 'John' }]
        };
      }

      const fixes: ValidationReport['fixes'] = [];
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        fixes.push({ label: 'Zap bad email characters', actionId: 'vcard_clean_email', suggestion: email.replace(/\s+/g, '') });
      }
      if (url && !/^(https?:\/\/)/i.test(url)) {
        fixes.push({ label: 'Prefix web URL with https://', actionId: 'vcard_website_https', suggestion: `https://${url}` });
      }

      if (fixes.length > 0) {
        return {
          isValid: false,
          status: 'warning',
          message: 'Contact details have formatting inconsistencies.',
          fixes
        };
      }

      return {
        isValid: true,
        status: 'valid',
        message: 'vCard file profile structure correctly conforms to RFC-6350 rules.'
      };
    }
    case 'pdf':
    case 'image': {
      return {
        isValid: true,
        status: 'valid',
        message: 'Pre-validated dynamic document server URL successfully structured.'
      };
    }
    case 'sms': {
      const smsPhone = smsDetails?.phone?.trim() || '';
      if (!smsPhone) {
        return {
          isValid: false,
          status: 'warning',
          message: 'SMS destination mobile number is empty.',
          fixes: []
        };
      }
      return {
        isValid: true,
        status: 'valid',
        message: 'SMS payload generated. Scanning launches system composer to compile text.'
      };
    }
    case 'whatsapp': {
      const waPhone = whatsappDetails?.phone?.trim() || '';
      if (!waPhone) {
        return {
          isValid: false,
          status: 'warning',
          message: 'WhatsApp phone number is empty.',
          fixes: []
        };
      }
      return {
        isValid: true,
        status: 'valid',
        message: 'WhatsApp Click-to-Chat payload initialized successfully.'
      };
    }
    case 'social': {
      const username = socialDetails?.username?.trim() || '';
      if (!username) {
        return {
          isValid: false,
          status: 'warning',
          message: 'Social platform account username is empty.',
          fixes: []
        };
      }
      return {
        isValid: true,
        status: 'valid',
        message: `${socialDetails.platform.charAt(0).toUpperCase() + socialDetails.platform.slice(1)} account redirect payload verified.`
      };
    }
    case 'location': {
      const q = locationDetails?.query?.trim() || '';
      if (!q) {
        return {
          isValid: false,
          status: 'warning',
          message: 'Location lookup address, query, or coordinates are empty.',
          fixes: []
        };
      }
      return {
        isValid: true,
        status: 'valid',
        message: 'Interactive Google Maps coordinates/address redirect is fully armed.'
      };
    }
    case 'crypto': {
      const address = cryptoDetails?.address?.trim() || '';
      if (!address) {
        return {
          isValid: false,
          status: 'warning',
          message: 'Cryptocurrency wallet address is empty.',
          fixes: []
        };
      }
      return {
        isValid: true,
        status: 'valid',
        message: `${cryptoDetails.chain.toUpperCase()} wallet request payload validated.`
      };
    }
    default:
      return {
        isValid: true,
        status: 'valid',
        message: 'Content validated successfully.'
      };
  }
}

interface ControlPanelProps {
  type: QRType;
  setType: (type: QRType) => void;
  content: string;
  setContent: (content: string) => void;
  design: QRDesignConfig;
  setDesign: React.Dispatch<React.SetStateAction<QRDesignConfig>>;
}

const LOGO_PRESETS = [
  { name: 'None', url: '' },
  { 
    name: 'Google', 
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="%234285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="%2334A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="%23FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="%23EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>' 
  },
  { 
    name: 'GitHub', 
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="%2324292e"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>' 
  },
  { 
    name: 'Twitter', 
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="%230f1419"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' 
  },
  { 
    name: 'Instagram', 
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="%23E1306C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>' 
  },
];

const SYSTEM_PRESETS = [
  {
    id: 'midnight_slate',
    name: 'Midnight Slate',
    fgColor: '#0f172a',
    bgColor: '#ffffff',
    gradientType: 'none' as const,
    gradientColor: '#475569',
    gradientAngle: 180,
    dotStyle: 'square' as const,
    eyeStyle: 'square' as const,
    eyeColor: '#020617'
  },
  {
    id: 'emerald_aurora',
    name: 'Emerald Aurora',
    fgColor: '#047857',
    bgColor: '#f0fdf4',
    gradientType: 'linear' as const,
    gradientColor: '#065f46',
    gradientAngle: 135,
    dotStyle: 'classy' as const,
    eyeStyle: 'rounded' as const,
    eyeColor: '#064e3b'
  },
  {
    id: 'sunset_breeze',
    name: 'Sunset Breeze',
    fgColor: '#be123c',
    bgColor: '#fff1f2',
    gradientType: 'linear' as const,
    gradientColor: '#701a75',
    gradientAngle: 90,
    dotStyle: 'rounded' as const,
    eyeStyle: 'leaf' as const,
    eyeColor: '#4a044e'
  },
  {
    id: 'ocean_dream',
    name: 'Ocean Dream',
    fgColor: '#1d4ed8',
    bgColor: '#f0f9ff',
    gradientType: 'linear' as const,
    gradientColor: '#0369a1',
    gradientAngle: 45,
    dotStyle: 'dots' as const,
    eyeStyle: 'circle' as const,
    eyeColor: '#1e3a8a'
  },
  {
    id: 'cyber_neon',
    name: 'Cyber Neon',
    fgColor: '#d946ef',
    bgColor: '#0f172a',
    gradientType: 'linear' as const,
    gradientColor: '#06b6d4',
    gradientAngle: 135,
    dotStyle: 'classy' as const,
    eyeStyle: 'circle' as const,
    eyeColor: '#38bdf8'
  },
  {
    id: 'sovereign_gold',
    name: 'Sovereign Gold',
    fgColor: '#b45309',
    bgColor: '#fafaf9',
    gradientType: 'radial' as const,
    gradientColor: '#78350f',
    gradientAngle: 0,
    dotStyle: 'rounded' as const,
    eyeStyle: 'leaf' as const,
    eyeColor: '#451a03'
  }
];

export default function ControlPanel({
  type,
  setType,
  content,
  setContent,
  design,
  setDesign
}: ControlPanelProps) {
  // Custom templates / design configurations state
  const [customPresets, setCustomPresets] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('qr_design_presets_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [customPresetName, setCustomPresetName] = useState('');

  // Input builders internal state
  const [wifi, setWifi] = useState<WiFiDetails>({ ssid: '', password: '', encryption: 'WPA', hidden: false });
  const [vcard, setVcard] = useState<VCardDetails>({
    firstName: '',
    lastName: '',
    organization: '',
    phoneMobile: '',
    phoneWork: '',
    email: '',
    url: '',
    address: ''
  });
  const [emailDetails, setEmailDetails] = useState({ to: '', subject: '', body: '' });
  const [phoneVal, setPhoneVal] = useState('');
  const [textVal, setTextVal] = useState('');
  const [urlVal, setUrlVal] = useState('https://google.com');

  // Input builders internal state (additional types)
  const [smsDetails, setSmsDetails] = useState({ phone: '', message: '' });
  const [whatsappDetails, setWhatsappDetails] = useState({ phone: '', message: '' });
  const [socialDetails, setSocialDetails] = useState({ platform: 'instagram', username: '' });
  const [locationDetails, setLocationDetails] = useState({ query: '' });
  const [cryptoDetails, setCryptoDetails] = useState({ chain: 'bitcoin', address: '', amount: '' });

  // Logo upload state variables
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      handleUploadedFile(e.target.files[0]);
    }
  };

  const handleUploadedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Invalid format. Please upload PNG, JPG, SVG, or WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File exceeds 2MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        updateDesign('logoUrl', event.target.result);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read files.');
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Schema verification engine states
  const [isInspecting, setIsInspecting] = useState(false);
  const [lastManualVerify, setLastManualVerify] = useState<string | null>(null);

  const report = React.useMemo(() => {
    return getValidationReport(
      type, urlVal, textVal, emailDetails, phoneVal, wifi, vcard,
      smsDetails, whatsappDetails, socialDetails, locationDetails, cryptoDetails
    );
  }, [
    type, urlVal, textVal, emailDetails, phoneVal, wifi, vcard,
    smsDetails, whatsappDetails, socialDetails, locationDetails, cryptoDetails
  ]);

  const triggerManualInspect = () => {
    setIsInspecting(true);
    setTimeout(() => {
      setIsInspecting(false);
      setLastManualVerify(new Date().toLocaleTimeString());
    }, 450);
  };

  const handleApplyFix = (actionId: string, suggestion: string) => {
    if (actionId === 'prepend_https' || actionId === 'strip_spaces' || actionId === 'prepopulate_url') {
      setUrlVal(suggestion);
    } else if (actionId === 'sample_text' || actionId === 'trim_text') {
      setTextVal(suggestion);
    } else if (actionId === 'trim_email_spaces') {
      setEmailDetails(prev => ({ ...prev, to: suggestion }));
    } else if (actionId === 'clean_phone') {
      setPhoneVal(suggestion);
    } else if (actionId === 'vcard_mock_name') {
      setVcard(prev => ({ ...prev, firstName: suggestion }));
    } else if (actionId === 'vcard_clean_email') {
      setVcard(prev => ({ ...prev, email: suggestion }));
    } else if (actionId === 'vcard_website_https') {
      setVcard(prev => ({ ...prev, url: suggestion }));
    }
  };

  // Sync inputs to main content state depending on active template type
  useEffect(() => {
    if (type === 'url') {
      setContent(urlVal || 'https://google.com');
    } else if (type === 'text') {
      setContent(textVal || 'Hello World');
    } else if (type === 'email') {
      const mailto = `mailto:${emailDetails.to}?subject=${encodeURIComponent(emailDetails.subject)}&body=${encodeURIComponent(emailDetails.body)}`;
      setContent(mailto);
    } else if (type === 'phone') {
      setContent(`tel:${phoneVal || '+15550001111'}`);
    } else if (type === 'wifi') {
      setContent(generateWiFiString(wifi));
    } else if (type === 'vcard') {
      setContent(generatevCardString(vcard));
    } else if (type === 'sms') {
      const phone = smsDetails.phone || '+15550001111';
      const msg = smsDetails.message;
      setContent(`SMSTO:${phone}:${msg}`);
    } else if (type === 'whatsapp') {
      const phone = whatsappDetails.phone.replace(/[^+\d]/g, '') || '15550001111';
      const msg = encodeURIComponent(whatsappDetails.message);
      setContent(`https://wa.me/${phone}${msg ? `?text=${msg}` : ''}`);
    } else if (type === 'social') {
      const handle = socialDetails.username || 'google';
      let socialUrl = '';
      if (socialDetails.platform === 'instagram') {
        socialUrl = `https://instagram.com/${handle}`;
      } else if (socialDetails.platform === 'twitter') {
        socialUrl = `https://twitter.com/${handle}`;
      } else if (socialDetails.platform === 'tiktok') {
        socialUrl = `https://tiktok.com/@${handle}`;
      } else if (socialDetails.platform === 'youtube') {
        socialUrl = `https://youtube.com/@${handle}`;
      } else if (socialDetails.platform === 'facebook') {
        socialUrl = `https://facebook.com/${handle}`;
      } else if (socialDetails.platform === 'linkedin') {
        socialUrl = `https://linkedin.com/in/${handle}`;
      }
      setContent(socialUrl);
    } else if (type === 'location') {
      const query = locationDetails.query || 'Googleplex';
      setContent(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
    } else if (type === 'crypto') {
      const addr = cryptoDetails.address || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
      const amount = cryptoDetails.amount;
      const chain = cryptoDetails.chain;
      setContent(`${chain}:${addr}${amount ? `?amount=${amount}` : ''}`);
    }
  }, [type, urlVal, textVal, emailDetails, phoneVal, wifi, vcard, smsDetails, whatsappDetails, socialDetails, locationDetails, cryptoDetails]);

  // Handle mock PDF / Image document inputs
  const handlePdfMock = () => {
    const mockPdfLink = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
    setUrlVal(mockPdfLink);
    setContent(mockPdfLink);
    alert("Simulated PDF Document uploaded! The generated QR will point to this cloud-hosted document link.");
  };

  const handleImageMock = () => {
    const mockImgLink = "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5";
    setUrlVal(mockImgLink);
    setContent(mockImgLink);
    alert("Simulated Image uploaded! The generated QR will point to this cloud-hosted graphic link.");
  };

  const updateDesign = (key: keyof QRDesignConfig, val: any) => {
    setDesign(prev => ({
      ...prev,
      [key]: val,
      // Force higher ECL if logo is assigned so it remains highly readable
      ...(key === 'logoUrl' && val ? { errorCorrectionLevel: 'H' } : {})
    }));
  };

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = customPresetName.trim();
    const nameToSave = trimmedName || `Custom Template ${customPresets.length + 1}`;
    
    const newPreset = {
      id: 'custom_' + Date.now(),
      name: nameToSave,
      fgColor: design.fgColor,
      bgColor: design.bgColor,
      gradientType: design.gradientType,
      gradientColor: design.gradientColor,
      gradientAngle: design.gradientAngle,
      dotStyle: design.dotStyle,
      eyeStyle: design.eyeStyle,
      eyeColor: design.eyeColor
    };
    
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem('qr_design_presets_v1', JSON.stringify(updated));
    setCustomPresetName('');
  };

  const handleApplyPreset = (preset: any) => {
    setDesign(prev => ({
      ...prev,
      fgColor: preset.fgColor,
      bgColor: preset.bgColor,
      gradientType: preset.gradientType,
      gradientColor: preset.gradientColor,
      gradientAngle: preset.gradientAngle,
      dotStyle: preset.dotStyle,
      eyeStyle: preset.eyeStyle,
      eyeColor: preset.eyeColor
    }));
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this custom template?')) {
      const updated = customPresets.filter(p => p.id !== id);
      setCustomPresets(updated);
      localStorage.setItem('qr_design_presets_v1', JSON.stringify(updated));
    }
  };

  return (
    <div id="control_panel" className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 space-y-8">
      
      {/* 1. Step: Select QR template type */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">1. Select Content Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: 'url', label: 'URL', Icon: Link2 },
            { id: 'text', label: 'Text', Icon: AlignLeft },
            { id: 'email', label: 'Email', Icon: Mail },
            { id: 'phone', label: 'Phone', Icon: Phone },
            { id: 'wifi', label: 'WiFi', Icon: Wifi },
            { id: 'vcard', label: 'vCard', Icon: Award },
            { id: 'pdf', label: 'PDF', Icon: FileText },
            { id: 'image', label: 'Image', Icon: Image },
            { id: 'sms', label: 'SMS', Icon: MessageSquare },
            { id: 'whatsapp', label: 'WhatsApp', Icon: Send },
            { id: 'social', label: 'Social Link', Icon: Share2 },
            { id: 'location', label: 'Location', Icon: MapPin },
            { id: 'crypto', label: 'Crypto', Icon: Coins },
          ].map((item) => {
            const ActiveIcon = item.Icon;
            const isSelected = type === item.id;
            return (
              <button
                key={item.id}
                id={`btn_type_${item.id}`}
                onClick={() => {
                  setType(item.id as QRType);
                  if (item.id === 'pdf') handlePdfMock();
                  else if (item.id === 'image') handleImageMock();
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isSelected 
                    ? 'border-blue-600 bg-blue-50/50 text-blue-600 font-semibold shadow-xs' 
                    : 'border-slate-200 hover:border-slate-300 text-slate-650 hover:bg-slate-50/50'
                }`}
              >
                <ActiveIcon className="w-5 h-5 mb-1" />
                <span className="text-[11.5px] font-sans">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Step: Form variables dynamic input */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">2. Configure Details</label>
          <div className="flex items-center space-x-1.5">
            <button
              id="btn_schema_manual_inspect"
              type="button"
              onClick={triggerManualInspect}
              disabled={isInspecting}
              className="text-[10px] text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100 disabled:bg-slate-100 disabled:text-slate-400 px-2 py-0.5 rounded font-bold transition-all border border-blue-200/50 flex items-center gap-1 cursor-pointer"
            >
              {isInspecting ? (
                <span className="w-2.5 h-2.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <ShieldAlert className="w-2.5 h-2.5" />
              )}
              <span>{isInspecting ? 'Auditing Schema...' : 'Manual Audit'}</span>
            </button>
            <span className={`text-[10px] px-2 py-0.5 font-bold uppercase rounded tracking-wider flex items-center gap-1 border leading-none ${
              report.status === 'valid'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : report.status === 'warning'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                report.status === 'valid' ? 'bg-emerald-500' : report.status === 'warning' ? 'bg-amber-500' : 'bg-slate-400'
              }`}></span>
              {report.status === 'valid' ? 'Format OK' : report.status === 'warning' ? 'Warning' : 'Details Empty'}
            </span>
          </div>
        </div>
        
        {/* URL TYPE */}
        {type === 'url' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Website URL</label>
            <input 
              id="url_input"
              type="url" 
              placeholder="https://example.com" 
              value={urlVal}
              onChange={(e) => setUrlVal(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
            />
          </div>
        )}

        {/* TEXT TYPE */}
        {type === 'text' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Plain text</label>
            <textarea
              id="text_input"
              placeholder="Type your text content here..."
              rows={3}
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
            />
          </div>
        )}

        {/* EMAIL TYPE */}
        {type === 'email' && (
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Email Address</label>
              <input
                id="email_to"
                type="email"
                placeholder="recipient@example.com"
                value={emailDetails.to}
                onChange={(e) => setEmailDetails(prev => ({ ...prev, to: e.target.value }))}
                className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Subject</label>
              <input
                id="email_sub"
                type="text"
                placeholder="Inquiry about QR design"
                value={emailDetails.subject}
                onChange={(e) => setEmailDetails(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Body Message</label>
              <textarea
                id="email_body"
                placeholder="Write your email draft context here..."
                rows={2}
                value={emailDetails.body}
                onChange={(e) => setEmailDetails(prev => ({ ...prev, body: e.target.value }))}
                className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
          </div>
        )}

        {/* PHONE TYPE */}
        {type === 'phone' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Phone Number</label>
            <input
              id="phone_input"
              type="tel"
              placeholder="+1 (555) 019-2834"
              value={phoneVal}
              onChange={(e) => setPhoneVal(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
        )}

        {/* WIFI TYPE */}
        {type === 'wifi' && (
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-600">Network Name (SSID)</label>
              <input
                id="wifi_ssid"
                type="text"
                placeholder="My Home Broadband"
                value={wifi.ssid}
                onChange={(e) => setWifi(prev => ({ ...prev, ssid: e.target.value }))}
                className="w-full text-sm px-4 py-2 bg-white rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Encryption</label>
              <select
                id="wifi_enc"
                value={wifi.encryption}
                onChange={(e) => setWifi(prev => ({ ...prev, encryption: e.target.value as any }))}
                className="w-full text-sm px-3 py-2 bg-white rounded-lg border border-slate-200 focus:outline-hidden"
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="none">Unsecured</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Password</label>
              <input
                id="wifi_pass"
                type="password"
                placeholder="••••••••"
                disabled={wifi.encryption === 'none'}
                value={wifi.password}
                onChange={(e) => setWifi(prev => ({ ...prev, password: e.target.value }))}
                className="w-full text-sm px-4 py-2 bg-white rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-100 disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* vCARD TYPE */}
        {type === 'vcard' && (
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
            <div className="col-span-1 space-y-1">
              <label className="text-[10px] uppercase font-semibold text-slate-500">First Name</label>
              <input
                id="card_fn"
                type="text"
                placeholder="John"
                value={vcard.firstName}
                onChange={(e) => setVcard(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-slate-200 focus:outline-hidden"
              />
            </div>
            <div className="col-span-1 space-y-1">
              <label className="text-[10px] uppercase font-semibold text-slate-500">Last Name</label>
              <input
                id="card_ln"
                type="text"
                placeholder="Doe"
                value={vcard.lastName}
                onChange={(e) => setVcard(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-slate-200 focus:outline-hidden"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] uppercase font-semibold text-slate-500">Organization</label>
              <input
                id="card_org"
                type="text"
                placeholder="Google Cloud Inc."
                value={vcard.organization}
                onChange={(e) => setVcard(prev => ({ ...prev, organization: e.target.value }))}
                className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-slate-200"
              />
            </div>
            <div className="col-span-1 space-y-1">
              <label className="text-[10px] uppercase font-semibold text-slate-500">Mobile Phone</label>
              <input
                id="card_tel_m"
                type="text"
                placeholder="+1 555 4325"
                value={vcard.phoneMobile}
                onChange={(e) => setVcard(prev => ({ ...prev, phoneMobile: e.target.value }))}
                className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-slate-200"
              />
            </div>
            <div className="col-span-1 space-y-1">
              <label className="text-[10px] uppercase font-semibold text-slate-500">Company Email</label>
              <input
                id="card_email"
                type="email"
                placeholder="john.doe@google.com"
                value={vcard.email}
                onChange={(e) => setVcard(prev => ({ ...prev, email: e.target.value }))}
                className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-slate-200"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] uppercase font-semibold text-slate-500">Website URL</label>
              <input
                id="card_url"
                type="text"
                placeholder="https://john-doe.me"
                value={vcard.url}
                onChange={(e) => setVcard(prev => ({ ...prev, url: e.target.value }))}
                className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-slate-200"
              />
            </div>
          </div>
        )}

        {/* PDF & IMAGE TYPE (Uploaded Indicator) */}
        {(type === 'pdf' || type === 'image') && (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center space-x-3 text-left">
            <span className="flex items-center justify-center p-2 rounded-full bg-emerald-100 text-emerald-600">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-medium text-emerald-800">Dynamic File Link Generated</p>
              <p className="text-[11px] text-emerald-600 truncate max-w-[200px]">{content}</p>
            </div>
          </div>
        )}

        {/* SMS TYPE */}
        {type === 'sms' && (
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Mobile Phone Number</label>
              <input
                id="sms_phone"
                type="tel"
                placeholder="+15551234567"
                value={smsDetails.phone}
                onChange={(e) => setSmsDetails(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Pre-filled SMS Message</label>
              <textarea
                id="sms_message"
                placeholder="Type the message details here..."
                rows={2}
                value={smsDetails.message}
                onChange={(e) => setSmsDetails(prev => ({ ...prev, message: e.target.value }))}
                className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
              />
            </div>
          </div>
        )}

        {/* WHATSAPP TYPE */}
        {type === 'whatsapp' && (
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">WhatsApp Mobile Number (with Country Code)</label>
              <input
                id="whatsapp_phone"
                type="tel"
                placeholder="15551234567"
                value={whatsappDetails.phone}
                onChange={(e) => setWhatsappDetails(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Do not include +, 00, or characters. Format: [Country Code][Number] (e.g. 15551234567)</span>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Pre-filled Chat Message</label>
              <textarea
                id="whatsapp_message"
                placeholder="Hello! Reaching out via your custom QR code..."
                rows={2}
                value={whatsappDetails.message}
                onChange={(e) => setWhatsappDetails(prev => ({ ...prev, message: e.target.value }))}
                className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
              />
            </div>
          </div>
        )}

        {/* SOCIAL LINK TYPE */}
        {type === 'social' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-1">
              <label className="text-xs font-medium text-slate-600">Social Network</label>
              <select
                id="social_platform"
                value={socialDetails.platform}
                onChange={(e) => setSocialDetails(prev => ({ ...prev, platform: e.target.value }))}
                className="w-full text-sm px-3 py-2.5 bg-white rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500"
              >
                <option value="instagram">Instagram</option>
                <option value="twitter">X / Twitter</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Username / Handle</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono select-none">@</span>
                <input
                  id="social_username"
                  type="text"
                  placeholder="username"
                  value={socialDetails.username}
                  onChange={(e) => setSocialDetails(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full text-sm pl-7 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400 font-sans"
                />
              </div>
            </div>
          </div>
        )}

        {/* LOCATION TYPE */}
        {type === 'location' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Lookup Address or Coordinates</label>
            <input 
              id="location_query"
              type="text" 
              placeholder="e.g. Eiffel Tower, Paris OR 48.8584,2.2945" 
              value={locationDetails.query}
              onChange={(e) => setLocationDetails(prev => ({ ...prev, query: e.target.value }))}
              className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
            />
            <span className="text-[10px] text-slate-400 block mt-1">Accepts human address (e.g. Times Square NYC) and GPS coordinates.</span>
          </div>
        )}

        {/* CRYPTO TYPE */}
        {type === 'crypto' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-1">
              <label className="text-xs font-medium text-slate-600">Blockchain Network</label>
              <select
                id="crypto_chain"
                value={cryptoDetails.chain}
                onChange={(e) => setCryptoDetails(prev => ({ ...prev, chain: e.target.value }))}
                className="w-full text-sm px-3 py-2.5 bg-white rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500"
              >
                <option value="bitcoin">Bitcoin (BTC)</option>
                <option value="ethereum">Ethereum (ETH)</option>
                <option value="solana">Solana (SOL)</option>
                <option value="dogecoin">Dogecoin (DOGE)</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Wallet Destination Address</label>
              <input
                id="crypto_address"
                type="text"
                placeholder="Address string..."
                value={cryptoDetails.address}
                onChange={(e) => setCryptoDetails(prev => ({ ...prev, address: e.target.value }))}
                className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400 font-mono text-xs"
              />
            </div>
            <div className="col-span-full sm:col-span-3 space-y-1">
              <label className="text-xs font-medium text-slate-600">Requested Amount (Optional)</label>
              <input
                id="crypto_amount"
                type="text"
                placeholder="e.g. 0.05"
                value={cryptoDetails.amount}
                onChange={(e) => setCryptoDetails(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
              />
            </div>
          </div>
        )}

        {/* Dynamic Interactive Validation Audit Feedback Panel */}
        <div 
          id="qr_validator_audit_box" 
          className={`p-4 rounded-xl border text-left transition-all duration-300 ${
            isInspecting
              ? 'bg-blue-50/20 border-blue-250/50 shadow-xs'
              : report.status === 'valid'
                ? 'bg-emerald-50/10 border-emerald-200/50'
                : report.status === 'warning'
                  ? 'bg-amber-50/20 border-amber-200'
                  : 'bg-slate-50/30 border-slate-200'
          }`}
        >
          {isInspecting ? (
            <div className="flex items-center justify-center space-x-2.5 py-4">
              <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              <span className="text-xs font-mono font-bold text-blue-700 uppercase tracking-wider animate-pulse">Running Format Inspector Rules...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2.5">
                  <div className="mt-0.5 shrink-0">
                    {report.status === 'valid' ? (
                      <Check className="w-4.5 h-4.5 text-emerald-650 bg-emerald-50 p-0.5 rounded-full border border-emerald-100" />
                    ) : report.status === 'warning' ? (
                      <AlertTriangle className="w-4.5 h-4.5 text-amber-655 bg-amber-50 p-0.5 rounded-full border border-amber-100" />
                    ) : (
                      <Info className="w-4.5 h-4.5 text-slate-500 bg-slate-50 p-0.5 rounded-full border border-slate-100" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">
                      {report.message}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {report.status === 'valid' 
                        ? 'Verification scan conforms fully to receiver configurations.' 
                        : report.status === 'warning'
                          ? 'Format cautions found. Apply recommendations below to guarantee scans.'
                          : 'Enter appropriate context values to run the structural rules parser.'}
                    </p>
                  </div>
                </div>

                {lastManualVerify && (
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                    Checked {lastManualVerify}
                  </span>
                )}
              </div>

              {/* Fix Recommendations Checklist */}
              {report.fixes && report.fixes.length > 0 && (
                <div className="border-t border-slate-250/30 pt-2.5 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Auto-Format Helper tools:</span>
                  <div className="flex flex-col gap-1.5">
                    {report.fixes.map((fix) => (
                      <div 
                        key={fix.actionId} 
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-150 text-[11px] leading-tight font-sans"
                      >
                        <span className="text-slate-600 font-medium">
                          {fix.actionId === 'prepend_https' 
                            ? 'Protocol specifier missing' 
                            : fix.actionId === 'strip_spaces' 
                              ? 'Extraneous whitespaces detected' 
                              : fix.actionId === 'vcard_website_https'
                                ? 'vCard URI standard'
                                : 'Format schema rules mismatch'}
                        </span>
                        <button
                          id={`btn_apply_fix_${fix.actionId}`}
                          type="button"
                          onClick={() => handleApplyFix(fix.actionId, fix.suggestion)}
                          className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Sparkles className="w-3 h-3 text-blue-600" />
                          <span>Apply: {fix.label}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Step: Design Presets & Templates */}
      <div className="space-y-4 pt-2 border-t border-slate-100 text-left animate-fade-in">
        <div className="flex items-center space-x-2 text-slate-700">
          <Layers className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">3. Design Presets & Templates</span>
        </div>

        <p className="text-slate-500 font-sans text-[11px] leading-relaxed">
          Select a system style template or save your customized colors, corners, and fonts to instantly reuse them on new codes.
        </p>

        {/* System Templates grid */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-mono">System Templates</span>
          <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
            {SYSTEM_PRESETS.map((preset) => {
              // Check if current design matches preset
              const isActive = 
                design.fgColor.toLowerCase() === preset.fgColor.toLowerCase() &&
                design.bgColor.toLowerCase() === preset.bgColor.toLowerCase() &&
                design.dotStyle === preset.dotStyle &&
                design.eyeStyle === preset.eyeStyle;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`flex items-center space-x-2.5 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                    isActive 
                      ? 'border-blue-600 bg-blue-50/40 text-blue-700 font-semibold shadow-xs' 
                      : 'border-slate-100 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50'
                  }`}
                >
                  {/* Decorative Swatch Preview */}
                  <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border border-slate-200/50 relative overflow-hidden shadow-xs" style={{ background: preset.bgColor }}>
                    <div className="w-4 h-4 rounded-xs" style={{ 
                      background: preset.gradientType === 'linear' 
                        ? `linear-gradient(${preset.gradientAngle}deg, ${preset.fgColor}, ${preset.gradientColor})`
                        : preset.gradientType === 'radial'
                        ? `radial-gradient(circle, ${preset.fgColor}, ${preset.gradientColor})`
                        : preset.fgColor 
                    }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] leading-tight truncate font-sans">{preset.name}</p>
                    <p className="text-[9.5px] text-slate-400 font-medium font-mono truncate uppercase">{preset.fgColor}</p>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Templates */}
        <div className="space-y-2 pt-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-mono">Your Custom Templates</span>
          
          {customPresets.length === 0 ? (
            <div className="text-center py-4 px-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-medium font-sans">No custom templates saved yet.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-[165px] overflow-y-auto pr-1">
              {customPresets.map((preset) => {
                const isActive = 
                  design.fgColor.toLowerCase() === preset.fgColor.toLowerCase() &&
                  design.bgColor.toLowerCase() === preset.bgColor.toLowerCase() &&
                  design.dotStyle === preset.dotStyle &&
                  design.eyeStyle === preset.eyeStyle;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-left cursor-pointer transition-all group ${
                      isActive 
                        ? 'border-blue-600 bg-blue-50/40 text-blue-700 font-semibold shadow-xs' 
                        : 'border-slate-100 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      {/* Swatch */}
                      <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border border-slate-200/50 relative overflow-hidden shadow-xs" style={{ background: preset.bgColor }}>
                        <div className="w-4 h-4 rounded-xs" style={{ 
                          background: preset.gradientType === 'linear' 
                            ? `linear-gradient(${preset.gradientAngle}deg, ${preset.fgColor}, ${preset.gradientColor})`
                            : preset.gradientType === 'radial'
                            ? `radial-gradient(circle, ${preset.fgColor}, ${preset.gradientColor})`
                            : preset.fgColor 
                        }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] leading-tight truncate font-sans">{preset.name}</p>
                        <p className="text-[9.5px] text-slate-400 font-medium font-mono truncate uppercase">{preset.fgColor}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 shrink-0 ml-1">
                      {isActive && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      <button
                        type="button"
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 md:opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer animate-fade-in"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Form to save current visual parameters */}
          <form onSubmit={handleSavePreset} className="flex gap-2 pt-1.5 matches-pointer">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-2.5 text-slate-400 text-[9.5px] select-none font-bold uppercase font-mono leading-none">Name</span>
              <input
                id="preset_name_input"
                type="text"
                placeholder="My Brand Styling..."
                value={customPresetName}
                onChange={(e) => setCustomPresetName(e.target.value)}
                maxLength={25}
                className="w-full text-xs pl-12 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400 font-sans"
              />
            </div>
            <button
              id="btn_save_preset"
              type="submit"
              className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 shrink-0 hover:shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Template</span>
            </button>
          </form>
        </div>
      </div>

      {/* 4. Step: Design Color Theme customization */}
      <div className="space-y-6 pt-2 border-t border-slate-100 text-left">
        
        {/* Color pickers */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-slate-700">
            <Palette className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">4. Colors & Theme styling</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Foreground Color</label>
              <div className="flex items-center space-x-2">
                <input
                  id="picker_fg"
                  type="color"
                  value={design.fgColor}
                  onChange={(e) => updateDesign('fgColor', e.target.value)}
                  className="w-8 h-8 rounded-md cursor-pointer border border-slate-200"
                />
                <input
                  id="text_fg"
                  type="text"
                  value={design.fgColor}
                  onChange={(e) => updateDesign('fgColor', e.target.value)}
                  className="w-full text-xs font-mono py-1.5 px-2 border border-slate-200 uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Background Color</label>
              <div className="flex items-center space-x-2">
                <input
                  id="picker_bg"
                  type="color"
                  value={design.bgColor}
                  onChange={(e) => updateDesign('bgColor', e.target.value)}
                  className="w-8 h-8 rounded-md cursor-pointer border border-slate-200"
                />
                <input
                  id="text_bg"
                  type="text"
                  value={design.bgColor}
                  onChange={(e) => updateDesign('bgColor', e.target.value)}
                  className="w-full text-xs font-mono py-1.5 px-2 border border-slate-200 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Gradients options */}
          <div className="bg-slate-50/50 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">Apply Mesh Gradient</label>
              <select
                id="gradient_type"
                value={design.gradientType}
                onChange={(e) => updateDesign('gradientType', e.target.value)}
                className="text-xs py-1 px-2 border border-slate-200 rounded bg-white outline-hidden cursor-pointer"
              >
                <option value="none">Solid (None)</option>
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </div>

            {design.gradientType !== 'none' && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dashed border-slate-200">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500">Secondary Color</span>
                  <div className="flex items-center space-x-2">
                    <input
                      id="picker_grad"
                      type="color"
                      value={design.gradientColor}
                      onChange={(e) => updateDesign('gradientColor', e.target.value)}
                      className="w-6 h-6 rounded-md cursor-pointer"
                    />
                    <input
                      id="text_grad"
                      type="text"
                      value={design.gradientColor}
                      onChange={(e) => updateDesign('gradientColor', e.target.value)}
                      className="w-full text-[11px] font-mono py-1 border border-slate-200 uppercase"
                    />
                  </div>
                </div>

                {design.gradientType === 'linear' && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500">Angle (degrees)</span>
                    <input
                      id="gradient_angle"
                      type="range"
                      min="0"
                      max="360"
                      value={design.gradientAngle}
                      onChange={(e) => updateDesign('gradientAngle', Number(e.target.value))}
                      className="w-full mt-2"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Custom Shapes */}
        <div id="shapes_panel" className="space-y-4">
          <div className="flex items-center space-x-2 text-slate-700">
            <Sliders className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">5. QR Code Custom Shapes</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Eye shapes style */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Finder Corner Outline</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'square', label: 'Square' },
                  { id: 'rounded', label: 'Rounded' },
                  { id: 'circle', label: 'Circle' },
                  { id: 'leaf', label: 'Leaf' }
                ].map((eye) => (
                  <button
                    key={eye.id}
                    id={`eye_shape_${eye.id}`}
                    onClick={() => updateDesign('eyeStyle', eye.id)}
                    className={`py-1.5 px-2 text-xs rounded-lg border text-center cursor-pointer transition-all ${
                      design.eyeStyle === eye.id
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'border-slate-100 hover:border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    {eye.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dot custom style */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Internal Code Dots</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'square', label: 'Square' },
                  { id: 'dots', label: 'Circle Dots' },
                  { id: 'rounded', label: 'Rounded' },
                  { id: 'classy', label: 'Classy' }
                ].map((dot) => (
                  <button
                    key={dot.id}
                    id={`dot_shape_${dot.id}`}
                    onClick={() => updateDesign('dotStyle', dot.id)}
                    className={`py-1.5 px-2 text-xs rounded-lg border text-center cursor-pointer transition-all ${
                      design.dotStyle === dot.id
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'border-slate-100 hover:border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    {dot.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom eye color */}
            <div className="col-span-2 space-y-1 bg-slate-50/50 p-3 rounded-xl flex items-center justify-between">
              <div className="flex flex-col text-left">
                <span className="text-xs font-medium text-slate-700">Custom Position Eye Core Color</span>
                <span className="text-[10px] text-slate-400">Match logo branding colors individually</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  id="reset_eye_color"
                  onClick={() => updateDesign('eyeColor', '')}
                  className="text-[10px] text-blue-650 hover:text-blue-700 hover:underline cursor-pointer font-semibold"
                >
                  Reset Match
                </button>
                <input
                  id="picker_eye"
                  type="color"
                  value={design.eyeColor || design.fgColor}
                  onChange={(e) => updateDesign('eyeColor', e.target.value)}
                  className="w-6 h-6 rounded-md cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Brand center logo selection */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-slate-700">
            <Award className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">6. Centered Logo Overlay</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {LOGO_PRESETS.map((logo) => {
              const isSelected = design.logoUrl === logo.url;
              return (
                <button
                  key={logo.name}
                  id={`logo_preset_${logo.name}`}
                  onClick={() => updateDesign('logoUrl', logo.url)}
                  className={`flex items-center justify-center p-2 rounded-lg border h-10 w-full transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-blue-600 bg-blue-50/20 text-blue-600' 
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                  }`}
                >
                  {logo.url ? (
                    <img src={logo.url} alt={logo.name} className="max-h-6 max-w-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[10px] text-slate-500 font-sans">None</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="bg-slate-50/50 p-3 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">Custom Logo Link</span>
              <input 
                id="logo_url_input"
                type="text" 
                placeholder="https://example.com/logo.png" 
                value={design.logoUrl && !design.logoUrl.startsWith('data:') ? design.logoUrl : ''}
                onChange={(e) => updateDesign('logoUrl', e.target.value)}
                className="text-xs px-2 py-1 bg-white rounded border border-slate-200 w-2/3"
              />
            </div>

            {/* Custom Logo File Upload Area */}
            <div className="border-t border-slate-200/50 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Upload Image File</span>
                {design.logoUrl && design.logoUrl.startsWith('data:') && (
                  <button
                    id="btn_clear_uploaded_logo"
                    type="button"
                    onClick={() => updateDesign('logoUrl', '')}
                    className="text-[10px] text-rose-600 hover:text-rose-700 flex items-center gap-0.5 font-bold cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear File</span>
                  </button>
                )}
              </div>

              <div 
                id="logo_drag_zone"
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed rounded-xl p-3 text-center transition-all cursor-pointer ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50/30' 
                    : design.logoUrl && design.logoUrl.startsWith('data:')
                      ? 'border-blue-400 bg-blue-50/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  id="logo_file_input"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {design.logoUrl && design.logoUrl.startsWith('data:') ? (
                  <div className="flex items-center justify-between bg-white/70 p-1.5 rounded-lg border border-blue-100">
                    <div className="flex items-center space-x-2">
                      <img 
                        src={design.logoUrl} 
                        alt="Uploaded logo preview" 
                        className="w-8 h-8 rounded object-contain border bg-slate-50"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-left">
                        <span className="text-[10px] font-bold text-slate-700 block line-clamp-1">Custom File Attached</span>
                        <span className="text-[9px] text-slate-400 font-mono">Size matches correction bounds</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded leading-none">Active</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-1">
                    <Upload className="w-4 h-4 text-slate-400 mb-1" />
                    <span className="text-[11px] font-semibold text-slate-600">
                      Drag logo here or <span className="text-blue-600 hover:underline">browse</span>
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Supports PNG, JPG, SVG, WebP (Max 2MB)</span>
                  </div>
                )}
              </div>

              {uploadError && (
                <p className="text-[10px] text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg text-left font-semibold">
                  {uploadError}
                </p>
              )}
            </div>

            {design.logoUrl && (
              <div className="space-y-1 border-t border-slate-200/50 pt-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Logo Scale size: {design.logoSize}%</span>
                  <input
                    id="logo_size_slider"
                    type="range"
                    min="10"
                    max="30"
                    value={design.logoSize}
                    onChange={(e) => updateDesign('logoSize', Number(e.target.value))}
                    className="w-1/2"
                  />
                </div>
                <div className="flex items-center justify-between mt-1 pt-1">
                  <span className="text-[11px] text-slate-500">Logo Margin Clear-Zone</span>
                  <input 
                    id="logo_margin_chk"
                    type="checkbox" 
                    checked={design.logoMargin} 
                    onChange={(e) => updateDesign('logoMargin', e.target.checked)}
                    className="rounded text-blue-650 focus:ring-blue-400 cursor-pointer"
                  />
                </div>
                
                <div className="flex items-start space-x-2 bg-blue-50/50 p-2 rounded text-[10px] text-blue-700 mt-2">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Adding a central logo auto-enforces <strong>ECL level H (High High 30% correction)</strong> so scanner detects the details easily.</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
