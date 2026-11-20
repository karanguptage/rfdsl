// Icons for product highlights ("Features", "Functions", software "Key
// Features" ...). Each product stores only the icon's name; /admin offers this
// set in a picker and suggests one from the text (suggestIcon).
// All are 24x24 stroked paths so they share one look.

export const ICONS: Record<string, { label: string; d: string }> = {
  cpu: { label: "Processor", d: "M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" },
  chip: { label: "Chip", d: "M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" },
  storage: { label: "Storage / memory", d: "M22 12H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11zM6 16h.01M10 16h.01" },
  android: { label: "Android", d: "M4 17a8 8 0 0 1 16 0zM7.5 9.5L5.5 6.5M16.5 9.5l2-3M9 13.5h.01M15 13.5h.01" },
  cellular: { label: "Cellular / 5G", d: "M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16" },
  wifi: { label: "Wi-Fi", d: "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" },
  bluetooth: { label: "Bluetooth", d: "M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11" },
  gps: { label: "GPS / location", d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
  display: { label: "Display", d: "M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 21h8M12 17v4" },
  mobile: { label: "Handheld", d: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01" },
  battery: { label: "Battery", d: "M3 7h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM23 13v-2M5 10v4M9 10v4" },
  power: { label: "Power", d: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
  shield: { label: "Rugged / protection", d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" },
  water: { label: "Waterproof", d: "M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" },
  temperature: { label: "Temperature", d: "M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" },
  rfid: { label: "RFID / NFC", d: "M6 8.32a7.43 7.43 0 0 1 0 7.36M9.46 6.21a11.76 11.76 0 0 1 0 11.58M12.91 4.1a15.91 15.91 0 0 1 .01 15.8M16.37 2a20.16 20.16 0 0 1 0 20" },
  "rfid-module": { label: "RF module", d: "M4.9 19.1a10 10 0 0 1 0-14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M19.1 4.9a10 10 0 0 1 0 14.2M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" },
  antenna: { label: "Antenna", d: "M12 12v10M8 22h8M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7.76 5.76a6 6 0 0 0 0 8.48M16.24 5.76a6 6 0 0 1 0 8.48M4.93 2.93a10 10 0 0 0 0 14.14M19.07 2.93a10 10 0 0 1 0 14.14" },
  range: { label: "Read range", d: "M2 12h20M6 8l-4 4 4 4M18 8l4 4-4 4" },
  speed: { label: "Speed / read rate", d: "M12 14l4-4M3.34 19a10 10 0 1 1 17.32 0" },
  barcode: { label: "Barcode", d: "M3 5v14M6 5v14M10 5v14M12 5v14M16 5v14M19 5v14M21 5v14" },
  qr: { label: "QR / 2D code", d: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" },
  camera: { label: "Camera", d: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  audio: { label: "Audio", d: "M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" },
  keyboard: { label: "Keys / keypad", d: "M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" },
  sensor: { label: "Sensors", d: "M22 12h-4l-3 9L9 3l-3 9H2" },
  usb: { label: "USB / connector", d: "M12 22v-5M9 8V2M15 8V2M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z" },
  network: { label: "Network / Ethernet", d: "M9 2h6v6H9zM3 16h6v6H3zM15 16h6v6h-6zM12 8v4M6 16v-4h12v4" },
  printer: { label: "Printing", d: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" },
  tag: { label: "Tag / label", d: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01" },
  box: { label: "Inventory / asset", d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" },
  truck: { label: "Logistics", d: "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" },
  cloud: { label: "Cloud", d: "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" },
  database: { label: "Database", d: "M12 8c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3zM21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" },
  code: { label: "Software / SDK", d: "M16 18l6-6-6-6M8 6l-6 6 6 6" },
  link: { label: "Integration", d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" },
  sync: { label: "Sync / real-time", d: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" },
  chart: { label: "Reports / analytics", d: "M18 20V10M12 20V4M6 20v-6" },
  users: { label: "Users", d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  lock: { label: "Security", d: "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4" },
  bell: { label: "Alerts", d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" },
  search: { label: "Search / find", d: "M21 21l-4.35-4.35M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" },
  layers: { label: "Modules", d: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
  settings: { label: "Configurable", d: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" },
  document: { label: "Document", d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" },
  globe: { label: "Global / web", d: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" },
  clock: { label: "Time", d: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2" },
  support: { label: "Support", d: "M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" },
  star: { label: "Highlight", d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  check: { label: "Check", d: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" },
};

export const ICON_NAMES = Object.keys(ICONS);

// First matching rule wins, so more specific words come first.
const RULES: [RegExp, string][] = [
  [/android|ios\b|windows|linux/i, "android"],
  [/gen2x|impinj|chipset|\bchip/i, "chip"],
  [/cpu|processor|octa|quad|core|ghz/i, "cpu"],
  [/ufs|storage|memory|ram|rom|flash|emmc/i, "storage"],
  [/\b[345]g\b|lte|wwan|cellular|sim\b/i, "cellular"],
  [/wi-?fi|wlan|802\.11/i, "wifi"],
  [/bluetooth|\bble\b/i, "bluetooth"],
  [/gps|gnss|location|beidou|glonass/i, "gps"],
  [/battery|mah/i, "battery"],
  [/power|poe|voltage|dbm/i, "power"],
  [/ip6\d|drop|rugged|tumble|shock|mil-std/i, "shield"],
  [/waterproof|water|dust/i, "water"],
  [/temp|°c|°f/i, "temperature"],
  [/module|engine/i, "rfid-module"],
  [/range|distance|\d+\s?m\b/i, "range"],
  [/tags?\/s|read rate|speed|fast/i, "speed"],
  [/antenna|polari[sz]/i, "antenna"],
  [/rfid|uhf|nfc|\bhf\b|\blf\b|epc|iso\s?1[45]|iso\s?18000/i, "rfid"],
  [/qr|2d|datamatrix/i, "qr"],
  [/barcode|scan|1d|symbolog/i, "barcode"],
  [/camera|\bmp\b|megapixel/i, "camera"],
  [/display|screen|inch|resolution|touch/i, "display"],
  [/audio|speaker|microphone/i, "audio"],
  [/key|button|keypad/i, "keyboard"],
  [/sensor|gyro|accelero/i, "sensor"],
  [/usb|type-c|serial|rs-?232|rs-?485|gpio/i, "usb"],
  [/ethernet|lan|network|tcp/i, "network"],
  [/print|dpi|label/i, "printer"],
  [/asset|inventory|stock|warehouse/i, "box"],
  [/logistic|shipping|delivery|fleet/i, "truck"],
  [/cloud|saas|hosted/i, "cloud"],
  [/database|sql|data\b/i, "database"],
  [/api|integrat|erp|connect/i, "link"],
  [/sync|real-?time|live/i, "sync"],
  [/report|dashboard|analytic|chart/i, "chart"],
  [/user|role|team|staff/i, "users"],
  [/secur|encrypt|permission|login/i, "lock"],
  [/alert|notif|alarm/i, "bell"],
  [/modul|plugin/i, "layers"],
  [/config|custom|setting/i, "settings"],
  [/sdk|software|develop|code/i, "code"],
  [/support|service|maintenance/i, "support"],
  [/web|browser|global|multi-?language/i, "globe"],
];

export function suggestIcon(text: string): string {
  for (const [re, icon] of RULES) if (re.test(text)) return icon;
  return "check";
}

export default function FeatureIcon({ name, className }: { name: string; className?: string }) {
  const icon = ICONS[name] ?? ICONS.check;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={icon.d} />
    </svg>
  );
}
