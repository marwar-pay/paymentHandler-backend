import express from "express";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { phonePeVisionbyte, phonePeCallback, phonePeIntent } from "../controller/visionbyte.controller.js";
import { phonePeCallback as testPhonePeCallback, phonePeIntent as testPhonePeIntent } from "../controller/visionByte.controller.test.js";
import { VisionByte } from "../controller/payment.controllers.js";

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

router.post("/test-phonePeIntent", celebrate({
    body: Joi.object({
        merchantOrderId: Joi.string().required(),
        amount: Joi.number().required(),
    })
}), testPhonePeCallback);


router.post("/upiGateway", celebrate({
    body: Joi.object({
        merchantOrderId: Joi.string().required(),
        amount: Joi.number().required(),
        redirectUrl: Joi.string().uri().required(),
    })
}), VisionByte);

router.post("/test-phonepeCallback", testPhonePeIntent)

export default router;