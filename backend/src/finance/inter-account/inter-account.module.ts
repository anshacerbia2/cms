import { Module } from '@nestjs/common';
import { InterAccountService } from './inter-account.service';
import { InterAccountController } from './inter-account.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InterAccountController],
  providers: [InterAccountService],
  exports: [InterAccountService],
})
export class InterAccountModule {}
