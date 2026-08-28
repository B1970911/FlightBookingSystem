import { useState } from 'react';
import { Search, RotateCcw, PlaneTakeoff, PlaneLanding, Building2, Banknote } from 'lucide-react';

export function FlightSearchForm({
  initialFilters = {},
  onSearch,
  onReset,
  loading = false,
  availableOptions = {},
}) {
  const [filters, setFilters] = useState({
    departureCity: initialFilters.departureCity || '',
    arrivalCity: initialFilters.arrivalCity || '',
    airline: initialFilters.airline || '',
    status: initialFilters.status || '',
    minPrice: initialFilters.minPrice || '',
    maxPrice: initialFilters.maxPrice || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleReset = () => {
    const resetFilters = {
      departureCity: '',
      arrivalCity: '',
      airline: '',
      status: '',
      minPrice: '',
      maxPrice: '',
    };
    setFilters(resetFilters);
    onReset();
  };

  const hasActiveFilters = Object.values(filters).some((val) => val !== '');

  return (
    <form className="flight-search-form" onSubmit={handleSubmit} noValidate>
      <div className="search-form-header">
        <div className="search-header-title">
          <Search size={20} className="search-header-icon" />
          <h2>Find Available Flights</h2>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            className="btn-clear-filters"
            onClick={handleReset}
            disabled={loading}
          >
            <RotateCcw size={14} />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      <div className="search-fields-grid">
        {/* Departure City */}
        <div className="search-field-group">
          <label htmlFor="departureCity" className="search-field-label">
            Departure City
          </label>
          <div className="search-input-wrapper">
            <PlaneTakeoff size={18} className="search-input-icon" />
            <input
              id="departureCity"
              type="text"
              name="departureCity"
              placeholder="e.g. Addis Ababa"
              value={filters.departureCity}
              onChange={handleChange}
              disabled={loading}
              list="departure-cities-list"
              autoComplete="off"
            />
            {availableOptions.departureCities && (
              <datalist id="departure-cities-list">
                {availableOptions.departureCities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            )}
          </div>
        </div>

        {/* Arrival City */}
        <div className="search-field-group">
          <label htmlFor="arrivalCity" className="search-field-label">
            Arrival City
          </label>
          <div className="search-input-wrapper">
            <PlaneLanding size={18} className="search-input-icon" />
            <input
              id="arrivalCity"
              type="text"
              name="arrivalCity"
              placeholder="e.g. Bahir Dar"
              value={filters.arrivalCity}
              onChange={handleChange}
              disabled={loading}
              list="arrival-cities-list"
              autoComplete="off"
            />
            {availableOptions.arrivalCities && (
              <datalist id="arrival-cities-list">
                {availableOptions.arrivalCities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            )}
          </div>
        </div>

        {/* Airline */}
        <div className="search-field-group">
          <label htmlFor="airline" className="search-field-label">
            Airline
          </label>
          <div className="search-input-wrapper">
            <Building2 size={18} className="search-input-icon" />
            <input
              id="airline"
              type="text"
              name="airline"
              placeholder="e.g. Ethiopian Airlines"
              value={filters.airline}
              onChange={handleChange}
              disabled={loading}
              list="airlines-list"
              autoComplete="off"
            />
            {availableOptions.airlines && (
              <datalist id="airlines-list">
                {availableOptions.airlines.map((air) => (
                  <option key={air} value={air} />
                ))}
              </datalist>
            )}
          </div>
        </div>

        {/* Minimum Price (ETB) */}
        <div className="search-field-group">
          <label htmlFor="minPrice" className="search-field-label">
            Min Price (ETB)
          </label>
          <div className="search-input-wrapper">
            <Banknote size={18} className="search-input-icon" />
            <input
              id="minPrice"
              type="number"
              name="minPrice"
              placeholder="e.g. 1000"
              min="0"
              step="100"
              value={filters.minPrice}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
        </div>

        {/* Maximum Price (ETB) */}
        <div className="search-field-group">
          <label htmlFor="maxPrice" className="search-field-label">
            Max Price (ETB)
          </label>
          <div className="search-input-wrapper">
            <Banknote size={18} className="search-input-icon" />
            <input
              id="maxPrice"
              type="number"
              name="maxPrice"
              placeholder="e.g. 10000"
              min="0"
              step="100"
              value={filters.maxPrice}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="search-actions-bar">
        <button
          type="submit"
          className="btn-search-submit"
          disabled={loading}
        >
          <Search size={18} />
          <span>{loading ? 'Searching Flights...' : 'Search Flights'}</span>
        </button>
      </div>
    </form>
  );
}

export default FlightSearchForm;
