import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { MainCalendarView } from "./MainCalendarView";
import { SummaryView } from "./SummaryView";
import { AssignGuardModal } from "./AssignGuardModal";
import { Bell, Megaphone, Settings } from "lucide-react";

export function MainLayout() {
  const [activeTab, setActiveTab] = useState("calendario");

  return (
    <div className="flex flex-col h-screen bg-[#0f111a] text-foreground font-sans">
      <header className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0 bg-[#13151f]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
          <TabsList className="bg-transparent text-muted-foreground p-0 gap-6 h-full justify-start">
            <TabsTrigger
              value="resumen"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none px-0 h-full text-base font-normal"
            >
              Resumen
            </TabsTrigger>
            <TabsTrigger
              value="calendario"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none px-0 h-full text-base font-normal"
            >
              Mi calendario
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-4 text-muted-foreground">
          <Bell className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
          <Megaphone className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
          <Settings className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col data-[state=active]:flex">
          <div className="h-16 flex items-center justify-end px-6 border-b border-border shrink-0 bg-[#13151f]">
            <AssignGuardModal />
          </div>

          <TabsContent value="calendario" className="flex-1 m-0 p-0 overflow-hidden outline-none data-[state=active]:flex flex-col">
            <MainCalendarView />
          </TabsContent>
          <TabsContent value="resumen" className="flex-1 m-0 p-0 overflow-hidden outline-none data-[state=active]:flex flex-col">
            <SummaryView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
