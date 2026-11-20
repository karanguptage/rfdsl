// Starting points for the admin product editor. Devices differ a lot, so these
// only pre-fill group and row *names*; rows left empty are not saved.

export type SpecTemplate = { id: string; label: string; categories: string[]; groups: { group: string; labels: string[] }[] };

export const SPEC_TEMPLATES: SpecTemplate[] = [
  {
    id: "handheld",
    label: "Handheld reader / mobile computer",
    categories: ["reader"],
    groups: [
      { group: "Physical Characteristics", labels: ["Dimensions", "Weight", "Display", "Battery", "Touch Panel", "Notification", "Interfaces", "Card slot", "Audio", "Keypad", "Sensors"] },
      { group: "Communication", labels: ["WLAN", "WWAN", "Bluetooth", "GNSS", "NFC"] },
      { group: "Developing Environment", labels: ["Operating System", "SDK", "Language", "Tool"] },
      { group: "Performance", labels: ["CPU", "RAM+ROM", "Expansion"] },
      { group: "User Environment", labels: ["Operating Temp.", "Storage Temp.", "Humidity", "Drop Specification", "Tumble Specification", "Sealing", "ESD"] },
      { group: "Barcode Scanning", labels: ["2D Scanner", "1D Symbologies", "2D Symbologies"] },
      { group: "UHF RFID", labels: ["Engine", "Frequency", "Protocol", "Antenna", "Power", "Fastest Read Rate", "Max Read Range"] },
      { group: "Camera", labels: ["Front Camera", "Rear Camera"] },
    ],
  },
  {
    id: "fixed",
    label: "Fixed / desktop reader",
    categories: ["reader"],
    groups: [
      { group: "RFID", labels: ["Frequency", "Protocol", "Chipset", "Antenna Ports", "Output Power", "Receive Sensitivity", "Read Rate", "Read Range"] },
      { group: "Interfaces", labels: ["Ethernet", "USB", "Serial", "GPIO", "Wi-Fi / Bluetooth"] },
      { group: "Computing", labels: ["Operating System", "CPU", "Memory", "Reader Protocols (LLRP, MQTT ...)", "SDK"] },
      { group: "Power", labels: ["Power Supply", "PoE", "Power Consumption"] },
      { group: "Physical Characteristics", labels: ["Dimensions", "Weight", "Enclosure", "Mounting", "Indicators"] },
      { group: "Environment", labels: ["Operating Temp.", "Storage Temp.", "Humidity", "Ingress Rating"] },
      { group: "Certifications", labels: ["Regulatory", "Compliance"] },
    ],
  },
  {
    id: "antenna",
    label: "Antenna",
    categories: ["antenna"],
    groups: [
      { group: "RF Characteristics", labels: ["Frequency Range", "Gain", "Polarization", "Beamwidth (3dB)", "VSWR", "Axial Ratio", "Max Input Power", "Impedance"] },
      { group: "Physical Characteristics", labels: ["Dimensions", "Weight", "Connector", "Cable", "Radome Material", "Mounting"] },
      { group: "Environment", labels: ["Operating Temp.", "Ingress Rating"] },
    ],
  },
  {
    id: "tag",
    label: "Tag / label / inlay",
    categories: ["tag"],
    groups: [
      { group: "RFID", labels: ["Frequency", "Protocol", "Chip", "EPC Memory", "User Memory", "TID", "Read Range", "Mounting Surface"] },
      { group: "Physical Characteristics", labels: ["Dimensions", "Thickness", "Material", "Colour / Printing", "Attachment"] },
      { group: "Environment", labels: ["Operating Temp.", "Ingress Rating", "Chemical Resistance", "Washing Cycles"] },
      { group: "Customisation", labels: ["Options", "Minimum Order", "Lead Time"] },
    ],
  },
  {
    id: "printer",
    label: "Label / RFID printer",
    categories: ["printer"],
    groups: [
      { group: "Printing", labels: ["Print Method", "Resolution", "Max Print Width", "Max Print Speed", "Media Width", "Media Roll Size", "Media Types"] },
      { group: "RFID Encoding", labels: ["Frequency", "Protocol", "Supported Tags", "Encoding Position"] },
      { group: "Connectivity", labels: ["Interfaces", "Wireless"] },
      { group: "Software", labels: ["Printer Languages", "Drivers", "Label Design Software"] },
      { group: "Physical Characteristics", labels: ["Dimensions", "Weight", "Display", "Memory"] },
      { group: "Environment", labels: ["Operating Temp.", "Storage Temp.", "Humidity"] },
    ],
  },
  {
    id: "accessory",
    label: "Accessory",
    categories: ["accessory"],
    groups: [
      { group: "General", labels: ["Compatible With", "Function", "Package Contents"] },
      { group: "Physical Characteristics", labels: ["Dimensions", "Weight", "Material", "Connector"] },
    ],
  },
  {
    id: "software",
    label: "Software",
    categories: ["software"],
    groups: [
      { group: "Overview", labels: ["Product Type", "Current Version", "Typical Users", "Industries"] },
      { group: "Modules", labels: ["Asset Register", "Stocktake / Audit", "Check-in / Check-out", "Maintenance", "Reporting", "Alerts"] },
      { group: "Platforms", labels: ["Deployment", "Web App", "Mobile App", "Server OS", "Database", "Browsers"] },
      { group: "Integrations", labels: ["Supported RFID Readers", "Barcode Scanners", "ERP / Accounting", "API", "Import / Export"] },
      { group: "Security", labels: ["User Roles", "Authentication", "Audit Trail", "Data Hosting"] },
      { group: "Licensing & Support", labels: ["Licence Model", "Users / Devices", "Training", "Support & Maintenance"] },
    ],
  },
];

export const HIGHLIGHT_PRESETS: Record<"hardware" | "software", string[]> = {
  hardware: ["Features", "Functions"],
  software: ["Key Features", "Benefits"],
};

export const FREQUENCY_PRESETS = ["UHF", "HF", "NFC", "LF", "HF / NFC", "LF / HF / UHF"];

// ---------------------------------------------------------------- paste import

export type ParsedGroup = { group: string; rows: { label: string; value: string; note: string }[] };

// Turns text copied from a datasheet, a web page table or a spreadsheet into
// spec groups. Understands, per line:
//   Label<TAB>Value        (copied tables / Excel)       - preferred when present
//   Label: Value           (plain text datasheets)
//   Label   Value          (two or more spaces)
//   A short line with no separator, followed by a "label/value" line, starts a new group.
//   Any other line without a separator continues the previous row's value.
export function parseSpecText(text: string, defaultGroup = "Specifications"): ParsedGroup[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  // In text copied from a table, a cell with several lines arrives as extra
  // lines without tabs ("Fast roaming: PMKID ..."): those continue the value.
  // A blank line ends that, so a pasted mix of table rows and "Label: Value"
  // lines still works.
  let tableMode = lines.some((l) => l.includes("\t"));

  const split = (line: string, strictTable = tableMode): [string, string] | null => {
    if (line.includes("\t")) {
      const cells = line.split("\t").map((c) => c.trim()).filter(Boolean);
      return cells.length < 2 ? null : [cells[0], cells.slice(1).join(" ")];
    }
    if (strictTable) return null;
    const colon = line.match(/^\s*([^:]{1,48}?)\s*[:：]\s+(.+)$/) ?? line.match(/^\s*([^:]{1,48}?)\s*[:：]\s*(.+)$/);
    if (colon && !/^https?$/i.test(colon[1])) return [colon[1].trim(), colon[2].trim()];
    const spaced = line.match(/^\s*(\S.{0,47}?)\s{2,}(\S.*)$/);
    if (spaced) return [spaced[1].trim(), spaced[2].trim()];
    return null;
  };

  const groups: ParsedGroup[] = [];
  let current: ParsedGroup | null = null;
  const ensureGroup = () => {
    if (!current) {
      current = { group: defaultGroup, rows: [] };
      groups.push(current);
    }
    return current;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) {
      tableMode = false;
      continue;
    }
    if (raw.includes("\t")) tableMode = true;
    const pair = split(raw);
    if (pair) {
      ensureGroup().rows.push({ label: pair[0], value: pair[1], note: "" });
      continue;
    }
    const next = lines.slice(i + 1).find((l) => l.trim());
    // A heading is a short line followed by a label/value line (in any format).
    const looksLikeHeading =
      raw.trim().length <= 48 && !/[.;,]$/.test(raw.trim()) && !split(raw, false) && next !== undefined && split(next, false) !== null;
    const g = current as ParsedGroup | null;
    if (looksLikeHeading || !g || g.rows.length === 0) {
      if (looksLikeHeading) {
        current = { group: raw.trim(), rows: [] };
        groups.push(current);
      } else {
        // Text before any row: treat as the group name.
        current = { group: raw.trim().slice(0, 100), rows: [] };
        groups.push(current);
      }
      continue;
    }
    const last = g.rows[g.rows.length - 1];
    // Keep indentation of continuation lines (e.g. "    TDD-LTE ...").
    last.value += "\n" + raw.replace(/\t/g, "    ").trimEnd();
  }
  return groups.filter((g) => g.rows.length > 0);
}
