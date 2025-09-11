import { Request, Response } from "express";
import db from "../../db/db";
import { session, users, verification } from "../../db/schema";
import { generateToken } from "../../utils/generateToken";
import { nanoid } from "nanoid";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import cloudinary from "../../utils/cloudinary";
import { UploadApiResponse } from "cloudinary";

interface reqBody {
  fullName: string;
  phoneNumber: string;
  email: string;
  age: number;
  exam: string;
  image: string;
}

export async function registerUser(req: Request, res: Response): Promise<any> {
  const { fullName, phoneNumber, email, age, exam, image }: reqBody = req.body;

  let cloudinaryResponse: UploadApiResponse;

  console.log("req body", req.body);

  if (!fullName || !phoneNumber || !email || !age || !exam || !image) {
    return res.status(400).json({
      error: "Missing required fields",
      received: req.body,
    });
  }

  try {
    // Generate a unique token for this user
    const verificationToken: string = generateToken();

    cloudinaryResponse = await cloudinary.uploader.upload(image, {
      resource_type: "image",
      folder: "sahayak",
      public_id: Date.now().toString(),
    });

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
        image: cloudinaryResponse.secure_url,
      })
      .returning();

    console.log("user", user);

    const userVerification = await db.insert(verification).values({
      id: nanoid(),
      identifier: email,
      value: verificationToken, // Use the token generated for this user
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    console.log("user verification", userVerification);

    // Send verification email immediately after user registration
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
      const { data, error } = await resend.emails.send({
        from: "Student Sahayak <no-reply@studentsahayak.in>",
        to: email,
        subject: "Verify your email - Student Sahayak",
        html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Welcome to Student Sahayak 🎓</h2>
          <p>Hello ${fullName},</p>
          <p>Thank you for signing up! Please verify your email by clicking the button below:</p>
          
          <a href="https://www.studentsahayak.in/verify-email?token=${verificationToken}"
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
         
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create this account, you can safely ignore this email.</p>
          <p>Best regards,<br/>Team Student Sahayak</p>
        </div>
        `,
      });

      console.log("verification email sent", data);

      if (error) {
        console.error("Error sending verification email:", error);
        // Don't fail the registration if email fails
      }
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Don't fail the registration if email fails
    }

    return res.status(201).json({
      message:
        "User created successfully. Please check your email for verification.",
      user: {
        userId: user[0].userId,
        fullName: user[0].fullName,
        email: user[0].email,
        emailVerified: user[0].emailVerified,
      },
    });
  } catch (error) {
    console.log("error occurred while registering", error);
    return res.status(500).json({
      message: "Error occurred while creating a user",
      error,
    });
  }
}

export async function login(req: Request, res: Response) {
  const { email }: reqBody = req.body;

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
      success: false,
    });
  }

  try {
    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found. Please register first.",
        success: false,
      });
    }

    // Generate a new verification token
    const verificationToken: string = generateToken();

    // Delete any existing verification tokens for this email
    await db.delete(verification).where(eq(verification.identifier, email));

    // Create new verification token
    await db.insert(verification).values({
      id: nanoid(),
      identifier: email,
      value: verificationToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: "Student Sahayak <no-reply@studentsahayak.in>",
      to: email,
      subject: "Login verification - Student Sahayak",
      html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Login to Student Sahayak 🎓</h2>
        <p>Hello ${existingUser.fullName},</p>
        <p>Click the button below to login to your account:</p>
        
        <a href="https://www.studentsahayak.in/verify-email?token=${verificationToken}"
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
          Login
        </a>
        
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't request this login, you can safely ignore this email.</p>
        <p>Best regards,<br/>Team Student Sahayak</p>
      </div>
      `,
    });

    console.log("login email sent", data);

    if (error) {
      return res.status(400).json({
        message: "Failed to send login email",
        error,
        success: false,
      });
    }

    res.status(200).json({
      message: "Login email sent successfully. Please check your email.",
      success: true,
      data,
    });
  } catch (error) {
    console.log("error occurred while sending login email", error);
    return res.status(500).json({
      message: "Error occurred while processing login",
      success: false,
    });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).json({
      message: "Token is required",
      success: false,
    });
  }

  try {
    // Verifying the received token
    const [result] = await db
      .select()
      .from(verification)
      .where(eq(verification.value, token));

    if (!result) {
      return res.status(400).json({
        message: "Invalid or expired verification token",
        success: false,
      });
    }

    console.log("Email verified");
    console.log("result", result);

    // Check if token has expired
    if (new Date() > result.expiresAt) {
      return res.status(400).json({
        message: "Verification token has expired",
        success: false,
      });
    }

    // Update the emailVerified field of that user
    const [user] = await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.email, result.identifier))
      .returning();

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    console.log("user", user);

    // Creating a session for user
    const sessionToken = randomUUID();

    const sessionResult = await db.insert(session).values({
      token: sessionToken,
      userId: user.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    console.log("sessionResult", sessionResult);

    // Delete the used verification token
    await db.delete(verification).where(eq(verification.value, token));

    return res.status(200).json({
      message: "Email verified successfully",
      success: true,
      sessionToken: sessionToken, // Return the actual token string
      user: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({
      message: "Unable to verify email, Error occurred",
      success: false,
    });
  }
}
