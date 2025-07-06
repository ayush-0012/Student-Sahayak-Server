import Razorpay from "razorpay";

if (!process.env.RAZORPAY_KEY && !process.env.RAZORPAY_SECRET) {
  console.log("razorpay envs are not set");
  throw new Error("Razorpay env vars are not set!");
}

const razorpay: Razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

export default razorpay;
