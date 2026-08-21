# 📜 Foody Engineering Log & Chat Export
**Feature:** Restaurant Subscription & Billing System & Partner Onboarding  
**Project:** Foody Multi-Tenant Food Delivery & Restaurant Platform  
**Export Date:** August 15, 2026

---

## 📑 Table of Contents
1. [Overview & Project Direction](#1-overview--project-direction)
2. [Real Location Feature Implementation](#2-real-location-feature-implementation)
3. [Subscription & Billing Architecture](#3-subscription--billing-architecture)
4. [Entitlement-Based Feature Gating](#4-entitlement-based-feature-gating)
5. [Completed Milestones Summary](#5-completed-milestones-summary)
6. [Session Rehydration & Authentication Flow](#6-session-rehydration--authentication-flow)
7. [Testing Credentials & Sandbox Info](#7-testing-credentials--sandbox-info)
8. [Upcoming Milestones Roadmap](#8-upcoming-milestones-roadmap)

---

## 1. Overview & Project Direction

### Completed Flow:
```text
Restaurant Owner 
    ↓
Authentication & Signup
    ↓
Email Verification (Token + OTP)
    ↓
Restaurant Onboarding V2 (5-Step Wizard)
    ├── Step 1: Brand Profile (ImageKit Logo Upload)
    ├── Step 2: Location (Google Places Autocomplete + Draggable Map)
    ├── Step 3: Operating Schedule & Meal Shifts (Mon–Sun + 1-Click Copy)
    ├── Step 4: Excel Menu Parser (<50ms SheetJS parsing & Live Table)
    └── Step 5: Final Review & Submission
    ↓
Admin Review & Approval
    ├── Restaurant Document Created (with GeoJSON 2dsphere coordinates)
    ├── Menu Items Seeded from Staged Items
    ├── User Role upgraded from 'customer' to 'restaurant'
    └── 30-Day Trial Subscription auto-created in MongoDB
    ↓
Restaurant Partner Dashboard
    ↓
Subscription & Billing System
```

---

## 2. Real Location Feature Implementation

### Architecture:
- **Google Maps JavaScript API + Places API**:
  - Dynamically injected on-demand using `useGooglePlaces` custom hook.
  - Zero performance penalty for non-partner customer pages.
- **Visual Draggable Map Canvas**:
  - Rendered via a native DOM `ref` (`useRef<HTMLDivElement>`).
  - Listens for `marker.addListener('dragend')` to reverse-geocode coordinates (`lat`, `lng`) into formatted street addresses.
- **1-Click GPS Location Detection**:
  - Uses browser `navigator.geolocation.getCurrentPosition()`.
  - Reverse-geocodes GPS coordinates via Google Geocoding API.
- **MongoDB Spatial GeoJSON**:
  - Standardized coordinate format `[longitude, latitude]` for `2dsphere` distance indexing.

---

## 3. Subscription & Billing Architecture

### Three-Tier Domain Separation:
1. **Plan (What Foody Offers)**:
   - Configurable MongoDB document (`Plan.js`).
   - Prices stored in **paise** (`₹999` = `99900`) for consistency with payment gateways.
   - `-1` sentinel value used to represent unlimited allowances.
   - Soft-delete flag (`isActive`) allows grandfathering existing subscribers when new tiers are created.
2. **Subscription (What a Specific Restaurant Has)**:
   - Exactly one `Subscription` document per restaurant.
   - Status transitions: `trial` ➔ `active` ➔ `past_due` (grace period) ➔ `cancelled` / `free`.
   - References `Plan` via ObjectId (never duplicate raw limits).
3. **Entitlement (What the Restaurant is Allowed to Do)**:
   - Centralized enforcement service (`entitlementService.js`).
   - Pure evaluation function reading active plan limits against current resource counts.

---

## 4. Entitlement-Based Feature Gating

### Centralized Service (`entitlementService.js`):
```javascript
const { checkEntitlement, FEATURES } = require('../services/entitlementService');

// Example check: Adding a menu item
const { allowed, reason } = await checkEntitlement(
  restaurantId, 
  FEATURES.ADD_MENU_ITEM, 
  { currentCount: 18 }
);

if (!allowed) {
  return res.status(403).json({ success: false, message: reason });
}
```

### Supported Features & Rules:
- `add_menu_item`: Free (20 items), Growth (Unlimited), Pro (Unlimited).
- `add_staff`: Free (0 staff), Growth (3 staff), Pro (Unlimited).
- `view_analytics`: Free (false), Growth (true), Pro (true).
- `past_due` Policy: Grace period permits full access while payment retries occur.

---

## 5. Completed Milestones Summary

### 🏁 Milestone 1: Plan Model & Seed Data (`3fde2c6`)
- Created `backend/models/Plan.js` Mongoose schema.
- Created `backend/scripts/seedPlans.js` with idempotent upsert logic.
- Created public endpoint `GET /billing/plans`.

### 🏁 Milestone 2: Subscription Model & Auto-Creation on Approval (`c554e6d`)
- Created `backend/models/Subscription.js` Mongoose schema.
- Updated `adminRoutes.js` (`PATCH /admin/applications/:id/approve`) to auto-create 30-day trial subscription.
- Created protected endpoint `GET /billing/my-subscription`.

### 🏁 Milestone 3: Centralized Entitlement Service (`1d3dd80`)
- Created `backend/services/entitlementService.js` with modular feature evaluators.
- Implemented `past_due` grace period support.

### 🏁 Milestone 4: Basic Restaurant Dashboard (`b229d19`)
- Created aggregated backend endpoint `GET /restaurant/my-dashboard` with `Promise.all` parallel DB fetching.
- Created frontend `RestaurantDashboard.tsx` with Store Profile, Status Banner, Plan Limits Grid, and Live Menu catalog.
- Added role-based routing in `App.tsx` for `role === 'restaurant'`.

---

## 6. Session Rehydration & Authentication Flow

### Problem Solved:
When an admin approves a partner application, the user's role in MongoDB updates from `'customer'` to `'restaurant'`, but active browser sessions held stale tokens.

### Solution Implemented:
1. **Backend `GET /auth/me`**:
   - Protected endpoint returning fresh user profile and a newly signed JWT `accessToken` reflecting their updated role.
2. **Frontend `AuthContext.tsx` Boot Rehydration**:
   - Automatically calls `authService.getMe()` on page load.
   - Syncs upgraded roles and persists renewed tokens seamlessly.

---

## 7. Testing Credentials & Sandbox Info

| Username | Password | Linked Restaurant | Subscription State |
|---|---|---|---|
| **`superadmin`** | `password123` | *haldiram* | Free Plan (`trial` - 30 days) |
| **`vendor`** | `password123` | *Tasty Bites* | Free Plan (`trial` - 30 days) |

---

## 8. Upcoming Milestones Roadmap

```text
🏁 Milestone 5:  Billing Page (Plan Cards & Feature Comparison — Read-Only)
🏁 Milestone 6:  Razorpay Test Setup & Plan Linking
🏁 Milestone 7:  Razorpay Subscription Checkout Flow
🏁 Milestone 8:  Webhook Handler & Subscription Activation (HMAC Signature)
🏁 Milestone 9:  Payment Failure & past_due Handling
🏁 Milestone 10: Trial Expiry Scheduled Job
🏁 Milestone 11: Cancel Subscription & Downgrade Flow
```
