import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { GOOGLE_CHAT_WEBHOOK, TELEGRAM_CHAT, TELEGRAM_TOKEN } from '../senders';

/** Sama dengan enum NotificationChannelType di schema.prisma (pola yang sama dengan PdfTemplateTypeDto). */
export enum NotificationChannelTypeDto {
  TELEGRAM = 'TELEGRAM',
  GOOGLE_CHAT = 'GOOGLE_CHAT',
}

/**
 * Kredensial sesuai jenis channel. Di create, yang sesuai jenisnya wajib (dicek
 * di service); di update, yang dikosongkan berarti "tetap".
 */
class Credentials {
  @IsOptional()
  @IsString()
  @Matches(TELEGRAM_TOKEN, { message: 'Bot token should look like 123456789:ABC... (from @BotFather).' })
  telegramBotToken?: string;

  @IsOptional()
  @IsString()
  @Matches(TELEGRAM_CHAT, { message: 'Chat ID should be a number (groups start with -100) or @channelname.' })
  telegramChatId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(GOOGLE_CHAT_WEBHOOK, { message: 'Webhook URL should start with https://chat.googleapis.com/v1/spaces/.' })
  googleChatWebhookUrl?: string;
}

export class CreateNotificationChannelDto extends Credentials {
  @IsEnum(NotificationChannelTypeDto)
  type: NotificationChannelTypeDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Jenis channel tidak bisa diubah; buat channel baru untuk jenis lain. */
export class UpdateNotificationChannelDto extends Credentials {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
