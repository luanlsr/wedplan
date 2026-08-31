import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../layout/BrandLogo';

type LegalPageProps = {
  type: 'terms' | 'privacy';
};

const updatedAt = '31 de agosto de 2026';

const termsSections = [
  {
    title: '1. Aceite e comprovação',
    body: 'Ao marcar o aceite e prosseguir com a contratação ou uso do WedPlan, você declara que leu, compreendeu e aceitou estes Termos de Uso e a Política de Privacidade vigente. Para segurança, auditoria e exercício regular de direitos, registramos data e hora do aceite, e-mail informado, IP, navegador, sistema operacional, tipo de dispositivo, origem do acesso e versão dos documentos aceitos.',
  },
  {
    title: '2. Objeto do serviço',
    body: 'O WedPlan é uma plataforma SaaS para organização de casamento, com recursos para convidados, fornecedores, tarefas, financeiro, site do casal, RSVP, mensagens, lista de presentes e ferramentas relacionadas, conforme disponibilidade técnica e plano contratado.',
  },
  {
    title: '3. Cadastro, conta e acesso',
    body: 'O usuário deve fornecer informações verdadeiras, completas e atualizadas. A conta pode depender de confirmação de pagamento e validações antifraude. O usuário é responsável por proteger suas credenciais, manter seus contatos atualizados e comunicar imediatamente qualquer suspeita de acesso indevido.',
  },
  {
    title: '4. Assinatura, cobrança e terceiros',
    body: 'Os pagamentos são processados por parceiro financeiro externo, atualmente Asaas. O WedPlan não armazena número completo de cartão, CVV, senha bancária ou credenciais financeiras. O acesso a funcionalidades pagas pode ser liberado, suspenso ou encerrado conforme status da assinatura, inadimplência, cancelamento, fraude ou descumprimento destes Termos.',
  },
  {
    title: '5. Cancelamento e arrependimento',
    body: 'O usuário pode solicitar cancelamento pelos canais de atendimento disponíveis. Quando aplicável às relações de consumo contratadas pela internet, será respeitado o direito de arrependimento de 7 dias e demais direitos previstos no Código de Defesa do Consumidor e nas normas brasileiras de comércio eletrônico.',
  },
  {
    title: '6. Uso permitido',
    body: 'É proibido usar o WedPlan para atividade ilegal, violação de direitos de terceiros, conteúdo ofensivo ou discriminatório, spam, fraude, tentativa de acesso indevido, engenharia reversa, exploração de vulnerabilidades, sobrecarga dos serviços ou qualquer uso que comprometa a segurança, estabilidade ou reputação da plataforma.',
  },
  {
    title: '7. Conteúdo inserido pelo usuário',
    body: 'O usuário permanece responsável pelos dados, imagens, mensagens, listas de convidados, informações de fornecedores e demais conteúdos que inserir no WedPlan. Ao usar a plataforma, autoriza o tratamento desses conteúdos apenas na medida necessária para operação do serviço, suporte, segurança, cumprimento legal e funcionalidades contratadas.',
  },
  {
    title: '8. Disponibilidade e suporte',
    body: 'Trabalhamos para manter a plataforma disponível e segura, mas podem ocorrer interrupções por manutenção, atualizações, incidentes, provedores externos ou eventos fora do controle razoável do WedPlan. Demandas de suporte serão tratadas pelos canais informados na plataforma.',
  },
  {
    title: '9. Propriedade intelectual',
    body: 'Marcas, layout, código, textos, fluxos, identidade visual e demais elementos do WedPlan pertencem aos seus respectivos titulares. O uso da plataforma não transfere propriedade intelectual ao usuário, exceto quanto aos conteúdos que ele próprio inserir.',
  },
  {
    title: '10. Proteção de dados',
    body: 'O tratamento de dados pessoais observa a Política de Privacidade do WedPlan, a Lei Geral de Proteção de Dados Pessoais, o Marco Civil da Internet e demais normas brasileiras aplicáveis. Dados técnicos e registros de acesso podem ser mantidos para segurança, auditoria, prevenção a fraude, cumprimento legal e exercício regular de direitos.',
  },
  {
    title: '11. Responsabilidade',
    body: 'O WedPlan responde nos limites da legislação aplicável. O serviço não substitui assessoria jurídica, contábil, financeira, cerimonial ou profissional especializada. O usuário é responsável por validar informações, contratos, pagamentos, orçamentos e decisões tomadas com base nos dados organizados na plataforma.',
  },
  {
    title: '12. Atualizações dos termos',
    body: 'Estes Termos podem ser atualizados para refletir mudanças legais, operacionais, comerciais, técnicas ou novas funcionalidades. Alterações relevantes serão comunicadas por meio razoável, e a continuidade de uso ou novo aceite poderá ser exigido quando necessário.',
  },
];

const privacySections = [
  {
    title: '1. Controlador e contato',
    body: 'Esta Política explica como o WedPlan trata dados pessoais no contexto da plataforma. Solicitações de privacidade, dúvidas ou exercício de direitos podem ser encaminhados pelos canais de atendimento informados no site, checkout ou dentro da plataforma.',
  },
  {
    title: '2. Dados coletados',
    body: 'Podemos coletar nome, e-mail, telefone, CPF/CNPJ para cobrança, dados do casamento, dados de convidados, fornecedores, tarefas, orçamento, mensagens, preferências de cookies, registros de suporte e informações técnicas como IP, user-agent, navegador, sistema operacional, tipo de dispositivo, idioma, fuso horário, páginas acessadas e identificadores de sessão.',
  },
  {
    title: '3. Finalidades do tratamento',
    body: 'Tratamos dados para criar e manter conta, processar assinaturas, operar funcionalidades contratadas, salvar planejamentos, disponibilizar site do casal, prestar suporte, emitir comunicações transacionais, prevenir fraude, manter segurança, registrar aceite legal, cumprir obrigações legais e exercer direitos em processos administrativos, judiciais ou arbitrais.',
  },
  {
    title: '4. Bases legais',
    body: 'As bases legais podem incluir execução de contrato e procedimentos preliminares, cumprimento de obrigação legal ou regulatória, exercício regular de direitos, legítimo interesse para segurança e melhoria do serviço, proteção contra fraude e consentimento quando exigido, como em cookies não necessários e comunicações de marketing.',
  },
  {
    title: '5. Aceite legal e registros técnicos',
    body: 'Quando o usuário aceita os Termos e a Política, registramos a versão do documento, data e hora, e-mail, IP, dispositivo, navegador, sistema operacional, idioma, fuso horário, origem do acesso e metadados mínimos do checkout. Esses dados são usados para segurança, auditoria, comprovação do aceite e defesa de direitos.',
  },
  {
    title: '6. Pagamentos',
    body: 'Pagamentos são processados por parceiro externo. O WedPlan pode receber identificadores de cliente, assinatura, cobrança, status de pagamento e dados necessários para conciliação, liberação de acesso, suporte, prevenção a fraude e cumprimento de obrigações legais. O WedPlan não armazena senha bancária, CVV ou número completo de cartão.',
  },
  {
    title: '7. Compartilhamento',
    body: 'Podemos compartilhar dados com fornecedores essenciais para operação, como hospedagem, banco de dados, autenticação, envio de e-mails, pagamentos, observabilidade, suporte e segurança. O compartilhamento é limitado ao necessário para as finalidades informadas, obrigações legais ou exercício regular de direitos.',
  },
  {
    title: '8. Cookies e preferências',
    body: 'Usamos cookies necessários para funcionamento da plataforma. Cookies de análise, preferências e marketing dependem do consentimento quando aplicável. O usuário pode recusar cookies não necessários ou alterar preferências a qualquer momento pelo gerenciador de cookies.',
  },
  {
    title: '9. Direitos do titular',
    body: 'O titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio ou eliminação de dados desnecessários, portabilidade, informações sobre compartilhamento, revisão de consentimentos e revogação de consentimento, observadas as hipóteses legais de retenção.',
  },
  {
    title: '10. Segurança',
    body: 'Adotamos medidas técnicas e organizacionais razoáveis para proteger dados pessoais, como controle de acesso, políticas no banco, segregação por conta, registros de auditoria, monitoramento de eventos relevantes e limitação de acesso por necessidade operacional.',
  },
  {
    title: '11. Retenção e eliminação',
    body: 'Mantemos dados pelo período necessário para execução do serviço, cumprimento de obrigações legais, prevenção a fraude, segurança, exercício regular de direitos, resolução de disputas e preservação de registros exigidos por normas brasileiras. Quando possível e aplicável, dados podem ser eliminados ou anonimizados após o término das finalidades.',
  },
  {
    title: '12. Alterações desta política',
    body: 'Esta Política pode ser atualizada para refletir mudanças legais, técnicas, operacionais ou comerciais. Alterações relevantes serão comunicadas por meio razoável, e novos consentimentos poderão ser solicitados quando necessário.',
  },
];

export const LegalPage = ({ type }: LegalPageProps) => {
  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? 'Política de Privacidade' : 'Termos de Uso';
  const subtitle = isPrivacy
    ? 'Como o WedPlan trata dados pessoais, cookies e informações do casamento.'
    : 'Regras principais para contratar e utilizar o WedPlan.';
  const sections = isPrivacy ? privacySections : termsSections;
  const Icon = isPrivacy ? ShieldCheck : FileText;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center">
            <BrandLogo size="sm" />
          </Link>
          <Link
            to="/"
            className="hidden h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-black text-foreground transition-colors hover:bg-accent sm:flex"
          >
            Voltar ao site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary">
          <ArrowLeft size={17} />
          Voltar
        </Link>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon size={26} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">WedPlan</p>
              <h1 className="mt-2 text-3xl font-black tracking-normal text-foreground sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-muted-foreground">{subtitle}</p>
              <p className="mt-4 text-xs font-bold text-muted-foreground">Última atualização: {updatedAt}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6">
            {sections.map((section) => (
              <article key={section.title}>
                <h2 className="text-lg font-black text-foreground">{section.title}</h2>
                <p className="mt-2 text-sm font-medium leading-7 text-muted-foreground">{section.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs font-bold leading-6 text-muted-foreground">
            Este documento é uma base informativa para a operação do WedPlan e deve ser revisado por assessoria jurídica antes de uso comercial em larga escala.
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {isPrivacy && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('wedplan:open-cookie-preferences'))}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-black text-foreground transition-colors hover:bg-accent"
              >
                Gerenciar preferências de cookies
              </button>
            )}
            <Link
              to={isPrivacy ? '/termos-de-uso' : '/politica-de-privacidade'}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-black text-foreground transition-colors hover:bg-accent"
            >
              {isPrivacy ? 'Ver Termos de Uso' : 'Ver Política de Privacidade'}
            </Link>
            <Link
              to="/checkout/dados-pessoais"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-black text-white transition-colors hover:bg-primary/90"
            >
              Assinar WedPlan
            </Link>
          </div>
        </section>
      </main>

      <footer className="px-4 pb-8 text-center text-xs font-bold text-muted-foreground">
        WedPlan 2026. Planejamento do casamento, sem caos.
      </footer>
    </div>
  );
};
