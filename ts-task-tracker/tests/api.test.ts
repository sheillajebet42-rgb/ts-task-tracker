import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app";

let mongod: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
afterEach(async () => {
  await mongoose.connection.db!.dropDatabase();
});

async function register(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: "password123" });
  return res.body.token as string;
}
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("auth", () => {
  it("registers, rejects duplicates, and logs in", async () => {
    expect((await request(app).post("/api/auth/register").send({ email: "a@x.com", password: "password123" })).status).toBe(201);
    expect((await request(app).post("/api/auth/register").send({ email: "a@x.com", password: "password123" })).status).toBe(409);
    expect((await request(app).post("/api/auth/login").send({ email: "a@x.com", password: "password123" })).status).toBe(200);
    expect((await request(app).post("/api/auth/login").send({ email: "a@x.com", password: "wrongwrong" })).status).toBe(401);
  });

  it("validates input and first user is admin", async () => {
    expect((await request(app).post("/api/auth/register").send({ email: "bad", password: "x" })).status).toBe(400);
    const first = await request(app).post("/api/auth/register").send({ email: "a@x.com", password: "password123" });
    const second = await request(app).post("/api/auth/register").send({ email: "b@x.com", password: "password123" });
    expect([first.body.role, second.body.role]).toEqual(["admin", "member"]);
  });
});

describe("tasks", () => {
  it("requires auth", async () => {
    expect((await request(app).get("/api/tasks")).status).toBe(401);
    expect((await request(app).get("/api/tasks").set("Authorization", "Bearer junk")).status).toBe(401);
  });

  it("CRUD with status filter", async () => {
    const token = await register("a@x.com");
    const created = await request(app).post("/api/tasks").set(auth(token)).send({ title: "Write tests" });
    expect(created.status).toBe(201);
    const id = created.body._id;

    const patched = await request(app).patch(`/api/tasks/${id}`).set(auth(token)).send({ status: "done" });
    expect(patched.body.status).toBe("done");
    expect((await request(app).patch(`/api/tasks/${id}`).set(auth(token)).send({ status: "nope" })).status).toBe(400);

    expect((await request(app).get("/api/tasks?status=done").set(auth(token))).body).toHaveLength(1);
    expect((await request(app).get("/api/tasks?status=todo").set(auth(token))).body).toHaveLength(0);

    expect((await request(app).delete(`/api/tasks/${id}`).set(auth(token))).status).toBe(204);
    expect((await request(app).delete(`/api/tasks/${id}`).set(auth(token))).status).toBe(404);
  });

  it("enforces ownership: members are isolated, admin sees all", async () => {
    const admin = await register("admin@x.com");
    const alice = await register("alice@x.com");
    const bob = await register("bob@x.com");

    const t = await request(app).post("/api/tasks").set(auth(alice)).send({ title: "alice's" });
    expect((await request(app).get("/api/tasks").set(auth(bob))).body).toHaveLength(0);
    expect((await request(app).patch(`/api/tasks/${t.body._id}`).set(auth(bob)).send({ title: "hacked" })).status).toBe(404);
    expect((await request(app).delete(`/api/tasks/${t.body._id}`).set(auth(bob))).status).toBe(404);
    expect((await request(app).get("/api/tasks").set(auth(admin))).body).toHaveLength(1);
  });

  it("rejects malformed ids", async () => {
    const token = await register("a@x.com");
    expect((await request(app).patch("/api/tasks/not-an-id").set(auth(token)).send({ title: "x" })).status).toBe(400);
  });
});
