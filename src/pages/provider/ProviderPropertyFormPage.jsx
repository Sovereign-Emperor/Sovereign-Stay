import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MapPin, Building2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProviderImageUpload from "../../components/provider/ProviderImageUpload";
import { GHANA_REGIONS } from "../../data/ghanaRegions";
import { DEMO_PROVIDER_ID } from "../../data/demoProviderRepository";
import {
  createProviderProperty,
  getProviderDashboard,
  getProviderPropertyImages,
  updateProviderProperty,
} from "../../services/providerDashboardService";
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
 * Create or edit one physical property in the browser-persisted demo workspace.
 */
export default function ProviderPropertyFormPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(propertyId);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(!propertyId);
  const [loadError, setLoadError] = useState("");
  const [photos, setPhotos] = useState([]);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!propertyId) return;

    let active = true;
    setIsReady(false);
    setLoadError("");
    setPhotos([]);
    try {
      const property = getProviderDashboard(DEMO_PROVIDER_ID)?.properties
        .find((record) => record.id === propertyId);
      if (!property) {
        setLoadError("This property could not be found in your provider workspace.");
        setIsReady(true);
        return () => {
          active = false;
        };
      }

      setValues({
        name: property.name,
        type: property.type,
        description: property.description,
        region: property.region,
        city: property.city,
        area: property.area,
        address: property.address,
        institution: property.institution,
      });

      getProviderPropertyImages(DEMO_PROVIDER_ID, propertyId)
        .then((savedImages) => {
          if (active) setPhotos(savedImages.map((image) => ({ ...image, isCover: image.isCover })));
        })
        .catch((error) => {
          if (active) setLoadError(error.message);
        })
        .finally(() => {
          if (active) setIsReady(true);
        });
    } catch (error) {
      setLoadError(error.message);
      setIsReady(true);
    }

    return () => {
      active = false;
    };
  }, [propertyId]);

  function updateField(event) {
    const { name, value } = event.target;
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);
    setSubmissionError("");

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

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitLock.current || isSubmitting) return;
    setHasSubmitted(true);
    setTouched(Object.fromEntries(requiredFields.map((field) => [field, true])));

    const nextErrors = validatePropertyForm(values);
    setErrors(nextErrors);
    setSubmissionError("");

    const firstInvalidField = requiredFields.find((field) => nextErrors[field]);
    if (firstInvalidField) {
      document.getElementById(`property-${firstInvalidField}`)?.focus();
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setSubmissionError("");

    try {
      if (isEditing) {
        const result = await updateProviderProperty(
          DEMO_PROVIDER_ID,
          propertyId,
          values,
          photos,
        );
        navigate(`/provider/properties/${propertyId}`, {
          state: {
            notice: "Property changes were saved in this browser's demo workspace.",
            warnings: result.warnings,
          },
        });
      } else {
        const property = await createProviderProperty(DEMO_PROVIDER_ID, values, photos);
        navigate(`/provider/properties/${property.id}`, {
          state: {
            notice: "Property added to this browser's demo workspace. No listing or room offer was created.",
          },
        });
      }
    } catch (error) {
      setSubmissionError(error.message || "The property could not be saved. Please try again.");
      submitLock.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderError(field) {
    return errors[field] ? (
      <span className="provider-form-error" id={getFieldErrorId(field)}>
        {errors[field]}
      </span>
    ) : null;
  }

  if (!isReady || loadError) {
    return (
      <div className="provider-page provider-property-form-page">
        <Link className="provider-back-link" to="/provider/properties">
          <ArrowLeft size={15} /> {isEditing ? "Cancel and return to property" : "Cancel and return to properties"}
        </Link>
        {!isReady ? (
          <p role="status" aria-live="polite">Loading property details…</p>
        ) : (
          <div className="provider-empty-state" role="alert">
            <h2>Property could not be loaded</h2>
            <p>{loadError}</p>
            <Link className="provider-primary-button" to="/provider/properties">Back to properties</Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="provider-page provider-property-form-page">
      <Link className="provider-back-link" to="/provider/properties">
        <ArrowLeft size={15} /> {isEditing ? "Cancel and return to property" : "Cancel and return to properties"}
      </Link>
      <header className="provider-form-heading">
        <span className="provider-form-heading-icon" aria-hidden="true">
          <Building2 size={21} />
        </span>
        <div>
          <p className="provider-eyebrow">PROPERTY SETUP · LOCAL DEMO</p>
          <h2>{isEditing ? "Edit property" : "Add a property"}</h2>
          <p>Enter the accommodation and location details. Complete every field marked required to save.</p>
        </div>
      </header>

      <div className="provider-demo-banner" role="note">
        <p>
          <strong>Local demo workspace.</strong> Property details and selected photos are saved only
          in this browser. They are not sent to a server.
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

        <ProviderImageUpload initialImages={photos} onImagesChange={setPhotos} />

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

        {submissionError && (
          <div className="provider-form-error-banner" role="alert">
            <p>{submissionError}</p>
          </div>
        )}

        <div className="provider-form-actions">
          <Link className="provider-outline-button" to={isEditing ? `/provider/properties/${propertyId}` : "/provider/properties"}>Cancel</Link>
          <button className="provider-primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Save property"}
          </button>
        </div>
        <p className="provider-form-required-note"><span aria-hidden="true">*</span> Required fields</p>
      </form>
    </div>
  );
}
