import { Module } from '@nestjs/common';
import { PdfTemplatesService } from './pdf-templates.service';
import { PdfTemplatesController } from './pdf-templates.controller';
import { DocumentPrintService } from './document-print.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PdfTemplatesController],
  providers: [PdfTemplatesService, DocumentPrintService],
  // The invoice and proposal print endpoints resolve the active template here.
  exports: [PdfTemplatesService, DocumentPrintService],
})
export class PdfTemplatesModule {}
