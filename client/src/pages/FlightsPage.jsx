import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { flightService } from '../services/flightService';
import { FlightCard, FlightSearchForm } from '../components/flights';
import { Plane, AlertCircle, RefreshCw, FilterX, Loader2 } from 'lucide-react';

export function FlightsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Extract current query filters from URL search params
  const currentFilters = useMemo(() => {
    return {
      departureCity: searchParams.get('departureCity') || '',
      arrivalCity: searchParams.get('arrivalCity') || '',
      airline: searchParams.get('airline') || '',
      status: searchParams.get('status') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
    };
  }, [searchParams]);

  // Clean empty filters before sending to API
  const cleanFilters = (filtersObj) => {
    const cleaned = {};
    Object.entries(filtersObj).forEach(([key, val]) => {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        cleaned[key] = String(val).trim();
      }
    });
    return cleaned;
  };

  // Fetch flights when currentFilters or reloadTrigger change
  useEffect(() => {
    let isMounted = true;

    async function loadFlights() {
      try {
        const activeFilters = cleanFilters(currentFilters);
        const data = await flightService.getFlights(activeFilters);
        if (isMounted) {
          setFlights(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err.data?.message ||
            err.message ||
            'Unable to load flight schedules. Please check your internet connection.';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadFlights();

    return () => {
      isMounted = false;
    };
  }, [currentFilters, reloadTrigger]);

  // Handle Search Submission -> update URL params & set loading
  const handleSearch = (newFilters) => {
    setLoading(true);
    const cleaned = cleanFilters(newFilters);
    setSearchParams(cleaned);
  };

  // Handle Reset -> clear URL params & set loading
  const handleReset = () => {
    setLoading(true);
    setSearchParams({});
  };

  const handleRetry = () => {
    setLoading(true);
    setReloadTrigger((prev) => prev + 1);
  };

  // Derive unique suggestions from the currently available flights for datalists
  const availableOptions = useMemo(() => {
    const depCities = new Set();
    const arrCities = new Set();
    const airlines = new Set();

    flights.forEach((f) => {
      if (f.departureCity) depCities.add(f.departureCity);
      if (f.arrivalCity) arrCities.add(f.arrivalCity);
      if (f.airline) airlines.add(f.airline);
    });

    return {
      departureCities: Array.from(depCities).sort(),
      arrivalCities: Array.from(arrCities).sort(),
      airlines: Array.from(airlines).sort(),
    };
  }, [flights]);

  const hasActiveFilters = Object.values(currentFilters).some((val) => val !== '');
  const formKey = `${currentFilters.departureCity}-${currentFilters.arrivalCity}-${currentFilters.airline}-${currentFilters.minPrice}-${currentFilters.maxPrice}`;

  return (
    <div className="flights-page-container">
      {/* Header Banner */}
      <div className="flights-page-header">
        <div className="header-title-group">
          <div className="flights-badge">
            <Plane size={16} />
            <span>Flight Schedules</span>
          </div>
          <h1>Explore Available Flights</h1>
          <p>Search schedules and book real-time domestic &amp; regional flights in Ethiopian Birr</p>
        </div>
      </div>

      <div className="flights-page-content">
        {/* Search Filter Panel */}
        <section className="search-panel-container" aria-label="Flight Search Filters">
          <FlightSearchForm
            key={formKey}
            initialFilters={currentFilters}
            onSearch={handleSearch}
            onReset={handleReset}
            loading={loading}
            availableOptions={availableOptions}
          />
        </section>

        {/* Results Section */}
        <section className="results-container" aria-label="Flight Search Results">
          {/* Results Summary Bar */}
          <div className="results-summary-bar">
            <div className="summary-count">
              {loading ? (
                <span className="loading-count-text">
                  <Loader2 size={16} className="btn-spinner" /> Searching flights...
                </span>
              ) : (
                <span>
                  Showing <strong>{flights.length}</strong> {flights.length === 1 ? 'flight' : 'flights'}
                  {hasActiveFilters && ' matching your search'}
                </span>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flights-loading-state" role="status" aria-label="Loading flights">
              <div className="auth-spinner" />
              <p>Fetching real-time flight schedules from SkyLink...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="flights-error-state" role="alert">
              <AlertCircle size={36} className="error-state-icon" />
              <h3>Failed to Load Flight Schedules</h3>
              <p>{error}</p>
              <button
                type="button"
                className="btn-retry"
                onClick={handleRetry}
              >
                <RefreshCw size={16} />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* Empty Results State */}
          {!loading && !error && flights.length === 0 && (
            <div className="flights-empty-state">
              <div className="empty-icon-box">
                <FilterX size={36} className="empty-state-icon" />
              </div>
              <h3>No Flights Found</h3>
              <p>
                We couldn&apos;t find any flights matching your current filter criteria. Try adjusting your
                departure or arrival city, or clearing the price range.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn-reset-empty"
                  onClick={handleReset}
                >
                  <RefreshCw size={16} />
                  <span>Clear All Filters</span>
                </button>
              )}
            </div>
          )}

          {/* Flight Results Grid */}
          {!loading && !error && flights.length > 0 && (
            <div className="flight-cards-list">
              {flights.map((flight) => (
                <FlightCard
                  key={flight._id || flight.id || flight.flightNumber}
                  flight={flight}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default FlightsPage;
