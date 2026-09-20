import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyRecordsTab } from "@/pages/farmer/tabs/DailyRecordsTab";
import { FeedTab } from "@/pages/farmer/tabs/FeedTab";
import { VaccinesTab } from "@/pages/farmer/tabs/VaccinesTab";
import { SalesTab } from "@/pages/farmer/tabs/SalesTab";
import { ExpensesTab } from "@/pages/farmer/tabs/ExpensesTab";
import { RemarksTab } from "@/pages/farmer/tabs/RemarksTab";
import type { BatchResponse } from "@/types/batch";

interface BatchDetailProps {
  batch: BatchResponse;
}

export function BatchDetail({ batch }: BatchDetailProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">{batch.batchCode}</h2>
        <p className="text-sm text-muted-foreground">
          {batch.farmName} · Started {batch.startDate} · {batch.initialBirds} birds
        </p>
      </div>

      <Tabs defaultValue="daily-records">
        <TabsList>
          <TabsTrigger value="daily-records">Daily records</TabsTrigger>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="vaccines">Vaccines</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="remarks">Remarks</TabsTrigger>
        </TabsList>

        <TabsContent value="daily-records" className="pt-4">
          <DailyRecordsTab batchId={batch.id} />
        </TabsContent>

        <TabsContent value="feed" className="pt-4">
          <FeedTab batchId={batch.id} />
        </TabsContent>

        <TabsContent value="vaccines" className="pt-4">
          <VaccinesTab batchId={batch.id} />
        </TabsContent>

        <TabsContent value="sales" className="pt-4">
          <SalesTab batchId={batch.id} />
        </TabsContent>

        <TabsContent value="expenses" className="pt-4">
          <ExpensesTab batchId={batch.id} />
        </TabsContent>

        <TabsContent value="remarks" className="pt-4">
          <RemarksTab batchId={batch.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
