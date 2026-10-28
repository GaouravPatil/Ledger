import { ApiError } from "../utils/ApiError.js";

export const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found.`));
};

export const errorHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error.";
  let details;

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed.";
    details = Object.values(err.errors).map((error) => error.message);
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for ${err.path}.`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0];
    message = field
      ? `A record with that ${field} already exists.`
      : "A duplicate record already exists.";
  } else if (
    err.code === 20 ||
    err.codeName === "IllegalOperation" ||
    /Transaction numbers are only allowed/i.test(message)
  ) {
    statusCode = 503;
    message =
      "MongoDB transactions require a replica set. Start the project replica set with `npm run mongo:start` or `docker compose up -d`.";
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    message,
    ...(details ? { details } : {}),
  });
};
