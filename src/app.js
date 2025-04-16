import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import phonePe from "./routes/payment.routes.js";
import phonepeUat from "./routes/phonepeUAT.routes.js"
import cashFree from "./routes/cashfree.routes.js"
import visionbyte from "./routes/visionbyte.routes.js"
import vibecartRoute from './routes/vibecart.routes.js'
import { ApiError } from "./utils/ApiError.js";
import esrgmgRoute from "./routes/esrgmg.routes.js";
import impactPeakRoute from "./routes/impactPeak.routes.js";

const app = express();

// Middleware for CORS
const corsOptions = {
    origin: "*",
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
// app.use(cors(corsOptions));

// Middleware for parsing requests
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(express.static("public"));

app.use("/payment", phonePe);
app.use("/api/uat", phonepeUat);
app.use("/api/visionbyte", visionbyte);
app.use("/api", cashFree);
app.use("/api/vibecart", vibecartRoute);
app.use("/api/esrgmg", esrgmgRoute);
app.use("/api/impactPeak", impactPeakRoute);

// Catch-all for undefined routes
app.get("/", (req, res, next) => {
    res.status(200).json({ message: "Success", data: "Server Running successfully !" })
});

app.all("*", (req, res, next) => {
    next(new ApiError(404, `Not Available Path ${req.baseUrl} !`));
});

export default app;