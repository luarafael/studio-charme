import { useEffect, useState } from 'react';
import { Share } from 'lucide-react';
import { isIosDevice, isStandaloneDisplay } from '@/lib/push';
import { cn } from '@/lib/cn';

const DISMISS_KEY = 'sc-ios-install-hint';

type IosInstallHintProps = {
  className?: string;
};

export function IosInstallHint({ className }: IosInstallHintProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosDevice() || isStandaloneDisplay()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="note"
      className={cn(
        'border-gold-200 bg-gold-100 text-brown-800 flex items-start gap-3 rounded-card border px-3 py-2.5 text-xs leading-relaxed',
        className,
      )}
    >
      <Share className="text-gold-700 mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        No iPhone, toque em <strong>Compartilhar</strong> e em{' '}
        <strong>Adicionar à Tela de Início</strong>. Abra o ícone do Studio Charme e, no sino,
        ative os avisos no celular.
      </p>
      <button
        type="button"
        className="text-brown-600 hover:text-brown-900 shrink-0 font-semibold"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, '1');
          setVisible(false);
        }}
      >
        Ok
      </button>
    </div>
  );
}
