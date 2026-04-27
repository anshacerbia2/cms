import { Module } from '@nestjs/common';
import { BankMutationService } from './bank-mutation.service';
import { BankMutationController } from './bank-mutation.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BankMutationService],
  controllers: [BankMutationController],
  exports: [BankMutationService]
})
export class BankMutationModule {}
