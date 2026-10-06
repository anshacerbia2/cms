import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { NotificationChannelsService } from './notification-channels.service';
import { CreateNotificationChannelDto, UpdateNotificationChannelDto } from './dto/notification-channel.dto';

@Controller('notification-channels')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationChannelsController {
  constructor(private readonly channels: NotificationChannelsService) {}

  @Get()
  @Permissions('notification-channels.index')
  list() {
    return this.channels.list();
  }

  @Post()
  @Permissions('notification-channels.create')
  create(@Body() dto: CreateNotificationChannelDto) {
    return this.channels.create(dto);
  }

  @Patch(':id')
  @Permissions('notification-channels.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNotificationChannelDto) {
    return this.channels.update(id, dto);
  }

  @Delete(':id')
  @Permissions('notification-channels.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.channels.remove(id);
  }

  /** Kirim pesan uji. Memakai izin update: yang boleh mengubah channel boleh mengujinya. */
  @Post(':id/test')
  @Permissions('notification-channels.update')
  test(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.channels.test(id, req.user?.email ?? 'an admin');
  }
}
