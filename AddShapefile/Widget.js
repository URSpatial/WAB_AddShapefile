var widgetMap;
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/aspect',
    'dojo/Deferred',
    "dojo/dom",
    "dojo/json",
    "dojo/on",
    "dojo/parser",
    "dojo/sniff",
    "dojo/_base/array",
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidget',
    'jimu/portalUtils',
    'jimu/dijit/Message',
    "esri/config",
    "esri/InfoTemplate",
    "esri/map",
    "esri/Color",
    "esri/request",
    "esri/geometry/scaleUtils",
    "esri/layers/FeatureLayer",
    "esri/renderers/SimpleRenderer",
    "esri/symbols/PictureMarkerSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol"
],
  function (
    declare,
    lang,
    aspect,
    Deferred,
    dom,
    JSON,
    on,
    parser,
    sniff,
    arrayUtils,
    _WidgetsInTemplateMixin,
    BaseWidget,
    PortalUtils,
    Message,
    esriConfig,
    InfoTemplate,
    Map,
    Color,
    request,
    scaleUtils,
    FeatureLayer,
    SimpleRenderer,
    PictureMarkerSymbol,
    SimpleFillSymbol,
    SimpleLineSymbol
    ) {
      
      var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {

          name: 'Add Shapefile',
          addShapefile: {},

          startup: function () {
              json = this.config.addShapefile;
              this.addShapefile.map = this.map;
              widgetMap = this.map;
              parser.parse();

              var portalUrl = "http://www.arcgis.com";

              esriConfig.defaults.io.proxyUrl = "/proxy/";

              on(dom.byId("uploadForm"), "change", function (event) {
                  var fileName = event.target.value.toLowerCase();

                  if (sniff("ie")) { //filename is full path in IE so extract the file name
                      var arr = fileName.split("\\");
                      fileName = arr[arr.length - 1];
                  }
                  if (fileName.indexOf(".zip") !== -1) {//is file a zip - if not notify user
                      generateFeatureCollection(fileName);
                  }
                  else {
                      dom.byId('upload-status').innerHTML = '<p style="color:red">Add shapefile as .zip file</p>';
                  }
              });

              //map = new Map("mapCanvas", {
              //    basemap: "gray",
              //    center: [-41.647, 36.41],
              //    zoom: 3,
              //    slider: false
              //});

              function generateFeatureCollection (fileName) {
                  var name = fileName.split(".");
                  //Chrome and IE add c:\fakepath to the value - we need to remove it
                  //See this link for more info: http://davidwalsh.name/fakepath
                  name = name[0].replace("c:\\fakepath\\", "");

                  dom.byId('upload-status').innerHTML = '<b>Loading </b>' + name;

                  //Define the input params for generate see the rest doc for details
                  //http://www.arcgis.com/apidocs/rest/index.html?generate.html
                  var params = {
                      'name': name,
                      'targetSR': widgetMap.spatialReference,
                      'maxRecordCount': 1000,
                      'enforceInputFileSizeLimit': true,
                      'enforceOutputJsonSizeLimit': true
                  };

                  //generalize features for display Here we generalize at 1:40,000 which is approx 10 meters
                  //This should work well when using web mercator.
                  var extent = scaleUtils.getExtentForScale(widgetMap, 40000);
                  var resolution = extent.getWidth() / widgetMap.width;
                  params.generalize = true;
                  params.maxAllowableOffset = resolution;
                  params.reducePrecision = true;
                  params.numberOfDigitsAfterDecimal = 0;

                  var myContent = {
                      'filetype': 'shapefile',
                      'publishParameters': JSON.stringify(params),
                      'f': 'json',
                      'callback.html': 'textarea'
                  };

                  //use the rest generate operation to generate a feature collection from the zipped shapefile
                  request({
                      url: portalUrl + '/sharing/rest/content/features/generate',
                      content: myContent,
                      form: dom.byId('uploadForm'),
                      handleAs: 'json',
                      load: lang.hitch(this, function (response) {
                          if (response.error) {
                              errorHandler(response.error);
                              return;
                          }
                          var layerName = response.featureCollection.layers[0].layerDefinition.name;
                          dom.byId('upload-status').innerHTML = '<b>Loaded: </b>' + layerName;
                          addShapefileToMap(response.featureCollection);
                      }),
                      error: lang.hitch(this, errorHandler)
                  });
              }

              function errorHandler (error) {
                  dom.byId('upload-status').innerHTML =
                  "<p style='color:red'>" + error.message + "</p>";
              }

              function addShapefileToMap (featureCollection) {
                  //add the shapefile to the map and zoom to the feature collection extent
                  //If you want to persist the feature collection when you reload browser you could store the collection in
                  //local storage by serializing the layer using featureLayer.toJson()  see the 'Feature Collection in Local Storage' sample
                  //for an example of how to work with local storage.
                  var fullExtent;
                  var layers = [];

                  arrayUtils.forEach(featureCollection.layers, function (layer) {
                      var infoTemplate = new InfoTemplate("Details", "${*}");
                      var featureLayer = new FeatureLayer(layer, {
                          infoTemplate: infoTemplate
                      });
                      //associate the feature with the popup on click to enable highlight and zoom to
                      featureLayer.on('click', function (event) {
                          widgetMap.infoWindow.setFeatures([event.graphic]);
                      });
                      //change default symbol if desired. Comment this out and the layer will draw with the default symbology
                      changeRenderer(featureLayer);
                      fullExtent = fullExtent ?
                        fullExtent.union(featureLayer.fullExtent) : featureLayer.fullExtent;
                      layers.push(featureLayer);
                  });
                  widgetMap.addLayers(layers);
                  widgetMap.setExtent(fullExtent.expand(1.25), true);

                  dom.byId('upload-status').innerHTML = "";
              }

              function changeRenderer (layer) {
                  //change the default symbol for the feature collection for polygons and points
                  var symbol = null;
                  switch (layer.geometryType) {
                      case 'esriGeometryPoint':
                          symbol = new PictureMarkerSymbol({
                              'angle': 0,
                              'xoffset': 0,
                              'yoffset': 0,
                              'type': 'esriPMS',
                              'url': 'http://static.arcgis.com/images/Symbols/Shapes/BluePin1LargeB.png',
                              'contentType': 'image/png',
                              'width': 20,
                              'height': 20
                          });
                          break;
                      case 'esriGeometryPolygon':
                          symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                              new Color([112, 112, 112]), 1), new Color([136, 136, 136, 0.25]));
                          break;
                  }
                  if (symbol) {
                      layer.setRenderer(new SimpleRenderer(symbol));
                  }
              }
          
          },

         

          onClose: function () {
              //if (this.measurement && this.measurement.activeTool) {
              //    this.measurement.clearResult();
              //    this.measurement.setTool(this.measurement.activeTool, false);
              //}
          },

          destroy: function () {
              //if (this.measurement) {
              //    this.measurement.destroy();
              //}
              this.inherited(arguments);
          }
      });
      return clazz;
  });