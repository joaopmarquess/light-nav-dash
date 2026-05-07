import { LayoutDashboard, BarChart3, FileText, Settings, Users } from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: BarChart3, label: "Relatórios" },
  { icon: FileText, label: "Documentos" },
  { icon: Users, label: "Usuários" },
  { icon: Settings, label: "Configurações" },
];

const Index = () => {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="h-8 w-8 rounded-lg bg-primary mr-3" />
          <h1 className="text-lg font-semibold text-foreground">Insights</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Dashboard</h2>
            <p className="text-xs text-muted-foreground">Visão geral em tempo real</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Olá, Usuário</span>
            <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-sm font-medium">
              U
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">
          <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden h-[calc(100vh-8rem)]">
            <iframe
              title="Power BI Dashboard"
              src="https://app.powerbi.com/view?r=eyJrIjoiYjQ4MjY3OTctYjI1Ny00NDIyLWE4ZmEtY2FmNzMyMmI1NjNlIiwidCI6IjQ5ZWQ4MDM4LTcwMTctNDg0Mi1iN2Q1LTI3MDdlYTYzMTQwOSJ9"
              className="w-full h-full border-0"
              allowFullScreen
            />
          </section>
        </main>
      </div>
    </div>
  );
};

export default Index;
