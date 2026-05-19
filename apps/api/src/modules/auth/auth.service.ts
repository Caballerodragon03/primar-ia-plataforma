import bcrypt from 'bcrypt';
import { sendEmail } from '../../shared/email.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { prisma } from '@primaria/database';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';
import { adminService } from '../admin/admin.service.js';
import type { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput, UpdateProfileInput } from './auth.schema.js';
import type { JWTPayload } from '@primaria/shared';

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 min

export class AuthService {
  async register(data: RegisterInput) {
    // Check if email or CIF is banned
    const banCheck = await adminService.isBanned(data.email, data.cifNif);
    if (banCheck.banned) throw new AppError('Este registro no está permitido. Contacte con info@primar-ia.com', 403);

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new AppError('Email ya registrado', 409);

    // Check CIF uniqueness
    const existingEmpresa = await prisma.empresa.findUnique({ where: { cifNif: data.cifNif } });
    if (existingEmpresa) throw new AppError('CIF/NIF ya registrado', 409);

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const username = data.email.split('@')[0]!.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + randomUUID().slice(0, 6);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username,
        passwordHash,
        role: data.role,
        nombre: data.nombre,
        apellidos: data.apellidos,
        telefono: data.telefono,
        idioma: data.idioma,
        estado: 'EMAIL_NO_VERIFICADO',
        empresa: {
          create: {
            razonSocial: data.razonSocial,
            cifNif: data.cifNif,
            formaJuridica: data.formaJuridica,
            direccionFiscal: data.direccionFiscal,
            ciudad: data.ciudad,
            codigoPostal: data.codigoPostal,
            pais: data.pais,
            personaContactoLegal: data.personaContactoLegal,
            cargoContactoLegal: data.cargoContactoLegal,
            // Datos bancarios/fiscales — el schema obliga a tenerlos en
            // vendedores y son opcionales en compradores.
            iban: data.iban ?? null,
            swiftBic: data.swiftBic ?? null,
            regimenFiscal: data.regimenFiscal ?? 'GENERAL',
          },
        },
      },
      include: { empresa: true },
    });

    // Create email verification token
    const verificationToken = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await prisma.emailToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        tipo: 'EMAIL_VERIFICATION',
        expiresAt,
      },
    });

    // Send verification email (skips if RESEND_API_KEY is placeholder)
    const verifyUrl = `${env.CORS_ORIGIN}/verify-email?token=${verificationToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Verifica tu cuenta en Primar-IA',
      html: `<h2>Bienvenido a Primar-IA</h2>
<p>Hola ${user.nombre},</p>
<p>Por favor verifica tu cuenta haciendo clic en el siguiente enlace (válido 24 horas):</p>
<a href="${verifyUrl}" style="background:#E1C44D;color:#1A1A1A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Verificar cuenta</a>
<p>Si no creaste esta cuenta, ignora este email.</p>`,
    }).catch((err: Error) => console.error('[AUTH] Email send failed:', err.message));

    return { user, verificationToken };
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { empresa: true },
    });

    if (!user) throw new AppError('Credenciales invalidas', 401);

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError('Cuenta bloqueada temporalmente. Intenta mas tarde.', 423);
    }

    const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordValid) {
      const newAttempts = user.loginAttempts + 1;
      const updateData: { loginAttempts: number; lockedUntil?: Date } = {
        loginAttempts: newAttempts,
      };
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_TIME_MS);
      }
      await prisma.user.update({ where: { id: user.id }, data: updateData });
      throw new AppError('Credenciales invalidas', 401);
    }

    // Reset login attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null },
    });

    const payload: JWTPayload = {
      sub: user.id,
      role: user.role,
      estado: user.estado,
      empresa_id: user.empresa?.id ?? null,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1h
    };

    // exp is already set in payload — do NOT pass expiresIn in options (causes conflict)
    const accessToken = jwt.sign(payload, env.JWT_SECRET);

    // Create refresh token (opaque UUID stored in DB)
    const refreshToken = randomUUID();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30d
      },
    });

    return { accessToken, refreshToken, user };
  }

  async verifyEmail(token: string) {
    const emailToken = await prisma.emailToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!emailToken) throw new AppError('Token invalido', 400);
    if (emailToken.usedAt) throw new AppError('Token ya utilizado', 400);
    if (emailToken.expiresAt < new Date()) throw new AppError('Token expirado', 400);
    if (emailToken.tipo !== 'EMAIL_VERIFICATION') throw new AppError('Token invalido', 400);

    await prisma.$transaction([
      prisma.emailToken.update({
        where: { id: emailToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: emailToken.userId },
        data: {
          estado: emailToken.user.role === 'COMPRADOR'
            ? 'VERIFICADO_ACTIVO'
            : 'PENDIENTE_VERIFICACION',
        },
      }),
    ]);

    return { userId: emailToken.userId, role: emailToken.user.role };
  }

  async refreshTokens(token: string) {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { empresa: true } } },
    });

    if (!refreshToken) throw new AppError('Refresh token invalido', 401);
    if (refreshToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: refreshToken.id } });
      throw new AppError('Refresh token expirado', 401);
    }

    const user = refreshToken.user;
    const payload: JWTPayload = {
      sub: user.id,
      role: user.role,
      estado: user.estado,
      empresa_id: user.empresa?.id ?? null,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1h
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET);

    // Rotate refresh token
    const newRefreshToken = randomUUID();
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: refreshToken.id } }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async forgotPassword(data: ForgotPasswordInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return;

    await prisma.emailToken.deleteMany({
      where: { userId: user.id, tipo: 'PASSWORD_RESET', usedAt: null },
    });

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await prisma.emailToken.create({
      data: { userId: user.id, token, tipo: 'PASSWORD_RESET', expiresAt },
    });

    const resetUrl = `${env.CORS_ORIGIN}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: 'Restablecer contraseña — Primar-IA',
      html: `<h2>Restablecer contraseña</h2>
<p>Hola ${user.nombre},</p>
<p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace (válido 1 hora):</p>
<a href="${resetUrl}" style="background:#E1C44D;color:#1A1A1A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Restablecer contraseña</a>
<p>Si no solicitaste este cambio, ignora este email.</p>`,
    }).catch((err: Error) => console.error('[AUTH] Password reset email failed:', err.message));
  }

  async resetPassword(data: ResetPasswordInput) {
    const emailToken = await prisma.emailToken.findUnique({
      where: { token: data.token },
    });

    if (!emailToken) throw new AppError('Token invalido', 400);
    if (emailToken.usedAt) throw new AppError('Token ya utilizado', 400);
    if (emailToken.expiresAt < new Date()) throw new AppError('Token expirado', 400);
    if (emailToken.tipo !== 'PASSWORD_RESET') throw new AppError('Token invalido', 400);

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    await prisma.$transaction([
      prisma.emailToken.update({
        where: { id: emailToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: emailToken.userId },
        data: { passwordHash, loginAttempts: 0, lockedUntil: null },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: emailToken.userId } }),
    ]);
  }

  async logout(token: string) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    // Handle password change
    if (data.currentPassword && data.newPassword) {
      const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!valid) throw new AppError('Contraseña actual incorrecta', 400);
      const passwordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
      await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    }

    // Handle profile field updates
    const updateData: Record<string, unknown> = {};
    if (data.telefono !== undefined) updateData.telefono = data.telefono;
    if (data.idiomaPreferido !== undefined) updateData.idioma = data.idiomaPreferido;
    if (data.preferenciasIncoterm !== undefined) updateData.preferenciasIncoterm = data.preferenciasIncoterm;

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: updateData });
    }

    // NOTE: IBAN, regimenFiscal, CIF, razón social, dirección fiscal NO se
    // actualizan desde este endpoint por seguridad. Se introducen una sola vez
    // al registrarse y sólo un admin puede modificarlas.

    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellidos: true,
        telefono: true,
        idioma: true,
        role: true,
        estado: true,
        preferenciasIncoterm: true,
        preferenciasNotif: true,
        tutorialesCompletados: true,
        empresa: {
          select: {
            razonSocial: true,
            cifNif: true,
            direccionFiscal: true,
            ciudad: true,
            codigoPostal: true,
            pais: true,
            iban: true,
            swiftBic: true,
            regimenFiscal: true,
          },
        },
      },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    return user;
  }
}

export const authService = new AuthService();
