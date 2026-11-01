import { MessageCircle } from "lucide-react";
import { contactDetails } from "../config";

/**
 * Open WhatsApp with a prefilled message that clearly identifies the listing as a demo.
 *
 * @param {{
 *   propertyName: string,
 *   className?: string,
 *   children?: import("react").ReactNode
 * }} props
 */
export default function WhatsAppLink({
  propertyName,
  className = "",
  children = "Ask about this place",
}) {
  const message = encodeURIComponent(
    `Hi! I'm exploring student accommodation on Sovereign Stay. I saw the demo listing for ${propertyName} and understand it isn't a real or verified offer. Could you share details about any real accommodation options and how to arrange a viewing?`,
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
      aria-label={`Enquire about real accommodation options via WhatsApp; demo listing: ${propertyName}`}
    >
      <MessageCircle size={18} />
      {children}
    </a>
  );
}
