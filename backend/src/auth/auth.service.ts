import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    // Flatten permissions: role -> rolePermissions -> permission -> route
    const permissions = user.role?.permissions?.map((rp: any) => rp.permission?.route) || [];

    // Format Menus Hierarchically
    const roleMenus = user.role?.menus || [];
    const allMenus = roleMenus.map((rm: any) => ({
      ...rm.menu,
      id: rm.menu.id.toString(),
      parentId: rm.menu.parentId?.toString(),
      permissionId: rm.menu.permissionId?.toString(),
      permissionRoute: rm.menu.permission?.route
    }));

    const parentMenus = allMenus
      .filter((m: any) => !m.parentId && m.isVisible)
      .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
      .map((parent: any) => ({
        group: parent.name,
        icon: parent.icon,
        items: allMenus
          .filter((m: any) => m.parentId === parent.id && m.isVisible)
          .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
          .map((child: any) => ({
            title: child.name,
            icon: child.icon,
            url: `/${child.permissionRoute?.replace('.', '/')}`
          }))
      }));

    // URL overrides for specific menus if needed
    parentMenus.forEach((group: any) => {
      group.items.forEach((item: any) => {
        if (item.title === 'Dashboard') item.url = '/dashboard';
        if (item.title === 'Account Ledger' || item.title === 'Bank Mutation') {
          item.title = 'Bank Mutation';
          item.url = '/finance/bank-mutation';
        }
        if (item.title === 'Customers') item.url = '/customers';
        if (item.title === 'Suppliers') item.url = '/suppliers';
        if (item.title === 'Products') item.url = '/products';
        if (item.title === 'Staff') item.url = '/users';
        if (item.title === 'Accounts & Banks') {
          item.url = '/banks';
        }
        if (item.title === 'Financial Reports') {
          item.url = '/finance';
        }
      });
    });

    console.log(`Generated ${parentMenus.length} menu groups for user ${user.email}`);

    const payload = { 
      email: user.email, 
      sub: user.id.toString(),
      role: user.role?.slug,
      permissions
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role?.name,
        permissions,
        menus: parentMenus
      }
    };
  }
}
