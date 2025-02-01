import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Secret and Access Key (store these in `.env`)
const SECRET = "d74fbd831dbb215a0a99f24dd097ee40";
const ACCESS_KEY = "6e706f07976fe8c4221fde287ece8f88";
const DOMAIN_NAME = "api.flipzik.com";


function generateSignature(timestamp, body, path, queryString = '', method = 'POST') {
    const hmac = crypto.createHmac('sha512', SECRET);
    hmac.update(method + "\n" + path + "\n" + queryString + "\n" + body + "\n" + timestamp + "\n");
    return hmac.digest('hex');
}

// {
//     "address": "NOIDA, UP",
//     "payment_type": 1,
//     "amount": 1000,
//     "email": "testmerchant@gmail.com",
//     "name": "Payout",
//     "mobile_number": "9999999999",
//     "account_number": "12345678910",
//     "ifsc_code": "ABCD0001234",
//     "merchant_order_id": "Test1235"
// }


export const processPayout = async (req, res) => {
    try {
        const payload = req.body;
        const requestData = JSON.stringify(payload);
        const timestamp = Date.now().toString();
        const path = "/api/v1/payout/process";

        const signature = generateSignature(timestamp, requestData, path, '', 'POST');

        const headers = {
            "access_key": ACCESS_KEY,
            "signature": signature,
            "X-Timestamp": timestamp,
            "Content-Type": "application/json"
        };

        const response = await axios.post(`https://${DOMAIN_NAME}${path}`, payload, { headers });

        return res.status(response.status).json(response.data);

    } catch (error) {
        console.error("Payout API Error:", error.response?.data || error.message);
        return res.status(error.response?.status || 500).json({
            message: "Payout request failed",
            error: error.response?.data || error.message
        });
    }
};
