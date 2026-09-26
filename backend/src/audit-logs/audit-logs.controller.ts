import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AuditLogsService } from './audit-logs.service';
import type { AuditLogQuery } from './audit-logs.service';

/** Hanya membaca. Log diisi oleh trigger di database, tidak lewat API. */
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get()
  @Permissions('audit-logs.index')
  list(@Query() query: AuditLogQuery) {
    return this.auditLogs.list(query);
  }

  @Get('users')
  @Permissions('audit-logs.index')
  users() {
    return this.auditLogs.users();
  }
}
