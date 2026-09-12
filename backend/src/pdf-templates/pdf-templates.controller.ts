import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { PdfTemplatesService } from './pdf-templates.service';
import { CreatePdfTemplateDto } from './dto/create-pdf-template.dto';
import { UpdatePdfTemplateDto } from './dto/update-pdf-template.dto';
import { PreviewPdfTemplateDto } from './dto/preview-pdf-template.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Controller('pdf-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PdfTemplatesController {
  constructor(private readonly pdfTemplatesService: PdfTemplatesService) {}

  @Post()
  @Permissions('pdf-templates.create')
  create(@Body() createDto: CreatePdfTemplateDto) {
    return this.pdfTemplatesService.create(createDto);
  }

  @Get()
  @Permissions('pdf-templates.index')
  findAll(@Query() query: PaginationQueryDto & { type?: string }) {
    return this.pdfTemplatesService.findAll(query);
  }

  // Before ':id' so the literal path is not captured by the param route.
  @Post('preview')
  @Permissions('pdf-templates.index')
  preview(@Body() previewDto: PreviewPdfTemplateDto) {
    return this.pdfTemplatesService.preview(previewDto.htmlContent, previewDto.data);
  }

  @Get(':id')
  @Permissions('pdf-templates.show')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pdfTemplatesService.findOne(id);
  }

  @Patch(':id')
  @Permissions('pdf-templates.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdatePdfTemplateDto) {
    return this.pdfTemplatesService.update(id, updateDto);
  }

  @Delete(':id')
  @Permissions('pdf-templates.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pdfTemplatesService.remove(id);
  }
}
