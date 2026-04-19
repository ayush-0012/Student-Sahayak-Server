import { NextFunction, Request, Response } from "express";
import { auth } from "../utils/firebase";

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
  token?: string;
}

/**
 * Middleware to verify Firebase ID token
 * Extracts token from Authorization header (Bearer <token>)
 */
export async function verifyFirebaseToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({ error: "No authorization token provided" });
      return;
    }

    const decodedToken = await auth.verifyIdToken(token);

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };

    req.token = token;

    next();
  } catch (error: any) {
    console.error("Token verification error:", error);

    if (error.code === "auth/invalid-id-token") {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    res.status(401).json({
      error: "Token verification failed",
      details: error.message,
    });
  }
}
