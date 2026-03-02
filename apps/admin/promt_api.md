You are a senior frontend engineer.

Your task is to refactor the existing React frontend to fully integrate with the provided backend controller file.

INPUTS YOU WILL RECEIVE:

* A NestJS/Express controller file
* Existing React frontend code that currently uses mock data

OBJECTIVES:

1. Remove ALL mock data

   * Delete hardcoded arrays, fake services, and placeholder responses
   * Do NOT leave any dummy data in the UI
   * UI must rely only on real API responses

2. Generate proper API integration

   * Read all endpoints from the provided controller
   * Create or update API service functions for each endpoint
   * Use the existing project HTTP client (axios wrapper)
   * Ensure correct HTTP methods, params, query, and body mapping

3. Align frontend models with backend DTOs

   * Infer response types from the controller
   * Update TypeScript interfaces/types to match backend structure
   * Remove any mismatched frontend fields

4. Update UI logic

   * Connect pages/components to real API calls
   * Implement loading states
   * Implement empty states
   * Implement error handling
   * Ensure pagination/filter/search work if supported by backend

5. Authentication handling

   * Use existing JWT/token mechanism
   * Attach Authorization header where required
   * Do NOT implement fake auth

6. Clean architecture rules

   * Keep components small and reusable
   * Use service layer for API calls
   * No business logic inside UI components
   * Follow existing project folder structure

7. Safety rules

   * Do NOT modify backend code
   * Do NOT invent endpoints that do not exist
   * Do NOT keep mock fallbacks
   * If an endpoint is missing, clearly mark TODO

8. Code quality

   * TypeScript strict-safe
   * No unused variables
   * No console.log leftovers
   * No emoji in UI
   * Use icons if needed
   * Keep modern clean design

EXPECTED OUTPUT:

* Updated API service layer
* Updated React components/pages
* Removed mock data
* Types aligned with backend
* Frontend fully wired to real backend

Act like this code is going to production.

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { DashboardStatsDto, RecentActivityResponseDto } from '../../libs/dtos/admin/dashboard.dto';
import { User } from '../../libs/entities/user/user.entity';
import { UserStatus } from '../../libs/enums/Status';
import { Payment } from '../../libs/entities/ai/payment.entity';
import { WalletTransaction } from '../../libs/entities/ai/wallet-transaction.entity';
import { PaymentStatus } from '../../libs/enums/Status';

@ApiTags('Admin - Dashboard')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepo: Repository<WalletTransaction>,
  ) { }

  // ==================== GET DASHBOARD STATISTICS ====================
  @Get('stats')
  @ApiOperation({
    summary: 'Get Dashboard Statistics',
    description: 'Fetch key metrics for the dashboard overview',
  })
  @ApiOkResponse({
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsDto,
    schema: {
      example: {
        totalUsers: 1500,
        activeUsers: 1200,
        totalTransactions: 5432,
        totalRevenue: 45000.0,
        monthlyGrowth: 12.5,
      },
      properties: {
        totalUsers: { type: 'number', example: 1500 },
        activeUsers: { type: 'number', example: 1200 },
        totalTransactions: { type: 'number', example: 5432 },
        totalRevenue: { type: 'number', example: 45000.0 },
        monthlyGrowth: { type: 'number', example: 12.5 },
      },
    },
  })
  async getDashboardStats(): Promise<DashboardStatsDto> {
    // Get total users
    const totalUsers = await this.userRepo.count();

    // Get active users
    const activeUsers = await this.userRepo.count({
      where: { status: UserStatus.ACTIVE },
    });

    // Get total transactions (completed payments)
    const totalTransactions = await this.paymentRepo.count({
      where: { status: PaymentStatus.COMPLETED },
    });

    // Calculate total revenue
    const revenueResult = await this.paymentRepo
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'totalRevenue')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();
    const totalRevenue = parseFloat(revenueResult?.totalRevenue || 0);

    // Calculate monthly growth (last month vs this month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthUsers = await this.userRepo.count({
      where: { created_at: MoreThan(startOfMonth) },
    });

    const lastMonthUsers = await this.userRepo.count({
      where: {
        created_at: MoreThan(startOfLastMonth),
        // Manually filter to exclude this month (TypeORM limitation)
      },
    });

    const monthlyGrowth = lastMonthUsers > 0 ? ((thisMonthUsers - (lastMonthUsers - thisMonthUsers)) / (lastMonthUsers - thisMonthUsers)) * 100 : 0;

    return {
      totalUsers,
      activeUsers,
      totalTransactions,
      totalRevenue,
      monthlyGrowth: monthlyGrowth < 0 ? 0 : parseFloat(monthlyGrowth.toFixed(2)),
    };
  }

  // ==================== GET RECENT ACTIVITY FEED ====================
  @Get('recent-activity')
  @ApiOperation({
    summary: 'Get Recent Activity Feed',
    description: 'Fetch recent user and system activities',
  })
  @ApiOkResponse({
    description: 'Recent activities retrieved successfully',
    type: RecentActivityResponseDto,
    schema: {
      example: {
        activities: [
          {
            id: 'act_001',
            type: 'user_registration',
            description: 'New user registered',
            user: 'John Doe',
            timestamp: '2026-03-01T10:30:00Z',
            amount: null,
          },
          {
            id: 'act_002',
            type: 'purchase',
            description: 'User purchased credits',
            user: 'Jane Smith',
            timestamp: '2026-03-01T09:15:00Z',
            amount: 49.99,
          },
        ],
      },
      properties: {
        activities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'act_001' },
              type: { type: 'string', example: 'user_registration' },
              description: { type: 'string', example: 'New user registered' },
              user: { type: 'string', example: 'John Doe' },
              timestamp: { type: 'string', format: 'date-time', example: '2026-03-01T10:30:00Z' },
              amount: { type: 'number', nullable: true, example: 49.99 },
            },
          },
        },
      },
    },
  })
  async getRecentActivity(): Promise<RecentActivityResponseDto> {
    const activities = [];

    // Get recent user registrations (last 20)
    const recentUsers = await this.userRepo
      .createQueryBuilder('user')
      .orderBy('user.created_at', 'DESC')
      .limit(10)
      .getMany();

    for (const user of recentUsers) {
      activities.push({
        id: `act_user_${user.id}`,
        type: 'user_registration',
        description: 'New user registered',
        user: `${user.firstName} ${user.lastName || ''}`.trim(),
        timestamp: user.created_at.toISOString(),
        amount: null,
      });
    }

    // Get recent completed payments (last 10)
    const recentPayments = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.user', 'user')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .orderBy('payment.created_at', 'DESC')
      .limit(10)
      .getMany();

    for (const payment of recentPayments) {
      activities.push({
        id: `act_payment_${payment.id}`,
        type: 'purchase',
        description: 'User purchased credits',
        user: payment.user ? `${payment.user.firstName} ${payment.user.lastName || ''}`.trim() : 'Unknown',
        timestamp: payment.created_at.toISOString(),
        amount: payment.amount,
      });
    }

    // Sort by timestamp descending and limit to 20
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    activities.splice(20);

    return { activities };
  }
}
import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationListResponseDto } from '../../libs/dtos/admin/evaluation-admin.dto';
import { Submission } from '../../libs/entities/assessment/submission.entity';
import { SubmissionStatus } from '../../libs/enums/Status';

@ApiTags('Admin - Evaluations')
@Controller('admin/evaluations')
export class AdminEvaluationsController {
  private readonly logger = new Logger(AdminEvaluationsController.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
  ) {}

  // ==================== GET ALL EVALUATIONS ====================
  // @Get()
  // @ApiOperation({
  //   summary: 'Get All Evaluations',
  //   description: 'Retrieve paginated list of evaluations with optional filtering',
  // })
  // @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  // @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  // @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected', 'all'] })
  // @ApiOkResponse({
  //   description: 'Evaluations retrieved successfully',
  //   type: EvaluationListResponseDto,
  //   example: {
  //     data: [
  //       {
  //         id: 'eval_001',
  //         userId: 'user_001',
  //         userName: 'John Doe',
  //         type: 'assignment',
  //         status: 'pending',
  //         submittedAt: '2026-03-01T09:00:00Z',
  //         reviewedAt: null,
  //         reviewer: null,
  //       },
  //     ],
  //     total: 45,
  //     page: 1,
  //     limit: 10,
  //   },
  // })
  // async getAllEvaluations(
  //   @Query('page') page: number = 1,
  //   @Query('limit') limit: number = 10,
  // ): Promise<EvaluationListResponseDto> {
  //   page = Math.max(1, page);
  //   limit = Math.min(100, Math.max(1, limit));

  //   const query = this.submissionRepo.createQueryBuilder('submission')
  //     .leftJoinAndSelect('submission.student', 'student')
  //     .leftJoinAndSelect('submission.assessment', 'assessment')
  //     .leftJoinAndSelect('submission.evaluation', 'evaluation')
  //     // Only include submissions that are graded and have AI output
  //     .where('submission.status = :gradedStatus', { gradedStatus: SubmissionStatus.GRADED })
  //     .andWhere('evaluation.aiOutput IS NOT NULL');

  //   const [submissions, total] = await query
  //     .skip((page - 1) * limit)
  //     .take(limit)
  //     .orderBy('submission.created_at', 'DESC')
  //     .getManyAndCount();

  //   const data = submissions.map((submission) => ({
  //     id: submission.id,
  //     userId: submission.userId,
  //     userName: submission.user
  //       ? `${submission.user.firstName} ${submission.user.lastName || ''}`.trim()
  //       : 'Unknown',
  //     submittedAt: submission.created_at,
  //     aiOutput: submission.evaluation?.aiOutput ?? null,
  //   }));

  //   return {
  //     data,
  //     total,
  //     page,
  //     limit,
  //   };
  // }
}
import { Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import {
  VerifyTransactionByHashDto,
  TransactionVerificationResponseDto,
  MarkTransactionPaidDto,
  MarkTransactionRejectedDto,
  TransactionListResponseDto,
  TransactionDetailDto,
  TransactionResponseDto,
} from '../../libs/dtos/admin/transaction-admin.dto';
import { Payment } from '../../libs/entities/ai/payment.entity';
import { PaymentStatus } from '../../libs/enums/Status';
import { PaymentFlowService } from '../wallet/payment-flow.service';

@ApiTags('Admin - Transactions')
@Controller('admin/transactions')
export class AdminTransactionsController {
  private readonly logger = new Logger(AdminTransactionsController.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    private readonly paymentFlowService: PaymentFlowService,
  ) { }

  // ==================== GET ALL TRANSACTIONS ====================
  @Get()
  @ApiOperation({
    summary: 'Get All Transactions (Paginated & Searchable)',
    description: 'Retrieve paginated list of transactions with optional filtering',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: ['paid', 'unpaid', 'all'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({
    description: 'Transactions retrieved successfully',
    type: TransactionListResponseDto,
    schema: {
      example: {
        data: [
          {
            id: 123,
            user: 'John Doe',
            userId: 456,
            amount: 49.99,
            currency: 'USD',
            method: 'credit_card',
            status: 'paid',
            date: '2026-03-01T09:00:00Z',
            userNote: null,
            proofImageUrl: null,
            verificationNote: null,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 123 },
              user: { type: 'string', example: 'John Doe' },
              userId: { type: 'number', example: 456 },
              amount: { type: 'number', example: 49.99 },
              currency: { type: 'string', example: 'USD' },
              method: { type: 'string', example: 'credit_card' },
              status: { type: 'string', example: 'paid' },
              date: { type: 'string', format: 'date-time', example: '2026-03-01T09:00:00Z' },
              userNote: { type: 'string', nullable: true, example: null },
              proofImageUrl: { type: 'string', nullable: true, example: null },
              verificationNote: { type: 'string', nullable: true, example: null },
            },
          },
        },
        total: { type: 'number', example: 1 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  async getAllTransactions(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status: string = 'all',
    @Query('search') search: string = '',
  ): Promise<TransactionListResponseDto> {
    page = Math.max(1, page);
    limit = Math.min(100, Math.max(1, limit));

    const where: any = {};

    if (status !== 'all') {
      where.status = status === 'paid' ? PaymentStatus.COMPLETED : PaymentStatus.PENDING;
    }

    if (search) {
      // Search by transaction ID or user name
      // Note: This is simplified - you may want to use a more complex query
      where.transactionId = ILike(`%${search}%`);
    }

    const [payments, total] = await this.paymentRepo.findAndCount({
      where,
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    const data: TransactionResponseDto[] = payments.map((payment) => ({
      id: payment.id,
      user: payment.user ? `${payment.user.firstName} ${payment.user.lastName || ''}`.trim() : 'Unknown',
      userId: payment.user?.id || null,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.paymentMethod,
      status: payment.status === PaymentStatus.COMPLETED ? 'paid' : 'unpaid',
      date: payment.created_at.toISOString(),
      userNote: null,
      proofImageUrl: null,
      verificationNote: null,
    }));

    return {
      data,
      total,
      page,
      limit,
    };
  }

  // ==================== GET TRANSACTION DETAILS ====================
  @Get(':transactionId')
  @ApiOperation({
    summary: 'Get Transaction Details',
    description: 'Retrieve detailed information about a specific transaction',
  })
  @ApiParam({ name: 'transactionId', type: String })
  @ApiOkResponse({
    description: 'Transaction details retrieved successfully',
    type: TransactionDetailDto,
    schema: {
      example: {
        id: 123,
        user: 'John Doe',
        userId: 456,
        amount: 49.99,
        currency: 'USD',
        method: 'credit_card',
        status: 'paid',
        date: '2026-03-01T09:00:00Z',
        transactionDetails: {},
      },
      properties: {
        id: { type: 'number', example: 123 },
        user: { type: 'string', example: 'John Doe' },
        userId: { type: 'number', example: 456 },
        amount: { type: 'number', example: 49.99 },
        currency: { type: 'string', example: 'USD' },
        method: { type: 'string', example: 'credit_card' },
        status: { type: 'string', example: 'paid' },
        date: { type: 'string', format: 'date-time', example: '2026-03-01T09:00:00Z' },
        transactionDetails: { type: 'object', example: {} },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Transaction not found' })
  async getTransactionDetails(@Param('transactionId') transactionId: string): Promise<TransactionDetailDto> {
    const payment = await this.paymentRepo.findOne({
      where: { id: parseInt(transactionId, 10) },
      relations: ['user'],
    });

    if (!payment) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    return {
      id: payment.id,
      user: payment.user ? `${payment.user.firstName} ${payment.user.lastName || ''}`.trim() : 'Unknown',
      userId: payment.user.id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.paymentMethod,
      status: payment.status === PaymentStatus.COMPLETED ? 'paid' : 'unpaid',
      date: payment.created_at.toISOString(),
      transactionDetails: payment.transactionDetails || {},
    };
  }

  // ==================== VERIFY PAYMENT BY HASH ====================
  @Post('verify-by-hash')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify Payment by Hash (Backend Integration)',
    description: 'Check transaction status using Bakong transaction hash',
  })
  @ApiOkResponse({
    description: 'Payment verified successfully',
    type: TransactionVerificationResponseDto,
    schema: {
      example: {
        status: 'Success',
        senderAccountId: 'acc_001',
        recipientAccountId: 'acc_002',
        amount: 49.99,
        currency: 'USD',
        description: 'Payment for credits',
        transactionDate: '2026-03-01T09:00:00Z',
        trackingStatus: 'Completed',
      },
      properties: {
        status: { type: 'string', example: 'Success' },
        senderAccountId: { type: 'string', example: 'acc_001' },
        recipientAccountId: { type: 'string', example: 'acc_002' },
        amount: { type: 'number', example: 49.99 },
        currency: { type: 'string', example: 'USD' },
        description: { type: 'string', example: 'Payment for credits' },
        transactionDate: { type: 'string', format: 'date-time', example: '2026-03-01T09:00:00Z' },
        trackingStatus: { type: 'string', example: 'Completed' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid hash or amount mismatch',
    example: {
      status: 'Failed',
      message: 'Transaction not found or amount mismatch',
    },
  })
  async verifyPaymentByHash(
    @Body() dto: VerifyTransactionByHashDto,
  ): Promise<TransactionVerificationResponseDto> {
    try {
      // Use PaymentFlowService to verify transaction - same as payment controller
      const response = await this.paymentFlowService.verifyTransactionByHash(
        dto.transactionHash,
        dto.amount,
        'USD',
        dto.userId,
      );

      if (response.responseCode !== 0 || !response.data) {
        throw new BadRequestException('Transaction not found or amount mismatch');
      }

      return {
        status: 'Success',
        senderAccountId: response.data.fromAccountId,
        recipientAccountId: response.data.toAccountId,
        amount: response.data.amount,
        currency: response.data.currency,
        description: response.data.description,
        transactionDate: new Date(response.data.createdDateMs).toISOString(),
        trackingStatus: response.data.trackingStatus || 'Completed',
      };
    } catch (error) {
      this.logger.error('Failed to verify payment by hash:', error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to verify payment with Bakong API');
    }
  }

  // ==================== MARK TRANSACTION AS PAID ====================
  @Post(':transactionId/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark Transaction as Paid',
    description: 'Verify and mark a transaction as paid',
  })
  @ApiParam({ name: 'transactionId', type: String })
  @ApiOkResponse({
    description: 'Transaction marked as paid successfully',
    schema: {
      example: {
        id: 123,
        status: 'paid',
        verifiedAt: '2026-03-01T09:00:00Z',
        verificationNote: 'Verified by admin',
      },
      properties: {
        id: { type: 'number', example: 123 },
        status: { type: 'string', example: 'paid' },
        verifiedAt: { type: 'string', format: 'date-time', example: '2026-03-01T09:00:00Z' },
        verificationNote: { type: 'string', example: 'Verified by admin' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Transaction not found' })
  async markTransactionAsPaid(
    @Param('transactionId') transactionId: string,
    @Body() dto: MarkTransactionPaidDto,
  ): Promise<any> {
    const id = parseInt(transactionId.replace('TX-', ''), 10);

    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    payment.status = PaymentStatus.COMPLETED;
    await this.paymentRepo.save(payment);

    return {
      id: payment.id,
      status: 'paid',
      verifiedAt: new Date().toISOString(),
      verificationNote: dto.verificationNote,
    };
  }

  // ==================== MARK TRANSACTION AS UNPAID/REJECTED ====================
  @Post(':transactionId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark Transaction as Unpaid (Reject Payment)',
    description: 'Reject a payment and return it to unpaid status',
  })
  @ApiParam({ name: 'transactionId', type: String })
  @ApiOkResponse({
    description: 'Transaction rejected successfully',
    schema: {
      example: {
        id: 123,
        status: 'unpaid',
        rejectionReason: 'Insufficient funds',
        rejectedAt: '2026-03-01T09:00:00Z',
        verificationNote: 'Rejected by admin',
      },
      properties: {
        id: { type: 'number', example: 123 },
        status: { type: 'string', example: 'unpaid' },
        rejectionReason: { type: 'string', example: 'Insufficient funds' },
        rejectedAt: { type: 'string', format: 'date-time', example: '2026-03-01T09:00:00Z' },
        verificationNote: { type: 'string', example: 'Rejected by admin' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Transaction not found' })
  async markTransactionAsRejected(
    @Param('transactionId') transactionId: string,
    @Body() dto: MarkTransactionRejectedDto,
  ): Promise<any> {
    const id = parseInt(transactionId.replace('TX-', ''), 10);

    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    payment.status = PaymentStatus.FAILED;
    await this.paymentRepo.save(payment);

    return {
      id: payment.id,
      status: 'unpaid',
      rejectionReason: dto.reason,
      rejectedAt: new Date().toISOString(),
      verificationNote: dto.verificationNote,
    };
  }

  // // ==================== SEARCH TRANSACTIONS ====================
  // @Get('search')
  // async searchTransactions(
  //   @Query('q') query: string,
  //   @Query('status') status?: string,
  // ): Promise<TransactionListResponseDto> {
  //   const where: any[] = [];

  //   // Status filter
  //   const statusFilter = status
  //     ? { status: status === 'paid' ? PaymentStatus.COMPLETED : PaymentStatus.PENDING }
  //     : {};

  //   // Numeric search (transaction numeric ID)
  //   const numericQuery = parseInt(query);
  //   if (!isNaN(numericQuery)) {
  //     where.push({ ...statusFilter, id: numericQuery });
  //   }

  //   // Text search: transactionId or username
  //   where.push({ ...statusFilter, transactionId: ILike(`%${query}%`) });
  //   where.push({
  //     ...statusFilter,
  //     user: { firstName: ILike(`%${query}%`) },
  //   });
  //   where.push({
  //     ...statusFilter,
  //     user: { lastName: ILike(`%${query}%`) },
  //   });

  //   const payments = await this.paymentRepo.find({
  //     where,
  //     relations: ['user'],
  //     order: { created_at: 'DESC' },
  //   });

  //   const data: TransactionResponseDto[] = payments.map((payment) => ({
  //     id: payment.id,
  //     user: payment.user ? `${payment.user.firstName} ${payment.user.lastName || ''}`.trim() : 'Unknown',
  //     userId: payment.user?.id || 0,
  //     amount: payment.amount,
  //     currency: payment.currency,
  //     method: payment.paymentMethod,
  //     status: payment.status === PaymentStatus.COMPLETED ? 'paid' : 'unpaid',
  //     date: payment.created_at.toISOString(),
  //     userNote: null,
  //     proofImageUrl: null,
  //     verificationNote: null,
  //     verifiedAt: null,
  //   }));

  //   return {
  //     data,
  //     total: data.length,
  //     page: 1,
  //     limit: data.length,
  //   };
  // }
}
import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe, HttpCode, HttpStatus, NotFoundException, BadRequestException, Logger, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import {
  AddCreditsDto,
  DeductCreditsDto,
  AddCreditsResponseDto,
  ToggleUserStatusDto,
  UserListResponseDto,
  UserDetailDto,
} from '../../libs/dtos/admin/user-admin.dto';
import { User } from '../../libs/entities/user/user.entity';
import { UserStatus } from '../../libs/enums/Status';
import { UserCreditBalance } from '../../libs/entities/ai/user-credit-balance.entity';
import { WalletService } from '../wallet/wallet.service';
import { TransactionReason } from '../../libs/entities/ai/wallet-transaction.entity';
import { Payment } from '../../libs/entities/ai/payment.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/security/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../libs/enums/Role';

@ApiTags('Admin - Users')
@Controller('admin/users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-auth')
@Roles(SystemRole.SuperAdmin)
export class AdminUsersController {
  private readonly logger = new Logger(AdminUsersController.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserCreditBalance)
    private readonly walletRepo: Repository<UserCreditBalance>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly walletService: WalletService,
  ) { }

  // ==================== GET ALL USERS ====================
  @Get()
  @ApiOperation({
    summary: 'Get All Users (Paginated & Searchable)',
    description: 'Retrieve paginated list of users with optional filtering and search',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'suspended', 'all'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({
    description: 'Users retrieved successfully',
    type: UserListResponseDto,
    schema: {
      example: {
        data: [
          {
            id: 123,
            name: 'John Doe',
            email: 'john@example.com',
            credits: 1000,
            status: 'active',
            joinDate: '2026-03-01T09:00:00Z',
            lastActivity: '2026-03-01T10:00:00Z',
            totalPurchased: 5,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 123 },
              name: { type: 'string', example: 'John Doe' },
              email: { type: 'string', example: 'john@example.com' },
              credits: { type: 'number', example: 1000 },
              status: { type: 'string', example: 'active' },
              joinDate: { type: 'string', format: 'date-time', example: '2026-03-01T09:00:00Z' },
              lastActivity: { type: 'string', format: 'date-time', example: '2026-03-01T10:00:00Z' },
              totalPurchased: { type: 'number', example: 5 },
            },
          },
        },
        total: { type: 'number', example: 1 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  async getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status: string = 'all',
    @Query('search') search: string = '',
  ): Promise<UserListResponseDto> {
    page = Math.max(1, page);
    limit = Math.min(100, Math.max(1, limit));

    const where: any = {};
    if (status !== 'all') {
      where.status = status === 'active' ? UserStatus.ACTIVE : UserStatus.BANNED;
    }
    if (search) {
      where.email = ILike(`%${search}%`);
    }

    const [users, total] = await this.userRepo.findAndCount({
      where,
      select: ['id', 'firstName', 'lastName', 'email', 'status', 'created_at', 'updated_at'],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    // Get credit balances for each user
    const data = await Promise.all(
      users.map(async (user) => {
        const wallet = await this.walletRepo.findOne({
          where: { user: { id: user.id } },
        });

        // Get total purchases
        const purchases = await this.paymentRepo.count({
          where: { user: { id: user.id } },
        });

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName || ''}`.trim(),
          email: user.email,
          credits: wallet?.creditBalance || 0,
          status: user.status,
          joinDate: user.created_at,
          lastActivity: user.updated_at,
          totalPurchased: purchases,
        };
      }),
    );

    return {
      data,
      total,
      page,
      limit,
    };
  }

  // ==================== GET USER DETAILS ====================
  @Get(':userId')
  @ApiOperation({
    summary: 'Get User Details',
    description: 'Retrieve detailed information about a specific user',
  })
  @ApiParam({ name: 'userId', type: String })
  @ApiOkResponse({
    description: 'User details retrieved successfully',
    type: UserDetailDto,
    schema: {
      example: {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        credits: 1000,
        status: 'active',
        joinDate: '2026-03-01T09:00:00Z',
        totalSpent: 500,
        recentTransactions: [
          {
            id: 'TXN-1',
            amount: 100,
            date: '2026-03-01T09:00:00Z',
            status: 'paid',
          },
        ],
      },
      properties: {
        id: { type: 'string', example: '123' },
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        phone: { type: 'string', example: '+1234567890' },
        credits: { type: 'number', example: 1000 },
        status: { type: 'string', example: 'active' },
        joinDate: { type: 'string', format: 'date-time', example: '2026-03-01T09:00:00Z' },
        totalSpent: { type: 'number', example: 500 },
        recentTransactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'TXN-1' },
              amount: { type: 'number', example: 100 },
              date: { type: 'string', format: 'date-time', example: '2026-03-01T09:00:00Z' },
              status: { type: 'string', example: 'paid' },
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getUserDetails(@Param('userId', ParseIntPipe) userId: number): Promise<UserDetailDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'created_at', 'status'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const wallet = await this.walletRepo.findOne({
      where: { user: { id: userId } },
    });

    // Get recent transactions
    const payments = await this.paymentRepo
      .createQueryBuilder('payment')
      .where('payment.userId = :userId', { userId })
      .orderBy('payment.created_at', 'DESC')
      .limit(5)
      .getMany();

    const recentTransactions = payments.map((p) => ({
      id: `TXN-${p.id}`,
      amount: p.amount,
      date: p.created_at,
      status: p.status,
    }));

    return {
      id: user.id.toString(),
      name: `${user.firstName} ${user.lastName || ''}`.trim(),
      email: user.email,
      phone: user.phoneNumber,
      credits: wallet?.creditBalance || 0,
      status: user.status,
      joinDate: user.created_at.toISOString(),
      totalSpent: payments.reduce((sum, p) => sum + p.amount, 0),
      recentTransactions,
    };
  }

  // ==================== ADD CREDITS ====================
  @Post(':userId/credits/add')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add Credits to User',
    description: 'Add credits to a user wallet for bonuses, promotions, etc.',
  })
  @ApiParam({ name: 'userId', type: String })
  @ApiOkResponse({
    description: 'Credits added successfully',
    type: AddCreditsResponseDto,
    schema: {
      example: {
        userId: '123',
        previousBalance: 500,
        newBalance: 1000,
        transactionId: 'txn_1234567890',
        timestamp: '2026-03-01T09:00:00Z',
      },
      properties: {
        userId: { type: 'string', example: '123' },
        previousBalance: { type: 'number', example: 500 },
        newBalance: { type: 'number', example: 1000 },
        transactionId: { type: 'string', example: 'txn_1234567890' },
        timestamp: { type: 'string', format: 'date-time', example: '2026-03-01T09:00:00Z' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async addCredits(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AddCreditsDto,
  ): Promise<AddCreditsResponseDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const wallet = await this.walletService.addCredits(
      userId,
      dto.amount,
      dto.reason as any as TransactionReason,
      dto.adminNote || `Admin added ${dto.amount} credits - ${dto.reason}`,
    );

    const walletBefore = wallet.creditBalance - dto.amount;

    return {
      userId: user.id.toString(),
      previousBalance: walletBefore,
      newBalance: wallet.creditBalance,
      transactionId: `txn_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== DEDUCT CREDITS ====================
  @Post(':userId/credits/deduct')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deduct Credits from User',
    description: 'Deduct credits from a user wallet for refunds or adjustments',
  })
  @ApiParam({ name: 'userId', type: String })
  @ApiOkResponse({
    description: 'Credits deducted successfully',
    type: AddCreditsResponseDto,
    schema: {
      example: {
        userId: '123',
        previousBalance: 1000,
        newBalance: 500,
        transactionId: 'txn_1234567890',
        timestamp: '2026-03-01T09:00:00Z',
      },
      properties: {
        userId: { type: 'string', example: '123' },
        previousBalance: { type: 'number', example: 1000 },
        newBalance: { type: 'number', example: 500 },
        transactionId: { type: 'string', example: 'txn_1234567890' },
        timestamp: { type: 'string', format: 'date-time', example: '2026-03-01T09:00:00Z' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid request or insufficient balance' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async deductCredits(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: DeductCreditsDto,
  ): Promise<AddCreditsResponseDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const wallet = await this.walletRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!wallet || wallet.creditBalance < dto.amount) {
      throw new BadRequestException('Insufficient credit balance');
    }

    const updatedWallet = await this.walletService.deductCredits(
      userId,
      dto.amount,
      dto.reason as any as TransactionReason,
      dto.adminNote || `Admin deducted ${dto.amount} credits - ${dto.reason}`,
    );

    const walletBefore = wallet.creditBalance;

    return {
      userId: user.id.toString(),
      previousBalance: walletBefore,
      newBalance: updatedWallet.creditBalance,
      transactionId: `txn_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== TOGGLE USER STATUS ====================
  @Patch(':userId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Toggle User Status',
    description: 'Activate or suspend a user account',
  })
  @ApiParam({ name: 'userId', type: String })
  @ApiOkResponse({
    description: 'User status updated successfully',
    schema: {
      example: {
        id: 123,
        status: 'active',
        reason: 'Manual activation',
        updatedAt: '2026-03-01T09:00:00Z',
      },
      properties: {
        id: { type: 'number', example: 123 },
        status: { type: 'string', example: 'active' },
        reason: { type: 'string', example: 'Manual activation' },
        updatedAt: { type: 'string', format: 'date-time', example: '2026-03-01T09:00:00Z' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  async toggleUserStatus(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: ToggleUserStatusDto,
  ): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const newStatus = dto.status === 'active' ? UserStatus.ACTIVE : UserStatus.BANNED;
    user.status = newStatus;
    await this.userRepo.save(user);

    return {
      id: user.id,
      status: newStatus,
      reason: dto.reason || null,
      updatedAt: new Date().toISOString(),
    };
  }

  // ==================== DELETE USER ====================
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete User',
    description: 'Delete a user account permanently',
  })
  @ApiParam({ name: 'userId', type: String })
  @ApiOkResponse({
    description: 'User deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'User deleted successfully',
        deletedUserId: 123,
      },
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User deleted successfully' },
        deletedUserId: { type: 'number', example: 123 },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  async deleteUser(@Param('userId', ParseIntPipe) userId: number): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Delete wallet first
    await this.walletRepo.delete({ user: { id: userId } });

    // Delete user
    await this.userRepo.delete({ id: userId });

    return {
      success: true,
      message: 'User deleted successfully',
      deletedUserId: userId,
    };
  }
}
