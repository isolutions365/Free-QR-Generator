/**
 * Client-side programmatical generator for standard, spec-compliant ZIP archives.
 * Permits downloading simulated APKs and IPAs as actual openable binary ZIP archives.
 */

interface ZipEntry {
  filename: string;
  content: string | Uint8Array;
}

function crc32(strOrBytes: string | Uint8Array): number {
  const bytes = typeof strOrBytes === 'string' ? new TextEncoder().encode(strOrBytes) : strOrBytes;
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function createZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const fileParts: {
    filenameBytes: Uint8Array;
    contentBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  let currentOffset = 0;
  const localHeaders: Uint8Array[] = [];

  for (const entry of entries) {
    const filenameBytes = encoder.encode(entry.filename);
    const contentBytes = typeof entry.content === 'string' ? encoder.encode(entry.content) : entry.content;
    const crcVal = crc32(contentBytes);
    const offset = currentOffset;

    // Build Local File Header (30 bytes + length of filename + length of content)
    const lfh = new Uint8Array(30 + filenameBytes.length + contentBytes.length);
    const view = new DataView(lfh.buffer);

    view.setUint32(0, 0x04034b50, true); // Local File Header signature
    view.setUint16(4, 10, true); // Version needed to extract (1.0)
    view.setUint16(6, 0, true); // General purpose bit flag (no compression)
    view.setUint16(8, 0, true); // Compression method (0 = store)
    view.setUint16(10, 0x4200, true); // Mock modification time
    view.setUint16(12, 0x5400, true); // Mock modification date
    view.setUint32(14, crcVal, true); // CRC-32
    view.setUint32(18, contentBytes.length, true); // Compressed size
    view.setUint32(22, contentBytes.length, true); // Uncompressed size
    view.setUint16(26, filenameBytes.length, true); // Filename length
    view.setUint16(28, 0, true); // Extra field length

    // Set filename and file data
    lfh.set(filenameBytes, 30);
    lfh.set(contentBytes, 30 + filenameBytes.length);

    localHeaders.push(lfh);
    fileParts.push({ filenameBytes, contentBytes, crc: crcVal, offset });

    currentOffset += lfh.length;
  }

  const centralDirectoryOffset = currentOffset;
  const centralDirectoryParts: Uint8Array[] = [];
  let centralDirectorySize = 0;

  for (const part of fileParts) {
    const fnBytes = part.filenameBytes;
    const cBytes = part.contentBytes;

    // Build Central Directory Header (46 bytes + length of filename)
    const cdh = new Uint8Array(46 + fnBytes.length);
    const view = new DataView(cdh.buffer);

    view.setUint32(0, 0x02014b50, true); // Central Directory signature
    view.setUint16(4, 20, true); // Version made by (2.0)
    view.setUint16(6, 10, true); // Version needed to extract (1.0)
    view.setUint16(8, 0, true); // Bit flag
    view.setUint16(10, 0, true); // Compression method (store)
    view.setUint16(12, 0x4200, true); // Modification time
    view.setUint16(14, 0x5400, true); // Modification date
    view.setUint32(16, part.crc, true); // CRC-32
    view.setUint32(20, cBytes.length, true); // Compressed size
    view.setUint32(24, cBytes.length, true); // Uncompressed size
    view.setUint16(28, fnBytes.length, true); // Filename length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // File comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal file attributes
    view.setUint32(38, 0, true); // External file attributes
    view.setUint32(42, part.offset, true); // Local header offset relative to start

    cdh.set(fnBytes, 46);

    centralDirectoryParts.push(cdh);
    centralDirectorySize += cdh.length;
  }

  // Build End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const viewEocd = new DataView(eocd.buffer);

  viewEocd.setUint32(0, 0x06054b50, true); // End of Central Directory signature
  viewEocd.setUint16(4, 0, true); // Number of this disk
  viewEocd.setUint16(6, 0, true); // Disk where central directory starts
  viewEocd.setUint16(8, entries.length, true); // Number of central directory records on this disk
  viewEocd.setUint16(10, entries.length, true); // Total number of central directory records
  viewEocd.setUint32(12, centralDirectorySize, true); // Size of Central Directory
  viewEocd.setUint32(16, centralDirectoryOffset, true); // Offset of Central Directory starting
  viewEocd.setUint16(20, 0, true); // Central Directory custom comment length

  // Assemble the output byte segment array
  const totalLength = centralDirectoryOffset + centralDirectorySize + 22;
  const result = new Uint8Array(totalLength);
  let writeOffset = 0;

  for (const lfh of localHeaders) {
    result.set(lfh, writeOffset);
    writeOffset += lfh.length;
  }
  for (const cdh of centralDirectoryParts) {
    result.set(cdh, writeOffset);
    writeOffset += cdh.length;
  }
  result.set(eocd, writeOffset);

  return result;
}

export function generateApkBinarizedFile(): Blob {
  const xmlManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.freeqr.scanner"
    android:versionCode="2"
    android:versionName="1.0.2">
    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.INTERNET" />
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Free QR Companion"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@android:style/Theme.Material.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const configJson = JSON.stringify({
    app_identifier: "com.freeqr.scanner",
    companion_name: "Free QR Companion Applet",
    release_version: "1.0.2",
    build_target: "React Native & SQLite scan persistent buffer",
    remote_synced: true,
    local_storage_db: "sqlite_offline_scan_cache",
    device_camera_permissions: "NSCameraUsageDescription & android.permission.CAMERA approved"
  }, null, 2);

  const entries: ZipEntry[] = [
    { filename: "AndroidManifest.xml", content: xmlManifest },
    { filename: "assets/app_config.json", content: configJson },
    { filename: "classes.dex", content: "DEX_BINARY_IMAGE_DATA_STUB_CERTIFIED_SECURE_BUILD_SUCCESS" },
    { filename: "resources.arsc", content: "RESOURCE_TABLE_DUMMY_DATA" },
    { filename: "META-INF/MANIFEST.MF", content: "Manifest-Version: 1.0\nCreated-By: 1.0 (Google AI Studio Build)\nBuilt-By: FreeQR Workspace Compiler\nSHA-256-Digest-Manifest: SHA-256-CERTIFIED_SAFE\n" }
  ];

  const zipBytes = createZip(entries);
  return new Blob([zipBytes], { type: "application/vnd.android.package-archive" });
}

export function generateIpaBinarizedFile(): Blob {
  const plistManifest = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>FreeQR Companion</string>
    <key>CFBundleExecutable</key>
    <string>FreeQR</string>
    <key>CFBundleIdentifier</key>
    <string>com.freeqr.scanner</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>FreeQR</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.2</string>
    <key>CFBundleVersion</key>
    <string>2</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>NSCameraUsageDescription</key>
    <string>This companion application requires camera credentials permissions to capture local QR Code sequences instantly.</string>
</dict>
</plist>`;

  const configJson = JSON.stringify({
    app_identifier: "com.freeqr.scanner",
    companion_name: "Free QR Companion iOS Client",
    release_version: "1.0.2",
    build_target: "iOS Cocoa Companion & offline scan engine",
    remote_synced: true,
    local_storage_db: "local_indexeddb_offline_scan_cache",
    device_camera_permissions: "NSCameraUsageDescription accepted"
  }, null, 2);

  const entries: ZipEntry[] = [
    { filename: "Payload/FreeQR.app/Info.plist", content: plistManifest },
    { filename: "Payload/FreeQR.app/PkgInfo", content: "APPLQRSC" },
    { filename: "Payload/FreeQR.app/app_config.json", content: configJson },
    { filename: "Payload/FreeQR.app/Assets.car", content: "ASSETS_CATALOG_COMPILED_STUB" }
  ];

  const zipBytes = createZip(entries);
  return new Blob([zipBytes], { type: "application/octet-stream" });
}
