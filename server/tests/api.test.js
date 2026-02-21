const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/appForTests');

let managerToken;
let dispatcherToken;
let vehicleId;
let driverId;
let tripId;

beforeAll(async () => {
  // Connect to test DB
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fleetflow_test');

  // Register manager
  const mRes = await request(app).post('/api/auth/register').send({
    name: 'Test Manager',
    email: 'tm@test.com',
    password: 'password123',
    role: 'manager',
  });
  managerToken = mRes.body.tokens?.accessToken || '';

  // Register dispatcher
  const dRes = await request(app).post('/api/auth/register').send({
    name: 'Test Dispatcher',
    email: 'td@test.com',
    password: 'password123',
    role: 'dispatcher',
  });
  dispatcherToken = dRes.body.tokens?.accessToken || '';
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Vehicle API', () => {
  test('POST /api/vehicles — create vehicle', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Test Van',
        model: 'Ford Transit',
        type: 'van',
        licensePlate: 'TEST-001',
        maxLoadKg: 500,
        odometerKm: 10000,
        acquisitionCost: 30000,
      });
    expect(res.status).toBe(201);
    expect(res.body.vehicle.licensePlate).toBe('TEST-001');
    vehicleId = res.body.vehicle._id;
  });

  test('GET /api/vehicles — list vehicles', async () => {
    const res = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.vehicles)).toBe(true);
  });
});

describe('Driver API', () => {
  test('POST /api/drivers — create driver', async () => {
    const licExpiry = new Date();
    licExpiry.setFullYear(licExpiry.getFullYear() + 2);
    const res = await request(app)
      .post('/api/drivers')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Test Driver',
        licenseNumber: 'DL-TEST-001',
        licenseExpiry: licExpiry.toISOString(),
        categories: ['van', 'truck'],
      });
    expect(res.status).toBe(201);
    driverId = res.body.driver._id;
  });
});

describe('Trip Lifecycle', () => {
  test('POST /api/trips — create trip with capacity check', async () => {
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({
        origin: { address: '123 Start Ave', lat: 0, lng: 0 },
        destination: { address: '456 End Ave', lat: 0, lng: 0 },
        cargoWeightKg: 300,
        vehicle: vehicleId,
        driver: driverId,
        revenue: 500,
      });
    expect(res.status).toBe(201);
    tripId = res.body.trip._id;
  });

  test('POST /api/trips — capacity exceeded should fail', async () => {
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({
        origin: { address: '123 Start Ave', lat: 0, lng: 0 },
        destination: { address: '456 End Ave', lat: 0, lng: 0 },
        cargoWeightKg: 9999, // exceeds 500kg
        vehicle: vehicleId,
        driver: driverId,
        revenue: 500,
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/capacity/i);
  });

  test('PATCH /api/trips/:id/dispatch — dispatch trip', async () => {
    const res = await request(app)
      .patch(`/api/trips/${tripId}/dispatch`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.trip.status).toBe('dispatched');
  });

  test('PATCH /api/trips/:id/complete — complete trip', async () => {
    const res = await request(app)
      .patch(`/api/trips/${tripId}/complete`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({ endOdometer: 10200 });
    expect(res.status).toBe(200);
    expect(res.body.trip.status).toBe('completed');
  });
});

describe('Maintenance API', () => {
  test('POST /api/maintenance — sets vehicle to in_shop', async () => {
    // Create a second vehicle that's available
    const vRes = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Maintenance Van',
        model: 'Mercedes Sprinter',
        type: 'van',
        licensePlate: 'MAINT-001',
        maxLoadKg: 600,
        odometerKm: 5000,
        acquisitionCost: 40000,
      });
    const mVehicleId = vRes.body.vehicle._id;

    const res = await request(app)
      .post('/api/maintenance')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        vehicle: mVehicleId,
        type: 'Oil Change',
        provider: 'Quick Lube',
        cost: 150,
        date: new Date().toISOString(),
      });
    expect(res.status).toBe(201);

    // Vehicle should now be in_shop
    const vGetRes = await request(app)
      .get(`/api/vehicles/${mVehicleId}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(vGetRes.body.vehicle.status).toBe('in_shop');
  });
});
