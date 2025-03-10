import { asyncHandler } from "../utils/asyncHandler.js";
import axios from "axios";

const CASHFREE_API_URL = "https://api.cashfree.com/pg/orders";

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
                "notify_url": "https://payment.yunicare.in/api/cashfree/verify"
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
        const { data } = req.body;

        if (!data || !data.order || !data.payment) {
            return res.status(200).json({ success: false, message: "Invalid request data" });
        }

        const { order, payment } = data;
        const order_id = order.order_id;
        const payment_status = payment.payment_status;
        const bank_reference = payment.bank_reference;

        // Determine new order status based on payment status
        const newOrderStatus = payment_status === "SUCCESS" ? "processing" : "cancelled";
        const paymentFinalStatus = payment_status === "SUCCESS" ? "completed" : "failed";

        // Update order status in database
        const updateResponse = await updateOrderStatus(order_id, newOrderStatus, paymentFinalStatus);

        if (!updateResponse) {
            return res.status(200).json({ success: false, message: "update order status" });
        }

        return res.status(200).json({
            success: true,
            message: "Order status updated successfully",
        });
    } catch (error) {
        console.error("Error in verifyCashfreeOrder:", error);
        return res.status(200).json({ success: false, message: "Internal server error" });
    }
});

// Function to update order status in database
async function updateOrderStatus(merchantOrderId, status, paymentStatus) {
    try {
        const response = await fetch(
            `https://ajay.yunicare.in/api/order/orders/${merchantOrderId}/status`, 
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status, paymentStatus })
            }
        );
        if (!response.ok) {
            console.error(`API request failed with status: ${response.status}`);
            return null; // Return null to indicate failure
        }
        return await response.json(); // Return response data
    } catch (error) {
        return null; // Return null if an error occurs
    }
}
