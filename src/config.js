export const contactDetails = {
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "",
  email: import.meta.env.VITE_CONTACT_EMAIL || "hello@sovereignstay.demo",
};
