import type { Request, Response, NextFunction } from 'express';
import { invoiceService } from './invoice.service.js';

export class InvoiceController {
  async getBuyerInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await invoiceService.getInvoiceForBuyer(
        req.params.txId as string,
        req.user!.sub as string,
      );
      res.json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  }

  async getSellerInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await invoiceService.getInvoiceForSeller(
        req.params.txId as string,
        req.user!.sub as string,
      );
      res.json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  }

  async getBuyerInvoiceHtml(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await invoiceService.getInvoiceForBuyer(
        req.params.txId as string,
        req.user!.sub as string,
      );
      const html = invoiceService.renderInvoiceHtml(invoice);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }

  async getSellerInvoiceHtml(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await invoiceService.getInvoiceForSeller(
        req.params.txId as string,
        req.user!.sub as string,
      );
      const html = invoiceService.renderInvoiceHtml(invoice);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }

  async getPlatformInvoiceHtml(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await invoiceService.getPlatformInvoice(req.params.txId as string);
      const html = invoiceService.renderInvoiceHtml(invoice);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }

  async listPlatformInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const result = await invoiceService.listPlatformInvoices(page);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const invoiceController = new InvoiceController();
