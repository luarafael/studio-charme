import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Bell, BellRing, Smartphone } from 'lucide-react';
import {
  safeNotificationHref,
  SALON_TIME_ZONE,
  type NotificationListDto,
} from '@studio-charme/contracts';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  canUseWebPush,
  enablePushAlerts,
  getExistingPushSubscription,
  isIosDevice,
  isStandaloneDisplay,
} from '@/lib/push';

const TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SALON_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatNotificationTime(iso: string): string {
  return TIME_FORMATTER.format(new Date(iso)).replace(',', ' às');
}

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pushReady, setPushReady] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  const list = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<NotificationListDto>('/notifications'),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!canUseWebPush()) return;
    void getExistingPushSubscription().then((subscription) => {
      setPushReady(subscription !== null);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const markRead = useMutation({
    mutationFn: (id: string) => api(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = list.data?.unreadCount ?? 0;
  const items = list.data?.items ?? [];
  const iosNeedsInstall = isIosDevice() && !isStandaloneDisplay();

  async function handleEnablePush(): Promise<void> {
    setEnablingPush(true);
    try {
      await enablePushAlerts();
      setPushReady(true);
      showToast({
        tone: 'success',
        title: 'Alertas no celular ativados',
        description: 'Os mesmos avisos do sino chegam neste aparelho.',
      });
    } catch (error) {
      showToast({
        tone: 'danger',
        title: 'Não foi possível ativar o celular',
        description: error instanceof Error ? error.message : 'Tente novamente.',
      });
    } finally {
      setEnablingPush(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative px-2"
        aria-expanded={open}
        aria-controls="painel-alertas"
        aria-label={
          unreadCount > 0 ? `Alertas, ${unreadCount} não lidos` : 'Alertas'
        }
        onClick={() => setOpen((current) => !current)}
      >
        {unreadCount > 0 ? (
          <BellRing className="size-5" aria-hidden="true" />
        ) : (
          <Bell className="size-5" aria-hidden="true" />
        )}
        {unreadCount > 0 && (
          <span className="bg-danger-500 absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          id="painel-alertas"
          role="region"
          aria-label="Alertas"
          className="border-brown-100 shadow-overlay absolute top-full right-0 z-30 mt-2 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-panel border bg-white"
        >
          <div className="border-brown-100 flex items-center justify-between gap-2 border-b px-4 py-3">
            <p className="text-brown-900 text-sm font-semibold">Alertas</p>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-gold-700 hover:text-gold-800 text-xs font-semibold"
                onClick={() => void markAll.mutateAsync()}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="border-brown-100 border-b px-4 py-3">
            {iosNeedsInstall ? (
              <p className="text-brown-600 text-xs">
                No iPhone, toque em Compartilhar e em Adicionar à Tela de Início para receber
                avisos com o app fechado.
              </p>
            ) : pushReady ? (
              <p className="text-brown-600 flex items-center gap-2 text-xs">
                <Smartphone className="size-3.5 shrink-0" aria-hidden="true" />
                Alertas deste aparelho estão ativos.
              </p>
            ) : canUseWebPush() ? (
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                isLoading={enablingPush}
                leadingIcon={<Smartphone className="size-4" aria-hidden="true" />}
                onClick={() => void handleEnablePush()}
              >
                Ativar alertas no celular
              </Button>
            ) : (
              <p className="text-brown-600 text-xs">
                O sino funciona nesta tela. Este navegador não envia aviso no celular.
              </p>
            )}
          </div>

          {list.isError ? (
            <p className="text-danger-700 px-4 py-6 text-sm">Não foi possível carregar os avisos.</p>
          ) : items.length === 0 ? (
            <p className="text-brown-600 px-4 py-6 text-sm">
              Quando uma cliente pedir horário pelo site, o aviso aparece aqui.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => {
                const unread = item.readAt === null;
                return (
                  <li key={item.id} className="border-brown-100 border-t first:border-t-0">
                    <button
                      type="button"
                      className={cn(
                        'hover:bg-cream-warm flex w-full flex-col items-start gap-1 px-4 py-3 text-left',
                        unread && 'bg-gold-500/8',
                      )}
                      onClick={() => {
                        void markRead.mutateAsync(item.id);
                        setOpen(false);
                        void navigate(safeNotificationHref(item.href));
                      }}
                    >
                      <span className="text-brown-900 text-sm font-semibold">{item.title}</span>
                      <span className="text-brown-700 text-sm">{item.body}</span>
                      <span className="text-brown-500 text-xs">
                        {formatNotificationTime(item.createdAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
