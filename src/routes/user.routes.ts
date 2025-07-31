import { Router } from "express";
import { login, registerUser } from "../controllers/user/auth";
import { verifyEmail } from "../controllers/user/auth";

const router: Router = Router();

router.post("/register", registerUser);

router.post("/login", login);

router.post("/verify", verifyEmail);

export const userRouter = router;
