geodash.directives.geodashMapMap = function(){
  return {
    controller: geodash.controllers.GeoDashControllerMapMap,
    restrict: 'EA',
    replace: true,
    scope: {},
    templateUrl: 'map_map.tpl.html',
    link: function ($scope, element, attrs, controllers)
    {
      var dashboard = $scope.dashboard;
      var state = $scope.state;
      //
      var listeners =
      {
        "map": {
          singleclick: function(e) {
            var m = geodash.var.map;
            var v = m.getView();
            var c = ol.proj.toLonLat(e.coordinate, v.getProjection());
            var delta = {
              "location": {
                "lat": c[1],
                "lon": c[0]
              },
              "pixel": {
                "x": e.pixel[0],
                "y": e.pixel[1]
              }
            };
            geodash.api.intend("clickedOnMap", delta, $scope);
            if(geodash.mapping_library == "ol3")
            {
              //$("#popup").popover('destroy');
            }
          },
          moveend: function(e){
            var m = geodash.var.map;
            var v = m.getView();
            var c = v.getCenter();
            var delta = {
              "extent": v.calculateExtent(m.getSize()).join(","),
              "location": {
                "lat": c[1],
                "lon": c[0]
              },
            };
            geodash.api.intend("viewChanged", delta, $scope);
          }
        },
        "view": {
          "change:resolution": function(e){
            var m = geodash.var.map;
            var v = m.getView();
            var c = v.getCenter();
            var delta = {
              "extent": v.calculateExtent(m.getSize()).join(","),
              "z": v.getZoom()
            };

            if(geodash.mapping_library == "ol3")
            {
              $("#popup").popover('destroy');
            }

            geodash.api.intend("viewChanged", delta, $scope);
          }
        }
      };

      var hasViewOverride = geodash.util.hasHashValue(["latitude", "lat", "longitude", "lon", "lng", "zoom", "z"]);
      //var view = state["view"];
      geodash.var.map = geodash.init.map_ol3({
        "id": element.attr("id"),
        "dashboard": dashboard,
        "listeners": listeners
      });
      //////////////////////////////////////
      // Base Layers
      var baseLayers = geodash.layers.init_baselayers_ol3(geodash.var.map, dashboard["baselayers"]);
      $.extend(geodash.var.baselayers, baseLayers);
      // Load Default/Initial Base Layer
      var baseLayerID = dashboard["view"]["baselayer"] || dashboard["baselayers"][0].id;
      geodash.var.map.addLayer(geodash.var.baselayers[baseLayerID]);
      geodash.api.intend("viewChanged", {'baselayer': baseLayerID}, $scope);
      geodash.api.intend("layerLoaded", {'type':'baselayer', 'layer': baseLayerID}, $scope);
      //////////////////////////////////////
      // Feature Layers
      if(angular.isArray(extract("featurelayers", dashboard)))
      {
        for(var i = 0; i < dashboard.featurelayers.length; i++)
        {
          var fl = dashboard.featurelayers[i];
          //geodash.layers.init_featurelayer(fl.id, fl, $scope, live, dashboard, state);
          geodash.layers.init_featurelayer({
            "id": fl.id,
            "fl": fl,
            "$scope": $scope,
            "dashboard": dashboard,
            "state": state
          });
        }
      }

      if(Array.isArray(extract("view.extent", state)))
      {
        setTimeout(function(){
          var m = geodash.var.map;
          var v = m.getView();
          var newExtent = ol.proj.transformExtent(
            extract("view.extent", state),
            "EPSG:4326",
            v.getProjection()
          );
          v.fit(newExtent, m.getSize());
        }, 0);
      }
      else
      {
        /*setTimeout(function(){
          var loadedFeatureLayers = $.grep(state.view.featurelayers, function(layerID){
            var y = extract(layerID, geodash.var.featurelayers);
            return angular.isDefined(y) && (y instanceof ol.layer.Vector);
          });
          var fitLayers = $.map(loadedFeatureLayers, function(layerID){ return geodash.var.featurelayers[layerID]; });
          var newExtent = ol.extent.createEmpty();
          fitLayers.forEach(function(layer){ ol.extent.extend(newExtent, layer.getSource().getExtent()); });
          var v = geodash.var.map.getView();
          geodash.var.map.beforeRender(ol.animation.pan({ duration: 500, source: v.getCenter() }));
          v.fit(newExtent, geodash.var.map.getSize());
        }, 4000);*/
      }
    }
  };
};
