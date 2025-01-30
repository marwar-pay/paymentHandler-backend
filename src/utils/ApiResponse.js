export class ApiResponse {
    constructor(statusCode, data,totalDocs = undefined, message = "Success") {
        this.statusCode = statusCode,
        this.data = data,
        this.totalDocs = totalDocs,
        this.message = message
    }
}