import { Module } from '@nestjs/common';
import { PpnInOutController } from './ppn-in-out.controller';
import { PpnInOutService } from './ppn-in-out.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PpnInOutController],
  providers: [PpnInOutService],
  exports: [PpnInOutService],
})
export class PpnInOutModule {}
