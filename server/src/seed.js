require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Vehicle = require('./models/Vehicle');
const Driver = require('./models/Driver');
const Trip = require('./models/Trip');

/**
 * Seed script — creates demo data for hackathon
 * Run: npm run seed
 */
async function seed() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fleetflow';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Vehicle.deleteMany({}),
      Driver.deleteMany({}),
      Trip.deleteMany({}),
    ]);
    console.log('Cleared existing data.');

    // ── Users ──
    const passwordHash = await bcrypt.hash('password123', 12);
    const users = await User.insertMany([
      { name: 'Admin Manager', email: 'manager@fleetflow.com', passwordHash, role: 'manager' },
      { name: 'Jane Dispatcher', email: 'dispatcher@fleetflow.com', passwordHash, role: 'dispatcher' },
      { name: 'Bob Safety', email: 'safety@fleetflow.com', passwordHash, role: 'safety' },
      { name: 'Carol Finance', email: 'finance@fleetflow.com', passwordHash, role: 'finance' },
    ]);
    console.log(`Created ${users.length} users.`);

    // ── Vehicles ──
    const vehicles = await Vehicle.insertMany([
      {
        name: 'Van-05',
        model: 'Ford Transit 2024',
        type: 'van',
        licensePlate: 'FL-VAN-05',
        maxLoadKg: 500,
        odometerKm: 20000,
        status: 'available',
        acquisitionCost: 35000,
        currentLocation: { lat: 40.7128, lng: -74.006 },
      },
      {
        name: 'Truck-01',
        model: 'Volvo FH16',
        type: 'truck',
        licensePlate: 'FL-TRK-01',
        maxLoadKg: 5000,
        odometerKm: 85000,
        status: 'available',
        acquisitionCost: 120000,
        currentLocation: { lat: 40.7589, lng: -73.9851 },
      },
      {
        name: 'Bike-02',
        model: 'Honda CB500X',
        type: 'bike',
        licensePlate: 'FL-BKE-02',
        maxLoadKg: 50,
        odometerKm: 5000,
        status: 'available',
        acquisitionCost: 8000,
        currentLocation: { lat: 40.7484, lng: -73.9857 },
      },
      {
        name: 'Van-12',
        model: 'Mercedes Sprinter',
        type: 'van',
        licensePlate: 'FL-VAN-12',
        maxLoadKg: 800,
        odometerKm: 42000,
        status: 'available',
        acquisitionCost: 45000,
        currentLocation: { lat: 40.7061, lng: -74.0087 },
      },
      {
        name: 'Truck-03',
        model: 'MAN TGX',
        type: 'truck',
        licensePlate: 'FL-TRK-03',
        maxLoadKg: 8000,
        odometerKm: 120000,
        status: 'in_shop',
        acquisitionCost: 150000,
        currentLocation: { lat: 40.7282, lng: -73.7949 },
      },
    ]);
    console.log(`Created ${vehicles.length} vehicles.`);

    // ── Drivers ──
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);

    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 30);

    const drivers = await Driver.insertMany([
      {
        name: 'Alex Johnson',
        licenseNumber: 'DL-AJ-001',
        licenseExpiry: futureDate,
        categories: ['van', 'car'],
        status: 'off_duty',
      },
      {
        name: 'Priya Sharma',
        licenseNumber: 'DL-PS-002',
        licenseExpiry: soonDate,
        categories: ['truck', 'van'],
        status: 'off_duty',
      },
      {
        name: 'Mike Chen',
        licenseNumber: 'DL-MC-003',
        licenseExpiry: futureDate,
        categories: ['bike', 'van'],
        status: 'off_duty',
      },
      {
        name: 'Sarah Williams',
        licenseNumber: 'DL-SW-004',
        licenseExpiry: futureDate,
        categories: ['truck', 'van', 'car'],
        status: 'off_duty',
      },
    ]);
    console.log(`Created ${drivers.length} drivers.`);

    console.log('\n✅ Seed completed successfully!');
    console.log('\nLogin credentials:');
    console.log('  Manager:    manager@fleetflow.com / password123');
    console.log('  Dispatcher: dispatcher@fleetflow.com / password123');
    console.log('  Safety:     safety@fleetflow.com / password123');
    console.log('  Finance:    finance@fleetflow.com / password123');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
