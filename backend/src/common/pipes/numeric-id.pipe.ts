import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

/**
 * Untuk ID yang service-nya menerima string (lalu BigInt(...) sendiri): menolak
 * apa pun selain bilangan bulat positif dengan 400, alih-alih BigInt('abc')
 * meledak jadi 500 (pentest N-02). Nilai tetap diteruskan sebagai string.
 * Kosong/tidak ada = undefined, supaya bisa dipakai untuk query opsional.
 */
@Injectable()
export class NumericIdPipe implements PipeTransform<
  string | undefined,
  string | undefined
> {
  transform(
    value: string | undefined,
    metadata: ArgumentMetadata,
  ): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (!/^\d{1,19}$/.test(String(value))) {
      throw new BadRequestException(
        `${metadata.data ?? 'id'} must be a positive whole number`,
      );
    }
    return String(value);
  }
}

/** Sama dengan NumericIdPipe, tetapi nilai kosong/tidak ada juga ditolak 400. */
@Injectable()
export class RequiredNumericIdPipe extends NumericIdPipe {
  transform(value: string | undefined, metadata: ArgumentMetadata): string {
    const id = super.transform(value, metadata);
    if (id === undefined)
      throw new BadRequestException(`${metadata.data ?? 'id'} is required`);
    return id;
  }
}
