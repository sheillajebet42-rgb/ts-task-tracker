import { Schema, model } from "mongoose";

export type Role = "admin" | "member";

export interface IUser {
  email: string;
  passwordHash: string;
  role: Role;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
