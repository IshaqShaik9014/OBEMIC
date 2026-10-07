import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { generalLimiter, authLimiter, uploadLimiter } from './middleware/rate-limit.middleware';
import authRoutes from './auth/auth.routes';
import reportRoutes from './routes/report.routes';
import academicRoutes from './routes/academic.routes';
import facultyRoutes from './routes/faculty.routes';
import reviewRoutes from './routes/review.routes';
import studentAuthRoutes from './routes/student.auth.routes';
import studentSurveyRoutes from './routes/student.survey.routes';
import adminRoutes from './routes/admin/index';
import { setupSwagger } from './config/swagger.config';

const app = express();

// Trust reverse proxy (Cloudflare Tunnel, Nginx, Docker) so req.ip resolves to the real client IP
app.set('trust proxy', 1);

// Security Headers via Helmet (remove fingerprinting, prevent clickjacking, MIME-sniffing)
app.use(helmet({
  contentSecurityPolicy: false, // Keep false so Swagger UI can display correctly
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.disable('x-powered-by');

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow all local development, LAN network IPs, configured FRONTEND_URL, and cloud previews
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  credentials: true
}));

// Payload Body Limits to prevent memory exhaustion / DoS attacks
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Setup Swagger Docs
setupSwagger(app);

// 1. General Rate Limiter: Protects all API endpoints against DDoS / flood attacks
app.use('/api/v1', generalLimiter);

// 2. Strict Auth Rate Limiter: Protects against Brute-Force & Credential Stuffing
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/student/login', authLimiter);

// 3. Upload & Report Rate Limiter: Protects against memory/disk saturation
app.use('/api/v1/reports/generate', uploadLimiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/academic', academicRoutes);
app.use('/api/v1/faculty', facultyRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/review', reviewRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use('/api/v1/student', studentAuthRoutes);
app.use('/api/v1/student', studentSurveyRoutes);

// Healthcheck (exempt from rate limits for monitoring probes)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK' });
});

export default app;
