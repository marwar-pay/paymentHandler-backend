import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import axios from "axios";
import crypto from "crypto";

const url = 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token'


async function fetchAuthToken(client_id, client_version, client_secret) {
    const body = new URLSearchParams({
        client_id,
        client_version,
        client_secret,
        grant_type: "client_credentials",
    }).toString();

    try {
        const response = await axios.post(url, body, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        const { access_token, expires_at } = response.data;
        let tokenData = { access_token, expires_at };
        return tokenData;
    } catch (error) {
        console.error("Error fetching token:", error.response?.data || error.message);
        throw new Error("Failed to fetch authentication token.");
    }
}

async function getValidToken(client_id, client_version, client_secret) {
    // const bufferTime = 10; // Refresh token 10 seconds before expiration
    // const currentTime = Date.now() / 1000;

    // if (tokenData && tokenData.expires_at > currentTime + bufferTime) {
    //     return tokenData.access_token;
    // } else {
    const newTokenData = await fetchAuthToken(client_id, client_version, client_secret);
    return newTokenData.access_token;
    // } 
}


export const phonePeSwiftVita = asyncHandler(async (req, res) => {
    try {
        const { client_id, client_version, client_secret, merchantOrderId, amount, redirectUrl } = req.body;

        if (!client_id || !client_version || !client_secret || !merchantOrderId || !amount || !redirectUrl) {
            return res.status(400).json({ message: "Missing required parameters" });
        }

        const accessToken = await getValidToken(client_id, client_version, client_secret);
        const paymentRequest = {
            merchantOrderId,
            amount: Number(amount),
            expireAfter: 1200,
            metaInfo: {
                udf1: ".............",
            },
            paymentFlow: {
                type: "PG_CHECKOUT",
                message: "Payment message used for collect requests",
                merchantUrls: {
                    redirectUrl,
                },
                paymentModeConfig: {
                    enabledPaymentModes: [
                        { type: "UPI_INTENT" },
                        { type: "UPI_QR" },
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
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("Error processing payment:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            message: "Payment processing failed",
            error: error.response?.data || error.message,
        });
    }
});


function generateAuthorizationHash(username, password) {
    const hash = crypto.createHash("sha256");
    hash.update(`${username}:${password}`);
    return hash.digest("hex");
}

export const phonePeCallback = asyncHandler(async (req, res) => {
    const username = 'testuser';
    const password = 'testpassword123';

    console.log('request recicved')
    const receivedAuthorization = req.headers['authorization'];
    console.log(receivedAuthorization)
    const expectedAuthorization = generateAuthorizationHash(username, password);
    console.log(expectedAuthorization)

    console.log(req.body)

    if (receivedAuthorization !== expectedAuthorization) {
        return res.status(403).json({ message: 'Unauthorized' });
    }
    const { event, payload } = req.body;

    if (!event || !payload) {
        return res.status(400).json({ message: 'Invalid request format' });
    }

    try {
        switch (event) {
            case 'checkout.order.completed':
                handleOrderCompleted(payload);
                break;
            case 'checkout.order.failed':
                handleOrderFailed(payload);
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
                return res.status(400).json({ message: 'Unknown event type' });
        }

        res.status(200).json({ message: 'Webhook received and processed successfully' });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

function handleOrderCompleted(payload) {
    const { orderId, merchantOrderId, state, amount } = payload;
    if (state === 'COMPLETED') {
        console.log(`Order ${orderId} completed with amount: ${amount} and Merchant order id ${merchantOrderId}`);
    } else {
        console.log(`Order ${orderId} failed with state: ${state}`);
    }
}

function handleOrderFailed(payload) {
    const { orderId, merchantOrderId, state, amount } = payload;
    if (state === 'FAILED') {
        console.log(`Order ${orderId} failed with amount: ${amount} and state: ${state} and Merchant order id ${merchantOrderId}`);
    } else {
        console.log(`Order ${orderId} failed with state: ${state}`);
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
