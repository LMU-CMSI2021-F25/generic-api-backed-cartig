// src/services/taxService.js

const ninjaApiKey = import.meta.env.VITE_API_NINJA_KEY;
const opencageApiKey = import.meta.env.VITE_OPEN_CAGE_API_KEY;

/**
 * Geocodes a location name to get its coordinates.
 * @param {string} query - The location name to search for (e.g., "Denver, CO").
 * @returns {Promise<object|null>} A promise that resolves to a lat/lng object or null.
 */
export const geocodeLocationByName = async (query) => {
  if (!query) return null;
  if (!opencageApiKey) throw new Error("OpenCage API key is missing.");

  const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${opencageApiKey}&limit=1`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Forward geocoding failed.");
    
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].geometry; // Returns { lat, lng }
    }
    return null;
  } catch (error) {
    console.error("Error geocoding location by name:", error);
    throw error;
  }
};


/**
 * Main function to get location data. It first tries to find a ZIP and get sales tax.
 * If that fails, it tries again with city/state before returning a fallback.
 * @param {object} location - An object with lat and lng properties.
 * @returns {Promise<object>} A promise that resolves to an object indicating success or failure.
 */
export const getDataForLocation = async (location) => {
  if (!location) throw new Error("Location not provided.");
  if (!ninjaApiKey || !opencageApiKey) throw new Error("API key(s) are missing.");

  // Step 1: Geocode the location to get address components
  const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${location.lat}+${location.lng}&key=${opencageApiKey}`;
  const geocodeResponse = await fetch(geocodeUrl);
  if (!geocodeResponse.ok) throw new Error("Reverse geocoding request failed.");
  const geocodeData = await geocodeResponse.json();

  if (!geocodeData.results || geocodeData.results.length === 0) {
    throw new Error("Could not identify the selected location.");
  }

  const components = geocodeData.results[0].components;
  const locationDetails = {
    city: components.city || components.town || components.village,
    county: components.county,
    state: components.state,
    country: components.country,
    coordinates: { lat: location.lat, lng: location.lng }
  };

  // Step 2: Attempt to find a ZIP code
  let zipCode = null;
  for (const result of geocodeData.results) {
    if (result.components && result.components.postcode) {
      zipCode = result.components.postcode;
      break;
    }
  }

  // Step 3: Fetch sales tax, first with ZIP, then fallback to city/state
  let taxDataResponse = null;

  // Try with ZIP code first
  if (zipCode) {
    const taxApiUrl = `https://api.api-ninjas.com/v1/salestax?zip_code=${zipCode}`;
    const taxResponse = await fetch(taxApiUrl, { headers: { 'X-Api-Key': ninjaApiKey } });
    if (taxResponse.ok) {
      const data = await taxResponse.json();
      if (data && data.length > 0) {
        taxDataResponse = data;
      }
    }
  }

  // If ZIP code search failed or wasn't possible, try city/state
  if (!taxDataResponse && locationDetails.city && locationDetails.state) {
    const taxApiUrl = `https://api.api-ninjas.com/v1/salestax?city=${encodeURIComponent(locationDetails.city)}&state=${encodeURIComponent(locationDetails.state)}`;
    const taxResponse = await fetch(taxApiUrl, { headers: { 'X-Api-Key': ninjaApiKey } });
     if (taxResponse.ok) {
      const data = await taxResponse.json();
      if (data && data.length > 0) {
        taxDataResponse = data;
      }
    }
  }

  // Step 4: Process the successful response
  if (taxDataResponse) {
    const taxInfo = taxDataResponse[0];
    
    // --- SIMPLIFIED LOGIC ---
    // Since only state_rate is available, we will treat it as the total rate.
    const totalRate = taxInfo.state_rate || 0;

    return {
      success: true,
      data: { 
        // We only include the data we know we have
        total_rate: totalRate, 
        state_rate: taxInfo.state_rate,
        zip_code: zipCode, // May be null if fallback was used
        ...locationDetails,
      }
    };
  }

  // Step 5: If all attempts failed, return the fallback
  const fallbackLocation = [
    locationDetails.city,
    locationDetails.county,
    locationDetails.state,
    locationDetails.country
  ].filter(Boolean).join(', ');

  return {
    success: false,
    fallbackLocation: fallbackLocation || "an unidentifiable area"
  };
};
