import { Router } from "express";
import { analyzeTest } from "../controllers/user/analyzeTest";
import { login, registerUser, verifyEmail } from "../controllers/user/auth";
import {
  firebaseDeleteUser,
  firebaseLogin,
  firebaseRegister,
  getSession,
  logout,
} from "../controllers/user/firebaseAuth";
import {
  getTestAttemptsRemaining,
  getTestScores,
  saveTestScore,
} from "../controllers/user/testScore";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken";

const router: Router = Router();

// Original auth routes (kept for backward compatibility)
router.post("/register", registerUser);
router.post("/login", login);
router.post("/verify", verifyEmail);

// Firebase auth routes
router.post("/firebase-register", firebaseRegister);
router.post("/firebase-login", firebaseLogin);
router.post("/firebase-verify-token", verifyFirebaseToken);
router.delete("/firebase-delete", firebaseDeleteUser);

// Session routes
router.get("/get-session", getSession);
router.post("/logout", logout);

// Protected route example - requires Firebase token
router.post("/analyze-test", verifyFirebaseToken, analyzeTest);

// Test score routes
router.post("/save-test-score", saveTestScore);
router.get("/test-attempts-remaining", getTestAttemptsRemaining);
router.get("/test-scores", getTestScores);

export const userRouter = router;
