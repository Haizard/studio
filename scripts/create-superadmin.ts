
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';
import SuperAdminUserModel, { ISuperAdminUser } from '../src/models/SuperAdmin/SuperAdminUser';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPERADMIN_MONGO_URI = process.env.SUPERADMIN_MONGO_URI;

if (!SUPERADMIN_MONGO_URI || SUPERADMIN_MONGO_URI === 'your-superadmin-mongodb-uri-here') {
  console.error('*******************************************************************');
  console.error('ERROR: SUPERADMIN_MONGO_URI is not defined in your .env file.');
  console.error('Please update the .env file with your database connection string.');
  console.error('*******************************************************************');
  process.exit(1);
}

const createSuperAdmin = async () => {
  try {
    console.log('Connecting to SuperAdmin database...');
    await mongoose.connect(SUPERADMIN_MONGO_URI);
    console.log('Successfully connected to SuperAdmin database.');

    const email = 'superadmin@example.com';
    const password = 'changeme';
    const name = 'Super Administrator';

    // Check if user already exists
    const existingUser = await SuperAdminUserModel.findOne({ email });
    if (existingUser) {
      console.log(`SuperAdmin user with email ${email} already exists.`);
      mongoose.connection.close();
      return;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the new user
    const newUser = new SuperAdminUserModel({
      email,
      passwordHash,
      name,
      role: 'superadmin',
      isActive: true,
    });

    await newUser.save();

    console.log('================================================================');
    console.log('✅ SuperAdmin user created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('   IMPORTANT: Please log in and change this password immediately.');
    console.log('================================================================');

  } catch (error) {
    console.error('❌ Error creating SuperAdmin user:', error);
  } finally {
    // Ensure the connection is closed
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

createSuperAdmin();
