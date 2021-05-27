import L, { TileEvent } from "leaflet";
import Cartographic from "terriajs-cesium/Source/Core/Cartographic";
import CesiumEvent from "terriajs-cesium/Source/Core/Event";
import CesiumMath from "terriajs-cesium/Source/Core/Math";
import MapboxVectorTileImageryProvider from "./MapboxVectorTileImageryProvider";

export default class MapboxVectorCanvasTileLayer extends L.GridLayer {
  readonly errorEvent: CesiumEvent = new CesiumEvent();
  readonly initialized: boolean = false;
  readonly _usable: boolean = false;
  readonly _delayedUpdate: unknown = undefined;
  readonly _zSubtract: number = 0;
  readonly _previousCredits: unknown[] = [];

  constructor(
    readonly imageryProvider: MapboxVectorTileImageryProvider,
    options: L.GridLayerOptions
  ) {
    super(Object.assign(options, { async: true, tileSize: 256 }));

    // Hack to fix "Space between tiles on fractional zoom levels in Webkit browsers" (https://github.com/Leaflet/Leaflet/issues/3575#issuecomment-688644225)
    this.on("tileloadstart", (event: TileEvent) => {
      event.tile.style.width = this.getTileSize().x + 0.5 + "px";
      event.tile.style.height = this.getTileSize().y + 0.5 + "px";
    });
  }

  createTile(tilePoint: L.Coords, done: L.DoneCallback) {
    const canvas = <HTMLCanvasElement>(
      L.DomUtil.create("canvas", "leaflet-tile")
    );
    const size = this.getTileSize();
    canvas.width = size.x;
    canvas.height = size.y;

    this.imageryProvider.readyPromise
      .then(() => {
        const n = this.imageryProvider.tilingScheme.getNumberOfXTilesAtLevel(
          tilePoint.z
        );
        return this.imageryProvider._requestImage(
          CesiumMath.mod(tilePoint.x, n),
          tilePoint.y,
          tilePoint.z,
          canvas
        );
      })
      .then(function(canvas) {
        done(undefined, canvas);
      });
    return canvas; // Not yet drawn on, but Leaflet requires the tile
  }

  getFeaturePickingCoords(
    map: L.Map,
    longitudeRadians: number,
    latitudeRadians: number
  ) {
    const ll = new Cartographic(
      CesiumMath.negativePiToPi(longitudeRadians),
      latitudeRadians,
      0.0
    );
    const level = Math.round(map.getZoom());

    return this.imageryProvider.readyPromise.then(() => {
      const tilingScheme = this.imageryProvider.tilingScheme;
      const coords = tilingScheme.positionToTileXY(ll, level);
      return {
        x: coords.x,
        y: coords.y,
        level: level
      };
    });
  }

  pickFeatures(
    x: number,
    y: number,
    level: number,
    longitudeRadians: number,
    latitudeRadians: number
  ) {
    return this.imageryProvider.readyPromise.then(() => {
      return this.imageryProvider.pickFeatures(
        x,
        y,
        level,
        longitudeRadians,
        latitudeRadians
      );
    });
  }
}
