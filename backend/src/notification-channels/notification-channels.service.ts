import { BadGatewayException, BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationChannelType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationChannelDto, UpdateNotificationChannelDto } from './dto/notification-channel.dto';
import { decryptSecret, encryptSecret, MissingSecretKeyError } from './notification-secret';
import { ChannelSecret, GoogleChatSecret, hintFor, send, SendError, TelegramSecret } from './senders';

type ActiveChannel = { id: bigint; name: string; type: NotificationChannelType; secret: ChannelSecret };

/** Yang dikirim ke browser: tanpa `secret`. */
const toView = (c: NotificationChannel) => ({
  id: c.id.toString(),
  type: c.type,
  name: c.name,
  hint: c.hint,
  isActive: c.isActive,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

/**
 * Channel notifikasi untuk alert keamanan, diatur dari Settings >
 * Notification Channels.
 *
 * `broadcast` dipanggil SecurityEvents saat akun terkunci atau IP dibatasi.
 * Channel aktif dibaca sekali lalu disimpan di memori sampai ada perubahan
 * (backend berjalan sebagai satu proses), jadi alert tidak menambah query.
 */
@Injectable()
export class NotificationChannelsService {
  private readonly logger = new Logger('Notifications');
  private active: ActiveChannel[] | null = null;

  constructor(private prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.notificationChannel.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] });
    return rows.map(toView);
  }

  async create(dto: CreateNotificationChannelDto) {
    const secret = this.secretFrom(dto.type, dto, null);
    const row = await this.prisma.notificationChannel.create({
      data: {
        type: dto.type,
        name: dto.name.trim(),
        isActive: dto.isActive ?? true,
        secret: this.encrypt(secret),
        hint: hintFor(dto.type, secret),
      },
    });
    this.active = null;
    return toView(row);
  }

  async update(id: number, dto: UpdateNotificationChannelDto) {
    const row = await this.find(id);
    const touchesSecret = !!(dto.telegramBotToken || dto.telegramChatId || dto.googleChatWebhookUrl);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (touchesSecret) {
      const secret = this.secretFrom(row.type, dto, this.decrypt(row));
      data.secret = this.encrypt(secret);
      data.hint = hintFor(row.type, secret);
    }
    const saved = await this.prisma.notificationChannel.update({ where: { id: row.id }, data });
    this.active = null;
    return toView(saved);
  }

  async remove(id: number) {
    const row = await this.find(id);
    await this.prisma.notificationChannel.delete({ where: { id: row.id } });
    this.active = null;
    return { message: 'Notification channel deleted' };
  }

  /** Pesan uji ke satu channel, aktif atau tidak. Kegagalan dikembalikan sebagai 502 dengan keterangannya. */
  async test(id: number, requestedBy: string) {
    const row = await this.find(id);
    try {
      await send(row.type, this.decrypt(row), `PCMI Admin: test message for "${row.name}", sent by ${requestedBy}.`);
    } catch (err) {
      if (err instanceof SendError) throw new BadGatewayException(`The message was not delivered: ${err.message}`);
      throw err;
    }
    return { message: 'Test message sent' };
  }

  /**
   * Kirim ke semua channel aktif. Tidak pernah melempar: kegagalan dicatat di
   * log (tanpa kredensial) dan tidak boleh mengganggu yang memanggil.
   */
  async broadcast(text: string): Promise<void> {
    let channels: ActiveChannel[];
    try {
      channels = await this.activeChannels();
    } catch (err) {
      this.logger.error(`Could not load notification channels: ${(err as Error).message}`);
      return;
    }
    await Promise.all(
      channels.map(async (c) => {
        try {
          await send(c.type, c.secret, text);
        } catch (err) {
          const reason = err instanceof SendError ? err.message : 'unexpected error';
          this.logger.error(`Alert to "${c.name}" (${c.type}) failed: ${reason}`);
        }
      }),
    );
  }

  private async activeChannels(): Promise<ActiveChannel[]> {
    if (this.active) return this.active;
    const rows = await this.prisma.notificationChannel.findMany({ where: { isActive: true } });
    const out: ActiveChannel[] = [];
    for (const r of rows) {
      try {
        out.push({ id: r.id, name: r.name, type: r.type, secret: this.decrypt(r) });
      } catch (err) {
        this.logger.error(`Notification channel "${r.name}" cannot be decrypted: ${(err as Error).message}`);
      }
    }
    this.active = out;
    return out;
  }

  private async find(id: number) {
    const row = await this.prisma.notificationChannel.findUnique({ where: { id: BigInt(id) } });
    if (!row) throw new NotFoundException('Notification channel not found');
    return row;
  }

  /** Kredensial lengkap dari isian, ditambah yang lama untuk bagian yang dikosongkan. */
  private secretFrom(
    type: NotificationChannelType,
    dto: CreateNotificationChannelDto | UpdateNotificationChannelDto,
    current: ChannelSecret | null,
  ): ChannelSecret {
    if (type === 'TELEGRAM') {
      const was = current as TelegramSecret | null;
      const botToken = dto.telegramBotToken?.trim() || was?.botToken;
      const chatId = dto.telegramChatId?.trim() || was?.chatId;
      if (!botToken || !chatId) throw new BadRequestException('Telegram needs both a bot token and a chat ID.');
      if (dto.googleChatWebhookUrl) throw new BadRequestException('A Telegram channel has no webhook URL.');
      return { botToken, chatId };
    }
    const webhookUrl = dto.googleChatWebhookUrl?.trim() || (current as GoogleChatSecret | null)?.webhookUrl;
    if (!webhookUrl) throw new BadRequestException('Google Chat needs a webhook URL.');
    if (dto.telegramBotToken || dto.telegramChatId) throw new BadRequestException('A Google Chat channel has no bot token or chat ID.');
    return { webhookUrl };
  }

  private encrypt(secret: ChannelSecret) {
    try {
      return encryptSecret(secret);
    } catch (err) {
      if (err instanceof MissingSecretKeyError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  private decrypt(row: NotificationChannel): ChannelSecret {
    try {
      return decryptSecret<ChannelSecret>(row.secret);
    } catch (err) {
      if (err instanceof MissingSecretKeyError) throw new BadRequestException(err.message);
      throw new BadRequestException('The stored credentials cannot be read (was NOTIFICATION_SECRET_KEY changed?). Enter them again.');
    }
  }
}
