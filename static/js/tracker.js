let watchId = null;

function startBackgroundDriverTracker() {
	if (!navigator.geolocation) {
		console.warn("Geolocation is not supported by this browser.");
		return;
	}

	// Prevent starting multiple loops if already running
	if (watchId !== null) return;
	
	// 1. Request screen wake lock so the tab doesn't freeze
    requestScreenWakeLock();

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
			maximumAge: 0,     // Accept cached position up to 10 seconds old
			timeout: 15000         // Time out if position takes longer than 15 seconds
		}
	);
}


let wakeLock = null;
async function requestScreenWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('🔒 Screen Wake Lock active: Screen will stay awake for tracking.');

            // Re-acquire lock if visibility changes (e.g. user briefly swapped apps and came back)
            wakeLock.addEventListener('release', () => {
                console.log('🔓 Screen Wake Lock released');
            });
        } else {
            console.warn('Wake Lock API not supported by this browser.');
        }
    } catch (err) {
        console.error(`Failed to lock screen: ${err.name}, ${err.message}`);
    }
}



// Optional cleanup function if the driver explicitly logs out
function stopDriverTracker() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    if (wakeLock !== null) {
        wakeLock.release();
        wakeLock = null;
    }
}

// Automatically re-acquire wake lock if tab regains visibility
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && wakeLock === null) {
        await requestScreenWakeLock();
    }
});