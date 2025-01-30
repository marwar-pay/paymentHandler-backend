import { ApiError } from "./ApiError.js"

export const asyncHandler = requestHandler => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => {
            if (err.code == 11000) {
                next(new ApiError(err.statusCode, "Duplicate key error !"))
            }
            next(new ApiError(err.statusCode, err.message))
        })
    }
}