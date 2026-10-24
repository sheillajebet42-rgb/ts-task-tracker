import { Router } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { STATUSES, Task } from "../models/Task";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
});
const updateSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000),
    status: z.enum(STATUSES),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "no fields to update");

export const taskRouter = Router();
taskRouter.use(requireAuth);

// Members only ever see their own tasks; admins see everyone's.
const scope = (req: Express.Request) => (req.user!.role === "admin" ? {} : { owner: req.user!.sub });

taskRouter.get("/", async (req, res) => {
  const filter: Record<string, unknown> = { ...scope(req) };
  if (typeof req.query.status === "string") {
    if (!(STATUSES as readonly string[]).includes(req.query.status)) {
      return res.status(400).json({ error: "invalid status filter" });
    }
    filter.status = req.query.status;
  }
  res.json(await Task.find(filter).sort({ createdAt: -1 }).limit(200));
});

taskRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const task = await Task.create({ ...parsed.data, owner: req.user!.sub });
  res.status(201).json(task);
});

taskRouter.patch("/:id", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: "invalid id" });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const task = await Task.findOneAndUpdate({ _id: req.params.id, ...scope(req) }, parsed.data, { new: true });
  if (!task) return res.status(404).json({ error: "not found" });
  res.json(task);
});

taskRouter.delete("/:id", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: "invalid id" });
  const result = await Task.deleteOne({ _id: req.params.id, ...scope(req) });
  if (result.deletedCount === 0) return res.status(404).json({ error: "not found" });
  res.status(204).end();
});
