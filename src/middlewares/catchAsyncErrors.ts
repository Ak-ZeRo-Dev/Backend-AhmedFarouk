import { NextFunction, Request, Response } from "express";

export const catchAsyncErrors = (
  asyncFN: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(asyncFN(req, res, next)).catch(next);
  };
};
