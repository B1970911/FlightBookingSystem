import { useMemo, useState } from 'react';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  Check,
  Lock,
  Crown,
  Plane,
  Sparkles,
  Info,
} from 'lucide-react';

/**
 * Parses a seatNumber string (e.g. "1A", "12C", "101F") into row and letter.
 * Returns { rowNumber, colLetter, rawNumber }
 */
function parseSeatNumber(seatNumber) {
  if (!seatNumber) return { rowNumber: 0, colLetter: '', rawNumber: '' };
  const str = String(seatNumber).trim().toUpperCase();
  const match = str.match(/^(\d+)([A-Z]+)$/);
  if (match) {
    return {
      rowNumber: parseInt(match[1], 10),
      colLetter: match[2],
      rawNumber: str,
    };
  }
  return {
    rowNumber: 0,
    colLetter: str,
    rawNumber: str,
  };
}

/**
 * Professional, realistic airline seat map layout component.
 */
export function SeatMap({
  seats = [],
  selectedSeats = [],
  onSeatClick,
  selectable = true,
  readOnly = false,
  showPrices = true,
  showLegend = true,
  className = '',
}) {
  const [hoveredSeat, setHoveredSeat] = useState(null);

  // Group seats by cabin class and organize them by rows
  const { cabins } = useMemo(() => {
    if (!Array.isArray(seats) || seats.length === 0) {
      return {
        cabins: [],
      };
    }

    let availableCount = 0;
    let bookedCount = 0;
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    // Group seats by seatClass: "Business" first, then "Economy", then others
    const classGroups = {
      Business: [],
      Economy: [],
    };

    seats.forEach((seat) => {
      const seatPrice = typeof seat.price === 'number' ? seat.price : 0;
      if (seatPrice < minPrice) minPrice = seatPrice;
      if (seatPrice > maxPrice) maxPrice = seatPrice;

      if (seat.status === 'Available') {
        availableCount++;
      } else {
        bookedCount++;
      }

      const cls = seat.seatClass === 'Business' ? 'Business' : 'Economy';
      if (!classGroups[cls]) {
        classGroups[cls] = [];
      }
      classGroups[cls].push(seat);
    });

    const parsedCabins = [];

    // Order cabins: Business first, then Economy
    const cabinClasses = ['Business', 'Economy'].filter(
      (c) => classGroups[c] && classGroups[c].length > 0
    );

    cabinClasses.forEach((cabinClass) => {
      const cabinSeats = classGroups[cabinClass];

      // Parse seats with row and column
      const parsedSeats = cabinSeats.map((s) => ({
        ...s,
        ...parseSeatNumber(s.seatNumber),
      }));

      // Collect all unique rows
      const rowMap = new Map();
      const columnLettersSet = new Set();

      parsedSeats.forEach((seat) => {
        if (seat.colLetter) {
          columnLettersSet.add(seat.colLetter);
        }
        const rowKey = seat.rowNumber > 0 ? seat.rowNumber : 'General';
        if (!rowMap.has(rowKey)) {
          rowMap.set(rowKey, []);
        }
        rowMap.get(rowKey).push(seat);
      });

      // Sorted column letters
      const columnLetters = Array.from(columnLettersSet).sort();

      // Sort rows numerically
      const sortedRows = Array.from(rowMap.entries())
        .sort((a, b) => {
          if (typeof a[0] === 'number' && typeof b[0] === 'number') {
            return a[0] - b[0];
          }
          return String(a[0]).localeCompare(String(b[0]));
        })
        .map(([rowKey, rowSeats]) => {
          // Sort seats in the row according to columnLetters order
          const sortedRowSeats = [...rowSeats].sort((s1, s2) => {
            const i1 = columnLetters.indexOf(s1.colLetter);
            const i2 = columnLetters.indexOf(s2.colLetter);
            if (i1 !== -1 && i2 !== -1) return i1 - i2;
            return s1.seatNumber.localeCompare(s2.seatNumber);
          });

          return {
            rowKey,
            seats: sortedRowSeats,
          };
        });

      // Compute Aisle split point for this cabin
      // If 4 columns (A, B, C, D) -> split at 2 (A B | C D)
      // If 6 columns (A, B, C, D, E, F) -> split at 3 (A B C | D E F)
      const numCols = columnLetters.length;
      const aisleSplitIndex = numCols > 2 ? Math.floor(numCols / 2) : -1;

      parsedCabins.push({
        cabinClass,
        columnLetters,
        aisleSplitIndex,
        rows: sortedRows,
        seatCount: cabinSeats.length,
        minPrice: Math.min(...cabinSeats.map((s) => s.price || 0)),
        maxPrice: Math.max(...cabinSeats.map((s) => s.price || 0)),
      });
    });

    return {
      cabins: parsedCabins,
      totalAvailable: availableCount,
      totalBooked: bookedCount,
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice === -Infinity ? 0 : maxPrice,
      },
    };
  }, [seats]);

  if (!seats || seats.length === 0) {
    return (
      <div className="seat-map-empty-state">
        <Info size={28} className="empty-info-icon" />
        <p>No interactive seat configuration is available for this flight.</p>
      </div>
    );
  }

  const selectedSet = new Set(selectedSeats);

  return (
    <div className={`airline-seatmap-wrapper ${className}`}>
      {/* Aircraft Fuselage Frame */}
      <div className="aircraft-fuselage">
        {/* Cockpit / Nose Cone */}
        <div className="aircraft-nose">
          <div className="cockpit-window-group">
            <div className="cockpit-window left" />
            <div className="cockpit-window center" />
            <div className="cockpit-window right" />
          </div>
          <div className="cockpit-label">
            <Plane size={14} className="nose-plane-icon" />
            <span>Front of Aircraft &bull; Cockpit</span>
          </div>
        </div>

        {/* Fuselage Cabin Body */}
        <div className="aircraft-cabin-body">
          {cabins.map((cabin) => {
            const isBusiness = cabin.cabinClass === 'Business';

            return (
              <section
                key={cabin.cabinClass}
                className={`cabin-section cabin-${cabin.cabinClass.toLowerCase()}`}
                aria-label={`${cabin.cabinClass} Class Cabin`}
              >
                {/* Cabin Class Header Banner */}
                <div className="cabin-header-banner">
                  <div className="cabin-title-row">
                    {isBusiness ? (
                      <div className="cabin-badge-icon business">
                        <Crown size={15} />
                      </div>
                    ) : (
                      <div className="cabin-badge-icon economy">
                        <Sparkles size={15} />
                      </div>
                    )}
                    <h3 className="cabin-name">{cabin.cabinClass} Class</h3>
                  </div>

                  <div className="cabin-meta-info">
                    <span className="cabin-price-badge">
                      {cabin.minPrice === cabin.maxPrice
                        ? formatCurrency(cabin.minPrice)
                        : `${formatCurrency(cabin.minPrice)} - ${formatCurrency(cabin.maxPrice)}`}
                    </span>
                    <span className="cabin-seats-count">
                      {cabin.seatCount} seats
                    </span>
                  </div>
                </div>

                {/* Column Headers (Letter + Position Hints) */}
                {cabin.columnLetters.length > 0 && (
                  <div className="cabin-column-headers" aria-hidden="true">
                    <div className="row-num-spacer" />
                    <div className="column-letters-row">
                      {cabin.columnLetters.map((letter, colIdx) => {
                        const isAisleSplit =
                          cabin.aisleSplitIndex > 0 &&
                          colIdx === cabin.aisleSplitIndex;

                        return (
                          <div key={letter} className="col-header-item-wrapper">
                            {isAisleSplit && <div className="aisle-spacer-header">AISLE</div>}
                            <div className="col-letter-pill">
                              <span className="col-letter">{letter}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cabin Rows */}
                <div className="cabin-rows-container">
                  {cabin.rows.map(({ rowKey, seats: rowSeats }) => {
                    return (
                      <div key={rowKey} className="seat-row-wrapper">
                        {/* Row Number Badge */}
                        <div className="row-number-badge" title={`Row ${rowKey}`}>
                          <span>{rowKey}</span>
                        </div>

                        {/* Seats in Row */}
                        <div className="seats-in-row">
                          {cabin.columnLetters.map((colLetter, colIdx) => {
                            const isAisleSplit =
                              cabin.aisleSplitIndex > 0 &&
                              colIdx === cabin.aisleSplitIndex;

                            // Find seat corresponding to this column in this row
                            const seat = rowSeats.find(
                              (s) => s.colLetter === colLetter
                            );

                            if (!seat) {
                              // Missing seat gap in layout
                              return (
                                <div key={colLetter} className="seat-slot-wrapper">
                                  {isAisleSplit && <div className="aisle-gap-divider" />}
                                  <div className="seat-empty-placeholder" />
                                </div>
                              );
                            }

                            const isSelected = selectedSet.has(seat.seatNumber);
                            const isBooked = seat.status === 'Booked';
                            const isAvailable = seat.status === 'Available';
                            const seatClass = seat.seatClass || cabin.cabinClass;
                            const isBusinessSeat = seatClass === 'Business';

                            return (
                              <div
                                key={seat.seatNumber}
                                className="seat-slot-wrapper"
                                onMouseEnter={() => setHoveredSeat(seat)}
                                onMouseLeave={() => setHoveredSeat(null)}
                              >
                                {isAisleSplit && (
                                  <div className="aisle-gap-divider" aria-label="Aisle" />
                                )}

                                <button
                                  type="button"
                                  className={`airline-seat-item seat-${seatClass.toLowerCase()} ${
                                    isSelected
                                      ? 'seat-selected'
                                      : isBooked
                                      ? 'seat-booked'
                                      : 'seat-available'
                                  } ${isBusinessSeat ? 'is-business' : ''}`}
                                  onClick={() => {
                                    if (isAvailable && selectable && onSeatClick) {
                                      onSeatClick(seat);
                                    }
                                  }}
                                  disabled={isBooked || (!selectable && !readOnly)}
                                  aria-label={`Seat ${seat.seatNumber}, ${seatClass} Class, ${
                                    seat.position
                                  } position, Price ${formatCurrency(seat.price)}, Status: ${
                                    isSelected ? 'Selected' : seat.status
                                  }`}
                                  aria-pressed={isSelected}
                                  data-seat={seat.seatNumber}
                                >
                                  {/* Seat Top Headrest */}
                                  <div className="seat-headrest">
                                    {isSelected && <Check size={11} className="seat-check-icon" />}
                                    {isBooked && <Lock size={10} className="seat-lock-icon" />}
                                    {!isSelected && !isBooked && isBusinessSeat && (
                                      <Crown size={10} className="seat-crown-mini" />
                                    )}
                                  </div>

                                  {/* Seat Main Body */}
                                  <div className="seat-body">
                                    <span className="seat-code">{seat.seatNumber}</span>
                                    {showPrices && (
                                      <span className="seat-price-sub">
                                        {formatCurrency(seat.price)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Position Accent Dot */}
                                  <div
                                    className={`seat-pos-indicator pos-${(
                                      seat.position || 'standard'
                                    ).toLowerCase()}`}
                                    title={`${seat.position} Seat`}
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Aircraft Tail / Rear Indicator */}
        <div className="aircraft-tail">
          <span>Rear of Aircraft &bull; Galley &amp; Restrooms</span>
        </div>
      </div>

      {/* Dynamic Hover Tooltip / Detail Floating Card */}
      {hoveredSeat && (
        <div className="seat-hover-card" role="tooltip">
          <div className="hover-seat-header">
            <span className="hover-seat-number">{hoveredSeat.seatNumber}</span>
            <span
              className={`hover-seat-status ${
                selectedSet.has(hoveredSeat.seatNumber)
                  ? 'status-selected'
                  : hoveredSeat.status === 'Booked'
                  ? 'status-booked'
                  : 'status-available'
              }`}
            >
              {selectedSet.has(hoveredSeat.seatNumber)
                ? 'Selected'
                : hoveredSeat.status}
            </span>
          </div>

          <div className="hover-seat-details">
            <div className="hover-detail-row">
              <span className="detail-label">Cabin Class:</span>
              <strong>{hoveredSeat.seatClass}</strong>
            </div>
            <div className="hover-detail-row">
              <span className="detail-label">Position:</span>
              <strong>{hoveredSeat.position} Seat</strong>
            </div>
            <div className="hover-detail-row">
              <span className="detail-label">Fare (ETB):</span>
              <strong className="price-highlight">
                {formatCurrency(hoveredSeat.price)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Seat Map Legend */}
      {showLegend && (
        <div className="seat-map-legend-box" aria-label="Seat Map Legend">
          <h4 className="legend-title">Seat Legend</h4>
          <div className="legend-items-grid">
            <div className="legend-item">
              <div className="legend-seat-sample available-economy" />
              <span>Economy (Available)</span>
            </div>

            <div className="legend-item">
              <div className="legend-seat-sample available-business">
                <Crown size={9} />
              </div>
              <span>Business (Available)</span>
            </div>

            <div className="legend-item">
              <div className="legend-seat-sample selected">
                <Check size={9} />
              </div>
              <span>Selected Seat</span>
            </div>

            <div className="legend-item">
              <div className="legend-seat-sample booked">
                <Lock size={9} />
              </div>
              <span>Booked / Taken</span>
            </div>
          </div>

          <div className="legend-position-hints">
            <span className="hint-pill">
              <span className="dot window" /> Window Seat
            </span>
            <span className="hint-pill">
              <span className="dot aisle" /> Aisle Seat
            </span>
            <span className="hint-pill">
              <span className="dot middle" /> Middle Seat
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SeatMap;

