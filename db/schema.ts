import { relations } from 'drizzle-orm'
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

/**
 * =========================================
 * 1. ENUMS (DEFINISI TIPE DATA TERBATAS)
 * =========================================
 * Mengunci nilai input agar konsisten di level database.
 */

// Peran user dalam sistem (Authorization Level)
export const userRoleEnum = pgEnum('roles', [
  'super_admin', // Akses penuh sistem & konfigurasi
  'warehouse_staff', // Petugas Gudang (Inbound/Outbound/Stock Opname)
  'faculty_admin', // Level Dekanat/WD2 (Approval pengadaan besar)
  'unit_admin', // Level Kajur/Kaprodi (Approval permintaan ruangan)
  'unit_staff', // Level Dosen/Laboran/TU (Request barang & Scan QR)
])

// Jenis Ruangan (Menentukan barang apa yang boleh ada di sana)
export const roomTypeEnum = pgEnum('room_type', [
  'LABORATORY', // Boleh simpan Zat Kimia & Alat Praktikum
  'ADMIN_OFFICE', // Ruang TU/Dosen (Hanya ATK & Furniture)
  'LECTURE_HALL', // Ruang Kelas (Furniture & Elektronik Kelas)
  'WAREHOUSE_UNIT', // Gudang kecil transit milik jurusan
])

// Jenis Gudang Utama
export const warehouseTypeEnum = pgEnum('warehouse_type', [
  'CHEMICAL', // Gudang khusus B3 / Zat Kimia (Perlu penanganan khusus)
  'GENERAL_ATK', // Gudang Umum (Kertas, Spidol, Alat Kebersihan)
])

// Status Permintaan Barang (Flow Distribusi)
export const requestStatusEnum = pgEnum('request_status', [
  'PENDING_UNIT', // Baru dibuat, menunggu ACC Kajur
  'PENDING_FACULTY', // Lolos Kajur, menunggu ACC Dekanat (jika nominal besar)
  'APPROVED', // Disetujui semua pihak, masuk antrian gudang
  'PROCESSING', // Gudang sedang packing barang
  'READY_TO_PICKUP', // Barang sudah dipacking, siap diambil user
  'COMPLETED', // Barang diterima user & stok pindah ke ruangan
  'REJECTED', // Ditolak atasan
  'CANCELED', // Dibatalkan user sendiri
])

// Status Pengadaan Barang (Flow Pembelian)
export const procurementStatusEnum = pgEnum('procurement_status', [
  'PENDING', // Draft pengajuan
  'APPROVED', // Disetujui anggaran
  'REJECTED', // Ditolak
  'COMPLETED', // Barang dari vendor sudah diterima Gudang
])

// Jenis Penyesuaian Stok (Audit Trail)
export const adjustmentTypeEnum = pgEnum('adjustment_type', [
  'STOCK_OPNAME', // Rutin: Cek fisik vs sistem
  'DAMAGE', // Insidental: Barang rusak/pecah
  'LOSS', // Insidental: Barang hilang
  'CORRECTION', // Admin: Salah input data sebelumnya
])

// Kondisi Fisik Aset Tetap
export const assetConditionEnum = pgEnum('asset_condition', [
  'GOOD', // Baik
  'MINOR_DAMAGE', // Rusak Ringan (masih bisa pakai)
  'MAJOR_DAMAGE', // Rusak Berat (perlu servis)
  'BROKEN', // Hancur (perlu penghapusan)
  'LOST', // Hilang
  'MAINTENANCE', // Sedang diservis
])

// Kondisi Penerimaan Barang (Quality Control Inbound)
export const receiptConditionEnum = pgEnum('receipt_condition', [
  'GOOD', // Diterima baik
  'DAMAGED', // Rusak saat pengiriman
  'INCOMPLETE', // Jumlah/Part kurang
])

/**
 * =========================================
 * 2. AUTHENTICATION & USER MANAGEMENT
 * =========================================
 * Menggunakan struktur standar (kompatibel dengan NextAuth/Better-Auth).
 */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  role: userRoleEnum('role').default('unit_staff'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),

  facultyId: text('faculty_id').references(() => faculties.id), // Diisi HANYA jika role = faculty_admin
  unitId: text('unit_id').references(() => units.id), // Diisi jika role = unit_admin / unit_staff
  warehouseId: text('warehouse_id').references(() => warehouses.id), // Diisi jika role = warehouse_staff
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    impersonatedBy: text('impersonated_by'),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

/**
 * =========================================
 * 3. ORGANIZATIONAL STRUCTURE
 * =========================================
 * Hierarki: Faculty (Fakultas) -> Unit (Jurusan/Prodi) -> Rooms (Ruangan).
 * Warehouse (Gudang) berdiri terpisah di bawah Fakultas.
 */

export const faculties = pgTable('faculties', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // Contoh: "Fakultas MIPA"
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const units = pgTable(
  'units',
  {
    id: text('id').primaryKey(),
    facultyId: text('faculty_id').references(() => faculties.id),
    name: text('name').notNull(), // Contoh: "Jurusan Biologi"
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('units_faculty_id_idx').on(table.facultyId)],
)

export const rooms = pgTable(
  'rooms',
  {
    id: text('id').primaryKey(),
    unitId: text('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),

    name: text('name').notNull(), // Contoh: "Lab Mikrobiologi 1"
    type: roomTypeEnum('type').default('LECTURE_HALL').notNull(),
    qrToken: text('qr_token').unique(), // QR yang ditempel di ruangan

    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('rooms_unit_id_idx').on(table.unitId),
    index('rooms_qr_token_idx').on(table.qrToken),
  ],
)

export const warehouses = pgTable('warehouses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // Contoh: "Gudang Bahan Kimia A"
  type: warehouseTypeEnum('type').notNull(), // Membedakan SOP penyimpanan
  facultyId: text('faculty_id').references(() => faculties.id),
  description: text('description'),
})

/**
 * =========================================
 * 4. CATALOG (DEFINISI PRODUK - MASTER DATA)
 * =========================================
 * Ini adalah "Katalog", bukan stok fisik.
 * Mendefinisikan barang apa saja yang BISA ada di sistem.
 */

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // e.g. "Alat Gelas", "Bahan Kimia Padat", "Elektronik"
})

// A. BARANG HABIS PAKAI (Consumables)
// Barang yang stoknya berkurang saat dipakai (Kertas, Alkohol, H2SO4)
export const consumables = pgTable('consumables', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => categories.id),

  name: text('name').notNull(),
  sku: text('sku').unique(), // Stock Keeping Unit (Kode Barang)

  baseUnit: text('base_unit').notNull(), // Satuan terkecil (Liter, Pcs, Rim)
  minimumStock: integer('minimum_stock').default(10), // Trigger notifikasi jika stok tipis

  hasExpiry: boolean('has_expiry').default(false).notNull(), // Apakah butuh tracking kadaluarsa?
  image: text('image'),
  description: text('description'),

  isActive: boolean('is_active').default(true), // Soft delete
  createdAt: timestamp('created_at').defaultNow(),
})

// B. KATALOG MODEL ASET (Asset Models)
// Definisi spesifikasi alat (Bukan unit fisiknya).
// Contoh: "Mikroskop Olympus CX-23" (Definisi) vs "Mikroskop #001 di Lab A" (Fisik)
export const assetModels = pgTable('asset_models', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => categories.id),

  name: text('name').notNull(),
  manufacturer: text('manufacturer'),
  modelNumber: text('model_number'),

  image: text('image'),
  description: text('description'),

  createdAt: timestamp('created_at').defaultNow(),
})

/**
 * =========================================
 * 5. INVENTORY & STOCKS (DATA FISIK)
 * =========================================
 * Menghubungkan Katalog dengan Lokasi (Gudang/Ruangan).
 */

// A. STOK GUDANG (Source of Truth)
// Menyimpan jumlah consumable yang siap didistribusikan.
export const warehouseStocks = pgTable(
  'warehouse_stocks',
  {
    id: text('id').primaryKey(),
    warehouseId: text('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    consumableId: text('consumable_id')
      .notNull()
      .references(() => consumables.id),

    quantity: decimal('quantity', { precision: 10, scale: 2 }).default('0'),

    // Tracking Batch & Kadaluarsa (Critical untuk Gudang Kimia)
    batchNumber: text('batch_number'),
    expiryDate: timestamp('expiry_date'),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('ws_wh_item_idx').on(table.warehouseId, table.consumableId),
    index('ws_expiry_idx').on(table.expiryDate),
  ],
)

// B. STOK RUANGAN (Distributed Items)
// Menyimpan jumlah consumable yang sudah ada di Lab/TU dan sedang dipakai.
export const roomConsumables = pgTable(
  'room_consumables',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    consumableId: text('consumable_id')
      .notNull()
      .references(() => consumables.id),

    quantity: decimal('quantity', { precision: 10, scale: 2 }).default('0').notNull(),

    // Penting untuk tracking experiment lab (Batch mana yang dipakai?)
    batchNumber: text('batch_number'),
    expiryDate: timestamp('expiry_date'),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('rc_room_item_idx').on(table.roomId, table.consumableId)],
)

// C. INVENTARIS ASET TETAP (Unique Items)
// Setiap baris adalah 1 unit fisik dengan QR Code unik.
export const fixedAssets = pgTable(
  'fixed_assets',
  {
    id: text('id').primaryKey(),
    modelId: text('model_id')
      .notNull()
      .references(() => assetModels.id),

    /**
     * [HYBRID LOCATION LOGIC]
     * Aset bisa berada di Ruangan (Lab/Kelas) ATAU di Gudang.
     * Salah satu kolom ini harus terisi.
     */
    roomId: text('room_id').references(() => rooms.id), // e.g. Mikroskop di Lab
    warehouseId: text('warehouse_id').references(() => warehouses.id), // e.g. Rak Besi di Gudang

    qrToken: text('qr_token').notNull().unique(), // Data yang tersimpan di QR Code fisik
    serialNumber: text('serial_number'), // SN dari pabrik

    condition: assetConditionEnum('condition').default('GOOD').notNull(),

    // Data Akuntansi / Depresiasi
    procurementYear: integer('procurement_year'),
    price: decimal('price', { precision: 15, scale: 2 }),
    purchaseDate: date('purchase_date'),

    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('fa_room_idx').on(table.roomId),
    index('fa_warehouse_idx').on(table.warehouseId),
    index('fa_qr_idx').on(table.qrToken),
  ],
)

/**
 * =========================================
 * 6. REQUEST & TIMELINE (DISTRIBUSI)
 * =========================================
 * Flow User meminta barang dari Gudang ke Ruangan.
 */

export const requests = pgTable('requests', {
  id: text('id').primaryKey(),
  requestCode: text('request_code').notNull().unique(), // e.g. "REQ/2024/001"

  requesterId: text('requester_id')
    .notNull()
    .references(() => user.id),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id), // Barang ini untuk ruangan mana?

  // Gudang mana yang harus memproses? (Kimia vs ATK)
  targetWarehouseId: text('target_warehouse_id').references(() => warehouses.id),

  status: requestStatusEnum('status').default('PENDING_UNIT'),
  rejectionReason: text('rejection_reason'),

  // Tracking Approval
  approvedByUnitId: text('approved_by_unit_id').references(() => user.id), // ACC Kajur
  approvedByFacultyId: text('approved_by_faculty_id').references(() => user.id), // ACC Dekanat

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
})

// History status (Audit Trail Distribusi)
export const requestTimelines = pgTable('request_timelines', {
  id: text('id').primaryKey(),
  requestId: text('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),

  status: requestStatusEnum('status').notNull(),
  actorId: text('actor_id').references(() => user.id), // Siapa yang mengubah status?
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
})

// Detail barang apa saja yang diminta dalam 1 tiket request
export const requestItems = pgTable('request_items', {
  id: text('id').primaryKey(),
  requestId: text('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),
  consumableId: text('consumable_id')
    .notNull()
    .references(() => consumables.id),

  qtyRequested: decimal('qty_requested', { precision: 10, scale: 2 }).notNull(),
  qtyApproved: decimal('qty_approved', { precision: 10, scale: 2 }), // Admin bisa menyetujui sebagian (partial)
})

/**
 * =========================================
 * 7. PROCUREMENT & TIMELINE (PENGADAAN)
 * =========================================
 * Flow Admin membeli barang dari Vendor (Masuk ke Gudang/Ruangan).
 */

export const procurements = pgTable('procurements', {
  id: text('id').primaryKey(),
  procurementCode: text('procurement_code').notNull().unique(), // e.g. "PO/2024/10"

  userId: text('user_id')
    .notNull()
    .references(() => user.id), // Admin pembuat PO

  status: procurementStatusEnum('status').default('PENDING'),
  supplier: text('supplier'), // Nama Vendor
  proofDocument: text('proof_document'), // URL Faktur/Surat Jalan
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
})

// History status pengadaan
export const procurementTimelines = pgTable('procurement_timelines', {
  id: text('id').primaryKey(),
  procurementId: text('procurement_id')
    .notNull()
    .references(() => procurements.id, { onDelete: 'cascade' }),

  status: procurementStatusEnum('status').notNull(),
  actorId: text('actor_id').references(() => user.id),
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
})

// Detail BHP yang dibeli (Otomatis masuk Warehouse Stocks saat Completed)
export const procurementConsumables = pgTable('procurement_consumables', {
  id: text('id').primaryKey(),
  procurementId: text('procurement_id')
    .notNull()
    .references(() => procurements.id, { onDelete: 'cascade' }),
  consumableId: text('consumable_id')
    .notNull()
    .references(() => consumables.id),
  warehouseId: text('warehouse_id').references(() => warehouses.id), // Target Gudang

  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  pricePerUnit: decimal('price_per_unit', { precision: 15, scale: 2 }),

  batchNumber: text('batch_number'),
  expiryDate: timestamp('expiry_date'),
  condition: receiptConditionEnum('condition'),
})

// Detail Aset Tetap yang dibeli (Otomatis jadi Fixed Assets saat Completed)
export const procurementAssets = pgTable('procurement_assets', {
  id: text('id').primaryKey(),
  procurementId: text('procurement_id')
    .notNull()
    .references(() => procurements.id, { onDelete: 'cascade' }),
  modelId: text('model_id')
    .notNull()
    .references(() => assetModels.id),

  quantity: integer('quantity').notNull(), // Berapa unit dibeli?
  pricePerUnit: decimal('price_per_unit', { precision: 15, scale: 2 }),

  destinationRoomId: text('destination_room_id').references(() => rooms.id), // Langsung taruh ruangan?
})

/**
 * =========================================
 * 8. USAGE & ADJUSTMENTS (OPERASIONAL HARIAN)
 * =========================================
 * Pencatatan pemakaian barang, kerusakan, dan audit stok.
 */

// Laporan Pemakaian BHP di Ruangan (e.g. Praktikum Kimia Dasar)
export const usageReports = pgTable('usage_reports', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id), // Pelapor (Laboran/Asisten)
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id), // Terjadi di lab mana?

  activityName: text('activity_name').notNull(), // e.g. "Modul 1: Titrasi Asam Basa"
  evidenceFile: text('evidence_file'), // Foto kegiatan/Logbook
  createdAt: timestamp('created_at').defaultNow(),
})

export const usageDetails = pgTable('usage_details', {
  id: text('id').primaryKey(),
  reportId: text('report_id')
    .notNull()
    .references(() => usageReports.id, { onDelete: 'cascade' }),
  consumableId: text('consumable_id')
    .notNull()
    .references(() => consumables.id),

  qtyUsed: decimal('qty_used', { precision: 10, scale: 2 }).notNull(), // Mengurangi RoomConsumables
  batchNumber: text('batch_number'),
})

// 1. Adjustment / Stock Opname (BHP)
// Digunakan saat jumlah fisik != jumlah di sistem
export const consumableAdjustments = pgTable('consumable_adjustments', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id), // Siapa yang menghitung?

  consumableId: text('consumable_id')
    .notNull()
    .references(() => consumables.id),

  // Lokasi Adjustment (Gudang ATAU Ruangan)
  warehouseId: text('warehouse_id').references(() => warehouses.id),
  roomId: text('room_id').references(() => rooms.id),

  batchNumber: text('batch_number'),
  deltaQuantity: decimal('delta_quantity', { precision: 10, scale: 2 }).notNull(), // (+5 atau -2)

  type: adjustmentTypeEnum('type').default('STOCK_OPNAME'),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// 2. Audit Aset Tetap (Cek Kondisi & Posisi)
export const assetAudits = pgTable('asset_audits', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),

  fixedAssetId: text('fixed_asset_id')
    .notNull()
    .references(() => fixedAssets.id),

  previousCondition: assetConditionEnum('previous_condition').notNull(),
  newCondition: assetConditionEnum('new_condition').notNull(),

  // [LOCATION TRACKING]
  // Mencatat jika aset ditemukan di lokasi yang berbeda saat diaudit
  currentRoomId: text('current_room_id').references(() => rooms.id),
  currentWarehouseId: text('current_warehouse_id').references(() => warehouses.id),
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
})

/**
 * =========================================
 * 9. LOGGING (SYSTEM LOGS)
 * =========================================
 * Catatan teknis untuk debugging dan security audit.
 */

// Log Perubahan Data Sensitif (Siapa mengubah apa)
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => user.id),

  action: text('action').notNull(), // 'CREATE', 'UPDATE', 'DELETE'
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),

  // Snapshot JSON data sebelum & sesudah (Undo capability)
  oldValues: json('old_values'),
  newValues: json('new_values'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Log Aktivitas User (Login/Logout)
export const systemActivityLogs = pgTable('system_activity_logs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').references(() => user.id),
  actionType: text('action_type').notNull(), // 'LOGIN', 'EXPORT_REPORT'
  description: text('description'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metaData: json('meta_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/**
 * =========================================
 * 10. RELATIONS (DRIZZLE ORM)
 * =========================================
 * Mendefinisikan hubungan antar tabel untuk memudahkan query (with: { ... }).
 */

// --- ORGANIZATION ---
export const facultiesRelations = relations(faculties, ({ many }) => ({
  units: many(units),
  warehouses: many(warehouses),
  users: many(user),
}))

export const unitsRelations = relations(units, ({ one, many }) => ({
  faculty: one(faculties, { fields: [units.facultyId], references: [faculties.id] }),
  rooms: many(rooms),
  users: many(user),
}))

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  unit: one(units, { fields: [rooms.unitId], references: [units.id] }),
  consumables: many(roomConsumables), // Stok consumable di ruangan ini
  fixedAssets: many(fixedAssets), // Aset tetap yang ada di ruangan ini
  requests: many(requests),
  usageReports: many(usageReports),
}))

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  faculty: one(faculties, { fields: [warehouses.facultyId], references: [faculties.id] }),
  stocks: many(warehouseStocks), // Stok consumable di gudang ini
  fixedAssets: many(fixedAssets), // [NEW] Aset tetap (inventaris) milik gudang ini
}))

// --- CATALOG ---
export const consumablesRelations = relations(consumables, ({ one, many }) => ({
  category: one(categories, { fields: [consumables.categoryId], references: [categories.id] }),
  warehouseStocks: many(warehouseStocks),
  roomConsumables: many(roomConsumables),
}))

export const assetModelsRelations = relations(assetModels, ({ one, many }) => ({
  category: one(categories, { fields: [assetModels.categoryId], references: [categories.id] }),
  fixedAssets: many(fixedAssets), // Semua unit fisik dari model ini
}))

// --- INVENTORY ---
export const warehouseStocksRelations = relations(warehouseStocks, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [warehouseStocks.warehouseId],
    references: [warehouses.id],
  }),
  consumable: one(consumables, {
    fields: [warehouseStocks.consumableId],
    references: [consumables.id],
  }),
}))

export const roomConsumablesRelations = relations(roomConsumables, ({ one }) => ({
  room: one(rooms, { fields: [roomConsumables.roomId], references: [rooms.id] }),
  consumable: one(consumables, {
    fields: [roomConsumables.consumableId],
    references: [consumables.id],
  }),
}))

// [IMPORTANT] Relasi Hybrid Location untuk Aset Tetap
export const fixedAssetsRelations = relations(fixedAssets, ({ one, many }) => ({
  model: one(assetModels, { fields: [fixedAssets.modelId], references: [assetModels.id] }),

  // Relasi opsional: Aset bisa punya 'room' ATAU 'warehouse'
  room: one(rooms, { fields: [fixedAssets.roomId], references: [rooms.id] }),
  warehouse: one(warehouses, { fields: [fixedAssets.warehouseId], references: [warehouses.id] }),

  audits: many(assetAudits),
}))

// --- REQUESTS ---
export const requestsRelations = relations(requests, ({ one, many }) => ({
  requester: one(user, {
    fields: [requests.requesterId],
    references: [user.id],
    relationName: 'requester',
  }),
  room: one(rooms, { fields: [requests.roomId], references: [rooms.id] }),
  targetWarehouse: one(warehouses, {
    fields: [requests.targetWarehouseId],
    references: [warehouses.id],
  }),
  items: many(requestItems),
  timelines: many(requestTimelines),
  approvedByUnit: one(user, {
    fields: [requests.approvedByUnitId],
    references: [user.id],
    relationName: 'approverUnit',
  }),
  approvedByFaculty: one(user, {
    fields: [requests.approvedByFacultyId],
    references: [user.id],
    relationName: 'approverFaculty',
  }),
}))

export const requestTimelinesRelations = relations(requestTimelines, ({ one }) => ({
  request: one(requests, { fields: [requestTimelines.requestId], references: [requests.id] }),
  actor: one(user, { fields: [requestTimelines.actorId], references: [user.id] }),
}))

export const requestItemsRelations = relations(requestItems, ({ one }) => ({
  request: one(requests, { fields: [requestItems.requestId], references: [requests.id] }),
  consumable: one(consumables, {
    fields: [requestItems.consumableId],
    references: [consumables.id],
  }),
}))

// --- PROCUREMENT ---
export const procurementsRelations = relations(procurements, ({ one, many }) => ({
  user: one(user, { fields: [procurements.userId], references: [user.id] }),
  consumables: many(procurementConsumables),
  assets: many(procurementAssets),
  timelines: many(procurementTimelines),
}))

export const procurementTimelinesRelations = relations(procurementTimelines, ({ one }) => ({
  procurement: one(procurements, {
    fields: [procurementTimelines.procurementId],
    references: [procurements.id],
  }),
  actor: one(user, { fields: [procurementTimelines.actorId], references: [user.id] }),
}))

export const procurementConsumablesRelations = relations(procurementConsumables, ({ one }) => ({
  procurement: one(procurements, {
    fields: [procurementConsumables.procurementId],
    references: [procurements.id],
  }),
  consumable: one(consumables, {
    fields: [procurementConsumables.consumableId],
    references: [consumables.id],
  }),
}))

export const procurementAssetsRelations = relations(procurementAssets, ({ one }) => ({
  procurement: one(procurements, {
    fields: [procurementAssets.procurementId],
    references: [procurements.id],
  }),
  model: one(assetModels, { fields: [procurementAssets.modelId], references: [assetModels.id] }),
}))

// --- ADJUSTMENTS & AUDITS ---
export const consumableAdjustmentsRelations = relations(consumableAdjustments, ({ one }) => ({
  user: one(user, { fields: [consumableAdjustments.userId], references: [user.id] }),
  consumable: one(consumables, {
    fields: [consumableAdjustments.consumableId],
    references: [consumables.id],
  }),
  warehouse: one(warehouses, {
    fields: [consumableAdjustments.warehouseId],
    references: [warehouses.id],
  }),
  room: one(rooms, { fields: [consumableAdjustments.roomId], references: [rooms.id] }),
}))

export const assetAuditsRelations = relations(assetAudits, ({ one }) => ({
  user: one(user, { fields: [assetAudits.userId], references: [user.id] }),
  fixedAsset: one(fixedAssets, {
    fields: [assetAudits.fixedAssetId],
    references: [fixedAssets.id],
  }),
  room: one(rooms, { fields: [assetAudits.currentRoomId], references: [rooms.id] }),
  warehouse: one(warehouses, {
    fields: [assetAudits.currentWarehouseId],
    references: [warehouses.id],
  }),
}))

// --- USAGE ---
export const usageReportsRelations = relations(usageReports, ({ one, many }) => ({
  user: one(user, { fields: [usageReports.userId], references: [user.id] }),
  room: one(rooms, { fields: [usageReports.roomId], references: [rooms.id] }),
  details: many(usageDetails),
}))

export const usageDetailsRelations = relations(usageDetails, ({ one }) => ({
  report: one(usageReports, { fields: [usageDetails.reportId], references: [usageReports.id] }),
  consumable: one(consumables, {
    fields: [usageDetails.consumableId],
    references: [consumables.id],
  }),
}))

// --- USER ---
export const userRelations = relations(user, ({ one, many }) => ({
  faculty: one(faculties, { fields: [user.facultyId], references: [faculties.id] }),
  unit: one(units, { fields: [user.unitId], references: [units.id] }),
  warehouse: one(warehouses, { fields: [user.warehouseId], references: [warehouses.id] }),
  sessions: many(session),
  accounts: many(account),
  requests: many(requests, { relationName: 'requester' }),
  procurements: many(procurements),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))
