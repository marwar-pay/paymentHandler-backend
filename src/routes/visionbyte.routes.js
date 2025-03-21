import express from "express";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { phonePeVisionbyte, phonePeCallback } from "../controller/visionbyte.controller.js";

router.post("/phonePeInitiate", celebrate({
    body: Joi.object({
        merchantOrderId: Joi.string().required(),
        amount: Joi.number().required(),
        redirectUrl: Joi.string().uri().required(),
    })
}), phonePeVisionbyte);

router.post("/phonepeCallback", phonePeCallback)

export default router;