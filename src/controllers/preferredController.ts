import { NextFunction, Response, Request } from 'express';
import { Model, Document } from 'mongoose';
import { AppError } from '../utils/appError';


export const testtest = (req: Request, res: Response) => {
  res.send({ user: req.body.user });
};