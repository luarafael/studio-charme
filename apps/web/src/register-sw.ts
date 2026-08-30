export function registerServiceWorker(): void {
  if (import.meta.env.MODE === 'test') return;
  if (!('serviceWorker' in navigator)) return;

  const register = () => {
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(() => {
        /* Sem SW o sino interno segue; só o aviso no celular fica indisponível. */
      });
  };

  if (document.readyState === 'complete') {
    register();
    return;
  }

  window.addEventListener('load', register);
}
