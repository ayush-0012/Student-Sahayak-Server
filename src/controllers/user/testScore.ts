import { Request, Response } from "express";
import { firestore } from "../../utils/firebase";

interface TestScoreBody {
  uid: string;
  message: string;
  score: {
    total: number;
    max: number;
    percentage: string;
    status: string;
  };
  blockAnalysis: Array<{
    block: string;
    scored: number;
    total: number;
    percentage: string;
  }>;
}

/**
 * Helper function to reset daily test limit at midnight (UTC)
 */
function shouldResetDailyLimit(lastResetDate: any): boolean {
  if (!lastResetDate) return true;

  const lastReset =
    lastResetDate instanceof Date
      ? lastResetDate
      : lastResetDate.toDate?.() || new Date(lastResetDate);

  // Use UTC time to avoid timezone issues
  const today = new Date();
  const todayUTC = new Date(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
    0,
    0,
    0,
    0
  );

  const lastResetDateUTC = new Date(lastReset);
  const lastResetUTC = new Date(
    lastResetDateUTC.getUTCFullYear(),
    lastResetDateUTC.getUTCMonth(),
    lastResetDateUTC.getUTCDate(),
    0,
    0,
    0,
    0
  );

  return lastResetUTC < todayUTC;
}

/**
 * Save test score to Firestore
 * POST /api/user/save-test-score
 */
export async function saveTestScore(req: Request, res: Response): Promise<any> {
  const { uid, message, score, blockAnalysis }: TestScoreBody = req.body;

  try {
    // Verify Firebase token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const { auth } = await import("../../utils/firebase");
    const decodedToken = await auth.verifyIdToken(token);

    // Check if uid matches
    if (decodedToken.uid !== uid) {
      return res
        .status(403)
        .json({ error: "Token UID does not match request UID" });
    }

    // Validate required fields
    if (!message || !score || !blockAnalysis) {
      return res.status(400).json({
        error: "Missing required fields: message, score, blockAnalysis",
      });
    }

    // Get user's daily test limit from profile
    const usersRef = firestore.collection("users");
    const userDoc = await usersRef.doc(uid).get();
    const userData = userDoc.data() || {};

    let dailyTestsUsed = userData.dailyTestsUsed || 0;
    let lastTestResetDate = userData.lastTestResetDate;

    // Reset daily limit if it's a new day
    if (shouldResetDailyLimit(lastTestResetDate)) {
      dailyTestsUsed = 0;
      lastTestResetDate = new Date();
    }

    // Check if user has reached daily limit (2 per day)
    if (dailyTestsUsed >= 2) {
      return res.status(429).json({
        error: "Daily test limit reached (2 per day)",
        remaining: 0,
      });
    }

    // Create test document in shared collection
    const testData = {
      uid,
      message,
      score,
      blockAnalysis,
      timestamp: new Date(),
    };

    const testsRef = firestore.collection("tests");
    const testRef = await testsRef.add(testData);

    // Update user profile with incremented daily test count
    const newDailyTestsUsed = dailyTestsUsed + 1;
    await usersRef.doc(uid).set(
      {
        dailyTestsUsed: newDailyTestsUsed,
        lastTestResetDate,
        latestTestScore: score.percentage,
        latestTestStatus: score.status,
        lastTestDate: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return res.status(201).json({
      message: "Test score saved successfully",
      testId: testRef.id,
      remaining: 2 - newDailyTestsUsed,
    });
  } catch (error: any) {
    console.error("Save test score error:", error);

    return res.status(500).json({
      error: "Failed to save test score",
      details: error.message,
    });
  }
}

/**
 * Get daily test attempts remaining
 * GET /api/user/test-attempts-remaining
 */
export async function getTestAttemptsRemaining(
  req: Request,
  res: Response
): Promise<any> {
  try {
    // Get uid from query or body
    const uid = (req.query.uid as string) || req.body.uid;

    if (!uid) {
      return res.status(400).json({ error: "uid is required" });
    }

    // Verify Firebase token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const { auth } = await import("../../utils/firebase");
    const decodedToken = await auth.verifyIdToken(token);

    // Check if uid matches
    if (decodedToken.uid !== uid) {
      return res
        .status(403)
        .json({ error: "Token UID does not match request UID" });
    }

    // Get user profile from Firestore
    const usersRef = firestore.collection("users");
    const userDoc = await usersRef.doc(uid).get();
    const userData = userDoc.data() || {};

    let dailyTestsUsed = userData.dailyTestsUsed || 0;
    let lastTestResetDate = userData.lastTestResetDate;

    // Reset daily limit if it's a new day
    if (shouldResetDailyLimit(lastTestResetDate)) {
      dailyTestsUsed = 0;
      lastTestResetDate = new Date();
      // Update the reset date in Firebase
      await usersRef.doc(uid).set(
        {
          dailyTestsUsed: 0,
          lastTestResetDate,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }

    const remaining = Math.max(0, 2 - dailyTestsUsed);

    return res.status(200).json({
      uid,
      testsToday: dailyTestsUsed,
      remaining,
      canTakeTest: remaining > 0,
    });
  } catch (error: any) {
    console.error("Get test attempts error:", error);

    if (error.code === "auth/invalid-id-token") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    return res.status(500).json({
      error: "Failed to get test attempts",
      details: error.message,
    });
  }
}

/**
 * Get all user test scores
 * GET /api/user/test-scores
 */
export async function getTestScores(req: Request, res: Response): Promise<any> {
  try {
    // Verify Firebase token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const { auth } = await import("../../utils/firebase");
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const testsRef = firestore.collection("tests");
    const snapshot = await testsRef
      .where("uid", "==", uid)
      .orderBy("timestamp", "desc")
      .get();

    const tests: any[] = [];
    snapshot.forEach((doc) => {
      tests.push({
        testId: doc.id,
        ...doc.data(),
      });
    });

    return res.status(200).json({
      uid,
      totalTests: tests.length,
      tests,
    });
  } catch (error: any) {
    console.error("Get test scores error:", error);

    if (error.code === "auth/invalid-id-token") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    return res.status(500).json({
      error: "Failed to get test scores",
      details: error.message,
    });
  }
}
