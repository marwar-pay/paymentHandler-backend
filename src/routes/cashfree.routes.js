import express from "express";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { createCashfreeOrder, verifyCashfreeOrder } from "../controller/cashfree.controller.js";


router.post("/cashfree", createCashfreeOrder);

router.post("/cashfree/verify", verifyCashfreeOrder);

export default router;