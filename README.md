# LifeLink – Blood Donor & Emergency Blood Availability Portal

A centralized web platform connecting blood donors, hospitals, and people in need across India.

> **Academic Project** – B.Tech CSE (Data Science)

---

## 🩸 Features

| Feature | Description |
|---|---|
| 🔍 Find Blood | Search donors and blood banks by blood group, city, PIN code |
| 🚨 Emergency Request | Submit urgent blood requests with unique tracking ID |
| 🗺️ Interactive Map | Leaflet.js map with hospitals, blood banks, and approximate donor locations |
| 🏥 Blood Banks Directory | Verified healthcare facilities with blood stock info |
| 👤 Role-based Dashboards | Patient, Donor, Facility, and Admin dashboards |
| 🔐 Authentication | Supabase Auth with email/password |
| 🛡️ Privacy | Donor contact details and exact coordinates are never publicly exposed |

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the SQL schema: copy contents of `supabase_schema.sql` into your Supabase **SQL Editor** and execute
3. Copy `.env.example` to `.env` and fill in your credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the development server

```bash
cd frontend
npm run dev
```

App runs at **http://localhost:5173**

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── pages/           # Route pages
│   │   ├── Home.jsx
│   │   ├── FindBlood.jsx
│   │   ├── EmergencyRequest.jsx
│   │   ├── BloodBanks.jsx
│   │   ├── MapView.jsx
│   │   ├── About.jsx
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── dashboards/      # Role-based dashboards
│   │   ├── PatientDashboard.jsx
│   │   ├── DonorDashboard.jsx
│   │   ├── FacilityDashboard.jsx
│   │   └── AdminDashboard.jsx
│   ├── components/      # Reusable UI components
│   ├── services/        # Supabase API wrappers
│   ├── context/         # AuthContext
│   ├── utils/           # Helpers (validators, distance, blood groups)
│   └── layouts/         # Layout wrappers
├── .env.example
└── supabase_schema.sql  # (at project root)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Routing | React Router v7 |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Maps | Leaflet.js + OpenStreetMap |
| Icons | Lucide React |
| Notifications | react-hot-toast |

---

## 🔐 User Roles

| Role | Access |
|---|---|
| Patient / Requester | Submit blood requests, search donors, view request status |
| Donor | Manage availability, accept/decline contact requests |
| Healthcare Facility | Manage blood inventory, view incoming requests |
| Administrator | Approve facilities, monitor all requests and users |

---

## ⚠️ Disclaimer

LifeLink is an **information and coordination platform only**.
It does not replace medical professionals or licensed blood banks.
Blood compatibility must be verified through proper crossmatching by qualified professionals.
Donor eligibility is determined by licensed blood banks at time of donation.

---

## 📞 Emergency Contact

National Blood Bank Helpline: **104**
