import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ProductsModule } from './products/products.module';
import { BanksModule } from './banks/banks.module';
import { FinanceModule } from './finance/finance.module';
import { BankMutationModule } from './finance/bank-mutation/bank-mutation.module';
import { AccountPayableModule } from './finance/ap/account-payable.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    SuppliersModule,
    ProductsModule,
    BanksModule,
    FinanceModule,
    BankMutationModule,
    AccountPayableModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
