import { asyncHandler } from "../utils/asyncHandler.js";
import axios from "axios";

const CASHFREE_API_URL = "https://sandbox.cashfree.com/pg/orders";

export const createCashfreeOrder = asyncHandler(async (req, res) => {
    try {
        const { orderAmount, customerId, customerPhone, order_id, returnUrl } = req.body;

        if (!orderAmount || !customerId || !customerPhone || !order_id) {
            return res.status(400).json({ message: "Missing required parameters" });
        }
        const requestData = {
            "order_currency": "INR",
            "order_amount": Number(orderAmount),
            "order_id": order_id,
            "customer_details": {
                "customer_id": customerId,
                "customer_phone": customerPhone
            },
            "order_meta": {
                "return_url": returnUrl
            }
        };

        const headers = {
            "Content-Type": "application/json",
            "x-api-version": "2023-08-01",
            "x-client-id": process.env.CASHFREE_ID,
            "x-client-secret": process.env.CASHFREE_SECRET
        };

        const response = await axios.post(CASHFREE_API_URL, requestData, { headers });
        res.status(response.status).json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            message: "Payment processing failed",
            error: error.response?.data || error.message,
        });
    }
});
