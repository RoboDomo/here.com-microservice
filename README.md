# here.com-microservice
Weather microservice using here.com

## NOTE: 
works with Nest program is being ended by Google.  The existing weather-microservice relies on a nest.com API that
is almost certain to be disabled.  That API is already becoming unstable (returning null results).

## Sign Up
To use this microservice, you will need to sign up for a free account at https://developer.here.com.  This account 
allows this microservice to perform up to 250K transactions per month against the here.com weather API for zero cost.

You will create a Javascript/REST application on their site.  Once created, you will always be able to obtain the
```APP_ID``` and ```APP_CODE``` they assigned to you.  You will need these to start up this microservice.

*YOU WILL NOT WANT TO COMMIT THESE TO A GITHUB REPO!*

Once you have created your APP ID and APP CODE, they may not be active against the here.com API for an hour.

## Tips

On my robodomo server (or development host), my .zshrc sources ~/.zshrc.local if it exists.  The .zshrc.local
file is never committed to a repository (e.g. my dotfiles repo).

I add the various credentials as ENV variables in my .zshrc.local.  For this microservice, the following ENV variables
are honored:

* ```WEATHER_LOCATIONS``` - this is a comma separated list of locations to be polled and reported via MQTT
Each of the comma separated locations can be ```zipcode:{your zip}``` or ```name:{your city name}```.
* ```MQTT_HOST``` - this is the MQTT connect string for your broker.  
Defaults to ```mqtt://robodomo```.
* ```MQTT_TOPIC``` - this is the MQTT topic base for publishing weather condition changes.
Defaults to ```weather```.  A unique topic is generated for each location, something like ```weather/{location}/key```
where key can be "astronomy" or "forecast" or "current" or "hourly".
* ```APP_ID``` - this is the here.com APP_ID that you registered and IS REQUIRED.
* ```APP_CODE``` - this is the here.com APP_CODE that you registered and IS REQUIRED.

FOR SECURITY REASONS, NEVER COMMIT CREDENTIALS, APP_ID, APP_CODE, ETC.
