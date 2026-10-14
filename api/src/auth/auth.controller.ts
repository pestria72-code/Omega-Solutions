import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto, LoginDto, RefreshDto } from './dto/auth.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from './interfaces/authenticated-user.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: { user: AuthenticatedUser }) {
    return req.user;
  }
}
