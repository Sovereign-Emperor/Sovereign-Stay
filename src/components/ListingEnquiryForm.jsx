import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { submitListingEnquiry, validateEnquiry } from "../services/enquiryService";

const initialValues = {
  name: "",
  email: "",
  phone: "",
  message: "",
  viewingDate: "",
};

export default function ListingEnquiryForm({ listingId, listingName }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function handleSubmit(event) {
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
      const result = submitListingEnquiry(listingId, values);
      setSuccess(result.duplicate
        ? "This enquiry was already saved in this browser demo."
        : "Your enquiry was saved in this browser demo. It is not sent to a provider in real time.");
      if (!result.duplicate) setValues(initialValues);
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
      <p>Enquiries are saved only in this browser demo; they are not sent in real time.</p>
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
      <button className="enquiry-button" type="submit" disabled={isSubmitting}><Send size={16} />{isSubmitting ? "Saving enquiry…" : `Enquire about ${listingName}`}</button>
    </form>
  );
}
