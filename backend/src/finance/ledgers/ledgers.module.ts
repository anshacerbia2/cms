import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LedgersController } from './ledgers.controller';
import { LedgersService } from './ledgers.service';

@Module({
  imports: [PrismaModule],
  controllers: [LedgersController],
  providers: [LedgersService],
})
export class LedgersModule {}
