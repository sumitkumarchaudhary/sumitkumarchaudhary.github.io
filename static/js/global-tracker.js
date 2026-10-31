// static/js/global-tracker.js

(function () {
    // Prevent multiple tracker instances if scripts are loaded twice
    if (window.__globalTrackerInitialized) return;
    window.__globalTrackerInitialized = true;

    document.addEventListener("DOMContentLoaded", () => {
        const vehicleId = localStorage.getItem('driver_vehicle_id');
        const authToken = localStorage.getItem('accessToken');

        // Guard: If no vehicle ID or token exists in storage, skip tracking 
        // (e.g., if an Admin or Dispatcher is logged in instead of a driver)
        if (!vehicleId || !authToken) {
            console.log("No assigned vehicle ID found in localStorage. Silent tracking disabled.");
            return;
        }

        console.log(`[Silent Tracker] Initialized for Vehicle ID: ${vehicleId}`);

        if (!navigator.geolocation) {
            console.warn("[Silent Tracker] Geolocation API is not supported by this browser.");
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 5000 // Accept cached position up to 5 seconds old to save battery
        };

        // watchPosition continuously fires whenever the device moves or updates location
        navigator.geolocation.watchPosition(
            async (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                const speed = position.coords.speed || 0.0;
				console.log({'lat': latitude, 'lon': longitude})
                try {
                    const response = await fetch(`https://upheaval-revise-fit.ngrok-free.dev/etransport/api/vehicles/${vehicleId}/update-location/`, {
                        method: 'PATCH',
                    headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({lat: latitude, lon:longitude})
                    });

                    if (!response.ok) {
                        console.warn(`[Silent Tracker] Sync failed: HTTP status ${response.status}`);
                        
                        // If token expired (401), clear storage to stop spamming failed requests
                        if (response.status === 401) {
                            console.error("[Silent Tracker] Unauthorized. Clearing session credentials.");
                            localStorage.removeItem('driver_vehicle_id');
                            // localStorage.removeItem('accessToken');
                        }
                    } else {
                        console.debug(`[Silent Tracker] Position synced: [${latitude}, ${longitude}]`);
                    }
                } catch (error) {
                    console.error("[Silent Tracker] Network error during location push:", error);
                }
            },
            (error) => {
                // Handle geolocation permission or hardware errors gracefully
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        console.warn("[Silent Tracker] User denied the request for Geolocation.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        console.warn("[Silent Tracker] Location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        console.warn("[Silent Tracker] The request to get user location timed out.");
                        break;
                    default:
                        console.warn("[Silent Tracker] An unknown geolocation error occurred.");
                        break;
                }
            },
            options
        );
    });
})();