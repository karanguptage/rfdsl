"""Starter catalogue.

- The 12 products from the home page carousel: names, photos and descriptions
  exactly as already used on the site; brand/subcategory from the product
  photos. Their specifications are left empty on purpose (add them in /admin)
  rather than guessed.
- MC51 Built-in UHF: full record transcribed from the current rfdsl.co.nz
  product page (features, functions, all specification groups). It has no
  photo in this repo yet; upload one in /admin.
"""


def _rows(*pairs):
    """("Label", "value") or ("Label", "value", "small note") -> spec rows."""
    return [{"label": p[0], "value": p[1], "note": p[2] if len(p) > 2 else ""} for p in pairs]


MC51 = {
    "slug": "mc51",
    "name": "MC51 Built-in UHF",
    "model": "MC51",
    "brand": "Chainway",
    "category": "reader",
    "subcategory": "Handheld Readers",
    "frequency": "UHF",
    "tagline": "Breakthrough in Read Rates and Accuracy. Powerful RFID Now Fits Right in Your Pocket.",
    "summary": "A pocket-sized Android 14 handheld with a built-in UHF RFID module (Impinj E series, Gen2X), 5G, Wi-Fi 6E and up to 5m read range.",
    "gallery": [],
    "highlights": [
        {
            "title": "Features",
            "items": [
                {"icon": "cpu", "text": "High-Performance Octa-Core 2.4 GHz (4nm Technology)"},
                {"icon": "storage", "text": "UFS (Universal Flash Storage)"},
                {"icon": "android", "text": "Android 14 (Upgradable to Android 18+)"},
                {"icon": "cellular", "text": "5G WWAN, Global Frequency Bands"},
                {"icon": "wifi", "text": "Wi-Fi 6E with 2x2 MIMO and Fast Roaming"},
                {"icon": "display", "text": "6-inch Display, Optional 2160x1080 Resolution"},
                {"icon": "battery", "text": "5000mAh Removable Smart Battery with Hot-Swap"},
                {"icon": "shield", "text": "IP67 & 1.5m / 5ft. Drop"},
            ],
        },
        {
            "title": "Functions",
            "items": [
                {"icon": "rfid-module", "text": "Self-Developed UHF Module Based on Impinj E Series chips"},
                {"icon": "chip", "text": "Impinj Gen2X for Enhanced UHF Performance"},
                {"icon": "rfid", "text": "RFID Read Range Up to 5m"},
                {"icon": "barcode", "text": "Multiple Scan Engine Options Including Long Range"},
                {"icon": "camera", "text": "Front & Rear Cameras"},
            ],
        },
    ],
    "specs": [
        {
            "group": "Physical Characteristics",
            "rows": _rows(
                ("Dimensions", "161.0 x 77.8 x 15.5mm (Thickest Part: 29.2mm)", "6.34 x 3.06 x 0.61 in (Thickest Part: 1.15 in.)"),
                ("Weight", "323g / 11.39oz. (device with battery)"),
                ("Display", "6-inch high definition display (18:9), 1440 x 720"),
                ("Battery", "5000mAh removable main battery, support QC3.0 and RTC; Support Battery Management System; Hot swap battery backup"),
                ("Touch Panel", "Corning Gorilla Glass, multi-touch panel, gloves and wet hands supported"),
                ("Notification", "Sound, LED indicator, vibrator"),
                ("Interfaces", "USB Type-C, USB 3.1, OTG"),
                ("Card slot", "1 for SIM card, 1 for SIM or TF card, Supports eSIM (optional)"),
                ("Audio", "2 microphones, 1 for noise cancellation; 1 speaker; 1 receiver"),
                ("Keypad", "Power key, 2 scan keys, volume (+/-) keys, 1 multifunctional key"),
                ("Sensors", "G_sensor, proximity sensor, light sensor, geomagnetic sensor, gyroscope"),
            ),
        },
        {
            "group": "Communication",
            "rows": _rows(
                (
                    "WLAN",
                    "Support 802.11 a/b/g/n/ac/ax-6E, 2.4G/5G/6G tri-band, IPV4, IPV6; 2*2 MIMO antennas\n"
                    "Fast roaming: PMKID caching, 802.11r, OKC",
                    "Operating Channels: 2.4G (channel 1~13), 5G (channel 36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, "
                    "116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165), Depends on local regulations\n"
                    "Security and Encryption: WEP, WPA-WPA2-PSK(TKIP and AES), WAPI-PSK—EAP-TTLS, EAP-TLS, PEAP-MSCHAPv2, "
                    "PEAPLTS, PEAP-GTC, WPA3-Enterprise, WPA3-Enhanced Open, WPA3 Easy Connect, WPA3-Personal, etc.",
                ),
                (
                    "WWAN (Europe, Asia)",
                    "2G: GSM / EDGE / GPRS (850/900/1800)\n"
                    "3G: WCDMA (B1/B5/B8)\n"
                    "4G: FDD-LTE (B1/B3/B5/B7/B8/B20/B28A/B28B)\n"
                    "    TDD-LTE (B34/B38/B39/B40/B41)\n"
                    "5G: N1/N3/N5/N7/N8/N20/N28/N38/N40/N41/N77/N78/N79",
                ),
                (
                    "WWAN (America)",
                    "2G: GSM/EDGE/GPRS(850/1900)\n"
                    "3G: WCDMA(B2/B4/B5)\n"
                    "4G: FDD-LTE B2/B4/B5/B7/B12/B13/B25/B26/B28;\n"
                    "    TDD-LTE B38/B41;\n"
                    "5G: N2/N3/N5/N7/N12/N13/N25/N26/N28/N38/N41/N77/N78",
                ),
            ),
        },
        {
            "group": "Developing Environment",
            "rows": _rows(
                ("Operating System", "Android 14"),
                ("SDK", "Chainway Software Development Kit"),
                ("Language", "Java"),
                ("Tool", "Eclipse / Android Studio"),
            ),
        },
        {
            "group": "Performance",
            "rows": _rows(
                ("CPU", "Qualcomm Octa-core, 2.4GHz"),
                ("RAM+ROM", "UFS: 4GB + 64GB / 8GB + 256GB (optional)"),
                ("Expansion", "Supports up to 256GB TF card (Supports Extreme Micro SD Card 512GB)"),
            ),
        },
        {
            "group": "User Environment",
            "rows": _rows(
                ("Operating Temp.", "-4°F to 122°F / -20°C to +50°C"),
                ("Storage Temp.", "-40°F to 158°F / -40°C to +70°C"),
                ("Humidity", "5% RH - 95% RH non condensing"),
                (
                    "Drop Specification",
                    "Multiple 1.5m / 4.92ft. drops to the concrete across the operating temperature range",
                    "MIL-STD-810H (SGS Test): Multiple 1.5 m/4.92 ft. drops to concrete across the operating temperature range",
                ),
                ("Tumble Specification", "1000 x 0.5m / 1.64ft. falls at room temperature"),
                ("Sealing", "IP67 per IEC sealing specifications"),
                ("ESD", "±15 KV air discharge, ±8 KV conductive discharge"),
            ),
        },
        {
            "group": "Barcode Scanning",
            "rows": _rows(
                ("2D Scanner", "Zebra: SE4710; SE55; CM60"),
                ("1D Symbologies", "UPC/EAN, Code128, Code39, Code93, Code11, Interleaved 2 of 5, Discrete 2 of 5, Chinese 2 of 5, Codabar, MSI, RSS, etc."),
                (
                    "2D Symbologies",
                    "PDF417, MicroPDF417, Composite, RSS, TLC-39, Datamatrix, QR code, Micro QR code, Aztec, MaxiCode; "
                    "Postal Codes: US PostNet, US Planet, UK Postal, Australian Postal, Japan Postal, Dutch Postal (KIX), etc.",
                ),
                ("Note", "* This function is optional"),
            ),
        },
        {
            "group": "UHF RFID",
            "rows": _rows(
                ("Engine", "Based on Impinj E Series chips"),
                ("Frequency", "865-868 MHz / 920-925 MHz / 902-928 MHz"),
                ("Impinj Gen2X", "Supported"),
                ("Protocol", "EPC C1 GEN2 / ISO18000-6C"),
                ("Antenna", "Circular Polarized Antenna"),
                ("Power", "+5dBm to +30dBm adjustable"),
                ("Fastest Read Rate", "750+ tags/sec"),
                ("Max Read Range", "5m"),
                (
                    "Note",
                    "* Ranges are measured in the open outdoors and low interference environment, and rate is measured in a "
                    "laboratory low interference environment, they are affected by tags and environment.\n"
                    "* Built-in UHF version does not support pistol",
                ),
            ),
        },
        {
            "group": "Camera",
            "rows": _rows(
                ("Front Camera", "5MP"),
                ("Rear Camera", "16MP Autofocus with flash"),
            ),
        },
    ],
    "sort_order": 95,
}


def _basic(order, slug, name, image, category, subcategory, brand, frequency, summary):
    return {
        "slug": slug,
        "name": name,
        "model": name if category != "tag" else "",
        "brand": brand,
        "category": category,
        "subcategory": subcategory,
        "frequency": frequency,
        "summary": summary,
        "gallery": [image],
        "sort_order": order,
        "is_popular": True,  # these were the home page's "most popular products"
    }


PRODUCTS = [
    _basic(10, "advanreader-10", "AdvanReader-10", "/products/AdvanReader-10.png", "reader", "Fixed Readers", "Keonn", "UHF",
           "A compact UHF RFID reader with USB connectivity and optional integrated antenna, ideal for embedded systems, access control and IoT applications."),
    _basic(20, "advanreader-70", "AdvanReader-70", "/products/AdvanReader-70.png", "reader", "Fixed Readers", "Keonn", "UHF",
           "A standalone UHF RFID reader with integrated Linux computing, suitable for RFID portals, smart surfaces and automated inventory systems."),
    _basic(30, "advanreader-160", "AdvanReader-160", "/products/AdvanReader-160.png", "reader", "Fixed Readers", "Keonn", "UHF",
           "A powerful four-port UHF RFID reader designed for multi-antenna applications, industrial automation and large-scale asset tracking."),
    _basic(40, "c5", "C5", "/products/C5.jpg", "reader", "Handheld Readers", "Chainway", "UHF",
           "A rugged Android handheld RFID reader combining UHF tag identification, barcode scanning and NFC capabilities for efficient inventory and asset management."),
    _basic(50, "c61", "C61", "/products/C61.jpg", "reader", "Handheld Readers", "Chainway", "UHF",
           "A high-performance handheld UHF RFID reader offering fast, long-range tag identification for retail, warehousing and logistics."),
    _basic(60, "cp20", "CP20", "/products/CP20.jpg", "printer", "Desktop Printers", "Chainway", "",
           "A compact thermal barcode printer supporting direct thermal and thermal transfer printing, ideal for product labels, shipping and inventory identification."),
    _basic(70, "cp30", "CP30", "/products/CP30.jpg", "printer", "RFID Printers", "Chainway", "UHF",
           "A professional RFID and barcode printer offering accurate label printing and RFID encoding for logistics, warehousing and asset management."),
    _basic(80, "customised-rfid-tags", "Customised RFID Tags", "/products/CustomisedRFIDTags.png", "tag", "Custom Tags", "", "LF / HF / UHF",
           "Custom-designed RFID tags available in various sizes, materials, shapes and frequencies to meet specific product identification and tracking requirements."),
    _basic(85, "gp60333", "GP60333", "/products/gp60333.jpg", "reader", "Industrial Readers", "Pepperl+Fuchs", "", ""),
    _basic(90, "mc50", "MC50", "/products/MC50.jpg", "reader", "Handheld Readers", "Chainway", "UHF",
           "A 5G-enabled handheld RFID computer featuring long-range reading and a detachable RFID module for demanding industrial and logistics applications."),
    MC51,
    _basic(100, "mc95", "MC95", "/products/MC95.jpg", "reader", "Handheld Readers", "Chainway", "UHF",
           "A versatile mobile computer with UHF RFID capabilities, designed for inventory management, asset tracking and field operations."),
    _basic(110, "zt411", "ZT411", "/products/ZT411.jpg", "printer", "Industrial Printers", "Zebra", "UHF",
           "An industrial-grade label printer with optional RFID encoding, designed for high-volume printing in manufacturing, logistics and warehousing."),
]
