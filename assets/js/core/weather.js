const WEATHER_CODE_MAP = {
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

export async function geocodeCity(cityName) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    cityName
  )}&count=1&language=zh&format=json`;
  const data = await fetchJSON(url, 10000);
  if (!data?.results?.[0]) {
    throw new Error("未找到城市");
  }
  const city = data.results[0];
  return {
    latitude: city.latitude,
    longitude: city.longitude,
    city: city.name,
    country: city.country
  };
}

export async function getWeatherByCoords(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FShanghai`;
  const data = await fetchJSON(url, 10000);
  if (!data?.current) {
    throw new Error("天气数据为空");
  }
  const current = data.current;
  return {
    latitude,
    longitude,
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    weatherCode: current.weather_code,
    weatherText: WEATHER_CODE_MAP[current.weather_code] || "未知天气",
    observationTime: current.time
  };
}

export async function resolveWeatherByGeoOrCity(fallbackCity = "Shanghai") {
  const failures = [];
  try {
    const loc = await getBrowserLocation();
    const weather = await getWeatherByCoords(loc.latitude, loc.longitude);
    return { source: "geo", city: "当前位置", ...weather };
  } catch (error) {
    failures.push(`定位天气失败: ${error.message}`);
  }

  try {
    const city = await geocodeCity(fallbackCity);
    const weather = await getWeatherByCoords(city.latitude, city.longitude);
    return { source: "city", city: city.city, country: city.country, ...weather };
  } catch (error) {
    failures.push(`城市天气失败: ${error.message}`);
  }

  throw new Error(failures.join(" | "));
}
