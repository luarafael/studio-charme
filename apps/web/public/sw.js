/* Service worker só para push. Não intercepta navegação: evita cache antigo
   do Vite e não compete com o carregamento normal do site. */

self.addEventListener('push', (event) => {
  let data = {
    title: 'Studio Charme',
    body: 'Você tem um novo aviso.',
    href: '/app/agenda',
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    /* payload inválido: usa o texto padrão acima */
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/SC.png',
      badge: '/assets/SC.png',
      data: { href: data.href },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href =
    event.notification.data && typeof event.notification.data.href === 'string'
      ? event.notification.data.href
      : '/app/agenda';
  const target = href.startsWith('/app/') ? href : '/app/agenda';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => 'focus' in client);
      if (existing) {
        const maybeNavigate = existing;
        if ('navigate' in maybeNavigate && typeof maybeNavigate.navigate === 'function') {
          return maybeNavigate.navigate(target).then((client) => client.focus());
        }
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
