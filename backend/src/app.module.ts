import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ProductsModule } from './products/products.module';
import { BanksModule } from './banks/banks.module';
import { FinanceReportModule } from './finance/finance-report/finance-report.module';
import { BankMutationModule } from './finance/bank-mutation/bank-mutation.module';
import { AccountPayableModule } from './finance/account-payable/account-payable.module';
import { AccountReceivableModule } from './finance/account-receivable/account-receivable.module';
import { DepreciationModule } from './finance/depreciation/depreciation.module';
import { SalesModule } from './finance/sales/sales.module';

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
    FinanceReportModule,
    BankMutationModule,
    AccountPayableModule,
    AccountReceivableModule,
    DepreciationModule,
    SalesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
