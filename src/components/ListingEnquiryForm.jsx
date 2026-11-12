import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  submitAuthenticatedListingEnquiry,
  submitListingEnquiry,
  validateEnquiry,
} from "../services/enquiryService";
import { useOptionalAuth } from "../auth/AuthProvider";
import { isExplicitSupabaseMode } from "../data/supabaseClient";

const initialValues = {
  name: "",
  email: "",
  phone: "",
  message: "",
  viewingDate: "",
};

export default function ListingEnquiryForm({ listingId, listingName }) {
  const location = useLocation();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const idempotencyKey = useRef(crypto.randomUUID());
  const auth = useOptionalAuth();

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitLock.current) return;
    const nextErrors = validateEnquiry(values);
    setErrors(nextErrors);
    setError("");
    setSuccess("");
    if (Object.keys(nextErrors).length) {
      event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    try {
      if (isExplicitSupabaseMode) {
        await submitAuthenticatedListingEnquiry(listingId, values, idempotencyKey.current);
        idempotencyKey.current = crypto.randomUUID();
        setSuccess("Your enquiry was sent securely. The provider can review it in their inbox.");
        setValues(initialValues);
      } else {
        const result = submitListingEnquiry(listingId, values);
        setSuccess(result.duplicate
          ? "This enquiry was already saved in this browser demo."
          : "Your enquiry was saved in this browser demo. It is not sent to a provider in real time.");
        if (!result.duplicate) setValues(initialValues);
      }
    } catch (cause) {
      setError(cause.message || "Your enquiry could not be saved.");
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  const field = (name, label, type = "text", required = true) => (
    <label className="student-enquiry-field" htmlFor={`enquiry-${name}`}>
      {label}{required && <span aria-hidden="true"> *</span>}
      <input
        id={`enquiry-${name}`}
        type={type}
        value={values[name]}
        required={required}
        onChange={(event) => setField(name, event.target.value)}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `enquiry-${name}-error` : undefined}
      />
      {errors[name] && <span className="student-enquiry-error" id={`enquiry-${name}-error`}>{errors[name]}</span>}
    </label>
  );

  return (
    <form className="student-enquiry-form" onSubmit={handleSubmit} noValidate>
      <h3>Ask about this listing</h3>
      <p>{isExplicitSupabaseMode ? "Enquiries are delivered to the provider inbox and stored with this listing." : "Enquiries are saved only in this browser demo; they are not sent in real time."}</p>
      {isExplicitSupabaseMode && !auth?.user && <p role="note"><Link to="/auth/login" state={{ from: location.pathname }}>Sign in</Link> to send an enquiry. Your message is linked to your verified student account.</p>}
      {isExplicitSupabaseMode && auth?.user && !auth.roles.includes("student") && <p role="note">A student account is required to send an enquiry.</p>}
      {success && <p className="student-enquiry-success" role="status">{success}</p>}
      {error && <p className="student-enquiry-error-banner" role="alert">{error}</p>}
      {field("name", "Your name")}
      {field("email", "Email address", "email")}
      {field("phone", "Phone number")}
      {field("viewingDate", "Optional viewing date", "date", false)}
      <label className="student-enquiry-field" htmlFor="enquiry-message">
        Message <span aria-hidden="true">*</span>
        <textarea id="enquiry-message" rows="4" value={values.message} onChange={(event) => setField("message", event.target.value)} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "enquiry-message-error" : undefined} />
        {errors.message && <span className="student-enquiry-error" id="enquiry-message-error">{errors.message}</span>}
      </label>
      <button className="enquiry-button" type="submit" disabled={isSubmitting || (isExplicitSupabaseMode && (!auth?.user || !auth.roles.includes("student")))}><Send size={16} />{isSubmitting ? "Saving enquiry…" : `Enquire about ${listingName}`}</button>
    </form>
  );
}
