export const config = {
  port: Number(process.env.PORT ?? 3000),
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017/tasktracker",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-secret-change-me",
  jwtExpiresIn: "8h",
};
