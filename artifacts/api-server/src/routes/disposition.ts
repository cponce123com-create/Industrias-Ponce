import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { finalDispositionTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth.js";
import { generateId } from "../lib/id.js";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler.js";
import { uploadToCloudinary } from "../lib/cloudinary.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

const dispositionSchema = z.object({
  productId: z.string().optional().nullable(),
  productNameManual: z.string().optional(),
  quantity: z.string().min(1),
  unit: z.string().min(1),
  dispositionType: z.string().min(1),
  dispositionDate: z.string().min(1),
  contractor: z.string().optional(),
  manifestNumber: z.string().optional(),
  certificateNumber: z.string().optional(),
  cost: z.preprocess(v => (v === "" || v == null) ? null : v, z.string().nullable().optional()),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  notes: z.string().optional(),
});

router.get("/", requireAuth, asyncHandler(async (_req, res) => {
  const records = await db.select().from(finalDispositionTable).orderBy(desc(finalDispositionTable.dispositionDate));
  res.json(records);
}));

router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const records = await db.select().from(finalDispositionTable).where(eq(finalDispositionTable.id, id as string)).limit(1);
  if (records.length === 0) { res.status(404).json({ error: "Registro no encontrado" }); return; }
  res.json(records[0]);
}));

router.post("/", requireAuth, requireRole("supervisor", "admin", "operator"), asyncHandler(async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const parsed = dispositionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
    return;
  }
  const { productId, productNameManual, ...rest } = parsed.data;
  if (!productId && !productNameManual) {
    res.status(400).json({ error: "Debe seleccionar un producto o ingresar un nombre manualmente" });
    return;
  }
  const id = generateId();
  const [created] = await db.insert(finalDispositionTable).values({
    id,
    productId: productId || null,
    productNameManual: productNameManual || null,
    ...rest,
    registeredBy: authedReq.userId,
  }).returning();
  res.status(201).json(created);
}));

router.put("/:id", requireAuth, requireRole("supervisor", "admin"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authedReq = req as AuthenticatedRequest;
  const parsed = dispositionSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Datos inválidos" }); return; }
  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.status === "completed") { updateData.approvedBy = authedReq.userId; }
  const [updated] = await db.update(finalDispositionTable).set(updateData).where(eq(finalDispositionTable.id, id as string)).returning();
  if (!updated) { res.status(404).json({ error: "Registro no encontrado" }); return; }
  res.json(updated);
}));

router.delete("/:id", requireAuth, requireRole("supervisor", "admin"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [deleted] = await db.delete(finalDispositionTable).where(eq(finalDispositionTable.id, id as string)).returning();
  if (!deleted) { res.status(404).json({ error: "Registro no encontrado" }); return; }
  res.json({ message: "Registro eliminado" });
}));

router.post("/:id/photos", requireAuth, requireRole("supervisor", "admin", "operator"), upload.array("photos", 5), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) { res.status(400).json({ error: "No se enviaron fotos" }); return; }

  const [record] = await db.select({ photos: finalDispositionTable.photos }).from(finalDispositionTable).where(eq(finalDispositionTable.id, id as string)).limit(1);
  if (!record) { res.status(404).json({ error: "Registro no encontrado" }); return; }

  const existing = (record.photos as string[]) ?? [];
  const slots = 5 - existing.length;
  if (slots <= 0) { res.status(400).json({ error: "Ya se alcanzó el límite de 5 fotos" }); return; }

  const toUpload = files.slice(0, slots);
  const uploaded: string[] = [];
  for (const file of toUpload) {
    const result = await uploadToCloudinary(file.buffer, { resource_type: "image", folder: "legado/disposition" });
    uploaded.push(result.secure_url);
  }

  const newPhotos = [...existing, ...uploaded];
  const [updated] = await db.update(finalDispositionTable).set({ photos: newPhotos, updatedAt: new Date() }).where(eq(finalDispositionTable.id, id as string)).returning();
  res.json(updated);
}));

router.delete("/:id/photos/:photoIndex", requireAuth, requireRole("supervisor", "admin"), asyncHandler(async (req, res) => {
  const { id, photoIndex } = req.params;
  const idx = parseInt(photoIndex as string, 10);
  const [record] = await db.select({ photos: finalDispositionTable.photos }).from(finalDispositionTable).where(eq(finalDispositionTable.id, id as string)).limit(1);
  if (!record) { res.status(404).json({ error: "Registro no encontrado" }); return; }

  const photos = [...((record.photos as string[]) ?? [])];
  if (idx < 0 || idx >= photos.length) { res.status(400).json({ error: "Índice de foto inválido" }); return; }
  photos.splice(idx, 1);

  const [updated] = await db.update(finalDispositionTable).set({ photos, updatedAt: new Date() }).where(eq(finalDispositionTable.id, id as string)).returning();
  res.json(updated);
}));

export default router;
