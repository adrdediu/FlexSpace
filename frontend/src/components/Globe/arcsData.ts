import { type Location} from './api';

export interface ArcData {
    startLat:number;
    startLng:number;
    endLat:number;
    endLng:number;
    color?:string;
}

function getRandomCoordinate(): {lat:number; lng:number} {
    return {
        lat: (Math.random() - 0.5) * 150,
        lng: (Math.random() - 0.5) * 340
    }
}

export function generateArcsData(count:number): ArcData[] {
    const arcs: ArcData[] = [];

    for(let i=0; i< count; i++){
        const start = getRandomCoordinate();
        const end = getRandomCoordinate();

        const distance = Math.sqrt(
            Math.pow(start.lat - end.lat,2)+
            Math.pow(start.lng-end.lng, 2)
        );
        
        if(distance > 40){
            arcs.push({
                startLat: start.lat,
                startLng: start.lng,
                endLat: end.lat,
                endLng: end.lng
            });
        } else {
            i--;
        }
    }
    
    return arcs;
}

export function generateArcsFromLocations(locations:Location[], count:number): ArcData[] {
    const arcs: ArcData[] = [];

    const sortedLocations = [...locations].sort((a,b) =>
        (b.population||0) - (a.population||0)
    )

    const majorLocations = sortedLocations.slice(0, Math.min(count, sortedLocations.length));

    majorLocations.forEach(startLoc => {
        const possibleDestinations = sortedLocations.filter(loc =>
            loc.id !== startLoc.id &&
            loc.country_code !== startLoc.country_code
        );

        if(possibleDestinations.length > 0){
            const endLoc = possibleDestinations[Math.floor(Math.random() * possibleDestinations.length)];

            arcs.push({
                startLat: startLoc.lat,
                startLng: startLoc.lng,
                endLat: endLoc.lat,
                endLng: endLoc.lng,
            });
        }
    });

    if(arcs.length < count) {
        const additionalArcs = generateArcsData(count - arcs.length);
        arcs.push(...additionalArcs);
    }

    return arcs;
}