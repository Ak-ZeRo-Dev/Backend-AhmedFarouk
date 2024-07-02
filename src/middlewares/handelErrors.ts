import { NextFunction, Request, Response } from "express";
import { ErrorHandler } from "../utils/ErrorHandler";

export function handelErrors(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  let statusCode: number = error.statusCode || 500;
  let message: string = error.message || "Internal Server Error";

  //Wrong mongoDB id
  if (error.name === "CastError") {
    message = `Resource not found. Invalid ${error.path}`;
    statusCode = 400;
    error = new ErrorHandler(message, statusCode);
  }

  //Duplicate key
  if (error.code === 11000) {
    message = `Duplicate ${Object.keys(error.keyValue)} entered`;
    statusCode = 400;
    error = new ErrorHandler(message, statusCode);
  }

  //Wrong JWT
  if (error.name === "JsonWebTokenError") {
    message = `Json web token is invalid, try again`;
    statusCode = 400;
    error = new ErrorHandler(message, statusCode);
  }

  //JWT expired
  if (error.name === "TokenExpiredError") {
    message = `Json web token is expired, try again`;
    statusCode = 400;
    error = new ErrorHandler(message, statusCode);
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
}
