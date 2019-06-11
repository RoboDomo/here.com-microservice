process.env.DEBUG = "WeatherHost";
process.title = process.env.TITLE || "here-microservice";

const debug = require("debug")("WeatherHost"),
  console = require("console"),
  request = require("superagent"),
  HostBase = require("microservice-core/HostBase");

const WEATHER_APP_ID = process.env.WEATHER_APP_ID,
  WEATHER_APP_CODE = process.env.WEATHER_APP_CODE,
  METRIC = process.env.WEATHER_METRIC || "false";

const POLL_TIME = process.env.WEATHER_POLL_TIME || 60 * 5; // in seconds

/*
 * Given a time string of the form hh:mmAM or hh:mm:PM, return number of milliseconds past the epoch for today at
 * the specified time.
 *
 * For example, for sunrise at 5:30AM, the (milliseconds) timestamp returned is for TODAY at 5:30AM.
 */
const makeTime = t => {
  const d = new Date(),
    [h, m] = t.split(":");

  d.setMinutes(parseInt(m.replace(/\D+/g, ""), 10));
  d.setSeconds(0);
  if (~t.toLowerCase().indexOf("pm")) {
    d.setHours(parseInt(h, 10) + 12);
  } else {
    d.setHours(parseInt(h, 10));
  }
  const timestamp = d.getTime() / 1000;
  //  console.log(
  //    "timestamp",
  //    timestamp,
  //    new Date(timestamp * 1000).toLocaleString()
  //  );
  return timestamp;
};

/**
 * For arbitrary objects, some of the members are non-strings.  This hashmap maps key in the object to a string
 * that describes how to convert the value.
 */
const responseConversions = {
  skyInfo: "int",
  temperature: "int",
  comfort: "float",
  highTemperature: "int",
  lowTemperature: "int",
  humidity: "float",
  dewPoint: "int",
  windSpeed: "int",
  windDirection: "int",
  barometerPressure: "float",
  visibility: "float",
  ageMinutes: "int",
  activeAlerts: "bool",
  latitude: "float",
  longitude: "float",
  distance: "float",
  elevation: "float",
  moonPhase: "float",
  precipitationProbability: "int",
  dayOfWeek: "int",
  //  localTime: "int",
  //  airInfo: "int",
  beaufortScale: "int",
  utcTime: "date",
  timezone: "int",
  sunrise: "sunrise",
  sunset: "sunset"
};

/**
 * Process an object by iterating over its keys.  For each key, convert the value as specified by the
 * responseConversions hashmap.  This is a shallow operation.  A new object is returned with the non-string
 * values converted to int, float, etc.
 */
const processResponse = o => {
  const ret = {};
  for (const key in o) {
    switch (responseConversions[key]) {
      case "float":
        ret[key] = parseFloat(o[key], 10);
        break;
      case "int":
        ret[key] = Math.round(parseFloat(o[key], 10));
        break;
      case "bool":
        ret[key] = !!parseInt(o[key], 10);
        break;
      case "date":
        ret[key] = new Date(o[key]).getTime() / 1000;
        break;
      case "sunrise":
      case "sunset":
        ret[key] = makeTime(o[key]);
        break;
      default:
        ret[key] = o[key];
        break;
    }
  }
  return ret;
};

/**
 * @class WeatherHost
 *
 * One of these per location is instantiated.  It is reponsible for polling for updates for
 * the location and publishing the MQTT messages when values change.
 */
class WeatherHost extends HostBase {
  constructor(location) {
    const host = process.env.MQTT_HOST || "mqtt://robodomo",
      topic = process.env.MQTT_TOPIC || "weather";

    const [kind, value] = location.split(":");
    super(host, topic + "/" + value);
    debug(
      `constructor ${topic} ${location} => ("${kind}", "${value}") -----> "${
        this.topic
      }"`
    );
    this.location = location;
    this.kind = kind;
    this.value = value;
    // so we don't block the main() program's loop.
    setTimeout(() => {
      this.poll();
    }, 1);
  }

  async report(parameters) {
    try {
      let url = `https://weather.api.here.com/weather/1.0/report.json?app_id=${WEATHER_APP_ID}&app_code=${WEATHER_APP_CODE}`;
      for (const key in parameters) {
        url += `&${key}=${parameters[key]}`;
      }
      url += `&metric=${METRIC}`;
      const res = await request.get(url);
      return res.body;
    } catch (e) {
      console.log("exception in report", this.location, e.message);
    }
  }

  async pollObservation() {
    const res = await this.report({
        product: "observation",
        [this.kind]: this.value,
        oneobservation: true
      }),
      o = processResponse(res.observations.location[0].observation[0]);
    return o;
  }

  async pollHourly() {
    const res = await this.report({
        product: "forecast_hourly",
        [this.kind]: this.value,
        oneobservation: true
      }),
      o = processResponse(res.hourlyForecasts.forecastLocation.forecast),
      ret = [];
    for (let n = 0; n < 23; n++) {
      ret.push(processResponse(o["" + n]));
    }

    return ret;
  }

  async pollForecast() {
    const res = await this.report({
        product: "forecast_7days",
        [this.kind]: this.value,
        oneobservation: true
      }),
      o = res.forecasts.forecastLocation.forecast,
      ret = [];

    for (const day of o) {
      ret.push(processResponse(day));
    }
    return ret;
  }

  async pollAstronomy() {
    const res = await this.report({
        product: "forecast_astronomy",
        [this.kind]: this.value,
        oneobservation: true
      }),
      o = processResponse(res.astronomy.astronomy[0]);
    return o;
  }

  async pollAlerts() {
    const res = await this.report({
        product: "alerts",
        [this.kind]: this.value,
        oneobservation: true
      }),
      o = processResponse(res.alerts);
    return o;
  }

  async command() {
    return Promise.resolve();
  }

  async pollOnce() {
    const astronomy = await this.pollAstronomy(),
      observation = await this.pollObservation(),
      hourly = await this.pollHourly(),
      forecast = await this.pollForecast(),
      alerts = await this.pollAlerts();

    this.state = {
      sunrise: astronomy.sunrise,
      sunset: astronomy.sunset,
      astronomy: astronomy,
      observation: {
        ...observation,
        sunrise: astronomy.sunrise,
        sunset: astronomy.sunset
      },
      hourly: hourly,
      forecast: forecast,
      alerts: alerts
    };
  }

  async poll() {
    while (1) {
      console.log(new Date().toLocaleTimeString(), "Poll");
      this.pollOnce();
      await this.wait(POLL_TIME * 1000);
    }
  }
}

/**
 * handler for unhandled rejected promises.  This should never really get called, but we might expect some
 * node_module we depend on to be poorly written.
 */
process.on("unhandledRejection", function(reason, p) {
  console.log(
    "Possibly Unhandled Rejection at: Promise ",
    p,
    " reason: ",
    reason
  );
});

/**
 * Main program.
 *
 * Iterate through the comma separated list of locations passed via ENV variable.  For each, create a
 * WeatherHost that manages the polling for information for the location.
 */
function main() {
  console.log("HERE MICROSERVICE (here.com weather)");
  if (!process.env.WEATHER_LOCATIONS) {
    console.log("ENV WEATHER_LOCATIONS is required");
    process.exit(1);
  }
  if (!WEATHER_APP_ID || !WEATHER_APP_CODE) {
    console.log(
      "ENV variables WEATHER_APP_ID and WEATHER_APP_CODE are required.  See README.md"
    );
    process.exit(1);
  }

  const hosts = {},
    locations = process.env.WEATHER_LOCATIONS.split(",");

  // locations are kind:value format, sparated by commas.  The kind values can be zipcode or name.
  // possible values for zipcode are numeric zip code.  The value for name is a city (e.g. London).
  for (const location of locations) {
    debug("starting", location);
    hosts[location] = new WeatherHost(location);
  }
}

main();
