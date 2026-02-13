const WEATHER_CODE_MAP = {
  zh: {
    0: "晴朗",
    1: "少云",
    2: "多云",
    3: "阴天",
    45: "雾",
    48: "冻雾",
    51: "小毛雨",
    53: "毛雨",
    55: "浓毛雨",
    61: "小雨",
    63: "中雨",
    65: "大雨",
    71: "小雪",
    73: "中雪",
    75: "大雪",
    80: "阵雨",
    81: "较强阵雨",
    82: "强阵雨",
    95: "雷暴"
  },
  en: {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Strong showers",
    82: "Violent showers",
    95: "Thunderstorm"
  }
};

function withTimeout(promiseFactory, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return promiseFactory(controller.signal).finally(() => clearTimeout(timer));
}

async function fetchJSON(url, timeoutMs = 10000) {
  const response = await withTimeout((signal) => fetch(url, { signal }), timeoutMs);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

export function getBrowserLocation(options = { timeout: 8000 }) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("浏览器不支持定位"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      (err) => {
        reject(new Error(err.message || "定位失败"));
      },
      {
        enableHighAccuracy: false,
        timeout: options.timeout || 8000,
        maximumAge: 5 * 60 * 1000
      }
    );
  });
}

export async function geocodeCity(cityName, lang = "zh") {
  const langParam = lang === "en" ? "en" : "zh";
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    cityName
  )}&count=1&language=${langParam}&format=json`;
  const data = await fetchJSON(url, 10000);
  if (!data?.results?.[0]) {
    throw new Error(lang === "en" ? "City not found" : "未找到城市");
  }
  const city = data.results[0];
  return {
    latitude: city.latitude,
    longitude: city.longitude,
    city: city.name,
    country: city.country
  };
}

function weatherTextByCode(code, lang = "zh") {
  const map = lang === "en" ? WEATHER_CODE_MAP.en : WEATHER_CODE_MAP.zh;
  return map[code] || (lang === "en" ? "Unknown" : "未知天气");
}

export async function getWeatherByCoords(latitude, longitude, lang = "zh") {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FShanghai`;
  const data = await fetchJSON(url, 10000);
  if (!data?.current) {
    throw new Error(lang === "en" ? "No weather data" : "天气数据为空");
  }
  const current = data.current;
  return {
    latitude,
    longitude,
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    weatherCode: current.weather_code,
    weatherText: weatherTextByCode(current.weather_code, lang),
    observationTime: current.time
  };
}

export async function resolveWeatherByGeoOrCity(fallbackCity = "Shanghai", lang = "zh") {
  const locale = lang === "en" ? "en" : "zh";
  const failures = [];
  try {
    const loc = await getBrowserLocation();
    const weather = await getWeatherByCoords(loc.latitude, loc.longitude, locale);
    return { source: "geo", city: locale === "en" ? "Current location" : "当前位置", ...weather };
  } catch (error) {
    failures.push(locale === "en" ? `Geo lookup failed: ${error.message}` : `定位天气失败: ${error.message}`);
  }

  try {
    const city = await geocodeCity(fallbackCity, locale);
    const weather = await getWeatherByCoords(city.latitude, city.longitude, locale);
    return { source: "city", city: city.city, country: city.country, ...weather };
  } catch (error) {
    failures.push(locale === "en" ? `City lookup failed: ${error.message}` : `城市天气失败: ${error.message}`);
  }

  throw new Error(failures.join(" | "));
}
