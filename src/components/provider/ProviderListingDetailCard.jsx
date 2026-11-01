import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../../utils/format";
import ProviderStatusBadge from "./ProviderStatusBadge";

/**
 * Show an advertisement's lifecycle state and its room/price offers.
 *
 * @param {{ listing: object }} props Listing view model with normalized room offers.
 */
export default function ProviderListingDetailCard({ listing }) {
  return (
    <article className="provider-listing-detail-card">
      <header className="provider-listing-detail-header">
        <div>
          <p className="provider-eyebrow">LISTING · DEMO</p>
          <h3>{listing.name}</h3>
        </div>
        <ProviderStatusBadge status={listing.status} />
      </header>

      <p className="provider-listing-detail-description">{listing.description}</p>

      <div className="provider-room-offers-heading">
        <h4>Room offers</h4>
        <span>{listing.roomOffers.length}</span>
      </div>

      {listing.roomOffers.length > 0 ? (
        <div className="provider-room-offers-table-wrap">
          <table className="provider-room-offers-table">
            <caption className="sr-only">Example room offers for {listing.name}</caption>
            <thead>
              <tr>
                <th scope="col">Room type</th>
                <th scope="col">Occupancy</th>
                <th scope="col">Example count</th>
                <th scope="col">Price</th>
              </tr>
            </thead>
            <tbody>
              {listing.roomOffers.map((roomOffer) => (
                <tr key={roomOffer.id}>
                  <td>{roomOffer.roomType}</td>
                  <td>{roomOffer.occupancy} {roomOffer.occupancy === 1 ? "person" : "people"}</td>
                  <td>{roomOffer.exampleRoomCount}</td>
                  <td>
                    <strong>{formatPrice(roomOffer.price)}</strong>
                    <span> / {roomOffer.pricePeriod.replaceAll("_", " ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="provider-no-room-offers">No room offers are recorded for this example listing.</p>
      )}

      <footer className="provider-listing-detail-footer">
        <span>Example pricing and room counts only · not live availability</span>
        <Link to={`/properties/${listing.id}`}>
          View listing preview <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
}
