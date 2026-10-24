import { Schema, Types, model } from "mongoose";

export const STATUSES = ["todo", "in_progress", "done"] as const;
export type Status = (typeof STATUSES)[number];

export interface ITask {
  title: string;
  description: string;
  status: Status;
  owner: Types.ObjectId;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "" },
    status: { type: String, enum: STATUSES, default: "todo" },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

export const Task = model<ITask>("Task", taskSchema);
