import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();

import razorpay from "./src/utils/razorpay";
import { urlencoded } from "express";
import cors from "cors";
import { auth } from "./src/utils/auth";
import { toNodeHandler } from "better-auth/node";
import { userRouter } from "./src/routes/user.routes";
import bodyParser from "body-parser";

const app: Express = express();

const PORT = process.env.PORT;

console.log("prod fe url", process.env.PROD_FRONTEND_URL);
console.log("dev fe url", process.env.DEV_FRONTEND_URL);

// const allowedOrigins = [
//   process.env.FRONTEND_URL,
//   process.env.DEV_FRONTEND_URL,
//   "https://studentsahayak.in",
// ].filter(Boolean) as string[];

const corsOptions = {
  origin: "https://www.studentsahayak.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

console.log(typeof toNodeHandler(auth)); // should log: 'function'

app.use(cors(corsOptions));
app.use(express.json());
app.use(urlencoded({ extended: true }));

// better auth route handler
try {
  app.all("/api/auth", toNodeHandler(auth));
  console.log("Better-auth routes set up successfully");
} catch (error) {
  console.error("Error setting up better-auth routes:", error);
}
app.use("/api/user", userRouter);
// app.use("/api/phone-number");

app.get("/ping", (req, res) => {
  console.log("ping came");
  res.status(200).send("pong");
});

app.post("/create-order", async (req: Request, res: Response): Promise<any> => {
  const { amount, currency, receipt } = req.body;

  console.log("create ordend endpoint hit");

  try {
    const options = {
      amount: amount * 100, // amount will be calculated in paise
      currency,
      receipt,
    };

    const order = await razorpay.orders.create(options);

    console.log(order);

    return res.status(201).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      notes: order.notes,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to create order", error });
  }
});

app.post("/verify-payment", (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
});

app.listen(PORT, () => {
  console.log("server running on port", PORT);
});
