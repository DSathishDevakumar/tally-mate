import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth";
import { billsRouter } from "./routes/bills";
import { customersRouter } from "./routes/customers";
import { entriesRouter } from "./routes/entries";
import { healthRouter } from "./routes/health";
import { paymentsRouter } from "./routes/payments";
import { productsRouter } from "./routes/products";
import { reportsRouter } from "./routes/reports";

export const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.use("/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/customers", customersRouter);
app.use("/api/products", productsRouter);
app.use("/api/entries", entriesRouter);
app.use("/api/bills", billsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/reports", reportsRouter);

// Must be registered last: catches errors passed via next(err) from any route above.
app.use(errorHandler);
