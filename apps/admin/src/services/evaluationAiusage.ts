// Invoice Service

import { apiClient } from "./api";
// import type { InvoiceResponseDto } from "../types/admin-billing";
import type{InvoiceResponseDto}

export interface LineItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
}

// Regular invoice
export interface Invoice {
  id: number;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  userId: number;
  amount: number;
  currency: string;
  status: "draft" | "pending" | "paid" | "overdue";
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  taxRate?: number;
  discount?: number;
  notes?: string | null;
  paymentTerms?: string | null;
  invoiceType: "regular" | "recurring";
  createdAt: string;
  updatedAt: string;
}

// Recurring invoice
export interface RecurringInvoice extends Invoice {
  invoiceType: "recurring";
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  nextBillingDate?: string;
  endDate?: string | null;
  isActive: boolean;
}

export type InvoiceSummary = Invoice | RecurringInvoice;

export interface InvoiceListResponse {
  data: InvoiceSummary[];
  total: number;
  page: number;
  limit: number;
}

class InvoiceService {
  async fetchInvoices(
    page: number = 1,
    limit: number = 10,
    status?: string,
    clientName?: string,
  ): Promise<InvoiceListResponse> {
    try {
      const response = await apiClient.invoices.getAll(
        page,
        limit,
        status,
        clientName,
      );
      const itemsData = response.data || [];

      const invoices: InvoiceSummary[] = itemsData.map(
        (inv: InvoiceResponseDto) => {
          const baseInvoice = {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            clientName: inv.clientName,
            clientEmail: inv.clientEmail,
            clientAddress: inv.clientAddress,
            userId: inv.userId,
            amount: inv.amount,
            currency: inv.currency || "USD",
            status: inv.status as "draft" | "pending" | "paid" | "overdue",
            issueDate: inv.issueDate,
            dueDate: inv.dueDate,
            lineItems: inv.lineItems || [],
            taxRate: inv.taxRate,
            discount: inv.discount,
            notes: inv.notes,
            paymentTerms: inv.paymentTerms,
            invoiceType: inv.invoiceType as "regular" | "recurring",
            createdAt: inv.createdAt,
            updatedAt: inv.updatedAt,
          };

          if (inv.invoiceType === "recurring") {
            return {
              ...baseInvoice,
              invoiceType: "recurring" as const,
              frequency: inv.frequency,
              nextBillingDate: inv.nextBillingDate,
              endDate: inv.endDate,
              isActive: inv.isActive,
            } as RecurringInvoice;
          }

          return baseInvoice as Invoice;
        },
      );

      return {
        data: invoices,
        total: response.total || 0,
        page: response.page || 1,
        limit: response.limit || 10,
      };
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      throw error;
    }
  }

  async fetchInvoiceById(id: number): Promise<InvoiceSummary | null> {
    try {
      const response = await apiClient.invoices.getById(id);

      const baseInvoice = {
        id: response.id,
        invoiceNumber: response.invoiceNumber,
        clientName: response.clientName,
        clientEmail: response.clientEmail,
        clientAddress: response.clientAddress,
        userId: response.userId,
        amount: response.amount,
        currency: response.currency || "USD",
        status: response.status as "draft" | "pending" | "paid" | "overdue",
        issueDate: response.issueDate,
        dueDate: response.dueDate,
        lineItems: response.lineItems || [],
        taxRate: response.taxRate,
        discount: response.discount,
        notes: response.notes,
        paymentTerms: response.paymentTerms,
        invoiceType: response.invoiceType as "regular" | "recurring",
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
      };

      if (response.invoiceType === "recurring") {
        return {
          ...baseInvoice,
          invoiceType: "recurring" as const,
          frequency: response.frequency,
          nextBillingDate: response.nextBillingDate,
          endDate: response.endDate,
          isActive: response.isActive,
        } as RecurringInvoice;
      }

      return baseInvoice as Invoice;
    } catch (error) {
      console.error(`Failed to fetch invoice ${id}:`, error);
      return null;
    }
  }

  async createInvoice(
    invoiceData: Partial<InvoiceSummary>,
  ): Promise<InvoiceSummary> {
    try {
      const response = await apiClient.invoices.create(invoiceData);

      const baseInvoice = {
        id: response.id,
        invoiceNumber: response.invoiceNumber,
        clientName: response.clientName,
        clientEmail: response.clientEmail,
        clientAddress: response.clientAddress,
        userId: response.userId,
        amount: response.amount,
        currency: response.currency || "USD",
        status: response.status as "draft" | "pending" | "paid" | "overdue",
        issueDate: response.issueDate,
        dueDate: response.dueDate,
        lineItems: response.lineItems || [],
        taxRate: response.taxRate,
        discount: response.discount,
        notes: response.notes,
        paymentTerms: response.paymentTerms,
        invoiceType: response.invoiceType as "regular" | "recurring",
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
      };

      if (response.invoiceType === "recurring") {
        return {
          ...baseInvoice,
          invoiceType: "recurring" as const,
          frequency: response.frequency,
          nextBillingDate: response.nextBillingDate,
          endDate: response.endDate,
          isActive: response.isActive,
        } as RecurringInvoice;
      }

      return baseInvoice as Invoice;
    } catch (error) {
      console.error("Failed to create invoice:", error);
      throw error;
    }
  }

  async updateInvoice(
    id: number,
    invoiceData: Partial<InvoiceSummary>,
  ): Promise<InvoiceSummary> {
    try {
      const response = await apiClient.invoices.update(id, invoiceData);

      const baseInvoice = {
        id: response.id,
        invoiceNumber: response.invoiceNumber,
        clientName: response.clientName,
        clientEmail: response.clientEmail,
        clientAddress: response.clientAddress,
        userId: response.userId,
        amount: response.amount,
        currency: response.currency || "USD",
        status: response.status as "draft" | "pending" | "paid" | "overdue",
        issueDate: response.issueDate,
        dueDate: response.dueDate,
        lineItems: response.lineItems || [],
        taxRate: response.taxRate,
        discount: response.discount,
        notes: response.notes,
        paymentTerms: response.paymentTerms,
        invoiceType: response.invoiceType as "regular" | "recurring",
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
      };

      if (response.invoiceType === "recurring") {
        return {
          ...baseInvoice,
          invoiceType: "recurring" as const,
          frequency: response.frequency,
          nextBillingDate: response.nextBillingDate,
          endDate: response.endDate,
          isActive: response.isActive,
        } as RecurringInvoice;
      }

      return baseInvoice as Invoice;
    } catch (error) {
      console.error(`Failed to update invoice ${id}:`, error);
      throw error;
    }
  }

  async markAsPaid(id: number, paidDate?: string): Promise<any> {
    try {
      const response = await apiClient.invoices.markAsPaid(id, paidDate);
      return response;
    } catch (error) {
      console.error(`Failed to mark invoice ${id} as paid:`, error);
      throw error;
    }
  }

  async sendInvoiceEmail(id: number, recipientEmail?: string): Promise<any> {
    try {
      const response = await apiClient.invoices.sendEmail(id, recipientEmail);
      return response;
    } catch (error) {
      console.error(`Failed to send invoice ${id} email:`, error);
      throw error;
    }
  }

  async downloadInvoicePdf(id: number): Promise<Blob> {
    try {
      const response = await apiClient.invoices.downloadPdf(id);
      return response;
    } catch (error) {
      console.error(`Failed to download invoice ${id} PDF:`, error);
      throw error;
    }
  }

  async deleteInvoice(id: number): Promise<any> {
    try {
      const response = await apiClient.invoices.delete(id);
      return response;
    } catch (error) {
      console.error(`Failed to delete invoice ${id}:`, error);
      throw error;
    }
  }
}

export const invoiceService = new InvoiceService();
