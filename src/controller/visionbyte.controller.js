import { asyncHandler } from "../utils/asyncHandler.js";
import axios from "axios";
import { ApiResponse } from "../utils/ApiResponse.js"
import crypto from 'crypto';
import cron from "node-cron";

// const url = "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";
// const client_id = 'SU2502191439075663427094';
// const client_secret = '66e46ce1-0fdd-43d7-b958-a02f65425602';
// const client_version = 1;

const url = "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";
const client_id = 'VISIONBYTEUAT_2503131723048897947926';
const client_secret = 'MmE5OTQ1NjItMjIzMy00N2NmLTlmNTQtYjI2ZjJlYTVkODA2';
const client_version = 1;

let tokenData = null;
const jobs = {};

async function fetchAuthToken() {
    const body = new URLSearchParams({
        client_id,
        client_version,
        client_secret,
        grant_type: "client_credentials",
    }).toString();

    try {
        const response = await axios.post(url, body, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        const { access_token, expires_at } = response.data;
        tokenData = { access_token, expires_at }; // Updating global tokenData
        return tokenData;
    } catch (error) {
        throw new Error("Failed to fetch authentication token.");
    }
}

async function getValidToken() {
    const bufferTime = 120; // Refresh token 2 minutes before expiry
    const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds

    if (tokenData && tokenData.expires_at > currentTime + bufferTime) {
        return tokenData.access_token;
    }

    tokenData = await fetchAuthToken();
    return tokenData.access_token;
}

export const phonePeVisionbyte = asyncHandler(async (req, res) => {
    try {
        const { merchantOrderId, amount, redirectUrl } = req.body;

        if (!merchantOrderId || !amount || !redirectUrl) {
            return res.status(400).json({ message: "Missing required parameters" });
        }

        const accessToken = await getValidToken();
        const paymentRequest = {
            merchantOrderId,
            amount: Number(amount),
            expireAfter: 600,
            paymentFlow: {
                type: "PG_CHECKOUT",
                message: "Payment message used for collect requests",
                merchantUrls: { redirectUrl },
                metaInfo: {},
                paymentModeConfig: {
                    enabledPaymentModes: [
                        { type: "UPI_INTENT" },
                        { type: "UPI_COLLECT" },
                        { type: "UPI_QR" },
                        { type: "NET_BANKING" },
                        {
                            type: "CARD",
                            cardTypes: ["DEBIT_CARD", "CREDIT_CARD"],
                        },
                    ],
                },
            },
        };

        const headers = {
            "Content-Type": "application/json",
            Authorization: `O-Bearer ${accessToken}`,
        };

        const response = await axios.post(
            "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay",
            paymentRequest,
            { headers }
        );
        if (response.status === 200) {
            startOrderStatusCron(merchantOrderId);
        }
        res.status(response.status).json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            message: "Payment processing failed",
            error: error.response?.data || error.message,
        });
    }
});

async function startOrderStatusCron(orderId) {
    if (jobs[orderId]) {
        jobs[orderId].stop();
        delete jobs[orderId];
    }
    jobs[orderId] = cron.schedule("*/30 * * * * *", async () => {
        try {
            const response = await axios.get(`https://ajay.yunicare.in/api/order/orders/${orderId}`);
            const orderStatus = response.data?.order?.paymentStatus;
            if (orderStatus === "completed" || orderStatus === "failed") {
                jobs[orderId].stop();
                delete jobs[orderId]; // Remove from tracking
                return;
            }
            const accessToken = await getValidToken();
            const phonepeResponse = await axios.get(
                `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${orderId}/status`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `O-Bearer ${accessToken}`,
                    },
                }
            );
            if (phonepeResponse.data?.state === "COMPLETED") {
                await updateOrderStatus(orderId, "processing", "completed");
                jobs[orderId].stop();
                delete jobs[orderId];
            } else if (phonepeResponse.data?.state === "FAILED") {
                await updateOrderStatus(orderId, "cancelled", "failed");
                jobs[orderId].stop();
                delete jobs[orderId];
            }
        } catch (error) {
            console.error(`Error checking/updating order status for Order ID ${orderId}:`, error.message);
        }
    });
    jobs[orderId].start();
    setTimeout(() => {
        stopCronJob(orderId);
    }, 10 * 60 * 1000);
}

function stopCronJob(orderId) {
    if (jobs[orderId]) {
        jobs[orderId].stop();
        delete jobs[orderId];
    }
}

function generateAuthorizationHash(username, password) {
    const hash = crypto.createHash("sha256");
    hash.update(`${username}:${password}`);
    return hash.digest("hex");
}

export const phonePeCallback = asyncHandler(async (req, res) => {
    const username = 'swiftvita';
    const password = 'swiftvita123';

    const receivedAuthorization = req.headers['authorization'];
    const expectedAuthorization = generateAuthorizationHash(username, password);
    if (receivedAuthorization !== expectedAuthorization) {
        return res.status(200).json({ message: 'Unauthorized' });
    }
    const { event, payload } = req.body;
    if (!event || !payload) {
        return res.status(200).json({ message: 'Invalid request format' });
    }
    const { orderId, merchantOrderId, state, amount } = payload;

    try {
        switch (event) {
            case 'checkout.order.completed':
                if (state === 'COMPLETED') {
                    await updateOrderStatus(merchantOrderId, "processing", "completed");
                } else {
                    console.log(`Order ${orderId} failed with state: ${state}`);
                }
                break;
            case 'checkout.order.failed':
                if (state === 'FAILED') {
                    await updateOrderStatus(merchantOrderId, "cancelled", "failed");
                } else {
                    console.log(`Order ${orderId} is not failed. Current state: ${state}`);
                }
                break;
            case 'pg.order.completed':
                if (state === 'COMPLETED') {
                    await updateOrderStatus(merchantOrderId, "processing", "completed");
                } else {
                    console.log(`Order ${orderId} failed with state: ${state}`);
                }
                break;
            case 'pg.order.failed':
                if (state === 'FAILED') {
                    await updateOrderStatus(merchantOrderId, "cancelled", "failed");
                } else {
                    console.log(`Order ${orderId} is not failed. Current state: ${state}`);
                }
                break;
            default:
                return res.status(200).json({ message: 'Unknown event type' });
        }
        res.status(200).json({ message: 'Webhook received and processed successfully' });
    } catch (error) {
        res.status(200).json({ message: 'Internal Server Error' });
    }
});

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
