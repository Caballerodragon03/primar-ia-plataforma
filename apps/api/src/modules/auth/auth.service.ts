import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { prisma } from '@primaria/database';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';
import type { JWTPayload } from '@primaria/shared';

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 min

export class AuthService {
  async register(data: RegisterInput) {
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

    return { user, verificationToken };
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { empresa: true },
    });

    if (!user) throw new AppError('Credenciales invalidas', 401);
    if (user.role !== data.role) throw new AppError('Tipo de cuenta incorrecto', 401);

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
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15m
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

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
            : 'EMAIL_VERIFICADO',
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
      exp: Math.floor(Date.now() / 1000) + 15 * 60,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

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

  async logout(token: string) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }
}

export const authService = new AuthService();
