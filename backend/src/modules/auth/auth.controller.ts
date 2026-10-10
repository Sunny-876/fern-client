import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EmailService } from '../email/email.service';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  RequestPasswordResetDto,
  ConfirmPasswordResetDto,
  DeleteAccountDto,
} from './dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const ua = req.headers['user-agent'];
    const data = await this.authService.register(dto, ip, ua);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const ua = req.headers['user-agent'];
    const data = await this.authService.login(dto, ip, ua);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('sessionId') sessionId: string, @CurrentUser('userId') userId: string, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const data = await this.authService.logout(sessionId, userId, ip);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser('userId') userId: string) {
    const data = await this.authService.getMe(userId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async listSessions(
    @CurrentUser('userId') userId: string,
    @CurrentUser('sessionId') sessionId: string,
  ) {
    const data = await this.authService.listSessions(userId, sessionId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  async revokeSession(
    @CurrentUser('userId') userId: string,
    @Param('id') sessionIdToRevoke: string,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const data = await this.authService.revokeSession(userId, sessionIdToRevoke, ip);
    return { success: true, data, timestamp: Date.now() };
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  async revokeOtherSessions(
    @CurrentUser('userId') userId: string,
    @CurrentUser('sessionId') sessionId: string,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const data = await this.authService.revokeAllOtherSessions(userId, sessionId, ip);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const data = await this.authService.verifyEmail(dto, ip);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get('dev-token')
  async getDevToken(@Query('email') email: string) {
    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'Endpoint unavailable in production.' };
    }
    const token = this.emailService.getLatestDevToken(email);
    return { success: true, data: { email, token }, timestamp: Date.now() };
  }

  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const data = await this.authService.requestPasswordReset(dto, ip);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const data = await this.authService.confirmPasswordReset(dto, ip);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('delete-account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @CurrentUser('userId') userId: string,
    @Body() dto: DeleteAccountDto,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const data = await this.authService.deleteAccount(userId, dto, ip);
    return { success: true, data, timestamp: Date.now() };
  }
}
