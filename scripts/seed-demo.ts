import { hash } from "bcrypt";
import { db } from "../server/db";
import { users, adminUsers, wallets } from "../shared/schema";

const COST = 12;
const AUTH_PEPPER = process.env.AUTH_PEPPER || "";

async function hashPassword(password: string): Promise<string> {
  const saltedPassword = password + AUTH_PEPPER;
  return await hash(saltedPassword, COST);
}

async function seedDemo() {
  // Check if we're in production and ALLOW_PROD_SEED is not set
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
    console.log("❌ Seeding blocked in production. Set ALLOW_PROD_SEED=1 to override.");
    process.exit(1);
  }

  console.log("🌱 Starting demo seed...");

  try {
    // Demo Customer
    const customerEmail = "demo.customer@easyloyalty.dev";
    const customerPassword = "Demo1234!";
    
    // Check if customer already exists
    const existingCustomer = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, customerEmail)
    });

    let customerId: string;
    
    if (existingCustomer) {
      console.log(`✓ Demo customer already exists: ${customerEmail}`);
      customerId = existingCustomer.id;
    } else {
      const customerPasswordHash = await hashPassword(customerPassword);
      const [newCustomer] = await db.insert(users).values({
        email: customerEmail,
        name: "Demo Customer",
        passwordHash: customerPasswordHash,
        status: "active"
      }).returning();
      
      customerId = newCustomer.id;
      console.log(`✓ Created demo customer: ${customerEmail}`);
    }

    // Create or update customer wallet
    const existingWallet = await db.query.wallets.findFirst({
      where: (wallets, { eq }) => eq(wallets.userId, customerId)
    });

    if (!existingWallet) {
      await db.insert(wallets).values({
        userId: customerId,
        balanceCents: 0,
        bonusGrantedTotalCents: 0
      });
      console.log("✓ Created demo customer wallet");
    }

    // Demo Café Admin
    const adminEmail = "demo.cafe@easyloyalty.dev";
    const adminPassword = "DemoAdmin1234!";
    
    // Check if admin already exists
    const existingAdmin = await db.query.adminUsers.findFirst({
      where: (adminUsers, { eq }) => eq(adminUsers.email, adminEmail)
    });

    if (existingAdmin) {
      console.log(`✓ Demo café admin already exists: ${adminEmail}`);
    } else {
      const adminPasswordHash = await hashPassword(adminPassword);
      await db.insert(adminUsers).values({
        email: adminEmail,
        name: "Demo Café Manager",
        passwordHash: adminPasswordHash,
        role: "manager",
        status: "active"
      });
      console.log(`✓ Created demo café admin: ${adminEmail}`);
    }

    console.log("\n🎉 Demo seed completed successfully!");
    console.log("\n📋 Demo Credentials:");
    console.log("┌─────────────────────────────────────────────────────────┐");
    console.log("│                     CUSTOMER                            │");
    console.log("├─────────────────────────────────────────────────────────┤");
    console.log(`│ Email:    ${customerEmail.padEnd(35)} │`);
    console.log(`│ Password: ${customerPassword.padEnd(35)} │`);
    console.log("├─────────────────────────────────────────────────────────┤");
    console.log("│                   CAFÉ ADMIN                            │");
    console.log("├─────────────────────────────────────────────────────────┤");
    console.log(`│ Email:    ${adminEmail.padEnd(35)} │`);
    console.log(`│ Password: ${adminPassword.padEnd(35)} │`);
    console.log("└─────────────────────────────────────────────────────────┘");
    console.log("\n🚀 You can now start the application and use these credentials to test the system.");

  } catch (error) {
    console.error("❌ Error seeding demo data:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDemo().then(() => {
    process.exit(0);
  });
}

export default seedDemo;
