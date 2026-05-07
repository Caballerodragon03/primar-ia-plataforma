import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { invoiceController } from './invoice.controller.js';

export const invoiceRouter = Router();

// Buyer invoices
invoiceRouter.get(
  '/buyer/:txId',
  requireAuth,
  requireRole('COMPRADOR'),
  invoiceController.getBuyerInvoice.bind(invoiceController),
);
invoiceRouter.get(
  '/buyer/:txId/html',
  requireAuth,
  requireRole('COMPRADOR'),
  invoiceController.getBuyerInvoiceHtml.bind(invoiceController),
);

// Seller invoices
invoiceRouter.get(
  '/seller/:txId',
  requireAuth,
  requireRole('VENDEDOR'),
  invoiceController.getSellerInvoice.bind(invoiceController),
);
invoiceRouter.get(
  '/seller/:txId/html',
  requireAuth,
  requireRole('VENDEDOR'),
  invoiceController.getSellerInvoiceHtml.bind(invoiceController),
);

// Admin: platform commission invoices
invoiceRouter.get(
  '/admin',
  requireAuth,
  requireRole('ADMIN'),
  invoiceController.listPlatformInvoices.bind(invoiceController),
);
invoiceRouter.get(
  '/admin/:txId/html',
  requireAuth,
  requireRole('ADMIN'),
  invoiceController.getPlatformInvoiceHtml.bind(invoiceController),
);
