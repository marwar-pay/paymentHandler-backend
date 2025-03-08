import express from "express";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { createCashfreeOrder } from "../controller/cashfree.controller.js";


router.post("/cashfree", createCashfreeOrder);

// router.post("/phonepeWebhook",phonePeUATCallback)

export default router;