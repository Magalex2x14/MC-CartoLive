package live

import (
	"math"
	"strings"
)

const (
	MapIncludeMappable             = "mappable"
	MapIncludeMissingCoords        = "missing_coords"
	MapIncludeZeroCoords           = "zero_coords"
	MapIncludeOutsideBounds        = "outside_bounds"
	MapIncludeIATAFiltered         = "iata_filtered"
	MapIncludeNodePositionUsed     = "node_position_used"
	MapIncludeObserverOnly         = "observer_only"
	MapIncludeObserverPositionUsed = "observer_position_used"
)

type PublicMapInclusion struct {
	Mappable       bool
	Reason         string
	PositionSource string
}

func PublicNodeMapInclusion(node Node, filter PublicIATAFilter) PublicMapInclusion {
	if len(node.IATAsHeardIn) > 0 && len(allowedIATAs(node.IATAsHeardIn, filter)) == 0 {
		return PublicMapInclusion{Reason: MapIncludeIATAFiltered}
	}
	return coordinateInclusion(node.Latitude, node.Longitude, MapIncludeNodePositionUsed)
}

func PublicObserverMapInclusion(observer Observer, filter PublicIATAFilter) PublicMapInclusion {
	if !filter.Allows(observer.IATA) {
		return PublicMapInclusion{Reason: MapIncludeIATAFiltered}
	}
	return coordinateInclusion(observer.Latitude, observer.Longitude, MapIncludeObserverOnly)
}

func PublicObserverFallbackInclusion(observer Observer, filter PublicIATAFilter) PublicMapInclusion {
	decision := PublicObserverMapInclusion(observer, filter)
	if decision.Mappable {
		decision.PositionSource = MapIncludeObserverPositionUsed
	}
	return decision
}

func coordinateInclusion(lat *float64, lng *float64, positionSource string) PublicMapInclusion {
	if lat == nil || lng == nil {
		return PublicMapInclusion{Reason: MapIncludeMissingCoords}
	}
	if *lat == 0 || *lng == 0 {
		return PublicMapInclusion{Reason: MapIncludeZeroCoords}
	}
	if math.IsNaN(*lat) || math.IsNaN(*lng) || math.IsInf(*lat, 0) || math.IsInf(*lng, 0) {
		return PublicMapInclusion{Reason: MapIncludeOutsideBounds}
	}
	return PublicMapInclusion{
		Mappable:       true,
		Reason:         MapIncludeMappable,
		PositionSource: strings.TrimSpace(positionSource),
	}
}
