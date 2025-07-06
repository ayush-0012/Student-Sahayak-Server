import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();

import razorpay from "./src/utils/razorpay";
import { urlencoded } from "express";
import cors from "cors";

const app: Express = express();

const PORT = process.env.PORT;

const corsOptions = {
  origin: "*",
  method: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send("fjdkl");
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
