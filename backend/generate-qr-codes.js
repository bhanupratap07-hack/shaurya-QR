const QRCode = require("qrcode");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { createObjectCsvWriter } = require("csv-writer");

// ============================================================
//  CONFIGURATION
// ============================================================
const TOTAL_QR = 500;
const PREFIX = "SH26";
const BASE_URL = "https://shaurya.iitkgp.ac.in/ticket/";
const OUTPUT_DIR = path.join(__dirname, "shaurya-qr-codes");
const QR_IMAGES_DIR = path.join(OUTPUT_DIR, "qr-images");
const QR_OPTIONS = {
  type: "png",
  width: 600,
  margin: 2,
  color: {
    dark: "#000000",
    light: "#FFFFFF",
  },
  errorCorrectionLevel: "H", // Highest error correction - survives damage/smudges
};

// ============================================================
//  GENERATE UNIQUE TOKEN
//  Format: SH26-X82KD92L (8 char alphanumeric, uppercase)
//  Uses crypto.randomBytes for true randomness - impossible to guess
// ============================================================
function generateToken() {
  // 6 random bytes → 12 hex chars → take 8 → uppercase
  const randomPart = crypto
    .randomBytes(6)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 8)
    .toUpperCase();
  return `${PREFIX}-${randomPart}`;
}

// ============================================================
//  GENERATE UNIQUE TOKENS (ensures no duplicates)
// ============================================================
function generateUniqueTokens(count) {
  const tokens = new Set();
  while (tokens.size < count) {
    tokens.add(generateToken());
  }
  return Array.from(tokens);
}

// ============================================================
//  MAIN GENERATOR
// ============================================================
async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   🏗️  SHAURYA IIT KGP — QR Code Generator      ║");
  console.log("║   Generating 500 Secure QR Codes                ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();

  // 1. Create output directories
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(QR_IMAGES_DIR, { recursive: true });
  console.log("📁 Created output directory: shaurya-qr-codes/");

  // 2. Generate 500 unique tokens
  console.log(`🔐 Generating ${TOTAL_QR} unique tokens...`);
  const tokens = generateUniqueTokens(TOTAL_QR);
  console.log(`✅ ${tokens.length} unique tokens generated\n`);

  // 3. Prepare data for CSV
  const qrDataList = tokens.map((token, index) => {
    const serialNo = String(index + 1).padStart(3, "0"); // 001, 002, ...
    const qrUrl = `${BASE_URL}${token}`;
    const filename = `${serialNo}_${token}.png`;
    return {
      serial_no: serialNo,
      uid: token,
      qr_url: qrUrl,
      filename: filename,
      status: "AVAILABLE",
    };
  });

  // 4. Generate QR code images
  console.log("🖨️  Generating QR code images...\n");

  let generated = 0;
  const batchSize = 50;

  for (let i = 0; i < qrDataList.length; i += batchSize) {
    const batch = qrDataList.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (qrData) => {
        const filePath = path.join(QR_IMAGES_DIR, qrData.filename);
        await QRCode.toFile(filePath, qrData.qr_url, QR_OPTIONS);
      })
    );

    generated += batch.length;
    const progress = Math.round((generated / TOTAL_QR) * 100);
    const bar = "█".repeat(Math.floor(progress / 2)) + "░".repeat(50 - Math.floor(progress / 2));
    process.stdout.write(`\r   [${bar}] ${progress}% (${generated}/${TOTAL_QR})`);
  }

  console.log("\n\n✅ All QR code images generated!\n");

  // 5. Generate master CSV reference sheet
  console.log("📊 Creating master reference CSV...");
  const csvWriter = createObjectCsvWriter({
    path: path.join(OUTPUT_DIR, "MASTER_QR_LIST.csv"),
    header: [
      { id: "serial_no", title: "Sr. No." },
      { id: "uid", title: "QR UID" },
      { id: "qr_url", title: "QR URL (Encoded in QR)" },
      { id: "filename", title: "Image Filename" },
      { id: "status", title: "Status" },
    ],
  });
  await csvWriter.writeRecords(qrDataList);
  console.log("✅ MASTER_QR_LIST.csv created\n");

  // 6. Generate a quick-reference README for team
  console.log("📝 Creating team README...");
  const readmeContent = `# 🏗️ Shaurya IIT KGP — QR Codes
## Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}

---

## 📦 What's Inside

| Item | Description |
|------|-------------|
| \`qr-images/\` | 500 QR code PNG files (600x600px) |
| \`MASTER_QR_LIST.csv\` | Master reference sheet with all UIDs |
| \`README.md\` | This file |

---

## 🏷️ File Naming Convention

Each QR image is named:

\`\`\`
[Serial No.]_[UID].png
\`\`\`

**Examples:**
| Filename | Serial No. | UID |
|----------|-----------|-----|
| \`001_SH26-X82KD92L.png\` | 001 | SH26-X82KD92L |
| \`002_SH26-A7BF39QK.png\` | 002 | SH26-A7BF39QK |
| \`500_SH26-P2MN85TY.png\` | 500 | SH26-P2MN85TY |

---

## 🔍 How to Find a QR

### By Serial Number:
> Files are sorted by serial number (001 → 500).
> Just open the folder and look for the number.

### By UID:
> Open \`MASTER_QR_LIST.csv\` in Google Sheets / Excel.
> Use Ctrl+F to search the UID.
> The "Image Filename" column tells you exactly which file to pick.

---

## ⚠️ Important Rules

1. **DO NOT** rename any QR image files
2. **DO NOT** edit or modify the QR images
3. Each QR is **ONE-TIME USE** — once assigned, it cannot be reused
4. If a QR card is damaged, note the UID and inform the admin

---

## 📊 Stats

- **Total QR Codes:** ${TOTAL_QR}
- **Format:** SH26-XXXXXXXX (8 random alphanumeric chars)
- **Error Correction:** HIGH (survives up to 30% damage)
- **Image Size:** 600x600px PNG
- **Security:** Cryptographically random — impossible to guess

---

## 🔗 QR Content

Each QR encodes a URL like:
\`\`\`
https://shaurya.iitkgp.ac.in/ticket/SH26-X82KD92L
\`\`\`
This URL contains **NO personal data** — only a random token.
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, "README.md"), readmeContent);
  console.log("✅ README.md created\n");

  // 7. Generate quick-lookup JSON (for future DB import)
  console.log("💾 Creating JSON data file (for database import)...");
  const jsonData = qrDataList.map((qr) => ({
    unique_token: qr.uid,
    qr_url: qr.qr_url,
    status: "AVAILABLE",
    assigned_user_id: null,
    created_at: new Date().toISOString(),
  }));
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "qr_codes_db_import.json"),
    JSON.stringify(jsonData, null, 2)
  );
  console.log("✅ qr_codes_db_import.json created\n");

  // 8. Summary
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   ✅ GENERATION COMPLETE                        ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║   📦 Total QR Codes:  ${TOTAL_QR}                       ║`);
  console.log(`║   📁 Output Folder:   shaurya-qr-codes/         ║`);
  console.log("║                                                  ║");
  console.log("║   Files:                                         ║");
  console.log("║   ├── qr-images/  (500 PNG files)                ║");
  console.log("║   ├── MASTER_QR_LIST.csv                         ║");
  console.log("║   ├── qr_codes_db_import.json                    ║");
  console.log("║   └── README.md                                  ║");
  console.log("║                                                  ║");
  console.log("║   📤 Upload 'shaurya-qr-codes' folder to        ║");
  console.log("║      Google Drive and share with your team!      ║");
  console.log("╚══════════════════════════════════════════════════╝");

  // Show first 5 samples
  console.log("\n🔎 Sample QR Codes (first 5):\n");
  console.log("   Sr. No.  │  UID              │  Filename");
  console.log("   ─────────┼───────────────────┼──────────────────────────");
  for (let i = 0; i < 5; i++) {
    const qr = qrDataList[i];
    console.log(
      `   ${qr.serial_no}      │  ${qr.uid.padEnd(17)} │  ${qr.filename}`
    );
  }
  console.log();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
