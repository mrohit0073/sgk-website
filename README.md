# ⚡ ISP Website Template (Modular & SEO Optimized)

A high-performance, plug‑and‑play template to launch ISP landing sites. Features a real-time coverage map, plan management, WhatsApp lead capture, and a fully modular authenticated Admin Panel backed by Firebase Firestore.

## ✨ Key Features

* **Public Site:**
    * 🚀 **High Performance:** Deferred script loading & pre-connected CDNs for fast "First Contentful Paint".
    * 🔍 **SEO Friendly:** Integrated Open Graph, Twitter Cards, and meta descriptions.
    * 🗺️ **Interactive Map:** Leaflet map with point-in-polygon coverage checks and address search (Photon/Nominatim).
    * 📱 **Responsive:** Mobile-first design with 3D tilt effects and glassmorphism UI.
    * 💬 **Lead Gen:** WhatsApp integration for inquiries, plans, and payment proof.

* **Admin Panel:**
    * 🎨 **Branding Studio:** Switch between Logo/Text modes and **generate favicons/app icons** directly in the browser (Canvas-based).
    * 🚨 **Emergency Controls:** Set zone outages with specific reasons and ETAs.
    * ✏️ **Zone Editor:** Draw, edit, and color-code coverage zones on the map.
    * 📦 **Modular Code:** Split into logic-specific modules (`plans`, `map`, `status`, `branding`) for easier maintenance.

## 📁 File Structure

```text
ISP-TEMPLATE/
├── index.html                  # Public landing page (SEO optimized)
├── admin-panel.html            # Admin dashboard (No-index protected)
├── assets/
│   └── css/
│       ├── index.css           # Public site styles
│       └── admin.css           # Admin panel styles
├── config/
│   ├── firebase.js             # 🔑 PASTE YOUR FIREBASE CONFIG HERE
│   └── isp-config.js           # Default fallbacks (Name, Cities, Contacts)
├── core/                       # Public Logic
│   ├── utils.js                # 🧠 Shared Utilities (Validation, Formatting, Canvas)
│   ├── main.js                 # Bootstrapper & Firebase init
│   ├── map-core.js             # Leaflet logic & coverage check
│   ├── plans.js                # Plan rendering & filtering
│   └── lead-form.js            # Modal & WhatsApp logic
└── admin-core/                 # Admin Logic (Modularized)
    ├── admin.core.js           # Auth, State Management, Cloud I/O
    ├── admin.branding.js       # Logo & Favicon Generator logic
    ├── admin.map.js            # Map editing & drawing tools
    ├── admin.plans.js          # Plan CRUD operations
    └── admin.status.js         # Emergency status & ETA logic
🚀 Quick Start
Setup Firebase:

Create a project at console.firebase.google.com.

Create a Firestore Database (start in Test mode for development).

Enable Authentication (Email/Password provider).

Configure Code:

Copy your web SDK config from Firebase Project Settings.

Paste it into config/firebase.js.

Optional Defaults:

Edit config/isp-config.js to set your initial brand name and contact details (used as fallback before DB loads).

Deploy:

Upload the entire folder to any static host (Vercel, Netlify, Firebase Hosting, GitHub Pages).

Login & Manage:

Create a user in Firebase Auth Console.

Go to /admin-panel.html and log in.

First Save: Go to the "ISP Details" tab and click "Save" to initialize the database structure.

🗄️ Firestore Data Model
The app reads/writes to a single document: settings/siteData.
