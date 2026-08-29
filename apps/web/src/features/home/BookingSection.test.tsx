import { describe, expect, it, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { BookingSection } from './BookingSection';

function mockEmptyCatalog() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('/api/v1/public/catalog')) {
        return new Response(JSON.stringify({ professionals: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'not mocked' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
}

function renderSection() {
  return render(
    <MemoryRouter>
      <BookingSection />
    </MemoryRouter>,
  );
}

/** Preenche o formulário inteiro com dados válidos. */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Seu nome/), 'Maria Silva');
  await user.type(screen.getByLabelText(/Seu WhatsApp/), '85991234567');
  await user.selectOptions(screen.getByLabelText(/Serviço/), 'coloracao');
  await user.selectOptions(screen.getByLabelText(/Profissional/), 'cibele');
  await user.click(screen.getByRole('checkbox'));
}

let openSpy: MockInstance<typeof window.open>;

beforeEach(() => {
  mockEmptyCatalog();
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
  openSpy.mockRestore();
  vi.unstubAllGlobals();
});

describe('BookingSection', () => {
  it('deixa claro que o envio é uma solicitação, não uma confirmação', () => {
    renderSection();
    // O documento exige que o WhatsApp não signifique confirmação definitiva.
    expect(screen.getByText(/não uma confirmação/i)).toBeInTheDocument();
  });

  it('exige o nome', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: /Enviar solicitação/ }));
    expect(await screen.findByText('Informe seu nome.')).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('rejeita telefone brasileiro inválido', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.type(screen.getByLabelText(/Seu nome/), 'Maria Silva');
    await user.type(screen.getByLabelText(/Seu WhatsApp/), '12345');
    await user.click(screen.getByRole('button', { name: /Enviar solicitação/ }));

    expect(
      await screen.findByText('Informe um telefone brasileiro válido com DDD.'),
    ).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('aplica a máscara de telefone durante a digitação', async () => {
    const user = userEvent.setup();
    renderSection();

    const phone = screen.getByLabelText(/Seu WhatsApp/);
    await user.type(phone, '85991234567');
    expect(phone).toHaveValue('(85) 99123-4567');
  });

  it('exige o consentimento antes de enviar', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.type(screen.getByLabelText(/Seu nome/), 'Maria Silva');
    await user.type(screen.getByLabelText(/Seu WhatsApp/), '85991234567');
    await user.selectOptions(screen.getByLabelText(/Serviço/), 'coloracao');
    await user.selectOptions(screen.getByLabelText(/Profissional/), 'cibele');
    await user.click(screen.getByRole('button', { name: /Enviar solicitação/ }));

    expect(
      await screen.findByText('É necessário concordar com o uso dos seus dados para o contato.'),
    ).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('envia para o WhatsApp da profissional escolhida com todos os dados', async () => {
    const user = userEvent.setup();
    renderSection();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /Enviar solicitação/ }));

    expect(openSpy).toHaveBeenCalledOnce();
    const url = openSpy.mock.calls[0]![0] as string;

    // WhatsApp real da Cibele, inventariado do site atual.
    expect(url).toContain('https://wa.me/5585987963037');

    const message = decodeURIComponent(new URL(url).searchParams.get('text') ?? '');
    expect(message).toContain('Maria Silva');
    expect(message).toContain('(85) 99123-4567');
    expect(message).toContain('Coloração');
    expect(message).toContain('Cibele');
  });

  it('usa o contato geral quando a cliente não tem preferência', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.type(screen.getByLabelText(/Seu nome/), 'Maria Silva');
    await user.type(screen.getByLabelText(/Seu WhatsApp/), '85991234567');
    await user.selectOptions(screen.getByLabelText(/Profissional/), 'sem-preferencia');
    await user.selectOptions(screen.getByLabelText(/Serviço/), 'coloracao');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Enviar solicitação/ }));

    const url = openSpy.mock.calls[0]![0] as string;
    const message = decodeURIComponent(new URL(url).searchParams.get('text') ?? '');
    expect(message).toContain('Qualquer uma disponível');
  });

  it('inclui a observação quando preenchida', async () => {
    const user = userEvent.setup();
    renderSection();

    await fillValidForm(user);
    await user.type(screen.getByLabelText(/Observações/), 'Prefiro à tarde');
    await user.click(screen.getByRole('button', { name: /Enviar solicitação/ }));

    const url = openSpy.mock.calls[0]![0] as string;
    const message = decodeURIComponent(new URL(url).searchParams.get('text') ?? '');
    expect(message).toContain('Prefiro à tarde');
  });

  it('abre o WhatsApp com rel seguro em nova aba', async () => {
    const user = userEvent.setup();
    renderSection();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /Enviar solicitação/ }));

    expect(openSpy).toHaveBeenCalledWith(expect.any(String), '_blank', 'noopener,noreferrer');
  });

  it('oferece link para a Política de Privacidade junto ao consentimento', () => {
    renderSection();
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute(
      'href',
      '/politica-de-privacidade',
    );
  });
});
