import { Module } from '@nestjs/common';
import { EquityPropertyService } from './equity-property.service';
import { EquityPropertyController } from './equity-property.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EquityPropertyController],
  providers: [EquityPropertyService],
  exports: [EquityPropertyService],
})
export class EquityPropertyModule {}
