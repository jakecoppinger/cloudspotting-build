mapboxgl.accessToken = 'pk.eyJ1IjoiamFrZWMiLCJhIjoiY2pkNWF2ZnhqMmZscTJxcGE2amtwZnJ0aiJ9.5OojKRkdmcpPUPiFH1K0_Q';

const host = "https://tiles.cloudspotting.app"
const mapboxMap = {
        style: 'mapbox://styles/mapbox/streets-v9',
}


let activeImage = 0



var request = new XMLHttpRequest();
request.open('GET', 'http://api.ipstack.com/check?access_key=8a00459bf3aa78a9414775b03006c607', true);

request.onload = function() {
  if (request.status >= 200 && request.status < 400) {
    // Success!
    var data = JSON.parse(request.responseText);

    console.log("IP data:", data)
  } else {
    // We reached our target server, but it returned an error
  }
};

request.onerror = function() {
  // There was a connection error of some sort
};

request.send();


getAsync(`${host}/available-timestamps.json`, text => {
    const availableImages = JSON.parse(text)
    availableImages.sort()
    const timestamp1 = availableImages[0]
    const timestamp2 = availableImages[1]
    console.log({timestamp1, timestamp2}) 
    const numSets = availableImages.length

    const sources = availableImages
        .map(timestampStr => ({
            "type": "raster",
            "tiles": [
                `${host}/${timestampStr}/{z}/{x}/{y}.png`
            ],
            "tileSize": 256,
            "scheme": "tms"
        }))

    let sourcesDict = sources.reduce(function(map, obj, index) {
        map[`tileset${index}`] = obj;
        return map;
    }, {});


    sourcesDict["osm"] = {
        "type": "raster",
        "tiles": [
            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png ",
            // "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png ",
            // "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png ",
        ],
        "tileSize": 256,
    }

    let layers = [{
            "id": "osm",
            "type": "raster",
            "source": "osm",
            "minzoom": 0,
            "maxzoom": 22
        }].concat(availableImages.map((timestampStr, index)=> ({
                 "id": `tileset${index}`,
                 "type": "raster",
                 "source": `tileset${index}`,
                 "minzoom": 1,
                 "maxzoom": 22, 
                 // "maxzoom": 11, 
            }))
        )


    console.log({sourcesDict}, {layers})
    const openStreetMap = {
        style: {
            "version": 8,
            "sources": sourcesDict,
            "layers": layers 
        },
    };

    var map = new mapboxgl.Map({
        container: 'map',
        center: [151.2093,-33.8688], // starting position
        zoom: 8,
        ...openStreetMap
    });

    var geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        autocomplete: true
    });

    const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        fitBoundsOptions: {
            maxZoom: 10
        }
    })
    map.addControl(geolocate);
    map.addControl(new mapboxgl.FullscreenControl());

    map.on('load', function () {
        geolocate.trigger();

         map.addSource('dem', {
            "type": "raster-dem",
            "url": "mapbox://mapbox.terrain-rgb"
        });

        // Insert the layer beneath any symbol layer.
        var layers = map.getStyle().layers;

        var labelLayerId;
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
                labelLayerId = layers[i].id;
                break;
            }
        }
        printZoom()
    });

	function advanceImage() {
        var zoom = map.getZoom();
        // console.log('Zoom:', zoom)

        const maxOpacity = 0.4
        const newActiveImage = (activeImage + 1) % numSets;

        /*
        Realtime / Map
        if 30 mins is 6 seconds
        5 mins is 1 second
        1 min -> 0.2 seconds
        */
        const secondsPerLoop = 3

        const mapSecondsPerMin = secondsPerLoop / 30
        const newMinute = parseInt(availableImages[newActiveImage])
        const futureMinute = parseInt(availableImages[(newActiveImage + 1) % numSets])

        const minsToNextImage = futureMinute - newMinute
        const newTimeout = minsToNextImage * mapSecondsPerMin * 1000

        console.log("Next image:", availableImages[newActiveImage]);
        document.getElementById("timestamp").innerHTML = availableImages[newActiveImage];
        map.setPaintProperty(`tileset${activeImage}`, 'raster-opacity', 0);
        map.setPaintProperty(`tileset${newActiveImage}`, 'raster-opacity', maxOpacity);
        activeImage = newActiveImage;


        setTimeout(advanceImage,newTimeout);
    }


    function printZoom() {
		setTimeout(advanceImage, 300);
	}

});

const getCornerCoordinate = (initialPoint, dist, bearing) => {
    const { latitude, longitude} = geolib.computeDestinationPoint(initialPoint, dist, bearing)
    return [longitude, latitude ]
}


function getAsync(url, callback) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        callback(this.responseText)
    }
  };
  xhttp.open("GET", url, true);
  xhttp.send();
} 
