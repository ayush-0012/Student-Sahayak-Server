import { Router } from "express";
import { analyzeTest } from "../controllers/user/analyzeTest";

const router: Router = Router();

router.post("/analyze-test", analyzeTest);

export const analyzeTestRouter = router;
