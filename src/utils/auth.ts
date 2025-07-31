import { betterAuth, success } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../db/db"; // your drizzle instance
import { phoneNumber } from "better-auth/plugins";
import twilio from "twilio";
import * as schema from "../db/schema";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
    schema,
  }),

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }, request): Promise<any> => {
        try {
          const message = await twilioClient.messages.create({
            body: `Your verification code is: ${code}`,
            from: process.env.TWILIO_PHONE_NUMBER!, // Your Twilio phone number
            to: phoneNumber,
          });

          console.log(`OTP sent successfully: ${message.sid}`);
          return { message, success: true };
        } catch (error) {
          console.error("Failed to send OTP:", error);
          throw new Error("Failed to send verification code");
        }
      },
    }),
  ],
});
