import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { signToken } from "../middleware/auth";
import { User } from "../models/User";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;

  if (await User.exists({ email })) return res.status(409).json({ error: "email already registered" });

  // First user becomes admin so a fresh deployment is manageable.
  const role = (await User.estimatedDocumentCount()) === 0 ? "admin" : "member";
  const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 10), role });
  res.status(201).json({ token: signToken({ sub: user.id, role: user.role }), role: user.role });
});

authRouter.post("/login", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid credentials" });
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
  // Same message for unknown user and bad password: don't leak which emails exist.
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  res.json({ token: signToken({ sub: user.id, role: user.role }), role: user.role });
});
