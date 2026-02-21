# FleetFlow — Modular Fleet & Logistics Management System

> Full-stack MERN application for managing a small-to-medium delivery fleet with real-time dispatch, analytics, and role-based access control.

---

## Features

- **Role-based access** — Manager, Dispatcher, Safety Officer, Finance
- **Vehicle management** — CRUD, status tracking (available / on_trip / in_shop / retired / out_of_service)
- **Driver management** — License expiry warnings, category validation, suspension flow
- **Trip lifecycle** — Draft → Dispatched → Completed / Cancelled with atomic state transitions
- **Business rules** — Capacity check, license expiry block, driver suspension block
- **Maintenance logs** — Automatically puts vehicle "in shop" on creation
- **Fuel expenses** — Link to trips, per-vehicle cost tracking
- **Analytics** — Fleet KPIs, per-vehicle ROI / fuel efficiency / cost-per-km
- **Real-time updates** — Socket.IO events on all state changes
- **CSV export** — All major entities
- **Audit log** — All role-sensitive actions tracked

---

## Stack

| Layer     | Technology                                           |
|-----------|------------------------------------------------------|
| Backend   | Node.js 18, Express 4, Mongoose 8, Socket.IO 4       |
| Auth      | JWT (access + refresh), bcryptjs                     |
| Validation| Joi 17                                               |
| Frontend  | React 18, Vite 5, TailwindCSS 3.4                    |
| State     | Zustand 4                                            |
| Charts    | Recharts 2                                           |
| UI        | Headless UI, Heroicons, Framer Motion, react-hot-toast|
| Database  | MongoDB 7                                            |
| Deploy    | Docker + docker-compose                              |

---

## Quick Start (Docker)

```bash
# Clone
git clone https://github.com/your-org/fleetflow
cd fleetflow

# Start everything with Docker
docker compose up --build

# Seed demo data (in a new terminal)
docker compose exec backend npm run seed
```

Frontend: **http://localhost:3000**  
Backend API: **http://localhost:5000**  
MongoDB: **localhost:27017**

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB 7 running locally (or MongoDB Atlas URI)

### Backend

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MONGO_URI
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs on **http://localhost:3000**, proxied to backend at **http://localhost:5000**.

---

## Environment Variables

**server/.env**

| Variable            | Default                           | Description                  |
|---------------------|-----------------------------------|------------------------------|
| `PORT`              | `5000`                            | Server port                  |
| `MONGO_URI`         | `mongodb://127.0.0.1:27017/fleetflow` | MongoDB connection string |
| `JWT_SECRET`        | —                                 | Access token secret (required)|
| `JWT_REFRESH_SECRET`| —                                 | Refresh token secret (required)|
| `CLIENT_URL`        | `http://localhost:3000`           | CORS origin                  |

---

## Demo Credentials (after `npm run seed`)

| Role             | Email                        | Password     |
|------------------|------------------------------|--------------|
| Manager          | manager@fleetflow.com        | password123  |
| Dispatcher       | dispatcher@fleetflow.com     | password123  |
| Safety Officer   | safety@fleetflow.com         | password123  |
| Finance Analyst  | finance@fleetflow.com        | password123  |

---

## API Reference

### Auth
| Method | Endpoint                  | Description             |
|--------|---------------------------|-------------------------|
| POST   | `/api/auth/register`      | Register new user       |
| POST   | `/api/auth/login`         | Login → tokens          |
| POST   | `/api/auth/refresh`       | Rotate access token     |
| POST   | `/api/auth/forgot-password` | Send reset email      |
| GET    | `/api/auth/me`            | Get current user        |

### Vehicles
| Method | Endpoint                       | Description                    |
|--------|--------------------------------|--------------------------------|
| GET    | `/api/vehicles`                | List (paginated, filterable)   |
| POST   | `/api/vehicles`                | Create vehicle                 |
| GET    | `/api/vehicles/:id`            | Get single vehicle             |
| PUT    | `/api/vehicles/:id`            | Update vehicle                 |
| DELETE | `/api/vehicles/:id`            | Delete vehicle                 |
| PATCH  | `/api/vehicles/:id/status`     | Change status                  |
| POST   | `/api/vehicles/:id/maintenance`| Quick maintenance (in_shop)    |

### Drivers
| Method | Endpoint                       | Description                    |
|--------|--------------------------------|--------------------------------|
| GET    | `/api/drivers`                 | List (paginated, filterable)   |
| POST   | `/api/drivers`                 | Create driver                  |
| GET    | `/api/drivers/:id`             | Get single driver              |
| PUT    | `/api/drivers/:id`             | Update driver                  |
| DELETE | `/api/drivers/:id`             | Delete driver                  |
| PATCH  | `/api/drivers/:id/status`      | Change status (suspend, etc.)  |

### Trips
| Method | Endpoint                       | Description                    |
|--------|--------------------------------|--------------------------------|
| GET    | `/api/trips`                   | List (paginated, filterable)   |
| POST   | `/api/trips`                   | Create trip (validates capacity, license, availability) |
| GET    | `/api/trips/:id`               | Get single trip                |
| PATCH  | `/api/trips/:id/dispatch`      | Dispatch → on_trip             |
| PATCH  | `/api/trips/:id/complete`      | Complete → updates odometer    |
| PATCH  | `/api/trips/:id/cancel`        | Cancel → restores states       |

### Maintenance
| Method | Endpoint              | Description                    |
|--------|-----------------------|--------------------------------|
| GET    | `/api/maintenance`    | List logs (filterable by vehicle) |
| POST   | `/api/maintenance`    | Create log (sets vehicle in_shop) |

### Expenses
| Method | Endpoint              | Description                    |
|--------|-----------------------|--------------------------------|
| GET    | `/api/expenses`       | List fuel expenses             |
| POST   | `/api/expenses`       | Create expense                 |

### Analytics
| Method | Endpoint                      | Description                    |
|--------|-------------------------------|--------------------------------|
| GET    | `/api/analytics/fleet/summary`| Fleet-wide KPIs                |
| GET    | `/api/analytics/vehicle/:id`  | Per-vehicle analysis           |

### Export
| Method | Endpoint              | Query Params                   |
|--------|-----------------------|--------------------------------|
| GET    | `/api/export/csv`     | `model=trips\|vehicles\|drivers\|expenses\|maintenance` |
| GET    | `/api/export/pdf`     | `type=monthly_audit`           |

---

## Business Rules

1. **Capacity validation** — Trip rejected if `cargoWeightKg > vehicle.maxLoadKg`
2. **License expiry** — Trip rejected if driver license is expired
3. **Driver suspension** — Suspended drivers cannot be assigned to trips
4. **Dispatch transaction** — Vehicle → `on_trip`, Driver → `on_duty` atomically
5. **Complete transaction** — Vehicle → `available`, Driver → `off_duty`, odometer updated
6. **Cancel transaction** — If was `dispatched`, vehicle and driver states restored
7. **Maintenance** — Creates log + sets vehicle to `in_shop` atomically

---

## Socket.IO Events

| Event              | Payload                        | Emitted When                   |
|--------------------|--------------------------------|--------------------------------|
| `vehicle:updated`  | `{ vehicleId, status }`        | Vehicle status change          |
| `driver:updated`   | `{ driverId, status }`         | Driver status change           |
| `trip:created`     | `{ trip }`                     | New trip created               |
| `trip:dispatched`  | `{ tripId, vehicleId }`        | Trip dispatched                |
| `trip:completed`   | `{ tripId }`                   | Trip completed                 |
| `trip:cancelled`   | `{ tripId }`                   | Trip cancelled                 |
| `maintenance:added`| `{ vehicleId }`                | Maintenance log created        |

---

## Running Tests

```bash
cd server
npm test
```

Tests cover: vehicle CRUD, driver CRUD, trip lifecycle (create/dispatch/complete/cancel), capacity validation, maintenance status toggle.

---

## Project Structure

```
FleetFlow/
├── docker-compose.yml
├── server/
│   ├── Dockerfile
│   ├── src/
│   │   ├── index.js           # Entry point
│   │   ├── appForTests.js     # Express app (no DB auto-connect)
│   │   ├── socket.js          # Socket.IO setup
│   │   ├── seed.js            # Demo data seeder
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Vehicle.js
│   │   │   ├── Driver.js
│   │   │   ├── Trip.js
│   │   │   ├── MaintenanceLog.js
│   │   │   ├── FuelExpense.js
│   │   │   └── AuditLog.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── vehicles.js
│   │   │   ├── drivers.js
│   │   │   ├── trips.js
│   │   │   ├── maintenance.js
│   │   │   ├── expenses.js
│   │   │   ├── analytics.js
│   │   │   └── exports.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── validate.js
│   │   │   └── errorHandler.js
│   │   └── validators/
│   │       └── schemas.js
│   └── tests/
│       └── api.test.js
└── client/
    ├── Dockerfile
    ├── nginx.conf
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── api/
    │   │   ├── axios.js
    │   │   └── endpoints.js
    │   ├── context/
    │   │   └── authStore.js
    │   ├── hooks/
    │   │   ├── useSocket.js
    │   │   └── useFetchPaged.js
    │   ├── components/
    │   │   ├── layout/
    │   │   │   └── Layout.jsx
    │   │   └── ui/
    │   │       ├── KPICard.jsx
    │   │       ├── StatusPill.jsx
    │   │       ├── Modal.jsx
    │   │       ├── ConfirmDialog.jsx
    │   │       ├── Pagination.jsx
    │   │       └── SearchBar.jsx
    │   ├── routes/
    │   │   └── ProtectedRoute.jsx
    │   └── pages/
    │       ├── Login.jsx
    │       ├── ForgotPassword.jsx
    │       ├── Dashboard.jsx
    │       ├── Vehicles.jsx
    │       ├── Drivers.jsx
    │       ├── Trips.jsx
    │       ├── Maintenance.jsx
    │       ├── Expenses.jsx
    │       ├── Analytics.jsx
    │       └── AdminUsers.jsx
```
