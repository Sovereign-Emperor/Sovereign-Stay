import { useState } from "react";
import { ArrowLeft, Check, MapPin, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import ProviderImageUpload from "../../components/provider/ProviderImageUpload";
import { GHANA_REGIONS } from "../../data/ghanaRegions";
import { validatePropertyForm } from "../../utils/propertyFormValidation";

const accommodationTypes = [
  "Hostel",
  "Apartment",
  "Shared apartment",
  "Private room",
  "Guest house",
  "Other",
];

const initialValues = {
  name: "",
  type: "",
  description: "",
  region: "",
  city: "",
  area: "",
  address: "",
  institution: "",
};

const requiredFields = ["name", "type", "region", "city", "area"];

function getFieldErrorId(field) {
  return `property-${field}-error`;
}

/**
 * Demo property details form. It validates input but deliberately does not
 * persist data or imply that a property has been created.
 */
export default function ProviderPropertyFormPage() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);
    setSubmissionMessage("");

    if (touched[name] || hasSubmitted) {
      const allErrors = validatePropertyForm(nextValues);
      const visibleFields = hasSubmitted ? requiredFields : Object.keys(touched);
      setErrors(
        Object.fromEntries(
          visibleFields
            .filter((field) => allErrors[field])
            .map((field) => [field, allErrors[field]]),
        ),
      );
    }
  }

  function markFieldTouched(event) {
    const { name } = event.target;
    setTouched((current) => ({ ...current, [name]: true }));

    if (requiredFields.includes(name)) {
      setErrors((current) => {
        const nextErrors = { ...current };
        const nextMessage = validatePropertyForm(values)[name];
        if (nextMessage) {
          nextErrors[name] = nextMessage;
        } else {
          delete nextErrors[name];
        }
        return nextErrors;
      });
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setHasSubmitted(true);
    setTouched(Object.fromEntries(requiredFields.map((field) => [field, true])));

    const nextErrors = validatePropertyForm(values);
    setErrors(nextErrors);
    setSubmissionMessage("");

    const firstInvalidField = requiredFields.find((field) => nextErrors[field]);
    if (firstInvalidField) {
      document.getElementById(`property-${firstInvalidField}`)?.focus();
      return;
    }

    setSubmissionMessage(
      "Your details pass validation. This demo does not save properties, so nothing has been created.",
    );
  }

  function renderError(field) {
    return errors[field] ? (
      <span className="provider-form-error" id={getFieldErrorId(field)}>
        {errors[field]}
      </span>
    ) : null;
  }

  return (
    <div className="provider-page provider-property-form-page">
      <Link className="provider-back-link" to="/provider/properties">
        <ArrowLeft size={15} /> Cancel and return to properties
      </Link>

      <header className="provider-form-heading">
        <span className="provider-form-heading-icon" aria-hidden="true">
          <Building2 size={21} />
        </span>
        <div>
          <p className="provider-eyebrow">PROPERTY SETUP · DEMO</p>
          <h2>Add a property</h2>
          <p>Enter the accommodation and location details. Complete every field marked required to continue.</p>
        </div>
      </header>

      <div className="provider-demo-banner" role="note">
        <p>
          <strong>Demo form.</strong> This form checks your details in the browser only. It does not
          create or save a property.
        </p>
      </div>

      <form className="provider-property-form" noValidate onSubmit={handleSubmit}>
        <section className="provider-form-section" aria-labelledby="property-basics-heading">
          <div className="provider-form-section-heading">
            <span className="provider-form-section-icon" aria-hidden="true"><Building2 size={17} /></span>
            <div>
              <h3 id="property-basics-heading">Property identity</h3>
              <p>Give the property a clear name and choose the accommodation type.</p>
            </div>
          </div>

          <div className="provider-form-grid">
            <div className="provider-form-field provider-form-field-wide">
              <label htmlFor="property-name">Property name <span aria-hidden="true">*</span></label>
              <input
                autoComplete="organization"
                id="property-name"
                name="name"
                value={values.name}
                onChange={updateField}
                onBlur={markFieldTouched}
                placeholder="e.g. Greenview Student Residence"
                required
                aria-required="true"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? getFieldErrorId("name") : undefined}
              />
              {renderError("name")}
            </div>

            <div className="provider-form-field provider-form-field-wide">
              <label htmlFor="property-type">Accommodation type <span aria-hidden="true">*</span></label>
              <select
                id="property-type"
                name="type"
                value={values.type}
                onChange={updateField}
                onBlur={markFieldTouched}
                required
                aria-required="true"
                aria-invalid={Boolean(errors.type)}
                aria-describedby={errors.type ? getFieldErrorId("type") : undefined}
              >
                <option value="">Choose an accommodation type</option>
                {accommodationTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {renderError("type")}
            </div>

            <div className="provider-form-field provider-form-field-wide">
              <label htmlFor="property-description">Description <span className="provider-form-optional">Optional</span></label>
              <textarea
                id="property-description"
                name="description"
                value={values.description}
                onChange={updateField}
                onBlur={markFieldTouched}
                placeholder="Share a short overview of the accommodation and its surroundings."
                rows="4"
              />
              <span className="provider-form-hint">You can add more detail later. Do not include private information.</span>
            </div>
          </div>
        </section>

        <ProviderImageUpload />

        <section className="provider-form-section" aria-labelledby="property-location-heading">
          <div className="provider-form-section-heading">
            <span className="provider-form-section-icon" aria-hidden="true"><MapPin size={17} /></span>
            <div>
              <h3 id="property-location-heading">Property location</h3>
              <p>Choose the region, then enter the town and neighbourhood where the property is located.</p>
            </div>
          </div>

          <div className="provider-form-grid">
            <div className="provider-form-field">
              <label htmlFor="property-region">Region <span aria-hidden="true">*</span></label>
              <select
                autoComplete="address-level1"
                id="property-region"
                name="region"
                value={values.region}
                onChange={updateField}
                onBlur={markFieldTouched}
                required
                aria-required="true"
                aria-invalid={Boolean(errors.region)}
                aria-describedby={errors.region ? getFieldErrorId("region") : undefined}
              >
                <option value="">Select region</option>
                {GHANA_REGIONS.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
              {renderError("region")}
            </div>

            <div className="provider-form-field">
              <label htmlFor="property-city">City or town <span aria-hidden="true">*</span></label>
              <input
                autoComplete="address-level2"
                id="property-city"
                name="city"
                value={values.city}
                onChange={updateField}
                onBlur={markFieldTouched}
                placeholder="e.g. Kumasi, Ho, or Koforidua"
                required
                aria-required="true"
                aria-invalid={Boolean(errors.city)}
                aria-describedby={errors.city ? getFieldErrorId("city") : undefined}
              />
              {renderError("city")}
              <span className="provider-form-hint">Enter the town or city where students can find this accommodation.</span>
            </div>

            <div className="provider-form-field">
              <label htmlFor="property-area">Area or neighbourhood <span aria-hidden="true">*</span></label>
              <input
                autoComplete="address-level3"
                id="property-area"
                name="area"
                value={values.area}
                onChange={updateField}
                onBlur={markFieldTouched}
                placeholder="e.g. Ayeduase, Adweso, or Dansoman"
                required
                aria-required="true"
                aria-invalid={Boolean(errors.area)}
                aria-describedby={errors.area ? getFieldErrorId("area") : undefined}
              />
              {renderError("area")}
              <span className="provider-form-hint">Add the local area or neighbourhood, not a room or building name.</span>
            </div>
          </div>
        </section>

        <section className="provider-form-section" aria-labelledby="additional-location-heading">
          <div className="provider-form-section-heading">
            <span className="provider-form-section-icon" aria-hidden="true"><MapPin size={17} /></span>
            <div>
              <h3 id="additional-location-heading">Additional location details</h3>
              <p>Optional details can help students recognize the surrounding area.</p>
            </div>
          </div>

          <div className="provider-form-grid">
            <div className="provider-form-field">
              <label htmlFor="property-address">Street or address <span className="provider-form-optional">Optional</span></label>
              <input
                autoComplete="street-address"
                id="property-address"
                name="address"
                value={values.address}
                onChange={updateField}
                onBlur={markFieldTouched}
                placeholder="e.g. House number, street, or a nearby landmark"
              />
              <span className="provider-form-hint">A full street address is not required for this demo form.</span>
            </div>

            <div className="provider-form-field">
              <label htmlFor="property-institution">Nearby institution <span className="provider-form-optional">Optional</span></label>
              <input
                id="property-institution"
                name="institution"
                value={values.institution}
                onChange={updateField}
                onBlur={markFieldTouched}
                placeholder="e.g. University of Ghana or KNUST"
              />
              <span className="provider-form-hint">Enter a nearby university or tertiary institution, if relevant.</span>
            </div>

          </div>
        </section>

        {submissionMessage && (
          <div className="provider-form-success" role="status">
            <Check size={18} aria-hidden="true" />
            <p>{submissionMessage}</p>
          </div>
        )}

        <div className="provider-form-actions">
          <Link className="provider-outline-button" to="/provider/properties">Cancel</Link>
          <button className="provider-primary-button" type="submit">Continue</button>
        </div>
        <p className="provider-form-required-note"><span aria-hidden="true">*</span> Required fields</p>
      </form>
    </div>
  );
}
