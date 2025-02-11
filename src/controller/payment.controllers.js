import { asyncHandler } from "../utils/asyncHandler.js";
import axios from "axios";
import { ApiResponse } from "../utils/ApiResponse.js"
import crypto from 'crypto';
import cron from "node-cron";

const url = "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";
const client_id = 'SWIFTVITAUAT_2501131447128754045048';
const client_secret = 'N2Q3NGEzYjQtOWNlNC00ODExLThmZjAtOWQwMzE1MTEzZTRl';
const client_version = 1;

let tokenData = null;
const jobs = {};

async function fetchAuthToken() {
    console.log("Fetching new auth token...");
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
        console.error("Error fetching token:", error.response?.data || error.message);
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

export const phonePeSwiftVita = asyncHandler(async (req, res) => {
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
        console.error("Error processing payment:", error.response?.data || error.message);
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
            console.log(`Current Order Status from DB: ${orderStatus}`);
            if (orderStatus === "completed" || orderStatus === "failed") {
                console.log(`Order ${orderId} is ${orderStatus}. Stopping cron job.`);
                jobs[orderId].stop();
                delete jobs[orderId]; // Remove from tracking
                return;
            }
            const accessToken = await getValidToken();
            console.log("Fetching order status from PhonePe...");
            const phonepeResponse = await axios.get(
                `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${orderId}/status?details=false`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `O-Bearer ${accessToken}`,
                    },
                }
            );
            if (phonepeResponse.data?.state === "COMPLETED") {
                await updateOrderStatus(orderId, "processing", "completed");
                console.log(`Order ${orderId} marked as completed.`);
                jobs[orderId].stop();
                delete jobs[orderId];
            } else if (phonepeResponse.data?.state === "FAILED") {
                await updateOrderStatus(orderId, "cancelled", "failed");
                console.log(`Order ${orderId} marked as failed.`);
                jobs[orderId].stop();
                delete jobs[orderId];
            }
        } catch (error) {
            console.error(`Error checking/updating order status for Order ID ${orderId}:`, error.message);
        }
    });
    jobs[orderId].start();
}

function generateAuthorizationHash(username, password) {
    const hash = crypto.createHash("sha256");
    hash.update(`${username}:${password}`);
    return hash.digest("hex");
}

export const phonePeCallback = asyncHandler(async (req, res) => {
    const username = 'testuser';
    const password = 'testpassword123';

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
                    console.log(`Order ${orderId} completed with amount: ${amount} and Merchant order ID: ${merchantOrderId}`);
                    await updateOrderStatus(merchantOrderId, "processing", "completed");
                } else {
                    console.log(`Order ${orderId} failed with state: ${state}`);
                }
                break;
            case 'checkout.order.failed':
                if (state === 'FAILED') {
                    console.log(`Order ${orderId} failed with amount: ${amount}, state: ${state}, and Merchant order ID: ${merchantOrderId}`);
                    await updateOrderStatus(merchantOrderId, "cancelled", "failed");
                } else {
                    console.log(`Order ${orderId} is not failed. Current state: ${state}`);
                }
                break;
            // case 'pg.refund.accepted':
            //     handleRefundAccepted(payload);
            //     break;
            // case 'pg.refund.completed':
            //     handleRefundCompleted(payload);
            //     break;
            // case 'pg.refund.failed':
            //     handleRefundFailed(payload);
            //     break;
            default:
                return res.status(200).json({ message: 'Unknown event type' });
        }
        res.status(200).json({ message: 'Webhook received and processed successfully' });
    } catch (error) {
        console.error('Error processing webhook:', error);
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

export const ImpactStoreGeneratePayment = asyncHandler(async (req, res) => {
    let { trxId, amount, redirectUrl } = req.body;
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
        "key": "9e365899-3a23-4ee1-bd66-6dd2c7178078",
        "client_txn_id": trxId,
        "amount": amount,
        "p_info": "Product Name",
        "customer_name": "Jon Doe",
        "customer_email": "jondoe@gmail.com",
        "customer_mobile": "9876543210",
        "redirect_url": redirectUrl,
        "udf1": "user defined field 1",
        "udf2": "user defined field 2",
        "udf3": "user defined field 3"
    });

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    let dd = await fetch("https://api.ekqr.in/api/create_order", requestOptions)
    // .then(response => response.json())
    // .then((result) => RespObj = result)
    // .catch(error => console.log('error', error));
    let json = await dd.json();
    res.status(200).json(new ApiResponse(200, json))
})

export const WalaxoGeneratePayment = asyncHandler(async (req, res) => {
    let { trxId, amount, redirectUrl } = req.body;
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
        "key": "16c2cb35-a435-4ae9-b56d-66a34a3b1aeb",
        "client_txn_id": trxId,
        "amount": amount,
        "p_info": "Product Name",
        "customer_name": "Jon Doe",
        "customer_email": "jondoe@gmail.com",
        "customer_mobile": "9876543210",
        "redirect_url": redirectUrl,
        "udf1": "user defined field 1",
        "udf2": "user defined field 2",
        "udf3": "user defined field 3"
    });

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    let dd = await fetch("https://api.ekqr.in/api/create_order", requestOptions)
    // .then(response => response.json())
    // .then((result) => RespObj = result)
    // .catch(error => console.log('error', error));
    let json = await dd.json();
    res.status(200).json(new ApiResponse(200, json))
})

export const VibeVisionPayment = asyncHandler(async (req, res) => {
    let { trxId, amount, redirectUrl } = req.body;
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
        "key": "1bb20e40-282b-4992-9ace-2711615cb7f1",
        "client_txn_id": trxId,
        "amount": amount,
        "p_info": "Product Name",
        "customer_name": "Jon Doe",
        "customer_email": "jondoe@gmail.com",
        "customer_mobile": "9876543210",
        "redirect_url": redirectUrl,
        "udf1": "user defined field 1",
        "udf2": "user defined field 2",
        "udf3": "user defined field 3"
    });

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    let dd = await fetch("https://api.ekqr.in/api/create_order", requestOptions)
    // .then(response => response.json())
    // .then((result) => RespObj = result)
    // .catch(error => console.log('error', error));
    let json = await dd.json();
    res.status(200).json(new ApiResponse(200, json))
})

export const PluseSyncGeneratePayment = asyncHandler(async (req, res) => {
    let { trxId, amount, redirectUrl } = req.body;
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
        "key": "a3cf0a62-677e-4297-b8a2-1925bb327dcd",
        "client_txn_id": trxId,
        "amount": amount,
        "p_info": "Product Name",
        "customer_name": "Jon Doe",
        "customer_email": "jondoe@gmail.com",
        "customer_mobile": "9876543210",
        "redirect_url": redirectUrl,
        "udf1": "user defined field 1",
        "udf2": "user defined field 2",
        "udf3": "user defined field 3"
    });

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    let dd = await fetch("https://api.ekqr.in/api/create_order", requestOptions)
    // .then(response => response.json())
    // .then((result) => RespObj = result)
    // .catch(error => console.log('error', error));
    let json = await dd.json();
    res.status(200).json(new ApiResponse(200, json))
})