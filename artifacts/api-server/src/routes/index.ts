import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import ordersRouter from "./orders.js";
import webhooksRouter from "./webhooks.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/orders", ordersRouter);
router.use("/webhooks", webhooksRouter);

export default router;
