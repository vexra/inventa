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

// =========================================
// 1. ENUMS (TIPE DATA KHUSUS)
// =========================================

export const userRoleEnum = pgEnum('roles', [
  'super_admin',
  'warehouse_staff', // Petugas Gudang (Kimia / ATK)
  'faculty_admin', // Dekanat / WD 2 (Approval level 2)
  'unit_admin', // Kajur / Kaprodi (Approval level 1)
  'unit_staff', // Ka Lab / Staff TU (Requester / Scan QR)
])

export const roomTypeEnum = pgEnum('room_type', [
  'LABORATORY', // Lab Fisika/Kimia (Menyimpan Zat/Alat Praktikum)
  'ADMIN_OFFICE', // TU, Ruang Dosen (Menyimpan ATK)
  'LECTURE_HALL', // Ruang Kelas (Hanya Aset Meja/Kursi/Proyektor)
  'WAREHOUSE_UNIT', // Gudang kecil milik jurusan (jika ada)
])

export const warehouseTypeEnum = pgEnum('warehouse_type', [
  'CHEMICAL', // Gudang Zat Kimia
  'GENERAL_ATK', // Gudang ATK & Kebersihan
])

export const requestStatusEnum = pgEnum('request_status', [
  'PENDING_UNIT', // Menunggu ACC Jurusan
  'PENDING_FACULTY', // Menunggu ACC Dekanat (WD2)
  'APPROVED', // Disetujui, surat jalan keluar ke Gudang
  'PROCESSING', // Gudang sedang menyiapkan barang
  'READY_TO_PICKUP', // Barang siap diambil petugas TU/Lab
  'COMPLETED', // Barang sudah diterima di Ruangan
  'REJECTED',
  'CANCELED',
])

export const procurementStatusEnum = pgEnum('procurement_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
])

export const adjustmentTypeEnum = pgEnum('adjustment_type', [
  'STOCK_OPNAME', // Hitung ulang jumlah fisik (Consumable)
  'DAMAGE', // Lapor rusak (Consumable)
  'LOSS', // Lapor hilang (Consumable)
  'CORRECTION', // Koreksi kesalahan input
])

export const assetConditionEnum = pgEnum('asset_condition', [
  'GOOD',
  'MINOR_DAMAGE',
  'MAJOR_DAMAGE',
  'BROKEN',
  'LOST',
  'MAINTENANCE',
])

// =========================================
// 2. AUTHENTICATION & USER MANAGEMENT
// =========================================

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

// =========================================
// 3. ORGANIZATIONAL STRUCTURE
// =========================================

export const faculties = pgTable('faculties', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // e.g. "FMIPA", "Fakultas Teknik"
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const units = pgTable(
  'units',
  {
    id: text('id').primaryKey(),
    facultyId: text('faculty_id').references(() => faculties.id),
    name: text('name').notNull(), // e.g. "Jurusan Biologi"
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

    name: text('name').notNull(), // e.g. "Lab Biologi Dasar", "Ruang TU"
    type: roomTypeEnum('type').default('LECTURE_HALL').notNull(),
    qrToken: text('qr_token').unique(), // QR Code Ruangan

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
  name: text('name').notNull(),
  type: warehouseTypeEnum('type').notNull(), // Chemical vs ATK
  facultyId: text('faculty_id').references(() => faculties.id),
  description: text('description'),
})

// =========================================
// 4. CATALOG (DEFINISI BARANG)
// =========================================

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
})

// A. BARANG HABIS PAKAI (Consumables)
export const consumables = pgTable('consumables', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => categories.id),

  name: text('name').notNull(),
  sku: text('sku').unique(),

  baseUnit: text('base_unit').notNull(), // Liter, Pcs, Rim
  minStockAlert: integer('min_stock_alert').default(10),

  hasExpiry: boolean('has_expiry').default(false).notNull(),
  image: text('image'),
  description: text('description'),

  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

// B. KATALOG ASET TETAP (Asset Models)
// Definisi model aset (bukan unit fisiknya)
export const assetModels = pgTable('asset_models', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => categories.id),

  name: text('name').notNull(), // e.g. "Mikroskop Binokuler CX-23"
  manufacturer: text('manufacturer'),
  modelNumber: text('model_number'),

  image: text('image'),
  description: text('description'),

  createdAt: timestamp('created_at').defaultNow(),
})

// =========================================
// 5. INVENTORY & STOCKS
// =========================================

// A. STOK GUDANG (Consumables)
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

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('ws_wh_item_idx').on(table.warehouseId, table.consumableId),
    index('ws_expiry_idx').on(table.expiryDate),
  ],
)

// B. STOK RUANGAN (Consumables)
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

    // Tracking Batch (Penting untuk Lab Kimia)
    batchNumber: text('batch_number'),
    expiryDate: timestamp('expiry_date'),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('rc_room_item_idx').on(table.roomId, table.consumableId)],
)

// C. INVENTARIS ASET FISIK (Fixed Assets)
export const fixedAssets = pgTable(
  'fixed_assets',
  {
    id: text('id').primaryKey(),
    modelId: text('model_id')
      .notNull()
      .references(() => assetModels.id),

    // LOKASI ASET (Bisa di Room ATAU di Warehouse)
    roomId: text('room_id').references(() => rooms.id),
    warehouseId: text('warehouse_id').references(() => warehouses.id),

    qrToken: text('qr_token').notNull().unique(), // QR Unik Fisik
    serialNumber: text('serial_number'),

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
  ],
)

// =========================================
// 6. REQUEST & TIMELINE (DISTRIBUSI)
// =========================================

export const requests = pgTable('requests', {
  id: text('id').primaryKey(),
  requestCode: text('request_code').notNull().unique(),

  requesterId: text('requester_id')
    .notNull()
    .references(() => user.id),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id),

  // Gudang Tujuan (Kimia / ATK)
  targetWarehouseId: text('target_warehouse_id').references(() => warehouses.id),

  // Status Saat Ini (Current State)
  status: requestStatusEnum('status').default('PENDING_UNIT'),
  rejectionReason: text('rejection_reason'),

  // Quick Access Approver
  approvedByUnitId: text('approved_by_unit_id').references(() => user.id),
  approvedByFacultyId: text('approved_by_faculty_id').references(() => user.id),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
})

// Timeline Tracking (History Status Ala Shopee)
export const requestTimelines = pgTable('request_timelines', {
  id: text('id').primaryKey(),
  requestId: text('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),

  status: requestStatusEnum('status').notNull(),
  actorId: text('actor_id').references(() => user.id), // Siapa yang ubah status?
  notes: text('notes'), // Catatan timeline

  createdAt: timestamp('created_at').defaultNow(),
})

// Barang yang diminta
export const requestItems = pgTable('request_items', {
  id: text('id').primaryKey(),
  requestId: text('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),
  consumableId: text('consumable_id')
    .notNull()
    .references(() => consumables.id),

  qtyRequested: decimal('qty_requested', { precision: 10, scale: 2 }).notNull(),
  qtyApproved: decimal('qty_approved', { precision: 10, scale: 2 }), // Diisi saat approval WD2
})

// =========================================
// 7. PROCUREMENT & TIMELINE (PENGADAAN)
// =========================================

export const procurements = pgTable('procurements', {
  id: text('id').primaryKey(),
  procurementCode: text('procurement_code').notNull().unique(),

  userId: text('user_id')
    .notNull()
    .references(() => user.id), // Admin pembuat

  status: procurementStatusEnum('status').default('PENDING'),
  supplier: text('supplier'),
  proofDocument: text('proof_document'), // Bukti Faktur/Surat Jalan
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
})

// Timeline Tracking Pengadaan
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
  warehouseId: text('warehouse_id').references(() => warehouses.id), // Masuk ke gudang mana

  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  pricePerUnit: decimal('price_per_unit', { precision: 15, scale: 2 }),

  batchNumber: text('batch_number'),
  expiryDate: timestamp('expiry_date'),
})

// Detail Aset yang dibeli
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

  destinationRoomId: text('destination_room_id').references(() => rooms.id), // Opsional: langsung ke ruangan
})

// =========================================
// 8. USAGE & ADJUSTMENTS (PELAPORAN)
// =========================================

// Laporan Pemakaian Harian (Khusus BHP)
export const usageReports = pgTable('usage_reports', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id),

  activityName: text('activity_name').notNull(),
  evidenceFile: text('evidence_file'),
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

  qtyUsed: decimal('qty_used', { precision: 10, scale: 2 }).notNull(),
  batchNumber: text('batch_number'),
})

// 1. Adjustment Barang Habis Pakai (Stock Opname)
export const consumableAdjustments = pgTable('consumable_adjustments', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),

  consumableId: text('consumable_id')
    .notNull()
    .references(() => consumables.id),

  // Lokasi Opname (Salah satu harus diisi)
  warehouseId: text('warehouse_id').references(() => warehouses.id),
  roomId: text('room_id').references(() => rooms.id),

  batchNumber: text('batch_number'),
  deltaQuantity: decimal('delta_quantity', { precision: 10, scale: 2 }).notNull(),

  type: adjustmentTypeEnum('type').default('STOCK_OPNAME'),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// 2. Audit Aset Tetap (Cek Fisik)
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

  // Update lokasi jika aset dipindah
  currentRoomId: text('current_room_id').references(() => rooms.id),
  currentWarehouseId: text('current_warehouse_id').references(() => warehouses.id),
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
})

// =========================================
// 9. LOGGING (SYSTEM LOGS)
// =========================================

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => user.id), // Siapa pelakunya

  action: text('action').notNull(), // 'CREATE', 'UPDATE', 'DELETE'
  tableName: text('table_name').notNull(), // e.g., 'consumables', 'users'
  recordId: text('record_id').notNull(), // ID data yang diubah

  // Simpan snapshot data sebelum dan sesudah (PENTING)
  oldValues: json('old_values'),
  newValues: json('new_values'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const systemActivityLogs = pgTable('system_activity_logs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').references(() => user.id),
  actionType: text('action_type').notNull(), // LOGIN, LOGOUT, EXPORT
  description: text('description'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metaData: json('meta_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =========================================
// 10. RELATIONS
// =========================================

// ORG RELATIONS
export const facultiesRelations = relations(faculties, ({ many }) => ({
  units: many(units),
  warehouses: many(warehouses),
}))

export const unitsRelations = relations(units, ({ one, many }) => ({
  faculty: one(faculties, { fields: [units.facultyId], references: [faculties.id] }),
  rooms: many(rooms),
  users: many(user),
}))

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  unit: one(units, { fields: [rooms.unitId], references: [units.id] }),
  consumables: many(roomConsumables),
  fixedAssets: many(fixedAssets),
  requests: many(requests),
  usageReports: many(usageReports),
}))

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  faculty: one(faculties, { fields: [warehouses.facultyId], references: [faculties.id] }),
  stocks: many(warehouseStocks),
  fixedAssets: many(fixedAssets),
}))

// ITEM RELATIONS
export const consumablesRelations = relations(consumables, ({ one, many }) => ({
  category: one(categories, { fields: [consumables.categoryId], references: [categories.id] }),
  warehouseStocks: many(warehouseStocks),
  roomConsumables: many(roomConsumables),
}))

export const assetModelsRelations = relations(assetModels, ({ one, many }) => ({
  category: one(categories, { fields: [assetModels.categoryId], references: [categories.id] }),
  fixedAssets: many(fixedAssets),
}))

// INVENTORY RELATIONS
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
  audits: many(assetAudits),
}))

// REQUEST RELATIONS
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
  timelines: many(requestTimelines), // History status
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

// PROCUREMENT RELATIONS
export const procurementsRelations = relations(procurements, ({ one, many }) => ({
  user: one(user, { fields: [procurements.userId], references: [user.id] }),
  consumables: many(procurementConsumables),
  assets: many(procurementAssets),
  timelines: many(procurementTimelines), // History status
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

// ADJUSTMENT RELATIONS
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

// USAGE RELATIONS
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

// USER RELATIONS
export const userRelations = relations(user, ({ one, many }) => ({
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
