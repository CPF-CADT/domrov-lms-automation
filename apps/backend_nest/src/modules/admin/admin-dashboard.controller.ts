import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Like, ILike } from 'typeorm';
import { DashboardStatsDto, RecentActivityResponseDto } from '../../libs/dtos/admin/dashboard.dto';
import { DailyIncomeResponseDto } from '../../libs/dtos/admin/daily-income.dto';
import { UserListTableResponseDto, UserTableItemDto } from '../../libs/dtos/admin/user-admin.dto';
import { User } from '../../libs/entities/user/user.entity';
import { UserStatus } from '../../libs/enums/Status';
import { Payment } from '../../libs/entities/ai/payment.entity';
import { WalletTransaction } from '../../libs/entities/ai/wallet-transaction.entity';
import { UserCreditBalance } from '../../libs/entities/ai/user-credit-balance.entity';
import { PaymentStatus } from '../../libs/enums/Status';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/security/guards/roles.guard';
import { SystemRole } from '../../libs/enums/Role';

@ApiTags('Admin - Dashboard')
@Controller('admin/dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-auth')
@Roles(SystemRole.SuperAdmin)
export class AdminDashboardController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepo: Repository<WalletTransaction>,
    @InjectRepository(UserCreditBalance)
    private readonly creditBalanceRepo: Repository<UserCreditBalance>,
  ) { }

  // ==================== GET DASHBOARD STATISTICS ====================
  @Get('stats')
  @ApiOperation({
    summary: 'Get Dashboard Statistics',
    description: 'Fetch key metrics for the dashboard overview',
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          totalUsers: 1500,
          activeUsers: 1200,
          totalTransactions: 5432,
          totalRevenue: 45000.0,
          monthlyGrowth: 12.5,
        },
      },
    },
  })
  async getDashboardStats(): Promise<{ success: true; data: DashboardStatsDto }> {
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

    const data: DashboardStatsDto = {
      totalUsers,
      activeUsers,
      totalTransactions,
      totalRevenue,
      monthlyGrowth: monthlyGrowth < 0 ? 0 : parseFloat(monthlyGrowth.toFixed(2)),
    };

    return { success: true, data };
  }

  // ==================== GET USERS LIST WITH FILTERING ====================
  @Get('users')
  @ApiOperation({
    summary: 'Get Users List',
    description: 'Fetch all users with public data, balance, and filtering support',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or email',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'banned'],
    description: 'Filter by user status',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description: 'Filter by user role',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    default: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    default: 10,
    description: 'Items per page',
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          data: [
            {
              id: 1,
              avatar: 'https://cdn.example.com/avatar.jpg',
              name: 'John Doe',
              email: 'john@example.com',
              role: 'user',
              balance: 500,
              status: 'active',
              created: '2026-01-15T10:30:00Z',
            },
          ],
          total: 150,
          page: 1,
          limit: 10,
          totalPages: 15,
          totalRecords: 150,
        },
      },
    },
  })
  async getUsersList(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{ success: true; data: UserListTableResponseDto }> {
    // Convert to numbers if they're strings
    const pageNum = page ? parseInt(String(page), 10) : 1;
    const limitNum = limit ? parseInt(String(limit), 10) : 10;
    // Ensure page and limit are positive integers
    const validPage = Math.max(1, pageNum);
    const validLimit = Math.min(Math.max(1, limitNum), 100);

    // Build query
    const query = this.userRepo.createQueryBuilder('user');

    // Join with credit balance
    query.leftJoinAndSelect('user.creditBalance', 'creditBalance');

    // Search filter
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query.andWhere(
        '(user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search)',
        { search: searchTerm },
      );
    }

    // Status filter
    if (status && status.trim() && ['active', 'inactive', 'banned'].includes(status.toLowerCase())) {
      const statusMap = {
        active: UserStatus.ACTIVE,
        inactive: UserStatus.INACTIVE,
        banned: UserStatus.BANNED,
      };
      query.andWhere('user.status = :status', { status: statusMap[status.toLowerCase()] });
    }

    // Role filter
    if (role && role.trim()) {
      query.andWhere('user.role = :role', { role: role.toUpperCase() });
    }

    // Get total count
    const total = await query.getCount();

    // Apply pagination
    const offset = (validPage - 1) * validLimit;
    const users = await query
      .orderBy('user.created_at', 'DESC')
      .skip(offset)
      .take(validLimit)
      .getMany();

    // Transform to table format
    const tableData: UserTableItemDto[] = users.map((user) => ({
      id: user.id,
      avatar: user.profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName)}`,
      name: `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`,
      email: user.email,
      role: user.role.toLowerCase(),
      balance: user.creditBalance?.creditBalance || 0,
      status: user.status.toLowerCase(),
      created: user.created_at.toISOString(),
    }));

    const totalPages = Math.ceil(total / validLimit);

    const data: UserListTableResponseDto = {
      data: tableData,
      total,
      page: validPage,
      limit: validLimit,
      totalPages,
      totalRecords: total,
    };

    return { success: true, data };
  }

  // ==================== GET RECENT ACTIVITY FEED ====================
  @Get('recent-activity')
  @ApiOperation({
    summary: 'Get Recent Activity Feed',
    description: 'Fetch recent user and system activities',
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
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
      },
    },
  })
  async getRecentActivity(): Promise<{ success: true; data: RecentActivityResponseDto }> {
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

    const data: RecentActivityResponseDto = { activities };

    return { success: true, data };
  }

  // ==================== GET DAILY INCOME DATA ====================
  @Get('income-daily')
  @ApiOperation({
    summary: 'Get Daily Income Data',
    description: 'Fetch daily income data for the last 7 days. Perfect for "Income Daily" dashboard chart. Includes days with zero income.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          dailyData: [
            { date: '2026-02-24', value: 120.0 },
            { date: '2026-02-25', value: 95.50 },
            { date: '2026-02-26', value: 0 },
            { date: '2026-02-27', value: 250.75 },
            { date: '2026-02-28', value: 180.25 },
            { date: '2026-03-01', value: 0 },
            { date: '2026-03-02', value: 210.0 },
          ],
        },
      },
    },
  })
  async getDailyIncome(): Promise<{ success: true; data: DailyIncomeResponseDto }> {
    // Calculate the last 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // -6 to include today

    // Create a map of all days in the last 7 days with zero values
    const dailyIncomeMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      dailyIncomeMap.set(dateStr, 0);
    }

    // Fetch completed payments from the last 7 days
    const payments = await this.paymentRepo.find({
      where: {
        status: PaymentStatus.COMPLETED,
        created_at: MoreThan(sevenDaysAgo),
      },
    });

    // Aggregate income by date
    for (const payment of payments) {
      const paymentDate = new Date(payment.created_at);
      paymentDate.setHours(0, 0, 0, 0);
      const dateStr = paymentDate.toISOString().split('T')[0];

      if (dailyIncomeMap.has(dateStr)) {
        dailyIncomeMap.set(dateStr, dailyIncomeMap.get(dateStr)! + payment.amount);
      }
    }

    // Convert map to sorted array (ascending by date)
    const dailyData = Array.from(dailyIncomeMap.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, value]) => ({
        date,
        value: parseFloat(value.toFixed(2)), // Round to 2 decimal places
      }));

    const data: DailyIncomeResponseDto = { dailyData };

    return { success: true, data };
  }
}
