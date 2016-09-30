var highlightFeature = function(e){
  var layer = e.target;
  /*if("hoverStyle" in layer.options && layer.options.hoverStyle != undefined)
  {
    var newStyle = layer.options.hoverStyle;
    layer.setStyle(newStyle);
    if (!L.Browser.ie && !L.Browser.opera){
      layer.bringToFront();
    }
  }*/
};

geodash.controllers["controller_map_map"] = function(
  $rootScope, $scope, $element, $controller,
  $http, $q,
  $compile, $interpolate, $templateCache, $timeout,
  state, map_config, live) {
  //////////////////////////////////////
  angular.extend(this, $controller("GeoDashControllerBase", {$element: $element, $scope: $scope}));

  $scope.processEvent = function(event, args)
  {
    var c = $.grep(geodash.meta.controllers, function(x, i){
      return x['name'] == 'controller_map_map';
    })[0];

    for(var i = 0; i < c.handlers.length; i++)
    {
      if(c.handlers[i]['event'] == event.name)
      {
        geodash.handlers[c.handlers[i]['handler']]($scope, $interpolate, $http, $q, event, args);
      }
    }
  };

  var c = $.grep(geodash.meta.controllers, function(x, i){
    return x['name'] == 'controller_map_map';
  })[0];
  for(var i = 0; i < c.handlers.length; i++)
  {
    $scope.$on(c.handlers[i]['event'], $scope.processEvent);
  }
  //////////////////////////////////////
  var listeners =
  {
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
        $("#popup").popover('destroy');
      }
    },
    zoomend: function(e){
      var m = geodash.var.map;
      var v = m.getView();
      var c = v.getCenter();
      var delta = {
        "extent": v.calculateExtent(m.getSize()).join(","),
        "z": v.getZoom()
      };
      geodash.api.intend("viewChanged", delta, $scope);
      if(geodash.mapping_library == "ol3")
      {
        $("#popup").popover('destroy');
      }
    },
    dragend: function(e){
      var m = geodash.var.map;
      var v = m.getView();
      var c = v.getCenter();
      var delta = {
        "extent": v.calculateExtent(m.getSize()).join(","),
        "location": {
          "lat": c[1],
          "lon": c[0]
        }
      };
      geodash.api.intend("viewChanged", delta, $scope);
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
  };
  //////////////////////////////////////
  // The Map
  var hasViewOverride = hasHashValue(["latitude", "lat", "longitude", "lon", "lng", "zoom", "z"]);
  var view = state["view"];
  geodash.var.map = geodash.init.map_ol3({
    "attributionControl": extract(expand("controls.attribution"), map_config, true),
    "zoomControl": extract(expand("controls.zoom"), map_config, true),
    "minZoom": extract(expand("view.minZoom"), map_config, 0),
    "maxZoom": extract(expand("view.maxZoom"), map_config, 18),
    "lat": extract(expand("view.latitude"), map_config, 0),
    "lon": extract(expand("view.longitude"), map_config, 0),
    "z": extract(expand("view.zoom"), map_config, 3),
    "listeners": listeners
  });
  //////////////////////////////////////
  // Base Layers
  var baseLayers = geodash.layers.init_baselayers_ol3(geodash.var.map, map_config["baselayers"]);
  $.extend(geodash.var.baselayers, baseLayers);
  // Load Default/Initial Base Layer
  var baseLayerID = map_config["view"]["baselayer"] || map_config["baselayers"][0].id;
  geodash.var.map.addLayer(geodash.var.baselayers[baseLayerID]);
  geodash.api.intend("viewChanged", {'baselayer': baseLayerID}, $scope);
  geodash.api.intend("layerLoaded", {'type':'baselayer', 'layer': baseLayerID}, $scope);
  //////////////////////////////////////
  // Feature Layers
  if(angular.isArray(extract("featurelayers", map_config)))
  {
    for(var i = 0; i < map_config.featurelayers.length; i++)
    {
      var fl = map_config.featurelayers[i];
      geodash.layers.init_featurelayer(fl.id, fl, $scope, live, map_config, state);
    }
  }
  $timeout(function(){
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
  }, 2000);
  //////////////////////////////////////
  $scope.$on("refreshMap", function(event, args) {
    // Forces Refresh
    console.log("Refreshing map...");
    // Update Visibility
    var visibleBaseLayer = args.state.view.baselayer;
    var currentLayers = geodash.mapping_library == "ol3" ? geodash.var.map.getLayers().getArray() : undefined;
    $.each(geodash.var.baselayers, function(id, layer) {
      var visible = id == visibleBaseLayer;
      if(geodash.mapping_library == "ol3")
      {
        if($.inArray(layer, currentLayers) != -1 && !visible)
        {
          geodash.var.map.removeLayer(layer)
        }
        else if($.inArray(layer, currentLayers) == -1 && visible)
        {
          geodash.var.map.addLayer(layer)
        }
      }
      else
      {
        if(geodash.var.map.hasLayer(layer) && !visible)
        {
          geodash.var.map.removeLayer(layer)
        }
        else if((! geodash.var.map.hasLayer(layer)) && visible)
        {
          geodash.var.map.addLayer(layer)
        }
      }
    });
    var visibleFeatureLayers = args.state.view.featurelayers;
    $.each(geodash.var.featurelayers, function(id, layer) {
      var visible = $.inArray(id, visibleFeatureLayers) != -1;
      if(geodash.mapping_library == "ol3")
      {
        if($.inArray(layer, currentLayers) != -1 && !visible)
        {
          geodash.var.map.removeLayer(layer)
        }
        else if($.inArray(layer, currentLayers) == -1 && visible)
        {
          geodash.var.map.addLayer(layer)
        }
      }
      else
      {
        if(geodash.var.map.hasLayer(layer) && !visible)
        {
          geodash.var.map.removeLayer(layer)
        }
        else if((! geodash.var.map.hasLayer(layer)) && visible)
        {
          geodash.var.map.addLayer(layer)
        }
      }
    });
    // Update Render Order
    var renderLayers = $.grep(layersAsArray(geodash.var.featurelayers), function(layer){ return $.inArray(layer["id"], visibleFeatureLayers) != -1;});
    var renderLayersSorted = sortLayers($.map(renderLayers, function(layer, i){return layer["layer"];}),true);
    var baseLayersAsArray = $.map(geodash.var.baselayers, function(layer, id){return {'id':id,'layer':layer};});
    var baseLayers = $.map(
      $.grep(layersAsArray(geodash.var.baselayers), function(layer){return layer["id"] == visibleBaseLayer;}),
      function(layer, i){return layer["layer"];});
    updateRenderOrder(baseLayers.concat(renderLayersSorted));
    // Force Refresh
    if(geodash.mapping_library == "ol3")
    {
      setTimeout(function(){

        var m = geodash.var.map;
        m.renderer_.dispose();
        m.renderer_ = new ol.renderer.canvas.Map(m.viewport_, m);
        //m.updateSize();
        m.renderSync();

      }, 0);
    }
    else if(geodash.mapping_library == "leaflet")
    {
      setTimeout(function(){ geodash.var.map._onResize(); }, 0);
    }
  });

  $scope.$on("changeView", function(event, args) {
    console.log("Refreshing map...");
    if(args["layer"] != undefined)
    {
      geodash.var.map.fitBounds(geodash.var.featurelayers[args["layer"]].getBounds());
    }
  });

  $scope.$on("openPopup", function(event, args) {
    console.log("Opening popup...");
    if(
      args["featureLayer"] != undefined &&
      args["feature"] != undefined &&
      args["location"] != undefined)
    {
      geodash.popup.openPopup(
        $interpolate,
        args["featureLayer"],
        args["feature"],
        args["location"],
        geodash.var.map,
        angular.element("#geodash-main").scope().state);
    }
  });
};
