import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.utils';

// Extend Express Request object
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    
    // Check restricted state
    // If mustChangePassword is true, only allow access to /auth/change-password or /auth/logout
    if (payload.mustChangePassword) {
      const allowedPaths = ['/api/v1/auth/change-password', '/api/v1/auth/logout'];
      // Exact match or starting with (if there are query params, but req.path is just the path)
      if (!allowedPaths.includes(req.path) && !allowedPaths.includes(req.originalUrl.split('?')[0])) {
        res.status(403).json({ error: 'Forbidden: You must change your temporary password before accessing other resources.' });
        return;
      }
    }

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
  }
};
