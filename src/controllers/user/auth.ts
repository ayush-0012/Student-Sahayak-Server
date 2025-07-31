import { Request, Response } from "express";
import db from "../../db/db";
import { users, verification } from "../../db/schema";
import { generateToken } from "../../utils/generateToken";

import { nanoid } from "nanoid";
import { Resend } from "resend";
import { eq } from "drizzle-orm";

interface reqBody {
  fullName: string;
  phoneNumber: string;
  email: string;
  age: number;
  exam: string;
  image: string;
}

const token: string = generateToken();

export async function registerUser(req: Request, res: Response): Promise<any> {
  const { fullName, phoneNumber, email, age, exam }: reqBody = req.body;

  console.log("req body", req.body);

  if (!fullName || !phoneNumber || !email || !age || !exam) {
    return res.status(400).json({
      error: "Missing required fields",
      received: req.body,
    });
  }

  try {
    const user = await db
      .insert(users)
      .values({
        fullName,
        phoneNumber,
        phoneNumberVerified: false,
        email,
        emailVerified: false,
        age,
        exam,
        // image,
      })
      .returning();

    console.log(" user", user);

    const userVerification = await db.insert(verification).values({
      id: nanoid(),
      identifier: email,
      value: token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    console.log("user verification", userVerification);

    return res.status(201).json({
      message: "user created succesfully",
      user,
    });
  } catch (error) {
    console.log("error occuered while registering", error);
    return res.status(500).json({
      message: "error occurred while creating a user",
      error,
    });
  }
}

export async function login(req: Request, res: Response) {
  const { email }: reqBody = req.body;

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: "Student Sahayak <no-reply@studentsahayak.in>",
      to: email,
      subject: "verify your mail",
      html: `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Welcome to Student Sahayak 🎓</h2>
      <p>Thank you for signing up! Please verify your email by clicking the button below:</p>
      
    <a href="http://localhost:5173/verify-email?token=${token}"
         style="
           display: inline-block;
           padding: 10px 20px;
           margin: 20px 0;
           font-size: 16px;
           color: white;
           background-color: #4CAF50;
           text-decoration: none;
           border-radius: 5px;"
      >
        Verify Email
      </a>

      <p>If you didn’t create this account, you can safely ignore this email.</p>
      <p>Best regards,<br/>Team Student Sahayak</p>
    </div>
  `,
    });

    console.log("mail data", data);

    if (error) {
      return res.status(400).json({ error });
    }

    res.status(200).json({ data });
  } catch (error) {
    console.log("error occurred while sending mail", error);
  }
}

export async function verifyEmail(req: Request, res: Response) {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return;
  }

  try {
    //verifying the received token
    const [result] = await db
      .select()
      .from(verification)
      .where(eq(verification.value, token));

    if (result) {
      console.log("Email verified");
    }

    console.log("result", result);

    // udpating the emailVerified field of that user
    const user = await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.email, result.identifier));

    return res.status(200).json({
      message: "Email verified successfully",
      success: true,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Unable to verify email, Error occurred" });
  }
}
