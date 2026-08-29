import { NavLink, Outlet, useNavigate } from 'react-router';
import { CalendarDays, Clock, History, LayoutDashboard, LogOut, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { ProfessionalAreaName } from '@/features/profile/ProfessionalAreaName';
import { ProfessionalPhoto } from '@/features/profile/ProfessionalPhoto';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { cn } from '@/lib/cn';

const nav = [
  { to: '/app/dashboard', label: 'Painel', icon: LayoutDashboard },
  { to: '/app/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/app/historico', label: 'Histórico', icon: History },
  { to: '/app/horarios', label: 'Horários', icon: Clock },
  { to: '/app/clientes', label: 'Clientes', icon: Users },
  { to: '/app/financeiro', label: 'Financeiro', icon: Wallet },
] as const;

export function AppLayout() {
  const { professional, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="bg-cream-warm min-h-svh lg:grid lg:grid-cols-[16rem_1fr]">
      <a href="#conteudo-app" className="skip-link">
        Pular para o conteúdo
      </a>
      <aside className="bg-brown-900 text-cream hidden flex-col lg:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          {professional && <ProfessionalPhoto professional={professional} className="size-10" />}
          <div className="min-w-0">
            {professional ? (
              <ProfessionalAreaName professional={professional} />
            ) : (
              <p className="font-display text-gold-500 text-lg leading-none">Área da profissional</p>
            )}
            <p className="text-cream/70 mt-1 text-xs">Área da profissional</p>
          </div>
        </div>
        <nav aria-label="Área interna" className="flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-gold-500 text-brown-900' : 'hover:bg-brown-800 text-cream',
                )
              }
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-brown-100 flex items-center justify-between gap-4 border-b bg-white px-4 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {professional && (
              <div className="lg:hidden">
                <ProfessionalPhoto professional={professional} className="size-10" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-brown-500 text-xs tracking-wide uppercase">Conta ativa</p>
              {professional ? (
                <ProfessionalAreaName professional={professional} variant="header" />
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <NotificationBell />
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<LogOut className="size-4" aria-hidden="true" />}
              onClick={() => {
                void logout().then(() => navigate('/entrar', { replace: true }));
              }}
            >
              Sair
            </Button>
          </div>
        </header>

        <main id="conteudo-app" className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-6">
          <Outlet />
        </main>

        <nav
          aria-label="Área interna"
          className="border-brown-100 bg-white lg:hidden sticky bottom-0 z-20 flex border-t"
        >
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-0.5 px-0.5 py-2 text-[10px] leading-tight font-medium sm:text-xs',
                  isActive ? 'text-gold-700' : 'text-brown-600',
                )
              }
            >
              <item.icon className="size-5" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
