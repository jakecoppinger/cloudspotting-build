//import * as mapboxgl from 'mapbox-gl';
var mapboxToken = 'pk.eyJ1IjoiamFrZWMiLCJhIjoiY2pkNWF2ZnhqMmZscTJxcGE2amtwZnJ0aiJ9.5OojKRkdmcpPUPiFH1K0_Q';
Object.getOwnPropertyDescriptor(mapboxgl, "accessToken").set(mapboxToken);
var host = "https://tiles.cloudspotting.app";
var mapboxMap = {
    style: 'mapbox://styles/mapbox/streets-v9',
};
var activeImage = 0;
/*
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
*/
getAsync(host + "/available-timestamps.json", function (text) {
    var availableImages = JSON.parse(text);
    availableImages.sort();
    var timestamp1 = availableImages[0];
    var timestamp2 = availableImages[1];
    var numSets = availableImages.length;
    var sources = availableImages
        .map(function (timestampStr) { return ({
        "type": "raster",
        "tiles": [
            host + "/" + timestampStr + "/{z}/{x}/{y}.png"
        ],
        "tileSize": 256,
        "scheme": "tms"
    }); });
    var sourcesDict = sources.reduce(function (map, obj, index) {
        map["tileset" + index] = obj;
        return map;
    }, {});
    var layers = []
        .concat(availableImages.map(function (timestampStr, index) { return ({
        "id": "tileset" + index,
        "type": "raster",
        "source": "tileset" + index,
        "minzoom": 1,
        "maxzoom": 22,
    }); }));
    var map = new mapboxgl.Map({
        container: 'map',
        center: [151.2093, -33.8688],
        zoom: 8,
        style: 'mapbox://styles/mapbox/streets-v9'
    });
    var geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        fitBoundsOptions: {
            maxZoom: 10
        }
    });
    map.addControl(geolocate);
    map.addControl(new mapboxgl.FullscreenControl());
    map.on('load', function () {
        geolocate.trigger();
        printZoom();
        for (var key in sourcesDict) {
            map.addSource(key, sourcesDict[key]);
        }
        for (var layer in layers) {
            map.addLayer(layers[layer]);
        }
    });
    function advanceImage() {
        var zoom = map.getZoom();
        var maxOpacity = 0.6;
        var newActiveImage = (activeImage + 1) % numSets;
        var endLoopDelay = 2000;
        /*
        Realtime / Map
        if 30 mins is 6 seconds
        5 mins is 1 second
        1 min -> 0.2 seconds
        */
        var secondsPerLoop = 3;
        var mapSecondsPerMin = secondsPerLoop / 30;
        var newMinute = parseInt(availableImages[newActiveImage]);
        var futureMinute = parseInt(availableImages[(newActiveImage + 1) % numSets]);
        var minsToNextImage = futureMinute - newMinute;
        var newTimeout = futureMinute > newMinute
            ? minsToNextImage * mapSecondsPerMin * 1000
            : endLoopDelay;
        //console.log({newTimeout, newMinute, futureMinute, minsToNextImage});
        document.getElementById("timestamp").innerHTML = availableImages[newActiveImage];
        map.setPaintProperty("tileset" + activeImage, 'raster-opacity', 0);
        map.setPaintProperty("tileset" + newActiveImage, 'raster-opacity', maxOpacity);
        // map.setLayoutProperty(`tileset${activeImage}`, 'visibility', 'none');
        // map.setLayoutProperty(`tileset${newActiveImage}`, 'visibility', 'visible');
        activeImage = newActiveImage;
        setTimeout(advanceImage, newTimeout);
    }
    function printZoom() {
        setTimeout(advanceImage, 300);
    }
});
function getAsync(url, callback) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            callback(this.responseText);
        }
    };
    xhttp.open("GET", url, true);
    xhttp.send();
}
//# sourceMappingURL=dist.js.map