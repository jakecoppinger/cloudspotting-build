mapboxgl.accessToken = 'pk.eyJ1IjoiamFrZWMiLCJhIjoiY2pkNWF2ZnhqMmZscTJxcGE2amtwZnJ0aiJ9.5OojKRkdmcpPUPiFH1K0_Q';
const host = "149.28.176.220"
const mapboxMap = {
        style: 'mapbox://styles/mapbox/streets-v9',
}


// map.addControl(new mapboxgl.NavigationControl());

// map.addControl(new MapboxDirections({
//     accessToken: mapboxgl.accessToken
// }), 'top-left');

// map.addControl(geocoder, 'top-left');
// map.addControl(new mapboxgl.FullscreenControl());

// map.on('load', updateGeocoderProximity); // set proximity on map load
// map.on('moveend', updateGeocoderProximity); // and then update proximity each time the map moves

let activeImage = 0

getAsync("/available-timestamps.json", text => {
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
                `${host}/tiles/${timestampStr}/{z}/{x}/{y}.png`
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

    map.on('load', function () {
        map.addSource('dem', {
            "type": "raster-dem",
            "url": "mapbox://mapbox.terrain-rgb"
        });
    });

    map.on('load', function () {
        updateGeocoderProximity();

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


	/*
	todo
set interval which is variable

*/

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

    function updateGeocoderProximity() {
        // proximity is designed for local scale, if the user is looking at the whole world,
        // it doesn't make sense to factor in the arbitrary centre of the map
        if (map.getZoom() > 9) {
            var center = map.getCenter().wrap(); // ensures the longitude falls within -180 to 180 as the Geocoding API doesn't accept values outside this range
            geocoder.setProximity({ longitude: center.lng, latitude: center.lat });
        } else {
            geocoder.setProximity(null);
        }
    }

    // Add geolocate control to the map.
    map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true
    }));
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
