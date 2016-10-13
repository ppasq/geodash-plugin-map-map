geodash.controllers.GeoDashControllerMapMap = function(
  $rootScope, $scope, $element, $controller,
  $http, $q,
  $compile, $interpolate, $templateCache, $timeout) {
  //////////////////////////////////////
  angular.extend(this, $controller("GeoDashControllerBase", {$element: $element, $scope: $scope}));

  var mainScope = $element.parents(".geodash-dashboard:first").isolateScope();
  $scope.dashboard = mainScope.dashboard;
  $scope.dashboard_flat = mainScope.dashboard_flat;
  $scope.state = mainScope.state;

  $scope.processEvent = function(event, args)
  {
    var c = $.grep(geodash.meta.controllers, function(x, i){
      return x['name'] == 'GeoDashControllerMapMap';
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
    return x['name'] == 'GeoDashControllerMapMap';
  })[0];
  for(var i = 0; i < c.handlers.length; i++)
  {
    $scope.$on(c.handlers[i]['event'], $scope.processEvent);
  }
  //////////////////////////////////////

  //////////////////////////////////////
  // The Map

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
          geodash.var.map.removeLayer(layer);
        }
        else if($.inArray(layer, currentLayers) == -1 && visible)
        {
          geodash.var.map.addLayer(layer);
        }
      }
      else
      {
        if(geodash.var.map.hasLayer(layer) && !visible)
        {
          geodash.var.map.removeLayer(layer);
        }
        else if((! geodash.var.map.hasLayer(layer)) && visible)
        {
          geodash.var.map.addLayer(layer);
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
          geodash.var.map.removeLayer(layer);
        }
        else if($.inArray(layer, currentLayers) == -1 && visible)
        {
          geodash.var.map.addLayer(layer);
        }
      }
      else
      {
        if(geodash.var.map.hasLayer(layer) && !visible)
        {
          geodash.var.map.removeLayer(layer);
        }
        else if((! geodash.var.map.hasLayer(layer)) && visible)
        {
          geodash.var.map.addLayer(layer);
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
    if(angular.isDefined(extract("layer", args)))
    {
      if(geodash.mapping_library == "ol3")
      {
        var layer = geodash.var.featurelayers[args["layer"]];
        var v = geodash.var.map.getView();
        geodash.var.map.beforeRender(ol.animation.pan({ duration: 1000, source: v.getCenter() }));
        v.fit(layer.getSource().getExtent(), geodash.var.map.getSize());
      }
      else if(geodash.mapping_library == "leaflet")
      {
        geodash.var.map.fitBounds(geodash.var.featurelayers[args["layer"]].getBounds());
      }
    }
    else if(angular.isDefined(extract("zoom", args)))
    {
      var v = geodash.var.map.getView();
      /*geodash.var.map.beforeRender(ol.animation.zoom({ duration: 250, source: v.getResolution() }));
      var resolution = ---
      ol.interaction.Interaction.zoomWithoutConstraints(
        geodash.var.map,
        v,
        resolution,
        false,
        250
      )*/
      v.setZoom(extract("zoom", args));
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
        geodash.util.getScope("geodash-main").state
      );
    }
  });
};
