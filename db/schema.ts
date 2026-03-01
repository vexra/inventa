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
  uniqueIndex,
} from 'drizzle-orm/pg-core'

/**
 * =========================================
 * 1. ENUMS (DEFINISI TIPE DATA TERBATAS)
 * =========================================
 */

export const userRoleEnum = pgEnum('roles', [
  'super_admin',
  'warehouse_staff',
  'faculty_admin',
  'unit_admin',
  'unit_staff',
])

export const roomTypeEnum = pgEnum('room_type', [
  'LABORATORY',
  'ADMIN_OFFICE',
  'LECTURE_HALL',
  'WAREHOUSE_UNIT',
])

export const warehouseTypeEnum = pgEnum('warehouse_type', [
  'CHEMICAL',
  'GENERAL_ATK',
])

export const requestTypeEnum = pgEnum('request_type', [
  'CONSUMABLE', 
  'ASSET',      
])

export const requestStatusEnum = pgEnum('request_status', [
  'PENDING_UNIT',
  'PENDING_FACULTY',
  'APPROVED',
  'PROCESSING',
  'READY_TO_PICKUP',
  'COMPLETED',
  'REJECTED',
  'CANCELED',
])

export const procurementStatusEnum = pgEnum('procurement_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
])

export const distributionStatusEnum = pgEnum('distribution_status', [
  'DRAFT',      // Sedang disusun alokasinya
  'SHIPPED',    // Barang sedang dikirim ke ruangan (OTW)
  'COMPLETED',  // Semua ruangan sudah menerima barang
])

export const adjustmentTypeEnum = pgEnum('adjustment_type', [
  'STOCK_OPNAME',
  'DAMAGE',
  'LOSS',
  'CORRECTION',
])

export const assetConditionEnum = pgEnum('asset_condition', [
  'GOOD',
  'MINOR_DAMAGE',
  'MAJOR_DAMAGE',
  'BROKEN',
  'LOST',
  'MAINTENANCE',
])

// Status Pergerakan Aset (Untuk Aset Bergerak)
export const assetMovementStatusEnum = pgEnum('asset_movement_status', [
  'IN_STORE', // Ada di lokasi penyimpanannya (Home Base)
  'IN_USE', // Sedang dipakai (dipinjam/digunakan/driver)
  'IN_TRANSIT', // Sedang dibawa/pindah lokasi
  'LOST', // Hilang saat pemakaian
])

// Kondisi Penerimaan Barang (Quality Control Inbound)
export const receiptConditionEnum = pgEnum('receipt_condition', [
  'GOOD',
  'DAMAGED',
  'INCOMPLETE',
])

export const notificationTypeEnum = pgEnum('notification_type', [
  'INFO', // Informasi umum
  'SUCCESS', // Tindakan berhasil (misal: Request disetujui)
  'WARNING', // Peringatan (misal: Stok menipis)
  'ERROR', // Kesalahan (misal: Request ditolak)
])

// --- [BARU] ENUMS UNTUK DSS MAINTENANCE & RESERVASI ---
export const maintenanceSeverityEnum = pgEnum('maintenance_severity', [
  'MINOR',     // Rusak Ringan (Bisa dipakai sebagian)
  'MODERATE',  // Rusak Sedang (Mengganggu fungsi utama)
  'MAJOR',     // Rusak Berat (Mati total)
])

export const maintenanceStatusEnum = pgEnum('maintenance_status', [
  'REPORTED',     // Baru dilaporkan
  'IN_PROGRESS',  // Sedang diperbaiki teknisi
  'COMPLETED',    // Selesai diperbaiki
  'IRREPARABLE',  // Tidak bisa diperbaiki (Direkomendasikan hapus/pemutihan)
])

export const reservationStatusEnum = pgEnum('reservation_status', [
  'PENDING',    // Menunggu approval Unit Admin
  'APPROVED',   // Disetujui
  'REJECTED',   // Ditolak
  'COMPLETED',  // Selesai digunakan
  'CANCELED',   // Dibatalkan oleh peminjam
])


/**
 * =========================================
 * 2. AUTHENTICATION & USER MANAGEMENT
 * =========================================
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

  facultyId: text('faculty_id').references(() => faculties.id),
  unitId: text('unit_id').references(() => units.id),
  warehouseId: text('warehouse_id').references(() => warehouses.id),
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
 * Hierarki: Faculty -> Buildings (Fisik) -> Rooms (Fisik).
 * Unit (Logis) menempel pada Room.
 */
export const faculties = pgTable('faculties', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const units = pgTable(
  'units',
  {
    id: text('id').primaryKey(),
    facultyId: text('faculty_id').references(() => faculties.id),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('units_faculty_id_idx').on(table.facultyId)],
)

// Tabel Buildings (Gedung Fisik)
export const buildings = pgTable(
  'buildings',
  {
    id: text('id').primaryKey(),
    facultyId: text('faculty_id')
      .notNull()
      .references(() => faculties.id),

    name: text('name').notNull(), // Contoh: "Gedung MIPA Terpadu", "Gedung GSG"
    code: text('code'), // Contoh: "GMT", "GSG-01"

    // Koordinat Geo (Opsional)
    latitude: decimal('latitude'),
    longitude: decimal('longitude'),

    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('buildings_faculty_id_idx').on(table.facultyId)],
)

export const rooms = pgTable(
  'rooms',
  {
    id: text('id').primaryKey(),

    // Relasi ke Gedung Fisik
    buildingId: text('building_id')
      .notNull()
      .references(() => buildings.id, { onDelete: 'cascade' }),

    // Jika NULL: Ruangan Umum (GSG, Aula Fakultas).
    // Jika ISI: Ruangan Jurusan (Lab, R. Dosen Jurusan).
    unitId: text('unit_id').references(() => units.id),

    name: text('name').notNull(), // Contoh: "Lab Mikrobiologi 1"
    floorLevel: integer('floor_level').default(1),
    type: roomTypeEnum('type').default('LECTURE_HALL').notNull(),
    qrToken: text('qr_token').unique(),

    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('rooms_building_id_idx').on(table.buildingId),
    index('rooms_unit_id_idx').on(table.unitId),
    index('rooms_qr_token_idx').on(table.qrToken),
  ],
)

export const warehouses = pgTable('warehouses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: warehouseTypeEnum('type').notNull(),
  facultyId: text('faculty_id').references(() => faculties.id),
  description: text('description'),
})


/**
 * =========================================
 * 4. CATALOG (DEFINISI PRODUK - MASTER DATA)
 * =========================================
 */
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
})

// [BARU] Tabel Master Merek untuk Standarisasi Data Aset
export const brands = pgTable('brands', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(), // Contoh: "Epson", "Olympus", "Asus"
  country: text('country'), // Negara Asal (Opsional untuk laporan TKDN)
  createdAt: timestamp('created_at').defaultNow(),
})

export const consumables = pgTable('consumables', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => categories.id),

  name: text('name').notNull(),
  sku: text('sku').unique(),

  baseUnit: text('base_unit').notNull(),
  minimumStock: integer('minimum_stock').default(10),

  hasExpiry: boolean('has_expiry').default(false).notNull(),
  image: text('image'),
  description: text('description'),

  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

// [UPDATE] Definisi Spesifikasi Aset
export const assetModels = pgTable('asset_models', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => categories.id),
  brandId: text('brand_id').references(() => brands.id), // Diambil dari master Merek

  name: text('name').notNull(),
  modelNumber: text('model_number'),

  // [BARU] Jenis Aset: Bergerak (true) atau Tidak Bergerak (false)
  isMovable: boolean('is_movable').default(false),

  // [BARU] JSON Specifications agar fleksibel per kategori
  // cth: {"ram": "16GB", "processor": "i7"} atau {"lensa": "100x"}
  specifications: json('specifications'),

  image: text('image'),
  description: text('description'),

  createdAt: timestamp('created_at').defaultNow(),
})


/**
 * =========================================
 * 5. INVENTORY & STOCKS (DATA FISIK)
 * =========================================
 */
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

    batchNumber: text('batch_number'),
    expiryDate: timestamp('expiry_date'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('unique_stock_batch_idx').on(
      table.warehouseId,
      table.consumableId,
      table.batchNumber,
    ),
    index('ws_expiry_idx').on(table.expiryDate),
  ],
)

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

    batchNumber: text('batch_number'),
    expiryDate: timestamp('expiry_date'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('rc_room_item_idx').on(table.roomId, table.consumableId)],
)

// [UPDATE] Aset Tetap Fisik dengan Kode Rektorat & Mobilitas
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
     * Salah satu kolom ini harus terisi sebagai "Home Base" atau "Last Known Location".
     */
    roomId: text('room_id').references(() => rooms.id), // e.g. Mikroskop di Lab / Kendaraan di Pool
    warehouseId: text('warehouse_id').references(() => warehouses.id), // e.g. Rak Besi di Gudang

    /**
     * CUSTODIAN (Penanggung Jawab Aset Bergerak)
     * Wajib diisi untuk kendaraan dinas atau alat mahal yang dibawa-bawa.
     */
    custodianId: text('custodian_id').references(() => user.id),

        // [BARU] Nomor Inventaris Baku dari Rektorat
    inventoryNumber: text('inventory_number').unique(),

        // [BARU] Status mobilitas barang (Boleh dipindah / Terkunci di ruangan)
    isMovable: boolean('is_movable').default(true).notNull(),

    /**
     * STATUS PERGERAKAN
     * Membedakan aset yang "Parkir" vs "Jalan".
     */
    movementStatus: assetMovementStatusEnum('movement_status').default('IN_STORE'),

    qrToken: text('qr_token').notNull().unique(), // Data yang tersimpan di QR Code fisik
    serialNumber: text('serial_number'), // SN dari pabrik

    condition: assetConditionEnum('condition').default('GOOD').notNull(),

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
    index('fa_custodian_idx').on(table.custodianId),
  ],
)


/**
 * =========================================
 * 6. REQUEST & TIMELINE (DISTRIBUSI BHP)
 * =========================================
 */
export const requests = pgTable('requests', {
  id: text('id').primaryKey(),
  requestCode: text('request_code').notNull().unique(),
  type: requestTypeEnum('type').default('CONSUMABLE').notNull(),

  requesterId: text('requester_id')
    .notNull()
    .references(() => user.id),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id),

  targetWarehouseId: text('target_warehouse_id').references(() => warehouses.id),

  status: requestStatusEnum('status').default('PENDING_UNIT'),
  description: text('description'),
  rejectionReason: text('rejection_reason'),

  approvedByUnitId: text('approved_by_unit_id').references(() => user.id),
  approvedByFacultyId: text('approved_by_faculty_id').references(() => user.id),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export const requestTimelines = pgTable('request_timelines', {
  id: text('id').primaryKey(),
  requestId: text('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),

  status: requestStatusEnum('status').notNull(),
  actorId: text('actor_id').references(() => user.id),
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
})

export const requestItems = pgTable('request_items', {
  id: text('id').primaryKey(),
  requestId: text('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),
  consumableId: text('consumable_id')
    .notNull()
    .references(() => consumables.id),

  qtyRequested: decimal('qty_requested', { precision: 10, scale: 2 }).notNull(),
  qtyApproved: decimal('qty_approved', { precision: 10, scale: 2 }),
})

// (Tabel requestItems untuk Consumable biarkan seperti semula)

// [BARU] Detail Item untuk Pengajuan Aset Tetap
export const requestAssetItems = pgTable('request_asset_items', {
  id: text('id').primaryKey(),
  
  requestId: text('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),
    
  // Mengarah ke Master Katalog Aset (assetModels)
  modelId: text('model_id')
    .notNull()
    .references(() => assetModels.id),

  qtyRequested: integer('qty_requested').notNull(),
  qtyApproved: integer('qty_approved'),
})

export const requestItemAllocations = pgTable('request_item_allocations', {
  id: text('id').primaryKey(),

  requestItemId: text('request_item_id')
    .notNull()
    .references(() => requestItems.id, { onDelete: 'cascade' }),

  warehouseId: text('warehouse_id')
    .notNull()
    .references(() => warehouses.id),

  consumableId: text('consumable_id')
    .notNull()
    .references(() => consumables.id),

  batchNumber: text('batch_number'),
  expiryDate: timestamp('expiry_date'),

  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),

  createdAt: timestamp('created_at').defaultNow(),
})


/**
 * =========================================
 * 7. PROCUREMENT (PENGADAAN)
 * =========================================
 * Flow warehouse staff mengambil barang dari vendor (Masuk ke Gudang/Ruangan).
 */
export const procurements = pgTable('procurements', {
  id: text('id').primaryKey(),
  procurementCode: text('procurement_code').notNull().unique(),

  userId: text('user_id')
    .notNull()
    .references(() => user.id),

  warehouseId: text('warehouse_id').references(() => warehouses.id),
  status: procurementStatusEnum('status').default('PENDING'),
  description: text('description'),
  supplier: text('supplier'),
  proofDocument: text('proof_document'),
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
})

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

// Detail BHP yang dibeli
export const procurementConsumables = pgTable('procurement_consumables', {
  id: text('id').primaryKey(),
  procurementId: text('procurement_id')
    .notNull()
    .references(() => procurements.id, { onDelete: 'cascade' }),
  consumableId: text('consumable_id')
    .notNull()
    .references(() => consumables.id),
  warehouseId: text('warehouse_id').references(() => warehouses.id),

  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  pricePerUnit: decimal('price_per_unit', { precision: 15, scale: 2 }),

  batchNumber: text('batch_number'),
  expiryDate: timestamp('expiry_date'),
  condition: receiptConditionEnum('condition'),
})

// Detail Aset Tetap yang dibeli
export const procurementAssets = pgTable('procurement_assets', {
  id: text('id').primaryKey(),
  procurementId: text('procurement_id')
    .notNull()
    .references(() => procurements.id, { onDelete: 'cascade' }),
  modelId: text('model_id')
    .notNull()
    .references(() => assetModels.id),

  quantity: integer('quantity').notNull(),
  pricePerUnit: decimal('price_per_unit', { precision: 15, scale: 2 }),

  destinationRoomId: text('destination_room_id').references(() => rooms.id),
})

/**
 * =========================================
 * 7B. ASSET DISTRIBUTION (DROPPING & HANDSHAKE)
 * =========================================
 */
export const assetDistributions = pgTable('asset_distributions', {
  id: text('id').primaryKey(),
  distributionCode: text('distribution_code').notNull().unique(), 
  
  actorId: text('actor_id').notNull().references(() => user.id), 
  modelId: text('model_id').notNull().references(() => assetModels.id), 
  
  totalQuantity: integer('total_quantity').notNull(),
  status: distributionStatusEnum('status').default('DRAFT').notNull(),
  
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const assetDistributionTargets = pgTable('asset_distribution_targets', {
  id: text('id').primaryKey(),
  distributionId: text('distribution_id')
    .notNull()
    .references(() => assetDistributions.id, { onDelete: 'cascade' }),
  
  targetRoomId: text('target_room_id')
    .notNull()
    .references(() => rooms.id), 
    
  allocatedQuantity: integer('allocated_quantity').notNull(),
  
  // Handshake Logic: Berapa fisik yang benar-benar diterima laboran
  receivedQuantity: integer('received_quantity').default(0).notNull(),
  receiverId: text('receiver_id').references(() => user.id), 
  receivedAt: timestamp('received_at'),
})


/**
 * =========================================
 * 8. USAGE, ADJUSTMENTS, & DSS LOGS
 * =========================================
 */

// Laporan Pemakaian BHP di Ruangan (e.g. Praktikum Kimia Dasar)
export const usageReports = pgTable(
  'usage_reports',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id), // Pelapor (Laboran/Asisten)
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id), // Terjadi di lab mana?

    activityName: text('activity_name').notNull(), // e.g. "Modul 1: Titrasi Asam Basa"
    activityDate: timestamp('activity_date').notNull(),
    evidenceFile: text('evidence_file'), // Foto kegiatan/Logbook
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('usage_activity_date_idx').on(table.activityDate)],
)

export const usageDetails = pgTable('usage_details', {
  id: text('id').primaryKey(),
  reportId: text('report_id')
    .notNull()
    .references(() => usageReports.id, { onDelete: 'cascade' }),
  consumableId: text('consumable_id')
    .notNull()
    .references(() => consumables.id),

  qtyUsed: decimal('qty_used', { precision: 10, scale: 2 }).notNull(),
  batchNumber: text('batch_number'),
})

export const consumableAdjustments = pgTable('consumable_adjustments', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),

  consumableId: text('consumable_id')
    .notNull()
    .references(() => consumables.id),

  warehouseId: text('warehouse_id').references(() => warehouses.id),
  roomId: text('room_id').references(() => rooms.id),

  batchNumber: text('batch_number'),
  deltaQuantity: decimal('delta_quantity', { precision: 10, scale: 2 }).notNull(),

  type: adjustmentTypeEnum('type').default('STOCK_OPNAME'),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

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

  currentRoomId: text('current_room_id').references(() => rooms.id),
  currentWarehouseId: text('current_warehouse_id').references(() => warehouses.id),
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
})

// --- [BARU] 8A. RESERVASI RUANGAN (ROOM BOOKING) ---
// Pengganti peminjaman Aset yang menempel di kelas (seperti Proyektor/AC)
export const roomReservations = pgTable('room_reservations', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  
  bookerId: text('booker_id')
    .notNull()
    .references(() => user.id),
  
  // Siapa yang memberikan izin (Kajur / TU)
  approverId: text('approver_id').references(() => user.id),

  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  
  activityName: text('activity_name').notNull(),
  
  status: reservationStatusEnum('status').default('PENDING').notNull(),
  rejectionReason: text('rejection_reason'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
})

// --- [BARU] 8B. MAINTENANCE LOGS (LOG KERUSAKAN) ---
// Jantung dari Decision Support System untuk Aset
export const assetMaintenances = pgTable('asset_maintenances', {
  id: text('id').primaryKey(),
  
  assetId: text('asset_id')
    .notNull()
    .references(() => fixedAssets.id, { onDelete: 'cascade' }),
  
  reporterId: text('reporter_id')
    .notNull()
    .references(() => user.id), // Siapa yang melaporkan kerusakan
    
  severity: maintenanceSeverityEnum('severity').notNull(),
  status: maintenanceStatusEnum('status').default('REPORTED').notNull(),
  
  description: text('description').notNull(),
  
  // Sangat penting untuk kalkulasi DSS "Apakah aset ini layak diservis?"
  repairCost: decimal('repair_cost', { precision: 15, scale: 2 }),
  
  // Mencatat downtime / alat tidak bisa dipakai
  downtimeStart: timestamp('downtime_start').defaultNow().notNull(),
  downtimeEnd: timestamp('downtime_end'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
})


/**
 * =========================================
 * 9. LOGGING (SYSTEM LOGS)
 * =========================================
 */
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => user.id),

  action: text('action').notNull(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),

  oldValues: json('old_values'),
  newValues: json('new_values'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const systemActivityLogs = pgTable('system_activity_logs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').references(() => user.id),
  actionType: text('action_type').notNull(),
  description: text('description'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metaData: json('meta_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    title: text('title').notNull(),
    message: text('message').notNull(),

    type: notificationTypeEnum('type').default('INFO').notNull(),
    link: text('link'),
    isRead: boolean('is_read').default(false).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('notif_user_idx').on(table.userId), index('notif_read_idx').on(table.isRead)],
)

/**
 * =========================================
 * 10. RELATIONS (DRIZZLE ORM)
 * =========================================
 * Mendefinisikan hubungan antar tabel.
 */

// --- ORGANIZATION ---
export const facultiesRelations = relations(faculties, ({ many }) => ({
  units: many(units),
  buildings: many(buildings), // Relation
  warehouses: many(warehouses),
  users: many(user),
}))

export const unitsRelations = relations(units, ({ one, many }) => ({
  faculty: one(faculties, {
    fields: [units.facultyId],
    references: [faculties.id],
  }),
  rooms: many(rooms),
  users: many(user),
}))

// Relations untuk Buildings
export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  faculty: one(faculties, { fields: [buildings.facultyId], references: [faculties.id] }),
  rooms: many(rooms),
}))

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  building: one(buildings, { fields: [rooms.buildingId], references: [buildings.id] }),
  unit: one(units, { fields: [rooms.unitId], references: [units.id] }),
  consumables: many(roomConsumables),
  fixedAssets: many(fixedAssets),
  requests: many(requests),
  usageReports: many(usageReports),
  reservations: many(roomReservations), // [BARU] Relasi Ruangan ke Peminjaman
}))

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  faculty: one(faculties, { fields: [warehouses.facultyId], references: [faculties.id] }),
  stocks: many(warehouseStocks),
  fixedAssets: many(fixedAssets),
}))

// --- CATALOG ---
export const categoriesRelations = relations(categories, ({ many }) => ({
  consumables: many(consumables),
  assetModels: many(assetModels),
}))

// [BARU] Relasi Master Merek
export const brandsRelations = relations(brands, ({ many }) => ({
  assetModels: many(assetModels),
}))

export const consumablesRelations = relations(consumables, ({ one, many }) => ({
  category: one(categories, {
    fields: [consumables.categoryId],
    references: [categories.id],
  }),
  warehouseStocks: many(warehouseStocks),
  roomConsumables: many(roomConsumables),
}))

export const assetModelsRelations = relations(assetModels, ({ one, many }) => ({
  category: one(categories, { fields: [assetModels.categoryId], references: [categories.id] }),
  brand: one(brands, { fields: [assetModels.brandId], references: [brands.id] }), // [BARU] Relasi Model ke Merek
  fixedAssets: many(fixedAssets),
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

export const fixedAssetsRelations = relations(fixedAssets, ({ one, many }) => ({
  model: one(assetModels, { fields: [fixedAssets.modelId], references: [assetModels.id] }),
  room: one(rooms, { fields: [fixedAssets.roomId], references: [rooms.id] }),
  warehouse: one(warehouses, { fields: [fixedAssets.warehouseId], references: [warehouses.id] }),
  custodian: one(user, { fields: [fixedAssets.custodianId], references: [user.id] }),
  audits: many(assetAudits),
  maintenances: many(assetMaintenances), // [BARU] Relasi ke Log Kerusakan
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
  assetItems: many(requestAssetItems),
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

export const requestItemsRelations = relations(requestItems, ({ one, many }) => ({
  request: one(requests, { fields: [requestItems.requestId], references: [requests.id] }),
  consumable: one(consumables, {
    fields: [requestItems.consumableId],
    references: [consumables.id],
  }),
  allocations: many(requestItemAllocations),
}))

export const requestItemAllocationsRelations = relations(requestItemAllocations, ({ one }) => ({
  requestItem: one(requestItems, {
    fields: [requestItemAllocations.requestItemId],
    references: [requestItems.id],
  }),
  warehouse: one(warehouses, {
    fields: [requestItemAllocations.warehouseId],
    references: [warehouses.id],
  }),
  consumable: one(consumables, {
    fields: [requestItemAllocations.consumableId],
    references: [consumables.id],
  }),
}))

export const requestAssetItemsRelations = relations(requestAssetItems, ({ one }) => ({
  request: one(requests, { fields: [requestAssetItems.requestId], references: [requests.id] }),
  model: one(assetModels, { fields: [requestAssetItems.modelId], references: [assetModels.id] }),
}))

export const assetDistributionsRelations = relations(assetDistributions, ({ one, many }) => ({
  actor: one(user, { fields: [assetDistributions.actorId], references: [user.id] }),
  model: one(assetModels, { fields: [assetDistributions.modelId], references: [assetModels.id] }),
  targets: many(assetDistributionTargets),
}))

export const assetDistributionTargetsRelations = relations(assetDistributionTargets, ({ one }) => ({
  distribution: one(assetDistributions, { fields: [assetDistributionTargets.distributionId], references: [assetDistributions.id] }),
  targetRoom: one(rooms, { fields: [assetDistributionTargets.targetRoomId], references: [rooms.id] }),
  receiver: one(user, { fields: [assetDistributionTargets.receiverId], references: [user.id] }),
}))

// --- PROCUREMENT ---
export const procurementsRelations = relations(procurements, ({ one, many }) => ({
  user: one(user, { fields: [procurements.userId], references: [user.id] }),
  warehouse: one(warehouses, { fields: [procurements.warehouseId], references: [warehouses.id] }),
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

// --- [BARU] RELASI RESERVASI & MAINTENANCE ---
export const roomReservationsRelations = relations(roomReservations, ({ one }) => ({
  room: one(rooms, { fields: [roomReservations.roomId], references: [rooms.id] }),
  booker: one(user, { fields: [roomReservations.bookerId], references: [user.id], relationName: 'reservationBooker' }),
  approver: one(user, { fields: [roomReservations.approverId], references: [user.id], relationName: 'reservationApprover' }),
}))

export const assetMaintenancesRelations = relations(assetMaintenances, ({ one }) => ({
  asset: one(fixedAssets, { fields: [assetMaintenances.assetId], references: [fixedAssets.id] }),
  reporter: one(user, { fields: [assetMaintenances.reporterId], references: [user.id], relationName: 'maintenanceReporter' }),
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
  notifications: many(notifications),
    // [BARU] Relasi aktivitas user untuk fitur baru
  reservationsBooked: many(roomReservations, { relationName: 'reservationBooker' }),
  reservationsApproved: many(roomReservations, { relationName: 'reservationApprover' }),
  maintenancesReported: many(assetMaintenances, { relationName: 'maintenanceReporter' }),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
}))
