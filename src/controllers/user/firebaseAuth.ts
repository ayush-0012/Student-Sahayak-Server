import { Request, Response } from "express";
import type { UserData } from "../../types/firestore";
import { auth } from "../../utils/firebase";
import {
  createOrUpdateUser,
  getUser,
  updateUserProfile,
} from "../../utils/firestore";

interface FirebaseRegisterBody {
  uid: string;
  fullName: string;
  email: string;
  emailVerified?: boolean;
}

interface FirebaseLoginBody {
  uid: string;
}

/**
 * Register user and create Firestore profile
 * POST /api/user/firebase-register
 */
export async function firebaseRegister(
  req: Request,
  res: Response
): Promise<any> {
  const { uid, fullName, email }: FirebaseRegisterBody = req.body;

  try {
    // Verify Firebase token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const decodedToken = await auth.verifyIdToken(token);

    // Check if uid matches
    if (decodedToken.uid !== uid) {
      return res
        .status(403)
        .json({ error: "Token UID does not match request UID" });
    }

    // Validate required fields
    if (!fullName || !email) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    // Create or update user in Firestore
    const userData: Partial<UserData> = {
      fullName,
      email,
      emailVerified: !!decodedToken.email_verified,
    };

    await createOrUpdateUser(uid, userData);

    return res.status(201).json({
      message: "User registered successfully",
    });
  } catch (error: any) {
    console.error("Firebase register error:", error);

    if (error.code === "auth/invalid-id-token") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    return res.status(500).json({
      error: "Registration failed",
      details: error.message,
    });
  }
}

/**
 * Login user and verify Firebase token
 * POST /api/user/firebase-login
 */
export async function firebaseLogin(req: Request, res: Response): Promise<any> {
  const { uid }: FirebaseLoginBody = req.body;

  try {
    // Verify Firebase token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const decodedToken = await auth.verifyIdToken(token);

    // Check if uid matches
    if (decodedToken.uid !== uid) {
      return res
        .status(403)
        .json({ error: "Token UID does not match request UID" });
    }

    // Get user from Firestore
    const user = await getUser(uid);

    if (!user) {
      return res.status(404).json({ error: "User not found in database" });
    }

    // Update last login
    await updateUserProfile(uid, {
      updatedAt: new Date(),
    });

    return res.status(200).json({
      message: "Login successful",
    });
  } catch (error: any) {
    console.error("Firebase login error:", error);

    if (error.code === "auth/invalid-id-token") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    return res.status(500).json({
      error: "Login failed",
      details: error.message,
    });
  }
}

/**
 * Verify Firebase ID token
 * POST /api/user/firebase-verify-token
 */
export async function firebaseVerifyToken(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const decodedToken = await auth.verifyIdToken(token);

    // Get user from Firestore
    const user = await getUser(decodedToken.uid);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      message: "Token is valid",
      uid: decodedToken.uid,
      email: decodedToken.email,
      user,
    });
  } catch (error: any) {
    console.error("Firebase verify token error:", error);

    if (error.code === "auth/invalid-id-token") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    return res.status(500).json({
      error: "Token verification failed",
      details: error.message,
    });
  }
}

/**
 * Delete user from Firebase Authentication and Firestore
 * DELETE /api/user/firebase-delete
 */
export async function firebaseDeleteUser(
  req: Request,
  res: Response
): Promise<any> {
  const { uid }: { uid: string } = req.body;

  try {
    // Verify Firebase token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const decodedToken = await auth.verifyIdToken(token);

    // Only allow users to delete their own account
    if (decodedToken.uid !== uid) {
      return res
        .status(403)
        .json({ error: "Unauthorized to delete this user" });
    }

    // Delete from Firebase Authentication
    await auth.deleteUser(uid);

    return res.status(200).json({
      message: "User deleted successfully",
      uid,
    });
  } catch (error: any) {
    console.error("Firebase delete user error:", error);

    if (error.code === "auth/user-not-found") {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(500).json({
      error: "Failed to delete user",
      details: error.message,
    });
  }
}

/**
 * Get current user session
 * GET /api/auth/get-session
 */
export async function getSession(req: Request, res: Response): Promise<any> {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    // Verify token
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Get user from Firestore
    const user = await getUser(uid);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      uid: user.uid,
      email: user.email,
      fullName: user.fullName,
      emailVerified: user.emailVerified,
    });
  } catch (error: any) {
    console.error("Get session error:", error);

    if (error.code === "auth/invalid-id-token") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    return res.status(500).json({
      error: "Failed to get session",
      details: error.message,
    });
  }
}

/**
 * Logout user
 * POST /api/auth/logout
 */
export async function logout(req: Request, res: Response): Promise<any> {
  try {
    // Token is verified on frontend and localStorage is cleared
    // This endpoint just confirms logout on backend
    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error: any) {
    console.error("Logout error:", error);

    return res.status(500).json({
      error: "Logout failed",
      details: error.message,
    });
  }
}
