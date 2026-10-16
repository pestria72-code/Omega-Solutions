import { Controller, Post, Get, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto, RefreshDto, NeonExchangeDto } from './dto/auth.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from './interfaces/authenticated-user.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register() {
    throw new BadRequestException('Please register through the email verification flow.');
  }

  @Post('neon/exchange')
  async exchangeNeonIdentity(@Body() dto: NeonExchangeDto) {
    return this.authService.exchangeNeonIdentity(dto);
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
