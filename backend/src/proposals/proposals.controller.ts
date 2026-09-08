import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { ProposalQueryDto } from './dto/proposal-query.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('proposals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

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
