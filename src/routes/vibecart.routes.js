import express from "express";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { phonePeIntent as testPhonePeIntent, phonePeVibecart, phonePeCallback as testPhonePeCallback } from "../controller/vibecart.controller.test.js";

router.post("/phonePeInitiate", celebrate({
    body: Joi.object({
        merchantOrderId: Joi.string().required(),
        amount: Joi.number().required(),
        redirectUrl: Joi.string().uri().required(),
    })
}), phonePeVibecart);

router.post("/phonePeIntent", celebrate({
    body: Joi.object({
        merchantOrderId: Joi.string().required(),
        amount: Joi.number().required(),
    })
}), testPhonePeIntent);

router.post("/phonepeCallback", testPhonePeCallback)

export default router;