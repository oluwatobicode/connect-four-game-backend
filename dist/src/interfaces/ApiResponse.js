export const sendSuccess = (res, statusCode, message, data) => {
    return res.status(statusCode).json({
        statusCode,
        success: true,
        message,
        data,
    });
};
export const sendError = (res, statusCode, message, error) => {
    return res.status(statusCode).json({
        statusCode,
        success: false,
        message,
        error,
    });
};
