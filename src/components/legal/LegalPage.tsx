import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../layout/BrandLogo';

type LegalPageProps = {
  type: 'terms' | 'privacy';
};

const updatedAt = '27 de agosto de 2026';

const termsSections = [
  {
    title: '1. Aceite dos termos',
    body: 'Ao contratar ou utilizar o WedPlan, você declara que leu e aceitou estes Termos de Uso. Caso não concorde, não utilize a plataforma.',
  },
  {
    title: '2. Sobre o WedPlan',
    body: 'O WedPlan é uma plataforma de organização de casamento com recursos para convidados, fornecedores, tarefas, financeiro, site do casal, RSVP, mensagens e lista de presentes, conforme o plano contratado.',
  },
  {
    title: '3. Conta e acesso',
    body: 'A conta é liberada após a confirmação do pagamento. O usuário é responsável por manter seus dados atualizados, proteger suas credenciais e comunicar qualquer uso indevido.',
  },
  {
    title: '4. Assinatura e pagamento',
    body: 'Os pagamentos são processados por parceiro financeiro externo. O WedPlan não armazena dados completos de cartão, senha bancária ou credenciais financeiras do usuário.',
  },
  {
    title: '5. Uso adequado',
    body: 'É proibido usar o WedPlan para atividades ilegais, envio de conteúdo ofensivo, tentativa de acesso indevido, engenharia reversa, sobrecarga dos serviços ou violação de direitos de terceiros.',
  },
  {
    title: '6. Disponibilidade',
    body: 'Trabalhamos para manter a plataforma disponível e segura, mas podem ocorrer interrupções por manutenção, atualizações, provedores externos ou eventos fora do nosso controle.',
  },
  {
    title: '7. Cancelamento',
    body: 'O usuário pode solicitar cancelamento conforme os canais de atendimento disponíveis. O acesso a funcionalidades pagas pode ser limitado ou encerrado ao fim do ciclo contratado.',
  },
  {
    title: '8. Alteracoes',
    body: 'Estes termos podem ser atualizados para refletir melhorias do produto, mudanças operacionais, requisitos legais ou novas funcionalidades.',
  },
];

const privacySections = [
  {
    title: '1. Dados coletados',
    body: 'Podemos coletar nome, e-mail, telefone, CPF/CNPJ para cobrança, dados do casamento, convidados, fornecedores, tarefas, preferências de cookies e informações técnicas de acesso.',
  },
  {
    title: '2. Finalidades',
    body: 'Usamos os dados para criar e manter sua conta, processar assinaturas, operar funcionalidades do sistema, prestar suporte, melhorar a experiência, cumprir obrigações legais e proteger a plataforma.',
  },
  {
    title: '3. Dados de pagamento',
    body: 'O pagamento é realizado em ambiente de parceiro externo. O WedPlan não solicita nem armazena senha bancária, dados completos de cartão ou credenciais de pagamento.',
  },
  {
    title: '4. Compartilhamento',
    body: 'Podemos compartilhar dados com fornecedores essenciais para operação, como hospedagem, banco de dados, autenticação, envio de e-mails, pagamentos e ferramentas de segurança, sempre limitado ao necessário.',
  },
  {
    title: '5. Cookies',
    body: 'Usamos cookies necessários para funcionamento da plataforma. Cookies de análise, preferências e marketing dependem do consentimento do usuário quando aplicável.',
  },
  {
    title: '6. Direitos do titular',
    body: 'O usuário pode solicitar acesso, correção, exclusão, portabilidade, informações sobre compartilhamento e revisão de consentimentos, conforme a legislação aplicável.',
  },
  {
    title: '7. Seguranca',
    body: 'Adotamos medidas técnicas e organizacionais para proteger dados pessoais, como controle de acesso, políticas no banco, segregação por conta e monitoramento de eventos relevantes.',
  },
  {
    title: '8. Retencao',
    body: 'Mantemos os dados pelo período necessário para execução do serviço, cumprimento de obrigações legais, prevenção a fraudes, exercício de direitos e resolução de disputas.',
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
