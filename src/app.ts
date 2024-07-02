import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ErrorHandler } from "./utils/ErrorHandler";
import { handelErrors } from "./middlewares/handelErrors";
import { userRouter } from "./routes/userRoutes";
import { layoutRouter } from "./routes/layoutRoutes";
import { notificationsRouter } from "./routes/notificationsRoutes";
import { contactRouter } from "./routes/contactRoutes";
import { productsRouter } from "./routes/productsRoutes";

// Config
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: `${__dirname}/config/.env` });
}

export const app = express();

app.use(express.json({ limit: "50mb" }));

app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(
  cors({
    origin: process.env.ORIGIN,
    credentials: true,
  })
);

app.use(cookieParser(process.env.COOKIE_SECRET));

// Routing
app.use("/api/users", userRouter);
app.use("/api/layout", layoutRouter);
app.use("/api/contact", contactRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/products", productsRouter);

// Errors
app.use("*", (req: Request, res: Response, next: NextFunction) => {
  next(new ErrorHandler("Page Not Found", 404));
});

app.use(handelErrors);
