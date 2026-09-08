import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { BoqsService } from './boqs.service';
import { CreateBoqDto, ReplicateBoqDto, BoqIdsDto } from './dto/create-boq.dto';
import { UpdateBoqDto } from './dto/update-boq.dto';
import { BoqQueryDto } from './dto/boq-query.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('boqs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BoqsController {
  constructor(private readonly boqsService: BoqsService) {}

  @Post()
  @Permissions('boqs.create')
  create(@Body() createBoqDto: CreateBoqDto) {
    return this.boqsService.create(createBoqDto);
  }

  @Post('replicate')
  @Permissions('boqs.update')
  replicate(@Body() dto: ReplicateBoqDto) {
    return this.boqsService.replicate(dto.boqIds, dto.proposalId);
  }

  @Post('unbind')
  @Permissions('boqs.update')
  unbind(@Body() dto: BoqIdsDto) {
    return this.boqsService.unbind(dto.boqIds);
  }

  @Post('bulk-delete')
  @Permissions('boqs.delete')
  removeMany(@Body() dto: BoqIdsDto) {
    return this.boqsService.removeMany(dto.boqIds);
  }

  @Get()
  @Permissions('boqs.index')
  findAll(@Query() query: BoqQueryDto) {
    return this.boqsService.findAll(query);
  }

  @Get(':id')
  @Permissions('boqs.show')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.boqsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('boqs.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateBoqDto: UpdateBoqDto) {
    return this.boqsService.update(id, updateBoqDto);
  }

  @Delete(':id')
  @Permissions('boqs.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.boqsService.remove(id);
  }
}
