import { Module } from '@nestjs/common';
import { DepreciationController } from './depreciation.controller';
import { DepreciationService } from './depreciation.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [DepreciationController],
  providers: [DepreciationService, PrismaService],
  exports: [DepreciationService],
})
export class DepreciationModule {}
