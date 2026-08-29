import { formatBrazilianPhone } from '@studio-charme/contracts';
import { LegalPage } from '@/components/layout/LegalPage';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { buildWhatsAppUrl, siteConfig } from '@/config/site';

/** Conteúdo migrado da página original, com as regras do agendamento on-line. */
export default function TermsPage() {
  useDocumentMeta({
    title: `Termos de Uso | ${siteConfig.name}`,
    description: `Condições de uso do site e do agendamento on-line do ${siteConfig.name}.`,
    canonicalPath: '/termos-de-uso',
  });

  return (
    <LegalPage
      title="Termos de Uso"
      intro={`Bem-vinda ao site do ${siteConfig.name}. Ao acessar nossos conteúdos e serviços, você concorda com os termos descritos abaixo.`}
      updatedAt="agosto de 2026"
    >
      <h2>1. Aceitação dos termos</h2>
      <p>
        O uso do site implica a aceitação integral destes termos. Caso não concorde, recomendamos
        que não utilize os serviços on-line e entre em contato diretamente com a profissional.
      </p>

      <h2>2. Uso do site</h2>
      <p>O site pode ser utilizado para:</p>
      <ul>
        <li>conhecer nossos serviços e profissionais;</li>
        <li>entrar em contato com a equipe;</li>
        <li>solicitar horários de atendimento.</li>
      </ul>
      <p>É proibido utilizar este site para fins ilegais ou não autorizados.</p>

      <h2>3. Agendamentos</h2>
      <p>
        O pedido feito pelo site é uma <strong>solicitação de horário</strong> e não representa, por
        si só, um agendamento confirmado. A confirmação depende da resposta da profissional, que
        verifica a disponibilidade real da agenda dela.
      </p>
      <p>
        Enviar mensagem pelo WhatsApp também não configura confirmação automática. O agendamento
        passa a valer quando a profissional confirma o horário com você.
      </p>

      <h2>4. Cancelamentos e ausências</h2>
      <p>
        Pedimos que cancelamentos e mudanças sejam avisados com antecedência, para que o horário
        possa ser oferecido a outra cliente. Cada profissional pode ter regras próprias de
        antecedência e reagendamento, informadas no momento da confirmação.
      </p>

      <h2>5. Valores</h2>
      <p>
        Os valores dos serviços são definidos por cada profissional e informados antes do
        atendimento. Preços indicados no site, quando exibidos, são valores iniciais e podem variar
        conforme o procedimento, o tempo necessário e os produtos utilizados.
      </p>

      <h2>6. Conteúdo e imagens</h2>
      <p>
        As imagens publicadas neste site retratam trabalhos realizados no studio e pertencem ao{' '}
        {siteConfig.name}. Não é permitido reproduzi-las sem autorização. Resultados de
        procedimentos variam conforme as características de cada pessoa e não constituem promessa de
        resultado idêntico.
      </p>

      <h2>7. Limitação de responsabilidade</h2>
      <p>
        Apesar dos nossos esforços, não garantimos que o site estará sempre disponível ou livre de
        erros técnicos. O {siteConfig.name} não se responsabiliza por danos causados pelo uso
        indevido do site.
      </p>

      <h2>8. Proteção de dados</h2>
      <p>
        O tratamento dos seus dados pessoais está descrito na nossa Política de Privacidade, que
        integra estes termos.
      </p>

      <h2>9. Alterações nos termos</h2>
      <p>
        O {siteConfig.name} reserva-se o direito de atualizar estes Termos de Uso a qualquer
        momento. As alterações entram em vigor imediatamente após a publicação nesta página.
      </p>

      <h2>10. Contato</h2>
      <p>
        Para dúvidas sobre estes termos, fale com a gente pelo WhatsApp{' '}
        <a
          href={buildWhatsAppUrl(siteConfig.primaryWhatsApp)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {formatBrazilianPhone(siteConfig.primaryWhatsApp)}
        </a>
        .
      </p>
    </LegalPage>
  );
}
