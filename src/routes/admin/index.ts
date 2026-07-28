import { Router } from 'express';

const adminRouter = Router();

// Dashboard Routes
// adminRouter.use('/dashboard', dashboardRoutes);

// Course Outcome Routes
// adminRouter.use('/course-outcomes', courseOutcomeRoutes);

// Subject Routes
// adminRouter.use('/subjects', subjectRoutes);

import facultyRoutes from './faculty.routes';
import courseOutcomesRoutes from './course-outcomes.routes';

// Faculty Routes
adminRouter.use('/faculty', facultyRoutes);

// Course Outcomes Routes
adminRouter.use('/course-outcomes', courseOutcomesRoutes);

// Admin Survey Routes
import adminSurveyRoutes from '../admin.survey.routes';
adminRouter.use('/survey', adminSurveyRoutes);

// Faculty Assignment Routes
// adminRouter.use('/assignments', assignmentRoutes);

// Attainment Config Routes
// adminRouter.use('/attainment-configurations', attainmentConfigRoutes);

export default adminRouter;
