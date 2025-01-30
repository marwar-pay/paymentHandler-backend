import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import axios from "axios";
import crypto from "crypto";

const url ='https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token'
    


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

function generateAuthorizationHash(username, password) {
    const hash = crypto.createHash("sha256");
    hash.update(`${username}:${password}`);
    return hash.digest("hex");
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
