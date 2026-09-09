import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query, Res } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { ProposalQueryDto } from './dto/proposal-query.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Response } from 'express';
import { DocumentPrintService } from '../pdf-templates/document-print.service';

@Controller('proposals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProposalsController {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly printService: DocumentPrintService,
  ) {}

  /**
   * Returns a standalone printable page rather than JSON: it is opened in a
   * new tab, where the browser's print dialog saves it as PDF.
   */
  @Get(':id/print')
  @Permissions('proposals.show')
  async print(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const html = await this.printService.printProposal(id);
    res.type('html').send(html);
  }

  @Post()
  @Permissions('proposals.create')
  create(@Body() createProposalDto: CreateProposalDto) {
    return this.proposalsService.create(createProposalDto);
  }

  @Get()
  @Permissions('proposals.index')
  findAll(@Query() query: ProposalQueryDto) {
    return this.proposalsService.findAll(query);
  }

  @Get(':id')
  @Permissions('proposals.show')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.proposalsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('proposals.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateProposalDto: UpdateProposalDto) {
    return this.proposalsService.update(id, updateProposalDto);
  }

  @Delete(':id')
  @Permissions('proposals.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.proposalsService.remove(id);
  }
}
