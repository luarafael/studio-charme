export function registerServiceWorker(): void {
  if (import.meta.env.MODE === 'test') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Sem SW o sino interno segue; só o aviso no celular fica indisponível. */
    });
  });
}
