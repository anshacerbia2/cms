import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query, 
  UseGuards, 
  ParseIntPipe 
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, CreateProductCategoryDto, UpdateProductCategoryDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // --- CATEGORIES ---

  @Post('categories')
  @Permissions('product-categories.create')
  createCategory(@Body() dto: CreateProductCategoryDto) {
    return this.productsService.createCategory(dto);
  }

  @Get('categories')
  @Permissions('product-categories.index')
  findAllCategories(@Query() query: PaginationQueryDto) {
    return this.productsService.findAllCategories(query);
  }

  @Get('categories/:id')
  @Permissions('product-categories.index')
  findOneCategory(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOneCategory(id);
  }

  @Patch('categories/:id')
  @Permissions('product-categories.update')
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.productsService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Permissions('product-categories.delete')
  removeCategory(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.removeCategory(id);
  }

  // --- PRODUCTS ---

  @Post()
  @Permissions('products.create')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @Permissions('products.index')
  findAll(@Query() query: PaginationQueryDto & { categoryId?: string }) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @Permissions('products.show')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @Patch(':id')
  @Permissions('products.update')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.productsService.update(+id, dto);
  }

  @Delete(':id')
  @Permissions('products.delete')
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }
}
