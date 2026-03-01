import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { assetModels, brands, categories } from '@/db/schema'
import { AddBrandDialog } from '@/components/asset-models/add-brand-dialog'
import { AddModelDialog } from '@/components/asset-models/add-model-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function AssetModelsPage() {
  const categoriesData = await db.select().from(categories)
  const brandsData = await db.select().from(brands)

  const modelsData = await db
    .select({
      id: assetModels.id,
      name: assetModels.name,
      modelNumber: assetModels.modelNumber,
      isMovable: assetModels.isMovable,
      specifications: assetModels.specifications,
      brandName: brands.name,
      categoryName: categories.name,
    })
    .from(assetModels)
    .leftJoin(brands, eq(assetModels.brandId, brands.id))
    .leftJoin(categories, eq(assetModels.categoryId, categories.id))
    .orderBy(desc(assetModels.createdAt))

  // Helper untuk format spesifikasi
  function formatSpecifications(specs: any): string {
    if (!specs || typeof specs !== 'object') return '-'
    const entries = Object.entries(specs)
    if (entries.length === 0) return '-'
    return entries.map(([key, value]) => `${key}: ${value}`).join(', ')
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Katalog Model Aset</h1>
          <p className="text-muted-foreground">Kelola master data merek dan spesifikasi aset.</p>
        </div>
        <div className="flex gap-2">
          {/* Tombol Merek & Model bersandingan */}
          <AddBrandDialog />
          <AddModelDialog categories={categoriesData} brands={brandsData} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Model / Spesifikasi</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merek</TableHead>
                <TableHead>Nama Seri/Tipe</TableHead>
                <TableHead>No. Model Pabrik</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Spesifikasi</TableHead>
                <TableHead>Kategori</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelsData.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Belum ada data model aset.</TableCell></TableRow>
              ) : (
                modelsData.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-semibold">{model.brandName}</TableCell>
                    <TableCell>{model.name}</TableCell>
                    <TableCell className="font-mono text-sm">{model.modelNumber || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={model.isMovable ? 'default' : 'secondary'}>
                        {model.isMovable ? 'Bergerak' : 'Tidak Bergerak'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate" title={formatSpecifications(model.specifications)}>
                      {formatSpecifications(model.specifications)}
                    </TableCell>
                    <TableCell>{model.categoryName}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
