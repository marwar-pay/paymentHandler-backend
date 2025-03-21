import express from "express";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { phonePeUAT, phonePeUATCallback } from "../controller/phonepeUAT.controller.js";

router.post("/phonePe", celebrate({
    body: Joi.object({
        merchantOrderId: Joi.string().required(),
        amount: Joi.number().required(),
    })
}), phonePeUAT);


router.post("/phonepeWebhook",phonePeUATCallback)

export default router;