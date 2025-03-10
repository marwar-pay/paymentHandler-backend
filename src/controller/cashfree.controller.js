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
                "return_url": returnUrl,
                "notify_url": "https://1923-223-184-46-223.ngrok-free.app/api/cashfree/verify"
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

export const verifyCashfreeOrder = asyncHandler(async (req, res) => {
    try {
        const { order, payment, event_time } = req.body.data;
        console.log(" cashfree.controller.js:47 ~ verifyCashfreeOrder ~ req.body:", req.body);
        const order_id = order.order_id;
        const bank_reference = payment.bank_reference;
        const payment_status = payment.payment_status;
        await updateOrderStatus(order_id, payment_status === "SUCCESS" ? "processing" : "cancelled", payment_status)
    } catch (error) {
        console.log(" cashfree.controller.js:48 ~ verifyCashfreeOrder ~ error:", error);


    }
})

async function updateOrderStatus(merchantOrderId, status, paymentStatus) {
    try {
        const response = await fetch(`https://ajay.yunicare.in/api/order/orders/${merchantOrderId}/status`, {
            method: 'PUT',

            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status, paymentStatus })
        });
        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }

        const data = await response.json();
        return data; // Returning data in case it's needed
    } catch (error) {
        console.error('Error updating order status:', error);
    }
}