let watchId = null;

function startBackgroundDriverTracker() {
	if (!navigator.geolocation) {
		console.warn("Geolocation is not supported by this browser.");
		return;
	}

	// Prevent starting multiple loops if already running
	if (watchId !== null) return;

	const token = localStorage.getItem('accessToken');
	const vehicleId = localStorage.getItem('driver_vehicle_id');
	const trackingApiUrl = `https://upheaval-revise-fit.ngrok-free.dev/etransport/api/vehicles/${vehicleId}/update-location/`; // Adjust to your endpoint

	watchId = navigator.geolocation.watchPosition(
		async position => {
			const lat = position.coords.latitude;
			const lon = position.coords.longitude;
			console.log({'lat': lat, 'lon': lon})
			try {
				const response = await fetch(trackingApiUrl, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`,
						'ngrok-skip-browser-warning': 'true'
					},
					body: JSON.stringify({ lat: lat, lon: lon })
				});

				if (!response.ok) {
					console.error("Failed to sync driver location to server.");
				} else {
					console.log(`Location synced: [${lat}, ${lon}]`);
				}
			} catch (error) {
				console.error("Network error while syncing location:", error);
			}
		},
		error => {
			console.error("Geolocation tracking error code:", error.code, error.message);
		},
		{
			enableHighAccuracy: true,
			maximumAge: 10000,     // Accept cached position up to 10 seconds old
			timeout: 15000         // Time out if position takes longer than 15 seconds
		}
	);
}

// Optional cleanup function if the driver explicitly logs out
function stopDriverTracker() {
	if (watchId !== null) {
		navigator.geolocation.clearWatch(watchId);
		watchId = null;
		localStorage.removeItem('driver_vehicle_id');
	}
}