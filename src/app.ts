import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './auth/auth.routes';
import reportRoutes from './routes/report.routes';
import academicRoutes from './routes/academic.routes';
import facultyRoutes from './routes/faculty.routes';
import reviewRoutes from './routes/review.routes';
import studentAuthRoutes from './routes/student.auth.routes';
import studentSurveyRoutes from './routes/student.survey.routes';
import { setupSwagger } from './config/swagger.config';

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Setup Swagger Docs
setupSwagger(app);

import adminRoutes from './routes/admin/index';

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/academic', academicRoutes);
app.use('/api/v1/faculty', facultyRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/review', reviewRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use('/api/v1/student', studentAuthRoutes);
app.use('/api/v1/student', studentSurveyRoutes);

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

export default app;
