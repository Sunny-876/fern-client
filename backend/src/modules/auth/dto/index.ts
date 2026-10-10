import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  email: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,20}$/, {
    message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.',
  })
  username: string;

  @IsString()
  @Length(8, 100, { message: 'Password must be between 8 and 100 characters long.' })
  password: string;

  @IsString()
  @IsOptional()
  @Length(2, 32, { message: 'Display name must be between 2 and 32 characters long.' })
  displayName?: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Username or email is required.' })
  loginIdentifier: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;

  @IsString()
  @IsOptional()
  deviceInfo?: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Verification token is required.' })
  token: string;
}

export class RequestPasswordResetDto {
  @IsString()
  @IsNotEmpty({ message: 'Email or username is required.' })
  emailOrUsername: string;
}

export class ConfirmPasswordResetDto {
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required.' })
  token: string;

  @IsString()
  @Length(8, 100, { message: 'New password must be between 8 and 100 characters long.' })
  newPassword: string;
}

export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required to confirm account deletion.' })
  password: string;
}
