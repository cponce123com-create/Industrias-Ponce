import { db } from "./index";
import {
  usersTable,
  productsTable,
  inventoryRecordsTable,
  immobilizedProductsTable,
  samplesTable,
  dyeLotsTable,
  finalDispositionTable,
  personnelTable,
  eppMasterTable,
} from "./schema";
import { randomBytes } from "crypto";
import { hashPassword } from "./auth.js";

function generateId(): string {
  return randomBytes(12).toString("hex");
}

function getDemoPassword(): string {
  if (process.env.DEMO_PASSWORD) return process.env.DEMO_PASSWORD;
  return randomBytes(16).toString("base64url");
}

// ── Demo users — credentials come from env vars, never hardcoded strings ───────
const DEMO_PASSWORD = getDemoPassword();

const demoUsers = [
  { email: process.env.DEMO_SUPERVISOR_EMAIL ?? "supervisor@almacen.com", name: "Carlos Mendoza", role: "supervisor" as const, password: DEMO_PASSWORD },
  { email: process.env.DEMO_OPERATOR_EMAIL ?? "operario@almacen.com", name: "María Quispe", role: "operator" as const, password: DEMO_PASSWORD },
  { email: process.env.DEMO_QUALITY_EMAIL ?? "calidad@almacen.com", name: "Luis Torres", role: "quality" as const, password: DEMO_PASSWORD },
  { email: process.env.DEMO_ADMIN_EMAIL ?? "admin@almacen.com", name: "Ana García", role: "admin" as const, password: DEMO_PASSWORD },
  { email: process.env.DEMO_READONLY_EMAIL ?? "consulta@almacen.com", name: "Pedro Vargas", role: "readonly" as const, password: DEMO_PASSWORD },
];

const demoPersonnel = [
  { employeeId: "EMP-001", name: "Roberto Silva", position: "Operario de Almacén", department: "Almacén", email: "r.silva@almacen.com", hireDate: "2022-03-15" },
  { employeeId: "EMP-002", name: "Carmen López", position: "Técnica de Calidad", department: "Control de Calidad", email: "c.lopez@almacen.com", hireDate: "2021-07-01" },
  { employeeId: "EMP-003", name: "Jorge Ramírez", position: "Supervisor", department: "Almacén", email: "j.ramirez@almacen.com", hireDate: "2020-01-15" },
  { employeeId: "EMP-004", name: "Sandra Flores", position: "Asistente Administrativa", department: "Administración", email: "s.flores@almacen.com", hireDate: "2023-02-01" },
];

const demoEpp = [
  { code: "EPP-001", name: "Casco de Seguridad", category: "Protección de cabeza", standardReference: "ANSI Z89.1", replacementPeriodDays: 1825 },
  { code: "EPP-002", name: "Guantes de Nitrilo", category: "Protección de manos", standardReference: "EN 374", replacementPeriodDays: 30 },
  { code: "EPP-003", name: "Lentes de Seguridad", category: "Protección visual", standardReference: "ANSI Z87.1", replacementPeriodDays: 365 },
  { code: "EPP-004", name: "Respirador con Filtro Químico", category: "Protección respiratoria", standardReference: "NIOSH 42 CFR 84", replacementPeriodDays: 90 },
  { code: "EPP-005", name: "Bata de Laboratorio", category: "Protección corporal", standardReference: "EN 13034", replacementPeriodDays: 365 },
  { code: "EPP-006", name: "Botas Industriales", category: "Protección de pies", standardReference: "ASTM F2413", replacementPeriodDays: 730 },
];

export async function seed() {
  console.log("🌱 Starting seed...");

  console.log("👤 Seeding users...");
  const userIds: Record<string, string> = {};
  for (const user of demoUsers) {
    const id = generateId();
    const passwordHash = await hashPassword(user.password);
    await db.insert(usersTable).values({
      id,
      email: user.email,
      name: user.name,
      role: user.role,
      passwordHash,
      status: "active",
    }).onConflictDoNothing();
    userIds[user.email] = id;
    console.log(`  ✓ User: ${user.email} (${user.role})`);
  }

  const supervisorId = userIds["supervisor@almacen.com"] ?? generateId();
  const operatorId = userIds["operario@almacen.com"] ?? generateId();
  const qualityId = userIds["calidad@almacen.com"] ?? generateId();

  console.log("🧪 Seeding products...");
  const productIds: Record<string, string> = {};
  for (const product of chemicalProducts) {
    const id = generateId();
    await db.insert(productsTable).values({
      id,
      ...product,
      maximumStock: String(parseFloat(product.minimumStock) * 5),
      status: "active",
    }).onConflictDoNothing();
    productIds[product.code] = id;
    console.log(`  ✓ Product: ${product.code} - ${product.name}`);
  }

  const productIdList = Object.values(productIds);

  console.log("📊 Seeding inventory records...");
  const today = new Date();
  const inventorySamples = [
    { productCode: "PROD-001", prev: "200", inputs: "100", outputs: "80" },
    { productCode: "PROD-002", prev: "500", inputs: "200", outputs: "150" },
    { productCode: "PROD-003", prev: "120", inputs: "50", outputs: "40" },
    { productCode: "PROD-004", prev: "250", inputs: "100", outputs: "60" },
    { productCode: "PROD-005", prev: "180", inputs: "80", outputs: "70" },
  ];
  for (const inv of inventorySamples) {
    const pId = productIds[inv.productCode];
    if (!pId) continue;
    const finalBal = String(parseFloat(inv.prev) + parseFloat(inv.inputs) - parseFloat(inv.outputs));
    await db.insert(inventoryRecordsTable).values({
      id: generateId(),
      productId: pId,
      recordDate: today.toISOString().split("T")[0],
      previousBalance: inv.prev,
      inputs: inv.inputs,
      outputs: inv.outputs,
      finalBalance: finalBal,
      registeredBy: operatorId,
      notes: "Registro inicial de inventario",
    }).onConflictDoNothing();
  }
  console.log(`  ✓ ${inventorySamples.length} inventory records seeded`);

  console.log("🚫 Seeding immobilized products...");
  const immobilizedData = [
    { productCode: "PROD-006", qty: "15", reason: "Contaminación por humedad" },
    { productCode: "PROD-011", qty: "10", reason: "Certificado de calidad vencido" },
  ];
  for (const item of immobilizedData) {
    const pId = productIds[item.productCode];
    if (!pId) continue;
    await db.insert(immobilizedProductsTable).values({
      id: generateId(),
      productId: pId,
      quantity: item.qty,
      reason: item.reason,
      immobilizedDate: today.toISOString().split("T")[0],
      status: "immobilized",
      registeredBy: supervisorId,
    }).onConflictDoNothing();
  }
  console.log(`  ✓ ${immobilizedData.length} immobilized products seeded`);

  console.log("🔬 Seeding samples...");
  const samplesData = [
    { productCode: "PROD-001", code: "MUEST-001", qty: "0.5", purpose: "Control de calidad rutinario", destination: "Lab. Externo ABC" },
    { productCode: "PROD-005", code: "MUEST-002", qty: "0.3", purpose: "Verificación de concentración", destination: "Lab. Interno" },
    { productCode: "PROD-007", code: "MUEST-003", qty: "1.0", purpose: "Análisis de estabilidad", destination: "Lab. Externo XYZ" },
  ];
  for (const s of samplesData) {
    const pId = productIds[s.productCode];
    if (!pId) continue;
    await db.insert(samplesTable).values({
      id: generateId(),
      productId: pId,
      sampleCode: s.code,
      quantity: s.qty,
      unit: "L",
      sampleDate: today.toISOString().split("T")[0],
      purpose: s.purpose,
      destination: s.destination,
      status: "pending",
      takenBy: qualityId,
    }).onConflictDoNothing();
  }
  console.log(`  ✓ ${samplesData.length} samples seeded`);

  console.log("🎨 Seeding dye lots...");
  const dyeLotsData = [
    { productCode: "PROD-001", lot: "LOT-2024-001", qty: "200", supplier: "QuimPeru SAC", cert: "CERT-QP-001" },
    { productCode: "PROD-002", lot: "LOT-2024-002", qty: "500", supplier: "QuimPeru SAC", cert: "CERT-QP-002" },
    { productCode: "PROD-010", lot: "LOT-2024-003", qty: "50", supplier: "ReacLab SRL", cert: "CERT-RL-001" },
  ];
  for (const dl of dyeLotsData) {
    const pId = productIds[dl.productCode];
    if (!pId) continue;
    const expDate = new Date(today);
    expDate.setFullYear(expDate.getFullYear() + 2);
    await db.insert(dyeLotsTable).values({
      id: generateId(),
      productId: pId,
      lotNumber: dl.lot,
      quantity: dl.qty,
      expirationDate: expDate.toISOString().split("T")[0],
      receiptDate: today.toISOString().split("T")[0],
      supplier: dl.supplier,
      certificateNumber: dl.cert,
      qualityStatus: "approved",
      approvedBy: qualityId,
      approvedAt: new Date(),
      registeredBy: operatorId,
    }).onConflictDoNothing();
  }
  console.log(`  ✓ ${dyeLotsData.length} dye lots seeded`);

  console.log("♻️ Seeding final dispositions...");
  const dispositionData = [
    { productCode: "PROD-008", qty: "5", type: "Incineración", contractor: "EcoTreat SAC", manifest: "MAN-2024-001" },
    { productCode: "PROD-014", qty: "8", type: "Reciclaje", contractor: "ChemRecycle Perú", manifest: "MAN-2024-002" },
  ];
  for (const d of dispositionData) {
    const pId = productIds[d.productCode];
    if (!pId) continue;
    await db.insert(finalDispositionTable).values({
      id: generateId(),
      productId: pId,
      quantity: d.qty,
      unit: "L",
      dispositionType: d.type,
      dispositionDate: today.toISOString().split("T")[0],
      contractor: d.contractor,
      manifestNumber: d.manifest,
      status: "completed",
      approvedBy: supervisorId,
      registeredBy: operatorId,
    }).onConflictDoNothing();
  }
  console.log(`  ✓ ${dispositionData.length} final dispositions seeded`);

  console.log("👷 Seeding personnel...");
  const personnelIds: Record<string, string> = {};
  for (const p of demoPersonnel) {
    const id = generateId();
    await db.insert(personnelTable).values({
      id,
      ...p,
      status: "active",
    }).onConflictDoNothing();
    personnelIds[p.employeeId] = id;
    console.log(`  ✓ Personnel: ${p.employeeId} - ${p.name}`);
  }

  console.log("🦺 Seeding EPP catalog...");
  for (const epp of demoEpp) {
    await db.insert(eppMasterTable).values({
      id: generateId(),
      ...epp,
      status: "active",
    }).onConflictDoNothing();
    console.log(`  ✓ EPP: ${epp.code} - ${epp.name}`);
  }

  console.log("✅ Seed complete!");
  if (process.env.DEMO_PASSWORD) {
    console.log("\n📋 Demo credentials loaded from DEMO_PASSWORD env var.");
  } else {
    console.log(`\n📋 Demo password (auto-generated): ${DEMO_PASSWORD}`);
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
