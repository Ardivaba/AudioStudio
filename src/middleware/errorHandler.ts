import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { config } from '../utils/config';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    Sentry.captureException(err);
    console.error(err);

    res.status(500).json({
        message: 'An unexpected error occurred',
        error: config.app.port === 3000 ? err : {}
    });
};
