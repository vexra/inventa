import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Page() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <button className="focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50">
            Download
          </button>
        </div>
      </div>

      <div className="flex space-x-2 pb-4">
        <div className="bg-muted text-primary rounded-md px-3 py-1 text-sm font-medium">
          Overview
        </div>
        <div className="text-muted-foreground rounded-md px-3 py-1 text-sm">Analytics</div>
        <div className="text-muted-foreground rounded-md px-3 py-1 text-sm">Reports</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <span className="text-muted-foreground">$</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$45,231.89</div>
              <p className="text-muted-foreground text-xs">+20.1% from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 h-100">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="flex h-75 w-full items-end gap-2 px-4">
              <div className="bg-primary/80 h-[60%] w-1/6 rounded-t-md"></div>
              <div className="bg-primary/80 h-[30%] w-1/6 rounded-t-md"></div>
              <div className="bg-primary/80 h-[80%] w-1/6 rounded-t-md"></div>
              <div className="bg-primary/80 h-[40%] w-1/6 rounded-t-md"></div>
              <div className="bg-primary/80 h-[90%] w-1/6 rounded-t-md"></div>
              <div className="bg-primary/80 h-[50%] w-1/6 rounded-t-md"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 h-100">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <p className="text-muted-foreground text-sm">You made 265 sales this month.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {[1, 2, 3, 4, 5].map((item) => (
                <div className="flex items-center" key={item}>
                  <div className="bg-muted mr-4 flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold">
                    OM
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm leading-none font-medium">Olivia Martin</p>
                    <p className="text-muted-foreground text-sm">olivia.martin@email.com</p>
                  </div>
                  <div className="ml-auto font-medium">+$1,999.00</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
