import { PrismaClient } from '@prisma/client';

export async function seedSuppliers(prisma: PrismaClient) {
  console.log('🚚 Seeding legacy suppliers...');
  
  const legacySuppliers = [
    { name: 'PT Maju Teknologi', address: 'Jl. Gatot Subroto No. 123, Jakarta Selatan, DKI Jakarta 12930', contactPerson: 'Budi Santoso', phone: '021-5550123', email: 'budi@majuteknologi.com', taxNumber: '01.234.567.8-123.000', bankName: 'Bank Central Asia (BCA)', bankAccountNumber: '1234567890', bankAccountName: 'PT Maju Teknologi', notes: 'Supplier utama untuk perangkat IT dan software' },
    { name: 'CV Sukses Mandiri', address: 'Jl. Sudirman No. 456, Jakarta Pusat, DKI Jakarta 12190', contactPerson: 'Siti Aminah', phone: '021-5550456', email: 'siti@suksesmandiri.co.id', taxNumber: '02.345.678.9-234.000', bankName: 'Bank Mandiri', bankAccountNumber: '0987654321', bankAccountName: 'CV Sukses Mandiri', notes: 'Supplier untuk jasa konsultasi dan training' },
    { name: 'PT Global Solutions', address: 'Jl. Thamrin No. 789, Jakarta Pusat, DKI Jakarta 10350', contactPerson: 'Ahmad Rizki', phone: '021-5550789', email: 'ahmad@globalsolutions.com', taxNumber: '03.456.789.0-345.000', bankName: 'Bank Negara Indonesia (BNI)', bankAccountNumber: '1122334455', bankAccountName: 'PT Global Solutions', notes: 'Supplier untuk solusi enterprise dan cloud services' },
    { name: 'UD Makmur Jaya', address: 'Jl. Hayam Wuruk No. 321, Jakarta Barat, DKI Jakarta 11160', contactPerson: 'Dewi Sartika', phone: '021-5550112', email: 'dewi@makmurjaya.com', taxNumber: '04.567.890.1-456.000', bankName: 'Bank Rakyat Indonesia (BRI)', bankAccountNumber: '5544332211', bankAccountName: 'UD Makmur Jaya', notes: 'Supplier untuk perangkat keras dan komponen elektronik' },
    { name: 'PT Sejahtera Abadi', address: 'Jl. Asia Afrika No. 654, Bandung, Jawa Barat 40262', contactPerson: 'Rudi Hermawan', phone: '022-5550234', email: 'rudi@sejahteraabadi.co.id', taxNumber: '05.678.901.2-567.000', bankName: 'Bank Central Asia (BCA)', bankAccountNumber: '6677889900', bankAccountName: 'PT Sejahtera Abadi', notes: 'Supplier untuk furniture dan peralatan kantor' },
    { name: 'PT Dinamis Kreatif', address: 'Jl. Pemuda No. 147, Semarang, Jawa Tengah 50132', contactPerson: 'Eko Prasetyo', phone: '024-5550178', email: 'eko@dinamiskreatif.com', taxNumber: '07.890.123.4-789.000', bankName: 'Bank Negara Indonesia (BNI)', bankAccountNumber: '8899001122', bankAccountName: 'PT Dinamis Kreatif', notes: 'Supplier untuk jasa kreatif dan digital marketing' },
    { name: 'PT Inovasi Digital', address: 'Jl. Sudirman No. 258, Medan, Sumatera Utara 20112', contactPerson: 'Maya Sari', phone: '061-5550258', email: 'maya@inovasidigital.com', taxNumber: '08.901.234.5-890.000', bankName: 'Bank Central Asia (BCA)', bankAccountNumber: '9900112233', bankAccountName: 'PT Inovasi Digital', notes: 'Supplier untuk layanan digital dan e-commerce' },
  ];

  for (const s of legacySuppliers) {
    // We use a deterministic logic for codes if they exist, or upsert by name if unique... 
    // but schema says code is unique. For seeding, let's use a mapping or derived code.
    const derivedCode = `SUP-${s.name.replace(/\s+/g, '-').toUpperCase().slice(0, 10)}`;
    
    await prisma.supplier.upsert({
      where: { code: derivedCode },
      update: {},
      create: { 
        ...s, 
        code: derivedCode,
        status: 'Active'
      } as any,
    });
  }
  
  console.log('✅ Suppliers seeding completed.');
}
