import express from "express";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { phonePeCallback, phonePeIntent, phonePeQR } from "../controller/impactPeak.controller.js";
import { phonePeCallback as phonePeCallbackTest, phonePeIntent as phonePeIntentTest, phonePeQR as phonePeQRTest } from "../controller/impactPeak.controller.test.js";

router.post("/phonePeInitiate", celebrate({
    body: Joi.object({
        merchantOrderId: Joi.string().required(),
        amount: Joi.number().required(),
        redirectUrl: Joi.string().uri().required(),
    })
}), phonePeQR);

router.post("/phonePeIntent", celebrate({
    body: Joi.object({
        merchantOrderId: Joi.string().required(),
        amount: Joi.number().required(),
    })
}), phonePeIntent);

router.post("/phonepeCallback", phonePeCallback)

router.post("/phonePeInitiateTest", celebrate({
    body: Joi.object({
        merchantOrderId: Joi.string().required(),
        amount: Joi.number().required(),
        redirectUrl: Joi.string().uri().required(),
    })
}), phonePeQRTest);

router.post("/phonePeIntentTest", celebrate({
    body: Joi.object({
        merchantOrderId: Joi.string().required(),
        amount: Joi.number().required(),
    })
}), phonePeIntentTest);

router.post("/phonepeCallbackTest", phonePeCallbackTest)

export default router;