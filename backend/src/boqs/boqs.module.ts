import { Module } from '@nestjs/common';
import { BoqsService } from './boqs.service';
import { BoqsController } from './boqs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BoqsController],
  providers: [BoqsService],
  exports: [BoqsService],
})
export class BoqsModule {}
