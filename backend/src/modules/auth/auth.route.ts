import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/auth.middleware.js';
import { validateBody } from '../../shared/middlewares/validate.middleware.js';
import * as authController from './auth.controller.js';
import { loginBodySchema, registerStudentBodySchema } from './auth.schema.js';

export const authRouter = Router();

authRouter.post('/login', validateBody(loginBodySchema), authController.login);
authRouter.post('/register', validateBody(registerStudentBodySchema), authController.register);
authRouter.get('/me', requireAuth, authController.me);
authRouter.post('/logout', authController.logout);
