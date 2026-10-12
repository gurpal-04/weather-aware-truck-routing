export async function fetchWeatherForCheckpoints(checkpoints: any[], departureTimeIso: string) {
  if (!checkpoints || checkpoints.length === 0) return [];
  
  const departureTime = new Date(departureTimeIso);
  
  const chunkSize = 50;
  const chunks = [];
  for (let i = 0; i < checkpoints.length; i += chunkSize) {
    chunks.push(checkpoints.slice(i, i + chunkSize));
  }
  
  const allResults = [];
  
  for (const chunk of chunks) {
    const lats = chunk.map((cp: any) => cp.lat).join(',');
    const lons = chunk.map((cp: any) => cp.lon).join(',');
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&hourly=wind_speed_10m,precipitation,snowfall&wind_speed_unit=mph&precipitation_unit=inch&timezone=UTC&forecast_days=14`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Weather API error');
      let data = await response.json();
      
      if (!Array.isArray(data)) {
        data = [data];
      }
      
      for (let i = 0; i < chunk.length; i++) {
        const cp = chunk[i];
        const cpData = data[i];
        
        const eta = new Date(departureTime.getTime() + ((cp.eta_offset_seconds || 0) * 1000));
        
        let wind_mph = null;
        let rain_in_hr = null;
        let snow_in_hr = null;
        let timestamp = null;
        
        if (cpData && cpData.hourly && cpData.hourly.time) {
          const times = cpData.hourly.time;
          let minDiff = Infinity;
          let closestIdx = -1;
          
          for (let j = 0; j < times.length; j++) {
            const t = new Date(times[j] + 'Z');
            const diff = Math.abs(t.getTime() - eta.getTime());
            if (diff < minDiff) {
              minDiff = diff;
              closestIdx = j;
            }
          }
          
          if (closestIdx !== -1 && minDiff <= 2 * 3600 * 1000) {
             wind_mph = cpData.hourly.wind_speed_10m[closestIdx];
             rain_in_hr = cpData.hourly.precipitation[closestIdx];
             snow_in_hr = cpData.hourly.snowfall[closestIdx];
             timestamp = times[closestIdx];
          }
        }
        
        allResults.push({
          wind_mph,
          rain_in_hr,
          snow_in_hr,
          timestamp,
          eta_timestamp: !isNaN(eta.getTime()) ? eta.toISOString() : null
        });
      }
    } catch (e) {
      console.error("OpenMeteo fetch error:", e);
      for (let i = 0; i < chunk.length; i++) {
        const cp = chunk[i];
        const eta = new Date(departureTime.getTime() + ((cp?.eta_offset_seconds || 0) * 1000));
        allResults.push({
          wind_mph: null,
          rain_in_hr: null,
          snow_in_hr: null,
          timestamp: null,
          eta_timestamp: !isNaN(eta.getTime()) ? eta.toISOString() : null
        });
      }
    }
  }
  
  return allResults;
}

export function calculateCheckpointRisk(wind_mph: number | null, rain_in_hr: number | null, snow_in_hr: number | null, load_lbs: number) {
  let wind_risk = -1;
  if (wind_mph !== null) {
    if (wind_mph < 25) wind_risk = 0;
    else if (wind_mph < 35) wind_risk = 1;
    else if (wind_mph < 45) wind_risk = 2;
    else if (wind_mph < 55) wind_risk = 3;
    else wind_risk = 4;
  }

  let rain_risk = -1;
  if (rain_in_hr !== null) {
    if (rain_in_hr < 0.10) rain_risk = 0;
    else if (rain_in_hr <= 0.25) rain_risk = 1;
    else if (rain_in_hr < 0.50) rain_risk = 2;
    else if (rain_in_hr <= 1.00) rain_risk = 3;
    else rain_risk = 4;
  }

  let snow_risk = -1;
  if (snow_in_hr !== null) {
    if (snow_in_hr < 0.5) snow_risk = 0;
    else if (snow_in_hr <= 1.0) snow_risk = 1;
    else if (snow_in_hr < 2.0) snow_risk = 2;
    else if (snow_in_hr <= 3.0) snow_risk = 3;
    else snow_risk = 4;
  }

  let adjusted_wind_risk = wind_risk;
  if (wind_mph !== null) {
    if (wind_mph >= 55) adjusted_wind_risk = 4;
    else if (wind_mph >= 45 && wind_mph < 55 && load_lbs > 30000) adjusted_wind_risk = 4;
    else if (wind_mph >= 35 && wind_mph < 45 && load_lbs > 40000) adjusted_wind_risk = Math.max(3, wind_risk);
  }

  const risks = [adjusted_wind_risk, rain_risk, snow_risk].filter(r => r !== -1);
  const final_risk = risks.length > 0 ? Math.max(...risks) : -1;

  return { wind_risk, adjusted_wind_risk, rain_risk, snow_risk, final_risk };
}
