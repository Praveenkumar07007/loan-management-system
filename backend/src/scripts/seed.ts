import mongoose from 'mongoose';
import { config } from '../config/env';
import { connectDatabase, disconnectDatabase } from '../config/database';
import User, { UserRole } from '../models/User';

interface SeedUser {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

const getSeedUsers = (): SeedUser[] => {
  return [
    {
      fullName: 'Admin User',
      email: process.env.SEED_ADMIN_EMAIL || 'admin@lms.dev',
      password: process.env.SEED_ADMIN_PASSWORD || 'AdminPass123',
      role: UserRole.Admin,
    },
    {
      fullName: 'Sales User',
      email: process.env.SEED_SALES_EMAIL || 'sales@lms.dev',
      password: process.env.SEED_SALES_PASSWORD || 'SalesPass123',
      role: UserRole.Sales,
    },
    {
      fullName: 'Sanction User',
      email: process.env.SEED_SANCTION_EMAIL || 'sanction@lms.dev',
      password: process.env.SEED_SANCTION_PASSWORD || 'SanctionPass123',
      role: UserRole.Sanction,
    },
    {
      fullName: 'Disbursement User',
      email: process.env.SEED_DISBURSEMENT_EMAIL || 'disbursement@lms.dev',
      password: process.env.SEED_DISBURSEMENT_PASSWORD || 'DisbursementPass123',
      role: UserRole.Disbursement,
    },
    {
      fullName: 'Collection User',
      email: process.env.SEED_COLLECTION_EMAIL || 'collection@lms.dev',
      password: process.env.SEED_COLLECTION_PASSWORD || 'CollectionPass123',
      role: UserRole.Collection,
    },
    {
      fullName: 'Borrower User',
      email: process.env.SEED_BORROWER_EMAIL || 'borrower@lms.dev',
      password: process.env.SEED_BORROWER_PASSWORD || 'BorrowerPass123',
      role: UserRole.Borrower,
    },
  ];
};

const seedDatabase = async (): Promise<void> => {
  console.log('Starting database seed...');

  const seedUsers = getSeedUsers();
  let createdCount = 0;
  let skippedCount = 0;

  for (const seedUser of seedUsers) {
    const existingUser = await User.findOne({ email: seedUser.email });

    if (existingUser) {
      console.log(`User already exists: ${seedUser.email} (${seedUser.role})`);
      skippedCount++;
    } else {
      await User.create(seedUser);
      console.log(`Created user: ${seedUser.email} (${seedUser.role})`);
      createdCount++;
    }
  }

  console.log(`\nSeed complete. Created: ${createdCount}, Skipped: ${skippedCount}`);
};

const runSeed = async (): Promise<void> => {
  try {
    await connectDatabase();
    await seedDatabase();
  } catch (error) {
    console.error('Seed failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
};

runSeed();
