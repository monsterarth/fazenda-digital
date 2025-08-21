// app/admin/(dashboard)/stays/page.tsx

import { getStays } from "@/app/actions/get-stays";
import { StaysList } from "@/components/admin/stays/stays-list";
import { getPendingCheckIns } from "@/app/actions/get-pending-checkins";
import { PendingCheckInsList } from "@/components/admin/stays/pending-checkins-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCabins } from "@/app/actions/get-cabins";
import { getProperty } from "@/app/actions/get-property";
import { CommunicationsCenter } from "@/components/admin/stays/communications-center";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileCheck2 } from 'lucide-react';
import { getRecentCheckedOutStays } from "@/app/actions/get-recent-checkedout-stays";
import { getTodaysBreakfastOrders } from "@/app/actions/get-todays-breakfast-orders";

export default async function ManageStaysPage() {
    const stays = await getStays();
    const pendingCheckIns = await getPendingCheckIns();
    const cabins = await getCabins();
    const property = await getProperty();
    const checkedOutStays = await getRecentCheckedOutStays();
    const breakfastOrders = await getTodaysBreakfastOrders();
    
    return (
        <div className="container mx-auto p-4 md:p-6 space-y-8">
            <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestão de Estadias</h1>
                    <p className="text-muted-foreground">Valide pré-check-ins e acompanhe as estadias ativas.</p>
                </div>
            </header>

            <CommunicationsCenter 
                activeStays={stays}
                checkedOutStays={checkedOutStays}
                breakfastOrders={breakfastOrders}
                cabins={cabins}
                property={property} db={null}            />

            <Tabs defaultValue="active">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="active">Estadias Ativas ({stays.length})</TabsTrigger>
                    <TabsTrigger value="pending">Pendentes ({pendingCheckIns.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="active">
                     <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Users className="text-green-600"/> Estadias Ativas e Futuras</CardTitle>
                            <CardDescription>Hóspedes com estadias já confirmadas no sistema.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <StaysList stays={stays} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="pending">
                     <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileCheck2 className="text-yellow-600"/> Pré-Check-ins Pendentes</CardTitle>
                            <CardDescription>Hóspedes que preencheram o formulário e aguardam validação.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PendingCheckInsList pendingCheckIns={pendingCheckIns} cabins={cabins} db={null} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ++ CORREÇÃO: A chamada ao EditStayDialog foi removida daqui ++ */}
        </div>
    );
}