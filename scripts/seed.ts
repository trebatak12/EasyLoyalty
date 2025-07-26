#!/usr/bin/env tsx

import { db } from "../server/db";
import { users, adminUsers, wallets } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const PEPPER = process.env.AUTH_PEPPER || "default-pepper-change-in-production";

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password + PEPPER, salt);
}

async function seedDatabase() {
  console.log("🌱 Seeding database...");

  try {
    // Create test admin user
    const adminEmail = "admin@cafe.com";
    const adminPassword = "admin123";
    
    const existingAdmin = await db.select().from(adminUsers).where(eq(adminUsers.email, adminEmail));
    
    if (existingAdmin.length === 0) {
      const adminPasswordHash = await hashPassword(adminPassword);
      
      const [admin] = await db.insert(adminUsers).values({
        email: adminEmail,
        name: "Café Manager",
        passwordHash: adminPasswordHash,
        role: "manager"
      }).returning();
      
      console.log(`✅ Created admin user: ${adminEmail} / ${adminPassword}`);
    } else {
      console.log(`⚠️ Admin user already exists: ${adminEmail}`);
    }

    // Create test customer user
    const customerEmail = "customer@test.com";
    const customerPassword = "customer123";
    
    const existingCustomer = await db.select().from(users).where(eq(users.email, customerEmail));
    
    if (existingCustomer.length === 0) {
      const customerPasswordHash = await hashPassword(customerPassword);
      
      const [customer] = await db.insert(users).values({
        email: customerEmail,
        name: "Test Customer",
        passwordHash: customerPasswordHash
      }).returning();
      
      // Create wallet for customer
      await db.insert(wallets).values({
        userId: customer.id,
        balanceCents: 5000, // 50 CZK starting balance
        bonusGrantedTotalCents: 0
      });
      
      console.log(`✅ Created customer user: ${customerEmail} / ${customerPassword}`);
      console.log(`✅ Created wallet with 50 CZK starting balance`);
    } else {
      console.log(`⚠️ Customer user already exists: ${customerEmail}`);
    }

    console.log("\n🎉 Database seeded successfully!");
    console.log("\n📋 Login Credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("👨‍💼 ADMIN (Café Staff):");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log("");
    console.log("👤 CUSTOMER:");
    console.log(`   Email: ${customerEmail}`);
    console.log(`   Password: ${customerPassword}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => process.exit(0));
}

export { seedDatabase };