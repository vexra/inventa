import { relations } from 'drizzle-orm'
import {
  boolean,
  decimal,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const requestStatusEnum = pgEnum('request_status', [
  'PENDING',
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

export const adjustmentTypeEnum = pgEnum('adjustment_type', [
  'STOCK_OPNAME',
  'DAMAGE',
  'LOSS',
  'CORRECTION',
])

export const userRoleEnum = pgEnum('user_role', [
  'Administrator',
  'Warehouse Admin',
  'Unit Staff',
  'Executive',
])

export const units = pgTable('units', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
})

export const warehouses = pgTable('warehouses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location'),
})

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
})

export const items = pgTable(
  'items',
  {
    id: text('id').primaryKey(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    name: text('name').notNull(),
    sku: text('sku').unique(),
    image: text('image'),
    baseUnit: text('base_unit').notNull(),
    minStockAlert: integer('min_stock_alert').default(0),

    isActive: boolean('is_active').default(true).notNull(),
    hasExpiry: boolean('has_expiry').default(false).notNull(),
  },
  (table) => [index('items_category_id_idx').on(table.categoryId)],
)

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),

    role: userRoleEnum('role').notNull(),

    unitId: text('unit_id').references(() => units.id),
    warehouseId: text('warehouse_id').references(() => warehouses.id),

    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('user_email_idx').on(table.email)],
)

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('session_user_id_idx').on(table.userId),
    index('session_token_idx').on(table.token),
  ],
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

export const warehouseStocks = pgTable(
  'warehouse_stocks',
  {
    id: text('id').primaryKey(),
    warehouseId: text('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'restrict' }),

    quantity: decimal('quantity', { precision: 10, scale: 2 }).default('0'),

    batchNumber: text('batch_number'),
    expiryDate: timestamp('expiry_date'),

    receivedAt: timestamp('received_at').defaultNow(),
  },
  (table) => [
    index('ws_warehouse_item_idx').on(table.warehouseId, table.itemId),
    index('ws_expiry_sort_idx').on(table.itemId, table.expiryDate),
  ],
)

export const unitStocks = pgTable(
  'unit_stocks',
  {
    id: text('id').primaryKey(),
    unitId: text('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'restrict' }),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).default('0'),

    batchNumber: text('batch_number'),
    expiryDate: timestamp('expiry_date'),
  },
  (table) => [
    index('us_unit_item_idx').on(table.unitId, table.itemId),
    index('us_expiry_sort_idx').on(table.itemId, table.expiryDate),
  ],
)

export const stockAdjustments = pgTable(
  'stock_adjustments',
  {
    id: text('id').primaryKey(),
    warehouseId: text('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),

    batchNumber: text('batch_number'),
    expiryDate: timestamp('expiry_date'),

    systemQty: decimal('system_qty', { precision: 10, scale: 2 }).notNull(),
    realQty: decimal('real_qty', { precision: 10, scale: 2 }).notNull(),
    qtyDifference: decimal('qty_difference', { precision: 10, scale: 2 }).notNull(),

    type: adjustmentTypeEnum('type').notNull(),
    reason: text('reason').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('sa_warehouse_item_idx').on(table.warehouseId, table.itemId)],
)

export const requests = pgTable(
  'requests',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    warehouseId: text('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    approverId: text('approver_id').references(() => user.id),
    requestCode: text('request_code').notNull().unique(),
    status: requestStatusEnum('status').default('PENDING'),
    rejectionReason: text('rejection_reason'),
    qrToken: text('qr_token'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('requests_user_id_idx').on(table.userId),
    index('requests_warehouse_id_idx').on(table.warehouseId),
    index('requests_code_idx').on(table.requestCode),
  ],
)

export const requestDetails = pgTable(
  'request_details',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id),
    qtyRequested: decimal('qty_requested', { precision: 10, scale: 2 }).notNull(),
    qtyApproved: decimal('qty_approved', { precision: 10, scale: 2 }),
  },
  (table) => [index('rd_request_id_idx').on(table.requestId)],
)

export const procurements = pgTable(
  'procurements',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    approverId: text('approver_id').references(() => user.id),
    procurementCode: text('procurement_code').notNull().unique(),
    status: procurementStatusEnum('status').default('PENDING'),
    note: text('note'),
    proofDocument: text('proof_document'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('procurements_user_id_idx').on(table.userId),
    index('procurements_code_idx').on(table.procurementCode),
  ],
)

export const procurementDetails = pgTable(
  'procurement_details',
  {
    id: text('id').primaryKey(),
    procurementId: text('procurement_id')
      .notNull()
      .references(() => procurements.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
    packagingLabel: text('packaging_label'),

    batchNumber: text('batch_number'),
    expiryDate: timestamp('expiry_date'),
  },
  (table) => [index('pd_procurement_id_idx').on(table.procurementId)],
)

export const usageReports = pgTable(
  'usage_reports',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    activityName: text('activity_name').notNull(),
    evidenceFile: text('evidence_file'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [index('usage_reports_user_id_idx').on(table.userId)],
)

export const usageDetails = pgTable(
  'usage_details',
  {
    id: text('id').primaryKey(),
    usageReportId: text('usage_report_id')
      .notNull()
      .references(() => usageReports.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id),
    qtyUsed: decimal('qty_used', { precision: 10, scale: 2 }).notNull(),

    batchNumber: text('batch_number'),
  },
  (table) => [index('ud_usage_report_id_idx').on(table.usageReportId)],
)

export const transactionHistories = pgTable(
  'transaction_histories',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => user.id),
    action: text('action').notNull(),
    tableName: text('table_name').notNull(),
    recordId: text('record_id').notNull(),
    referenceId: text('reference_id'),
    description: text('description'),
    oldValues: json('old_values'),
    newValues: json('new_values'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('th_record_id_idx').on(table.recordId),
    index('th_table_name_idx').on(table.tableName),
    index('th_reference_id_idx').on(table.referenceId),
  ],
)

export const systemActivityLogs = pgTable(
  'system_activity_logs',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').references(() => user.id),
    actionType: text('action_type').notNull(),
    description: text('description'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metaData: json('meta_data'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('logs_actor_id_idx').on(table.actorId),
    index('logs_action_type_idx').on(table.actionType),
  ],
)

export const userRelations = relations(user, ({ one, many }) => ({
  unit: one(units, {
    fields: [user.unitId],
    references: [units.id],
  }),
  warehouse: one(warehouses, {
    fields: [user.warehouseId],
    references: [warehouses.id],
  }),
  sessions: many(session),
  accounts: many(account),
  requests: many(requests, { relationName: 'requester' }),
  procurements: many(procurements, { relationName: 'admin' }),
  adjustments: many(stockAdjustments),
  transactionHistories: many(transactionHistories),
}))

export const itemsRelations = relations(items, ({ one, many }) => ({
  category: one(categories, {
    fields: [items.categoryId],
    references: [categories.id],
  }),
  warehouseStocks: many(warehouseStocks),
  unitStocks: many(unitStocks),
  adjustments: many(stockAdjustments),
}))

export const warehouseStocksRelations = relations(warehouseStocks, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [warehouseStocks.warehouseId],
    references: [warehouses.id],
  }),
  item: one(items, {
    fields: [warehouseStocks.itemId],
    references: [items.id],
  }),
}))

export const unitStocksRelations = relations(unitStocks, ({ one }) => ({
  unit: one(units, {
    fields: [unitStocks.unitId],
    references: [units.id],
  }),
  item: one(items, {
    fields: [unitStocks.itemId],
    references: [items.id],
  }),
}))

export const stockAdjustmentsRelations = relations(stockAdjustments, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [stockAdjustments.warehouseId],
    references: [warehouses.id],
  }),
  item: one(items, {
    fields: [stockAdjustments.itemId],
    references: [items.id],
  }),
  user: one(user, {
    fields: [stockAdjustments.userId],
    references: [user.id],
  }),
}))

export const requestsRelations = relations(requests, ({ one, many }) => ({
  requester: one(user, {
    fields: [requests.userId],
    references: [user.id],
    relationName: 'requester',
  }),
  approver: one(user, {
    fields: [requests.approverId],
    references: [user.id],
    relationName: 'approver',
  }),
  warehouse: one(warehouses, {
    fields: [requests.warehouseId],
    references: [warehouses.id],
  }),
  details: many(requestDetails),
}))

export const requestDetailsRelations = relations(requestDetails, ({ one }) => ({
  request: one(requests, {
    fields: [requestDetails.requestId],
    references: [requests.id],
  }),
  item: one(items, {
    fields: [requestDetails.itemId],
    references: [items.id],
  }),
}))

export const procurementsRelations = relations(procurements, ({ one, many }) => ({
  admin: one(user, {
    fields: [procurements.userId],
    references: [user.id],
    relationName: 'admin',
  }),
  approver: one(user, {
    fields: [procurements.approverId],
    references: [user.id],
    relationName: 'approver',
  }),
  details: many(procurementDetails),
}))

export const procurementDetailsRelations = relations(procurementDetails, ({ one }) => ({
  procurement: one(procurements, {
    fields: [procurementDetails.procurementId],
    references: [procurements.id],
  }),
  item: one(items, {
    fields: [procurementDetails.itemId],
    references: [items.id],
  }),
}))

export const usageReportsRelations = relations(usageReports, ({ one, many }) => ({
  user: one(user, {
    fields: [usageReports.userId],
    references: [user.id],
  }),
  details: many(usageDetails),
}))

export const usageDetailsRelations = relations(usageDetails, ({ one }) => ({
  report: one(usageReports, {
    fields: [usageDetails.usageReportId],
    references: [usageReports.id],
  }),
  item: one(items, {
    fields: [usageDetails.itemId],
    references: [items.id],
  }),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const transactionHistoriesRelations = relations(transactionHistories, ({ one }) => ({
  user: one(user, {
    fields: [transactionHistories.userId],
    references: [user.id],
  }),
}))
