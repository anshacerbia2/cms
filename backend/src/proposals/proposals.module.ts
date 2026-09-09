import { Module } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { ProposalsController } from './proposals.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfTemplatesModule } from '../pdf-templates/pdf-templates.module';

@Module({
  imports: [PrismaModule, PdfTemplatesModule],
  controllers: [ProposalsController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
