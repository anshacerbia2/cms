"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let TransformInterceptor = class TransformInterceptor {
    intercept(context, next) {
        const status = context.switchToHttp().getResponse().statusCode;
        return next.handle().pipe((0, operators_1.map)((data) => ({
            data: this.transformBigInt(data),
            statusCode: status,
        })));
    }
    transformBigInt(data) {
        if (data === null || data === undefined)
            return data;
        if (typeof data === 'bigint')
            return data.toString();
        if (Array.isArray(data))
            return data.map((item) => this.transformBigInt(item));
        if (typeof data === 'object') {
            const obj = {};
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    obj[key] = this.transformBigInt(data[key]);
                }
            }
            return obj;
        }
        return data;
    }
};
exports.TransformInterceptor = TransformInterceptor;
exports.TransformInterceptor = TransformInterceptor = __decorate([
    (0, common_1.Injectable)()
], TransformInterceptor);
//# sourceMappingURL=transform.interceptor.js.map