import { MessageCircle } from "lucide-react";
import { contactDetails } from "../config";

export default function WhatsAppLink({
  propertyName,
  className = "",
  children = "Ask about this place",
}) {
  const message = encodeURIComponent(
    `Hi! I'm interested in ${propertyName} on Sovereign Stay. Is it still available, and could I arrange a viewing?`,
  );
  const href = contactDetails.whatsappNumber
    ? `https://wa.me/${contactDetails.whatsappNumber}?text=${message}`
    : `https://wa.me/?text=${message}`;

  return (
    <a
      className={`button button-primary ${className}`}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Enquire about ${propertyName} on WhatsApp`}
    >
      <MessageCircle size={18} />
      {children}
    </a>
  );
}
