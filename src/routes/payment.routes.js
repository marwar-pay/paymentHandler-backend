import express from "express";
const router = express.Router();
import { celebrate, Joi } from "celebrate";
import { phonePeSwiftVita ,phonePeCallback, PluseSyncGeneratePayment, ImpactStoreGeneratePayment, WalaxoGeneratePayment} from "../controller/payment.controllers.js";
import { processPayout, processPayoutCallback } from "../controller/payout.controller.js";

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

router.post("/payout", processPayout);

router.post("/payoutCallback",processPayoutCallback)

router.post("/ImpactStoreGeneratePayment", celebrate({
    body: Joi.object({
        trxId: Joi.string().required(),
        amount: Joi.string().required(),
        redirectUrl: Joi.string().required(),
    })
}), ImpactStoreGeneratePayment);

router.post("/WalaxoGeneratePayment", celebrate({
    body: Joi.object({
        trxId: Joi.string().required(),
        amount: Joi.string().required(),
        redirectUrl: Joi.string().required(),
    })
}), WalaxoGeneratePayment);

router.post("/PluseSyncGeneratePayment", celebrate({
    body: Joi.object({
        trxId: Joi.string().required(),
        amount: Joi.string().required(),
        redirectUrl: Joi.string().required(),
    })
}), PluseSyncGeneratePayment);

export default router;