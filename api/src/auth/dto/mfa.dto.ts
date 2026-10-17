import { IsString, MinLength, MaxLength } from 'class-validator';

export class MfaCodeDto {
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  code!: string;
}

export class MfaChallengeDto extends MfaCodeDto {
  @IsString()
  @MinLength(20)
  @MaxLength(8192)
  challengeToken!: string;
}
