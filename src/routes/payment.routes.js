import express from "express";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { phonePeSwiftVita ,phonePeCallback} from "../controller/payment.controllers.js";

router.post("/phonePeSwiftVita", celebrate({
    body: Joi.object({
        client_id: Joi.string().required(),
        client_version: Joi.number().required(),
        client_secret: Joi.string().required(),
        merchantOrderId: Joi.string().required(),
        amount: Joi.number().required(),
        redirectUrl: Joi.string().uri().required(),
    })
}), phonePeSwiftVita);

router.post("/phonepeCallback",phonePeCallback)

export default router;