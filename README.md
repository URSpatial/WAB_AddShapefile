# WAB_AddShapefile
Web AppBuilder for ArcGIS widget for uploading shapefiles to the web map as a feature layer operational layers

To install:
Install and configure Web AppBuilder Developer Edition and create a new app. See https://developers.arcgis.com/web-appbuilder/ for details.

1. Place a copy of the AddShapefile folder in the Widgets directory of your app.
2. Add the widget by configuring the config.json file of your app. Add the following lines to your config.json file in the widgetPool > widgets section:
```
 {
    "label": "Upload Shapefile",
    "uri": "widgets/AddShapefile/Widget"
  }
```
