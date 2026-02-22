# FlexSpace — Desk Booking Platform

> A full-stack desk booking system built for modern hybrid workplaces. Real-time availability, interactive floor maps, granular access control, and a calendar-first booking experience — all in one self-hosted package.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Access Control Model](#access-control-model)
- [Real-Time System](#real-time-system)
- [API Reference](#api-reference)
- [Background Tasks](#background-tasks)
- [User Preferences](#user-preferences)
- [Project Structure](#project-structure)

---

## Overview

FlexSpace lets organisations manage shared desk space across multiple offices, floors, and rooms. Employees browse an interactive 3D globe to find their office, navigate floor maps to pick a desk, and book it with a drag-and-drop calendar — all updating live for everyone in the building.

Admins get a full management layer: location and room managers, user group-based access gates, permanent desk assignments, and maintenance mode — without needing to touch the Django admin panel.

---

## Key Features

### Booking Experience

- **Interactive floor map** — desks are pinned to an uploaded room image; click a marker to see live status (available, booked, locked, permanent, under maintenance)
- **Drag-to-book calendar** — day, week, and month views with drag-and-drop slot selection or two-click pick in day/week view
- **Live hover preview** — see your draft booking rendered in real time as you move the cursor across the calendar before committing
- **Multi-day bookings** — a single booking can span multiple days; the calendar renders it correctly across all columns
- **Edit & extend** — modify an existing booking's time range directly from the calendar; ongoing bookings can be extended even after they've started
- **Booking intervals** — the `edit_intervals` API endpoint merges, splits, and trims overlapping intervals intelligently, preserving adjacent bookings
- **Desk lock** — when a user opens the booking modal, the desk is locked in Redis for 60 seconds (auto-refreshed every 25 s, max 5 min) preventing double-booking races
- **Permanent desks** — a desk can be permanently assigned to a user; only that user can book it, enforced at both model and API level
- **Graceful unlock on tab close** — `navigator.sendBeacon` fires an unlock request even when the browser tab is killed mid-booking

### My Bookings

- **Stats panel** — live at-a-glance summary above the calendar:
  - Active now banner with pulsing indicator and time remaining
  - Next booking countdown (updates every minute without a page refresh)
  - Hours booked this week and this month
  - Total upcoming bookings
  - Favourite location and desk (last 30 days)
  - Busiest weekday pattern
- **Full calendar view** — your bookings in day / week / month grid, with edit and cancel inline
- **Edit from calendar** — clicking your own booking block opens the booking modal pre-seeded with your current times; the calendar shows only your own bookings for that desk, not other users'
- **Past booking guard** — fully elapsed bookings are read-only; ongoing bookings (started but not yet ended) can still be extended

### Dashboard

- **3D spinning globe** — locations are plotted as arcs on a WebGL globe (three-globe); selecting a country zooms to that region
- **Location browser** — hierarchical panel: Country → Location → Floor → Room, with live availability counts
- **Room map viewer** — pan/zoom the floor plan, click desk markers for a context menu with booking, status, and manager actions
- **Today panel** — quick list of your bookings for today and upcoming days with navigate-to-room and edit shortcuts

### Real-Time

- **WebSocket channels** — three channel groups: `global_updates`, `location_{id}`, `room_{id}`
- **Live desk status** — desk booked/available state broadcasts instantly to everyone viewing the same room
- **Live lock state** — desk lock/unlock events propagate without polling
- **Maintenance mode** — room managers can toggle maintenance; the map updates for all connected clients immediately
- **Heartbeat** — client sends a ping every 30 s; server responds with a pong; status bar shows connection health

### Access Control

Four-tier role hierarchy with a two-layer location + room gate:

| Role | Capabilities |
|---|---|
| **Superuser** | Full access to everything |
| **Location Manager** | Manage their locations, appoint room managers, create user groups, control group-level access gates |
| **Room Manager** | Edit room details, upload floor maps, manage desk positions, toggle maintenance, manage permanent assignments |
| **User** | Browse and book desks in rooms they have access to |

- **Location gate** — a location can restrict access to specific user groups; users outside those groups cannot see or book any room in that location
- **Room gate** — a room can restrict booking to specific user groups within the location; empty allowed_groups means nobody (except managers) can book
- **Group membership delegation** — location managers can optionally allow room managers to add members to user groups

### Authentication

- **JWT via HTTP-only cookies** — access token (5 min), refresh token (1 day), rotated and blacklisted on use
- **Google OAuth** — one-click sign-in; account linking lets users connect a Google account to an existing username/password account
- **Linked accounts** — users can connect and disconnect social providers from their profile settings
- **Set password after OAuth** — users who signed up via Google can add a password to enable direct login

### Admin Panel

Built into the frontend (no Django admin required for day-to-day tasks):

- **Country management** — add countries with lat/lng for globe positioning
- **Location management** — create locations, assign managers, configure group access gates
- **Room management** — create rooms per floor, upload floor map images, manage desk grid (drag to reposition), set allowed groups, toggle maintenance
- **User group management** — create groups per location, manage members, assign to rooms and locations
- **User search** — find users by username or email to assign to groups or roles

### Personalisation

Each user has a persistent preferences profile:

- Theme: Light / Dark / Auto (system)
- Timezone: 50+ IANA timezones; all booking times are displayed in the user's chosen zone
- Time format: 12-hour or 24-hour
- Date format: MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD
- Default location: pre-selects a location in the browser on login
- Default booking duration: used as a hint when creating new bookings

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Framework | Django 5.2 + Django REST Framework 3.16 |
| Async / WebSocket | Django Channels 4.3 + Daphne (ASGI) |
| Task queue | Celery 5.5 + Celery Beat |
| Cache / broker | Redis (channels layer, desk locks, Celery broker & result backend) |
| Auth | djangorestframework-simplejwt 5.5 (HTTP-only cookie strategy) |
| Image handling | Pillow (floor map uploads) |
| Filtering | django-filter |
| Database | SQLite (default; swap to PostgreSQL for production) |
| Testing | pytest-django, pytest-asyncio, pytest-cov |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 7 |
| UI library | Fluent UI v9 (`@fluentui/react-components`) |
| 3D globe | react-globe.gl + three.js + three-globe |
| Map canvas | react-konva (desk positioning on floor maps) |
| Routing | React Router 7 |
| OAuth | @react-oauth/google |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React)                   │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Dashboard │  │  My Bookings │  │  Admin Panel │  │
│  │  (Globe +  │  │  (Calendar + │  │  (Locations, │  │
│  │  Room Map) │  │  Stats)      │  │   Rooms, etc)│  │
│  └─────┬──────┘  └──────┬───────┘  └──────┬───────┘  │
│        │  REST API       │                 │          │
│        │  (JWT Cookie)   │                 │          │
└────────┼─────────────────┼─────────────────┼──────────┘
         │                 │  WebSocket      │
         ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────┐
│              Django / Daphne (ASGI)                  │
│  ┌──────────────────┐   ┌────────────────────────┐  │
│  │   REST API       │   │   Channels Consumers   │  │
│  │   (DRF views)    │   │   global / location /  │  │
│  │                  │   │   room groups          │  │
│  └────────┬─────────┘   └──────────┬─────────────┘  │
│           │                        │                 │
└───────────┼────────────────────────┼─────────────────┘
            │                        │
            ▼                        ▼
┌───────────────────┐   ┌─────────────────────────────┐
│     SQLite /      │   │            Redis             │
│     PostgreSQL    │   │  • Channel layer (pub/sub)   │
│                   │   │  • Desk locks (TTL keys)     │
│                   │   │  • Celery broker + results   │
└───────────────────┘   └─────────────────────────────┘
                                    ▲
                         ┌──────────┴──────────┐
                         │   Celery Worker      │
                         │   + Celery Beat      │
                         │   (scheduled tasks)  │
                         └─────────────────────┘
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Redis (listening on port 6378 by default)

### Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (see Configuration section)
cp .env.example .env

# Apply migrations
python manage.py migrate

# Create a superuser
python manage.py createsuperuser

# Start the ASGI server
daphne -p 8000 booking_project.asgi:application
```

### Celery setup (Windows)

Use the provided batch script to launch the worker and beat scheduler in separate terminal windows with the virtual environment already activated:

```
start_celery.bat
```

Or manually:

```bash
# Terminal 1 — worker (Windows requires --pool=solo)
celery -A booking_project worker --pool=solo -l info

# Terminal 2 — beat scheduler
celery -A booking_project beat -l info
```

On macOS / Linux the default prefork pool works:

```bash
celery -A booking_project worker -l info &
celery -A booking_project beat -l info &
```

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server starts at `http://localhost:5173` and proxies API calls to `http://localhost:8000`.

---

## Configuration

Create a `.env` file in `backend/`:

```env
# Django
DJANGO_SECRET_KEY=your-secret-key-here

# Google OAuth (optional — omit to disable Google login)
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback/google
```

### Redis port

By default FlexSpace uses Redis on port **6378** (not the standard 6379) to avoid conflicting with other local Redis instances. Change this in `backend/booking_project/settings.py`:

```python
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [("127.0.0.1", 6378)]},
    },
}

CELERY_BROKER_URL = 'redis://127.0.0.1:6378/0'
```

### JWT tokens

| Setting | Default | Notes |
|---|---|---|
| Access token lifetime | 5 minutes | Short-lived; silently refreshed via cookie |
| Refresh token lifetime | 1 day | Rotated and blacklisted on each use |
| Cookie strategy | HTTP-only, SameSite=Lax | Tokens never exposed to JavaScript |

---

## Access Control Model

### Roles

Roles are not stored as a separate field — they are derived from Django's built-in flags and M2M relationships:

```
is_superuser  →  full access, bypasses all gates
is_staff      →  treated as superuser for booking purposes
location_managers (M2M on Location)  →  Location Manager for those locations
room_managers (M2M on Room)          →  Room Manager for those rooms
```

Location Managers automatically inherit Room Manager privileges for all rooms in their location.

### Two-layer access gate

```
Can user book desk D in room R?

Layer 1 — Location gate:
  if location.allowed_groups is empty → open to all authenticated users
  else → user must be a member of at least one allowed group in that location

Layer 2 — Room gate:
  if room.allowed_groups is empty → nobody can book (except managers)
  else → user must be a member of at least one allowed group assigned to that room
```

Both layers are enforced at the model level (`can_user_book`) and at the API level before any booking is created.

---

## Real-Time System

### Channel groups

| Group | When joined | Events received |
|---|---|---|
| `global_updates` | On login | Global announcements, ping/pong |
| `location_{id}` | When a location is expanded in the browser | Room availability changes, maintenance updates |
| `room_{id}` | When a room map is opened | `desk_status`, `desk_lock`, `room_maintenance` |

### Desk lock lifecycle

```
User opens booking modal
  → POST /api/bookings/lock/         acquire Redis key (60 s TTL)
  → setInterval every 25 s           POST /api/bookings/refresh_lock/
  → User confirms or cancels
  → POST /api/bookings/unlock/       delete Redis key
  → beforeunload                     navigator.sendBeacon (tab close safety net)

Celery (every minute)
  → expire_and_activate_bookings     clears DB lock flags for expired Redis keys
```

---

## API Reference

All endpoints are under `/api/` and require a valid JWT cookie unless noted.

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login/` | Username + password login, sets JWT cookies |
| POST | `/auth/logout` | Blacklists refresh token, clears cookies |
| POST | `/auth/token/refresh/` | Silently rotate access token |
| GET | `/auth/me/` | Current user profile + role flags |
| GET | `/auth/google/` | Initiate Google OAuth flow |
| GET | `/auth/google/callback/` | Handle Google OAuth callback |
| GET | `/auth/linked-accounts/` | List connected social providers |
| DELETE | `/auth/disconnect/{provider}/` | Remove a linked provider |
| POST | `/auth/set-password/` | Set password after OAuth signup |

### Resources

| Resource | Endpoints | Notes |
|---|---|---|
| Countries | `/api/countries/` | CRUD |
| Locations | `/api/locations/` | Filter by `country` |
| Floors | `/api/floors/` | Filter by `location` |
| Rooms | `/api/rooms/` | Filter by `floor`; includes `/desks/` and `/availability/` actions |
| Desks | `/api/desks/` | Includes `assign-permanent`, `clear-permanent`, `lock_state`, `availability` actions |
| Bookings | `/api/bookings/` | Filter by `desk`, `start`, `end`, `user_only`; includes `lock`, `unlock`, `refresh_lock`, `bulk_create`, `edit_intervals` actions |

### Admin resources

| Resource | Path | Notes |
|---|---|---|
| User groups | `/api/usergroups/` | Scoped to location; membership management |
| Admin locations | `/api/admin/locations/` | Location manager view with manager assignment |
| Admin rooms | `/api/admin/rooms/` | Room manager view with desk grid and group management |
| Users | `/api/users/` | Search by username/email |
| Preferences | `/api/preferences/` | User preferences CRUD |

### Notable actions

**`POST /api/bookings/bulk_create/`** — Create multiple bookings in one request. Detects and reports conflicts per desk per day without failing the entire batch.

**`POST /api/bookings/{id}/edit_intervals/`** — Replace a booking's time range with one or more new intervals. Handles merging with adjacent bookings, splitting overlapping ones, and cleaning up fully-superseded bookings. Returns `updated_id`, `created_ids`, and `deleted_ids` for surgical client-side updates.

---

## Background Tasks

Managed by Celery Beat, defined in `booking/tasks.py`:

| Task | Schedule | Purpose |
|---|---|---|
| `expire_and_activate_bookings` | Every minute | Updates `is_booked` on desks as bookings start/end; reconciles DB lock flags against Redis TTLs; broadcasts desk status changes via WebSocket |
| `cleanup_expired_tokens` | Daily at 03:00 UTC | Removes expired JWT tokens from the `outstanding_token` and `blacklisted_token` tables to keep the database lean |
| `startup_sync_desks` | Once on worker start | Recomputes all desk booking states and clears stale Redis locks after a server restart; guarded by a Redis setnx so it runs only once across multiple workers |

---

## User Preferences

Stored in `UserPreferences` (one-to-one with `User`):

| Preference | Options | Default |
|---|---|---|
| Theme | Light, Dark, Auto | Auto |
| Language | English, Español, Français, Deutsch | English |
| Timezone | 50+ IANA zones | UTC |
| Date format | MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD | MM/DD/YYYY |
| Time format | 12-hour, 24-hour | 12-hour |
| Default location | Any location (FK) | None |
| Default booking duration | Integer hours | 8 |

All times displayed in the UI respect the user's chosen timezone. The booking calendar, stats panel, and booking modal all use `Intl.DateTimeFormat` with the stored IANA zone to convert UTC timestamps — no server-side rendering required.

---

## Project Structure

```
FlexSpace/
├── backend/
│   ├── booking/
│   │   ├── models.py               # Country, Location, Floor, Room, Desk, Booking
│   │   ├── models_preferences.py   # UserPreferences
│   │   ├── models_social.py        # SocialAccount (OAuth provider links)
│   │   ├── views.py                # Core API viewsets
│   │   ├── permissions.py          # Role-based permission classes
│   │   ├── consumers.py            # WebSocket consumers (global, location, room)
│   │   ├── tasks.py                # Celery tasks
│   │   ├── signals.py              # Post-save hooks
│   │   ├── serializers/            # Per-resource serializers
│   │   ├── services/
│   │   │   └── desk_lock.py        # Redis-backed desk locking service
│   │   ├── admin_views_module/     # Location/room manager API views
│   │   └── accounts/
│   │       └── oauth_views.py      # Google OAuth flow
│   └── booking_project/
│       ├── settings.py
│       ├── celery.py               # Celery app + startup sync signal
│       └── asgi.py                 # ASGI routing (HTTP + WebSocket)
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Dashboard/
│       │   │   ├── BookingsCalendar.tsx   # My Bookings calendar + CalendarGrid
│       │   │   ├── BookingModal.tsx       # Booking creation/edit modal
│       │   │   ├── BookingStatsPanel.tsx  # At-a-glance stats strip
│       │   │   ├── TodayPanel.tsx         # Today's bookings sidebar
│       │   │   ├── RoomMapViewer.tsx      # Interactive floor map
│       │   │   └── LocationBrowser.tsx    # Location/floor/room tree
│       │   ├── Admin/                     # Admin management views
│       │   ├── Globe/                     # 3D globe components
│       │   ├── Common/                    # Shared dialogs (Profile, Settings)
│       │   ├── Layout/                    # FloatingPanel grid system
│       │   └── TopBar.tsx                 # Navigation bar
│       ├── services/                      # Typed API client functions
│       ├── contexts/                      # Auth, Theme, Toast, Preferences
│       └── types/                         # Shared TypeScript types
│
└── start_celery.bat                       # Windows: launch worker + beat in separate windows
```