import express from "express";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { phonePeVisionbyte, phonePeCallback, phonePeIntent } from "../controller/visionbyte.controller.js";

router.post("/phonePeInitiate", celebrate({
    body: Joi.object({
        merchantOrderId: Joi.string().required(),
        amount: Joi.number().required(),
        redirectUrl: Joi.string().uri().required(),
    })
}), phonePeVisionbyte);

router.post("/phonePeIntent", celebrate({
    body: Joi.object({
        merchantOrderId: Joi.string().required(),
        amount: Joi.number().required(),
    })
}), phonePeIntent);

router.post("/phonepeCallback", phonePeCallback)

export default router;