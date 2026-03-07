let cachedIp = null;
let lastFetch = 0;

async function getPublicIp() {
    const now = Date.now();
    if (cachedIp && (now - lastFetch < 3600000)) {
        return cachedIp;
    }

    try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (!response.ok) throw new Error('Failed to fetch IP');
        const data = await response.json();
        cachedIp = data.ip;
        lastFetch = now;
        return cachedIp;
    } catch (error) {
        console.error("Error fetching public IP:", error.message);
        return "Unavailable";
    }
}

module.exports = { getPublicIp };
