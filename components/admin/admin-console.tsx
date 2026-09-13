'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { OverviewPanel } from '@/components/admin/overview-panel'
import { ProductsPanel } from '@/components/admin/products-panel'
import { RetailersPanel } from '@/components/admin/retailers-panel'
import { ListingsPanel } from '@/components/admin/listings-panel'
import { UsersPanel } from '@/components/admin/users-panel'
import { MatchesPanel } from '@/components/admin/matches-panel'

/** Admin console shell. Every panel reads and writes through the /api/admin routes. */
export function AdminConsole() {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="listings">Listings &amp; prices</TabsTrigger>
        <TabsTrigger value="retailers">Retailers</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="matches">Match review</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <OverviewPanel />
      </TabsContent>
      <TabsContent value="products" className="mt-4">
        <ProductsPanel />
      </TabsContent>
      <TabsContent value="listings" className="mt-4">
        <ListingsPanel />
      </TabsContent>
      <TabsContent value="retailers" className="mt-4">
        <RetailersPanel />
      </TabsContent>
      <TabsContent value="users" className="mt-4">
        <UsersPanel />
      </TabsContent>
      <TabsContent value="matches" className="mt-4">
        <MatchesPanel />
      </TabsContent>
    </Tabs>
  )
}
