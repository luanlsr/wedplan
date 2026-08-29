import { cn } from "../../lib/utils";

const defaultMessage =
  "Olá! Quero conhecer melhor o WedPlan e tirar algumas dúvidas sobre os planos.";

const onlyDigits = (value?: string) => (value || "").replace(/\D/g, "");

type WhatsAppFloatingButtonProps = {
  className?: string;
  message?: string;
};

export const WhatsAppFloatingButton = ({ className, message = defaultMessage }: WhatsAppFloatingButtonProps) => {
  const phone = onlyDigits(import.meta.env.VITE_WHATSAPP_PHONE);
  const configuredMessage = import.meta.env.VITE_WHATSAPP_DEFAULT_MESSAGE || message;
  const href = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(configuredMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(configuredMessage)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com o WedPlan pelo WhatsApp"
      className={cn(
        "fixed bottom-5 right-5 z-[70] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] shadow-2xl shadow-emerald-950/25 transition hover:-translate-y-0.5 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#25d366]/30 sm:h-16 sm:w-16",
        className
      )}
    >
      <img
        src="/image/WhatsApp.svg.webp"
        alt=""
        className="h-8 w-8 object-contain sm:h-10 sm:w-10"
        loading="lazy"
      />
    </a>
  );
};
