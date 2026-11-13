import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard, SuperAdminRoleGuard } from './admin-role.guard';
import { AdminUserService } from './admin-user.service';
import { ListUsersQuery, UpdateUserRoleRequest, UpdateUserStatusRequest } from './admin-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminUserController {
  constructor(private readonly adminUsers: AdminUserService) {}

  @Get()
  async list(@Query() query: ListUsersQuery) {
    return { success: true, data: await this.adminUsers.list(query) };
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return { success: true, data: await this.adminUsers.get(id) };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() input: UpdateUserStatusRequest) {
    return { success: true, data: await this.adminUsers.updateStatus(id, input) };
  }

  @Patch(':id/role')
  @UseGuards(SuperAdminRoleGuard)
  async updateRole(@Param('id', ParseIntPipe) id: number, @Body() input: UpdateUserRoleRequest) {
    return { success: true, data: await this.adminUsers.updateRole(id, input) };
  }

  @Delete(':id')
  @UseGuards(SuperAdminRoleGuard)
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return { success: true, data: await this.adminUsers.remove(id) };
  }
}
