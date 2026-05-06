import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      // TODO: Send verification email via Resend
      res.status(201).json({
        success: true,
        message: 'Registro exitoso. Revisa tu email para verificar tu cuenta.',
        data: {
          userId: result.user.id,
          email: result.user.email,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accessToken, refreshToken, user } = await authService.login(req.body);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        data: {
          accessToken,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            estado: user.estado,
            nombre: user.nombre,
            apellidos: user.apellidos,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params as { token: string };
      const result = await authService.verifyEmail(token);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.refreshToken as string | undefined;
      if (!token) {
        res.status(401).json({ success: false, error: 'No refresh token' });
        return;
      }
      const tokens = await authService.refreshTokens(token);

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({ success: true, data: { accessToken: tokens.accessToken } });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.forgotPassword(req.body);
      res.json({
        success: true,
        message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.',
      });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.resetPassword(req.body);
      res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.refreshToken as string | undefined;
      if (token) await authService.logout(token);
      res.clearCookie('refreshToken');
      res.json({ success: true, message: 'Sesion cerrada' });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
