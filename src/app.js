import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import phonePe from "./routes/payment.routes.js";
import { ApiError } from "./utils/ApiError.js";

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


// Catch-all for undefined routes
app.get("/", (req, res, next) => {
    res.status(200).json({ message: "Success", data: "Server Running successfully !" })
});

app.all("*", (req, res, next) => {
    next(new ApiError(404, `Not Available Path ${req.baseUrl} !`));
});

export default app;