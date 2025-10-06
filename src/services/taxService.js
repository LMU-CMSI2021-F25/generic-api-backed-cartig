// src/services/taxService.js

const ninjaApiKey = import.meta.env.VITE_API_NINJA_KEY;
const openCageApiKey = import.meta.env.VITE_OPEN_CAGE_API_KEY;
console.log(ninjaApiKey);
console.log(openCageApiKey);

/**
 * Main function to get location data. It first tries to find a ZIP and get sales tax.
 * If it fails, it returns a helpful fallback location string.
 * @param {object} location - An object with lat and lng properties.
 * @returns {Promise<object>} A promise that resolves to an object indicating success or failure.
 */
export const getDataForLocation = async (location) => {
  if (!location) throw new Error("Location not provided.");
  if (!ninjaApiKey || !openCageApiKey) throw new Error("API key(s) are missing.");

  // --- Step 1: Geocode the location ---
  const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${location.lat}+${location.lng}&key=${openCageApiKey}`;
  const geocodeResponse = await fetch(geocodeUrl);
  if (!geocodeResponse.ok) throw new Error("Reverse geocoding request failed.");
  const geocodeData = await geocodeResponse.json();

  if (!geocodeData.results || geocodeData.results.length === 0) {
    throw new Error("Could not identify the selected location.");
  }

  // --- Step 2: Try to find a ZIP code in the results ---
  let zipCode = null;
  for (const result of geocodeData.results) {
    if (result.components && result.components.postcode) {
      zipCode = result.components.postcode;
      break; // Found one, stop looking
    }
  }

  // --- Step 3: If a ZIP was found, try to get sales tax ---
  if (zipCode) {
    const taxApiUrl = `https://api.api-ninjas.com/v1/salestax?zip_code=${zipCode}`;
    const taxResponse = await fetch(taxApiUrl, { headers: { 'X-Api-Key': ninjaApiKey } });
    if (!taxResponse.ok) throw new Error(`Sales tax request failed for ZIP ${zipCode}.`);
    
    const taxData = await taxResponse.json();
    if (taxData && taxData.length > 0) {
      // SUCCESS! Return the tax data.
      return {
        success: true,
        data: { ...taxData[0], zip_code: zipCode }
      };
    }
  }

  // --- Step 4: If we reach here, create a fallback message ---
  const fallbackComponents = geocodeData.results[0].components;
  const fallbackLocation = [
    fallbackComponents.city,
    fallbackComponents.county,
    fallbackComponents.state,
    fallbackComponents.country_code?.toUpperCase()
  ].filter(Boolean).join(', '); // Filter out undefined parts and join them with a comma

  // FAILURE! Return the fallback data.
  return {
    success: false,
    fallbackLocation: fallbackLocation || "an unidentifiable area"
  };
};