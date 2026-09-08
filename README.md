# 🏆 Shaurya 2026 — QR Pass Management System
### IIT Kharagpur Inter-College Sports Fest

---

## What is this?

This is a **complete digital system** built for **Shaurya 2026**, the inter-college sports fest of IIT Kharagpur. It handles the entire lifecycle of participant management — from online registration to physical QR pass distribution at the venue to entry verification at the gates.

**In simple words:**
1. Students from different colleges register online on a website.
2. When they arrive at IIT KGP, volunteers at the registration desk search their name, verify their identity, and hand them a printed QR code pass.
3. That QR code gets permanently linked to the student in our database.
4. At the gates, security can scan the QR to verify entry.

The system is designed to handle **500+ participants**, **5 volunteers working simultaneously**, and prevents any accidental double-assignments or QR conflicts.

---

## Why not just print QR codes with student details?

**Privacy & Security.**

Most college fests print QR codes that contain the student's Name, Phone Number, and Email directly inside the QR. This means:
- If someone drops their QR pass on the ground, anyone can scan it and steal their personal details.
- If someone screenshots someone else's QR, they have all their info.

**Our approach is different:**
- Our QR codes contain **ZERO personal information**. Each QR only contains a random token like `SH26-D3WVWK2`.
- The token means nothing on its own. It only gets linked to a student's record in the database at the exact moment the volunteer hands them the pass.
- Even if someone finds a lost QR pass, scanning it reveals nothing useful.

---

## Tech Stack

| Component | Technology | Why we chose it |
|-----------|-----------|----------------|
| Website (Frontend) | **Next.js 16** (React) | Fast, modern, great for mobile |
| Database (Backend) | **Supabase** (PostgreSQL) | Free, real-time, handles concurrent users |
| QR Scanner | **@yudiel/react-qr-scanner** | Works great on phone cameras and laptop webcams |
| QR Generation | **Node.js + qrcode library** | One-time script to generate 500 QR images |
| Styling | **Inline CSS** | No build complexity, fast iteration |

---

## Database Design

We have **4 tables** in our Supabase PostgreSQL database:

### 📋 `users` — All participants
Every student who registers (either online or imported from last year's data) gets a row here.

| Column | Type | Example | Purpose |
|--------|------|---------|---------|
| `id` | UUID | `a8f3e...` | Auto-generated unique ID |
| `name` | TEXT | `Nilesh Kumar` | Student's full name |
| `college` | TEXT | `IIT Kharagpur` | College name |
| `mobile` | TEXT (unique) | `9876543210` | Phone number (no duplicates allowed) |
| `email` | TEXT (unique) | `nilesh@iitkgp.ac.in` | Email (no duplicates allowed) |
| `status` | TEXT | `UNASSIGNED` | Changes to `ASSIGNED` when they get a QR pass |

### 🎫 `qr_codes` — All 500 QR tokens
Pre-generated before the event. Each row is one physical QR card.

| Column | Type | Example | Purpose |
|--------|------|---------|---------|
| `unique_token` | TEXT (PK) | `SH26-D3WVWK2` | The random string printed inside the QR |
| `status` | TEXT | `AVAILABLE` | Changes to `ASSIGNED` when given to someone |
| `assigned_user_id` | UUID (FK) | `a8f3e...` | Links to the student who received this QR |

### 👥 `volunteers` — Login accounts for desk staff
Stored in the database so we can add/remove/disable volunteers without touching the code.

| Column | Type | Example | Purpose |
|--------|------|---------|---------|
| `id` | UUID | `b2c4d...` | Auto-generated |
| `username` | TEXT | `vol1` | Login ID |
| `password` | TEXT | `shaurya1` | Login password |
| `name` | TEXT | `Volunteer 1` | Display name |
| `role` | TEXT | `VOLUNTEER` or `ADMIN` | What they can access |
| `active` | BOOLEAN | `true` | Admin can disable a volunteer instantly |

### 📝 `activity_logs` — Audit trail
Every time a volunteer assigns a QR code to a student, a log entry is automatically created.

| Column | Type | Example | Purpose |
|--------|------|---------|---------|
| `action` | TEXT | `QR_ASSIGNED` | What happened |
| `volunteer_name` | TEXT | `Volunteer 1` | Who did it |
| `user_name` | TEXT | `Nilesh Kumar` | Which student |
| `qr_token` | TEXT | `SH26-D3WVWK2` | Which QR code |
| `details` | TEXT | `Volunteer 1 assigned SH26-D3WVWK2 to Nilesh Kumar` | Human-readable log |
| `created_at` | TIMESTAMP | `2026-10-31 10:45 AM` | When it happened |

---

## Pages & Access Control

### Who can access what?

| Page | URL | Who can access | Purpose |
|------|-----|---------------|---------|
| Registration | `/` | **Everyone** (public) | Students register here |
| Volunteer Login | `/volunteer/login` | **Everyone** | Login page for volunteers |
| Volunteer Dashboard | `/volunteer/dashboard` | **Logged-in Volunteers & Admins** | Search students, scan QR, assign passes |
| Admin Panel | `/admin` | **Only Admins** | Stats, activity logs, volunteer management |

### How is access controlled?

**Step 1: Login**
When a volunteer logs in, the system checks their username and password against the `volunteers` table in the database. If valid and `active = true`, three cookies are set in the browser:
- `vol_auth` = `authenticated`
- `vol_name` = volunteer's name (for audit logging)
- `vol_role` = `VOLUNTEER` or `ADMIN`

**Step 2: Middleware**
Next.js Middleware runs BEFORE any page loads. It checks:
- For `/volunteer/dashboard`: Is `vol_auth` cookie present? If not → redirect to login.
- For `/admin`: Is `vol_auth` present AND is `vol_role` = `ADMIN`? If not → redirect away.

**Step 3: Double verification for Admin (anti-tampering)**
Even if someone manually edits their browser cookies to set `vol_role = ADMIN`, the admin page itself makes a second check — it queries the database directly to verify the logged-in user is truly an admin. If not, they're kicked out instantly.

### Login Credentials

| Username | Password | Role | Access |
|----------|----------|------|--------|
| `vol1` | `********` | Volunteer | Dashboard only |
| `vol2` | `********` | Volunteer | Dashboard only |
| `vol3` | `********` | Volunteer | Dashboard only |
| `vol4` | `********` | Volunteer | Dashboard only |
| `vol5` | `********` | Volunteer | Dashboard only |
| `admin` | `********` | Admin | Dashboard + Admin Panel |

> These credentials are stored in the database (`volunteers` table), NOT in the code. You can change passwords or add new volunteers directly from the Supabase dashboard without redeploying.

---

## How Each Feature Works (Step by Step)

### 🟢 Feature 1: Online Registration

**User's perspective:**
1. Open the website.
2. Fill in Name, College, Mobile, Email.
3. Click "Register Now".
4. See a green tick: "Registration Successful!"

**What happens behind the scenes:**
1. Frontend validates all fields (name ≥ 3 chars, valid phone, valid email).
2. Sends an `INSERT` query to Supabase `users` table.
3. If mobile or email already exists → database throws error code `23505` (unique constraint violation) → UI shows "Mobile number or Email is already registered!"
4. If success → user gets status `UNASSIGNED` by default.

---

### 🟡 Feature 2: Volunteer QR Assignment

**Volunteer's perspective:**
1. Login at `/volunteer/login`.
2. Student comes to the desk: "My name is Nilesh, phone 9876543210."
3. Volunteer types `9876543210` in search bar → Nilesh's card appears.
4. Status shows `UNASSIGNED` → Click "Approve & Scan QR Pass".
5. Camera opens → Scan the physical QR card → Token `SH26-D3WVWK2` appears.
6. Click "Confirm" → Green success: "QR Successfully Assigned!"
7. Hand the physical QR card to Nilesh.

**What happens behind the scenes (this is the critical part):**

When "Confirm" is clicked, 4 things happen in sequence:

```
Step 1: Verify the QR token exists in qr_codes table
        → If not found: "Invalid QR Code"

Step 2: Check QR status
        → If not 'AVAILABLE': "This QR code is already ASSIGNED!"

Step 3: ATOMIC UPDATE on users table
        UPDATE users SET status = 'ASSIGNED'
        WHERE id = nilesh_id AND status = 'UNASSIGNED'
        → If 0 rows updated: "Another volunteer already assigned this user!"

Step 4: ATOMIC UPDATE on qr_codes table
        UPDATE qr_codes SET status = 'ASSIGNED', assigned_user_id = nilesh_id
        WHERE unique_token = 'SH26-D3WVWK2' AND status = 'AVAILABLE'
        → If 0 rows updated: ROLLBACK user status → "QR was grabbed by another volunteer!"

Step 5: INSERT into activity_logs
        (Records who assigned what to whom, for audit trail)
```

**Why "ATOMIC UPDATE"?**

Imagine this scenario:
- Volunteer A (Counter 1) searches for Nilesh. Sees `UNASSIGNED`.
- Volunteer B (Counter 2) also searches for Nilesh. Also sees `UNASSIGNED`.
- Both scan different QR codes and click Confirm at the same millisecond.

Without atomic updates, BOTH would succeed, and Nilesh would have 2 QR codes in the database — chaos!

With our atomic approach:
- The SQL `WHERE status = 'UNASSIGNED'` acts as a lock.
- Whichever database query arrives first changes Nilesh's status to `ASSIGNED`.
- The second query finds `status = 'ASSIGNED'` (not `UNASSIGNED`), so the `WHERE` clause matches 0 rows → returns empty → our code detects this and shows an error to the second volunteer.

The same logic protects QR codes — no single QR can ever be assigned to two people.

---

### 🔵 Feature 3: Admin Panel

**What the admin sees:**

**Overview Tab:**
- 4 colored stat cards: Total Registered, QR Assigned, Pending, QR Available
- Progress bar showing what % of students have received their passes
- QR Inventory breakdown (total vs available vs distributed)
- Last 5 assignments feed

**Activity Logs Tab:**
- Chronological list of EVERY QR assignment
- Shows: Student Name ← Volunteer Name · QR Token · Time
- Example: `Nilesh Kumar ← Volunteer 1 · SH26-D3WVWK2 · 5m ago`

**Volunteers Tab:**
- List of all volunteer accounts with their role
- Toggle button: click to instantly **Disable** a volunteer (they can no longer login)
- Click again to **Re-enable** them

---

## Data Import Scripts

We had 3 one-time scripts that were run locally to set up the data:

### Script 1: `generate-qr-codes.js`
- Generates 500 unique random tokens like `SH26-D3WVWK2`
- Creates a PNG image for each token (the actual QR code image)
- Saves all images to `shaurya-qr-codes/qr-images/`
- Saves a JSON mapping to `shaurya-qr-codes/qr_codes_db_import.json`
- These images are what you print on physical cards

### Script 2: `import-qrs.js`
- Reads the JSON file
- Uploads all 500 tokens to the `qr_codes` table in Supabase
- Each QR starts with `status = 'AVAILABLE'`

### Script 3: `import-users.js`
- Reads `participants - Sheet1.csv` (last year's data, 700 rows)
- Cleans up messy phone numbers, removes duplicates
- Uploads **660 unique users** to the `users` table
- These users don't need to register again — they're already in the system

---

## Project File Structure

```
QR/
├── README.md                          ← You are here
├── participants - Sheet1.csv          ← Last year's participant data
├── generate-qr-codes.js              ← QR image generation script
│
├── shaurya-qr-codes/
│   ├── qr-images/                     ← 500 PNG QR code images (for printing)
│   │   ├── 001_SH26-D3WVWK2.png
│   │   ├── 002_SH26-A7XM9PQ.png
│   │   └── ... (500 files)
│   └── qr_codes_db_import.json        ← Token data used by import script
│
└── shaurya-app/                       ← The Next.js web application
    ├── .env.local                     ← Supabase URL + API Key (secret)
    ├── package.json
    ├── supabase_setup.sql             ← SQL: creates users + qr_codes tables
    ├── supabase_phase2.sql            ← SQL: creates volunteers + activity_logs tables
    ├── import-qrs.js                  ← Script: uploads QR tokens to database
    ├── import-users.js                ← Script: uploads CSV users to database
    │
    └── src/
        ├── lib/
        │   └── supabase.ts            ← Supabase client (shared across all pages)
        ├── middleware.ts              ← Route protection (checks cookies)
        └── app/
            ├── globals.css            ← All custom CSS (light theme, gradients)
            ├── page.tsx               ← Registration page (public)
            ├── admin/
            │   └── page.tsx           ← Admin panel (stats, logs, volunteers)
            └── volunteer/
                ├── login/
                │   └── page.tsx       ← Volunteer login page
                └── dashboard/
                    └── page.tsx       ← QR assignment dashboard
```

---

## How to Run This Project

### Prerequisites
- Node.js installed on your computer
- A Supabase account with a project created

### Step 1: Install dependencies
```bash
cd shaurya-app
npm install
```

### Step 2: Set up the database
1. Go to your Supabase project → SQL Editor
2. Run the contents of `supabase_setup.sql` (creates `users` and `qr_codes` tables)
3. Run the contents of `supabase_phase2.sql` (creates `volunteers` and `activity_logs` tables)

### Step 3: Import data
```bash
cd shaurya-app
node import-qrs.js      # Uploads 500 QR tokens
node import-users.js     # Uploads 660 past participants
```

### Step 4: Start the server
```bash
npm run dev
```

### Step 5: Open in browser
| What | URL |
|------|-----|
| Registration Page | http://localhost:3000 |
| Volunteer Login | http://localhost:3000/volunteer/login |
| Admin Panel | http://localhost:3000/admin |

---

## Supabase Configuration

The app connects to Supabase using two environment variables stored in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...your-key
```

These are safe to use on the frontend because Row Level Security (RLS) is enabled on all tables, and the anon key only has the permissions we explicitly granted through RLS policies.

---

## Design Decisions & Trade-offs

| Decision | Why |
|----------|-----|
| Passwords stored as plain text | This is a 3-day college fest, not a bank. Hashing adds complexity without real benefit here. For production, use bcrypt. |
| Cookie-based auth (not JWT) | Simpler, works perfectly for this use case. Middleware checks cookies server-side. |
| No SMS/Email verification | Would cost money and slow down registration. Screen confirmation is sufficient. |
| QR tokens are short (`SH26-XXXX`) | Volunteers may need to type them manually if scanner fails. Long UUIDs would be impossible to type. |
| Inline CSS instead of Tailwind | Faster development, no build config, works everywhere. |

---

## Built By

**Bhanu Pratap Singh Rathore** — IIT Kharagpur
