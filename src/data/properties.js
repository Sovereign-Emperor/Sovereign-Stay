/**
 * Domain-shaped demonstration data for the future marketplace.
 *
 * These records are fixtures, not real provider accounts or accommodation.
 * The demo repository deliberately makes draft fixtures visible in the MVP;
 * a production repository must return only listings approved for discovery.
 */

export const listingStatuses = [
  "draft",
  "pending_approval",
  "published",
  "rejected",
  "archived",
];

export const verificationStatuses = ["unverified", "pending", "verified", "rejected"];
export const availabilityStatuses = ["unknown", "available", "limited", "unavailable"];
export const listingMediaKinds = ["photo", "video"];
export const enquiryStatuses = ["new", "in_progress", "resolved", "closed"];
export const reportStatuses = ["open", "under_review", "actioned", "dismissed"];
export const reviewStatuses = ["pending", "published", "rejected", "removed"];

/** Capabilities are descriptive only; permissions must be enforced by a server. */
export const userRoles = [
  {
    id: "student",
    permissions: ["listing:read", "enquiry:create", "viewing_request:create", "report:create"],
  },
  {
    id: "provider",
    permissions: [
      "listing:create",
      "listing:read_own",
      "listing:update_own",
      "listing:archive_own",
      "enquiry:read_own",
      "availability:update_own",
    ],
  },
  {
    id: "administrator",
    permissions: [
      "user:manage",
      "listing:read_all",
      "listing:moderate",
      "verification:manage",
      "report:manage",
    ],
  },
];

/** Non-personal fixtures let several listings share one provider relationship. */
export const demoUsers = [
  {
    id: "demo-provider-a",
    displayName: "Example accommodation provider A",
    roleIds: ["provider"],
    providerVerificationStatus: "unverified",
    isDemo: true,
  },
  {
    id: "demo-provider-b",
    displayName: "Example accommodation provider B",
    roleIds: ["provider"],
    providerVerificationStatus: "unverified",
    isDemo: true,
  },
];

export const institutions = [
  {
    id: "ktu",
    name: "Koforidua Technical University",
    locationId: "koforidua",
  },
];

export const locations = [
  {
    id: "poly-junction",
    label: "Poly Junction, Koforidua",
    area: "Poly Junction",
    city: "Koforidua",
    region: "Eastern Region",
    countryCode: "GH",
    distanceKmByInstitution: { ktu: 0.6 },
    coordinates: null,
  },
  {
    id: "oyoko",
    label: "Oyoko, Koforidua",
    area: "Oyoko",
    city: "Koforidua",
    region: "Eastern Region",
    countryCode: "GH",
    distanceKmByInstitution: { ktu: 1.4 },
    coordinates: null,
  },
  {
    id: "adweso",
    label: "Adweso, Koforidua",
    area: "Adweso",
    city: "Koforidua",
    region: "Eastern Region",
    countryCode: "GH",
    distanceKmByInstitution: { ktu: 2.1 },
    coordinates: null,
  },
  {
    id: "effiduase",
    label: "Effiduase, Koforidua",
    area: "Effiduase",
    city: "Koforidua",
    region: "Eastern Region",
    countryCode: "GH",
    distanceKmByInstitution: { ktu: 0.9 },
    coordinates: null,
  },
  {
    id: "jackson-park",
    label: "Jackson Park, Koforidua",
    area: "Jackson Park",
    city: "Koforidua",
    region: "Eastern Region",
    countryCode: "GH",
    distanceKmByInstitution: { ktu: 1.8 },
    coordinates: null,
  },
  {
    id: "suhum-road",
    label: "Suhum Road, Koforidua",
    area: "Suhum Road",
    city: "Koforidua",
    region: "Eastern Region",
    countryCode: "GH",
    distanceKmByInstitution: { ktu: 2.7 },
    coordinates: null,
  },
];

export const roomTypes = [
  { id: "single", label: "1 in a room", occupants: 1 },
  { id: "double", label: "2 in a room", occupants: 2 },
  { id: "triple", label: "3 in a room", occupants: 3 },
  { id: "quad", label: "4 in a room", occupants: 4 },
];

export const facilities = [
  { id: "wifi", label: "Wi-Fi" },
  { id: "water", label: "Water" },
  { id: "security", label: "Security" },
  { id: "study-area", label: "Study area" },
  { id: "kitchen", label: "Kitchen" },
  { id: "laundry", label: "Laundry" },
  { id: "private-bathroom", label: "Private bathroom" },
  { id: "air-conditioning", label: "Air conditioning" },
];

export const facilityOptions = facilities.map(({ label }) => label);

function illustrativePhotos(listingId, propertyName, photoIds) {
  return photoIds.map((demoPhotoId, index) => ({
    id: `${listingId}-photo-${index + 1}`,
    kind: "photo",
    sortOrder: index,
    isCover: index === 0,
    altText: `Illustrative photo for ${propertyName}`,
    storageKey: null,
    demoPhotoId,
  }));
}

/**
 * Listing fixtures use references rather than copying provider, place,
 * institution, room-type, and facility details into every record.
 */
export const demoListings = [
  {
    id: "greenview-residences",
    propertyId: "property-greenview",
    status: "draft",
    isDemo: true,
    name: "Greenview Student Residences",
    propertyType: "Student hostel",
    locationId: "poly-junction",
    institutionIds: ["ktu"],
    rooms: [
      {
        id: "greenview-double",
        roomTypeId: "double",
        exampleRoomCount: 4,
        price: { amount: 2800, currency: "GHS", period: "semester" },
      },
    ],
    facilityIds: ["wifi", "water", "security", "study-area", "laundry"],
    media: illustrativePhotos("greenview-residences", "Greenview Student Residences", [
      "photo-1555854877-bab0e564b8d5",
      "photo-1560185008-b033106af5c3",
      "photo-1522708323590-d24dbb6b0267",
      "photo-1505693416388-ac5ce068fe85",
    ]),
    availability: { status: "unknown", reportedRoomsAvailable: null, lastConfirmedAt: null },
    propertyVerificationStatus: "unverified",
    lastUpdatedAt: null,
    description:
      "A bright, welcoming student residence with thoughtful shared spaces and an easy walk to campus. Settle into a furnished room, meet your neighbours in the courtyard, and keep the essentials close.",
    highlights: ["Furnished rooms", "24-hour security", "Shared study lounge"],
    rules: ["No smoking indoors", "Quiet hours after 10 pm", "Visitors sign in"],
  },
  {
    id: "hilltop-court",
    propertyId: "property-hilltop",
    status: "draft",
    isDemo: true,
    name: "Hilltop Court Hostel",
    propertyType: "Student hostel",
    locationId: "oyoko",
    institutionIds: ["ktu"],
    rooms: [
      {
        id: "hilltop-quad",
        roomTypeId: "quad",
        exampleRoomCount: 7,
        price: { amount: 1950, currency: "GHS", period: "semester" },
      },
    ],
    facilityIds: ["water", "security", "kitchen", "laundry"],
    media: illustrativePhotos("hilltop-court", "Hilltop Court Hostel", [
      "photo-1564013799919-ab600027ffc6",
      "photo-1560185009-5bf9f2849488",
      "photo-1493809842364-78817add7ffb",
      "photo-1600607687939-ce8a6c25118c",
    ]),
    availability: { status: "unknown", reportedRoomsAvailable: null, lastConfirmedAt: null },
    propertyVerificationStatus: "unverified",
    lastUpdatedAt: null,
    description:
      "A relaxed, budget-friendly base in the lively Oyoko neighbourhood. The shared kitchen, secure entry, and regular transport connections make everyday student life a little simpler.",
    highlights: ["Budget-friendly", "Shared kitchen", "Transport nearby"],
    rules: ["No smoking indoors", "Keep shared areas tidy"],
  },
  {
    id: "the-palm-house",
    propertyId: "property-palm-house",
    status: "draft",
    isDemo: true,
    name: "The Palm House",
    propertyType: "Shared apartment",
    locationId: "adweso",
    institutionIds: ["ktu"],
    rooms: [
      {
        id: "palm-double",
        roomTypeId: "double",
        exampleRoomCount: 2,
        price: { amount: 4200, currency: "GHS", period: "semester" },
      },
    ],
    facilityIds: ["wifi", "water", "security", "kitchen", "private-bathroom"],
    media: illustrativePhotos("the-palm-house", "The Palm House", [
      "photo-1600607687920-4e2a09cf159d",
      "photo-1600210492486-724fe5c67fb0",
      "photo-1600566753086-00f18fb6b3ea",
      "photo-1600607687644-c7171b42498f",
    ]),
    availability: { status: "unknown", reportedRoomsAvailable: null, lastConfirmedAt: null },
    propertyVerificationStatus: "unverified",
    lastUpdatedAt: null,
    description:
      "A calm, leafy shared apartment for students who value a little extra breathing room. Enjoy private bathrooms, a full kitchen, and a shaded outdoor spot to unwind after lectures.",
    highlights: ["Private bathrooms", "Full kitchen", "Quiet residential area"],
    rules: ["No smoking indoors", "Guests by arrangement"],
  },
  {
    id: "campus-edge-lodge",
    propertyId: "property-campus-edge",
    status: "draft",
    isDemo: true,
    name: "Campus Edge Lodge",
    propertyType: "Student hostel",
    locationId: "effiduase",
    institutionIds: ["ktu"],
    rooms: [
      {
        id: "campus-edge-single",
        roomTypeId: "single",
        exampleRoomCount: 3,
        price: { amount: 3400, currency: "GHS", period: "semester" },
      },
    ],
    facilityIds: ["wifi", "water", "security", "study-area", "air-conditioning"],
    media: illustrativePhotos("campus-edge-lodge", "Campus Edge Lodge", [
      "photo-1611892440504-42a792e24d32",
      "photo-1616486338812-3dadae4b4ace",
      "photo-1618221195710-dd6b41faaea6",
      "photo-1600607687939-ce8a6c25118c",
    ]),
    availability: { status: "unknown", reportedRoomsAvailable: null, lastConfirmedAt: null },
    propertyVerificationStatus: "unverified",
    lastUpdatedAt: null,
    description:
      "A quiet option close to lectures, with private rooms designed for focused study. Reliable security and a dedicated study area help make this a comfortable home from home.",
    highlights: ["Private rooms", "Dedicated study area", "Close to campus"],
    rules: ["No smoking indoors", "Quiet hours after 10 pm"],
  },
  {
    id: "sunrise-hostel",
    propertyId: "property-sunrise",
    status: "draft",
    isDemo: true,
    name: "Sunrise Hostel",
    propertyType: "Student hostel",
    locationId: "jackson-park",
    institutionIds: ["ktu"],
    rooms: [
      {
        id: "sunrise-triple",
        roomTypeId: "triple",
        exampleRoomCount: 5,
        price: { amount: 2250, currency: "GHS", period: "semester" },
      },
    ],
    facilityIds: ["water", "security", "kitchen", "wifi"],
    media: illustrativePhotos("sunrise-hostel", "Sunrise Hostel", [
      "photo-1522771739844-6a9f6d5f14af",
      "photo-1560185127-6ed189bf02f4",
      "photo-1600566753190-17f0baa2a6c3",
      "photo-1615874694520-474822394e73",
    ]),
    availability: { status: "unknown", reportedRoomsAvailable: null, lastConfirmedAt: null },
    propertyVerificationStatus: "unverified",
    lastUpdatedAt: null,
    description:
      "An easy-going student hostel near shops, food spots, and local transport. Shared rooms are furnished and the open common area gives residents space to relax together.",
    highlights: ["Near shops and food", "Furnished rooms", "Common area"],
    rules: ["No smoking indoors", "Visitors sign in"],
  },
  {
    id: "cedar-student-homes",
    propertyId: "property-cedar",
    status: "draft",
    isDemo: true,
    name: "Cedar Student Homes",
    propertyType: "Shared apartment",
    locationId: "suhum-road",
    institutionIds: ["ktu"],
    rooms: [
      {
        id: "cedar-quad",
        roomTypeId: "quad",
        exampleRoomCount: 6,
        price: { amount: 1650, currency: "GHS", period: "semester" },
      },
    ],
    facilityIds: ["water", "security", "kitchen"],
    media: illustrativePhotos("cedar-student-homes", "Cedar Student Homes", [
      "photo-1560185007-cde436f6a4d0",
      "photo-1564078516393-cf04bd966897",
      "photo-1560185008-a33f5cbb4db4",
      "photo-1595526114035-0d45ed16cfbf",
    ]),
    availability: { status: "unknown", reportedRoomsAvailable: null, lastConfirmedAt: null },
    propertyVerificationStatus: "unverified",
    lastUpdatedAt: null,
    description:
      "A practical, low-cost choice with the basics covered and room to make the space your own. A shared kitchen and secure compound help keep student living straightforward.",
    highlights: ["Affordable option", "Shared kitchen", "Secure compound"],
    rules: ["No smoking indoors", "Keep shared areas tidy"],
  },
];

/**
 * Build a consistently cropped Unsplash URL for an illustrative property image.
 *
 * @param {string} photoId Unsplash photo identifier.
 * @param {number} [width=900] Requested image width in pixels.
 * @returns {string} Image URL with the project's crop and quality settings.
 */
export const imageUrl = (photoId, width = 900) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=85`;
