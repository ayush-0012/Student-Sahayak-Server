import { Router } from "express";
import { analyzeTest } from "../controllers/user/analyzeTest";
import { login, registerUser, verifyEmail } from "../controllers/user/auth";

const router: Router = Router();

router.post("/register", registerUser);

router.post("/login", login);

router.post("/verify", verifyEmail);

router.post("/analyze-test", analyzeTest);

export const userRouter = router;
