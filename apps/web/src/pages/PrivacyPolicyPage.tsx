import { formatBrazilianPhone } from '@studio-charme/contracts';
import { LegalPage } from '@/components/layout/LegalPage';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { buildWhatsAppUrl, siteConfig } from '@/config/site';

/**
 * Conteúdo migrado da página original, ampliado para refletir o que o sistema
 * passou a fazer: guardar agendamentos, histórico de atendimentos e registros
 * financeiros. A política antiga descrevia apenas um site institucional.
 */
export default function PrivacyPolicyPage() {
  useDocumentMeta({
    title: `Política de Privacidade | ${siteConfig.name}`,
    description: `Como o ${siteConfig.name} coleta, usa e protege os dados das clientes.`,
    canonicalPath: '/politica-de-privacidade',
  });

  return (
    <LegalPage
      title="Política de Privacidade"
      intro={`No ${siteConfig.name}, respeitamos e valorizamos a sua privacidade. Esta política explica como coletamos, utilizamos e protegemos as informações fornecidas por nossas clientes.`}
      updatedAt="agosto de 2026"
    >
      <h2>1. Quais dados coletamos</h2>
      <p>
        Coletamos apenas os dados fornecidos voluntariamente por você e necessários para o
        atendimento:
      </p>
      <ul>
        <li>nome e telefone ou WhatsApp, para confirmar e organizar o agendamento;</li>
        <li>data de nascimento, quando você optar por informar;</li>
        <li>
          observações sobre o atendimento, como preferências e cuidados específicos, registradas
          pela profissional que te atende;
        </li>
        <li>
          histórico dos serviços realizados e dos pagamentos, para controle do próprio atendimento.
        </li>
      </ul>
      <p>
        Não solicitamos documentos, dados bancários ou informações de cartão de crédito por meio
        deste site.
      </p>

      <h2>2. Como usamos os dados</h2>
      <p>Os dados coletados são utilizados exclusivamente para:</p>
      <ul>
        <li>confirmar e gerenciar agendamentos;</li>
        <li>manter o histórico do seu atendimento e das suas preferências;</li>
        <li>realizar o controle financeiro dos serviços prestados;</li>
        <li>enviar comunicações relacionadas ao seu atendimento;</li>
        <li>melhorar a qualidade do atendimento.</li>
      </ul>
      <p>
        Não usamos seus dados para publicidade de terceiros e não enviamos mensagens promocionais
        sem o seu consentimento.
      </p>

      <h2>3. Consentimento para contato</h2>
      <p>
        Ao solicitar um agendamento, pedimos sua concordância expressa com o uso dos dados para essa
        finalidade, e esse consentimento fica registrado. Você pode retirá-lo a qualquer momento
        pelos canais de contato desta página.
      </p>

      <h2>4. Quem tem acesso</h2>
      <p>
        Cada profissional acessa somente os dados das clientes que ela mesma atende. O sistema é
        organizado para que uma profissional não visualize agendamentos, observações, valores ou
        contatos das clientes de outra profissional.
      </p>

      <h2>5. Proteção dos dados</h2>
      <p>
        Adotamos medidas de segurança adequadas para proteger as informações pessoais contra acessos
        não autorizados, alteração ou divulgação. O acesso ao sistema é individual, protegido por
        senha, e as senhas são armazenadas de forma cifrada e não reversível.
      </p>

      <h2>6. Compartilhamento</h2>
      <p>
        Não compartilhamos nem vendemos seus dados pessoais a terceiros, exceto quando exigido por
        lei ou por ordem judicial. Utilizamos serviços de hospedagem e banco de dados para operar o
        sistema, que atuam apenas como provedores de infraestrutura.
      </p>

      <h2>7. Por quanto tempo guardamos</h2>
      <p>
        Mantemos os dados enquanto você for nossa cliente e pelo período necessário ao controle dos
        atendimentos realizados. Registros de atendimento e pagamento são preservados para fins de
        histórico e controle financeiro. Depois disso, os dados são excluídos ou anonimizados.
      </p>

      <h2>8. Seus direitos</h2>
      <p>
        Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode solicitar a
        qualquer momento:
      </p>
      <ul>
        <li>confirmação de que tratamos seus dados e acesso a eles;</li>
        <li>correção de dados incompletos ou desatualizados;</li>
        <li>uma cópia dos seus dados;</li>
        <li>a exclusão dos dados tratados com base no seu consentimento;</li>
        <li>a retirada do consentimento para contato.</li>
      </ul>
      <p>
        Para exercer esses direitos, fale com a profissional que te atende ou use o contato abaixo.
      </p>

      <h2>9. Contato</h2>
      <p>
        Em caso de dúvidas sobre esta política ou para exercer seus direitos, fale com a gente pelo
        WhatsApp{' '}
        <a
          href={buildWhatsAppUrl(siteConfig.primaryWhatsApp)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {formatBrazilianPhone(siteConfig.primaryWhatsApp)}
        </a>{' '}
        ou pelo Instagram{' '}
        <a href={siteConfig.social.instagramUrl} target="_blank" rel="noopener noreferrer">
          @{siteConfig.social.instagramHandle}
        </a>
        .
      </p>
    </LegalPage>
  );
}
