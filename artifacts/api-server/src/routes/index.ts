import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import otpRouter from "./otp";
import certificateRouter from "./certificate";
import digitalIdRouter from "./digital-id";
import signatureRouter from "./signature";
import documentsRouter from "./documents";
import adminRouter from "./admin";
import verifyRouter from "./verify";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(otpRouter);
router.use(certificateRouter);
router.use(digitalIdRouter);
router.use(signatureRouter);
router.use(documentsRouter);
router.use(adminRouter);
router.use(verifyRouter);

export default router;
