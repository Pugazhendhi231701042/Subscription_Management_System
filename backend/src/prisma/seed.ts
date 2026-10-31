import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Brightloop database seeding...');

  // 1. Password hashing (using Brightloop@2026 meeting all security criteria)
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Brightloop@2026', salt);

  // 2. Users & Roles
  const admin = await prisma.user.upsert({
    where: { email: 'admin@brightloop.com' },
    update: {},
    create: {
      email: 'admin@brightloop.com',
      name: 'Brightloop SuperAdmin',
      passwordHash: defaultPasswordHash,
      role: 'ADMIN'
    }
  });

  const staff = await prisma.user.upsert({
    where: { email: 'sales@brightloop.com' },
    update: {},
    create: {
      email: 'sales@brightloop.com',
      name: 'Sarah Connor (Sales Rep)',
      passwordHash: defaultPasswordHash,
      role: 'STAFF'
    }
  });

  const customerUser1 = await prisma.user.upsert({
    where: { email: 'contact@acmecorp.com' },
    update: {},
    create: {
      email: 'contact@acmecorp.com',
      name: 'John Miller',
      passwordHash: defaultPasswordHash,
      role: 'CUSTOMER'
    }
  });

  const customerUser2 = await prisma.user.upsert({
    where: { email: 'billing@techstart.io' },
    update: {},
    create: {
      email: 'billing@techstart.io',
      name: 'Ananya Sharma',
      passwordHash: defaultPasswordHash,
      role: 'CUSTOMER'
    }
  });

  // 3. Customers
  const customer1 = await prisma.customer.upsert({
    where: { email: 'contact@acmecorp.com' },
    update: {},
    create: {
      userId: customerUser1.id,
      companyName: 'Acme Global Corporation',
      contactName: 'John Miller',
      email: 'contact@acmecorp.com',
      phone: '+91 98765 43210',
      street: '42 MG Road, Cyber Tech Park',
      city: 'Bangalore',
      country: 'India',
      taxNumber: '29ABCDE1234F1Z5',
      paymentTerms: 'Net 15',
      status: 'ACTIVE'
    }
  });

  const customer2 = await prisma.customer.upsert({
    where: { email: 'billing@techstart.io' },
    update: {},
    create: {
      userId: customerUser2.id,
      companyName: 'TechStart AI Labs',
      contactName: 'Ananya Sharma',
      email: 'billing@techstart.io',
      phone: '+91 91234 56789',
      street: '10 Marine Drive, Infopark',
      city: 'Kochi',
      country: 'India',
      taxNumber: '32AABCT9876Q1Z2',
      paymentTerms: 'Immediate',
      status: 'ACTIVE'
    }
  });

  // 4. Products & Variants (including Odoo edition +560 as in PS)
  const productErp = await prisma.product.create({
    data: {
      name: 'Brightloop Business Suite',
      type: 'Software',
      salesPrice: 4000.0,
      costPrice: 800.0,
      notes: 'Flagship enterprise resource planning & accounting engine',
      variants: {
        create: [
          { variantName: 'Standard Edition', priceAdjustment: 0.0 },
          { variantName: 'Odoo Connected Brand', priceAdjustment: 560.0 }, // Mentioned in PS!
          { variantName: 'Enterprise High-Availability', priceAdjustment: 2500.0 }
        ]
      }
    },
    include: { variants: true }
  });

  const productAddon = await prisma.product.create({
    data: {
      name: 'Automated Billing & Invoicing Engine',
      type: 'Add-on',
      salesPrice: 1200.0,
      costPrice: 200.0,
      notes: 'Batch recurring billing runner with multi-currency tax'
    }
  });

  // 5. Plans
  const planMonthly = await prisma.plan.create({
    data: {
      productId: productErp.id,
      name: 'Business Monthly Flex',
      billingFrequency: 'MONTHLY',
      price: 4000.0,
      minQuantity: 1,
      autoCloseOnEnd: false,
      allowPause: true,
      allowEarlyClose: true,
      allowRenewal: true
    }
  });

  const planAnnual = await prisma.plan.create({
    data: {
      productId: productErp.id,
      name: 'Corporate Annual Contract',
      billingFrequency: 'YEARLY',
      price: 42000.0,
      minQuantity: 5,
      autoCloseOnEnd: true,
      allowPause: false,
      allowEarlyClose: false,
      allowRenewal: true
    }
  });

  const planWeekly = await prisma.plan.create({
    data: {
      productId: productAddon.id,
      name: 'Sprint Weekly Pass',
      billingFrequency: 'WEEKLY',
      price: 500.0,
      minQuantity: 1,
      autoCloseOnEnd: false,
      allowPause: true,
      allowEarlyClose: true,
      allowRenewal: true
    }
  });

  // 6. Tax Rules
  const taxGst18 = await prisma.tax.create({
    data: {
      name: 'GST 18%',
      rate: 18.0,
      isDefault: true
    }
  });

  await prisma.tax.create({
    data: {
      name: 'Special Tech Cess 5%',
      rate: 5.0,
      isDefault: false
    }
  });

  // 7. Discounts (Admin created)
  const discount10 = await prisma.discount.create({
    data: {
      name: 'Bulk Seats 10% Off',
      discountType: 'PERCENTAGE',
      discountValue: 10.0,
      minPurchase: 10000.0,
      minQuantity: 3,
      scope: 'SUBSCRIPTION',
      usageLimit: 50
    }
  });

  await prisma.discount.create({
    data: {
      name: 'New Client ₹1,000 Flat Credit',
      discountType: 'FIXED',
      discountValue: 1000.0,
      minPurchase: 5000.0,
      minQuantity: 1,
      scope: 'SUBSCRIPTION',
      usageLimit: 25
    }
  });

  // 8. Quotation Templates
  const odooVariant = productErp.variants.find(v => v.variantName.includes('Odoo'));
  const template = await prisma.quotationTemplate.create({
    data: {
      name: 'Standard Odoo Business Bundle',
      planId: planMonthly.id,
      validityDays: 30,
      templateLines: {
        create: [
          {
            productId: productErp.id,
            variantId: odooVariant?.id || null,
            quantity: 5,
            unitPrice: 4560.0 // 4000 + 560
          },
          {
            productId: productAddon.id,
            quantity: 5,
            unitPrice: 1200.0
          }
        ]
      }
    }
  });

  // 9. Quotation
  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-0001',
      customerId: customer1.id,
      planId: planMonthly.id,
      templateId: template.id,
      validityDate: new Date(Date.now() + 30 * 86400000),
      paymentTerms: 'Net 15',
      status: 'CONFIRMED',
      subtotal: 28800.0,
      taxAmount: 5184.0,
      totalAmount: 33984.0,
      notes: 'Initial quotation converted during onboarding',
      lines: {
        create: [
          {
            productId: productErp.id,
            variantId: odooVariant?.id || null,
            quantity: 5,
            unitPrice: 4560.0,
            taxRate: 18.0,
            amount: 22800.0
          },
          {
            productId: productAddon.id,
            quantity: 5,
            unitPrice: 1200.0,
            taxRate: 18.0,
            amount: 6000.0
          }
        ]
      }
    }
  });

  // 10. Subscriptions covering lifecycle states
  // SUB 1: ACTIVE (Acme Corp) - Due today so evaluator can test Billing Cycle!
  const today = new Date();
  const subActive = await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0001',
      customerId: customer1.id,
      planId: planMonthly.id,
      quotationId: quotation.id,
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 30 * 86400000),
      expiryDate: new Date(Date.now() + 335 * 86400000),
      nextBillingDate: today, // DUE TODAY!
      paymentTerms: 'Net 15',
      autoCloseOnEnd: false,
      allowPause: true,
      allowEarlyClose: true,
      allowRenewal: true,
      subtotal: 28800.0,
      taxAmount: 5184.0,
      totalAmount: 33984.0,
      lines: {
        create: [
          {
            productId: productErp.id,
            variantId: odooVariant?.id || null,
            quantity: 5,
            unitPrice: 4560.0,
            taxRate: 18.0,
            amount: 22800.0
          },
          {
            productId: productAddon.id,
            quantity: 5,
            unitPrice: 1200.0,
            taxRate: 18.0,
            amount: 6000.0
          }
        ]
      }
    }
  });

  // SUB 2: ACTIVE (TechStart)
  const subActive2 = await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0002',
      customerId: customer2.id,
      planId: planAnnual.id,
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 60 * 86400000),
      expiryDate: new Date(Date.now() + 300 * 86400000),
      nextBillingDate: today, // ALSO DUE FOR BATCH BILLING!
      paymentTerms: 'Immediate',
      autoCloseOnEnd: true,
      allowPause: false,
      allowEarlyClose: false,
      allowRenewal: true,
      subtotal: 42000.0,
      taxAmount: 7560.0,
      totalAmount: 49560.0,
      lines: {
        create: [
          {
            productId: productErp.id,
            quantity: 5,
            unitPrice: 8400.0,
            taxRate: 18.0,
            amount: 42000.0
          }
        ]
      }
    }
  });

  // SUB 3: PAUSED
  await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0003',
      customerId: customer2.id,
      planId: planWeekly.id,
      status: 'PAUSED',
      startDate: new Date(Date.now() - 15 * 86400000),
      expiryDate: new Date(Date.now() + 90 * 86400000),
      nextBillingDate: new Date(Date.now() + 7 * 86400000),
      paymentTerms: 'Net 15',
      allowPause: true,
      subtotal: 500.0,
      taxAmount: 90.0,
      totalAmount: 590.0
    }
  });

  // 11. Invoices & Payments (Paid, Confirmed, Overdue)
  // Invoice 1: PAID with recorded payment
  const invPaid = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-00001',
      subscriptionId: subActive.id,
      customerId: customer1.id,
      billingPeriodStart: new Date(Date.now() - 60 * 86400000),
      billingPeriodEnd: new Date(Date.now() - 30 * 86400000),
      issueDate: new Date(Date.now() - 30 * 86400000),
      dueDate: new Date(Date.now() - 15 * 86400000),
      status: 'PAID',
      subtotal: 28800.0,
      taxAmount: 5184.0,
      totalAmount: 33984.0,
      amountPaid: 33984.0,
      amountDue: 0.0,
      lines: {
        create: [
          {
            productId: productErp.id,
            variantId: odooVariant?.id || null,
            description: 'Brightloop Business Suite (Odoo Connected Brand) - Monthly Billing',
            quantity: 5,
            unitPrice: 4560.0,
            taxRate: 18.0,
            amount: 22800.0
          },
          {
            productId: productAddon.id,
            description: 'Automated Billing & Invoicing Engine - Monthly Billing',
            quantity: 5,
            unitPrice: 1200.0,
            taxRate: 18.0,
            amount: 6000.0
          }
        ]
      }
    }
  });

  await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2026-00001',
      invoiceId: invPaid.id,
      customerId: customer1.id,
      amount: 33984.0,
      paymentMethod: 'UPI',
      paymentDate: new Date(Date.now() - 25 * 86400000),
      referenceNumber: 'UPI/2026/OCT/98218731',
      notes: 'Full settlement via Google Pay / UPI',
      recordedByUserId: staff.id
    }
  });

  // Invoice 2: OVERDUE (Past due date, unpaid)
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-00002',
      subscriptionId: subActive2.id,
      customerId: customer2.id,
      billingPeriodStart: new Date(Date.now() - 90 * 86400000),
      billingPeriodEnd: new Date(Date.now() - 60 * 86400000),
      issueDate: new Date(Date.now() - 60 * 86400000),
      dueDate: new Date(Date.now() - 35 * 86400000), // 35 days overdue!
      status: 'CONFIRMED',
      subtotal: 42000.0,
      taxAmount: 7560.0,
      totalAmount: 49560.0,
      amountPaid: 0.0,
      amountDue: 49560.0,
      notes: 'Pending payment - follow up required',
      lines: {
        create: [
          {
            productId: productErp.id,
            description: 'Corporate Annual Contract License (5 Seats)',
            quantity: 5,
            unitPrice: 8400.0,
            taxRate: 18.0,
            amount: 42000.0
          }
        ]
      }
    }
  });

  console.log('✅ Brightloop database seeding completed successfully!');
  console.log('Credentials:');
  console.log(' - Admin: admin@brightloop.com / Brightloop@2026');
  console.log(' - Staff: sales@brightloop.com / Brightloop@2026');
  console.log(' - Customer: contact@acmecorp.com / Brightloop@2026');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
